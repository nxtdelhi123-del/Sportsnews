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
// Nothing reaches Instagram without that tap, except breaking news an official (T1) source has
// confirmed, which posts on its own and tells the editor afterwards (lib/studio/autopost.js).
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { candidates, buildPack, dupKey } from './packs.js';
import { BRANDS, ageHours } from './score.js';
import { renderPack, loadAssets } from './render.js';
import { EXACT_PHOTO } from './photos.js';
import * as store from './store.js';
import * as tg from './telegram.js';
import { instagramConfigured, publishImage } from './instagram.js';
import { judge, readTaste, recordTaste, brainAvailable } from './editor.js';
import { autopostCheck, autopostGate, noteAutopost } from './autopost.js';
import { alertWhatsapp } from './whatsapp.js';

const DAY = 24 * 3600;
const env = (k, d) => process.env[k] ?? d;
// A post never reaches the phone without a photo; the photo search always tries the
// person, other outlets, ESPN's agency photos, the event and the sport before giving up.
export async function photoCheck(brandId, pack) {
  const brand = BRANDS[brandId];
  const assets = await loadAssets({ ...pack, brand }, brand);
  // every post has a picture (the search ends in the event's and the sport's photos); only a
  // story with no picture anywhere at all waits
  return { ok: !!(assets.hero || assets.cutout), sharp: !!assets.sharp, exact: EXACT_PHOTO.has(assets.photoFrom), credit: assets.credit || '' };
}

