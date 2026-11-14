// @musc_reddevils match posts, from the page's own grid (14 Nov 2026 screenshots):
// MATCHDAY (stadium photo, "MATCH" cream + "DAY" red, a short line, the fixture in red and
// blue, date · time IST), FULL TIME (the action photo, FULL TIME across the top, crest,
// "MANCHESTER UNITED 4–0 SABAH" with the scorers under each side, the competition) and
// CONFIRMED XI (the line-up on a dark pitch in its formation, crests and formation on top).
import { font, fitSize, measure } from './type.js';
import { h, text, img, abs, SIZES, C, solid, stretched, badge, crest } from './kit.js';

const RED = C.utd;
const CREAM = '#EFE7DA';
const BLUE = '#3C6FD1';
const BG = '#0B0B0D';
const k = (H) => H / 1440;

const isUs = (brand, t) => !!t && brand?.team?.aliases?.test(t.name || '');
const short = (n = '') => {
  // "Youri Tielemans / Noussair Mazraoui" is scorer / assist: keep the scorer
  const p = String(n).split(' / ')[0].replace(/\s*\(.*\)/, '').trim().split(/\s+/);
  return p.length > 1 ? `${p[0][0]}.${p.slice(1).join(' ')}` : p[0] || '';
};
// a line of type exactly `w` wide (condensed display face, stretched up)
const fill = (s, key, w, color, { max = 400, stretch = 1, shadow = true, style = {} } = {}) => {
  const size = Math.min(max, fitSize(s, key, w));
  return { node: solid(s, key, size, color, { shadow, stretch, lineHeight: 0.9, style }), size };
};

const crestOf = (brand, assets, pack) => (assets.badge ? img(assets.badge, { width: '100%', height: '100%', objectFit: 'contain' }) : badge(brand, 150, assets));
const corner = (x, y, s = 18) => abs(x, y, s, s, {}, h('div', { position: 'absolute', left: s / 2 - 1, top: 0, width: 2, height: s, backgroundColor: 'rgba(255,255,255,0.35)' }), h('div', { position: 'absolute', left: 0, top: s / 2 - 1, width: s, height: 2, backgroundColor: 'rgba(255,255,255,0.35)' }));

