// Poster templates as satori element trees (React-like objects, no React needed).
// Every container with more than one child must be display:flex (satori rule).
// The look follows the pages' own grids: a photo, stacked type with a metallic word,
// the event and the number under it, a tricolour, a medal, the badge.
const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false) } });
const text = (s, style) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: String(s) } });
const img = (src, style) => ({ type: 'img', props: { src, style } });

export const SIZES = { post: [1080, 1350], story: [1080, 1920], square: [1080, 1080] };

const F = { serif: 'Playfair Display', bodoni: 'Bodoni Moda', serifAlt: 'Abril Fatface', sans: 'Barlow', cond: 'Barlow Condensed', bebas: 'Bebas Neue', inter: 'Inter', anton: 'Anton', oswald: 'Oswald' };
const METAL = { gold: ['#FFE9A8', '#C9971C'], silver: ['#FFFFFF', '#8E8E94'], bronze: ['#F0B27A', '#8C4A1E'], red: ['#FF5A4F', '#B3120C'], none: null };
// Five stops read as polished metal; two read as a web gradient.
const STOPS = {
  gold: ['#FFF7D6', '#F6DA86', '#C4931A', '#F9E7A9', '#8F6204'],
  silver: ['#FFFFFF', '#ECEDF1', '#9496A0', '#F4F4F6', '#66686F'],
  bronze: ['#FFE0BC', '#E8AE70', '#9A5A21', '#F3BE8B', '#653511'],
  red: ['#FF9A92', '#FF5247', '#B3120C', '#FF6E63', '#7A0A05'],
};
const metalFill = (metal) => `linear-gradient(180deg, ${STOPS[metal].map((c, i, a) => `${c} ${Math.round((i / (a.length - 1)) * 100)}%`).join(', ')})`;
const SAFFRON = '#FF9933';
const GREEN = '#138808';
const NAVY = '#0B1F6B';

// Headline size from length so three lines always fit.
const fit = (s, base) => {
  const n = s.length;
  return n <= 12 ? base : n <= 18 ? base * 0.84 : n <= 26 ? base * 0.68 : n <= 36 ? base * 0.56 : n <= 60 ? base * 0.46 : base * 0.36;
};
// Width of capitals per em, per font, to size one word to a measure.
const CAPS = { [F.bodoni]: 0.7, [F.serif]: 0.72, [F.anton]: 0.44, [F.oswald]: 0.52, [F.bebas]: 0.42 };
const sizeFor = (s, font, maxW, cap, min = 56) => Math.max(min, Math.min(cap, Math.floor(maxW / (Math.max(1, s.length) * (CAPS[font] || 0.62)))));

const eyebrow = (s, color, size = 26, font = F.inter) => text(s, { fontFamily: font, fontWeight: font === F.oswald ? 700 : 600, fontSize: size, letterSpacing: size * 0.22, textTransform: 'uppercase', color });

// One word with depth: a dark copy sits just under the real one.
function deepWord(word, { font, size, weight = 900, metal = null, color = '#fff', lineHeight = 0.95, shadow = true, letterSpacing }) {
  const base = { fontFamily: font, fontWeight: weight, fontSize: size, lineHeight, letterSpacing: letterSpacing ?? -size * 0.012 };
  if (shadow) base.textShadow = `0 ${Math.max(3, Math.round(size * 0.05))}px ${Math.max(8, Math.round(size * 0.16))}px rgba(0,0,0,0.6)`;
  return STOPS[metal] ? text(word, { ...base, backgroundImage: metalFill(metal), backgroundClip: 'text', color: 'transparent' }) : text(word, { ...base, color });
}

// Headline as wrapped words so some can carry a metallic gradient.
function headlineWords(headline, { font, size, color, accent, accentWords = [], lineHeight = 0.98, align = 'flex-start', weight = 900, shadow = false }) {
  const words = headline.split(/\s+/).filter(Boolean);
  return h(
    'div',
    { flexWrap: 'wrap', justifyContent: align, alignItems: 'baseline' },
    words.map((w, i) => {
      const key = w.toLowerCase().replace(/[.,!?]/g, '');
      const hot = STOPS[accent] && accentWords.includes(key);
      return h('div', { marginRight: i < words.length - 1 ? size * 0.24 : 0 }, deepWord(w, { font, size, weight, metal: hot ? accent : null, color, lineHeight, shadow }));
    }),
  );
}

