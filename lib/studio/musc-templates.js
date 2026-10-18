// @musc_reddevils posters, built from docs/STYLE_SHEETS.md.
import { font, measure, fitSize, setText, breakLines, stackFill } from './type.js';
import { h, text, img, abs, SIZES, C, solid, label, ruled, para, badge, crest, photo, cutout, shade, vignette, metal, accentLine } from './kit.js';

const RED = C.utd;
const CREAM = C.utdCream;
const clean = (s = '') => String(s).replace(/[“”"]/g, '').trim();
const short = (s = '', n = 90) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') : s);

// The club grade: the photo, a maroon wash, darkness at the foot.
const graded = (assets, W, H, from = 0.5) => [
  photo(assets, W, H, { fallback: 'linear-gradient(150deg, #8E1209 0%, #3A0705 45%, #0B0B0D 100%)' }),
  assets.hero ? abs(0, 0, W, H, { backgroundColor: 'rgba(150,12,6,0.12)' }) : null,
  shade(W, H, [[0, 0.25], [0.18, 0], [from, 0], [Math.min(0.95, from + 0.2), 0.78], [1, 0.92]], '58,6,4'),
  vignette(W, H, 0.3),
];
// Words to set in red: the accent words, or the middle of the headline.
function accentSet(text, accentWords = [], { fallback = true } = {}) {
  const words = String(text).toUpperCase().split(/\s+/).map((w) => w.replace(/[^\w]/g, ''));
  const acc = new Set(accentWords.map((w) => String(w).toUpperCase().replace(/[^\w]/g, '')).filter((w) => words.includes(w)));
  if (fallback && !acc.size && words.length >= 2) acc.add(words[Math.floor(words.length / 2)]);
  return acc;
}

// Which lines go red: the accent words if any, otherwise the middle line.
function lineColours(lines, accentWords = []) {
  const acc = accentWords.map((w) => w.toUpperCase().replace(/[^\w]/g, ''));
  const hit = lines.map((l) => acc.some((a) => a && l.toUpperCase().replace(/[^\w ]/g, '').split(' ').includes(a)));
  if (!hit.some(Boolean) && lines.length >= 2) hit[Math.min(1, lines.length - 1)] = true;
  return hit.map((r) => (r ? RED : CREAM));
}

// ---------------------------------------------------------------- headline over photo, centred
export function headCentre(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, assets = {} } = pack;
  const P = Math.round(W * 0.05);
  const maxW = W - 2 * P;
  const t = clean(words.headline).toUpperCase();
  // Short headlines go one word per line, each filling the width (HISTORY / FOR / SALE?).
  const wordsN = t.split(/\s+/).length;
  const lines = wordsN <= 3 ? t.split(/\s+/) : breakLines(t, 'anton', Math.round(H * 0.15), maxW, { maxLines: 4 }) || [t];
  const stack = stackFill(lines, 'anton', maxW * 0.86, { max: Math.round(H * 0.19), min: 60 });
  const acc = accentSet(t, words.accentWords, { fallback: false });
  const total = stack.reduce((a, l) => a + l.size * 0.98, 0);
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0B0B0D' },
    graded(assets, W, H, Math.max(0.3, 1 - (total + 120) / H - 0.12)),
    cutout(assets, { x: Math.round(W * 0.12), y: Math.round(H * 0.02), w: Math.round(W * 0.76), h: Math.round(H * 0.58) }, { glow: 'rgba(218,41,28,0.45)' }),
    abs(P, Math.round(P * 1.1), W - 2 * P, 120, { justifyContent: 'space-between' }, badge(pack.brand, 92, assets), h('div', {})),
    abs(P, 0, maxW, H - Math.round(P * 0.9), { flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' },
      words.name || words.kicker ? h('div', { marginBottom: 10 }, ruled(words.name || words.kicker, { width: Math.round(W * 0.84), key: 'oswald', size: 30, tracking: 0.16, color: '#fff', lineColor: RED })) : null,
      stack.map((l) => accentLine(l.text, 'anton', l.size, CREAM, RED, acc, { lineHeight: 0.97, textureFor: (hot) => (hot ? 'red' : 'cream') })),
    ),
  );
}

// ---------------------------------------------------------------- headline, left column
export function headLeft(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, assets = {} } = pack;
  const P = Math.round(W * 0.05);
  const colW = Math.round(W * 0.5);
  const t = clean(words.headline).toUpperCase();
  const set = setText(t, 'anton', colW, { max: Math.round(H * 0.13), min: 46, maxLines: 4 });
  const acc = accentSet(t, words.accentWords);
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0B0B0D' },
    photo(assets, W, H, { fallback: 'linear-gradient(150deg, #8E1209 0%, #3A0705 45%, #0B0B0D 100%)' }),
    assets.hero ? abs(0, 0, W, H, { backgroundColor: 'rgba(110,8,4,0.22)' }) : null,
    shade(W, H, [[0, 0.88], [0.36, 0.62], [0.58, 0.05], [1, 0]], '18,4,4', '90deg'),
    shade(W, H, [[0.7, 0], [1, 0.55]]),
    cutout(assets, { x: Math.round(W * 0.42), y: Math.round(H * 0.12), w: Math.round(W * 0.58), h: Math.round(H * 0.88) }, { glow: 'rgba(218,41,28,0.4)' }),
    abs(0, 0, 16, H, { backgroundImage: `linear-gradient(180deg, ${RED} 0%, #8E1209 100%)` }),
    abs(P, Math.round(P * 1.1), 120, 100, {}, badge(pack.brand, 86, assets)),
    abs(P, Math.round(H * 0.2), colW, H, { flexDirection: 'column' },
      label(words.eyebrow || 'RED DEVILS NEWS', { key: 'oswald', size: 20, color: RED, tracking: 0.25, maxW: colW }),
      h('div', { flexDirection: 'column', marginTop: 12 }, set.lines.map((l) => accentLine(l, 'anton', set.size, CREAM, RED, acc, { shadow: true, lineHeight: 1.0 }))),
      words.kicker ? h('div', { marginTop: 18, borderTop: `2px solid ${RED}`, paddingTop: 12 }, para(short(words.kicker, 80), { key: 'barlowSemi', size: 24, color: '#fff', width: colW, lineHeight: 1.25 })) : null,
      words.explainer ? h('div', { marginTop: 14 }, para(short(words.explainer, 120).toUpperCase(), { key: 'oswald', size: 18, color: 'rgba(255,255,255,0.8)', width: colW, lineHeight: 1.3 })) : null,
    ),
    abs(P, H - P - 24, W - 2 * P, 24, { justifyContent: 'flex-end' }, label(pack.brand.handle, { key: 'oswald', size: 16, color: 'rgba(255,255,255,0.6)', tracking: 0.2 })),
  );
}

