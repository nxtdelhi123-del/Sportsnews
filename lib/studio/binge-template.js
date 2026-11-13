// "tsb-binge": the house post the editor signed off on (12 Nov 2026 pack).
// Top: THE / SPORTS BINGE masthead with a rule, event label with a gold underline, status box.
// Headline: two lines, ALL CAPS, line 1 ivory, line 2 brushed gold, ending in a full stop.
// Middle: the photo, fading to black above and below (or a dark stage with the sport in outline).
// Bottom: up to three stats split by hairlines, then source and tagline.
import { h, text, abs, img, label, SIZES } from './kit.js';
import { font, fitSize, measure, metalTexture } from './type.js';

const INK = '#0B0E14';
const IVORY = '#F7F2E6';
const GOLD = '#D4AF37';
const ACCENT = { cricket: '#1F6FD1', soccer: '#C8102E', racing: '#E10600', tennis: '#7A3EC8', fieldhockey: '#138A4B', hockey: '#138A4B', basketball: '#E35205', mma: '#B3121B', athletics: '#C8962E' };
const GHOST = { cricket: 'CRICKET', soccer: 'FOOTBALL', racing: 'F1', tennis: 'TENNIS', fieldhockey: 'HOCKEY', hockey: 'HOCKEY', basketball: 'NBA', mma: 'UFC', athletics: 'ATHLETICS', badminton: 'BADMINTON', chess: 'CHESS', kabaddi: 'KABADDI', shooting: 'SHOOTING' };