// ---------------------------------------------------------------- MATCHDAY
export function matchdayPoster(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const q = k(H);
  const { brand, story: s = {}, assets = {}, when = {}, words = {} } = pack;
  const P = Math.round(64 * q);
  const usHome = isUs(brand, s.home) || !isUs(brand, s.away);
  const home = s.home || {};
  const away = s.away || {};
  // the page's own line under MATCHDAY ("HOME. AT LAST."), else where it is
  const line = String(words.kicker || (usHome ? 'HOME. OLD TRAFFORD.' : `AWAY. ${String(s.venue?.name || '').toUpperCase()}.`))
    .toUpperCase()
    .slice(0, 34);
  const [lineA, ...lineB] = line.split(/(?<=\.)\s+/);
  const date = [when.day, when.time].filter(Boolean).join(' · ').replace(/,\s*/g, ' ').toUpperCase();
  const textW = Math.round(W * 0.6);
  const m = fill('MATCH', 'anton', textW * 0.62, CREAM, { stretch: 1.55, max: Math.round(230 * q) });
  const dayW = measure('DAY', 'anton', m.size);
  const top = Math.round(H * 0.4);
  const mH = Math.round(m.size * 0.9 * 1.55);
  const nameSize = Math.round(52 * q);
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: BG },
    // the ground on the right, dark on the left where the type sits
    assets.hero ? img(assets.hero, { position: 'absolute', left: Math.round(W * 0.28), top: 0, width: Math.round(W * 0.72), height: H, objectFit: 'cover' }) : abs(0, 0, W, H, { backgroundImage: 'radial-gradient(ellipse 70% 60% at 75% 40%, #3a0b08 0%, #0B0B0D 70%)' }),
    // the page's moody grade: darker, a little red
    abs(0, 0, W, H, { backgroundColor: 'rgba(20,6,6,0.42)' }),
    abs(0, 0, W, H, { backgroundImage: `linear-gradient(90deg, ${BG} 0%, rgba(11,11,13,0.92) 30%, rgba(11,11,13,0.35) 52%, rgba(11,11,13,0.05) 75%)` }),
    abs(0, 0, W, H, { backgroundImage: 'linear-gradient(180deg, rgba(11,11,13,0.55) 0%, rgba(11,11,13,0) 22%, rgba(11,11,13,0) 70%, rgba(11,11,13,0.85) 100%)' }),
    // a red panel down the left like the page's
    abs(0, 0, Math.round(W * 0.36), Math.round(H * 0.42), { backgroundImage: 'linear-gradient(180deg, rgba(150,14,10,0.85) 0%, rgba(90,6,4,0.55) 60%, rgba(11,11,13,0) 100%)' }),
    corner(P * 0.4, P * 0.4), corner(W - P * 0.4 - 18, P * 0.4), corner(P * 0.4, H - P * 0.4 - 18), corner(W - P * 0.4 - 18, H - P * 0.4 - 18),
    abs(P, Math.round(H * 0.05), Math.round(190 * q), Math.round(190 * q), {}, crestOf(brand, assets)),
    abs(W - P - 60, Math.round(H * 0.05), 60, 80, { flexDirection: 'column', alignItems: 'flex-end' }, text(String(new Date(s.date || Date.now()).getUTCFullYear()).slice(2), { ...font('oswald'), fontSize: Math.round(22 * q), color: 'rgba(255,255,255,0.7)', letterSpacing: 4 }), text(String(new Date(s.date || Date.now()).getUTCFullYear() + 1).slice(2), { ...font('oswald'), fontSize: Math.round(22 * q), color: 'rgba(255,255,255,0.7)', letterSpacing: 4, marginTop: 8 })),
    // MATCH + DAY
    abs(P, top, W, mH, { alignItems: 'flex-start' }, m.node, solid('DAY', 'anton', m.size, RED, { shadow: true, stretch: 1.55, lineHeight: 0.9 })),
    abs(P, top + mH + Math.round(22 * q), textW, Math.round(60 * q), { alignItems: 'baseline' },
      solid(lineA, 'oswald', Math.round(40 * q), RED, { style: { letterSpacing: 2 } }),
      lineB.length ? solid(` ${lineB.join(' ')}`, 'oswald', Math.round(40 * q), CREAM, { style: { letterSpacing: 2, marginLeft: 10 } }) : null),
    abs(P, top + mH + Math.round(110 * q), Math.round(W * 0.6), Math.round(H * 0.22), { flexDirection: 'column' },
      solid(String(home.name || '').toUpperCase(), 'oswald', nameSize, usHome ? RED : BLUE, { style: { letterSpacing: 1 } }),
      text('v', { ...font('oswald'), fontSize: Math.round(26 * q), color: 'rgba(255,255,255,0.75)', margin: `${Math.round(4 * q)}px 0` }),
      solid(String(away.name || '').toUpperCase(), 'oswald', nameSize, usHome ? BLUE : RED, { style: { letterSpacing: 1 } }),
      date ? text(date, { ...font('oswald'), fontSize: Math.round(28 * q), color: '#fff', letterSpacing: 3, marginTop: Math.round(26 * q) }) : null,
      s.venue?.name ? text(String(s.venue.name).toUpperCase(), { ...font('oswald'), fontSize: Math.round(20 * q), color: 'rgba(255,255,255,0.55)', letterSpacing: 4, marginTop: Math.round(6 * q) }) : null,
    ),
    abs(P, H - Math.round(70 * q), W - 2 * P, Math.round(30 * q), { justifyContent: 'space-between', alignItems: 'center' },
      text(String(s.league?.name || '').toUpperCase(), { ...font('oswald'), fontSize: Math.round(18 * q), color: 'rgba(255,255,255,0.55)', letterSpacing: 5 }),
      text(brand?.handle || '@musc_reddevils', { ...font('oswald'), fontSize: Math.round(20 * q), color: RED, letterSpacing: 1 })),
  );
}

