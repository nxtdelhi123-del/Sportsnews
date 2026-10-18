// Turns newsroom stories into post packs for a brand.
import { getScores, getNews } from '../feeds.js';
import { memoize } from '../http.js';
import { BRANDS, rankStories } from './score.js';
import { writeWords, writeFormula } from './writer.js';
import { pickTemplate } from './templates.js';
import { formatDate } from '../../public/js/format.js';

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
      .filter(({ story }) => {
        const k = story.kind === 'news' ? story.title.toLowerCase() : `${story.home?.name}|${story.away?.name}|${story.status?.state}`;
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
    if (!story) return null;
    const { score, reason, type } = rankStories([story], brand)[0] || { score: 0, reason: 'excluded', type: 'result' };
    const words = await writeWords(story, type, brand);
    const pack = { key, brand: { id: brand.id, handle: brand.handle, name: brand.name, broadcastLine: brand.broadcastLine }, type, score, reason, words, story: slimStory(story), when: whenIST(story) };
    pack.template = pickTemplate({ ...pack, brand });
    return pack;
  });
}

function slimStory(s) {
  const { details, ...rest } = s;
  return { ...rest, details: details ? { stats: details.stats?.slice(0, 6), innings: details.innings, playerOfTheMatch: details.playerOfTheMatch } : undefined, dateIST: s.date ? formatDate(s.date, IST) : undefined };
}