// ---------------------------------------------------------------- headline, slanted with a tag
export function headSlant(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, assets = {} } = pack;
  const P = Math.round(W * 0.05);
  const maxW = Math.round(W * 0.86);
  const t = clean(words.headline).toUpperCase();
  const two = setText(t, 'anton', maxW, { max: Math.round(H * 0.16), min: 60, maxLines: 2 });
  const set = two.lines.length <= 2 && two.size >= Math.round(H * 0.09) ? two : setText(t, 'anton', maxW, { max: Math.round(H * 0.16), min: 60, maxLines: 3 });
  const acc = accentSet(t, words.accentWords);
  const tag = (words.kicker || words.name || '').toUpperCase();
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0B0B0D' },
    graded(assets, W, H, 0.42),
    cutout(assets, { x: Math.round(W * 0.1), y: Math.round(H * 0.02), w: Math.round(W * 0.8), h: Math.round(H * 0.6) }, { glow: 'rgba(218,41,28,0.4)' }),
    abs(W - P - 92, Math.round(P * 1.1), 92, 92, {}, badge(pack.brand, 92, assets)),
    abs(P, 0, W - 2 * P, H - P, { flexDirection: 'column', justifyContent: 'flex-end' },
      h('div', { flexDirection: 'column', transform: 'skewX(-9deg)', marginLeft: 24 }, set.lines.map((l) => accentLine(l, 'anton', set.size, '#fff', '#E3242B', acc, { shadow: true, lineHeight: 0.96 }))),
      h('div', { width: Math.round(W * 0.7), height: 4, backgroundColor: RED, marginTop: 14 }),
      h('div', { marginTop: 22, justifyContent: 'space-between', alignItems: 'center', width: W - 2 * P },
        words.explainer ? h('div', { transform: 'rotate(-6deg)' }, solid(short(words.explainer, 26).toUpperCase(), 'bebas', 44, 'rgba(255,255,255,0.88)', { lineHeight: 1 })) : h('div', {}),
        tag ? h('div', { backgroundColor: RED, padding: '12px 22px', transform: 'rotate(-3deg)', border: '3px solid #fff', boxShadow: '0 8px 20px rgba(0,0,0,0.5)' }, solid(short(tag, 22), 'anton', 40, '#fff', { lineHeight: 1 })) : null,
      ),
    ),
  );
}

