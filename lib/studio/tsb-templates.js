// @thesportsbinge posters, one per kind of post, built from docs/STYLE_SHEETS.md.
import { font, measure, fitSize, setText, breakLines, stackFill, linesFor } from './type.js';
import { h, text, img, abs, SIZES, C, METAL_SOLID, metal, solid, label, ruled, para, badge, flag, medal, disc, tricolourRule, photo, cutout, shade, vignette, stretched } from './kit.js';

const METALS = ['gold', 'silver', 'bronze'];
const metalOf = (words) => (METALS.includes(words.accent) ? words.accent : (String(words.headline).match(/\b(GOLD|SILVER|BRONZE)\b/i)?.[1] || 'gold').toLowerCase());
const indiaOf = (pack) => /^india$/i.test(pack.words?.country || pack.assets?.country || '');
const clean = (s = '') => String(s).replace(/[“”"]/g, '').trim();
const short = (s = '', n = 70) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') : s);

// "PARUL CHAUDHARY BRONZE." → { top: 'PARUL CHAUDHARY', big: 'BRONZE' }
export function tiersOf(words) {
  const parts = String(words.headline || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { top: '', big: '' };
  let big = parts.pop();
  if (/^(GOLD|SILVER|BRONZE)\.?$/i.test(big)) big = big.replace(/\.$/, '');
  return { top: parts.join(' '), big };
}
// Competition lockup: "ASIAN GAMES · AICHI-NAGOYA 2026" → ['ASIAN GAMES', 'AICHI-NAGOYA 2026']
const lockup = (eyebrow = '') => String(eyebrow).split(' · ');

function topBar(pack, W, P, { dark = true, badgeSize } = {}) {
  const { brand, words, assets = {} } = pack;
  const [a, b] = lockup(words.eyebrow);
  const col = dark ? '#fff' : C.ink;
  return abs(P, Math.round(P * 0.8), W - 2 * P, Math.round(badgeSize || W * 0.1), { justifyContent: 'space-between', alignItems: 'flex-start' }, badge(brand, Math.round(badgeSize || W * 0.1), assets), h('div', { flexDirection: 'column', alignItems: 'flex-end', marginTop: 6 }, label(a, { key: 'montBold', size: 20, color: col, tracking: 0.32, maxW: W * 0.55 }), b ? h('div', { marginTop: 6 }, label(b, { size: 15, color: dark ? 'rgba(255,255,255,0.7)' : '#555', tracking: 0.3, maxW: W * 0.55 })) : null));
}

const statRows = (stats, metalName, width) =>
  h(
    'div',
    { flexDirection: 'column', width },
    stats.map((st, i) => h('div', { alignItems: 'center', paddingTop: 12, paddingBottom: 12, borderTop: i ? '1px solid rgba(255,255,255,0.22)' : 'none' }, disc(metalName, 34), h('div', { flexDirection: 'column', marginLeft: 14 }, solid(st.value, 'didoneBold', 30, '#fff', { lineHeight: 1 }), h('div', { marginTop: 4 }, label(st.label, { size: 13, color: 'rgba(255,255,255,0.72)', tracking: 0.22, maxW: width - 60 }))))),
  );

// ---------------------------------------------------------------- medal, name on top
export function medalTop(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, assets = {} } = pack;
  const P = Math.round(W * 0.045);
  const M = Math.round(W * 0.032);
  const maxW = W - 2 * M;
  const { top, big } = tiersOf(words);
  const mt = metalOf(words);
  const bigSize = fitSize(big, 'cond', maxW, { max: Math.round(H * 0.2), min: 80 });
  const topSize = top ? Math.min(Math.round(bigSize * 0.56), fitSize(top, 'cond', maxW, { max: Math.round(H * 0.12), min: 40 })) : 0;
  const yHead = Math.round(H * 0.06);
  const headH = Math.round(topSize * 0.92 + bigSize * 0.9);
  const stats = (words.stats || []).slice(0, 3);
  const india = indiaOf(pack);
  const kick = words.kicker ? setText(words.kicker, 'cond', W * 0.34, { max: 62, min: 30, maxLines: 4 }) : null;
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0b0c10', color: '#fff' },
    photo(assets, W, H),
    shade(W, H, [[0, 0.8], [0.28, 0.5], [0.42, 0.04], [0.62, 0], [0.82, 0.4], [1, 0.85]]),
    vignette(W, H, 0.28),
    cutout(assets, { x: Math.round(W * 0.16), y: Math.round(H * 0.38), w: Math.round(W * 0.68), h: Math.round(H * 0.62) }),
    // No photo yet: the medal itself fills the middle.
    !assets.hero && !assets.cutout ? abs(0, Math.round(H * 0.42), W, Math.round(H * 0.34), { justifyContent: 'center', alignItems: 'center' }, medal(mt, Math.round(W * 0.3))) : null,
    // the small masthead and the competition
    abs(P, Math.round(P * 0.6), W - 2 * P, 30, { justifyContent: 'space-between' }, label('THE SPORTS BINGE', { size: 14, color: 'rgba(255,255,255,0.75)', tracking: 0.3 }), label(lockup(words.eyebrow)[0], { size: 14, color: 'rgba(255,255,255,0.75)', tracking: 0.3, maxW: W * 0.5 })),
    abs(M, yHead, maxW, headH + 80, { flexDirection: 'column', alignItems: 'center' }, top ? solid(top, 'cond', topSize, '#F7F2E8', { shadow: true, weight: 0.012 }) : null, h('div', { marginTop: Math.round(-bigSize * 0.02) }, metal(big, 'cond', bigSize, mt, { weight: 0.014 })), h('div', { marginTop: 14 }, words.name ? ruled(words.name, { width: Math.round(W * 0.7), size: 22, tracking: 0.42 }) : null)),
    abs(P, yHead + headH + 92, 130, 130, {}, badge(pack.brand, Math.round(W * 0.1), assets)),
    // kicker and explainer, bottom left
    abs(P, 0, Math.round(W * 0.38), H - P, { flexDirection: 'column', justifyContent: 'flex-end' }, kick ? h('div', { flexDirection: 'column', marginBottom: 16 }, kick.lines.map((l) => solid(l, 'cond', kick.size, '#fff', { shadow: true, lineHeight: 0.98, weight: 0.012 }))) : null, para(short(words.explainer, 150), { size: 18, color: 'rgba(255,255,255,0.85)', width: Math.round(W * 0.34), lineHeight: 1.38 })),
    // the numbers, bottom right
    stats.length ? abs(W - P - Math.round(W * 0.28), 0, Math.round(W * 0.28), H - P, { flexDirection: 'column', justifyContent: 'flex-end' }, h('div', { backgroundColor: 'rgba(8,8,12,0.55)', border: '1px solid rgba(255,255,255,0.18)', padding: '6px 16px', borderRadius: 6 }, statRows(stats, mt, Math.round(W * 0.28) - 34))) : null,
    india ? abs(W - P - 120, H - Math.round(P * 0.45), 120, 4, {}, tricolourRule(120, 4)) : null,
  );
}

// ---------------------------------------------------------------- medal, metal at the bottom
export function medalBottom(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, story: s, assets = {} } = pack;
  const P = Math.round(W * 0.045);
  const M = Math.round(W * 0.028);
  const maxW = W - 2 * M;
  const { top, big } = tiersOf(words);
  const mt = metalOf(words);
  const bigSize = fitSize(big, 'cond', maxW, { max: Math.round(H * 0.24), min: 90 });
  const baseY = Math.round(H * 0.8);
  const india = indiaOf(pack);
  const st = (words.stats || [])[0];
  const line = short(String(s.title || words.explainer || '').toUpperCase().replace(/\s*[|–—-]\s*[^|–—-]+$/, ''), 64);
  const [, place = ''] = lockup(words.eyebrow);
  const nameWords = top ? top.split(/\s+/) : [];
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0b0c10', color: '#fff' },
    photo(assets, W, H),
    shade(W, H, [[0, 0.4], [0.14, 0], [0.5, 0], [0.68, 0.72], [1, 0.95]]),
    vignette(W, H, 0.25),
    cutout(assets, { x: Math.round(W * 0.14), y: Math.round(H * 0.07), w: Math.round(W * 0.72), h: Math.round(H * 0.66) }),
    topBar(pack, W, P),
    // the name, small and spaced, beside the athlete
    nameWords.length && nameWords.length <= 3 ? abs(P, Math.round(H * 0.4), Math.round(W * 0.3), 200, { flexDirection: 'column' }, nameWords.map((w) => solid(w, 'didoneMed', 34, 'rgba(255,255,255,0.92)', { tracking: 0.28, lineHeight: 1.15, shadow: true })), h('div', { width: 46, height: 2, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 12 })) : null,
    abs(M, baseY - Math.round(bigSize * 0.9), maxW, Math.round(bigSize * 0.95), { justifyContent: 'center' }, metal(big, 'cond', bigSize, mt, { weight: 0.014 })),
    abs(P, baseY + 14, W - 2 * P, 60, { flexDirection: 'column', alignItems: 'center' }, label(line, { key: 'didoneMed', size: 17, color: 'rgba(255,255,255,0.88)', tracking: 0.3, maxW: W - 2 * P }), india ? h('div', { marginTop: 12 }, tricolourRule(110, 4)) : null),
    // footer: the event and the boxed number
    abs(P, H - P - 74, W - 2 * P, 74, { justifyContent: 'space-between', alignItems: 'flex-end' }, h('div', { flexDirection: 'column' }, words.name ? solid(words.name.split(' · ').pop(), 'didoneMed', 24, '#fff', { tracking: 0.25 }) : null, place ? h('div', { marginTop: 8 }, label(place, { key: 'didoneMed', size: 14, color: 'rgba(255,255,255,0.65)', tracking: 0.3 })) : null), st ? h('div', { flexDirection: 'column', alignItems: 'center', border: '1px solid rgba(255,255,255,0.65)', padding: '8px 22px' }, label(/^time$/i.test(st.label) ? 'FINAL TIME' : st.label, { size: 12, color: 'rgba(255,255,255,0.75)', tracking: 0.3 }), h('div', { marginTop: 4 }, solid(st.value, 'didoneMed', 34, '#fff', { tracking: 0.12 }))) : null),
  );
}

