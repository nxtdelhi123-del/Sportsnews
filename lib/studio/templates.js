// Poster templates as satori element trees (React-like objects, no React needed).
// Every container with more than one child must be display:flex (satori rule).
const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter((c) => c !== null && c !== undefined && c !== false) } });
const text = (s, style) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: String(s) } });
const img = (src, style) => ({ type: 'img', props: { src, style } });

export const SIZES = { post: [1080, 1350], story: [1080, 1920], square: [1080, 1080] };

const F = { serif: 'Playfair Display', serifAlt: 'Abril Fatface', sans: 'Barlow', cond: 'Barlow Condensed', bebas: 'Bebas Neue', inter: 'Inter' };
const METAL = { gold: ['#FFE9A8', '#C9971C'], silver: ['#FFFFFF', '#8E8E94'], bronze: ['#F0B27A', '#8C4A1E'], red: ['#FF5A4F', '#B3120C'], none: null };

// Headline size from length so three lines always fit.
const fit = (s, base) => {
  const n = s.length;
  return n <= 12 ? base : n <= 18 ? base * 0.84 : n <= 26 ? base * 0.68 : n <= 36 ? base * 0.56 : base * 0.46;
};

const eyebrow = (s, color, size = 26) => text(s, { fontFamily: F.inter, fontWeight: 600, fontSize: size, letterSpacing: size * 0.22, textTransform: 'uppercase', color });

// Headline as wrapped words so some can carry a metallic gradient.
function headlineWords(headline, { font, size, color, accent, accentWords = [], lineHeight = 0.98, align = 'flex-start' }) {
  const words = headline.split(/\s+/).filter(Boolean);
  const grad = METAL[accent];
  return h(
    'div',
    { flexWrap: 'wrap', justifyContent: align, alignItems: 'baseline' },
    words.map((w, i) => {
      const key = w.toLowerCase().replace(/[.,!?]/g, '');
      const hot = grad && accentWords.includes(key);
      const style = { fontFamily: font, fontSize: size, lineHeight, color, marginRight: i < words.length - 1 ? size * 0.24 : 0 };
      if (hot) Object.assign(style, { backgroundImage: `linear-gradient(180deg, ${grad[0]} 0%, ${grad[1]} 100%)`, backgroundClip: 'text', color: 'transparent' });
      return text(w, style);
    }),
  );
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

const flag = (src, w, fallback) => (src ? img(src, { width: w, height: Math.round(w * 0.68), objectFit: 'cover', borderRadius: 10 }) : crest(null, w, fallback));

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
              flag(i === 0 ? assets.homeLogo : assets.awayLogo, 110, t?.abbr || '?'),
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
            h('div', { flexDirection: 'column', alignItems: 'center', width: 230 }, flag(assets.homeLogo, 190, s.home?.abbr || '?'), text((s.home?.abbr || s.home?.short || '').toUpperCase(), { fontFamily: F.inter, fontWeight: 600, fontSize: 26, letterSpacing: 5, marginTop: 18 })),
            h('div', { flexDirection: 'column', alignItems: 'center', flexGrow: 1 }, pre ? text('VS', { fontFamily: F.serif, fontSize: 150, color: ink }) : text(`${hs}–${as}`, { fontFamily: F.serif, fontSize: longScore ? 70 : 190, color: ink, lineHeight: 1, textAlign: 'center' })),
            h('div', { flexDirection: 'column', alignItems: 'center', width: 230 }, flag(assets.awayLogo, 190, s.away?.abbr || '?'), text((s.away?.abbr || s.away?.short || '').toUpperCase(), { fontFamily: F.inter, fontWeight: 600, fontSize: 26, letterSpacing: 5, marginTop: 18 })),
          ),
        )
      : null,
    text(words.explainer, { fontFamily: F.sans, fontWeight: 500, fontSize: 34, lineHeight: 1.35, color: '#2b2b2b', marginTop: 44 }),
    h('div', { height: 3, backgroundColor: ink, marginTop: 40 }),
    h('div', { justifyContent: 'space-between', marginTop: 22 }, eyebrow('THE SPORTS BINGE', '#444', 22), eyebrow(brand.handle, '#444', 22)),
  );
}

