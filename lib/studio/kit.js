// Building blocks shared by every poster template (satori element trees).
// Every container with more than one child must be display:flex (satori rule).
import { font, measure, fitSize, metalTexture } from './type.js';

export const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false && c !== '') } });
// Text never shrinks to make room (satori's default would squash lines into each other).
export const text = (s, style) => ({ type: 'div', props: { style: { display: 'flex', flexShrink: 0, ...style }, children: String(s) } });
export const img = (src, style) => ({ type: 'img', props: { src, style } });
export const abs = (x, y, w, hh, style = {}, ...children) => h('div', { position: 'absolute', left: x, top: y, width: w, height: hh, ...style }, ...children);

// 3:4 is the size the pages design at; the rest are options.
export const SIZES = { tall: [1080, 1440], post: [1080, 1350], story: [1080, 1920], square: [1080, 1080] };

export const C = {
  ink: '#121212',
  cream: '#F1ECE2',
  paper: '#EFE9DD',
  red: '#D7191C',
  utd: '#DA291C',
  utdCream: '#F3E6D0',
  navy: '#0E1C3D',
  green: '#0F5B2E',
  saffron: '#FF9933',
  indiaGreen: '#138808',
  gold: '#E6B652',
  white: '#FFFFFF',
};
export const METAL_SOLID = { gold: '#E6B652', silver: '#D9DBE0', bronze: '#D08A55', red: '#E3242B', cream: '#F3E6D0' };

// A word or line in a metal texture with a soft shadow under it.
// Stretch a line vertically (compressed display type) inside a box of the right height.
export function stretched(node, size, lineHeight, k) {
  if (!k || k === 1) return node;
  return h('div', { height: Math.round(size * lineHeight * k), position: 'relative', flexShrink: 0 }, h('div', { transform: `scaleY(${k})`, transformOrigin: 'top', alignSelf: 'flex-start' }, node));
}
const RIM = { gold: '#9C6D18', silver: '#7D8089', bronze: '#8A4519', red: '#8A0C06', cream: '#BFAE8E' };

// A word or line in a metal texture: a rim under it thickens the hairlines (the page's
// display face is heavier than any free one) and a soft shadow lifts it.
export function metal(s, key, size, metalName, { shadow = true, lineHeight = 0.9, tracking = 0, opacity = 0.6, stretch = 1, weight = 0.012 } = {}) {
  const w = Math.ceil(measure(s, key, size, tracking)) + 6;
  const base = { ...font(key), fontSize: size, lineHeight, letterSpacing: tracking * size, whiteSpace: 'nowrap' };
  const tex = metalTexture(metalName);
  const top = tex ? text(s, { ...base, backgroundImage: `url(${tex})`, backgroundSize: `${w}px ${Math.round(size * lineHeight * 1.06)}px`, backgroundClip: 'text', color: 'transparent' }) : text(s, { ...base, color: metalName });
  const rim = weight ? text(s, { ...base, position: 'absolute', left: 0, top: 0, color: RIM[metalName] || 'rgba(0,0,0,0.5)', WebkitTextStroke: `${Math.max(1, size * weight)}px ${RIM[metalName] || 'rgba(0,0,0,0.5)'}` }) : null;
  const under = shadow ? text(s, { ...base, position: 'absolute', left: 0, top: Math.round(size * 0.02), color: `rgba(0,0,0,${opacity})`, textShadow: `0 ${Math.round(size * 0.035)}px ${Math.round(size * 0.1)}px rgba(0,0,0,0.7)` }) : null;
  return stretched(h('div', { position: 'relative' }, under, rim, top), size, lineHeight, stretch);
}

// Solid type with an optional soft shadow; `weight` thickens strokes with a same-colour outline.
export function solid(s, key, size, color, { shadow = false, lineHeight = 0.92, tracking = 0, style = {}, stretch = 1, weight = 0 } = {}) {
  const node = text(s, { ...font(key), fontSize: size, lineHeight, letterSpacing: tracking * size, color, whiteSpace: 'nowrap', ...(weight ? { WebkitTextStroke: `${Math.max(1, size * weight)}px ${color}` } : {}), ...(shadow ? { textShadow: `0 ${Math.max(2, Math.round(size * 0.03))}px ${Math.round(size * 0.1)}px rgba(0,0,0,0.55)` } : {}), ...style });
  return stretched(node, size, lineHeight, stretch);
}

