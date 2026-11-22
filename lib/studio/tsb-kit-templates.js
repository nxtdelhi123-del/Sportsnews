// @thesportsbinge brand-kit templates (22 Nov 2026): the post types the page was missing,
// all in the 2026 house design that tsb-headline set (navy-black, THE | SPORTS BINGE header,
// fat Didone headline with an ivory first line and copper-leaf lines under it, spaced
// Montserrat caps, photos bright and never covered by type, gold-framed data boxes).
// Every number on these posters comes from pack.words; nothing is filled in by the template.
//
// pack.words fields shared by all of them:
//   headline, kicker, eyebrow ("COMPETITION · DETAIL"), status (Confirmed | Reported |
//   Developing), source, credit (photo credit), accent ('copper' default | 'goldleaf')
import { font, measure, fitSize } from './type.js';
import { h, text, img, abs, SIZES, metal, solid, badge, flag, disc, vignette } from './kit.js';
import { imageSize } from './photos.js';

export const NAVY = '#0A0E17';
export const INK2 = '#141A26';
export const IVORY = '#F4EFE6';
export const COPPER = '#E08A4C';
export const GOLD = '#D4AF37';
export const LIVE_RED = '#E3242B';
const FRAME = 'rgba(212,175,55,0.75)';
const HAIR = 'rgba(255,255,255,0.16)';