// ---------------------------------------------------------------- matchday
export function matchday(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { brand, words, story: s, assets = {}, when = {} } = pack;
  const P = Math.round(W * 0.05);
  const utd = (t) => brand.team?.aliases?.test(t?.name || '');
  const leftCol = utd(s.home) || !utd(s.away) ? RED : '#1B3D8F';
  const rightCol = utd(s.away) ? RED : '#1B3D8F';
  const date = [when.day, when.time].filter(Boolean).join(', ');
  const nameSize = 30;
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0B0B0D' },
    assets.hero
      ? [photo(assets, W, H), abs(0, 0, W, H, { backgroundColor: 'rgba(90,6,4,0.25)' })]
      : [abs(0, 0, W / 2, H, { backgroundImage: `linear-gradient(160deg, ${leftCol} 0%, #2a0503 70%, #0B0B0D 100%)` }), abs(W / 2, 0, W / 2, H, { backgroundImage: `linear-gradient(200deg, ${rightCol} 0%, #0a1430 70%, #0B0B0D 100%)` })],
    cutout(assets, { x: Math.round(W * 0.05), y: Math.round(H * 0.1), w: Math.round(W * 0.9), h: Math.round(H * 0.58) }),
    shade(W, H, [[0, 0.35], [0.14, 0], [0.56, 0.02], [0.74, 0.82], [1, 0.96]]),
    abs(0, Math.round(P * 0.9), W, 160, { flexDirection: 'column', alignItems: 'center' }, badge(brand, 80, assets), h('div', { marginTop: 10 }, label(words.eyebrow, { key: 'oswald', size: 24, color: '#fff', tracking: 0.2, maxW: W * 0.8 }))),
    abs(P, Math.round(H * 0.6), W - 2 * P, Math.round(H * 0.4) - P, { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' },
      h('div', { alignItems: 'center' },
        h('div', { flexDirection: 'column', alignItems: 'center', width: 300 }, crest(assets.homeLogo, 150, s.home?.abbr), h('div', { marginTop: 10 }, label(s.home?.name, { key: 'oswald', size: nameSize * 0.6, color: 'rgba(255,255,255,0.85)', tracking: 0.15, maxW: 300 }))),
        solid('VS', 'anton', 64, '#fff', { style: { marginLeft: 20, marginRight: 20 } }),
        h('div', { flexDirection: 'column', alignItems: 'center', width: 300 }, crest(assets.awayLogo, 150, s.away?.abbr), h('div', { marginTop: 10 }, label(s.away?.name, { key: 'oswald', size: nameSize * 0.6, color: 'rgba(255,255,255,0.85)', tracking: 0.15, maxW: 300 })))),
      h('div', { marginTop: 26 }, solid(date.toUpperCase(), 'anton', 66, '#FFD23F', { shadow: true })),
      s.venue?.name ? h('div', { marginTop: 6 }, label(s.venue.name, { key: 'oswald', size: 18, color: 'rgba(255,255,255,0.7)', tracking: 0.2 })) : null,
      brand.broadcastLine ? h('div', { marginTop: 18, alignItems: 'baseline' }, solid(brand.broadcastLine.replace(/FANCODE$/i, '').trim(), 'anton', 48, '#fff'), /FANCODE$/i.test(brand.broadcastLine) ? solid('FANCODE', 'anton', 56, '#FF7A1A', { style: { marginLeft: 14, transform: 'skewX(-10deg)' } }) : null) : null,
    ),
  );
}

