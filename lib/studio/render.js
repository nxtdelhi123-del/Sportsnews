// Renders a post pack to PNG with satori (layout + fonts) and resvg (rasterizer).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { memoize, fetchWithTimeout } from '../http.js';
import { TEMPLATES, SIZES, pickTemplate } from './templates.js';
import { findPhotos } from './photos.js';

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
];

let fontsPromise;
export function loadFonts() {
  fontsPromise ||= Promise.all(FONT_FILES.map(async ([name, file, weight]) => ({ name, weight, style: 'normal', data: await readFile(path.join(here, 'fonts', file)) })));
  return fontsPromise;
}

// Remote images become data URIs so satori never has to fetch during layout.
export function dataUri(url) {
  if (!url || !/^https?:\/\//i.test(url)) return Promise.resolve(null);
  return memoize(`img:${url}`, 60 * 60_000, async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' } });
      if (!res.ok) return null;
      const type = res.headers.get('content-type') || 'image/png';
      if (!/^image\//.test(type)) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 4_000_000) return null;
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

export async function loadAssets(pack, brand, { hero: ownHero } = {}) {
  const s = pack.story;
  const [homeLogo, awayLogo, badge, photos] = await Promise.all([dataUri(s.home?.logo), dataUri(s.away?.logo), badgeData(brand), ownHero ? { hero: ownHero, credit: 'owner' } : findPhotos(s)]);
  return { homeLogo, awayLogo, badge, hero: photos.hero || null, cutout: photos.cutout || null, credit: photos.credit || '', flag: null };
}

export async function renderPack(pack, { size = 'post', template, width } = {}) {
  const name = template || pickTemplate(pack);
  const fn = TEMPLATES[name];
  if (!fn) throw new Error(`unknown template ${name}`);
  const [W, H] = SIZES[size] || SIZES.post;
  const svg = await satori(fn(pack, size), { width: W, height: H, fonts: await loadFonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width || W }, font: { loadSystemFonts: false } }).render().asPng();
  return { png, template: name, width: W, height: H };
}

export { fetchWithTimeout };