// ---------------------------------------------------------------- medal phrase
export function phrase(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, assets = {} } = pack;
  const P = Math.round(W * 0.045);
  // Podium phrases are gold like the page's; a single medal keeps its own metal.
  const mt = /\b(GOLD|SILVER|BRONZE)/i.test(words.headline) ? metalOf(words) : /PODIUM|DOUBLE|TWO|BOTH|TWICE/i.test(words.headline) ? 'gold' : METALS.includes(words.accent) ? words.accent : 'gold';
  const t = setText(clean(words.headline).replace(/\.$/, ''), 'cond', W * 0.9, { max: Math.round(H * 0.14), min: 60, maxLines: 3 });
  const podium = (words.podium || []).slice(0, 2);
  const stats = podium.length ? podium.map((p) => ({ label: p.name, metal: p.metal, value: p.value })) : (words.stats || []).slice(0, 2);
  const india = indiaOf(pack);
  const colW = Math.round((W - 2 * P) / Math.max(1, stats.length));
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0b0c10', color: '#fff' },
    photo(assets, W, H),
    shade(W, H, [[0, 0.35], [0.14, 0], [0.44, 0.04], [0.62, 0.82], [1, 0.96]]),
    vignette(W, H, 0.22),
    cutout(assets, { x: Math.round(W * 0.12), y: Math.round(H * 0.08), w: Math.round(W * 0.76), h: Math.round(H * 0.56) }),
    topBar(pack, W, P),
    abs(P, 0, W - 2 * P, H - P, { flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' },
      t.lines.map((l, i) => h('div', { marginTop: i ? -Math.round(t.size * 0.04) : 0 }, metal(l.toUpperCase(), 'cond', t.size, mt, { weight: 0.014 }))),
      words.name ? h('div', { marginTop: 18, alignItems: 'center' }, label(words.name, { key: 'montBold', size: 20, color: '#fff', tracking: 0.32, maxW: W * 0.78 }), india ? h('div', { marginLeft: 14 }, flag(null, 30, { nation: 'India' })) : null) : null,
      stats.length ? h('div', { marginTop: 30, width: W - 2 * P, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 22 }, stats.map((st, i) => h('div', { width: colW, flexDirection: 'column', alignItems: 'center', borderLeft: i ? '1px solid rgba(255,255,255,0.3)' : 'none' }, label(st.label, { size: 15, color: 'rgba(255,255,255,0.8)', tracking: 0.3, maxW: colW - 20 }), st.metal ? h('div', { marginTop: 8 }, metal(st.metal.toUpperCase(), 'cond', 72, st.metal, { opacity: 0.5 })) : null, st.value ? h('div', { marginTop: 6 }, solid(st.value, 'barlowSemi', st.metal ? 46 : 54, '#fff', { lineHeight: 1 })) : null))) : null,
      words.kicker ? h('div', { marginTop: 22 }, label(words.kicker, { size: 13, color: 'rgba(255,255,255,0.6)', tracking: 0.3, maxW: W - 2 * P })) : null,
    ),
  );
}

