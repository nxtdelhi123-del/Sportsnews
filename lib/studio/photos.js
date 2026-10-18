// Finds a picture for a story: the feed's own photo, an ESPN headshot of the scorer,
// or Wikipedia's photo of the athlete named in the headline. Every picture keeps its
// source so it can be credited or swapped.
import { memoize } from '../http.js';
import { dataUri } from './render.js';

const WIKI_UA = 'NXTSportsStudio/1.0 (sports newsroom; contact via github.com/nxtdelhi123-del/Sportsnews)';
const SPORTY = /cricket|footbal|soccer|athlet|sprinter|runner|player|boxer|wrestl|shooter|archer|golfer|tennis|badminton|hockey|racing driver|formula one|swimmer|weightlift|javelin|jumper|gymnast|paddler|chess|kabaddi|olympi|medallist|medalist|squash|striker|midfielder|goalkeeper|defender|bowler|batter|batsman|all-rounder/i;
const NOT_A_NAME = new Set(['India', 'Australia', 'England', 'Pakistan', 'South', 'Africa', 'New', 'Zealand', 'Sri', 'Lanka', 'Asian', 'Games', 'World', 'Cup', 'Premier', 'League', 'United', 'City', 'Manchester', 'Real', 'Madrid', 'The', 'Team', 'Men', 'Women', 'Day', 'Live', 'Final', 'Gold', 'Silver', 'Bronze', 'Champions', 'Trophy', 'Test', 'ODI', 'T20', 'IPL', 'ICC', 'BCCI', 'Open', 'Grand', 'Prix', 'Formula', 'Super', 'Series', 'Indian', 'National', 'Record', 'Medal']);

// "Parul Chaudhary wins bronze" → ["Parul Chaudhary"]
export function namesIn(text = '') {
  const out = [];
  for (const m of text.matchAll(/\b([A-Z][a-z]+(?:\s(?:[A-Z][a-z]+|de|van|von|bin))+)\b/g)) {
    const words = m[1].split(/\s+/);
    if (words.length < 2 || words.length > 3 || words.some((w) => NOT_A_NAME.has(w))) continue;
    out.push(m[1]);
  }
  return [...new Set(out)];
}

// Wikipedia: first search hit that reads like a sportsperson, with its lead image.
export function wikiPhoto(name) {
  return memoize(`wiki:${name.toLowerCase()}`, 6 * 60 * 60_000, async () => {
    const qs = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: name, gsrlimit: '3', gsrnamespace: '0', prop: 'pageimages|description', piprop: 'original', pilicense: 'any', origin: '*' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${qs}`, { signal: ctrl.signal, headers: { 'User-Agent': WIKI_UA, Accept: 'application/json' } });
      if (!res.ok) return null;
      const pages = Object.values((await res.json())?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
      const page = pages.find((p) => p.original?.source && SPORTY.test(p.description || '') && !/\b(list|team|stadium|season)\b/i.test(p.title));
      if (!page) return null;
      return { url: page.original.source, credit: `Wikipedia · ${page.title}`, title: page.title };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
}

const headshot = (sport, id) => (sport === 'soccer' && id ? `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png` : '');

// Best available picture for a pack: { hero, cutout, credit }. Heroes are data URIs.
export async function findPhotos(story) {
  const out = { hero: null, cutout: null, credit: '' };
  if (story.image) {
    out.hero = await dataUri(story.image);
    if (out.hero) out.credit = story.source || 'feed';
  }
  if (!out.hero && story.kind === 'news') {
    for (const name of namesIn(story.title).slice(0, 2)) {
      const w = await wikiPhoto(name);
      if (w) {
        out.hero = await dataUri(w.url);
        if (out.hero) {
          out.credit = w.credit;
          break;
        }
      }
    }
  }
  if (story.kind !== 'news') {
    const scorer = (story.events || []).find((e) => /goal/i.test(e.type) && e.playerId);
    if (scorer) out.cutout = await dataUri(headshot(story.sport, scorer.playerId));
  }
  return out;
}