const clean = (s = '') => String(s ?? '').replace(/[“”"]/g, '').trim();
const short = (s = '', n = 70) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s);
const leafOf = (w) => (w.accent === 'goldleaf' || w.accent === 'gold' ? 'goldleaf' : 'copper');
const solidOf = (leaf) => (leaf === 'goldleaf' ? '#E9C46A' : COPPER);

export const spaced = (t, sz, color = '#fff', tr = 0.22, style = {}) => text(t, { ...font('mont'), fontSize: sz, letterSpacing: Math.round(sz * tr), color, lineHeight: 1.4, ...style });
export const spacedBold = (t, sz, color = '#fff', tr = 0.2, style = {}) => text(t, { ...font('montBold'), fontSize: sz, letterSpacing: Math.round(sz * tr), color, lineHeight: 1.3, ...style });

// ---------------------------------------------------------------- headline stack
// Split a headline into 1–3 lines that each fill `maxW`, picking the split with the most type
// (biggest sizes), longest phrase first; first line ivory, the rest in leaf.
export function headStack(headline, maxW, { cap = 200, maxLines = 3, uniform = false, maxH = 0 } = {}) {
  const head = clean(headline).toUpperCase();
  const parts = head.split(/\s+/).filter(Boolean);
  const fit = (l) => Math.min(cap, fitSize(l, 'fat', maxW, { tracking: -0.028 }));
  let best = { ls: [head], score: -Infinity };
  const n = parts.length;
  if (n <= 9) {
    for (let mask = 0; mask < 1 << Math.max(0, n - 1); mask++) {
      const ls = [];
      let cur = [parts[0]];
      for (let i = 1; i < n; i++) {
        if (mask & (1 << (i - 1))) { ls.push(cur.join(' ')); cur = [parts[i]]; } else cur.push(parts[i]);
      }
      ls.push(cur.join(' '));
      if (ls.length > maxLines) continue;
      const sizes = ls.map(fit);
      const sum = uniform ? Math.min(...sizes) * ls.length : sizes.reduce((a, b) => a + b, 0);
      // a full stop ends a line; one fat word alone on top of a long stack looks unbalanced
      const stops = ls.slice(0, -1).filter((l) => /[.:]$/.test(l)).length;
      // a tiny word alone on a line (NO. / THE) reads as a mistake
      const lonely = ls.filter((l) => l.replace(/[^A-Z0-9]/g, '').length <= 3).length;
      const score = sum - (ls.length === 1 && n > 2 ? cap * 0.8 : 0) + stops * cap * 0.4 - Math.max(...sizes) * 0.15 - lonely * cap * 1.5;
      if (score > best.score) best = { ls, score };
    }
  }
  let sizes = best.ls.map((l) => Math.max(40, fit(l)));
  if (uniform) sizes = sizes.map(() => Math.min(...sizes));
  // keep the stack inside maxH so the photo below keeps the athlete's head
  const tot = sizes.reduce((a, b) => a + Math.round(b * 0.88 * 1.06), 0);
  if (maxH && tot > maxH) sizes = sizes.map((z) => Math.floor((z * maxH) / tot));
  return best.ls.map((l, i) => ({ text: l, size: sizes[i] }));
}
const lineH = (l) => Math.round(l.size * 0.88 * 1.06);
export const stackHeight = (stack) => stack.reduce((a, l) => a + lineH(l), 0);
export function headNodes(stack, leaf = 'copper', { firstLeaf = false } = {}) {
  return stack.map((l, i) => metal(l.text, 'fat', l.size, (i === 0 && stack.length > 1 && !firstLeaf) ? 'ivory' : leaf, { lineHeight: 0.88, stretch: 1.06, weight: 0, tracking: -0.028, opacity: 0.75 }));
}

// ---------------------------------------------------------------- shared furniture
export function header(pack, W, H, { comp } = {}) {
  const k = H / 1440;
  const P = Math.round(W * 0.05);
  const c = String(comp ?? pack.words?.eyebrow ?? pack.story?.league?.name ?? '').toUpperCase().slice(0, 34);
  return [
    abs(P, Math.round(H * 0.028), Math.round(W * 0.45), Math.round(60 * k), { alignItems: 'center' },
      h('div', { width: 3, height: Math.round(52 * k), backgroundColor: 'rgba(255,255,255,0.85)', marginRight: Math.round(14 * k) }),
      h('div', { flexDirection: 'column' }, spaced('THE', Math.round(19 * k), '#fff', 0.18), spaced('SPORTS BINGE', Math.round(19 * k), '#fff', 0.18))),
    c ? abs(W - P - Math.round(W * 0.5), Math.round(H * 0.03), Math.round(W * 0.5), Math.round(56 * k), { flexDirection: 'column', alignItems: 'flex-end' },
      spaced(c, Math.round(19 * k), '#fff', 0.14), h('div', { width: Math.round(70 * k), height: 2, backgroundColor: '#fff', marginTop: Math.round(6 * k) })) : null,
  ];
}

// Confirmed / Reported / Developing / Breaking / Live as a small framed pill.
const PILL = {
  confirmed: { fg: GOLD, border: FRAME, bg: 'rgba(10,14,23,0.6)' },
  reported: { fg: IVORY, border: 'rgba(244,239,230,0.7)', bg: 'rgba(10,14,23,0.6)' },
  developing: { fg: '#F2B35A', border: 'rgba(242,179,90,0.8)', bg: 'rgba(10,14,23,0.6)' },
  unverified: { fg: '#BBBBBB', border: 'rgba(187,187,187,0.7)', bg: 'rgba(10,14,23,0.6)' },
  breaking: { fg: '#fff', border: LIVE_RED, bg: LIVE_RED },
  live: { fg: '#fff', border: LIVE_RED, bg: LIVE_RED, dot: true },
};
export function pill(kind, size = 16) {
  const p = PILL[String(kind || '').toLowerCase()] || PILL.reported;
  const t = String(kind || '').toUpperCase();
  return h('div', { alignItems: 'center', border: `1.5px solid ${p.border}`, backgroundColor: p.bg, paddingLeft: Math.round(size * 0.8), paddingRight: Math.round(size * 0.65), paddingTop: Math.round(size * 0.35), paddingBottom: Math.round(size * 0.3), borderRadius: 3 },
    p.dot ? h('div', { width: Math.round(size * 0.6), height: Math.round(size * 0.6), borderRadius: size, backgroundColor: '#fff', marginRight: Math.round(size * 0.5) }) : null,
    spacedBold(t, size, p.fg, 0.24, { lineHeight: 1 }));
}

// FOLLOW @THESPORTSBINGE + source + photo credit, bottom-left; badge bottom-right.
export function footer(pack, W, H, { badgeSize, dark = false, y } = {}) {
  const k = H / 1440;
  const P = Math.round(W * 0.05);
  const w = pack.words || {};
  const src = clean(w.source || pack.story?.source || '');
  const credit = clean(w.credit || pack.assets?.credit || '');
  const bs = badgeSize || Math.round(84 * k);
  const fh = Math.round(H * 0.08);
  return [
    dark ? abs(0, H - Math.round(H * 0.16), W, Math.round(H * 0.16), { backgroundImage: `linear-gradient(180deg, rgba(10,14,23,0) 0%, rgba(10,14,23,0.85) 55%, ${NAVY} 100%)` }) : null,
    abs(P, y ?? H - fh - Math.round(10 * k), W - 2 * P, fh, { alignItems: 'center', justifyContent: 'space-between' },
      h('div', { flexDirection: 'column' },
        spaced('FOLLOW @THESPORTSBINGE', Math.round(17 * k), COPPER, 0.2),
        src || credit ? spaced([src ? `SOURCE: ${short(src, 42)}` : '', credit ? `PHOTO: ${short(credit, 24)}` : ''].filter(Boolean).join('  ·  ').toUpperCase(), Math.round(13 * k), 'rgba(255,255,255,0.55)', 0.16) : null),
      badge(pack.brand, bs, pack.assets || {})),
  ];
}

// A photo cropped to cover a box at a focal point ("center 20%", "62% 30%"). satori ignores
// object-position, so the crop is done by hand: the picture is scaled to cover and shifted
// inside a clipping box.
const pct = (t, dflt) => (t === 'left' || t === 'top' ? 0 : t === 'right' || t === 'bottom' ? 1 : /%$/.test(t || '') ? parseFloat(t) / 100 : dflt);
export function coverImg(src, x, y, w, hh, pos = 'center 25%') {
  const d = imageSize(src);
  if (!d?.w || !d?.h) return img(src, { position: 'absolute', left: x, top: y, width: w, height: hh, objectFit: 'cover' });
  const [px, py] = String(pos).split(/\s+/);
  const fx = pct(px, 0.5);
  const fy = pct(py ?? px, 0.5);
  const sc = Math.max(w / d.w, hh / d.h);
  const iw = Math.ceil(d.w * sc);
  const ih = Math.ceil(d.h * sc);
  return abs(x, y, w, hh, { overflow: 'hidden' }, img(src, { position: 'absolute', left: -Math.round((iw - w) * fx), top: -Math.round((ih - hh) * fy), width: iw, height: ih }));
}

// The photo inside a box, with a short blend into navy at its top edge and an optional floor.
export function photoBox(assets, x, y, w, hh, { pos = 'center 25%', topBlend = 0.16, floor = 0, floorAt = 0.7 } = {}) {
  if (!assets?.hero) return abs(x, y, w, hh, { backgroundImage: `radial-gradient(ellipse 70% 60% at 50% 40%, #1E2636 0%, ${NAVY} 100%)` });
  return [
    coverImg(assets.hero, x, y, w, hh, pos),
    abs(x, y, w, hh, { backgroundImage: `linear-gradient(180deg, ${NAVY} 0%, rgba(10,14,23,0.45) ${Math.round(topBlend * 45)}%, rgba(10,14,23,0) ${Math.round(topBlend * 100)}%, rgba(10,14,23,0) ${Math.round(floorAt * 100)}%, rgba(10,14,23,${floor}) 100%)` }),
  ];
}

const canvas = (W, H, ...children) => h('div', { width: W, height: H, position: 'relative', backgroundColor: NAVY },
  abs(0, 0, W, H, { backgroundImage: 'radial-gradient(ellipse 85% 42% at 50% 0%, rgba(70,90,130,0.36) 0%, rgba(10,14,23,0) 70%)' }),
  ...children);

// A gold-framed data box: small spaced label over a big leaf value (and an optional note).
export function dataBox(st, w, { k = 1, leaf = 'copper', valueMax = 92, align = 'center', hot = true } = {}) {
  const v = String(st.value ?? '');
  // Abril Fatface has no ₹: rupee values fall back to the black Didone
  const vf = /₹/.test(v) ? 'didone' : 'fat';
  const vs = Math.min(Math.round(valueMax * k), fitSize(v, vf, w - Math.round(36 * k), { tracking: -0.02 }));
  return h('div', { width: w, flexDirection: 'column', alignItems: align === 'center' ? 'center' : 'flex-start', border: `2px solid ${FRAME}`, backgroundColor: 'rgba(10,14,23,0.72)', paddingTop: Math.round(14 * k), paddingBottom: Math.round(16 * k), paddingLeft: Math.round(16 * k), paddingRight: Math.round(16 * k) },
    spacedBold(String(st.label || '').toUpperCase(), Math.round(15 * k), 'rgba(255,255,255,0.8)', 0.2),
    h('div', { marginTop: Math.round(6 * k) }, metal(v, vf, vs, hot ? leaf : 'ivory', { lineHeight: 0.95, weight: 0, tracking: -0.02, opacity: 0.6 })),
    st.note ? spaced(String(st.note).toUpperCase(), Math.round(13 * k), 'rgba(255,255,255,0.6)', 0.16, { marginTop: Math.round(4 * k) }) : null);
}
const boxRow = (stats, x, y, w, k, leaf, opts = {}) => {
  const n = stats.length;
  const gap = Math.round(16 * k);
  const bw = Math.floor((w - gap * (n - 1)) / n);
  return abs(x, y, w, Math.round(170 * k), { justifyContent: 'space-between', alignItems: 'stretch' }, stats.map((s) => dataBox(s, bw, { k, leaf, ...opts })));
};

// A team/nation mark: flag picture, crest, or a code box.
function mark(side, size) {
  if (side?.flag) return flag(side.flag, size, { nation: side.name });
  if (side?.logo) return img(side.logo, { width: size, height: size, objectFit: 'contain' });
  if (/^india$/i.test(side?.name || '')) return flag(null, size, { nation: 'India' });
  return h('div', { width: size, height: Math.round(size * 0.66), border: `1.5px solid ${FRAME}`, alignItems: 'center', justifyContent: 'center' }, spacedBold(String(side?.code || side?.name || '?').slice(0, 3).toUpperCase(), Math.round(size * 0.22), '#fff', 0.1));
}

const teamOf = (t) => (t?.name ? { name: t.name, code: t.abbr, score: t.score } : {});
// Date, time (IST) and venue boxes from a feed match.
function whenOf(st) {
  if (!st?.date) return [];
  const d = new Date(st.date);
  const tz = 'Asia/Kolkata';
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }).format(d).toUpperCase().replace(',', '');
  const time = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }).format(d).toUpperCase();
  return [{ label: 'Date', value: day }, { label: 'Time (IST)', value: time }, st.venue?.city || st.venue?.name ? { label: 'Venue', value: String(st.venue.city || st.venue.name).toUpperCase() } : null].filter(Boolean);
}