// ---------------------------------------------------------------- number (milestones, records)
export function number(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, assets = {} } = pack;
  const P = Math.round(W * 0.045);
  const parts = clean(words.headline).split(/\s+/);
  const num = (parts[0] || '').replace(/\.$/, '') + (/\.$/.test(parts[0] || '') && parts.length > 1 ? '.' : '');
  const unit = parts.slice(1).join(' ').replace(/\.$/, '');
  const numSize = fitSize(num, 'didone', W * 0.86, { max: Math.round(H * 0.22), min: 90 });
  const u = unit ? setText(unit.toUpperCase(), 'cond', W * 0.7, { max: Math.round(numSize * 0.48), min: 40, maxLines: 2 }) : null;
  const stats = (words.stats || []).slice(0, 3);
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0b0c10', color: '#fff' },
    photo(assets, W, H),
    shade(W, H, [[0, 0.88], [0.3, 0.6], [0.48, 0.08], [0.72, 0.05], [0.86, 0.55], [1, 0.9]]),
    vignette(W, H, 0.25),
    cutout(assets, { x: Math.round(W * 0.34), y: Math.round(H * 0.4), w: Math.round(W * 0.64), h: Math.round(H * 0.6) }, { glow: 'rgba(230,182,82,0.3)' }),
    abs(P, Math.round(P * 0.9), W - 2 * P, Math.round(H * 0.45), { flexDirection: 'column', alignItems: 'center' },
      words.name ? ruled(words.name, { width: Math.round(W * 0.6), size: 18, tracking: 0.5, color: 'rgba(255,255,255,0.85)' }) : null,
      h('div', { marginTop: 10 }, metal(num, 'didone', numSize, 'gold', { weight: 0.008 })),
      u ? h('div', { flexDirection: 'column', alignItems: 'center', marginTop: Math.round(numSize * 0.02) }, u.lines.map((l) => solid(l, 'cond', u.size, '#fff', { shadow: true, lineHeight: 0.98 }))) : null,
      words.kicker ? h('div', { marginTop: 16, flexDirection: 'column', alignItems: 'center' }, label(words.kicker, { size: 16, color: '#fff', tracking: 0.32, maxW: W * 0.8 }), h('div', { width: 60, height: 2, backgroundColor: C.gold, marginTop: 12 })) : null,
    ),
    abs(P, Math.round(H * 0.5), Math.round(W * 0.3), Math.round(H * 0.4), { flexDirection: 'column' }, badge(pack.brand, Math.round(W * 0.1), assets), stats.slice(0, 2).map((st) => h('div', { flexDirection: 'column', marginTop: 24 }, metal(st.value, 'didone', 116, 'gold', { opacity: 0.5 }), h('div', { marginTop: 6 }, label(st.label, { key: 'montBold', size: 16, color: 'rgba(255,255,255,0.85)', tracking: 0.3, maxW: W * 0.28 })), h('div', { width: 54, height: 2, backgroundColor: C.gold, marginTop: 10 })))),
    words.explainer ? abs(0, H - Math.round(H * 0.1), W, Math.round(H * 0.1), { backgroundColor: 'rgba(6,7,10,0.86)', borderTop: `2px solid ${C.gold}`, alignItems: 'center', paddingLeft: P, paddingRight: P }, para(short(words.explainer, 140), { size: 19, color: 'rgba(255,255,255,0.88)', width: W - 2 * P, lineHeight: 1.35 })) : null,
  );
}

// ---------------------------------------------------------------- quote
export function quote(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, assets = {} } = pack;
  const P = Math.round(W * 0.05);
  const q0 = clean(words.headline).replace(/…$/, '');
  const q = /[.!?]$/.test(q0) ? q0 : `${q0}.`;
  const t = setText(q, 'semi', W * 0.8, { max: Math.round(H * 0.075), min: 34, maxLines: 4 });
  const lines = t.lines.map((l, i) => (i === 0 ? `“${l}` : l));
  lines[lines.length - 1] += '”';
  const inner = lines.map((l, i) => [i, l.length]).filter(([i]) => i > 0 && i < lines.length - 1).sort((a, b) => b[1] - a[1]);
  const goldIdx = inner.length ? inner[0][0] : -1;
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0b0c10', color: '#fff' },
    photo(assets, W, H),
    shade(W, H, [[0, 0.25], [0.25, 0], [0.48, 0.18], [0.62, 0.84], [1, 0.97]]),
    cutout(assets, { x: Math.round(W * 0.2), y: Math.round(H * 0.02), w: Math.round(W * 0.7), h: Math.round(H * 0.56) }),
    abs(P, Math.round(P * 0.8), 120, 120, {}, badge(pack.brand, Math.round(W * 0.1), assets)),
    abs(P, 0, W - 2 * P, H - P, { flexDirection: 'column', justifyContent: 'flex-end' },
      solid('“', 'didone', 150, C.gold, { lineHeight: 0.6 }),
      h('div', { flexDirection: 'column', marginTop: 10 }, lines.map((l, i) => solid(l, 'semi', t.size, i === goldIdx ? C.gold : '#fff', { shadow: true, lineHeight: 1.04 }))),
      words.name ? h('div', { marginTop: 18 }, label(words.name, { size: 16, color: 'rgba(255,255,255,0.75)', tracking: 0.4 })) : null,
      words.explainer && words.explainer !== q ? h('div', { marginTop: 22, alignItems: 'flex-start' }, solid('“', 'didone', 46, C.gold, { lineHeight: 0.8 }), para(short(words.explainer, 140), { key: 'didoneMed', size: 22, color: 'rgba(255,255,255,0.86)', width: W - 2 * P - 40, lineHeight: 1.3, style: { marginLeft: 8 } })) : null,
      h('div', { marginTop: 18, width: W - 2 * P, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 12, justifyContent: 'space-between' }, label(words.eyebrow, { size: 12, color: 'rgba(255,255,255,0.6)', tracking: 0.3, maxW: W * 0.6 }), label(pack.brand.handle, { size: 12, color: 'rgba(255,255,255,0.6)', tracking: 0.3 })),
    ),
  );
}

