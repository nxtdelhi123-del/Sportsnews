// Auto-post: breaking news that an official source has confirmed goes straight to Instagram.
//
// The editor's rule (24 Nov 2026): a breaking story publishes on its own only when its facts are
// Confirmed by a T1 source (the governing body's, league's, team's or event's own site, see
// OFFICIAL_SITES in lib/sources.js). Reported, Developing and Unverified stories still arrive
// on Telegram as drafts and wait for the editor's tap.
//
// Every one of these must hold, or the story falls back to an ordinary draft:
//   - Confirmed: the story is on an official site (match results too, only with AUTOPOST_RESULTS=1);
//   - the editor's brain (Gemini or Claude, not the rules alone) chose it as P1, or P2 when allowed,
//     and wrote a headline whose every fact checks out against the story (safeHeadline);
//   - it is breaking: published within AUTOPOST_MAX_AGE_MIN minutes, and not an opinion,
//     preview, explainer, list or question;
//   - it has a sharp photo that is certainly of the story (its own picture, or one captioned
//     with a full name from it, never a surname-only match);
//   - auto-posting isn't paused (/pause in the chat, or AUTOPOST=off), Instagram is connected,
//     and the day's auto-post cap and the gap between auto-posts allow it.
import * as store from './store.js';
import { ageHours } from './score.js';
import { instagramConfigured } from './instagram.js';

const env = (k, d) => process.env[k] ?? d;
export const autopostSettings = () => ({
  on: String(env('AUTOPOST', 'on')).toLowerCase() !== 'off',
  priorities: String(env('AUTOPOST_PRIORITIES', 'P1,P2')).split(',').map((s) => s.trim().toUpperCase()),
  maxAgeMin: Number(env('AUTOPOST_MAX_AGE_MIN', 90)),
  dailyCap: Number(env('AUTOPOST_DAILY_CAP', 8)),
  gapMin: Number(env('AUTOPOST_GAP_MIN', 20)),
  results: env('AUTOPOST_RESULTS', '0') === '1',
});

const PAUSE_KEY = 'ap:autopost:paused';
export const pauseAutopost = () => store.setJSON(PAUSE_KEY, { at: new Date().toISOString() }, 365 * 24 * 3600);
export const resumeAutopost = () => store.del(PAUSE_KEY);
export const autopostPaused = async () => !!(await store.getJSON(PAUSE_KEY).catch(() => null));

const istDay = (now) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
const countKey = (brandId, now) => `ap:autopost:count:${brandId}:${istDay(now)}`;
const lastKey = (brandId) => `ap:autopost:last:${brandId}`;

// Not news, or not settled enough to publish without a person reading it first.
const NOT_BREAKING = /\?|\b(predict(ed|ion|s)?|preview|debrief|analysis|explained|opinion|column|where do|what we learned|talking points|ratings|power rankings|mailbag|podcast|highlights|watch|could|might|set to|likely|expected to|in talks|considering|eyes|weighs)\b|\b\d+ (things|drivers|players|talking|takeaways|moments|reasons)\b|\bmedia\s*$/i;
// Official sites also carry fixtures, match centres, galleries and section pages, which are not news.
const NOT_NEWS = /\bvs\.?\b|\bv\s[A-Z]|\b(poster|trivia|wallpaper|tickets?|schedule|fixtures?|match centre|live|gallery|photos|video|scorecard|results? and updates|news and updates|standings)\b|\b\d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* 20\d\d\s*$|^[^ ]+( [^ ]+){0,3}$|- [A-Z][\w.]+\.com$/i;

// Why a story can or cannot auto-post: { ok, confirmed, reason }.
// `confirmed` alone (no auto-post) still labels the Telegram draft.
export function autopostCheck(c, { now = Date.now(), brain = true, sharp = true, exact = true } = {}) {
  const cfg = autopostSettings();
  const s = c.story || {};
  const confirmed = s.kind === 'news' ? !!(s.official || s.scorecard) : s.status?.state === 'post';
  const no = (reason) => ({ ok: false, confirmed, reason });
  if (!confirmed) return no('not confirmed by an official source');
  if ((s.kind !== 'news' || s.scorecard) && !cfg.results) return no('scores and scorecard milestones wait for your tap (AUTOPOST_RESULTS=1 to change)');
  if (!s.scorecard && (!brain || !c.by || c.by === 'rules')) return no('the editor brain did not judge it');
  if (!cfg.priorities.includes(c.priority)) return no(`${c.priority || 'no priority'}: only ${cfg.priorities.join('/')} post on their own`);
  if (s.kind === 'news') {
    const age = ageHours(s, now) * 60;
    if (!(age <= cfg.maxAgeMin)) return no(`published ${Math.round(age)} min ago, older than ${cfg.maxAgeMin} min`);
    if (NOT_BREAKING.test(`${s.title || ''}`)) return no('reads as preview, opinion or speculation');
    if (NOT_NEWS.test(`${s.title || ''}`)) return no('a fixture, gallery or section page, not news');
    if (!c.headline && !s.scorecard) return no('no checked headline from the editor brain');
  }
  if (!sharp) return no('no sharp photo yet');
  if (!exact) return no('no photo certain to show the right person');
  return { ok: true, confirmed, reason: `Confirmed by ${s.official || s.source || 'the official result'}` };
}

// The gates outside the story itself: paused, Instagram, the daily cap, the gap.
export async function autopostGate(brandId, now = Date.now()) {
  const cfg = autopostSettings();
  if (!cfg.on) return { ok: false, reason: 'auto-posting is off (AUTOPOST=off)' };
  if (await autopostPaused()) return { ok: false, reason: 'auto-posting is paused (/resume to restart)' };
  if (!instagramConfigured(brandId)) return { ok: false, reason: 'Instagram is not connected yet' };
  if ((await store.getNumber(countKey(brandId, now))) >= cfg.dailyCap) return { ok: false, reason: `today's ${cfg.dailyCap} auto-posts are done` };
  const last = Number(await store.getNumber(lastKey(brandId))) || 0;
  if (last && now - last < cfg.gapMin * 60_000) return { ok: false, reason: `last auto-post was under ${cfg.gapMin} min ago` };
  return { ok: true };
}

export async function noteAutopost(brandId, now = Date.now()) {
  await store.incr(countKey(brandId, now), 2 * 24 * 3600);
  await store.setJSON(lastKey(brandId), now, 2 * 24 * 3600);
}