// ---------------------------------------------------------------- FULL TIME
export function fullTime(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const q = k(H);
  const { brand, story: s = {}, assets = {} } = pack;
  const P = Math.round(60 * q);
  const home = s.home || {};
  const away = s.away || {};
  const live = s.status?.state === 'in';
  const goals = (s.events || []).filter((e) => /goal/i.test(e.type) && e.player);
  const side = (t) => goals.filter((g) => [t.abbr, t.name, t.short].filter(Boolean).some((n) => String(g.team || '').toUpperCase() === String(n).toUpperCase())).map((g) => `${short(g.player).toUpperCase()} ${g.minute}`);
  const us = isUs(brand, home) ? home : isUs(brand, away) ? away : null;
  const them = us === home ? away : home;
  const won = us && Number(us.score) > Number(them.score);
  const drew = us && Number(us.score) === Number(them.score);
  const result = live ? 'LIVE' : !us ? 'FULL TIME' : won ? `${String(s.league?.name || '').toUpperCase()} WIN` : drew ? 'POINTS SHARED' : 'A NIGHT TO FORGET';
  const head = fill(live ? 'HALF TIME' : 'FULL TIME', 'anton', W * 0.62, '#F4F1EC', { stretch: 1.35, max: Math.round(210 * q) });
  const headH = Math.round(head.size * 0.9 * 1.35);
  const nameSize = Math.round(46 * q);
  const scoreSize = Math.round(118 * q);
  const crestS = Math.round(230 * q);
  const rowY = Math.round(H * 0.72);
  const sc = (t) => h('div', { flexDirection: 'column', alignItems: t === home ? 'flex-end' : 'flex-start', width: Math.round(W * 0.33) },
    solid(String(t.name || '').toUpperCase(), 'oswald', Math.min(nameSize, fitSize(String(t.name || '').toUpperCase(), 'oswald', W * 0.33)), '#fff', { shadow: true }),
    h('div', { flexDirection: 'column', alignItems: t === home ? 'flex-end' : 'flex-start', marginTop: Math.round(8 * q) }, side(t).slice(0, 4).map((g) => text(g, { ...font('oswald'), fontSize: Math.round(19 * q), color: 'rgba(255,255,255,0.85)', letterSpacing: 1, lineHeight: 1.25 }))));
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: BG },
    assets.hero ? img(assets.hero, { position: 'absolute', left: 0, top: 0, width: W, height: H, objectFit: 'cover', objectPosition: 'center 30%' }) : abs(0, 0, W, H, { backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, #5a0d08 0%, #0B0B0D 75%)' }),
    abs(0, 0, W, H, { backgroundImage: 'linear-gradient(180deg, rgba(11,11,13,0.75) 0%, rgba(11,11,13,0.1) 22%, rgba(11,11,13,0) 45%, rgba(11,11,13,0.55) 62%, rgba(11,11,13,0.92) 80%, rgba(11,11,13,0.97) 100%)' }),
    abs(0, Math.round(H * 0.035), W, headH, { justifyContent: 'center' }, head.node),
    abs(P, rowY - crestS - Math.round(20 * q), crestS, crestS, {}, crestOf(brand, assets)),
    abs(0, rowY, W, Math.round(H * 0.18), { justifyContent: 'center', alignItems: 'flex-start' },
      sc(home),
      h('div', { margin: `${Math.round(-18 * q)}px ${Math.round(26 * q)}px 0` }, solid(`${home.score ?? ''}–${away.score ?? ''}`, 'anton', scoreSize, '#fff', { shadow: true, stretch: 1.15, lineHeight: 0.9 })),
      sc(away)),
    abs(0, H - Math.round(118 * q), W, Math.round(40 * q), { justifyContent: 'center' }, text(result, { ...font('oswald'), fontSize: Math.round(26 * q), color: 'rgba(255,255,255,0.8)', letterSpacing: 9 })),
    abs(0, H - Math.round(64 * q), W, Math.round(30 * q), { justifyContent: 'center' }, text(brand?.handle?.toUpperCase() || '@MUSC_REDDEVILS', { ...font('oswald'), fontSize: Math.round(20 * q), color: RED, letterSpacing: 2 })),
  );
}