// ---------------------------------------------------------------- result, cream
const NAVY_INK = '#0F1B33';
export function cream(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { brand, words, story: s, assets = {} } = pack;
  const P = Math.round(W * 0.055);
  const ink = NAVY_INK;
  const pre = s.status?.state === 'pre';
  const live = s.status?.state === 'in';
  const hs = pre ? '' : String(s.home?.score ?? '');
  const as = pre ? '' : String(s.away?.score ?? '');
  const longScore = hs.length + as.length > 7;
  const season = s.date ? (() => { const d = new Date(s.date); const y = d.getUTCFullYear(); return d.getUTCMonth() >= 6 ? `${y}/${String(y + 1).slice(2)}` : `${y - 1}/${String(y).slice(2)}`; })() : '';
  const comp = [s.league?.name || lockup(words.eyebrow)[0], season].filter(Boolean).join(' · ');
  const mast = fitSize('THE SPORTS BINGE', 'cond', W - 2 * P, { max: 200 });
  const head = setText(clean(words.headline), 'semi', W - 2 * P, { max: Math.round(H * 0.125), min: 50, maxLines: s.kind === 'news' ? 4 : 2 });
  const goals = (s.events || []).filter((e) => /goal|try|touchdown/i.test(e.type) && e.player).slice(0, 8);
  const side = (t) => goals.filter((g) => (g.team || '').toUpperCase() === (t?.abbr || '').toUpperCase()).map((g) => `${g.player.replace(/\s*\(.*\)/, '').split(' ').slice(-1)[0]} ${g.minute}`.trim());
  const team = (t, src, flg) => h('div', { flexDirection: 'column', alignItems: 'center', width: 250 }, flag(flg || src, 190, { nation: t?.name, code: t?.abbr }), h('div', { marginTop: 14 }, label(t?.name || t?.abbr, { key: 'didoneMed', size: 19, color: '#2a2a2a', tracking: 0.3, maxW: 250 })), side(t).length ? h('div', { marginTop: 8, flexDirection: 'column', alignItems: 'center' }, side(t).map((g) => solid(g, 'didoneMed', 19, '#444', { lineHeight: 1.35 }))) : null);
  const bottomLine = [s.note, s.league?.name && !s.note ? s.venue?.name : ''].filter(Boolean).join(' · ') || s.venue?.name;
  return h(
    'div',
    { width: W, height: H, backgroundColor: C.cream, flexDirection: 'column', alignItems: 'center', padding: P, paddingTop: Math.round(P * 0.9), color: ink, position: 'relative' },
    ruled(comp, { width: W - 2 * P, color: '#2f2f2f', size: 16, tracking: 0.3 }),
    h('div', { marginTop: 8 }, solid('THE SPORTS BINGE', 'cond', mast, ink, { lineHeight: 0.92, stretch: 1.42, weight: 0.006 })),
    h('div', { width: W - 2 * P, height: 2, backgroundColor: ink, marginTop: 8 }),
    h('div', { flexGrow: 1 }),
    h('div', { flexDirection: 'column', alignItems: 'center' }, head.lines.map((l) => solid(l, 'semi', head.size, ink, { lineHeight: 1.0, stretch: 1.08, weight: 0.008, style: { letterSpacing: -head.size * 0.015 } }))),
    h('div', { flexGrow: 1 }),
    s.kind !== 'news'
      ? h(
          'div',
          { flexDirection: 'column', alignItems: 'center', width: W - 2 * P },
          ruled(pre ? `${pack.when?.day || ''} · ${pack.when?.time || ''}` : live ? 'LIVE' : 'FULL TIME', { width: W - 2 * P, color: '#2a2a2a', size: 17, tracking: 0.35 }),
          longScore
            ? h('div', { flexDirection: 'column', marginTop: 22, width: W - 2 * P }, [s.home, s.away].map((t, i) => h('div', { alignItems: 'center', marginTop: i ? 16 : 0 }, flag(i ? assets.awayFlag || assets.awayLogo : assets.homeFlag || assets.homeLogo, 110, { nation: t?.name, code: t?.abbr }), h('div', { marginLeft: 22, width: 420 }, label(t?.name, { key: 'didoneMed', size: 22, color: ink, tracking: 0.25, maxW: 420 })), h('div', { marginLeft: 'auto' }, solid(String(t?.score ?? ''), 'didone', 60, ink)))))
            : h('div', { alignItems: 'flex-start', justifyContent: 'space-between', width: W - 2 * P, marginTop: 22 }, team(s.home, assets.homeLogo, assets.homeFlag), h('div', { width: 1, height: 170, backgroundColor: 'rgba(0,0,0,0.25)' }), h('div', { flexDirection: 'column', alignItems: 'center', marginTop: -16 }, pre ? solid('v', 'didoneItal', 120, '#666') : solid(`${hs}–${as}`, 'didone', 210, ink, { lineHeight: 1, weight: 0.006 })), h('div', { width: 1, height: 170, backgroundColor: 'rgba(0,0,0,0.25)' }), team(s.away, assets.awayLogo, assets.awayFlag)),
        )
      : para(words.explainer, { key: 'didoneMed', size: 28, color: '#333', width: W - 2 * P, align: 'center', lineHeight: 1.35 }),
    h('div', { flexGrow: 1 }),
    bottomLine ? ruled(bottomLine, { width: W - 2 * P, color: '#3a3a3a', size: 15, tracking: 0.32 }) : null,
    h('div', { marginTop: 14 }, label(brand.handle, { key: 'didoneMed', size: 15, color: '#555', tracking: 0.06 })),
  );
}