// ================================================================ 1. BREAKING / NEWS
// Red BREAKING pill (or the status) over a full-width headline, kicker, photo from below.
export function breaking(pack, size = 'tall') {
  const [W, H] = SIZES[size] || SIZES.tall;
  const k = H / 1440;
  const w = pack.words || {};
  const P = Math.round(W * 0.05);
  const leaf = leafOf(w);
  const stack = headStack(w.headline || pack.story?.title, W - 2 * P, { cap: Math.round(H * 0.13), maxH: Math.round(H * (w.headMax || 0.28)) });
  const top = Math.round(H * 0.13);
  const hh = stackHeight(stack);
  const kicker = clean(w.kicker).toUpperCase();
  const under = top + hh + Math.round(16 * k);
  const photoTop = under + (kicker ? Math.round(H * 0.075) : Math.round(H * 0.01));
  return canvas(W, H,
    photoBox(pack.assets, 0, photoTop, W, H - photoTop, { pos: w.photoPos || 'center 20%', floor: 0.85, floorAt: 0.84 }),
    vignette(W, H, 0.15),
    header(pack, W, H),
    abs(0, Math.round(H * 0.083), W, Math.round(40 * k), { justifyContent: 'center', alignItems: 'center' },
      pill(w.flash || 'breaking', Math.round(17 * k)),
      w.status && w.flash !== w.status ? h('div', { marginLeft: Math.round(12 * k) }, pill(w.status, Math.round(17 * k))) : null),
    abs(0, top, W, hh, { flexDirection: 'column', alignItems: 'center' }, headNodes(stack, leaf)),
    kicker ? abs(P, under, W - 2 * P, Math.round(H * 0.07), { justifyContent: 'center' }, text(kicker, { ...font('mont'), fontSize: Math.round(25 * k), letterSpacing: Math.round(25 * k * 0.2), color: '#fff', lineHeight: 1.45, textAlign: 'center', width: W - 2 * P, justifyContent: 'center' })) : null,
    w.swipe ? abs(W - P - Math.round(220 * k), H - Math.round(H * 0.155), Math.round(220 * k), Math.round(40 * k), { justifyContent: 'flex-end' }, spacedBold('SWIPE  →', Math.round(18 * k), IVORY, 0.3)) : null,
    footer(pack, W, H),
  );
}

