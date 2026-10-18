// Type engine: the fonts the posters use, exact text measuring (opentype.js on the same
// TTFs satori draws with), sizes that make a line fill its measure, balanced line breaks,
// and textured metal fills.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';

const here = path.dirname(fileURLToPath(import.meta.url));

// key → [family as satori knows it, file, weight, style]
export const FONT_FILES = {
  cond: ['TSB Condensed', 'NotoSerifDisplay-CondBlack.ttf', 900, 'normal'],
  semi: ['TSB Semicondensed', 'NotoSerifDisplay-SemiCondXBold.ttf', 800, 'normal'],
  didone: ['TSB Didone', 'NotoSerifDisplay-Black.ttf', 900, 'normal'],
  didoneBold: ['TSB Didone', 'NotoSerifDisplay-Bold.ttf', 700, 'normal'],
  didoneMed: ['TSB Didone', 'NotoSerifDisplay-Medium.ttf', 500, 'normal'],
  didoneItal: ['TSB Didone', 'NotoSerifDisplay-SemiBoldItalic.ttf', 600, 'italic'],
  mont: ['Montserrat', 'Montserrat-Medium.ttf', 500, 'normal'],
  montBold: ['Montserrat', 'Montserrat-Bold.ttf', 700, 'normal'],
  anton: ['Anton', 'Anton-Regular.ttf', 400, 'normal'],
  oswald: ['Oswald', 'Oswald-Bold.ttf', 700, 'normal'],
  bebas: ['Bebas Neue', 'BebasNeue-Regular.ttf', 400, 'normal'],
  barlow: ['Barlow', 'Barlow-Medium.ttf', 500, 'normal'],
  barlowSemi: ['Barlow', 'Barlow-SemiBold.ttf', 600, 'normal'],
  inter: ['Inter', 'Inter-SemiBold.ttf', 600, 'normal'],
};

// Style props for a font key.
export const font = (key) => {
  const [family, , weight, style] = FONT_FILES[key];
  return { fontFamily: family, fontWeight: weight, fontStyle: style };
};

// satori font list for every key (deduplicated by family+weight+style).
let satoriFonts = null;
export function fontList() {
  if (satoriFonts) return satoriFonts;
  const seen = new Set();
  satoriFonts = [];
  for (const [family, file, weight, style] of Object.values(FONT_FILES)) {
    const id = `${family}|${weight}|${style}`;
    if (seen.has(id)) continue;
    seen.add(id);
    satoriFonts.push({ name: family, data: readFileSync(path.join(here, 'fonts', file)), weight, style });
  }
  return satoriFonts;
}

const parsed = new Map();
function otf(key) {
  if (!parsed.has(key)) parsed.set(key, opentype.loadSync(path.join(here, 'fonts', FONT_FILES[key][1])));
  return parsed.get(key);
}

// Width in px of `text` at `size`, with letter spacing in em.
export function measure(text, key, size, tracking = 0) {
  const s = String(text);
  if (!s) return 0;
  return otf(key).getAdvanceWidth(s, size, { kerning: true }) + tracking * size * Math.max(0, [...s].length - 1);
}

// Cap height as a fraction of the font size (for vertical rhythm).
export const capHeight = (key) => {
  const f = otf(key);
  return (f.tables.os2?.sCapHeight || f.ascender * 0.7) / f.unitsPerEm;
};

// The size at which `text` exactly fills `maxW` (clamped).
export function fitSize(text, key, maxW, { max = 400, min = 10, tracking = 0 } = {}) {
  const at100 = measure(text, key, 100, tracking);
  if (!at100) return max;
  return Math.max(min, Math.min(max, Math.floor((maxW / at100) * 100 * 0.995)));
}

