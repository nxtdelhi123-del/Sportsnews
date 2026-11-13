// Autopilot: news → poster → owner's phone → Instagram, in minutes.
//
// Every run (api/cron/studio.js, called every 1–2 minutes by an external scheduler):
//   1. rank the newsroom's stories for each brand (the same ranking as /studio);
//   2. keep fresh, big ones that haven't been seen before, and let the editor's brain
//      (lib/studio/editor.js) pick the ones worth posting and say why;
//   3. write the words (Claude when ANTHROPIC_API_KEY is set, formulas otherwise),
//      freeze the pack in the store, and send poster + caption to Telegram with
//      ✅ Post now / ✖ Skip buttons;
//   4. the owner's tap (api/telegram.js) publishes it to Instagram with the Graph API.
// Nothing reaches Instagram without that tap.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { candidates, buildPack, dupKey } from './packs.js';
import { BRANDS, ageHours } from './score.js';
import { renderPack, loadAssets } from './render.js';
import * as store from './store.js';
import * as tg from './telegram.js';
import { instagramConfigured, publishImage } from './instagram.js';
import { judge, readTaste, recordTaste, brainAvailable } from './editor.js';

const DAY = 24 * 3600;
const env = (k, d) => process.env[k] ?? d;
export const settings = () => ({
  brands: String(env('AUTOPILOT_BRANDS', 'tsb')).split(',').map((s) => s.trim()).filter((b) => BRANDS[b]),
  minScore: Number(env('AUTOPILOT_MIN_SCORE', 3)),
  maxPerRun: Number(env('AUTOPILOT_MAX_PER_RUN', 3)),
  dailyCap: Number(env('AUTOPILOT_DAILY_CAP', 20)),
  maxAgeHours: Number(env('AUTOPILOT_MAX_AGE_HOURS', 2)),
  // With the brain on, the rules let more through and Claude makes the call.
  brainMinScore: Number(env('AUTOPILOT_BRAIN_MIN_SCORE', 2)),
  maxJudge: Number(env('AUTOPILOT_MAX_JUDGE', 15)),
});
// Kinds of post that are news the moment they happen. Previews and live scores are not.
const NEWS_TYPES = new Set(['result', 'medal', 'milestone', 'tally', 'stage', 'quote', 'breaking']);