export const settings = () => ({
  brands: String(env('AUTOPILOT_BRANDS', 'tsb')).split(',').map((s) => s.trim()).filter((b) => BRANDS[b]),
  minScore: Number(env('AUTOPILOT_MIN_SCORE', 3)),
  maxPerRun: Number(env('AUTOPILOT_MAX_PER_RUN', 3)),
  dailyCap: Number(env('AUTOPILOT_DAILY_CAP', 20)),
  maxAgeHours: Number(env('AUTOPILOT_MAX_AGE_HOURS', 2)),
  // With the brain on, the rules let more through and Claude makes the call.
  brainMinScore: Number(env('AUTOPILOT_BRAIN_MIN_SCORE', 2)),
  maxJudge: Number(env('AUTOPILOT_MAX_JUDGE', 15)),
  resultsOverCap: env('AUTOPILOT_RESULTS_OVER_CAP', '1') !== '0',
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
// A headline on an official site (T1: governing body, league, team, event) is Confirmed.
export const statusOf = (story) => (story.kind === 'news' ? (story.official ? 'Confirmed' : 'Reported') : story.status?.state === 'post' ? 'Confirmed' : 'Developing');

// The editor wants every post to look different from the last few (24 Nov 2026). News layouts
// that suit any headline rotate, never repeating the last two used.
const ROTATE = ['tsb-headline', 'tsb-binge', 'tsb-verdict'];
export async function varyTemplate(brandId, pack) {
  if (brandId !== 'tsb' || pack.story?.kind !== 'news' || !ROTATE.includes(pack.template)) return pack;
  const recent = await store.getList(`ap:tpl:${brandId}`, 2).catch(() => []);
  const next = ROTATE.find((t) => !recent.includes(t)) || pack.template;
  await store.pushList(`ap:tpl:${brandId}`, next, 6).catch(() => null);
  return { ...pack, template: next };
}

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

// The draft as it is frozen in the store and shown on the phone.
export function draftFrom(brandId, c, pack, now = Date.now(), extra = {}) {
  const brand = BRANDS[brandId];
  return {
    id: randomBytes(9).toString('base64url'),
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
    ...extra,
  };
}

export const seenKey = (brandId, c) => `ap:seen:${brandId}:${dupKey(c.story, c.type)}`;

export async function runAutopilot({ now = Date.now(), log = console, getCandidates = candidates, getPack = buildPack, getVerdicts = judge, checkPhoto = photoCheck } = {}) {
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
    // Stories the brain turned down are not asked about again; if it could not be reached,
    // they wait for the next run.
    if (chosen.failed) report.errors.push(`${brandId}: editor brain unavailable, ${fresh.length - chosen.length} stories wait for the next run`);
    else for (const c of fresh) if (!picked.has(c.key)) await store.claim(seenKey(brandId, c), 3 * DAY);
    if (!chosen.failed) report.rejected = (report.rejected || 0) + fresh.length - chosen.length;
    let made = 0;
    const brainJudged = brainAvailable() && !chosen.failed;
    for (const c of chosen) {
      if (made >= cfg.maxPerRun) break;
      // Over the day's cap, the story stays unclaimed so tomorrow's first run can still send it.
      // Final scores beat the cap: a match that ends late in the day still reaches the phone.
      // So does confirmed breaking news, which has its own cap (AUTOPOST_DAILY_CAP).
      const overCap = (cfg.resultsOverCap && c.type === 'result') || autopostCheck(c, { now, brain: brainJudged }).ok;
      if (!overCap && (await store.getNumber(dayKey)) >= cfg.dailyCap) {
        report.errors.push(`${brandId}: daily cap of ${cfg.dailyCap} drafts reached`);
        break;
      }
      // One claim per story for three days, whatever outlet or run sees it next.
      if (!(await store.claim(seenKey(brandId, c), 3 * DAY))) continue;
      try {
        const pack = (await getPack(brandId, c.key)) || c;
        const pic = await checkPhoto(brandId, pack);
        if (!pic.ok) {
          // no good photo yet: release the story so a later run (with fuller feeds) can send it
          await store.del(seenKey(brandId, c)).catch(() => null);
          report.waiting = [...(report.waiting || []), { key: c.key, headline: pack.words?.headline, reason: 'no sharp photo yet' }];
          continue;
        }
        // the brain's headline, when every fact in it checks out against the story (editor.js)
        const withHead = c.headline && pack.words ? { ...pack, words: { ...pack.words, headline: c.headline } } : pack;
        const varied = await varyTemplate(brandId, withHead);
        const auto = autopostCheck(c, { now, brain: brainJudged, sharp: pic.sharp, exact: pic.exact !== false });
        const gate = auto.ok ? await autopostGate(brandId, now) : { ok: false };
        const draft = draftFrom(brandId, c, varied, now, auto.confirmed ? { confirmedBy: c.story.official || c.story.source || '' } : {});
        const { id } = draft;
        await store.setJSON(`ap:draft:${id}`, draft, 7 * DAY);
        // Confirmed breaking news: post it now, then tell the editor.
        let posted = null;
        if (auto.ok && gate.ok) {
          posted = await publishDraft(id, { auto: true });
          if (posted.ok) await noteAutopost(brandId, now);
          else report.errors.push(`${c.key}: auto-post failed, sent as a draft: ${posted.message}`);
        }
        const autoNote = auto.confirmed ? (posted?.ok ? '' : auto.ok && !gate.ok ? `⏸ Not posted on its own: ${gate.reason}.` : posted && !posted.ok ? `⚠️ Auto-post failed: ${posted.message}` : `Waiting for your tap: ${auto.reason}.`) : '';
        const msg = posted?.ok
          ? await tg.sendDraft({ ...draft, caption: `${posted.permalink ? `${posted.permalink}\n\n` : ''}${draft.caption}` }, mediaUrl(id), { chatId, buttons: false, header: `⚡ Posted on its own · ${draft.priority} · Confirmed by ${draft.confirmedBy || draft.source}` })
          : await tg.sendDraft(draft, mediaUrl(id), { canPost: instagramConfigured(brandId), chatId, note: [autoNote, pic.exact === false ? '📷 Photo is a loose match (found by surname or topic): check it shows the right person.' : ''].filter(Boolean).join('\n') });
        draft.telegram = { chatId: msg.chat?.id, messageId: msg.message_id };
        if (posted?.ok) Object.assign(draft, { state: 'published', permalink: posted.permalink, mediaId: posted.mediaId, auto: true, publishedAt: new Date().toISOString() });
        await store.setJSON(`ap:draft:${id}`, draft, posted?.ok ? 30 * DAY : 7 * DAY);
        await store.incr(dayKey, 2 * DAY);
        await alertWhatsapp(draft, { autoposted: !!posted?.ok, permalink: posted?.permalink }, log);
        report.drafted.push({ id, brand: brandId, key: c.key, headline: pack.words?.headline, score: c.score, priority: draft.priority, why: draft.why, status: draft.status, autoposted: !!posted?.ok, ...(auto.confirmed && !posted?.ok ? { held: auto.ok ? gate.reason : auto.reason } : {}) });
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
// A post the editor made and sent to the bot is served as they sent it.
export async function renderDraft(draft) {
  if (draft.tgFile) return tg.downloadFile(draft.tgFile);
  const brand = BRANDS[draft.brand];
  const pack = { ...draft.pack, brand };
  const assets = await loadAssets(pack, brand);
  const { jpeg } = await renderPack({ ...pack, assets }, { size: 'post', template: draft.pack.template, format: 'jpeg' });
  return jpeg;
}

export async function publishDraft(id, { auto = false } = {}) {
  const draft = await store.getJSON(`ap:draft:${id}`);
  if (!draft) return { ok: false, message: 'This draft has expired.' };
  if (draft.state === 'published') return { ok: true, message: 'Already posted.', permalink: draft.permalink };
  if (draft.state === 'skipped') return { ok: false, message: 'This draft was skipped.' };
  if (!String(draft.caption || '').trim()) return { ok: false, message: 'This post has no caption yet. Reply to it with the caption text first.' };
  if (!(await store.claim(`ap:pub:${id}`, 10 * 60))) return { ok: false, message: 'Already posting…' };
  try {
    const { mediaId, permalink } = await publishImage(draft.brand, { imageUrl: mediaUrl(id), caption: draft.caption });
    await store.setJSON(`ap:draft:${id}`, { ...draft, state: 'published', mediaId, permalink, publishedAt: new Date().toISOString() }, 30 * DAY);
    // a post that went out on its own says nothing about the editor's taste
    if (!auto) await recordTaste(draft, 'post');
    return { ok: true, message: 'Posted to Instagram.', permalink, mediaId };
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