// ---------------------------------------------------------------- TSB dark
export function tsbDark(pack, size = 'post') {
  const [W, H] = SIZES[size];
  const { brand, words, story: s, assets = {} } = pack;
  const P = 72;
  const accent = words.accent && words.accent !== 'none' ? words.accent : 'gold';
  const isMatch = s.kind !== 'news';
  const bg = assets.hero ? { backgroundImage: `url(${assets.hero})`, backgroundSize: `${W}px ${H}px`, backgroundPosition: 'center' } : { backgroundImage: 'linear-gradient(160deg, #0d0d12 0%, #1b1118 55%, #060608 100%)' };
  const stats = (words.stats || []).slice(0, 3);
  return h(
    'div',
    { width: W, height: H, position: 'relative', ...bg, fontFamily: F.sans, color: '#fff' },
    h('div', { position: 'absolute', left: 0, top: 0, width: W, height: H, backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.92) 100%)' }),
    assets.hero ? null : h('div', { position: 'absolute', left: W * 0.35, top: H * 0.15, width: W * 0.9, height: W * 0.9, borderRadius: W, backgroundImage: `radial-gradient(circle, ${METAL[accent][1]}55 0%, rgba(0,0,0,0) 60%)` }),
    assets.cutout && !assets.hero ? img(assets.cutout, { position: 'absolute', right: P * 0.6, top: H * 0.16, width: W * 0.48, height: W * 0.48, objectFit: 'contain' }) : null,
    h(
      'div',
      { position: 'absolute', left: 0, top: 0, width: W, height: H, flexDirection: 'column', padding: P },
      h('div', { justifyContent: 'center' }, eyebrow(words.eyebrow, 'rgba(255,255,255,0.75)', 24)),
      h('div', { flexGrow: 1 }),
      isMatch && !assets.hero
        ? h('div', { alignItems: 'center', marginBottom: 40 }, flag(assets.homeLogo, 120, s.home?.abbr || '?'), text(`${s.home?.score ?? ''}${s.away?.score !== undefined && s.away?.score !== '' ? '  –  ' + s.away?.score : ''}`, { fontFamily: F.serif, fontSize: 64, color: '#fff', marginLeft: 28, marginRight: 28 }), flag(assets.awayLogo, 120, s.away?.abbr || '?'))
        : null,
      words.name ? eyebrow(words.name, 'rgba(255,255,255,0.85)', 28) : null,
      h('div', { marginTop: 18 }, headlineWords(words.headline, { font: F.serif, size: fit(words.headline, size === 'story' ? 230 : 196), color: '#fff', accent, accentWords: words.accentWords })),
      stats.length
        ? h(
            'div',
            { marginTop: 36 },
            stats.map((st, i) => h('div', { flexDirection: 'column', marginRight: 60, paddingRight: 30, borderRight: i < stats.length - 1 ? '2px solid rgba(255,255,255,0.25)' : 'none' }, text(st.value, { fontFamily: F.serif, fontSize: 84, lineHeight: 1, color: '#fff' }), h('div', { marginTop: 10 }, eyebrow(st.label, 'rgba(255,255,255,0.7)', 22)))),
          )
        : null,
      text(words.explainer, { fontWeight: 500, fontSize: 32, lineHeight: 1.35, color: 'rgba(255,255,255,0.88)', marginTop: 34, maxWidth: W - P * 2 }),
      h('div', { justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40 }, badge(brand, 130, assets), h('div', { flexDirection: 'column', alignItems: 'flex-end' }, assets.flag ? img(assets.flag, { width: 96, height: 64, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }) : null, eyebrow(brand.handle, 'rgba(255,255,255,0.7)', 22), assets.hero && assets.credit && assets.credit !== 'owner' ? text(`Photo: ${assets.credit}`, { fontFamily: F.sans, fontSize: 18, color: 'rgba(255,255,255,0.45)', marginTop: 8 }) : null)),
    ),
  );
}