// ---------------------------------------------------------------- result
export function result(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { brand, words, story: s, assets = {} } = pack;
  const P = Math.round(W * 0.05);
  const utd = (t) => brand.team?.aliases?.test(t?.name || '');
  const usHome = !(utd(s.away) && !utd(s.home));
  const us = usHome ? s.home : s.away;
  const them = usHome ? s.away : s.home;
  const goals = (s.events || []).filter((e) => /goal/i.test(e.type) && e.player).slice(0, 7);
  const ours = goals.filter((g) => (g.team || '').toUpperCase() === (us?.abbr || '').toUpperCase());
  const shortName = (n) => { const p = n.replace(/\s*\(.*\)/, '').split(' '); return (p.length > 1 ? `${p[0][0]}. ${p.slice(1).join(' ')}` : p[0]).toUpperCase(); };
  const t = clean(words.headline).toUpperCase();
  const set = setText(t, 'anton', W * 0.9, { max: Math.round(H * 0.11), min: 50, maxLines: 2 });
  const acc = accentSet(t, words.accentWords);
  const score = `${us?.score ?? ''}–${them?.score ?? ''}`;
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0B0B0D' },
    graded(assets, W, H, 0.48),
    shade(W, H, [[0, 0.7], [0.45, 0.35], [0.7, 0]], '20,4,3', '90deg'),
    cutout(assets, { x: Math.round(W * 0.38), y: Math.round(H * 0.08), w: Math.round(W * 0.62), h: Math.round(H * 0.62) }, { glow: 'rgba(218,41,28,0.45)' }),
    abs(P, Math.round(P * 1.1), W - 2 * P, 100, { justifyContent: 'space-between' }, badge(brand, 86, assets), label(s.status?.state === 'in' ? 'LIVE' : 'FULL TIME', { key: 'oswald', size: 24, color: '#fff', tracking: 0.3, style: { backgroundColor: RED, padding: '6px 14px' } })),
    abs(P, Math.round(H * 0.3), Math.round(W * 0.56), Math.round(H * 0.4), { flexDirection: 'column' },
      h('div', { alignItems: 'center' }, crest(usHome ? assets.homeLogo : assets.awayLogo, 120, us?.abbr), solid(score, 'anton', 170, '#fff', { shadow: true, style: { marginLeft: 24 } })),
      h('div', { marginTop: 4 }, label(`${us?.name || ''} v ${them?.name || ''}`, { key: 'oswald', size: 20, color: 'rgba(255,255,255,0.75)', tracking: 0.15, maxW: W * 0.52 })),
      ours.length ? h('div', { flexDirection: 'column', marginTop: 18 }, ours.map((g) => h('div', { alignItems: 'center', marginTop: 6 }, solid(g.minute, 'oswald', 26, '#fff', { style: { width: 64 } }), h('div', { width: 3, height: 26, backgroundColor: RED, marginRight: 12 }), solid(shortName(g.player), 'oswald', 26, '#fff')))) : null,
    ),
    abs(P, 0, W - 2 * P, H - P, { flexDirection: 'column', justifyContent: 'flex-end' },
      set.lines.map((l) => accentLine(l, 'anton', set.size, CREAM, RED, acc, { shadow: true, lineHeight: 0.98 })),
      h('div', { marginTop: 14, justifyContent: 'space-between', width: W - 2 * P }, label(words.eyebrow, { key: 'oswald', size: 16, color: 'rgba(255,255,255,0.65)', tracking: 0.2, maxW: W * 0.6 }), label(brand.handle, { key: 'oswald', size: 16, color: 'rgba(255,255,255,0.65)', tracking: 0.2 })),
    ),
  );
}