// "PARUL CHAUDHARY BRONZE." → top "PARUL CHAUDHARY", big "BRONZE." when the last word is the accent.
export function splitTiers(words, type) {
  const parts = (words.headline || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 5) return null;
  const last = parts[parts.length - 1];
  const key = last.toLowerCase().replace(/[.,!?’']/g, '');
  const metal = words.accent && STOPS[words.accent] ? words.accent : null;
  if (!metal || !(words.accentWords || []).includes(key) || !['medal', 'stage', 'milestone', 'breaking'].includes(type)) return null;
  if (!/^[A-Z0-9'’.,!?-]+$/.test(last)) return null;
  return { top: parts.slice(0, -1).join(' '), big: last, metal };
}

// Round badge: brand PNG if the owner uploaded one, otherwise a vector stand-in.
function badge(brand, size, assets) {
  if (assets?.badge) return h('div', { width: size, height: size, borderRadius: size / 2, border: `${Math.max(2, Math.round(size * 0.02))}px solid rgba(0,0,0,0.14)`, backgroundColor: '#fff', overflow: 'hidden' }, img(assets.badge, { width: size, height: size, objectFit: 'cover' }));
  const lines = brand.id === 'musc' ? ['MUSC', 'RED DEVILS'] : ['SPORTS', 'BINGE'];
  return h(
    'div',
    { width: size, height: size, borderRadius: size / 2, backgroundColor: brand.id === 'musc' ? '#0B0B0D' : '#D7191C', border: `${Math.round(size * 0.05)}px solid ${brand.id === 'musc' ? '#DA291C' : '#FFFFFF'}`, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    lines.map((l, i) => text(l, { fontFamily: F.bebas, fontSize: size * (i === 0 ? 0.3 : 0.17), lineHeight: 1, color: '#fff', letterSpacing: 2 })),
  );
}

function crest(src, size, fallback) {
  if (src) return img(src, { width: size, height: size, objectFit: 'contain' });
  return h('div', { width: size, height: size, borderRadius: size * 0.18, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' }, text(fallback, { fontFamily: F.bebas, fontSize: size * 0.34, color: '#444' }));
}

// The Indian flag, drawn, for when no flag picture could be fetched.
const tricolourFlag = (w) =>
  h(
    'div',
    { width: w, height: Math.round(w * 0.67), flexDirection: 'column', borderRadius: Math.round(w * 0.08), overflow: 'hidden', border: '1px solid rgba(0,0,0,0.2)' },
    h('div', { height: Math.round(w * 0.67) / 3, backgroundColor: SAFFRON }),
    h('div', { height: Math.round(w * 0.67) / 3, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, h('div', { width: Math.round(w * 0.16), height: Math.round(w * 0.16), borderRadius: w, border: `${Math.max(2, Math.round(w * 0.03))}px solid ${NAVY}` })),
    h('div', { height: Math.round(w * 0.67) / 3, backgroundColor: GREEN }),
  );
const flag = (src, w, fallback, nation) => (src ? img(src, { width: w, height: Math.round(w * 0.67), objectFit: 'cover', borderRadius: Math.round(w * 0.08), border: '1px solid rgba(0,0,0,0.25)' }) : /^india$/i.test(nation || '') ? tricolourFlag(w) : crest(null, w, fallback));

// Saffron · white · green along the bottom edge.
const tricolourStrip = (W, hgt = 14) => h('div', { position: 'absolute', left: 0, bottom: 0, width: W, height: hgt, flexDirection: 'column' }, h('div', { height: Math.round(hgt * 0.36), backgroundColor: SAFFRON }), h('div', { height: hgt - 2 * Math.round(hgt * 0.36), backgroundColor: '#fff' }), h('div', { height: Math.round(hgt * 0.36), backgroundColor: GREEN }));

// A medal: ribbon, disc, inner ring.
function medalCoin(metal, size) {
  return h(
    'div',
    { flexDirection: 'column', alignItems: 'center' },
    h('div', { width: Math.round(size * 0.3), height: Math.round(size * 0.34), backgroundImage: `linear-gradient(90deg, ${NAVY} 0%, #1E3A9A 50%, ${NAVY} 100%)`, borderRadius: 3, marginBottom: -Math.round(size * 0.1) }),
    h('div', { width: size, height: size, borderRadius: size, backgroundImage: metalFill(metal), border: '2px solid rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }, h('div', { width: Math.round(size * 0.72), height: Math.round(size * 0.72), borderRadius: size, border: `${Math.max(2, Math.round(size * 0.035))}px solid rgba(0,0,0,0.22)` })),
  );
}

// ---------------------------------------------------------------- TSB cream
export function tsbCream(pack, size = 'post') {
  const [W, H] = SIZES[size];
  const { brand, words, story: s, assets = {} } = pack;
  const P = 72;
  const ink = '#121212';
  const isMatch = s.kind !== 'news';
  const pre = s.status?.state === 'pre';
  const scoreOf = (t) => (pre ? '' : t?.score ?? '');
  const hs = String(scoreOf(s.home));
  const as = String(scoreOf(s.away));
  const longScore = hs.length + as.length > 7;
  const goals = (s.events || []).filter((e) => /goal|try|touchdown/i.test(e.type) && e.player).slice(0, 8);
  const side = (abbr) => goals.filter((g) => (g.team || '').toUpperCase() === (abbr || '').toUpperCase());
  const scorerCol = (list, align) => h('div', { flexDirection: 'column', alignItems: align, width: (W - P * 2) / 2 - 20 }, list.map((g) => text(`${g.player.replace(/\s*\(.*\)/, '')} ${g.minute}`.trim(), { fontFamily: F.sans, fontWeight: 500, fontSize: 26, color: '#444', marginTop: 6 })));
  const teamFlag = (t, src, flg) => flag(flg || src, 190, t?.abbr || '?', t?.name);
  return h(
    'div',
    { width: W, height: H, backgroundColor: '#F3EEE5', flexDirection: 'column', padding: P, fontFamily: F.sans, color: ink },
    h('div', { justifyContent: 'space-between', alignItems: 'center' }, badge(brand, 150, assets), h('div', { flexDirection: 'column', alignItems: 'flex-end', maxWidth: W - P * 2 - 180 }, eyebrow(words.eyebrow, '#444', 24))),
    h('div', { height: 3, backgroundColor: ink, marginTop: 36, marginBottom: 44 }),
    headlineWords(words.headline, { font: F.serif, size: fit(words.headline, size === 'story' ? 200 : 176), color: ink, accent: 'none' }),
    h('div', { flexGrow: 1 }),
    isMatch && longScore
      ? h(
          'div',
          { flexDirection: 'column' },
          eyebrow(s.status?.state === 'in' ? 'LIVE' : 'FULL TIME', '#D7191C', 24),
          // Cricket-length scores: one row per team, flag · name · score.
          [s.home, s.away].map((t, i) =>
            h(
              'div',
              { alignItems: 'center', marginTop: i === 0 ? 24 : 18 },
              flag(i === 0 ? assets.homeFlag || assets.homeLogo : assets.awayFlag || assets.awayLogo, 110, t?.abbr || '?', t?.name),
              text((t?.name || '').toUpperCase(), { fontFamily: F.inter, fontWeight: 600, fontSize: 30, letterSpacing: 4, marginLeft: 26, width: 360 }),
              text(String(t?.score ?? ''), { fontFamily: F.serif, fontSize: 64, color: ink, marginLeft: 'auto', lineHeight: 1 }),
            ),
          ),
        )
      : isMatch
      ? h(
          'div',
          { flexDirection: 'column' },
          eyebrow(pre ? 'KICK-OFF' : s.status?.state === 'in' ? 'LIVE' : 'FULL TIME', '#D7191C', 24),
          h(
            'div',
            { alignItems: 'center', justifyContent: 'space-between', marginTop: 28 },
            h('div', { flexDirection: 'column', alignItems: 'center', width: 230 }, teamFlag(s.home, assets.homeLogo, assets.homeFlag), text((s.home?.abbr || s.home?.short || '').toUpperCase(), { fontFamily: F.inter, fontWeight: 600, fontSize: 26, letterSpacing: 5, marginTop: 18 })),
            h('div', { flexDirection: 'column', alignItems: 'center', flexGrow: 1 }, pre ? text('VS', { fontFamily: F.serif, fontSize: 150, color: ink }) : text(`${hs}–${as}`, { fontFamily: F.serif, fontSize: longScore ? 70 : 190, color: ink, lineHeight: 1, textAlign: 'center' })),
            h('div', { flexDirection: 'column', alignItems: 'center', width: 230 }, teamFlag(s.away, assets.awayLogo, assets.awayFlag), text((s.away?.abbr || s.away?.short || '').toUpperCase(), { fontFamily: F.inter, fontWeight: 600, fontSize: 26, letterSpacing: 5, marginTop: 18 })),
          ),
          goals.length ? h('div', { justifyContent: 'space-between', marginTop: 22 }, scorerCol(side(s.home?.abbr), 'flex-start'), scorerCol(side(s.away?.abbr), 'flex-end')) : null,
        )
      : null,
    text(words.explainer, { fontFamily: F.sans, fontWeight: 500, fontSize: 32, lineHeight: 1.35, color: '#2b2b2b', marginTop: 40 }),
    h('div', { height: 3, backgroundColor: ink, marginTop: 36 }),
    h('div', { justifyContent: 'space-between', marginTop: 22 }, eyebrow('THE SPORTS BINGE', '#444', 22), eyebrow(brand.handle, '#444', 22)),
  );
}

// ---------------------------------------------------------------- TSB dark
// Photo full-bleed, name line, stacked headline with the metal word huge, the athlete
// cut out in front of it, then kicker · stats · explainer, tricolour along the bottom.
export function tsbDark(pack, size = 'post') {
  const [W, H] = SIZES[size];
  const { brand, words, story: s, assets = {}, type } = pack;
  const P = 64;
  const maxW = W - P * 2;
  const accent = words.accent && STOPS[words.accent] ? words.accent : 'gold';
  const india = /^india$/i.test(words.country || assets.country || '');
  const stats = (words.stats || []).slice(0, 3);
  const isMatch = s.kind !== 'news';
  const quote = type === 'quote';
  const strip = india ? 14 : 0;
  const cut = assets.cutout;
  const cutH = Math.round(H * (size === 'story' ? 0.48 : size === 'square' ? 0.58 : 0.56));
  const cutW = Math.min(Math.round(W * 0.52), Math.round(cutH * (assets.cutoutAspect || 0.72)));
  const cutLeft = W - Math.round(P * 0.35) - cutW;
  // Words keep the left; the big word may run a little way behind the athlete.
  const textMax = cut ? Math.max(Math.round(W * 0.48), cutLeft + Math.round(cutW * 0.2) - P) : maxW;
  const tiers = quote ? null : splitTiers(words, type);
  // Space the bottom layer needs, so the headline sits just above it.
  const explainerLines = words.explainer ? Math.min(3, Math.ceil((words.explainer.length * 13.5) / textMax)) : 0;
  const kickerMax = (cut ? cutLeft + Math.round(cutW * 0.2) - P : maxW) - 40;
  const kickerLines = words.kicker ? Math.min(3, Math.ceil((words.kicker.length * 17) / kickerMax)) : 0;
  const bottomH = strip + 36 + 52 + (kickerLines ? kickerLines * 34 + 30 : 0) + (stats.length ? 128 : 0) + (explainerLines ? explainerLines * 37 + 16 : 0);
  const [lockA, lockB = ''] = (words.eyebrow || '').split(' · ');
  const nameLine = words.name
    ? h('div', { flexDirection: 'column', marginBottom: 18 }, h('div', { width: 54, height: 5, backgroundImage: metalFill(accent), marginBottom: 14 }), text(words.name, { fontFamily: F.oswald, fontWeight: 700, fontSize: 30, lineHeight: 1.3, letterSpacing: 7, color: 'rgba(255,255,255,0.9)', maxWidth: textMax }))
    : null;
  let headline;
  if (tiers) {
    const bigSize = sizeFor(tiers.big, F.bodoni, textMax, size === 'story' ? 300 : size === 'square' ? 230 : 262, 90);
    const topFont = F.serif;
    const topSize = Math.min(Math.round(bigSize * (tiers.top.split(' ').length >= 2 ? 0.46 : 0.62)), sizeFor(tiers.top, topFont, textMax, 150, 44));
    headline = h('div', { flexDirection: 'column' }, deepWord(tiers.top, { font: topFont, size: topSize, lineHeight: 1 }), h('div', { marginTop: Math.round(bigSize * 0.02) }, deepWord(tiers.big, { font: F.bodoni, size: bigSize, metal: tiers.metal, lineHeight: 0.9 })));
  } else if (quote) {
    headline = h('div', { width: textMax }, headlineWords(words.headline, { font: F.serif, weight: 700, size: fit(words.headline, (size === 'story' ? 150 : 128) * (cut ? 0.8 : 1)), color: '#fff', accent: 'none', lineHeight: 1.08, shadow: true }));
  } else {
    headline = h('div', { width: textMax }, headlineWords(words.headline, { font: F.serif, size: fit(words.headline, (size === 'story' ? 220 : 186) * (cut ? 0.78 : 1)), color: '#fff', accent, accentWords: words.accentWords, shadow: true }));
  }
  const bg = assets.hero
    ? img(assets.hero, { position: 'absolute', left: 0, top: 0, width: W, height: H, objectFit: 'cover' })
    : h('div', { position: 'absolute', left: 0, top: 0, width: W, height: H, backgroundImage: 'linear-gradient(160deg, #0c0c13 0%, #19131f 48%, #060608 100%)' });
  return h(
    'div',
    { width: W, height: H, position: 'relative', backgroundColor: '#0a0a0e', fontFamily: F.sans, color: '#fff' },
    bg,
    assets.hero ? null : h('div', { position: 'absolute', left: W * 0.28, top: H * 0.08, width: W, height: W, borderRadius: W, backgroundImage: `radial-gradient(circle, ${METAL[accent][1]}66 0%, rgba(0,0,0,0) 60%)` }),
    h('div', { position: 'absolute', left: 0, top: 0, width: W, height: H, backgroundImage: assets.hero ? 'linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.08) 28%, rgba(0,0,0,0.3) 52%, rgba(0,0,0,0.95) 100%)' : 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)' }),
    cut && assets.hero ? h('div', { position: 'absolute', left: 0, top: 0, width: W, height: H, backgroundColor: 'rgba(0,0,0,0.3)' }) : null,
    // Headline layer (the cut-out stands in front of it).
    h(
      'div',
      { position: 'absolute', left: P, bottom: bottomH, width: maxW, flexDirection: 'column' },
      isMatch && !assets.hero ? h('div', { alignItems: 'center', marginBottom: 36 }, flag(assets.homeFlag || assets.homeLogo, 120, s.home?.abbr || '?', s.home?.name), text(`${s.home?.score ?? ''}${s.away?.score !== undefined && s.away?.score !== '' ? '  –  ' + s.away?.score : ''}`, { fontFamily: F.serif, fontSize: 64, color: '#fff', marginLeft: 28, marginRight: 28 }), flag(assets.awayFlag || assets.awayLogo, 120, s.away?.abbr || '?', s.away?.name)) : null,
      nameLine,
      headline,
    ),
    cut ? img(cut, { position: 'absolute', left: cutLeft, bottom: strip, width: cutW, height: cutH, objectFit: 'contain' }) : null,
    // Top bar: badge, competition lockup, flag.
    h(
      'div',
      { position: 'absolute', left: P, top: Math.round(P * 0.85), width: maxW, justifyContent: 'space-between', alignItems: 'flex-start' },
      badge(brand, 104, assets),
      h('div', { flexDirection: 'column', alignItems: 'flex-end', maxWidth: maxW - 130 }, lockA ? eyebrow(lockA, '#fff', 28, F.oswald) : null, lockB ? h('div', { marginTop: 6 }, eyebrow(lockB, 'rgba(255,255,255,0.72)', 19)) : null, assets.flag || india ? h('div', { marginTop: 14 }, flag(assets.flag, 76, '', india ? 'India' : '')) : null),
    ),
    // Bottom layer above the cut-out: kicker, stats, explainer, footer.
    h(
      'div',
      { position: 'absolute', left: P, bottom: strip + 36, width: maxW, flexDirection: 'column' },
      words.kicker ? h('div', { alignItems: 'center', marginBottom: 22 }, h('div', { width: 6, height: 38, backgroundImage: metalFill(accent), marginRight: 16 }), text(words.kicker, { fontFamily: F.oswald, fontWeight: 700, fontSize: 25, lineHeight: 1.3, letterSpacing: 3, color: 'rgba(255,255,255,0.94)', maxWidth: kickerMax })) : null,
      stats.length
        ? h(
            'div',
            { alignItems: 'flex-end', marginBottom: 22 },
            stats.map((st, i) => h('div', { flexDirection: 'column', marginRight: 44, paddingRight: 30, borderRight: i < stats.length - 1 ? '2px solid rgba(255,255,255,0.28)' : 'none' }, text(st.value, { fontFamily: F.serif, fontWeight: 900, fontSize: 66, lineHeight: 1, color: '#fff' }), h('div', { marginTop: 10 }, eyebrow(st.label, 'rgba(255,255,255,0.7)', 19)))),
            type === 'medal' && STOPS[accent] && accent !== 'red' ? h('div', { marginLeft: 'auto' }, medalCoin(accent, 92)) : null,
          )
        : null,
      explainerLines ? text(words.explainer, { fontWeight: 500, fontSize: 27, lineHeight: 1.35, color: 'rgba(255,255,255,0.88)', maxWidth: textMax, marginBottom: 16 }) : null,
      h('div', { justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.22)', paddingTop: 16 }, eyebrow('THE SPORTS BINGE', 'rgba(255,255,255,0.75)', 19), h('div', { flexDirection: 'column', alignItems: 'flex-end' }, eyebrow(brand.handle, 'rgba(255,255,255,0.75)', 19), assets.hero && assets.credit && assets.credit !== 'owner' ? text(`Photo: ${assets.credit}`, { fontFamily: F.sans, fontSize: 16, color: 'rgba(255,255,255,0.45)', marginTop: 6 }) : null)),
    ),
    india ? tricolourStrip(W, strip) : null,
  );
}

// ---------------------------------------------------------------- TSB tally
// Medal counts: giant total, gold/silver/bronze coins, rank. Cream, like the page's.
export function tsbTally(pack, size = 'post') {
  const [W, H] = SIZES[size];
  const { brand, words, assets = {} } = pack;
  const P = 72;
  const ink = '#121212';
  const india = /^india$/i.test(words.country || '') || /india/i.test(words.headline || '');
  const stats = (words.stats || []).slice(0, 4);
  const medals = stats.filter((s) => /^(gold|silver|bronze)$/i.test(s.label));
  const rank = stats.find((s) => /table/i.test(s.label));
  const big = words.big ? String(words.big) : medals.length ? String(medals.reduce((a, s) => a + (Number(s.value) || 0), 0)) : '';
  const coin = (metal, value, label) =>
    h(
      'div',
      { flexDirection: 'column', alignItems: 'center', width: (W - P * 2) / 3 },
      medalCoin(metal, 84),
      text(value, { fontFamily: F.serif, fontSize: 96, lineHeight: 1, color: ink, marginTop: 16 }),
      h('div', { marginTop: 8 }, eyebrow(label, '#555', 22)),
    );
  return h(
    'div',
    { width: W, height: H, backgroundColor: '#F3EEE5', flexDirection: 'column', padding: P, paddingBottom: P + (india ? 14 : 0), fontFamily: F.sans, color: ink, position: 'relative' },
    h('div', { justifyContent: 'space-between', alignItems: 'center' }, badge(brand, 150, assets), h('div', { flexDirection: 'column', alignItems: 'flex-end', maxWidth: W - P * 2 - 180 }, eyebrow(words.eyebrow, '#444', 24), assets.flag || india ? h('div', { marginTop: 12 }, flag(assets.flag, 72, '', india ? 'India' : '')) : null)),
    h('div', { height: 3, backgroundColor: ink, marginTop: 36, marginBottom: 44 }),
    headlineWords(words.headline, { font: F.serif, size: fit(words.headline, size === 'story' ? 120 : 100), color: ink, accent: 'none', align: 'center' }),
    h('div', { flexGrow: 1 }),
    big
      ? h('div', { flexDirection: 'column', alignItems: 'center' }, deepWord(big, { font: F.bodoni, size: size === 'story' ? 360 : 300, color: ink, lineHeight: 0.9, shadow: false }), h('div', { marginTop: 14 }, eyebrow('TOTAL MEDALS', '#444', 26)), rank ? h('div', { marginTop: 10 }, eyebrow(`${rank.value} ${rank.label}`, '#D7191C', 22)) : null)
      : null,
    h('div', { flexGrow: 1 }),
    medals.length ? h('div', { justifyContent: 'space-between', marginTop: 24 }, medals.map((m) => coin(m.label.toLowerCase(), m.value, m.label))) : null,
    words.kicker ? h('div', { justifyContent: 'center', marginTop: 34 }, eyebrow(words.kicker, '#333', 22, F.oswald)) : null,
    text(words.explainer, { fontFamily: F.sans, fontWeight: 500, fontSize: 30, lineHeight: 1.35, color: '#2b2b2b', marginTop: 34 }),
    h('div', { height: 3, backgroundColor: ink, marginTop: 36 }),
    h('div', { justifyContent: 'space-between', marginTop: 22 }, eyebrow('THE SPORTS BINGE', '#444', 22), eyebrow(brand.handle, '#444', 22)),
    india ? tricolourStrip(W, 14) : null,
  );
}

// ---------------------------------------------------------------- MUSC
const RED = '#DA291C';
const muscBg = (W, H) => ({ width: W, height: H, position: 'relative', backgroundImage: 'linear-gradient(135deg, #DA291C 0%, #6B0F0B 42%, #0B0B0D 100%)', fontFamily: F.cond, color: '#fff' });
// Owner's photo under the red: the picture, then the club gradient over it.
const muscPhoto = (assets, W, H) => (assets.hero ? [img(assets.hero, { position: 'absolute', left: 0, top: 0, width: W, height: H, objectFit: 'cover' }), h('div', { position: 'absolute', left: 0, top: 0, width: W, height: H, backgroundImage: 'linear-gradient(180deg, rgba(120,10,6,0.55) 0%, rgba(60,6,4,0.55) 45%, rgba(8,8,10,0.96) 100%)' })] : []);
const muscCutout = (assets, W, H, P) => (assets.cutout ? img(assets.cutout, { position: 'absolute', right: Math.round(P * 0.3), bottom: 0, width: Math.min(Math.round(W * 0.5), Math.round(H * 0.52 * (assets.cutoutAspect || 0.72))), height: Math.round(H * 0.52), objectFit: 'contain' }) : null);

export function muscResult(pack, size = 'post') {
  const [W, H] = SIZES[size];
  const { brand, words, story: s, assets = {} } = pack;
  const P = 72;
  const goals = (s.events || []).filter((e) => /goal/i.test(e.type) && e.player).slice(0, 6);
  const isNews = s.kind === 'news';
  return h(
    'div',
    { ...muscBg(W, H), flexDirection: 'column', padding: P },
    muscPhoto(assets, W, H),
    muscCutout(assets, W, H, P),
    h('div', { justifyContent: 'space-between', alignItems: 'center' }, badge(brand, 140, assets), h('div', { flexDirection: 'column', alignItems: 'flex-end', maxWidth: W - P * 2 - 170 }, eyebrow(words.eyebrow, 'rgba(255,255,255,0.8)', 24))),
    h('div', { flexGrow: 1 }),
    isNews
      ? null
      : h(
          'div',
          { alignItems: 'center', justifyContent: 'space-between' },
          h('div', { flexDirection: 'column', alignItems: 'center', width: 240 }, crest(assets.homeLogo, 200, s.home?.abbr || '?'), text((s.home?.abbr || '').toUpperCase(), { fontFamily: F.bebas, fontSize: 40, letterSpacing: 4, marginTop: 14 })),
          deepWord(`${s.home?.score ?? ''} - ${s.away?.score ?? ''}`, { font: F.bebas, weight: 400, size: 300, lineHeight: 1, letterSpacing: 0 }),
          h('div', { flexDirection: 'column', alignItems: 'center', width: 240 }, crest(assets.awayLogo, 200, s.away?.abbr || '?'), text((s.away?.abbr || '').toUpperCase(), { fontFamily: F.bebas, fontSize: 40, letterSpacing: 4, marginTop: 14 })),
        ),
    isNews || !goals.length ? null : h('div', { flexWrap: 'wrap', justifyContent: assets.cutout ? 'flex-start' : 'center', marginTop: 24, maxWidth: assets.cutout ? W * 0.55 : W - P * 2 }, goals.map((g) => text(`${g.team ? g.team + ' · ' : ''}${g.player.replace(/\s*\(.*\)/, '')} ${g.minute}`, { fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: 'rgba(255,255,255,0.9)', marginRight: 28, marginBottom: 8 }))),
    h('div', { flexGrow: 1 }),
    headlineWords(words.headline, { font: F.bebas, weight: 400, size: fit(words.headline, isNews ? (size === 'story' ? 290 : 250) : size === 'story' ? 250 : 210), color: '#fff', accent: 'red', accentWords: words.accentWords, lineHeight: 0.92, shadow: true }),
    words.kicker ? h('div', { marginTop: 18 }, eyebrow(words.kicker, 'rgba(255,255,255,0.9)', 24, F.oswald)) : null,
    text(words.explainer, { fontFamily: F.sans, fontWeight: 500, fontSize: 32, lineHeight: 1.35, color: 'rgba(255,255,255,0.85)', marginTop: 24, maxWidth: assets.cutout ? W * 0.6 : W - P * 2 }),
    h('div', { justifyContent: 'space-between', marginTop: 36 }, eyebrow(isNews ? 'RED DEVILS NEWS' : s.status?.state === 'in' ? 'LIVE' : 'FULL TIME', RED, 24), eyebrow(brand.handle, 'rgba(255,255,255,0.7)', 22)),
  );
}

export function muscMatchday(pack, size = 'post') {
  const [W, H] = SIZES[size];
  const { brand, words, story: s, assets = {}, when = {} } = pack;
  const P = 72;
  return h(
    'div',
    { ...muscBg(W, H), flexDirection: 'column', padding: P },
    muscPhoto(assets, W, H),
    h('div', { justifyContent: 'space-between', alignItems: 'center' }, badge(brand, 140, assets), h('div', { flexDirection: 'column', alignItems: 'flex-end' }, eyebrow('MATCHDAY', '#fff', 30), h('div', { marginTop: 8 }, eyebrow(words.eyebrow, 'rgba(255,255,255,0.75)', 22)))),
    h('div', { flexGrow: 1 }),
    h(
      'div',
      { alignItems: 'center', justifyContent: 'space-between' },
      h('div', { flexDirection: 'column', alignItems: 'center', width: 300 }, crest(assets.homeLogo, 280, s.home?.abbr || '?'), text((s.home?.name || '').toUpperCase(), { fontFamily: F.bebas, fontSize: 44, letterSpacing: 3, marginTop: 18, textAlign: 'center' })),
      deepWord('VS', { font: F.bebas, weight: 400, size: 240, color: RED, lineHeight: 1, letterSpacing: 0 }),
      h('div', { flexDirection: 'column', alignItems: 'center', width: 300 }, crest(assets.awayLogo, 280, s.away?.abbr || '?'), text((s.away?.name || '').toUpperCase(), { fontFamily: F.bebas, fontSize: 44, letterSpacing: 3, marginTop: 18, textAlign: 'center' })),
    ),
    h('div', { flexGrow: 1 }),
    h('div', { flexDirection: 'column', alignItems: 'center' }, text(when.day || '', { fontFamily: F.bebas, fontSize: 56, letterSpacing: 4, color: 'rgba(255,255,255,0.85)' }), text(when.time || '', { fontFamily: F.bebas, fontSize: 120, lineHeight: 1, color: '#fff' }), s.venue?.name ? eyebrow(s.venue.name, 'rgba(255,255,255,0.7)', 22) : null),
    h('div', { marginTop: 40, backgroundColor: RED, justifyContent: 'center', padding: 18, borderRadius: 8 }, text(brand.broadcastLine, { fontFamily: F.bebas, fontSize: 48, letterSpacing: 4, color: '#fff' })),
  );
}

export const TEMPLATES = { 'tsb-cream': tsbCream, 'tsb-dark': tsbDark, 'tsb-tally': tsbTally, 'musc-result': muscResult, 'musc-matchday': muscMatchday };

// Which template suits a pack.
export function pickTemplate(pack) {
  const { brand, type, story: s } = pack;
  if (brand.id === 'musc') return type === 'preview' ? 'musc-matchday' : 'musc-result';
  if (type === 'tally' && (pack.words?.big || pack.words?.stats?.length)) return 'tsb-tally';
  if (s.kind === 'news' || type === 'medal' || type === 'milestone' || type === 'quote') return 'tsb-dark';
  return 'tsb-cream';
}