// One line with some words in an accent colour (the MUSC red words).
export function accentLine(s, key, size, color, accentColor, accents, { shadow = false, lineHeight = 0.95, stretch = 1, textureFor } = {}) {
  const words = String(s).split(/\s+/).filter(Boolean);
  const gap = measure(' ', key, size);
  const norm = (w) => w.toUpperCase().replace(/[^\w]/g, '');
  return stretched(
    h('div', { alignItems: 'flex-end' }, words.map((w, i) => {
      const hot = accents.has(norm(w));
      const c = hot ? accentColor : color;
      const tex = textureFor && textureFor(hot);
      const node = tex ? metal(w, key, size, tex, { shadow, lineHeight, weight: 0 }) : solid(w, key, size, c, { shadow, lineHeight });
      return h('div', { marginRight: i < words.length - 1 ? gap : 0 }, node);
    })),
    size,
    lineHeight,
    stretch,
  );
}

// Spaced capitals that shrink to fit `maxW`.
export function label(s, { key = 'mont', size = 22, color = '#fff', tracking = 0.3, maxW = 2000, style = {} } = {}) {
  const t = String(s || '').toUpperCase();
  if (!t) return null;
  const sz = Math.min(size, fitSize(t, key, maxW, { max: size, min: 10, tracking }));
  return text(t, { ...font(key), fontSize: sz, letterSpacing: tracking * sz, color, lineHeight: 1.2, whiteSpace: 'nowrap', ...style });
}

// —— LABEL —— between two hairlines.
export function ruled(s, { width, color = '#fff', lineColor, key = 'mont', size = 20, tracking = 0.32, gap = 18 } = {}) {
  const t = String(s || '').toUpperCase();
  if (!t) return null;
  const sz = Math.min(size, fitSize(t, key, width * 0.8, { max: size, min: 10, tracking }));
  return h('div', { width, alignItems: 'center' }, h('div', { flexGrow: 1, height: 1, backgroundColor: lineColor || color, opacity: 0.6 }), h('div', { marginLeft: gap, marginRight: gap }, text(t, { ...font(key), fontSize: sz, letterSpacing: tracking * sz, color, whiteSpace: 'nowrap' })), h('div', { flexGrow: 1, height: 1, backgroundColor: lineColor || color, opacity: 0.6 }));
}

// Wrapped paragraph text (explainers).
export const para = (s, { key = 'mont', size = 22, color = '#fff', width, lineHeight = 1.4, align = 'left', style = {} } = {}) => (s ? text(s, { ...font(key), fontSize: size, lineHeight, color, maxWidth: width, width, textAlign: align, ...(align === 'center' ? { justifyContent: 'center' } : {}), ...style }) : null);