// ================================================================ 2. MATCH RESULT (scoreboard)
// words.home / words.away: { name, code, score, flag? }; words.label: FULL TIME;
// words.detail: scorers or margin line. Headline top, photo middle, gold scoreboard bar low.
export function scoreline(pack, size = 'tall') {
  const [W, H] = SIZES[size] || SIZES.tall;
  const k = H / 1440;
  const w = pack.words || {};
  const a = pack.assets || {};
  const P = Math.round(W * 0.05);
  const leaf = leafOf(w);
  const st = pack.story || {};
  // a match from the scores feed fills itself: names, codes and scores from the story
  const home = { ...teamOf(st.home), ...w.home, flag: w.home?.flag || a.homeFlag, logo: w.home?.logo || a.homeLogo };
  const away = { ...teamOf(st.away), ...w.away, flag: w.away?.flag || a.awayFlag, logo: w.away?.logo || a.awayLogo };
  const stack = headStack(w.headline || st.title, W - 2 * P, { cap: Math.round(H * 0.11), maxLines: 2 });
  const top = Math.round(H * 0.1);
  const hh = stackHeight(stack);
  const kicker = clean(w.kicker).toUpperCase();
  const photoTop = top + hh + (kicker ? Math.round(H * 0.06) : Math.round(H * 0.02));
  const barY = Math.round(H * 0.735);
  const barH = Math.round(H * 0.125);
  const sc = `${home.score ?? ''}  –  ${away.score ?? ''}`;
  const scSize = Math.round(118 * k);
  const scW = measure(sc, 'fat', scSize) + 20;
  const sideW = Math.round((W - 2 * P - scW - Math.round(40 * k)) / 2);
  const flagW = Math.round(78 * k);
  const name = (s) => { const t = String(s.name || '').toUpperCase(); return solid(t, 'cond', Math.min(Math.round(52 * k), fitSize(t, 'cond', sideW - flagW - Math.round(30 * k))), '#fff', { lineHeight: 1 }); };
  return canvas(W, H,
    photoBox(a, 0, photoTop, W, H - photoTop, { pos: w.photoPos || 'center 30%', floor: 0.97, floorAt: 0.5 }),
    header(pack, W, H),
    abs(0, top, W, hh, { flexDirection: 'column', alignItems: 'center' }, headNodes(stack, leaf)),
    kicker ? abs(P, top + hh + Math.round(12 * k), W - 2 * P, Math.round(40 * k), { justifyContent: 'center' }, spaced(short(kicker, 64), Math.round(22 * k), '#fff', 0.22)) : null,
    abs(P, barY, W - 2 * P, barH, { alignItems: 'center', justifyContent: 'space-between', border: `2px solid ${FRAME}`, backgroundColor: 'rgba(10,14,23,0.82)', paddingLeft: Math.round(22 * k), paddingRight: Math.round(22 * k) },
      h('div', { width: sideW, alignItems: 'center' }, mark(home, flagW), h('div', { marginLeft: Math.round(16 * k) }, name(home))),
      metal(sc, 'fat', scSize, leaf, { lineHeight: 0.95, weight: 0, opacity: 0.6 }),
      h('div', { width: sideW, alignItems: 'center', justifyContent: 'flex-end' }, h('div', { marginRight: Math.round(16 * k) }, name(away)), mark(away, flagW))),
    // the label as a gold tab on the bar's top edge
    abs(P, barY - Math.round(17 * k), W - 2 * P, Math.round(34 * k), { justifyContent: 'center' },
      h('div', { backgroundColor: GOLD, paddingLeft: Math.round(18 * k), paddingRight: Math.round(14 * k), paddingTop: Math.round(7 * k), paddingBottom: Math.round(5 * k), alignItems: 'center' },
        spacedBold(String(w.label || 'FULL TIME').toUpperCase(), Math.round(16 * k), NAVY, 0.3, { lineHeight: 1 }))),
    w.detail ? abs(P, barY + barH + Math.round(14 * k), W - 2 * P, Math.round(70 * k), { justifyContent: 'center' }, text(clean(w.detail).toUpperCase(), { ...font('mont'), fontSize: Math.round(19 * k), letterSpacing: Math.round(19 * k * 0.16), color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.5, width: W - 2 * P, justifyContent: 'center' })) : null,
    footer(pack, W, H),
  );
}

// ================================================================ 3. PRE-MATCH PREVIEW
// words.home / away { name, code, flag? }; words.when [{ label, value }] (date, time IST, venue).
export function matchday(pack, size = 'tall') {
  const [W, H] = SIZES[size] || SIZES.tall;
  const k = H / 1440;
  const w = pack.words || {};
  const a = pack.assets || {};
  const P = Math.round(W * 0.05);
  const leaf = leafOf(w);
  const st = pack.story || {};
  const home = { ...teamOf(st.home), ...w.home, flag: w.home?.flag || a.homeFlag };
  const away = { ...teamOf(st.away), ...w.away, flag: w.away?.flag || a.awayFlag };
  const stack = headStack(w.headline || st.title, W - 2 * P, { cap: Math.round(H * 0.12), maxLines: 2 });
  const top = Math.round(H * 0.115);
  const hh = stackHeight(stack);
  const kicker = clean(w.kicker).toUpperCase();
  const vsY = top + hh + Math.round(22 * k);
  const photoTop = vsY + Math.round(90 * k);
  const when = (w.when || whenOf(st)).slice(0, 3);
  const flagW = Math.round(70 * k);
  const nm = (t) => spacedBold(String(t || '').toUpperCase(), Math.round(24 * k), '#fff', 0.16);
  return canvas(W, H,
    photoBox(a, 0, photoTop, W, H - photoTop, { pos: w.photoPos || 'center 25%', floor: 0.96, floorAt: 0.55 }),
    header(pack, W, H),
    kicker ? abs(P, Math.round(H * 0.08), W - 2 * P, Math.round(36 * k), { justifyContent: 'center' }, spaced(kicker, Math.round(21 * k), '#fff', 0.3)) : null,
    abs(0, top, W, hh, { flexDirection: 'column', alignItems: 'center' }, headNodes(stack, leaf)),
    abs(P, vsY, W - 2 * P, Math.round(64 * k), { alignItems: 'center', justifyContent: 'center' },
      mark(home, flagW), h('div', { marginLeft: 14 }, nm(home.name)),
      h('div', { marginLeft: Math.round(26 * k), marginRight: Math.round(26 * k) }, metal('VS', 'fat', Math.round(46 * k), leaf, { lineHeight: 1, weight: 0 })),
      nm(away.name), h('div', { marginLeft: 14 }, mark(away, flagW))),
    when.length ? boxRow(when, P, H - Math.round(H * 0.235), W - 2 * P, k, leaf, { valueMax: 58 }) : null,
    footer(pack, W, H),
  );
}