// AUTOPILOT_SECRET when set; otherwise derived from the bot token, so the owner has one
// setting less to make. It signs media links and authenticates Telegram's webhook calls.
export const secret = () => process.env.AUTOPILOT_SECRET || (process.env.TELEGRAM_BOT_TOKEN ? createHash('sha256').update(`nxt-autopilot:${process.env.TELEGRAM_BOT_TOKEN}`).digest('hex').slice(0, 48) : '');
export const sign = (id) => createHmac('sha256', secret()).update(id).digest('hex').slice(0, 32);
export function checkSig(id, sig) {
  if (!secret() || typeof sig !== 'string' || sig.length !== 32) return false;
  return timingSafeEqual(Buffer.from(sign(id)), Buffer.from(sig));
}
export const baseUrl = () => (process.env.PUBLIC_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')).replace(/\/$/, '');
export const mediaUrl = (id) => `${baseUrl()}/api/studio/media?id=${id}&sig=${sign(id)}`;

const istDay = (now) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
export const priorityOf = (score) => (score >= 6 ? 'P1' : score >= 3 ? 'P2' : 'P3');
// Final scores come from the live data feeds; headlines are what an outlet reported.
export const statusOf = (story) => (story.kind === 'news' ? 'Reported' : story.status?.state === 'post' ? 'Confirmed' : 'Developing');

const FALLBACK_TAGS = ['#SportsNews', '#Sports', '#SportsUpdate', '#BreakingNews'];
// Exactly five hashtags, the page's own tag last.
export function fiveTags(tags, brand, sport) {
  const own = brand.hashtags.base[0];
  const pool = [...(tags || []), ...(brand.hashtags[sport] || []), ...brand.hashtags.base, ...FALLBACK_TAGS].map((t) => (t.startsWith('#') ? t : `#${t}`).replace(/[^#\w]/g, ''));
  const out = [];
  for (const t of pool) if (t.length > 1 && t.toLowerCase() !== own.toLowerCase() && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  return [...out.slice(0, 4), own];
}

// The writer's caption with its hashtag block replaced by exactly five tags, plus the source.
export function finalCaption(words, story, brand) {
  const body = String(words.caption || '')
    .split('\n')
    .filter((l) => !/^\s*(#\w+\s*)+$/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const src = story.kind === 'news' && story.source ? `\n\nSource: ${story.source}` : '';
  return `${body}${src}\n\n${fiveTags(words.hashtags, brand, story.sport).join(' ')}`.slice(0, 2200);
}

const seenKey = (brandId, c) => `ap:seen:${brandId}:${dupKey(c.story, c.type)}`;

export async function runAutopilot({ now = Date.now(), log = console, getCandidates = candidates, getPack = buildPack, getVerdicts = judge } = {}) {
  const cfg = settings();
  const report = { drafted: [], skipped: 0, errors: [] };
  if (!tg.telegramConfigured()) return { ...report, errors: ['TELEGRAM_BOT_TOKEN not set'] };
  if (!baseUrl()) return { ...report, errors: ['PUBLIC_URL not set'] };
  // Point the bot's webhook at this site (once a day; setWebhook is idempotent).
  if (await store.claim('ap:webhook', 24 * 3600)) {
    await tg.setWebhook(`${baseUrl()}/api/telegram`, secret()).catch(async (e) => {
      await store.del('ap:webhook').catch(() => null);
      report.errors.push(e.message);
    });
  }
  const chatId = await tg.ownerChat();
  if (!chatId) return { ...report, errors: [...report.errors, 'Send /start to the bot so it knows where to send drafts'] };
  for (const brandId of cfg.brands) {
    const brand = BRANDS[brandId];
    const dayKey = `ap:count:${brandId}:${istDay(now)}`;
    const list = await getCandidates(brandId, 40);
    // 1. The rules: fresh news-type stories over a bar (lower when the brain will read them),
    //    not already sent or turned down.
    const bar = brainAvailable() ? cfg.brainMinScore : cfg.minScore;
    const fresh = [];
    for (const c of list) {
      const age = ageHours(c.story, now);
      if (c.score < bar || !NEWS_TYPES.has(c.type) || age > cfg.maxAgeHours || age < -0.25) {
        report.skipped++;
        continue;
      }
      if ((await store.getNumber(seenKey(brandId, c))) > 0) continue;
      fresh.push(c);
      if (fresh.length >= cfg.maxJudge) break;
    }
    if (!fresh.length) continue;
    // 2. The brain: which of these would the editor post, how urgent, and why.
    const taste = await readTaste(brandId);
    const chosen = await getVerdicts(brand, fresh, { taste, log });
    const picked = new Set(chosen.map((c) => c.key));
    // Stories the brain turned down are not asked about again.
    for (const c of fresh) if (!picked.has(c.key)) await store.claim(seenKey(brandId, c), 3 * DAY);
    report.rejected = (report.rejected || 0) + fresh.length - chosen.length;
    let made = 0;
    for (const c of chosen) {
      if (made >= cfg.maxPerRun) break;
      // One claim per story for three days, whatever outlet or run sees it next.
      if (!(await store.claim(seenKey(brandId, c), 3 * DAY))) continue;
      if ((await store.getNumber(dayKey)) >= cfg.dailyCap) {
        report.errors.push(`${brandId}: daily cap of ${cfg.dailyCap} drafts reached`);
        break;
      }
      try {
        const pack = (await getPack(brandId, c.key)) || c;
        const id = randomBytes(9).toString('base64url');
        const draft = {
          id,
          brand: brandId,
          key: c.key,
          type: pack.type,
          score: c.score,
          priority: c.priority || priorityOf(c.score),
          why: c.why || '',
          by: c.by || 'rules',
          status: statusOf(c.story),
          source: c.story.source || c.story.league?.name || '',
          link: c.story.link || c.story.url || '',
          caption: finalCaption(pack.words, c.story, brand),
          pack: { ...pack, brand: undefined, templates: undefined, statusLabel: statusOf(c.story) },
          state: 'sent',
          createdAt: new Date(now).toISOString(),
        };
        await store.setJSON(`ap:draft:${id}`, draft, 7 * DAY);
        const msg = await tg.sendDraft(draft, mediaUrl(id), { canPost: instagramConfigured(brandId), chatId });
        draft.telegram = { chatId: msg.chat?.id, messageId: msg.message_id };
        await store.setJSON(`ap:draft:${id}`, draft, 7 * DAY);
        await store.incr(dayKey, 2 * DAY);
        report.drafted.push({ id, brand: brandId, key: c.key, headline: pack.words?.headline, score: c.score, priority: draft.priority, why: draft.why });
        made++;
      } catch (e) {
        // Let the next run try this story again.
        await store.del(seenKey(brandId, c)).catch(() => null);
        report.errors.push(`${c.key}: ${e.message}`);
        log.error?.('autopilot:', c.key, e.message);
      }
    }
  }
  return report;
}

// The frozen pack as a 1080×1350 JPEG (Instagram's API takes 4:5 JPEGs, not the 3:4 grid tile).
export async function renderDraft(draft) {
  const brand = BRANDS[draft.brand];
  const pack = { ...draft.pack, brand };
  const assets = await loadAssets(pack, brand);
  const { jpeg } = await renderPack({ ...pack, assets }, { size: 'post', template: draft.pack.template, format: 'jpeg' });
  return jpeg;
}

export async function publishDraft(id) {
  const draft = await store.getJSON(`ap:draft:${id}`);
  if (!draft) return { ok: false, message: 'This draft has expired.' };
  if (draft.state === 'published') return { ok: true, message: 'Already posted.', permalink: draft.permalink };
  if (draft.state === 'skipped') return { ok: false, message: 'This draft was skipped.' };
  if (!(await store.claim(`ap:pub:${id}`, 10 * 60))) return { ok: false, message: 'Already posting…' };
  try {
    const { mediaId, permalink } = await publishImage(draft.brand, { imageUrl: mediaUrl(id), caption: draft.caption });
    await store.setJSON(`ap:draft:${id}`, { ...draft, state: 'published', mediaId, permalink, publishedAt: new Date().toISOString() }, 30 * DAY);
    await recordTaste(draft, 'post');
    return { ok: true, message: 'Posted to Instagram.', permalink };
  } catch (e) {
    await store.del(`ap:pub:${id}`).catch(() => null);
    return { ok: false, message: `Instagram refused it: ${e.message}` };
  }
}

// Instagram not connected yet: the editor posted it by hand. Recorded as a post for the brain.
export async function markPosted(id) {
  const draft = await store.getJSON(`ap:draft:${id}`);
  if (!draft) return { ok: false, message: 'This draft has expired.' };
  if (draft.state === 'published' || draft.state === 'posted-by-hand') return { ok: true, message: 'Noted.' };
  await store.setJSON(`ap:draft:${id}`, { ...draft, state: 'posted-by-hand' }, 30 * DAY);
  await recordTaste(draft, 'post');
  return { ok: true, message: 'Noted. I’ll look for more like this.' };
}

export async function skipDraft(id) {
  const draft = await store.getJSON(`ap:draft:${id}`);
  if (!draft) return { ok: false, message: 'This draft has expired.' };
  if (draft.state === 'published') return { ok: false, message: 'Already posted.' };
  await store.setJSON(`ap:draft:${id}`, { ...draft, state: 'skipped' }, 7 * DAY);
  if (draft.state !== 'skipped') await recordTaste(draft, 'skip');
  return { ok: true, message: 'Skipped.' };
}