// The brand's round badge (owner's PNG) or a vector stand-in.
export function badge(brand, size, assets) {
  if (assets?.badge) return h('div', { width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.35)' }, img(assets.badge, { width: size, height: size, objectFit: 'cover' }));
  const lines = brand.id === 'musc' ? ['MUSC', 'RED DEVILS'] : ['SPORTS', 'BINGE'];
  return h(
    'div',
    { width: size, height: size, borderRadius: size / 2, backgroundColor: brand.id === 'musc' ? '#0B0B0D' : C.red, border: `${Math.round(size * 0.05)}px solid ${brand.id === 'musc' ? C.utd : '#fff'}`, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    lines.map((l, i) => text(l, { ...font('bebas'), fontSize: size * (i === 0 ? 0.3 : 0.17), lineHeight: 1, color: '#fff', letterSpacing: 2 })),
  );
}

// A flag picture, the drawn Indian flag, or the team's code in a box.
export function flag(src, w, { nation = '', code = '?', border = 'rgba(0,0,0,0.18)' } = {}) {
  const hh = Math.round(w * 0.66);
  if (src) return img(src, { width: w, height: hh, objectFit: 'cover', border: `1px solid ${border}` });
  if (/^india$/i.test(nation)) {
    return h('div', { width: w, height: hh, flexDirection: 'column', border: `1px solid ${border}` }, h('div', { height: hh / 3, backgroundColor: C.saffron }), h('div', { height: hh / 3, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, h('div', { width: hh * 0.26, height: hh * 0.26, borderRadius: hh, border: `${Math.max(1, Math.round(w * 0.025))}px solid #0B1F6B` })), h('div', { height: hh / 3, backgroundColor: C.indiaGreen }));
  }
  return h('div', { width: w, height: hh, backgroundColor: 'rgba(0,0,0,0.08)', border: `1px solid ${border}`, alignItems: 'center', justifyContent: 'center' }, text(code, { ...font('bebas'), fontSize: hh * 0.5, color: '#555' }));
}
export const crest = (src, size, code = '?') => (src ? img(src, { width: size, height: size, objectFit: 'contain' }) : h('div', { width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }, text(code, { ...font('anton'), fontSize: size * 0.32, color: '#fff' })));

// A medal: ribbon and a textured disc.
export function medal(metalName, size) {
  const tex = metalTexture(metalName);
  return h(
    'div',
    { flexDirection: 'column', alignItems: 'center' },
    h('div', { width: Math.round(size * 0.32), height: Math.round(size * 0.36), backgroundImage: 'linear-gradient(90deg, #0B1F6B 0%, #23409A 50%, #0B1F6B 100%)', marginBottom: -Math.round(size * 0.1) }),
    h('div', { width: size, height: size, borderRadius: size, backgroundImage: `url(${tex})`, backgroundSize: `${size}px ${size}px`, border: '2px solid rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.45)' }, h('div', { width: Math.round(size * 0.74), height: Math.round(size * 0.74), borderRadius: size, border: `${Math.max(2, Math.round(size * 0.035))}px solid rgba(0,0,0,0.2)` })),
  );
}
export const disc = (metalName, size) => h('div', { width: size, height: size, borderRadius: size, backgroundImage: `url(${metalTexture(metalName)})`, backgroundSize: `${size}px ${size}px`, border: '1px solid rgba(0,0,0,0.35)' });

// Saffron · white · green, as a short rule.
export const tricolourRule = (w, hh = 4) => h('div', { width: w, height: hh }, h('div', { width: w / 3, height: hh, backgroundColor: C.saffron }), h('div', { width: w / 3, height: hh, backgroundColor: '#fff' }), h('div', { width: w / 3, height: hh, backgroundColor: C.indiaGreen }));

// The photo, full-bleed, and the cut-out with its glow and contact shadow.
export function photo(assets, W, H, { fallback = 'linear-gradient(160deg, #101219 0%, #1b1520 50%, #07070a 100%)' } = {}) {
  if (assets.hero) return img(assets.hero, { position: 'absolute', left: 0, top: 0, width: W, height: H, objectFit: 'cover' });
  return abs(0, 0, W, H, { backgroundImage: fallback });
}
export function cutout(assets, box, { glow = 'rgba(255,190,120,0.35)' } = {}) {
  if (!assets.cutout) return null;
  const aspect = assets.cutoutAspect || 0.72;
  const hh = Math.min(box.h, Math.round(box.w / aspect));
  const ww = Math.round(hh * aspect);
  const x = box.x + Math.round((box.w - ww) / 2);
  const y = box.y + box.h - hh;
  return [
    // backlight behind the athlete
    abs(x - ww * 0.35, y - hh * 0.05, ww * 1.7, hh * 1.1, { backgroundImage: `radial-gradient(ellipse at 50% 40%, ${glow} 0%, rgba(0,0,0,0) 62%)` }),
    // contact shadow where they stand
    abs(x + ww * 0.08, y + hh - Math.round(hh * 0.05), ww * 0.84, Math.round(hh * 0.08), { backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 70%)' }),
    img(assets.cutout, { position: 'absolute', left: x, top: y, width: ww, height: hh, objectFit: 'contain' }),
  ];
}

// Gradients over the photo so type reads; `stops` as [position 0..1, alpha].
export const shade = (W, H, stops, color = '0,0,0', dir = '180deg') => abs(0, 0, W, H, { backgroundImage: `linear-gradient(${dir}, ${stops.map(([p, a]) => `rgba(${color},${a}) ${Math.round(p * 100)}%`).join(', ')})` });
export const vignette = (W, H, a = 0.55) => abs(0, 0, W, H, { backgroundImage: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,${a}) 100%)` });

// Deterministic pick (layout variety across the grid).
export function hashPick(key, n) {
  let x = 0;
  for (const ch of String(key || '')) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return n ? x % n : x;
}