// ---------------------------------------------------------------- CONFIRMED XI
// ESPN positions → a depth (back to front) and a side (left to right) on the pitch.
const DEPTH = (pos) => {
  const p = String(pos || '').toUpperCase();
  if (p === 'G' || p === 'GK') return 0;
  if (/WB/.test(p)) return 1.5;
  if (/^(LB|RB|CD|CB|SW)/.test(p)) return 1;
  if (/^DM/.test(p)) return 2;
  if (/^AM/.test(p) || /^(LW|RW)$/.test(p)) return 4;
  if (/^(F|CF|ST|S)/.test(p)) return 5;
  return 3;
};
const SIDE = (pos) => {
  const p = String(pos || '').toUpperCase();
  if (/-L$/.test(p)) return -1;
  if (/-R$/.test(p)) return 1;
  if (/^L/.test(p)) return -2;
  if (/^R/.test(p)) return 2;
  return 0;
};

// Rows for a formation ("4-2-3-1") from the starters: goalkeeper first, then each line.
export function xiRows(xi) {
  const players = (xi?.players || []).slice(0, 11);
  const gk = players.filter((p) => DEPTH(p.pos) === 0);
  const out = players.filter((p) => !gk.includes(p)).sort((a, b) => DEPTH(a.pos) - DEPTH(b.pos) || (a.place || 0) - (b.place || 0));
  let shape = String(xi?.formation || '').split('-').map(Number).filter((n) => n > 0);
  if (shape.reduce((a, b) => a + b, 0) !== out.length) shape = [4, 3, 3].reduce((a, b) => a + b, 0) === out.length ? [4, 3, 3] : [out.length];
  const rows = [gk.slice(0, 1)];
  let i = 0;
  for (const n of shape) {
    rows.push(out.slice(i, i + n).sort((a, b) => SIDE(a.pos) - SIDE(b.pos) || (a.place || 0) - (b.place || 0)));
    i += n;
  }
  return rows;
}

// a red United shirt (SVG) with the number set in the poster's own type
const SHIRT = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 92"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8352A"/><stop offset="1" stop-color="#A3140C"/></linearGradient></defs><path d="M30 4 L42 0 Q50 8 58 0 L70 4 L98 20 L88 40 L76 34 L76 92 L24 92 L24 34 L12 40 L2 20 Z" fill="url(#g)" stroke="#5c0a05" stroke-width="2"/><path d="M42 0 Q50 10 58 0" fill="none" stroke="#fff" stroke-width="3"/><path d="M24 34 L24 92 L30 92 L30 30 Z M76 34 L76 92 L70 92 L70 30 Z" fill="rgba(0,0,0,0.18)"/></svg>').toString('base64')}`;
const shirt = (num, w) =>
  h('div', { width: w, height: Math.round(w * 0.92), position: 'relative', justifyContent: 'center' },
    img(SHIRT, { position: 'absolute', left: 0, top: 0, width: w, height: Math.round(w * 0.92) }),
    text(String(num || '').replace(/[^0-9]/g, '').slice(0, 2), { ...font('anton'), fontSize: Math.round(w * 0.4), color: '#fff', marginTop: Math.round(w * 0.3), textShadow: '0 2px 4px rgba(0,0,0,0.5)' }));