// ================================================================ 4. STAT / BIG-NUMBER SPLIT
// words.split: [{ value, label, note }, { value, label, note }]; optional words.verdict line.
export function split(pack, size = 'tall') {
  const [W, H] = SIZES[size] || SIZES.tall;
  const k = H / 1440;
  const w = pack.words || {};
  const a = pack.assets || {};
  const P = Math.round(W * 0.05);
  const leaf = leafOf(w);
  const [l, r] = w.split || [];
  const stack = headStack(w.headline, W - 2 * P, { cap: Math.round(H * 0.1), maxLines: 2 });
  const top = Math.round(H * 0.105);
  const hh = stackHeight(stack);
  const kicker = clean(w.kicker).toUpperCase();
  const colW = Math.round((W - 2 * P - 40) / 2);
  const numY = top + hh + Math.round(H * (kicker ? 0.085 : 0.05));
  const num = (s, hot) => {
    const v = String(s?.value ?? '');
    const sz = Math.min(Math.round(300 * k), fitSize(v, 'fat', colW - 20, { tracking: -0.03 }));
    return h('div', { flexDirection: 'column', alignItems: 'center', width: colW },
      metal(v, 'fat', sz, hot ? leaf : 'ivory', { lineHeight: 0.92, weight: 0, tracking: -0.03, opacity: 0.7 }),
      text(String(s?.label || '').toUpperCase(), { ...font('montBold'), fontSize: Math.round(24 * k), letterSpacing: Math.round(24 * k * 0.2), color: '#fff', textAlign: 'center', lineHeight: 1.35, marginTop: Math.round(10 * k), width: colW - 10, justifyContent: 'center' }),
      s?.note ? text(String(s.note).toUpperCase(), { ...font('mont'), fontSize: Math.round(16 * k), letterSpacing: Math.round(16 * k * 0.18), color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: Math.round(6 * k), width: colW - 10, justifyContent: 'center' }) : null);
  };
  const photoTop = Math.round(H * 0.62);
  return canvas(W, H,
    a.hero ? photoBox(a, 0, photoTop, W, H - photoTop, { pos: w.photoPos || 'center 25%', floor: 0.9, floorAt: 0.6, topBlend: 0.3 }) : null,
    header(pack, W, H),
    abs(0, top, W, hh, { flexDirection: 'column', alignItems: 'center' }, headNodes(stack, leaf)),
    kicker ? abs(P, top + hh + Math.round(14 * k), W - 2 * P, Math.round(40 * k), { justifyContent: 'center' }, spaced(short(kicker, 60), Math.round(22 * k), '#fff', 0.22)) : null,
    abs(P, numY, W - 2 * P, Math.round(H * 0.3), { alignItems: 'flex-start', justifyContent: 'space-between' },
      num(l, w.hot !== 'right'), h('div', { width: 2, height: Math.round(H * 0.24), backgroundColor: 'rgba(255,255,255,0.55)', marginTop: Math.round(20 * k) }), num(r, w.hot === 'right' || w.hot === 'both')),
    w.verdict ? abs(P, H - Math.round(H * 0.2), W - 2 * P, Math.round(50 * k), { justifyContent: 'center' }, h('div', { border: `2px solid ${FRAME}`, backgroundColor: 'rgba(10,14,23,0.8)', paddingLeft: 22, paddingRight: 22, paddingTop: 10, paddingBottom: 8 }, spacedBold(clean(w.verdict).toUpperCase(), Math.round(19 * k), GOLD, 0.22))) : null,
    footer(pack, W, H),
  );
}

// ================================================================ 5. QUOTE
// words.quote (with *stars* around the phrase that takes the leaf), words.name, words.role.
export function said(pack, size = 'tall') {
  const [W, H] = SIZES[size] || SIZES.tall;
  const k = H / 1440;
  const w = pack.words || {};
  const a = pack.assets || {};
  const P = Math.round(W * 0.07);
  const leaf = leafOf(w);
  const photoH = Math.round(H * 0.5);
  const q = clean(w.quote);
  // the phrase between *stars* is set in leaf; the rest in ivory
  const chunks = q.split(/(\*[^*]+\*)/).filter(Boolean).map((c) => ({ t: c.replace(/\*/g, ''), hot: /^\*/.test(c) }));
  const words = chunks.flatMap((c) => c.t.split(/\s+/).filter(Boolean).map((t) => ({ t, hot: c.hot })));
  const maxW = W - 2 * P;
  let sz = Math.round(86 * k);
  const lay = (s) => {
    const lines = [[]];
    let x = 0;
    const sp = measure(' ', 'semi', s);
    for (const wd of words) {
      const ww = measure(wd.t, 'semi', s);
      if (x && x + sp + ww > maxW) { lines.push([]); x = 0; }
      lines[lines.length - 1].push(wd);
      x += (x ? sp : 0) + ww;
    }
    return lines;
  };
  let lines = lay(sz);
  while ((lines.length > 4) && sz > 44) { sz -= 4; lines = lay(sz); }
  const qTop = photoH + Math.round(H * 0.035);
  return canvas(W, H,
    photoBox(a, 0, Math.round(H * 0.075), W, photoH - Math.round(H * 0.075) + Math.round(60 * k), { pos: w.photoPos || 'center 20%', topBlend: w.topBlend ?? 0.12, floor: 1, floorAt: 0.62 }),
    header(pack, W, H),
    abs(P - Math.round(8 * k), qTop - Math.round(150 * k), Math.round(200 * k), Math.round(200 * k), {}, metal('“', 'fat', Math.round(260 * k), leaf, { lineHeight: 1, weight: 0 })),
    abs(P, qTop, maxW, Math.round(sz * 1.08 * lines.length), { flexDirection: 'column' },
      lines.map((ln) => h('div', { flexWrap: 'nowrap', columnGap: Math.round(sz * 0.26) }, ln.map((wd) => wd.hot ? metal(wd.t, 'semi', sz, leaf, { lineHeight: 1.08, weight: 0, opacity: 0.5 }) : solid(wd.t, 'semi', sz, IVORY, { lineHeight: 1.08 }))))),
    abs(P, qTop + Math.round(sz * 1.08 * lines.length) + Math.round(26 * k), maxW, Math.round(80 * k), { flexDirection: 'column' },
      h('div', { width: Math.round(60 * k), height: 3, backgroundColor: solidOf(leaf), marginBottom: Math.round(14 * k) }),
      spacedBold(clean(w.name).toUpperCase(), Math.round(24 * k), '#fff', 0.24),
      w.role ? spaced(clean(w.role).toUpperCase(), Math.round(16 * k), 'rgba(255,255,255,0.65)', 0.2, { marginTop: 4 }) : null),
    w.status ? abs(W - P - Math.round(260 * k), qTop + Math.round(sz * 1.08 * lines.length) + Math.round(40 * k), Math.round(260 * k), Math.round(40 * k), { justifyContent: 'flex-end' }, pill(w.status, Math.round(15 * k))) : null,
    footer(pack, W, H),
  );
}