// ---------------------------------------------------------------- statement on red
export function statement(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { brand, words, story: s, assets = {}, when = {} } = pack;
  const P = Math.round(W * 0.06);
  const inner = W - 2 * P;
  const t = clean(words.headline).toUpperCase();
  const lines = breakLines(t, 'anton', Math.round(H * 0.11), inner - 60, { maxLines: 3 }) || [t];
  const stack = stackFill(lines, 'anton', inner - 60, { max: Math.round(H * 0.17), min: 60 });
  const fixture = s.kind !== 'news' ? [`${s.home?.name || ''} v ${s.away?.name || ''}`, [s.league?.name, s.note].filter(Boolean).join(' · '), [when.day, when.time].filter(Boolean).join(' · ')] : [words.eyebrow, words.kicker];
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0B0B0D' },
    assets.hero ? img(assets.hero, { position: 'absolute', left: 0, top: 0, width: W, height: H, objectFit: 'cover' }) : null,
    abs(0, 0, W, H, { backgroundColor: assets.hero ? 'rgba(10,6,6,0.82)' : '#0B0B0D' }),
    abs(P, P, inner, H - 2 * P, { backgroundColor: '#B2160E', backgroundImage: 'radial-gradient(ellipse at 50% 35%, #CF1E12 0%, #A3140B 55%, #6E0D07 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }),
    abs(P + 24, P + 24, inner - 48, H - 2 * P - 48, { border: '1px solid rgba(243,230,208,0.28)' }),
    abs(P, P - 34, inner, 30, { justifyContent: 'space-between', alignItems: 'center' }, label('MATCHDAY', { key: 'oswald', size: 18, color: 'rgba(255,255,255,0.8)', tracking: 0.4 }), label(brand.handle, { key: 'oswald', size: 14, color: 'rgba(255,255,255,0.5)', tracking: 0.2 })),
    abs(P + 30, P + Math.round(H * 0.07), inner - 60, H - 2 * P, { flexDirection: 'column', alignItems: 'center' },
      stack.map((l) => metal(l.text, 'anton', l.size, 'cream', { shadow: false, lineHeight: 0.98, weight: 0 })),
      h('div', { flexDirection: 'column', alignItems: 'center', marginTop: Math.round(H * 0.05) }, fixture.filter(Boolean).map((f, i) => h('div', { marginTop: i ? 10 : 0, flexDirection: 'column', alignItems: 'center' }, label(f, { key: 'oswald', size: i ? 20 : 34, color: i ? 'rgba(243,230,208,0.8)' : CREAM, tracking: 0.22, maxW: inner - 100 }), i === 0 ? h('div', { width: 60, height: 2, backgroundColor: CREAM, marginTop: 14, opacity: 0.7 }) : null))),
    ),
    abs(0, H - P - 96, W, 80, { justifyContent: 'center' }, badge(brand, 74, assets)),
  );
}

// ---------------------------------------------------------------- signing, cream
export function signing(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { brand, words, assets = {} } = pack;
  const P = Math.round(W * 0.06);
  const parts = clean(words.headline).replace(/\.$/, '').split(/\s+/);
  const last = parts.pop() || '';
  const first = parts.join(' ');
  const s1 = first ? fitSize(first, 'didone', W * 0.84, { max: Math.round(H * 0.14) }) : 0;
  const s2 = fitSize(`${last}.`, 'didone', W * 0.76, { max: Math.round(H * 0.15) });
  const photoTop = Math.round(H * 0.47);
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#F4F1EA' },
    assets.hero ? img(assets.hero, { position: 'absolute', left: 0, top: photoTop, width: W, height: H - photoTop, objectFit: 'cover' }) : abs(0, photoTop, W, H - photoTop, { backgroundImage: 'linear-gradient(180deg, #7a1a12 0%, #2a0806 100%)' }),
    abs(0, photoTop - 2, W, Math.round(H * 0.08), { backgroundImage: 'linear-gradient(180deg, #F4F1EA 0%, rgba(244,241,234,0) 100%)' }),
    abs(P, Math.round(P * 0.7), W - 2 * P, Math.round(H * 0.5), { flexDirection: 'column', alignItems: 'center' },
      ruled('MUSC RED DEVILS', { width: Math.round(W * 0.6), color: RED, size: 14, tracking: 0.4 }),
      h('div', { marginTop: 10 }, label(words.eyebrow || 'SIGNING', { key: 'montBold', size: 15, color: '#222', tracking: 0.35 })),
      h('div', { marginTop: 14, flexDirection: 'column', alignItems: 'center' }, first ? solid(first, 'didone', s1, '#111', { lineHeight: 0.95, style: { letterSpacing: -s1 * 0.02 } }) : null, solid(`${last}.`, 'didone', s2, '#A3150D', { lineHeight: 0.95, style: { letterSpacing: -s2 * 0.02 } })),
      words.name ? h('div', { marginTop: 14 }, label(words.name, { key: 'montBold', size: 20, color: '#111', tracking: 0.32 })) : null,
      words.kicker || words.explainer ? h('div', { marginTop: 10 }, para(short(words.kicker || words.explainer, 90), { key: 'mont', size: 16, color: '#444', width: W * 0.8, align: 'center' })) : null,
    ),
    cutout(assets, { x: Math.round(W * 0.2), y: photoTop, w: Math.round(W * 0.6), h: H - photoTop }),
    abs(P, H - P - 80, 90, 90, {}, badge(brand, 80, assets)),
    abs(P, H - Math.round(P * 0.7), W - 2 * P, 20, { justifyContent: 'center' }, label(brand.handle, { key: 'mont', size: 13, color: 'rgba(255,255,255,0.8)', tracking: 0.2 })),
  );
}

export const MUSC_TEMPLATES = {
  'musc-head': headCentre,
  'musc-head-left': headLeft,
  'musc-head-slant': headSlant,
  'musc-matchday': matchday,
  'musc-result': result,
  'musc-statement': statement,
  'musc-signing': signing,
};
