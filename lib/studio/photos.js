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
    const qs = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: name, gsrlimit: '3', gsrnamespace: '0', prop: 'pageimages|description', piprop: 'thumbnail|original', pithumbsize: '1280', pilicense: 'any', origin: '*' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${qs}`, { signal: ctrl.signal, headers: { 'User-Agent': WIKI_UA, Accept: 'application/json' } });
      if (!res.ok) return null;
      const pages = Object.values((await res.json())?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
      const page = pages.find((p) => (p.thumbnail?.source || p.original?.source) && SPORTY.test(p.description || '') && !/\b(list|team|stadium|season)\b/i.test(p.title));
      if (!page) return null;
      // A 1280 px rendition: Wikimedia only serves its standard thumbnail widths (1600 answers HTTP 400).
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

const SPORT_WORD = { cricket: 'cricketer', soccer: 'footballer', football: 'American football', basketball: 'basketball', tennis: 'tennis', badminton: 'badminton', hockey: 'hockey', racing: 'racing driver', golf: 'golfer', athletics: 'athlete', combat: 'fighter', chess: 'chess', kabaddi: 'kabaddi', shooting: 'sport shooter', boxing: 'boxer', wrestling: 'wrestler' };
const COMMON = /^(The|A|An|And|Or|But|With|Without|After|Before|As|At|In|On|Of|To|For|From|By|Is|Are|Was|Were|Be|Has|Have|Had|Will|Can|Could|Should|Would|His|Her|Their|Its|This|That|These|Those|Why|How|What|When|Who|Where|Watch|Live|Report|Breaking|Latest|News|Update|Today|Tonight|Major|Big|New|Top|Best|Star|Stars|Coach|Captain|Skipper|Youngest|Oldest|Fastest|Becomes|Wins|Win|Beat|Beats|Reaches|Advances|Final|Semis|Masters|Open|League|Cup|Trophy|Games|Team|Club|Squad|Player|Players|Trade|List|Auction|Retention|Retentions|Men|Women|History|Record|Japan|India|Indian|Pakistan|England|Australia|Kumamoto|Asian|World|Olympic|Olympics)$/;
// ESPN's search (all sports, works from cloud servers): agency photos at 1296 px with
// captions saying who is in them. With `who`, only photos whose caption or headline names
// that person count; the square 1296 crop suits the portrait posters best.
const ESPN_SEARCH = 'https://site.web.api.espn.com/apis/search/v2';
export function espnPhotos(query, { who = '', tone = 0 } = {}) {
  return memoize(`espnsearch:${query.toLowerCase()}`, 60 * 60_000, async () => {
    try {
      const res = await fetch(`${ESPN_SEARCH}?${new URLSearchParams({ query, limit: '10' })}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      const d = await res.json();
      const out = [];
      for (const r of d.results || []) {
        if (r.type !== 'article') continue;
        for (const a of r.contents || []) {
          for (const im of (a.images || []).slice(0, 2)) {
            // "peers" can be other photos: keep only crops of this one (same name or file id)
            const base = String(im.name || '').replace(/\s*\[.*$/, '').trim();
            const fid = (String(im.url || '').match(/(\d{5,})/) || [])[1];
            const same = (x) => x === im || (base && String(x.name || '').replace(/\s*\[.*$/, '').trim() === base) || (fid && String(x.url || '').includes(fid));
            const sizes = [im, ...(im.peers || [])].filter((x) => x.url && same(x) && !/default|logo/i.test(x.url));
            const best = sizes.find((x) => x.width >= 1200 && x.height >= 1200) || sizes.sort((x, y) => (y.width || 0) - (x.width || 0))[0];
            if (best) out.push({ url: best.url, width: best.width || 0, caption: `${base} ${im.caption || ''} ${im.alt || ''}`.trim(), headline: a.displayName || '', date: a.date || '' });
          }
        }
      }
      return out;
    } catch {
      return [];
    }
  }).then((list) => {
    if (!who) return list;
    // The photo must be OF the person: the caption opens with their name (as ESPN's
    // captions name the subject first), and they are not just the opponent ("against X").
    const last = who.split(/\s+/).pop().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const named = new RegExp(`\\b${last}\\b`, 'i');
    const opponent = new RegExp(`\\b(against|vs\\.?|v|beat|beats|defeated?|to)\\s+(\\S+\\s+){0,2}${last}\\b`, 'i');
    const subject = (c) => {
      const at = c.search(named);
      return at >= 0 && at <= 40 && !opponent.test(c);
    };
    // the photo's mood should fit the story: a win gets the celebration, a loss the dejection
    const mood = (c) => (/celebrat|jubilant|roars|fist|trophy|medal|winning|in action|plays a shot|smash|strikes|hits|bowls|runs|leaps|lifts/i.test(c) ? 1 : 0) - (/sad|dejected|disappoint|loses|lost|despair|injur|walks off|looks on|after defeat|reacts after/i.test(c) ? 1 : 0);
    return list.filter((x) => subject(x.caption)).sort((a, b) => tone * (mood(b.caption) - mood(a.caption)) || (b.width || 0) - (a.width || 0));
  });
}

