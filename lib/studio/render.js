// Renders a post pack to PNG with satori (layout + fonts) and resvg (rasterizer).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { memoize, fetchWithTimeout } from '../http.js';
import { TEMPLATES, SIZES, pickTemplate } from './templates.js';
import { findPhotos } from './photos.js';
import { flagUrl, isNation } from './flags.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FONT_FILES = [
  ['Playfair Display', 'PlayfairDisplay-Black.ttf', 900],
  ['Playfair Display', 'PlayfairDisplay-Bold.ttf', 700],
  ['Abril Fatface', 'AbrilFatface-Regular.ttf', 400],
  ['DM Serif Display', 'DMSerifDisplay-Regular.ttf', 400],
  ['Bebas Neue', 'BebasNeue-Regular.ttf', 400],
  ['Barlow', 'Barlow-Medium.ttf', 500],
  ['Barlow', 'Barlow-SemiBold.ttf', 600],
  ['Barlow', 'Barlow-Bold.ttf', 700],
  ['Barlow Condensed', 'BarlowCondensed-Bold.ttf', 700],
  ['Barlow Condensed', 'BarlowCondensed-Black.ttf', 900],
  ['Inter', 'Inter-SemiBold.ttf', 600],
  ['Bodoni Moda', 'BodoniModa-Black.ttf', 900],
  ['Anton', 'Anton-Regular.ttf', 400],
  ['Oswald', 'Oswald-Bold.ttf', 700],
];

let fontsPromise;
export function loadFonts() {
  fontsPromise ||= Promise.all(FONT_FILES.map(async ([name, file, weight]) => ({ name, weight, style: 'normal', data: await readFile(path.join(here, 'fonts', file)) })));
  return fontsPromise;
}

// Remote images become data URIs so satori never has to fetch during layout.
export function dataUri(url, { max = 4_000_000, timeout = 2500 } = {}) {
  if (!url || !/^https?:\/\//i.test(url)) return Promise.resolve(null);
  return memoize(`img:${url}`, 60 * 60_000, async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36', Accept: 'image/*' } });
      if (!res.ok) return null;
      const type = res.headers.get('content-type') || 'image/png';
      if (!/^image\//.test(type)) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > max) return null;
      return `data:${type.split(';')[0]};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
}

// Brand badges ship with the function (public/studio/brand/*.png) and are read from disk.
export function badgeData(brand) {
  if (!brand?.badge) return Promise.resolve(null);
  return memoize(`badge:${brand.id}`, 60 * 60_000, async () => {
    try {
      const buf = await readFile(path.join(here, '..', '..', 'public', brand.badge));
      return `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  });
}

// Flags for nations (matches between countries, and the country a medal story is about).
const flagData = (name) => (isNation(name) ? dataUri(flagUrl(name)) : Promise.resolve(null));

export async function loadAssets(pack, brand, { hero: ownHero, cutout: ownCutout, cutoutAspect } = {}) {
  const s = pack.story;
  const country = pack.words?.country || '';
  const [homeLogo, awayLogo, badge, photos, flag, homeFlag, awayFlag] = await Promise.all([
    dataUri(s.home?.logo),
    dataUri(s.away?.logo),
    badgeData(brand),
    ownHero ? { hero: ownHero, credit: 'owner' } : findPhotos(s),
    flagData(country),
    s.kind === 'news' ? null : flagData(s.home?.name),
    s.kind === 'news' ? null : flagData(s.away?.name),
  ]);
  return { homeLogo, awayLogo, badge, hero: photos.hero || null, cutout: ownCutout || (ownHero ? null : photos.cutout) || null, cutoutAspect: ownCutout ? cutoutAspect || 0.72 : 1, credit: photos.credit || '', flag, homeFlag, awayFlag, country };
}

// Film grain over the finished poster: a small noise tile, rendered once, repeated as a
// pattern and blended on top. (A full-size turbulence filter costs ~0.8 s per poster.)
const GRAIN = { 'tsb-cream': 0.32, 'tsb-tally': 0.32 };
let grainTile = null;
function grainData() {
  if (grainTile) return grainTile;
  const T = 256;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="${T}" height="${T}" filter="url(#n)"/></svg>`;
  const png = new Resvg(svg).render().asPng();
  grainTile = `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
  return grainTile;
}
export function withGrain(svg, W, H, name) {
  const opacity = GRAIN[name] ?? 0.42;
  const layer = `<defs><pattern id="nxt-grain" width="256" height="256" patternUnits="userSpaceOnUse"><image href="${grainData()}" width="256" height="256"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#nxt-grain)" style="mix-blend-mode:overlay" opacity="${opacity}"/>`;
  return svg.replace(/<\/svg>\s*$/, `${layer}</svg>`);
}

export async function renderPack(pack, { size = 'post', template, width } = {}) {
  const name = template || pickTemplate(pack);
  const fn = TEMPLATES[name];
  if (!fn) throw new Error(`unknown template ${name}`);
  const [W, H] = SIZES[size] || SIZES.post;
  const svg = withGrain(await satori(fn(pack, size), { width: W, height: H, fonts: await loadFonts() }), W, H, name);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width || W }, font: { loadSystemFonts: false } }).render().asPng();
  return { png, template: name, width: W, height: H };
}

export { fetchWithTimeout };