// "INDIA U19. INTO THE FINAL." → ["INDIA U19.", "INTO THE FINAL."]; one sentence → split near the middle.
export function bingeLines(headline) {
  let t = String(headline || '').trim().toUpperCase();
  if (!t) return ['', ''];
  if (!/[.!?]$/.test(t)) t += '.';
  const sentences = t.match(/[^.!?]+[.!?]+/g)?.map((x) => x.trim()) || [t];
  if (sentences.length >= 2) return [sentences[0], sentences.slice(1).join(' ')];
  const words = t.split(/\s+/);
  if (words.length === 1) return ['', t];
  // Gold line takes the second half (the payoff), never more than the first by much.
  let best = 1;
  let diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (d < diff) [best, diff] = [i, d];
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

const KEY = 'didone';
function line(s, size, gold) {
  const base = { ...font(KEY), fontSize: size, lineHeight: 0.98, letterSpacing: -0.01 * size, whiteSpace: 'nowrap' };
  const dot = s.endsWith('.');
  const body = dot ? s.slice(0, -1) : s;
  const w = Math.ceil(measure(body, KEY, size)) + 8;
  const main = gold
    ? text(body, { ...base, backgroundImage: `url(${metalTexture('gold')})`, backgroundSize: `${w}px ${Math.round(size * 1.05)}px`, backgroundClip: 'text', color: 'transparent' })
    : text(body, { ...base, color: IVORY });
  const shadow = text(body, { ...base, position: 'absolute', left: 0, top: Math.round(size * 0.03), color: 'rgba(0,0,0,0.6)', textShadow: `0 ${Math.round(size * 0.04)}px ${Math.round(size * 0.12)}px rgba(0,0,0,0.8)` });
  return h('div', { alignItems: 'flex-end' }, h('div', { position: 'relative' }, shadow, main), dot ? text('.', { ...base, color: GOLD }) : null);
}

export function binge(pack, size = 'post') {
  const [W, H] = SIZES[size] || SIZES.post;
  const s = pack.story || {};
  const w = pack.words || {};
  const a = pack.assets || {};
  const M = 56;
  const inner = W - M * 2;
  const accent = ACCENT[s.sport] || GOLD;
  const [l1, l2] = bingeLines(w.headline);
  // Each line fills the measure, like the page's posters ("INDIA." huge, the payoff under it),
  // within a height budget so the photo keeps its room.
  const fit = (l) => (l ? fitSize(l, KEY, inner - 10, { max: 210, min: 56 }) : 0);
  let [s1, s2] = [fit(l1), fit(l2)];
  if (s1 > s2 * 1.6) s1 = Math.round(s2 * 1.6);
  const budget = Math.round(H * 0.25);
  const k = Math.min(1, budget / ((s1 + s2) * 0.98));
  [s1, s2] = [Math.round(s1 * k), Math.round(s2 * k)];
  const tagline = w.kicker || String(w.explainer || s.summary || '').split(/(?<=\.)\s/)[0] || '';
  const stats = (w.stats || []).filter((x) => x?.value).slice(0, 3);
  const status = pack.statusLabel || (s.kind === 'news' ? '' : s.status?.state === 'post' ? 'Confirmed' : '');
  const event = w.eyebrow || s.league?.name || (s.sport || '').toUpperCase();
  const top = Math.round(H * 0.27);
  const photoTop = Math.round(H * 0.25);

  const stage = a.hero
    ? img(a.hero, { position: 'absolute', left: 0, top: photoTop, width: W, height: H - photoTop, objectFit: 'cover', objectPosition: 'center 22%' })
    : abs(0, photoTop, W, H - photoTop, { backgroundImage: `radial-gradient(38% 30% at 12% 14%, rgba(255,240,200,0.28), rgba(0,0,0,0) 70%), radial-gradient(38% 30% at 88% 10%, rgba(255,240,200,0.24), rgba(0,0,0,0) 70%), radial-gradient(90% 70% at 50% 62%, ${accent}55 0%, #121720 55%, ${INK} 100%)` });
  const ghostWord = GHOST[s.sport] || '';
  const ghostSize = ghostWord ? Math.min(360, fitSize(ghostWord, KEY, W - 40, { max: 360, min: 120 })) : 0;
  const ghost = !a.hero && ghostWord ? abs(0, Math.round(H * 0.44), W, ghostSize, { justifyContent: 'center' }, text(ghostWord, { ...font(KEY), fontSize: ghostSize, lineHeight: 1, color: 'rgba(0,0,0,0)', WebkitTextStroke: '2px rgba(212,175,55,0.22)', whiteSpace: 'nowrap' })) : null;
  const fade = abs(0, 0, W, H, { backgroundImage: `linear-gradient(180deg, ${INK} 0%, ${INK} 27%, rgba(11,14,20,0.55) 40%, rgba(11,14,20,0) 52%, rgba(11,14,20,0) 64%, rgba(11,14,20,0.85) 80%, ${INK} 92%)` });

  const masthead = h('div', { flexDirection: 'column', borderLeft: `2px solid ${IVORY}`, paddingLeft: 14 }, label('The', { key: 'montBold', size: 19, color: IVORY, tracking: 0.22 }), label('Sports Binge', { key: 'montBold', size: 19, color: IVORY, tracking: 0.22 }));
  const eventBox = h(
    'div',
    { flexDirection: 'column', alignItems: 'flex-end' },
    label(event, { key: 'mont', size: 19, color: IVORY, tracking: 0.12, maxW: 560 }),
    h('div', { width: 70, height: 2, backgroundColor: GOLD, marginTop: 10 }),
    status ? h('div', { marginTop: 16, border: `1px solid rgba(212,175,55,0.75)`, paddingTop: 6, paddingBottom: 6, paddingLeft: 10, paddingRight: 10 }, label(status, { key: 'montBold', size: 14, color: GOLD, tracking: 0.22 })) : null,
  );

  const head = abs(
    M - 4,
    Math.round(H * 0.096),
    inner + 8,
    top + 200,
    { flexDirection: 'column' },
    l1 ? line(l1, s1, false) : null,
    line(l2, s2, true),
    tagline ? h('div', { width: 56, height: 3, backgroundColor: GOLD, marginTop: 26, marginLeft: 4 }) : null,
    tagline ? text(tagline.toUpperCase(), { ...font('montBold'), fontSize: 23, letterSpacing: 0.26 * 23, lineHeight: 1.5, color: IVORY, maxWidth: 840, marginTop: 18, marginLeft: 4 }) : null,
  );

  const statRow = stats.length
    ? abs(
        40,
        H - 96 - 172,
        W - 80,
        172,
        { alignItems: 'flex-end' },
        stats.map((st, i) => {
          const v = String(st.value).toUpperCase();
          const vs = Math.min(92, fitSize(v, KEY, (W - 80) / stats.length - 30, { max: 92, min: 40 }));
          return h(
            'div',
            { flexGrow: 1, flexBasis: 0, flexDirection: 'column', alignItems: 'center', borderLeft: i ? '2px solid rgba(247,242,230,0.55)' : 'none', paddingLeft: 14, paddingRight: 14 },
            label(st.label || '', { key: 'montBold', size: 20, color: IVORY, tracking: 0.2, maxW: (W - 80) / stats.length - 30 }),
            text(v, { ...font(KEY), fontSize: vs, lineHeight: 1.08, backgroundImage: `url(${metalTexture('gold')})`, backgroundSize: `${Math.ceil(measure(v, KEY, vs)) + 8}px ${Math.round(vs * 1.1)}px`, backgroundClip: 'text', color: 'transparent', whiteSpace: 'nowrap' }),
            st.note ? text(st.note, { ...font('montBold'), fontSize: 24, color: IVORY }) : null,
          );
        }),
      )
    : null;

  const foot = abs(M, H - 38 - 18, inner, 18, { justifyContent: 'space-between' }, label(s.source ? `Source: ${s.source}` : '', { size: 14, color: 'rgba(247,242,230,0.55)', tracking: 0.14, maxW: inner * 0.6 }), label('Sports beyond the game', { size: 14, color: 'rgba(247,242,230,0.55)', tracking: 0.14 }));

  return h('div', { width: W, height: H, backgroundColor: INK, position: 'relative', overflow: 'hidden' }, stage, ghost, fade, abs(56, 48, inner, 120, { justifyContent: 'space-between', alignItems: 'flex-start' }, masthead, eventBox), head, statRow, foot);
}