// ---------------------------------------------------------------- result over a photo
export function resultPhoto(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, story: s, assets = {} } = pack;
  const P = Math.round(W * 0.05);
  const head = setText(clean(words.headline).toUpperCase(), 'didone', W - 2 * P, { max: Math.round(H * 0.12), min: 60, maxLines: 2 });
  const goals = (s.events || []).filter((e) => /goal/i.test(e.type) && e.player).slice(0, 6);
  const row = (t, src, flg) => h('div', { flexDirection: 'column', marginTop: 16 }, h('div', { alignItems: 'center' }, flag(flg || src, 104, { nation: t?.name, code: t?.abbr, border: 'rgba(255,255,255,0.5)' }), h('div', { marginLeft: 22 }, solid(String(t?.score ?? ''), 'didone', 96, '#F3EBDD', { lineHeight: 1, shadow: true }))), h('div', { marginTop: 8 }, label(t?.name, { key: 'montBold', size: 15, color: 'rgba(255,255,255,0.85)', tracking: 0.32, maxW: 300 })));
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0b0c10', color: '#fff' },
    photo(assets, W, H),
    shade(W, H, [[0, 0.9], [0.3, 0.55], [0.52, 0.05], [0.85, 0.15], [1, 0.6]]),
    shade(W, H, [[0, 0.65], [0.38, 0.3], [0.6, 0]], '0,0,0', '90deg'),
    cutout(assets, { x: Math.round(W * 0.34), y: Math.round(H * 0.36), w: Math.round(W * 0.64), h: Math.round(H * 0.64) }),
    abs(W - P - Math.round(W * 0.11), H - P - Math.round(W * 0.11), Math.round(W * 0.11), Math.round(W * 0.11), {}, badge(pack.brand, Math.round(W * 0.11), assets)),
    abs(P, Math.round(P * 0.8), W - 2 * P, H, { flexDirection: 'column' },
      h('div', { width: W - 2 * P, alignItems: 'center' }, label(lockup(words.eyebrow)[0], { key: 'montBold', size: 15, color: 'rgba(255,255,255,0.8)', tracking: 0.3, maxW: W * 0.6 }), h('div', { flexGrow: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.35)', marginLeft: 16 })),
      h('div', { flexDirection: 'column', marginTop: 18 }, head.lines.map((l) => solid(l, 'didone', head.size, '#F3EBDD', { shadow: true, lineHeight: 0.95, weight: 0.006 }))),
      para(short(words.kicker || words.explainer, 90), { key: 'didoneMed', size: 30, color: 'rgba(255,255,255,0.92)', width: Math.round(W * 0.4), lineHeight: 1.2, style: { marginTop: 16 } }),
      h('div', { width: 46, height: 3, backgroundColor: C.red, marginTop: 18 }),
      h('div', { flexDirection: 'column', marginTop: 6 }, row(s.home, assets.homeLogo, assets.homeFlag), h('div', { width: 300, height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 14 }), row(s.away, assets.awayLogo, assets.awayFlag)),
      goals.length ? h('div', { flexDirection: 'column', marginTop: 16, width: 300 }, goals.map((g) => h('div', { borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: 6, paddingBottom: 6 }, solid(`${g.player.replace(/\s*\(.*\)/, '')} ${g.minute}`, 'mont', 16, 'rgba(255,255,255,0.85)')))) : null,
    ),
  );
}