export function confirmedXI(pack, size = 'tall') {
  const [W, H] = SIZES[size];
  const q = k(H);
  const { brand, story: s = {}, assets = {} } = pack;
  const xis = s.details?.xi || [];
  const xi = xis.find((x) => brand?.team?.aliases?.test(x.team || '')) || xis[0] || { players: [] };
  const confirmed = !!xi.players?.length;
  const rows = xiRows(xi);
  const us = isUs(brand, s.home) ? s.home : s.away || {};
  const them = us === s.home ? s.away || {} : s.home || {};
  const P = Math.round(56 * q);
  const pitchTop = Math.round(H * 0.17);
  const pitchH = Math.round(H * 0.76);
  const shirtW = Math.round(124 * q);
  const plate = (p) => h('div', { flexDirection: 'column', alignItems: 'center', width: Math.round(W * 0.2) },
    shirt(p.number, shirtW),
    h('div', { marginTop: Math.round(-4 * q), padding: `${Math.round(4 * q)}px ${Math.round(10 * q)}px`, backgroundColor: 'rgba(8,8,10,0.9)', borderTop: `2px solid ${RED}` },
      text(String(p.name || '').toUpperCase().replace(/^(\S)\S*\s+(?=\S{3,})/, (m, a) => (String(p.name).length > 16 ? `${a}. ` : m)), { ...font('oswald'), fontSize: Math.round(21 * q), color: '#fff', letterSpacing: 1, whiteSpace: 'nowrap' })));
  // front line at the top of the pitch, the keeper at the bottom
  const lines = [...rows].reverse();
  const head = solid('CONFIRMED', 'anton', Math.round(108 * q), '#F4F1EC', { shadow: true, stretch: 1.12, lineHeight: 0.9, style: { transform: 'skewX(-8deg)' } });
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: BG },
    abs(0, 0, W, H, { backgroundImage: 'radial-gradient(ellipse 90% 55% at 50% 0%, #4a0c08 0%, #0B0B0D 70%)' }),
    // the pitch: a dark trapezoid with white lines
    img(`data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none"><defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15161a"/><stop offset="1" stop-color="#22232a"/></linearGradient></defs><path d="M140 0 L860 0 L1000 1000 L0 1000 Z" fill="url(#p)"/><g fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="3"><path d="M140 0 L860 0 L1000 1000 L0 1000 Z"/><path d="M330 0 L345 150 L655 150 L670 0"/><path d="M60 560 L940 560"/><ellipse cx="500" cy="560" rx="120" ry="95"/><path d="M270 1000 L290 830 L710 830 L730 1000"/></g></svg>`).toString('base64')}`, { position: 'absolute', left: P, top: pitchTop, width: W - 2 * P, height: pitchH }),
    // header: crests, CONFIRMED XI, vs and formation
    abs(P, Math.round(H * 0.03), W - 2 * P, Math.round(H * 0.12), { alignItems: 'center', justifyContent: 'space-between' },
      h('div', { alignItems: 'center' },
        crest(us.logo && assets.homeLogo && us === s.home ? assets.homeLogo : assets.awayLogo && us === s.away ? assets.awayLogo : null, Math.round(104 * q), us.abbr),
        text('vs', { ...font('oswald'), fontSize: Math.round(20 * q), color: 'rgba(255,255,255,0.6)', margin: `0 ${Math.round(12 * q)}px` }),
        crest(us === s.home ? assets.awayLogo : assets.homeLogo, Math.round(104 * q), them.abbr)),
      h('div', { flexDirection: 'column', alignItems: 'flex-end' },
        h('div', { alignItems: 'flex-end' }, head, solid(' XI', 'anton', Math.round(108 * q), RED, { shadow: true, stretch: 1.12, lineHeight: 0.9, style: { transform: 'skewX(-8deg)', marginLeft: Math.round(16 * q) } })),
        h('div', { alignItems: 'center', marginTop: Math.round(8 * q) },
          text(`vs ${them.name || ''}`, { ...font('mont'), fontSize: Math.round(22 * q), color: 'rgba(255,255,255,0.8)' }),
          xi.formation ? text(`|  ${xi.formation}  |`, { ...font('oswald'), fontSize: Math.round(22 * q), color: RED, marginLeft: Math.round(18 * q), letterSpacing: 2 }) : null))),
    confirmed
      ? abs(P, pitchTop + Math.round(20 * q), W - 2 * P, pitchH - Math.round(30 * q), { flexDirection: 'column', justifyContent: 'space-between' },
          lines.map((row) => h('div', { justifyContent: 'space-around', width: W - 2 * P }, row.map(plate))))
      : abs(P, pitchTop + pitchH / 2 - 40, W - 2 * P, 80, { justifyContent: 'center', alignItems: 'center' }, text('LINE-UP AN HOUR BEFORE KICK-OFF', { ...font('oswald'), fontSize: Math.round(30 * q), color: 'rgba(255,255,255,0.7)', letterSpacing: 4 })),
    abs(P, H - Math.round(190 * q), Math.round(150 * q), Math.round(150 * q), {}, crestOf(brand, assets)),
    abs(0, H - Math.round(48 * q), W, Math.round(30 * q), { justifyContent: 'center' }, text('@MUSC_REDDEVILS', { ...font('oswald'), fontSize: Math.round(18 * q), color: 'rgba(255,255,255,0.6)', letterSpacing: 3 })),
  );
}

export const MUSC_MATCH_TEMPLATES = { 'musc-matchday-poster': matchdayPoster, 'musc-fulltime': fullTime, 'musc-xi': confirmedXI };