// Break words into lines of at most maxW at `size`, as evenly as possible:
// minimise the sum of squared leftover space, never leave one short word alone on
// the last line, and prefer to break after a full stop or comma.
export function breakLines(text, key, size, maxW, { tracking = 0, maxLines = 6 } = {}) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const n = words.length;
  if (!n) return [];
  const space = measure(' ', key, size);
  const wW = words.map((w) => measure(w, key, size, tracking));
  const lineW = (i, j) => wW.slice(i, j).reduce((a, b) => a + b, 0) + space * (j - i - 1);
  const best = new Array(n + 1).fill(Infinity);
  const prev = new Array(n + 1).fill(-1);
  const lines = new Array(n + 1).fill(0);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let i = j - 1; i >= 0; i--) {
      const w = lineW(i, j);
      if (w > maxW && j - i > 1) break;
      if (lines[i] + 1 > maxLines) continue;
      let cost = (Math.max(0, maxW - w) / maxW) ** 2 * 100;
      if (w > maxW) cost += 1e6; // a single word wider than the measure
      if (j === n && j - i === 1 && n > 2 && words[j - 1].length <= 5) cost += 60; // orphan
      if (j < n && /[.;:!?]$/.test(words[j - 1])) cost -= 45; // break after a full stop
      else if (j < n && /,$/.test(words[j - 1])) cost -= 20;
      if (j < n && /^(a|an|the|of|to|in|on|at|for|and|by)$/i.test(words[j - 1])) cost += 30; // don't end on a small word
      const total = best[i] + cost;
      if (total < best[j]) {
        best[j] = total;
        prev[j] = i;
        lines[j] = lines[i] + 1;
      }
    }
  }
  if (!Number.isFinite(best[n])) return null; // no layout within maxLines
  const out = [];
  for (let j = n; j > 0; j = prev[j]) out.unshift(words.slice(prev[j], j).join(' '));
  return out;
}

// The largest size (≤ max) at which `text` sets in at most maxLines lines within maxW,
// and the balanced lines at that size.
export function setText(text, key, maxW, { max = 200, min = 24, maxLines = 3, tracking = 0 } = {}) {
  for (let size = max; size >= min; size = Math.floor(size * 0.96)) {
    const lines = breakLines(text, key, size, maxW, { tracking, maxLines });
    if (lines && lines.length <= maxLines && lines.every((l) => measure(l, key, size, tracking) <= maxW)) return { size, lines };
  }
  return { size: min, lines: breakLines(text, key, min, maxW, { tracking, maxLines: 99 }) };
}

// Each line sized to fill the measure (the page's stepped stacks), capped so short
// lines don't balloon.
// Lines for a stack: as few as fit at `size`, stepping the size down until they do.
export function linesFor(text, key, size, maxW, { maxLines = 5, minSize = 20 } = {}) {
  for (let s = size; s >= minSize; s = Math.floor(s * 0.92)) {
    const l = breakLines(text, key, s, maxW, { maxLines });
    if (l) return l;
  }
  return String(text).split(/\s+/);
}

export function stackFill(lines, key, maxW, { max = 300, min = 30, tracking = 0 } = {}) {
  return lines.map((l) => ({ text: l, size: fitSize(l, key, maxW, { max, min, tracking }) }));
}

// ---------------------------------------------------------------- metal textures
const METAL_STOPS = {
  gold: [[0, '#FFF4C8'], [0.2, '#F7DC8E'], [0.42, '#C8962E'], [0.56, '#F3D27F'], [0.8, '#9C6D18'], [1, '#6A4708']],
  silver: [[0, '#FFFFFF'], [0.22, '#ECEEF2'], [0.44, '#9FA3AD'], [0.58, '#E4E6EB'], [0.8, '#7D8089'], [1, '#55575E']],
  bronze: [[0, '#FFC48F'], [0.2, '#EE9450'], [0.42, '#B5561E'], [0.58, '#DE8240'], [0.8, '#8A3D12'], [1, '#55230A']],
  red: [[0, '#FF8A80'], [0.3, '#F2382C'], [0.6, '#C8160D'], [1, '#8A0C06']],
  cream: [[0, '#FFF8EA'], [0.5, '#F3E6D0'], [1, '#D9C7A8']],
};
const texCache = new Map();
// A brushed-metal texture (vertical bands, horizontal streaks, fine grain) as a data URI.
export function metalTexture(metal) {
  if (!METAL_STOPS[metal]) return null;
  if (texCache.has(metal)) return texCache.get(metal);
  const T = 512;
  const stops = METAL_STOPS[metal].map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient><filter id="b"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer></filter><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="7"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer></filter></defs><rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" filter="url(#b)" style="mix-blend-mode:overlay"/><rect width="100%" height="100%" filter="url(#n)" style="mix-blend-mode:overlay"/></svg>`;
  const uri = `data:image/png;base64,${Buffer.from(new Resvg(svg).render().asPng()).toString('base64')}`;
  texCache.set(metal, uri);
  return uri;
}
export const METALS = Object.keys(METAL_STOPS);
