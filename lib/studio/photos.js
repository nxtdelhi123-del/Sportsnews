// Finds a picture for a story: the feed's own photo, an ESPN headshot of the scorer,
// or Wikipedia's photo of the athlete named in the headline. Every picture keeps its
// source so it can be credited or swapped.
import { memoize } from '../http.js';
import { dataUri } from './render.js';
import { namesIn } from './names.js';

const WIKI_UA = 'NXTSportsStudio/1.0 (sports newsroom; contact via github.com/nxtdelhi123-del/Sportsnews)';
const SPORTY = /cricket|footbal|soccer|athlet|sprinter|runner|player|boxer|wrestl|shooter|archer|golfer|tennis|badminton|hockey|racing driver|formula one|swimmer|weightlift|javelin|jumper|gymnast|paddler|chess|kabaddi|olympi|medallist|medalist|squash|striker|midfielder|goalkeeper|defender|bowler|batter|batsman|all-rounder/i;
export { namesIn };

// Wikipedia: first search hit that reads like a sportsperson, with its lead image.
export function wikiPhoto(name) {
  return memoize(`wiki:${name.toLowerCase()}`, 6 * 60 * 60_000, async () => {
    const qs = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: name, gsrlimit: '3', gsrnamespace: '0', prop: 'pageimages|description', piprop: 'thumbnail|original', pithumbsize: '1600', pilicense: 'any', origin: '*' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${qs}`, { signal: ctrl.signal, headers: { 'User-Agent': WIKI_UA, Accept: 'application/json' } });
      if (!res.ok) return null;
      const pages = Object.values((await res.json())?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
      const page = pages.find((p) => (p.thumbnail?.source || p.original?.source) && SPORTY.test(p.description || '') && !/\b(list|team|stadium|season)\b/i.test(p.title));
      if (!page) return null;
      // A 1600 px rendition: sharp on a 1080 poster without the multi-megabyte original.
      return { url: page.thumbnail?.source || page.original.source, credit: `Wikipedia · ${page.title}`, title: page.title };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
}

const headshot = (sport, id) => (sport === 'soccer' && id ? `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png` : '');

// Feeds often carry thumbnails; most publishers' image CDNs serve the same picture larger.
export function upscaleImageUrl(url) {
  if (!url) return url;
  let u = String(url).replace(/&amp;/g, '&');
  u = u.replace(/(ichef\.bbci\.co\.uk\/(?:ace\/standard|ace\/ws|news)\/)\d{2,4}\//, '$11536/'); // BBC
  if (/i\.guim\.co\.uk/.test(u)) u = u.replace(/([?&]width=)\d+/, '$11600').replace(/([?&]quality=)\d+/, '$185'); // Guardian
  if (/espncdn\.com\/combiner\/i\?/.test(u)) u = u.replace(/([?&]w=)\d+/, '$11600').replace(/([?&]h=)\d+/, '$1900'); // ESPN
  if (/365dm\.com/.test(u)) u = u.replace(/\/\d{2,4}x\d{2,4}\//, '/1600x900/'); // Sky Sports
  if (/hscicdn\.com/.test(u)) u = u.replace(/t_ds_[a-z_]*w_\d+/, 't_ds_w_1200').replace(/\/(?:c_crop|c_fill)[^/]*\//, '/'); // Cricinfo
  if (/ndtvimg\.com/.test(u)) u = u.replace(/([?&]downsize=)[^&]+/, '$11200:*'); // NDTV
  if (/timesofindia\.indiatimes\.com\/thumb|static\.toiimg\.com/.test(u)) u = u.replace(/([,&?]width-?=?)\d+/i, (m, a) => `${a}1200`).replace(/([,&?]height-?=?)\d+/i, (m, a) => `${a}900`); // TOI
  if (/\/(\d{2,3})x(\d{2,3})\//.test(u) && /yimg\.com/.test(u)) u = u.replace(/\/w_\d+/, '/w_1600'); // Yahoo
  return u;
}

// Width × height from the first bytes of a PNG, JPEG, GIF or WebP data URI.
export function imageSize(uri) {
  const b64 = String(uri || '').split(',')[1];
  if (!b64) return null;
  const b = Buffer.from(b64.slice(0, 400_000), 'base64');
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length > 10 && b.toString('ascii', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') {
      const n = b.readUInt32LE(21);
      return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 };
    }
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  return null;
}

// The article's own share picture (og:image / twitter:image): publishers size these for
// social cards, usually 1200 px or more. Google News redirect links are skipped.
export function articleImage(link) {
  if (!link || !/^https?:\/\//.test(link) || /news\.google\.com/.test(link)) return Promise.resolve(null);
  return memoize(`og:${link}`, 60 * 60_000, async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    try {
      const res = await fetch(link, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36', Accept: 'text/html' } });
      if (!res.ok || !/html/i.test(res.headers.get('content-type') || 'text/html')) return null;
      const html = (await res.text()).slice(0, 300_000);
      const meta = (prop) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))?.[1] || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'))?.[1];
      const src = meta('og:image:secure_url') || meta('og:image') || meta('twitter:image') || meta('twitter:image:src');
      return src ? new URL(src.replace(/&amp;/g, '&'), link).href : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
}

// A picture is worth using on a 1080 px poster only when it is at least this wide.
export const MIN_HERO_WIDTH = 700;
const sharp = (uri) => {
  const d = imageSize(uri);
  return !!d && d.w >= MIN_HERO_WIDTH && d.h >= 400;
};

// Best available picture for a pack: { hero, cutout, credit }. Heroes are data URIs.
// Order: the article's share picture, the feed's picture at full size, Wikipedia's photo
// of the athlete named in the headline; a blurry thumbnail is only the last resort.
export async function findPhotos(story) {
  const out = { hero: null, cutout: null, credit: '' };
  let soft = null;
  const tryUrl = async (url, credit) => {
    if (!url || out.hero) return;
    const uri = await dataUri(url, { max: 6_000_000, timeout: 3500 });
    if (!uri) return;
    if (sharp(uri)) Object.assign(out, { hero: uri, credit });
    else soft ||= { hero: uri, credit };
  };
  if (story.kind === 'news') {
    await tryUrl(await articleImage(story.link), story.source || 'article');
    if (story.image) {
      await tryUrl(upscaleImageUrl(story.image), story.source || 'feed');
      if (upscaleImageUrl(story.image) !== story.image) await tryUrl(story.image, story.source || 'feed');
    }
    for (const name of namesIn(story.title).slice(0, 2)) {
      if (out.hero) break;
      const w = await wikiPhoto(name);
      if (w) await tryUrl(w.url, w.credit);
    }
  } else if (story.image) {
    await tryUrl(upscaleImageUrl(story.image), story.source || 'feed');
  }
  if (!out.hero && soft) Object.assign(out, soft);
  if (story.kind !== 'news') {
    const scorer = (story.events || []).find((e) => /goal/i.test(e.type) && e.playerId);
    if (scorer) out.cutout = await dataUri(headshot(story.sport, scorer.playerId));
  }
  return out;
}
