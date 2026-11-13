// Finds a picture for a story: the feed's own photo, an ESPN headshot of the scorer,
// or Wikipedia's photo of the athlete named in the headline. Every picture keeps its
// source so it can be credited or swapped.
import { memoize } from '../http.js';
import { dataUri } from './render.js';
import { namesIn } from './names.js';
import { upsize } from '../rss.js';

const WIKI_UA = 'NXTSportsStudio/1.0 (sports newsroom; contact via github.com/nxtdelhi123-del/Sportsnews)';
const SPORTY = /cricket|footbal|soccer|athlet|sprinter|runner|player|boxer|wrestl|shooter|archer|golfer|tennis|badminton|hockey|racing driver|formula one|swimmer|weightlift|javelin|jumper|gymnast|paddler|chess|kabaddi|olympi|medallist|medalist|squash|striker|midfielder|goalkeeper|defender|bowler|batter|batsman|all-rounder/i;
export { namesIn };

// Wikipedia: first search hit that reads like a sportsperson, with its lead image.
export function wikiPhoto(name) {
  return memoize(`wiki:${name.toLowerCase()}`, 6 * 60 * 60_000, async () => {
    const qs = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: name, gsrlimit: '3', gsrnamespace: '0', prop: 'pageimages|description', piprop: 'thumbnail|original', pithumbsize: '1280', pilicense: 'any', origin: '*' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${qs}`, { signal: ctrl.signal, headers: { 'User-Agent': WIKI_UA, Accept: 'application/json' } });
      if (!res.ok) return null;
      const pages = Object.values((await res.json())?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
      const page = pages.find((p) => (p.thumbnail?.source || p.original?.source) && SPORTY.test(p.description || '') && !/\b(list|team|stadium|season)\b/i.test(p.title));
      if (!page) return null;
      // a 1280 px rendition (a size Wikimedia serves): the originals run to many megabytes
      return { url: page.thumbnail?.source || page.original.source, credit: `Wikipedia · ${page.title}`, title: page.title };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
}

// A named Wikipedia page's lead image (a stadium or club, where no person is in the story).
export function wikiPageImage(title) {
  return memoize(`wikipage:${title}`, 24 * 60 * 60_000, async () => {
    const qs = new URLSearchParams({ action: 'query', format: 'json', titles: title, prop: 'pageimages', piprop: 'thumbnail|original', pithumbsize: '1280', origin: '*' });
    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${qs}`, { headers: { 'User-Agent': WIKI_UA, Accept: 'application/json' } });
      if (!res.ok) return null;
      const page = Object.values((await res.json())?.query?.pages || {})[0];
      const url = page?.thumbnail?.source || page?.original?.source;
      return url ? { url, credit: `Wikipedia · ${title}` } : null;
    } catch {
      return null;
    }
  });
}

const headshot = (sport, id) => (sport === 'soccer' && id ? `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png` : '');

// Pixel width of a JPEG / PNG / WebP data URI (0 when unknown), to prefer the sharper picture.
export function imageWidth(uri = '') {
  const b64 = String(uri).split(',')[1] || '';
  const buf = Buffer.from(b64.slice(0, 400_000), 'base64');
  if (buf[0] === 0x89 && buf[1] === 0x50) return buf.readUInt32BE(16);
  if (buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8X') return 1 + buf.readUIntLE(24, 3);
    if (kind === 'VP8 ') return buf.readUInt16LE(26) & 0x3fff;
    if (kind === 'VP8L') return 1 + (((buf[22] & 0x3f) << 8) | buf[21]);
  }
  for (let i = 2; i + 9 < buf.length; ) {
    if (buf[i] !== 0xff) return 0;
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return buf.readUInt16BE(i + 7);
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return 0;
}

// The article's own lead picture (og:image / twitter:image): usually 1200 px or more,
// where the feed only carries a thumbnail. Google News links are redirects, skipped.
export function articleImage(link) {
  if (!/^https?:\/\//.test(link || '') || /news\.google\.com/.test(link)) return Promise.resolve('');
  return memoize(`og:${link}`, 6 * 60 * 60_000, async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    try {
      const res = await fetch(link, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': WIKI_UA, Accept: 'text/html' } });
      if (!res.ok || !/html/.test(res.headers.get('content-type') || '')) return '';
      const html = (await res.text()).slice(0, 400_000);
      const meta = (prop) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))?.[1] || '';
      const url = (meta('og:image:secure_url') || meta('og:image') || meta('twitter:image') || '').replace(/&amp;/g, '&');
      return /^https?:\/\//.test(url) ? upsize(url) : '';
    } catch {
      return '';
    } finally {
      clearTimeout(timer);
    }
  });
}

// Best available picture for a pack: { hero, cutout, credit }. Heroes are data URIs.
// The sharper of the feed's picture and the article's lead picture wins.
export async function findPhotos(story, { fallbackPage = '' } = {}) {
  const out = { hero: null, cutout: null, credit: '' };
  if (story.kind === 'news') {
    const [feed, lead] = await Promise.all([story.image ? dataUri(upsize(story.image)) : null, articleImage(story.link).then((u) => (u ? dataUri(u) : null))]);
    const best = [lead, feed].filter(Boolean).sort((a, b) => imageWidth(b) - imageWidth(a))[0];
    if (best) {
      out.hero = best;
      out.credit = story.source || 'feed';
    }
  } else if (story.image) {
    out.hero = await dataUri(story.image);
    if (out.hero) out.credit = story.source || 'feed';
  }
  if (!out.hero && story.kind === 'news') {
    for (const name of namesIn(story.title).slice(0, 2)) {
      const w = await wikiPhoto(name);
      if (w) {
        out.hero = await dataUri(w.url, { max: 8_000_000, timeout: 5000, ua: WIKI_UA });
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
  // nobody to picture (a club story): the brand's ground
  if (!out.hero && !out.cutout && fallbackPage) {
    const w = await wikiPageImage(fallbackPage);
    if (w) {
      out.hero = await dataUri(w.url, { max: 8_000_000, timeout: 5000, ua: WIKI_UA });
      if (out.hero) out.credit = w.credit;
    }
  }
  return out;
}
