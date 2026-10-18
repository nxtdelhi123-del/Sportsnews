// Turns newsroom stories into post packs for a brand.
import { getScores, getNews } from '../feeds.js';
import { memoize } from '../http.js';
import { BRANDS, rankStories } from './score.js';
import { writeWords, writeFormula, eventOf } from './writer.js';
import { pickTemplate } from './templates.js';
import { namesIn } from './names.js';
import { formatDate } from '../../public/js/format.js';
import { createHash } from 'node:crypto';

const IST = 'Asia/Kolkata';
export const storyKey = (s) => (s.kind === 'news' ? `news:${s.id}` : `match:${s.league.path}:${s.id}`);

export async function allStories() {
  const [scores, news] = await Promise.all([getScores('all'), getNews()]);
  const items = news.items.map((n) => ({ ...n, kind: 'news' }));
  return [...scores.matches, ...items];
}

export async function findStory(key) {
  const stories = await allStories();
  return stories.find((s) => storyKey(s) === key) || null;
}

function whenIST(s) {
  if (!s.date) return {};
  const d = new Date(s.date);
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST }).format(d).toUpperCase();
  const time = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST }).format(d).toUpperCase() + ' IST';
  return { day, time };
}

// Candidates: ranked stories with formula words (fast, no API calls).
export function candidates(brandId, limit = 24) {
  const brand = BRANDS[brandId];
  return memoize(`studio:cands:${brandId}`, 3 * 60_000, async () => {
    const all = rankStories(await allStories(), brand);
    const above = all.filter((r) => r.score >= brand.threshold);
    const seen = new Set();
    const ranked = (above.length >= 6 ? above : all.slice(0, 6))
      .filter(({ story, type }) => {
        const k = dupKey(story, type);
        return seen.has(k) ? false : seen.add(k);
      })
      .slice(0, limit);
    return ranked.map(({ story, score, reason, type }) => {
      const words = writeFormula(story, type, brand);
      const pack = { key: storyKey(story), brand: { id: brand.id, handle: brand.handle, name: brand.name }, type, score, reason, words, story: slimStory(story), when: whenIST(story) };
      pack.template = pickTemplate({ ...pack, brand });
      return pack;
    });
  });
}

// One full pack with Claude-written words when available (used by the renderer and the desk).
export function buildPack(brandId, key) {
  const brand = BRANDS[brandId];
  return memoize(`studio:pack:${brandId}:${key}`, 3 * 60_000, async () => {
    const story = await findStory(key);
    return story ? packFromStory(brand, story, key) : null;
  });
}

// A pack for a story the owner pasted (not in the newsroom). Memoized on the story's
// content so the desk's size, template and edit round-trips don't re-run Claude.
export function pastedPack(brandId, story) {
  const brand = BRANDS[brandId];
  const key = story.kind === 'news' ? 'news:pasted' : 'match:pasted:pasted';
  const hash = createHash('sha1').update(JSON.stringify(story)).digest('hex').slice(0, 16);
  return memoize(`studio:pasted:${brandId}:${hash}`, 3 * 60_000, () => packFromStory(brand, story, key));
}

async function packFromStory(brand, story, key) {
  const { score, reason, type } = rankStories([story], brand)[0] || { score: 0, reason: 'excluded', type: postTypeOf(story) };
  const words = await writeWords(story, type, brand);
  const pack = { key, brand: { id: brand.id, handle: brand.handle, name: brand.name, broadcastLine: brand.broadcastLine }, type, score, reason, words, story: slimStory(story), when: whenIST(story) };
  pack.template = pickTemplate({ ...pack, brand });
  return pack;
}
const postTypeOf = (s) => (s.kind === 'news' ? 'breaking' : s.status?.state === 'pre' ? 'preview' : s.status?.state === 'in' ? 'live' : 'result');

// Outlets word the same medal differently; the athlete, the event and the metal identify it.
export function dupKey(story, type) {
  if (story.kind !== 'news') return `${story.home?.name}|${story.away?.name}|${story.status?.state}`;
  const names = namesIn(story.title).map((n) => n.toLowerCase()).sort();
  const metal = ((story.title.match(/\b(gold|silver|bronze)\b/i) || [])[1] || '').toLowerCase();
  if (names.length && ['medal', 'milestone', 'stage', 'quote'].includes(type)) return `${type}:${names.join('+')}:${eventOf(story.title).replace(/^(MEN'S|WOMEN'S|MIXED)\s+/, '')}:${metal}`;
  return story.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 7).join(' ');
}

function slimStory(s) {
  const { details, ...rest } = s;
  return { ...rest, details: details ? { stats: details.stats?.slice(0, 6), innings: details.innings, playerOfTheMatch: details.playerOfTheMatch } : undefined, dateIST: s.date ? formatDate(s.date, IST) : undefined };
}