// +1 for a story of success, -1 for a setback, 0 otherwise (to pick the photo's mood).
export const toneOf = (story) => {
  const t = `${story.title || ''} ${story.summary || ''}`;
  if (/\b(lose|loses|lost|beaten|crash(es)? out|knocked out|ruled out|injur\w*|sack\w*|axed|dropped|banned|suspend\w*|defeat|exit|eliminated|retires?)\b/i.test(t)) return -1;
  if (/\b(wins?|won|beat|beats|reach\w*|final|gold|silver|bronze|medal|record|century|hundred|captain|named|youngest|first|history|clinch\w*|seal\w*|title|champion\w*|selected|signs?|joins?)\b/i.test(t)) return 1;
  return 0;
};

// What a story is about when no person is named: the event or the competition.
export function topicQuery(story) {
  const t = String(story.title || '').replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, '');
  const lead = t.split(/:\s+/)[0];
  const caps = (t.match(/\b(?:[A-Z][\w'’]+|[A-Z]{2,}|\d{4})(?:\s+(?:[A-Z][\w'’]+|[A-Z]{2,}|\d{4}))*/g) || []).filter((x) => x.split(' ').length >= 2 || /^[A-Z]{2,}$/.test(x));
  return (lead.split(' ').length <= 5 ? lead : caps[0] || lead.split(' ').slice(0, 5).join(' ')).trim();
}
const SPORT_TOPIC = { cricket: 'India cricket', soccer: 'Premier League', football: 'NFL', basketball: 'NBA', tennis: 'tennis', badminton: 'badminton India', hockey: 'India hockey', racing: 'Formula 1', golf: 'golf', athletics: 'athletics India', combat: 'UFC', chess: 'chess', kabaddi: 'kabaddi', boxing: 'boxing', wrestling: 'wrestling India', baseball: 'MLB', rugby: 'rugby' };

// Other headlines in the newsroom about the same people, with a picture or a direct
// (non-Google) link, most alike first.
export async function poolMatches(story, pool) {
  let items = pool;
  if (!items) {
    try {
      const { getNews } = await import('../feeds.js');
      items = (await getNews()).items;
    } catch {
      return [];
    }
  }
  const subjects = subjectQueries(story).map((q) => q.replace(/\s+(cricketer|footballer|golfer|athlete|fighter|boxer|wrestler|racing driver|sport shooter|tennis|badminton|hockey|chess|kabaddi|basketball|American football)$/, ''));
  if (!subjects.length) return [];
  const words = new Set(String(story.title || '').toLowerCase().match(/[a-z]{4,}/g) || []);
  const alike = (t) => (String(t || '').toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => words.has(w)).length;
  return items
    .filter((n) => n.link !== story.link && (n.image || !/news\.google\.com/.test(n.link || '')))
    .filter((n) => subjects.some((q) => new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(`${n.title} ${n.summary || ''}`)))
    .sort((a, b) => alike(b.title) - alike(a.title) || Number(!!b.image) - Number(!!a.image))
    .slice(0, 4);
}