// ---------------------------------------------------------------- TSB tally
// Medal counts: giant total, gold/silver/bronze strip, rank. Cream, like the page's.
export function tsbTally(pack, size = 'post') {
  const [W, H] = SIZES[size];
  const { brand, words, assets = {} } = pack;
  const P = 72;
  const ink = '#121212';
  const stats = (words.stats || []).slice(0, 4);
  const medals = stats.filter((s) => /^(gold|silver|bronze)$/i.test(s.label));
  const rank = stats.find((s) => /table/i.test(s.label));
  const big = words.big ? String(words.big) : medals.length ? String(medals.reduce((a, s) => a + (Number(s.value) || 0), 0)) : '';
  const coin = (metal, value, label) =>
    h(
      'div',
      { flexDirection: 'column', alignItems: 'center', width: (W - P * 2) / 3 },
      h('div', { width: 84, height: 84, borderRadius: 42, backgroundImage: `linear-gradient(160deg, ${METAL[metal][0]} 0%, ${METAL[metal][1]} 100%)`, border: '3px solid rgba(0,0,0,0.12)' }),
      text(value, { fontFamily: F.serif, fontSize: 96, lineHeight: 1, color: ink, marginTop: 16 }),
      h('div', { marginTop: 8 }, eyebrow(label, '#555', 22)),
    );
  return h(
    'div',
    { width: W, height: H, backgroundColor: '#F3EEE5', flexDirection: 'column', padding: P, fontFamily: F.sans, color: ink },
    h('div', { justifyContent: 'space-between', alignItems: 'center' }, badge(brand, 150, assets), h('div', { flexDirection: 'column', alignItems: 'flex-end', maxWidth: W - P * 2 - 180 }, eyebrow(words.eyebrow, '#444', 24))),
    h('div', { height: 3, backgroundColor: ink, marginTop: 36, marginBottom: 44 }),
    headlineWords(words.headline, { font: F.serif, size: fit(words.headline, size === 'story' ? 120 : 100), color: ink, accent: 'none', align: 'center' }),
    h('div', { flexGrow: 1 }),
    big
      ? h('div', { flexDirection: 'column', alignItems: 'center' }, text(big, { fontFamily: F.serif, fontSize: size === 'story' ? 360 : 300, lineHeight: 0.9, color: ink }), h('div', { marginTop: 14 }, eyebrow('TOTAL MEDALS', '#444', 26)), rank ? h('div', { marginTop: 10 }, eyebrow(`${rank.value} ${rank.label}`, '#D7191C', 22)) : null)
      : null,
    h('div', { flexGrow: 1 }),
    medals.length ? h('div', { justifyContent: 'space-between', marginTop: 24 }, medals.map((m) => coin(m.label.toLowerCase(), m.value, m.label))) : null,
    text(words.explainer, { fontFamily: F.sans, fontWeight: 500, fontSize: 30, lineHeight: 1.35, color: '#2b2b2b', marginTop: 40 }),
    h('div', { height: 3, backgroundColor: ink, marginTop: 36 }),
    h('div', { justifyContent: 'space-between', marginTop: 22 }, eyebrow('THE SPORTS BINGE', '#444', 22), eyebrow(brand.handle, '#444', 22)),
  );
}

// ---------------------------------------------------------------- MUSC
const RED = '#DA291C';
const muscBg = (W, H) => ({ width: W, height: H, position: 'relative', backgroundImage: 'linear-gradient(135deg, #DA291C 0%, #6B0F0B 42%, #0B0B0D 100%)', fontFamily: F.cond, color: '#fff' });