// ---------------------------------------------------------------- preview: two stars + cream band
const TEAM_INK = { india: C.navy, pakistan: C.green, england: '#13254A', spain: '#A3151C', brazil: '#0C6A2E', argentina: '#2D6FB5', australia: '#00563F', 'south africa': '#00563F', 'new zealand': '#111', portugal: '#046A38', france: '#1F3A93', germany: '#111', italy: '#0B4EA2', netherlands: '#E06A12', norway: '#BA0C2F' };
const TEAM_PAIR = { england: ['#13254A', '#CE1124'], spain: ['#AA151B', '#F1BF00'], india: [C.saffron, C.indiaGreen], pakistan: ['#01411C', '#FFFFFF'], portugal: ['#046A38', '#DA291C'], france: ['#1F3A93', '#E1000F'], brazil: ['#0C6A2E', '#FFDF00'], argentina: ['#75AADB', '#FFFFFF'], germany: ['#111111', '#DD0000'] };
const inkOf = (t, fallback) => TEAM_INK[String(t?.name || '').toLowerCase()] || fallback;
const pairOf = (t, fallback) => (TEAM_PAIR[String(t?.name || '').toLowerCase()] || fallback).map((c, i, a) => (/^#f{6}$/i.test(c) ? a[1 - i] : c));
function tornBand(W, hh, color = C.cream) {
  let d = `M0 ${hh} L0 40`;
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let x = 0; x <= W; x += 14) d += ` L${x} ${Math.round(16 + rnd() * 30 + Math.sin(x / 90) * 10)}`;
  d += ` L${W} ${hh} Z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${hh}"><defs><filter id="s" x="-5%" y="-20%" width="110%" height="140%"><feDropShadow dx="0" dy="-6" stdDeviation="8" flood-opacity="0.35"/></filter></defs><path d="${d}" fill="${color}" filter="url(#s)"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
// A painted brush stroke in two colours (team colours, the tricolour).
function brush(w, hh, [c1, c2], flip = false) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><defs><filter id="r"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.4" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="${Math.round(hh * 0.18)}"/></filter></defs><g filter="url(#r)" transform="${flip ? `translate(${w},0) scale(-1,1)` : ''}"><path d="M0 ${hh * 0.15} Q ${w * 0.5} ${hh * 0.05} ${w} ${hh * 0.3} L ${w} ${hh * 0.55} Q ${w * 0.5} ${hh * 0.35} 0 ${hh * 0.5} Z" fill="${c1}"/><path d="M0 ${hh * 0.55} Q ${w * 0.5} ${hh * 0.45} ${w} ${hh * 0.65} L ${w} ${hh * 0.85} Q ${w * 0.5} ${hh * 0.7} 0 ${hh * 0.88} Z" fill="${c2}"/></g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
export function preview(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, story: s, assets = {}, when = {} } = pack;
  const P = Math.round(W * 0.05);
  const bandH = Math.round(H * 0.33);
  const head = setText(clean(words.headline), 'semi', W - 2 * P, { max: Math.round(H * 0.09), min: 44, maxLines: 2 });
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#15161c', color: C.ink },
    assets.hero ? img(assets.hero, { position: 'absolute', left: 0, top: 0, width: W, height: H - bandH + 70, objectFit: 'cover', objectPosition: 'center 22%' }) : photo(assets, W, H - bandH + 70),
    shade(W, H - bandH + 70, [[0, 0.55], [0.2, 0], [1, 0.05]]),
    cutout(assets, { x: Math.round(W * 0.1), y: Math.round(H * 0.08), w: Math.round(W * 0.8), h: H - bandH }),
    abs(0, Math.round(P * 0.7), W, 110, { flexDirection: 'column', alignItems: 'center' }, solid('TSB', 'cond', 46, '#fff', { shadow: true }), h('div', { marginTop: 6 }, label(lockup(words.eyebrow)[0], { key: 'didoneMed', size: 17, color: '#fff', tracking: 0.32, maxW: W * 0.6 }))),
    abs(P, Math.round(P * 0.7), 110, 110, {}, badge(pack.brand, Math.round(W * 0.1), assets)),
    img(brush(Math.round(W * 0.42), Math.round(H * 0.2), pairOf(s.home, ['#13254A', '#CE1124'])), { position: 'absolute', left: -20, top: H - bandH - Math.round(H * 0.06), width: Math.round(W * 0.42), height: Math.round(H * 0.2) }),
    img(brush(Math.round(W * 0.42), Math.round(H * 0.2), pairOf(s.away, ['#AA151B', '#F1BF00']), true), { position: 'absolute', left: W - Math.round(W * 0.42) + 20, top: H - bandH - Math.round(H * 0.06), width: Math.round(W * 0.42), height: Math.round(H * 0.2) }),
    img(tornBand(W, bandH), { position: 'absolute', left: 0, top: H - bandH, width: W, height: bandH }),
    head.lines.length > 1 ? abs(P, H - bandH - Math.round(head.size * 0.98), W - 2 * P, Math.round(head.size * 1.1), { justifyContent: 'center' }, solid(head.lines[0], 'semi', head.size, '#fff', { lineHeight: 1.0, stretch: 1.08, weight: 0.008, shadow: true, style: { letterSpacing: -head.size * 0.015 } })) : null,
    abs(P, H - bandH + 50, W - 2 * P, bandH - 50 - Math.round(P * 0.6), { flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' },
      h('div', { flexDirection: 'column', alignItems: 'center' }, head.lines.slice(head.lines.length > 1 ? 1 : 0).map((l) => solid(l, 'semi', head.size, C.ink, { lineHeight: 1.0, stretch: 1.08, weight: 0.008, style: { letterSpacing: -head.size * 0.015 } }))),
      h('div', { alignItems: 'center', marginTop: 10 }, h('div', { flexDirection: 'column', alignItems: 'center', width: 260 }, flag(assets.homeFlag || assets.homeLogo, 96, { nation: s.home?.name, code: s.home?.abbr }), h('div', { marginTop: 10 }, label(s.home?.name, { key: 'didoneMed', size: 17, color: '#222', tracking: 0.3, maxW: 240 }))), h('div', { width: 1, height: 70, backgroundColor: '#888', marginLeft: 20, marginRight: 20 }), label('VS', { key: 'didoneMed', size: 17, color: '#444', tracking: 0.3 }), h('div', { width: 1, height: 70, backgroundColor: '#888', marginLeft: 20, marginRight: 20 }), h('div', { flexDirection: 'column', alignItems: 'center', width: 260 }, flag(assets.awayFlag || assets.awayLogo, 96, { nation: s.away?.name, code: s.away?.abbr }), h('div', { marginTop: 10 }, label(s.away?.name, { key: 'didoneMed', size: 17, color: '#222', tracking: 0.3, maxW: 240 })))),
      h('div', { flexDirection: 'column', alignItems: 'center' }, label(when.day, { key: 'didoneMed', size: 17, color: '#222', tracking: 0.3 }), h('div', { marginTop: 4 }, label(when.time, { key: 'didone', size: 26, color: C.ink, tracking: 0.2 })), s.venue?.name ? h('div', { marginTop: 6 }, label([s.venue.name, s.venue.city].filter(Boolean).join(', '), { key: 'didoneMed', size: 14, color: '#555', tracking: 0.28, maxW: W * 0.8 })) : null),
    ),
  );
}

// ---------------------------------------------------------------- preview: cream, A vs B
export function vs(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, story: s, assets = {}, when = {} } = pack;
  const P = Math.round(W * 0.05);
  const home = String(s.home?.name || '').toUpperCase();
  const away = String(s.away?.name || '').toUpperCase();
  const nameSize = Math.min(fitSize(home, 'cond', W * 0.84, { max: Math.round(H * 0.17) }), fitSize(away, 'cond', W * 0.84, { max: Math.round(H * 0.17) }));
  const photoTop = Math.round(H * 0.62);
  const stage = (s.note || words.kicker || 'PREVIEW').toUpperCase();
  const facts = String(words.explainer || '').split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2);
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: C.cream, color: C.ink },
    assets.hero ? img(assets.hero, { position: 'absolute', left: 0, top: photoTop, width: W, height: H - photoTop, objectFit: 'cover', objectPosition: 'center 30%' }) : abs(0, photoTop, W, H - photoTop, { backgroundImage: 'linear-gradient(180deg, #2a3550 0%, #0c1220 100%)' }),
    abs(0, photoTop - 2, W, Math.round(H * 0.14), { backgroundImage: `linear-gradient(180deg, ${C.cream} 0%, rgba(241,236,226,0) 100%)` }),
    ...[[s.home, 0], [s.away, 1]].map(([t, i]) => { const [a, b2] = pairOf(t, i ? [C.green, C.red] : [C.navy, C.red]); return abs(i ? W - Math.round(W * 0.12) : 0, 0, Math.round(W * 0.12), photoTop + Math.round(H * 0.1), { backgroundImage: `linear-gradient(${i ? 270 : 90}deg, ${a} 0%, ${a} 30%, ${b2} 55%, rgba(241,236,226,0) 100%)`, opacity: 0.75 }); }),
    abs(P, Math.round(P * 0.8), W - 2 * P, 120, { justifyContent: 'space-between', alignItems: 'flex-start' }, badge(pack.brand, Math.round(W * 0.09), assets), h('div', {})),
    abs(0, Math.round(P * 0.9), W, 40, { justifyContent: 'center' }, label(lockup(words.eyebrow)[0], { key: 'montBold', size: 17, color: '#333', tracking: 0.42, maxW: W * 0.5 })),
    abs(0, Math.round(H * 0.07), W, photoTop, { flexDirection: 'column', alignItems: 'center' },
      solid(home, 'cond', nameSize, inkOf(s.home, C.navy), { lineHeight: 0.9, stretch: 1.22, weight: 0.01 }),
      h('div', { marginTop: -Math.round(nameSize * 0.12), marginBottom: -Math.round(nameSize * 0.1) }, solid('vs', 'didoneItal', Math.round(nameSize * 0.3), '#a99a7c', { lineHeight: 0.9 })),
      solid(away, 'cond', nameSize, inkOf(s.away, C.red), { lineHeight: 0.9, stretch: 1.22, weight: 0.01 }),
      h('div', { marginTop: 18 }, label(stage, { key: 'didone', size: 40, color: C.ink, tracking: 0.32, maxW: W * 0.8 })),
      h('div', { marginTop: 8 }, label([when.day, when.time].filter(Boolean).join(' · '), { key: 'montBold', size: 15, color: '#444', tracking: 0.35 })),
      facts.length ? h('div', { marginTop: 22, alignItems: 'stretch' }, facts.map((f, i) => h('div', { width: Math.round(W * 0.3), paddingLeft: i ? 26 : 0, paddingRight: i ? 0 : 26, borderLeft: i ? '1px solid rgba(0,0,0,0.3)' : 'none' }, para(f.toUpperCase(), { key: 'mont', size: 14, color: '#333', width: Math.round(W * 0.3) - 26, lineHeight: 1.5, style: { letterSpacing: 1.4 } })))) : null,
    ),
  );
}

// ---------------------------------------------------------------- medal tally, cream
export function tally(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, assets = {} } = pack;
  const P = Math.round(W * 0.06);
  const parts = clean(words.headline).replace(/\.$/, '').split(/\s+/);
  const country = parts[0] || 'INDIA';
  const rest = /count/i.test(parts.slice(1).join(' ')) ? 'MEDAL TALLY' : parts.slice(1).join(' ') || 'MEDAL TALLY';
  const stats = (words.stats || []).slice(0, 4);
  const medals = stats.filter((s) => /^(gold|silver|bronze)$/i.test(s.label));
  const rank = stats.find((s) => /table|rank/i.test(s.label));
  const big = words.big ? String(words.big) : medals.length ? String(medals.reduce((a, s) => a + (Number(s.value) || 0), 0)) : '';
  const cSize = fitSize(country.toUpperCase(), 'cond', W * 0.76, { max: Math.round(H * 0.16) });
  const rSize = fitSize(rest.toUpperCase(), 'cond', W * 0.8, { max: Math.round(cSize * 0.55) });
  const bigSize = Math.min(Math.round(H * 0.25), fitSize(big, 'didone', W * 0.56, { max: 460 }));
  const cols = [...medals.map((m) => ({ metal: m.label.toLowerCase(), value: m.value, label: m.label })), ...(rank ? [{ metal: null, value: rank.value.replace(/\D+$/, ''), label: 'OVERALL RANK' }] : [])];
  const colW = Math.round((W - 2 * P) / Math.max(1, cols.length));
  const india = /india/i.test(country);
  const asOf = [words.kicker && /as of/i.test(words.kicker) ? words.kicker : '', lockup(words.eyebrow)[1] || lockup(words.eyebrow)[0]].filter(Boolean).join(' · ');
  const bars = h('div', { width: 74, height: 74, borderRadius: 74, backgroundColor: C.navy, alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 18 }, [14, 24, 34].map((hh) => h('div', { width: 9, height: hh, backgroundColor: '#fff', marginLeft: 3, marginRight: 3 })));
  const yNum = Math.round(H * 0.375);
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: C.cream, color: C.navy },
    india ? img(brush(Math.round(W * 0.7), Math.round(H * 0.18), [C.saffron, C.indiaGreen]), { position: 'absolute', left: -Math.round(W * 0.14), top: yNum + Math.round(bigSize * 0.05), width: Math.round(W * 0.7), height: Math.round(H * 0.18), opacity: 0.9, transform: 'rotate(-20deg)' }) : null,
    india ? img(brush(Math.round(W * 0.34), Math.round(H * 0.07), [C.saffron, C.indiaGreen]), { position: 'absolute', left: Math.round(W * 0.42), top: Math.round(H * 0.005), width: Math.round(W * 0.34), height: Math.round(H * 0.07), opacity: 0.85, transform: 'rotate(-10deg)' }) : null,
    abs(P, Math.round(P * 0.7), W - 2 * P, 110, { justifyContent: 'space-between', alignItems: 'flex-start' }, badge(pack.brand, Math.round(W * 0.1), assets), h('div', {})),
    abs(0, Math.round(H * 0.075), W, Math.round(H * 0.3), { flexDirection: 'column', alignItems: 'center' }, solid(country.toUpperCase(), 'cond', cSize, C.navy, { lineHeight: 0.9, stretch: 1.15, weight: 0.01 }), solid(rest.toUpperCase(), 'cond', rSize, C.navy, { lineHeight: 0.95, weight: 0.01 }), h('div', { marginTop: 14 }, label(asOf, { key: 'montBold', size: 19, color: '#333', tracking: 0.22, maxW: W * 0.84 })), india ? h('div', { marginTop: 12 }, tricolourRule(150, 4)) : null),
    big ? abs(0, yNum, W, Math.round(bigSize * 1.02), { justifyContent: 'center' }, solid(big, 'didone', bigSize, C.navy, { lineHeight: 1, weight: 0.006, style: { letterSpacing: -bigSize * 0.03 } })) : null,
    abs(0, yNum + Math.round(bigSize * 1.0), W, 44, { justifyContent: 'center' }, label('TOTAL MEDALS', { key: 'montBold', size: 26, color: C.navy, tracking: 0.42 })),
    abs(P, H - P - Math.round(H * 0.27), W - 2 * P, Math.round(H * 0.25), { alignItems: 'flex-end' }, cols.map((c, i) => h('div', { width: colW, flexDirection: 'column', alignItems: 'center', borderLeft: i ? '1px solid rgba(0,0,0,0.2)' : 'none' }, c.metal ? disc(c.metal, 96) : bars, h('div', { marginTop: 14 }, solid(c.value, 'didone', 118, c.metal ? { gold: '#B07D1E', silver: '#5F626B', bronze: '#9A4E1E' }[c.metal] : C.navy, { lineHeight: 1, weight: 0.006 })), h('div', { marginTop: 8 }, label(c.label, { key: 'montBold', size: 14, color: '#333', tracking: 0.3 })), h('div', { width: 60, height: 3, marginTop: 10, backgroundColor: c.metal ? { gold: '#C8962E', silver: '#9FA3AD', bronze: '#B5561E' }[c.metal] : C.navy })))),
    abs(P, H - Math.round(P * 0.9), W - 2 * P, 20, { justifyContent: 'center' }, label('Medal standings are subject to change as events conclude.', { size: 12, color: '#666', tracking: 0.04 })),
  );
}

// ---------------------------------------------------------------- breaking / verdict
const RED_WORDS = /\b(guilty|verdict|banned|ban|sacked|sack|charged|suspended|expelled|axed|fired|dead|dies|retires|quits)\b/i;
const ABBREV = [[/\bManchester City\b/gi, 'Man City'], [/\bManchester United\b/gi, 'Man Utd'], [/\bPremier League\b/g, 'Premier League']];
export function verdict(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, story: s, assets = {} } = pack;
  const P = Math.round(W * 0.05);
  const maxW = W - 2 * P;
  // The page sets the whole headline here, stepping down in size.
  let full = clean(s.title && s.title.split(/\s+/).length <= 14 ? s.title : words.headline).replace(/\s*[|–—-]\s*[^|–—-]+$/, '');
  for (const [re, to] of ABBREV) full = full.replace(re, to);
  full = full.replace(/\.$/, '').toUpperCase();
  const lines = linesFor(full, 'didone', Math.round(H * 0.075), maxW, { maxLines: 5 });
  const stack = stackFill(lines, 'didone', maxW, { max: Math.round(H * 0.1), min: 40 });
  const redAt = stack.findIndex((l) => RED_WORDS.test(l.text));
  const photoTop = Math.round(H * 0.58);
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0b0d12', color: '#fff' },
    assets.hero ? img(assets.hero, { position: 'absolute', left: 0, top: photoTop, width: W, height: H - photoTop, objectFit: 'cover', objectPosition: 'center 40%' }) : abs(0, photoTop, W, H - photoTop, { backgroundImage: 'linear-gradient(180deg, #1b2533 0%, #070a10 100%)' }),
    abs(0, photoTop, W, H - photoTop, { backgroundColor: 'rgba(14,34,58,0.25)' }),
    abs(0, photoTop - 2, W, Math.round(H * 0.18), { backgroundImage: 'linear-gradient(180deg, #0b0d12 0%, rgba(11,13,18,0) 100%)' }),
    abs(P, Math.round(P * 0.8), 120, 120, {}, badge(pack.brand, Math.round(W * 0.11), assets)),
    abs(P, Math.round(H * 0.1), maxW, photoTop, { flexDirection: 'column' },
      h('div', { width: maxW, alignItems: 'center', justifyContent: 'flex-end' }, label('BREAKING REPORT', { key: 'montBold', size: 17, color: C.red, tracking: 0.55 }), h('div', { width: Math.round(maxW * 0.3), height: 1, backgroundColor: C.red, marginLeft: 16 })),
      h('div', { flexDirection: 'column', marginTop: 16 }, stack.map((l, i) => solid(l.text, 'didone', l.size, i === redAt ? C.red : '#F4F1EA', { lineHeight: 0.98, weight: 0.006, shadow: true }))),
      h('div', { marginTop: 18, alignItems: 'flex-start' }, h('div', { width: 40, height: 3, backgroundColor: C.red, marginTop: 15, marginRight: 14 }), para(short(words.explainer, 150), { key: 'didoneMed', size: 26, color: 'rgba(255,255,255,0.9)', width: Math.round(W * 0.74), lineHeight: 1.25 })),
      s.source && s.source !== 'pasted' ? h('div', { marginTop: 12, marginLeft: 54 }, solid(`Reported by ${s.source}`, 'mont', 15, 'rgba(255,255,255,0.6)')) : null,
    ),
  );
}

// ---------------------------------------------------------------- carousel cover, cream, type only
export function cover(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const { words, assets = {} } = pack;
  const P = Math.round(W * 0.07);
  const maxW = W - 2 * P;
  const acc = new Set((words.accentWords || []).map((w) => w.toUpperCase().replace(/[^\w]/g, '')));
  // Accent words stand on their own line, larger, in bronze.
  const block = (t) => {
    const words_ = clean(t).toUpperCase().split(/\s+/).filter(Boolean);
    const segs = [];
    let cur = [];
    for (const w of words_) {
      if (acc.has(w.replace(/[^\w]/g, ''))) {
        if (cur.length) segs.push({ text: cur.join(' '), hot: false });
        segs.push({ text: w, hot: true });
        cur = [];
      } else cur.push(w);
    }
    if (cur.length) segs.push({ text: cur.join(' '), hot: false });
    const out = [];
    for (const sg of segs) {
      if (sg.hot) out.push(metal(sg.text, 'cond', fitSize(sg.text, 'cond', maxW * 0.86, { max: Math.round(H * 0.15) }), 'bronze', { shadow: false, lineHeight: 0.92, weight: 0.012 }));
      else for (const l of breakLines(sg.text, 'cond', Math.round(H * 0.075), maxW * 0.86, { maxLines: 3 }) || [sg.text]) out.push(solid(l, 'cond', Math.min(Math.round(H * 0.085), fitSize(l, 'cond', maxW * 0.86, { max: Math.round(H * 0.085) })), C.ink, { lineHeight: 0.95, weight: 0.012 }));
    }
    return out;
  };
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: C.paper, flexDirection: 'column', padding: P, paddingTop: Math.round(P * 0.6) },
    h('div', { width: maxW, justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.35)', paddingBottom: 10 }, label(lockup(words.eyebrow)[1] || lockup(words.eyebrow)[0], { size: 12, color: '#444', tracking: 0.3 }), label(words.name || pack.brand.name, { size: 12, color: '#444', tracking: 0.3, maxW: maxW * 0.5 })),
    h('div', { flexDirection: 'column', marginTop: Math.round(H * 0.04) }, block(words.headline)),
    h('div', { marginTop: 24, marginBottom: 24 }, tricolourRule(170, 6)),
    words.kicker ? h('div', { flexDirection: 'column' }, block(words.kicker)) : null,
    h('div', { flexGrow: 1 }),
    h('div', { width: maxW, justifyContent: 'space-between', alignItems: 'flex-end' }, h('div', { flexDirection: 'column', width: Math.round(W * 0.55) }, para(short(words.explainer, 110).toUpperCase(), { key: 'montBold', size: 14, color: '#333', width: Math.round(W * 0.55), lineHeight: 1.6, style: { letterSpacing: 2.2 } })), h('div', { flexDirection: 'column', alignItems: 'flex-end' }, badge(pack.brand, 72, assets), h('div', { marginTop: 12, alignItems: 'center' }, h('div', { width: 90, height: 2, backgroundColor: C.ink }), solid('›', 'mont', 34, C.ink, { lineHeight: 0.6 })))),
  );
}

export const TSB_TEMPLATES = {
  'tsb-medal-top': medalTop,
  'tsb-medal-bottom': medalBottom,
  'tsb-phrase': phrase,
  'tsb-number': number,
  'tsb-quote': quote,
  'tsb-cream': cream,
  'tsb-result-photo': resultPhoto,
  'tsb-preview': preview,
  'tsb-vs': vs,
  'tsb-tally': tally,
  'tsb-verdict': verdict,
  'tsb-cover': cover,
};