// Search terms for the people in a story, best first.
export function subjectQueries(story) {
  const text = `${story.title || ''}. ${story.summary || ''}`.replace(/\s+-\s+[^-]+$/, '');
  const full = [...new Set([...namesIn(story.title || ''), ...namesIn(story.summary || '')])];
  const sport = SPORT_WORD[story.sport] || '';
  // lone capitalised words that are not common words or already in a full name
  const lone = [...new Set((String(story.title || '').match(/\b[A-Z][a-z]{3,}(?:['’]s)?\b/g) || []).map((w) => w.replace(/['’]s$/, '')))].filter((w) => !COMMON.test(w) && !NOT_NAME_WORD(w) && !full.some((f) => f.split(' ').includes(w)));
  return [...full, ...lone.map((w) => `${w} ${sport}`.trim())].filter((q) => q.length > 3).slice(0, 4);
}
const NOT_NAME_WORD = (w) => namesIn(`${w} Xyz`).length === 0 && !/^[A-Z][a-z]+$/.test(w);

// Wikimedia Commons: a photo file matching the person, at 1280 px (for people whose
// Wikipedia page has no lead image).
export function commonsPhoto(q) {
  return memoize(`commons:${q.toLowerCase()}`, 12 * 60 * 60_000, async () => {
    const qs = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '5', prop: 'imageinfo', iiprop: 'url|size|mime', iiurlwidth: '1280', origin: '*' });
    try {
      const res = await fetch(`https://commons.wikimedia.org/w/api.php?${qs}`, { headers: { 'User-Agent': WIKI_UA, Accept: 'application/json' } });
      if (!res.ok) return null;
      const pages = Object.values((await res.json())?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
      const surname = q.split(' ').filter((w) => /^[A-Z]/.test(w)).pop() || '';
      const pick = pages.find((p) => {
        const ii = p.imageinfo?.[0];
        return ii && /jpeg|png|webp/.test(ii.mime || '') && (ii.width || 0) >= 800 && new RegExp(surname, 'i').test(p.title || '') && !/logo|map|flag|signature|crest|kit/i.test(p.title || '');
      });
      const ii = pick?.imageinfo?.[0];
      return ii ? { url: ii.thumburl || ii.url, credit: `Wikimedia Commons · ${pick.title.replace(/^File:/, '')}` } : null;
    } catch {
      return null;
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
export async function findPhotos(story, { fallbackPage = '', pool } = {}) {
  const out = { hero: null, cutout: null, credit: '' };
  let soft = null;
  const tryUrl = async (url, credit) => {
    if (!url || out.hero) return;
    // Wikimedia asks for a descriptive user agent and turns away browser-like ones
    const uri = await dataUri(url, { max: 6_000_000, timeout: 3500, ua: /wikimedia\.org/.test(url) ? WIKI_UA : undefined });
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
    // ESPN's agency photos of the person in the story (caption names them), 1296 px
    for (const q of subjectQueries(story).slice(0, 3)) {
      if (out.hero) break;
      const who = q.replace(/\s+(cricketer|footballer|golfer|athlete|fighter|boxer|wrestler|racing driver|sport shooter|tennis|badminton|hockey|chess|kabaddi|basketball|American football)$/, '');
      for (const ph of (await espnPhotos(who, { who, tone: toneOf(story) })).slice(0, 3)) {
        if (out.hero) break;
        await tryUrl(ph.url, 'ESPN');
      }
    }
    // other outlets' coverage of the same people in the newsroom's own feeds: the most
    // reliable source (Google News items carry no picture; Wikipedia rate-limits clouds)
    for (const o of await poolMatches(story, pool)) {
      if (out.hero) break;
      await tryUrl(await articleImage(o.link), o.source || 'feed');
      if (o.image) await tryUrl(upscaleImageUrl(o.image), o.source || 'feed');
    }
    // the people in the story: full names from the headline and summary, then lone
    // surnames ("Sooryavanshi") searched with the sport ("Sooryavanshi cricket")
    for (const q of subjectQueries(story)) {
      if (out.hero) break;
      const w = await wikiPhoto(q);
      if (w) await tryUrl(w.url, w.credit);
    }
    for (const q of subjectQueries(story).slice(0, 2)) {
      if (out.hero) break;
      const c = await commonsPhoto(q);
      if (c) await tryUrl(c.url, c.credit);
    }
  } else {
    if (story.details?.photo?.url) await tryUrl(story.details.photo.url, story.details.photo.credit);
    if (story.image) await tryUrl(upscaleImageUrl(story.image), story.source || 'feed');
    // the fixture, then each team, then the competition: a match post always has a photo
    const h = story.home?.name || '';
    const a = story.away?.name || '';
    for (const q of [h && a ? `${h} ${a}` : '', h, a, story.league?.name].filter(Boolean)) {
      if (out.hero) break;
      for (const ph of (await espnPhotos(q)).slice(0, 3)) {
        if (out.hero) break;
        await tryUrl(ph.url, 'ESPN');
      }
    }
  }
  // nobody to picture (a club story): the brand's ground before a blurry thumbnail
  if (!out.hero && fallbackPage) {
    const w = await wikiPageImage(fallbackPage);
    if (w) await tryUrl(w.url, w.credit);
  }
  // nobody named, or no photo of them anywhere: the event, then the sport — a post never
  // goes out without a picture
  if (!out.hero && story.kind === 'news') {
    for (const q of [topicQuery(story), SPORT_TOPIC[story.sport]].filter(Boolean)) {
      if (out.hero) break;
      for (const ph of (await espnPhotos(q)).slice(0, 3)) {
        if (out.hero) break;
        await tryUrl(ph.url, 'ESPN');
      }
    }
  }
  out.sharp = !!out.hero;
  if (!out.hero && soft) Object.assign(out, soft);
  if (story.kind !== 'news') {
    const scorer = (story.events || []).find((e) => /goal/i.test(e.type) && e.playerId);
    if (scorer) out.cutout = await dataUri(headshot(story.sport, scorer.playerId));
  }
  return out;
}

// Width only (0 when unknown).
export const imageWidth = (uri) => imageSize(uri)?.w || 0;