export function muscResult(pack, size = 'post') {
  const [W, H] = SIZES[size];
  const { brand, words, story: s, assets = {} } = pack;
  const P = 72;
  const goals = (s.events || []).filter((e) => /goal/i.test(e.type) && e.player).slice(0, 6);
  const isNews = s.kind === 'news';
  return h(
    'div',
    { ...muscBg(W, H), flexDirection: 'column', padding: P },
    assets.cutout ? img(assets.cutout, { position: 'absolute', right: P * 0.5, top: H * 0.42, width: W * 0.42, height: W * 0.42, objectFit: 'contain' }) : null,
    h('div', { justifyContent: 'space-between', alignItems: 'center' }, badge(brand, 140, assets), h('div', { flexDirection: 'column', alignItems: 'flex-end', maxWidth: W - P * 2 - 170 }, eyebrow(words.eyebrow, 'rgba(255,255,255,0.8)', 24))),
    h('div', { flexGrow: 1 }),
    isNews ? null : h(
      'div',
      { alignItems: 'center', justifyContent: 'space-between' },
      h('div', { flexDirection: 'column', alignItems: 'center', width: 240 }, crest(assets.homeLogo, 200, s.home?.abbr || '?'), text((s.home?.abbr || '').toUpperCase(), { fontFamily: F.bebas, fontSize: 40, letterSpacing: 4, marginTop: 14 })),
      text(`${s.home?.score ?? ''} - ${s.away?.score ?? ''}`, { fontFamily: F.bebas, fontSize: 300, lineHeight: 1, color: '#fff' }),
      h('div', { flexDirection: 'column', alignItems: 'center', width: 240 }, crest(assets.awayLogo, 200, s.away?.abbr || '?'), text((s.away?.abbr || '').toUpperCase(), { fontFamily: F.bebas, fontSize: 40, letterSpacing: 4, marginTop: 14 })),
    ),
    isNews || !goals.length ? null : h('div', { flexWrap: 'wrap', justifyContent: 'center', marginTop: 24 }, goals.map((g) => text(`${g.team ? g.team + ' · ' : ''}${g.player.replace(/\s*\(.*\)/, '')} ${g.minute}`, { fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: 'rgba(255,255,255,0.9)', marginRight: 28, marginBottom: 8 }))),
    h('div', { flexGrow: 1 }),
    headlineWords(words.headline, { font: F.bebas, size: fit(words.headline, isNews ? (size === 'story' ? 290 : 250) : size === 'story' ? 250 : 210), color: '#fff', accent: 'red', accentWords: words.accentWords, lineHeight: 0.92 }),
    text(words.explainer, { fontFamily: F.sans, fontWeight: 500, fontSize: 32, lineHeight: 1.35, color: 'rgba(255,255,255,0.85)', marginTop: 24 }),
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
    h('div', { justifyContent: 'space-between', alignItems: 'center' }, badge(brand, 140, assets), h('div', { flexDirection: 'column', alignItems: 'flex-end' }, eyebrow('MATCHDAY', '#fff', 30), h('div', { marginTop: 8 }, eyebrow(words.eyebrow, 'rgba(255,255,255,0.75)', 22)))),
    h('div', { flexGrow: 1 }),
    h(
      'div',
      { alignItems: 'center', justifyContent: 'space-between' },
      h('div', { flexDirection: 'column', alignItems: 'center', width: 300 }, crest(assets.homeLogo, 280, s.home?.abbr || '?'), text((s.home?.name || '').toUpperCase(), { fontFamily: F.bebas, fontSize: 44, letterSpacing: 3, marginTop: 18, textAlign: 'center' })),
      text('VS', { fontFamily: F.bebas, fontSize: 240, color: RED, lineHeight: 1 }),
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
  if (brand.id === 'musc') return type === 'preview' ? 'musc-matchday' : type === 'result' || type === 'live' ? 'musc-result' : 'musc-result';
  if (type === 'tally' && (pack.words?.big || pack.words?.stats?.length)) return 'tsb-tally';
  if (s.kind === 'news' || type === 'medal' || type === 'milestone' || type === 'quote') return 'tsb-dark';
  return 'tsb-cream';
}