// ================================================================ 6. TRANSFER / SIGNING / TRADE
// words.from / words.to: { name, logo? }; words.stats: up to 3 deal boxes; status pill.
export function signing(pack, size = 'tall') {
  const [W, H] = SIZES[size] || SIZES.tall;
  const k = H / 1440;
  const w = pack.words || {};
  const a = pack.assets || {};
  const P = Math.round(W * 0.05);
  const leaf = leafOf(w);
  const stack = headStack(w.headline, W - 2 * P, { cap: Math.round(H * 0.12), maxLines: 2 });
  const top = Math.round(H * 0.13);
  const hh = stackHeight(stack);
  const routeY = top + hh + Math.round(20 * k);
  const photoTop = routeY + Math.round(70 * k);
  const side = (s, al) => h('div', { flexDirection: 'column', alignItems: al, width: Math.round((W - 2 * P - 120 * k) / 2) },
    spaced(al === 'flex-end' ? 'TO' : 'FROM', Math.round(14 * k), 'rgba(255,255,255,0.6)', 0.3),
    spacedBold(String(s?.name || '').toUpperCase(), Math.round(24 * k), '#fff', 0.14));
  return canvas(W, H,
    photoBox(a, 0, photoTop, W, H - photoTop, { pos: w.photoPos || 'center 18%', floor: 0.97, floorAt: 0.55 }),
    header(pack, W, H),
    abs(0, Math.round(H * 0.083), W, Math.round(40 * k), { justifyContent: 'center' }, pill(w.status || 'Confirmed', Math.round(16 * k))),
    abs(0, top, W, hh, { flexDirection: 'column', alignItems: 'center' }, headNodes(stack, leaf)),
    abs(P, routeY, W - 2 * P, Math.round(60 * k), { alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}` },
      side(w.from, 'flex-start'), text('→', { ...font('montBold'), fontSize: Math.round(48 * k), color: solidOf(leaf), lineHeight: 1 }), side(w.to, 'flex-end')),
    (w.stats || []).length ? boxRow((w.stats || []).slice(0, 3), P, H - Math.round(H * 0.235), W - 2 * P, k, leaf, { valueMax: 70 }) : null,
    footer(pack, W, H),
  );
}

// ================================================================ 7. PLAYER SPOTLIGHT
// Photo fills the right side; the name stacks on the left over the fade; a column of
// gold-framed stat boxes under it. words.name ("LAKSHYA SEN"), words.stats (2–4).
export function spotlight(pack, size = 'tall') {
  const [W, H] = SIZES[size] || SIZES.tall;
  const k = H / 1440;
  const w = pack.words || {};
  const a = pack.assets || {};
  const P = Math.round(W * 0.05);
  const leaf = leafOf(w);
  const colW = Math.round(W * 0.44);
  const photoX = Math.round(W * 0.3);
  const names = clean(w.name || w.headline).toUpperCase().split(/\s+/);
  const nameStack = names.map((n, i) => ({ text: n + (i === names.length - 1 && w.stop !== false ? '.' : ''), size: 0 }));
  const one = Math.min(Math.round(150 * k), ...nameStack.map((l) => fitSize(l.text, 'fat', colW, { tracking: -0.028 })));
  nameStack.forEach((l) => { l.size = one; });
  const top = Math.round(H * 0.15);
  const hh = stackHeight(nameStack);
  const kicker = clean(w.kicker).toUpperCase();
  const stats = (w.stats || []).slice(0, 4);
  const boxY = top + hh + Math.round(H * (kicker ? 0.11 : 0.04));
  const boxH = Math.round(Math.min(150 * k, (H * 0.86 - boxY) / Math.max(1, stats.length) - 14 * k));
  return canvas(W, H,
    a.hero ? coverImg(a.hero, photoX, Math.round(H * 0.1), W - photoX, H - Math.round(H * 0.1), w.photoPos || 'center 25%') : null,
    // fade only on the photo's left edge and top, so the athlete stays bright
    abs(photoX, Math.round(H * 0.1), W - photoX, H - Math.round(H * 0.1), { backgroundImage: `linear-gradient(90deg, ${NAVY} 0%, rgba(10,14,23,0.6) 14%, rgba(10,14,23,0) 34%)` }),
    abs(photoX, Math.round(H * 0.1), W - photoX, Math.round(H * 0.12), { backgroundImage: `linear-gradient(180deg, ${NAVY} 0%, rgba(10,14,23,0) 100%)` }),
    header(pack, W, H),
    w.label ? abs(P, Math.round(H * 0.105), colW, Math.round(30 * k), { alignItems: 'center' }, h('div', { width: Math.round(40 * k), height: 3, backgroundColor: solidOf(leaf), marginRight: 12 }), spacedBold(String(w.label).toUpperCase(), Math.round(17 * k), solidOf(leaf), 0.3)) : null,
    abs(P, top, colW + 20, hh, { flexDirection: 'column' }, headNodes(nameStack, leaf)),
    kicker ? abs(P, top + hh + Math.round(16 * k), colW, Math.round(H * 0.1), {}, text(kicker, { ...font('mont'), fontSize: Math.round(21 * k), letterSpacing: Math.round(21 * k * 0.14), color: '#fff', lineHeight: 1.5, width: colW })) : null,
    abs(P, boxY, Math.round(W * 0.36), (boxH + Math.round(14 * k)) * stats.length, { flexDirection: 'column' },
      stats.map((s) => h('div', { marginBottom: Math.round(14 * k), height: boxH }, dataBox(s, Math.round(W * 0.36), { k, leaf, valueMax: Math.round(boxH * 0.55 / k), align: 'left' })))),
    footer(pack, W, H, { dark: true }),
  );
}

// ================================================================ 8. MEDAL TALLY
// words.tally: [{ label, gold, silver, bronze, total, rank, hot }]; headline above, rows in a
// gold-framed table with medal discs as column heads.
export function medals(pack, size = 'tall') {
  const [W, H] = SIZES[size] || SIZES.tall;
  const k = H / 1440;
  const w = pack.words || {};
  const a = pack.assets || {};
  const P = Math.round(W * 0.05);
  const leaf = leafOf(w);
  const rows = (w.tally || []).slice(0, 6);
  const stack = headStack(w.headline, W - 2 * P, { cap: Math.round(H * 0.11), maxLines: 2 });
  const top = Math.round(H * 0.1);
  const hh = stackHeight(stack);
  const kicker = clean(w.kicker).toUpperCase();
  const tableY = top + hh + Math.round(H * (kicker ? 0.08 : 0.045));
  const labW = Math.round((W - 2 * P) * 0.4);
  const colW = Math.floor((W - 2 * P - labW - 4) / 4);
  const rowH = Math.round(Math.min(190 * k, (H * 0.5) / Math.max(rows.length + 1, 2)));
  const cell = (v, hot, big) => {
    const t = String(v ?? '–');
    const sz = Math.min(Math.round((big ? 0.56 : 0.46) * rowH), Math.round(78 * k), fitSize(t, 'fat', colW - Math.round(22 * k)));
    return h('div', { width: colW, justifyContent: 'center', alignItems: 'center' }, metal(t, 'fat', sz, hot ? leaf : 'ivory', { lineHeight: 1, weight: 0, opacity: 0.55 }));
  };
  const headCell = (node, t) => h('div', { width: colW, flexDirection: 'column', alignItems: 'center' }, node, spacedBold(t, Math.round(13 * k), 'rgba(255,255,255,0.7)', 0.22, { marginTop: 6 }));
  const tableH = rowH * rows.length + Math.round(84 * k);
  return canvas(W, H,
    a.hero ? photoBox(a, 0, tableY + tableH - Math.round(40 * k), W, H - (tableY + tableH - Math.round(40 * k)), { pos: w.photoPos || 'center 30%', floor: 0.9, floorAt: 0.55, topBlend: 0.35 }) : null,
    header(pack, W, H),
    abs(0, top, W, hh, { flexDirection: 'column', alignItems: 'center' }, headNodes(stack, leaf)),
    kicker ? abs(P, top + hh + Math.round(14 * k), W - 2 * P, Math.round(40 * k), { justifyContent: 'center' }, spaced(short(kicker, 60), Math.round(22 * k), '#fff', 0.22)) : null,
    abs(P, tableY, W - 2 * P, tableH, { flexDirection: 'column', border: `2px solid ${FRAME}`, backgroundColor: 'rgba(10,14,23,0.85)' },
      h('div', { height: Math.round(84 * k), alignItems: 'center', borderBottom: `1px solid ${FRAME}` },
        h('div', { width: labW, paddingLeft: Math.round(24 * k) }, spacedBold(String(w.tableLabel || 'MEDALS').toUpperCase(), Math.round(16 * k), GOLD, 0.3)),
        headCell(disc('gold', Math.round(30 * k)), 'GOLD'), headCell(disc('silver', Math.round(30 * k)), 'SILVER'), headCell(disc('bronze', Math.round(30 * k)), 'BRONZE'),
        headCell(h('div', { width: Math.round(30 * k), height: Math.round(30 * k), borderRadius: 30, border: `2px solid ${IVORY}` }), 'TOTAL')),
      rows.map((r, i) => h('div', { height: rowH, alignItems: 'center', borderTop: i ? `1px solid ${HAIR}` : 'none', backgroundColor: r.hot ? 'rgba(224,138,76,0.10)' : 'transparent' },
        h('div', { width: labW, paddingLeft: Math.round(24 * k), flexDirection: 'column' },
          solid(String(r.label || '').toUpperCase(), 'cond', Math.min(Math.round(44 * k), fitSize(String(r.label || '').toUpperCase(), 'cond', labW - 40)), '#F6F1E7', { lineHeight: 1 }),
          r.note ? spaced(String(r.note).toUpperCase(), Math.round(14 * k), 'rgba(255,255,255,0.6)', 0.18, { marginTop: 4 }) : null),
        cell(r.gold, r.hot), cell(r.silver, r.hot), cell(r.bronze, r.hot), cell(r.total, r.hot, true)))),
    footer(pack, W, H),
  );
}

// ================================================================ 9. LIVE COVER
// Red ● LIVE pill, headline, and a running list of timestamped updates (newest first).
export function live(pack, size = 'tall') {
  const [W, H] = SIZES[size] || SIZES.tall;
  const k = H / 1440;
  const w = pack.words || {};
  const a = pack.assets || {};
  const P = Math.round(W * 0.05);
  const leaf = leafOf(w);
  const stack = headStack(w.headline, W - 2 * P, { cap: Math.round(H * 0.11), maxLines: 2 });
  const top = Math.round(H * 0.135);
  const hh = stackHeight(stack);
  const ups = (w.updates || []).slice(0, 5);
  const listY = Math.round(H * 0.5);
  const rowH = Math.round(Math.min(118 * k, (H * 0.38) / Math.max(1, ups.length)));
  const timeW = Math.round(150 * k);
  return canvas(W, H,
    photoBox(a, 0, top + hh, W, listY - top - hh + Math.round(80 * k), { pos: w.photoPos || 'center 25%', floor: 1, floorAt: 0.45, topBlend: 0.3 }),
    header(pack, W, H),
    abs(0, Math.round(H * 0.083), W, Math.round(40 * k), { justifyContent: 'center', alignItems: 'center' }, pill('live', Math.round(18 * k)),
      w.updated ? spaced(`UPDATED ${String(w.updated).toUpperCase()}`, Math.round(15 * k), 'rgba(255,255,255,0.75)', 0.2, { marginLeft: Math.round(14 * k) }) : null),
    abs(0, top, W, hh, { flexDirection: 'column', alignItems: 'center' }, headNodes(stack, leaf)),
    abs(P, listY, W - 2 * P, rowH * ups.length, { flexDirection: 'column', borderLeft: `2px solid ${LIVE_RED}` },
      ups.map((u, i) => h('div', { height: rowH, alignItems: 'center', borderTop: i ? `1px solid ${HAIR}` : 'none', paddingLeft: Math.round(22 * k) },
        h('div', { width: timeW, flexShrink: 0 }, spacedBold(String(u.time || '').toUpperCase(), Math.round(20 * k), i === 0 ? LIVE_RED : COPPER, 0.12)),
        text(clean(u.text), { ...font(i === 0 ? 'montBold' : 'mont'), fontSize: Math.round(25 * k), color: '#fff', lineHeight: 1.3, width: W - 2 * P - timeW - Math.round(30 * k) })))),
    footer(pack, W, H),
  );
}

// ================================================================ 10. CAROUSEL INNER SLIDE
// words.n / words.of (slide 2 of 5), words.label (section), headline (2 lines max), words.body
// (2–4 short sentences), words.stats (0–3 boxes), optional photo band.
export function slide(pack, size = 'tall') {
  const [W, H] = SIZES[size] || SIZES.tall;
  const k = H / 1440;
  const w = pack.words || {};
  const a = pack.assets || {};
  const P = Math.round(W * 0.07);
  const leaf = leafOf(w);
  const stack = headStack(w.headline, W - 2 * P, { cap: Math.round(H * 0.1), maxLines: 2, uniform: true });
  const top = Math.round(H * 0.17);
  const hh = stackHeight(stack);
  const stats = (w.stats || []).slice(0, 3);
  const photoH = a.hero ? Math.round(H * 0.3) : 0;
  const bodyY = top + hh + Math.round(34 * k);
  const body = String(w.body || '').trim();
  const bodyLines = Math.ceil((measure(body, 'mont', Math.round(30 * k)) * 1.08) / (W - 2 * P));
  const statsY = Math.min(a.hero ? H - photoH - Math.round(H * 0.17) : Math.round(H * 0.68), bodyY + bodyLines * Math.round(45 * k) + Math.round(60 * k));
  const n = String(w.n || '').padStart(2, '0');
  const of = String(w.of || '').padStart(2, '0');
  return canvas(W, H,
    a.hero ? photoBox(a, 0, H - photoH - Math.round(H * 0.1), W, photoH, { pos: w.photoPos || 'center 25%', topBlend: w.topBlend ?? 0.35, floor: 1, floorAt: 0.75 }) : null,
    header(pack, W, H, { comp: `${n} / ${of}` }),
    abs(P, Math.round(H * 0.115), W - 2 * P, Math.round(34 * k), { alignItems: 'center' },
      metal(n, 'fat', Math.round(40 * k), leaf, { lineHeight: 1, weight: 0 }),
      h('div', { width: Math.round(50 * k), height: 2, backgroundColor: solidOf(leaf), marginLeft: 14, marginRight: 14 }),
      spacedBold(String(w.label || '').toUpperCase(), Math.round(18 * k), '#fff', 0.3)),
    abs(P, top, W - 2 * P, hh, { flexDirection: 'column' }, headNodes(stack, leaf)),
    body ? abs(P, bodyY, W - 2 * P, Math.round(H * 0.25), {}, text(body, { ...font('mont'), fontSize: Math.round(30 * k), lineHeight: 1.5, color: 'rgba(255,255,255,0.92)', width: W - 2 * P })) : null,
    stats.length ? boxRow(stats, P, statsY, W - 2 * P, k, leaf, { valueMax: 80 }) : null,
    abs(W - P - Math.round(220 * k), H - Math.round(H * 0.075), Math.round(220 * k), Math.round(40 * k), { justifyContent: 'flex-end', alignItems: 'center' },
      spacedBold(w.n && w.of && Number(w.n) >= Number(w.of) ? 'THE END' : 'SWIPE  →', Math.round(17 * k), IVORY, 0.3)),
    abs(P, H - Math.round(H * 0.075), W * 0.6, Math.round(40 * k), { alignItems: 'center' }, spaced(w.source ? `SOURCE: ${short(clean(w.source), 40).toUpperCase()}` : '@THESPORTSBINGE', Math.round(14 * k), 'rgba(255,255,255,0.55)', 0.18)),
  );
}

export const TSB_KIT_TEMPLATES = {
  'tsb-breaking': breaking,
  'tsb-scoreline': scoreline,
  'tsb-matchday': matchday,
  'tsb-split': split,
  'tsb-said': said,
  'tsb-signing': signing,
  'tsb-spotlight': spotlight,
  'tsb-medals': medals,
  'tsb-live': live,
  'tsb-slide': slide,
};
