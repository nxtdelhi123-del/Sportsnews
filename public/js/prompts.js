// Art-direction prompts for image AIs (ChatGPT, Gemini, Midjourney, Ideogram…), written
// from docs/STYLE_SHEETS.md so the result reads as a post designed for
// @thesportsbinge or @musc_reddevils, not as AI art. Shared by the newsroom and the Studio.

const UP = (s) => String(s || '').toUpperCase();
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const METAL = /\b(gold|silver|bronze)\b/i;
const NAME = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\b/;
const NOT_NAMES = /^(Asian Games|Premier League|World Cup|Nations League|Champions League|Manchester United|Manchester City|Real Madrid|Team India|New Zealand|South Africa|Sri Lanka)$/;

// Nations play under flags; clubs under crests (which the AI must not draw).
const NATIONS = /^(india|pakistan|england|spain|france|germany|italy|portugal|netherlands|belgium|brazil|argentina|uruguay|mexico|usa|united states|japan|south korea|korea|australia|new zealand|south africa|sri lanka|bangladesh|afghanistan|west indies|ireland|scotland|wales|norway|sweden|denmark|croatia|serbia|switzerland|poland|morocco|senegal|nigeria|ghana|egypt|iran|china|qatar|saudi arabia|turkey|türkiye|colombia|chile|canada|nepal|zimbabwe)( men| women)?$/i;
export const isNationTeam = (t) => NATIONS.test(String(t?.name || '').trim());
const scorer = (p = '') => String(p).split(' / ')[0].replace(/\s*\(.*\)/, '').trim();
const PHOTO_LAYOUTS = new Set(['medal-top', 'medal-bottom', 'phrase', 'number', 'quote', 'result-photo', 'preview', 'vs', 'verdict', 'side-panel', 'team', 'table', 'scores', 'duo', 'head', 'head-left', 'head-slant', 'matchday', 'result', 'signing']);
const METAL_LAYOUTS = new Set(['medal-top', 'medal-bottom', 'phrase', 'number', 'tally', 'cover', 'side-panel', 'team', 'scores', 'duo']);
// Where the style references and badges live. Image AIs copy an attached real post far
// more faithfully than any description, so every prompt names one to attach.
const SITE = typeof location !== 'undefined' && /^https:/.test(location.origin) && !/localhost|127\.0/.test(location.host) ? location.origin : 'https://sportsnews-delta.vercel.app';
// One real post per layout (public/studio/refs/<brand>-<layout>.jpg).
const REFS = {
  tsb: ['medal-top', 'medal-bottom', 'phrase', 'number', 'quote', 'cream', 'result-photo', 'preview', 'vs', 'tally', 'verdict', 'cover', 'side-panel', 'team', 'table', 'scores', 'duo'],
  musc: ['head', 'head-slant', 'matchday', 'signing'],
};
const BADGES = { tsb: '/studio/brand/tsb-badge.png', musc: '/studio/brand/musc-crest.png' };

export const BRAND_INFO = {
  tsb: { name: 'The Sports Binge', handle: '@thesportsbinge' },
  musc: { name: 'MUSC Red Devils', handle: '@musc_reddevils' },
};

// What kind of post a story makes (same rules as the Studio, simplified for the browser).
export function kindOf(item) {
  if (item.kind !== 'news') return item.status?.state === 'pre' ? 'preview' : item.status?.state === 'in' ? 'live' : 'result';
  const t = `${item.title || ''} ${item.summary || ''}`;
  if (/medal (tally|count|table)|total medals|\b\d{1,3} medals\b/i.test(t)) return 'tally';
  if (/\b(reach|reaches|storms?|into|through to|assures?)\b[^.]{0,40}\b(finals?|semi-?finals?|medal)\b/i.test(t) && !/\b(wins?|won|takes?|clinch\w*|bags?)\b[^.]{0,30}\b(gold|silver|bronze)/i.test(t)) return 'stage';
  if (METAL.test(t) || /medal|podium/i.test(t)) return 'medal';
  if (/record|fastest|first[- ]ever|youngest|milestone|\b\d{1,3},\d{3}\b|century|hat-trick/i.test(t)) return 'milestone';
  if (/["“”]|\bsays\b|\bsaid\b/i.test(item.title || '')) return 'quote';
  return 'breaking';
}

function personIn(text = '') {
  const m = String(text).match(NAME);
  return m && !NOT_NAMES.test(m[1]) ? m[1] : '';
}
// People named in a story (up to four), and up to two "Team 48-24 Team" results with
// the men's / women's label when the story gives one.
const NOT_IN_NAMES = /\b(Asian Games|Olympics?|Commonwealth Games|World Championships?|Premier League|World Cup|Nations League|Champions League|Grand Prix|Team India|India's|Indian|India|Men's|Women's|Gold|Silver|Bronze|The|At|In|On)\b/g;
const namesIn = (text = '') => [...new Set([...String(text).replace(NOT_IN_NAMES, ',').matchAll(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3})\b/g)].map((m) => m[1]).filter((n) => !NOT_NAMES.test(n)))].slice(0, 4);
const TEAM = "[A-Z][\\w']+(?: (?!Men\\b|Women\\b)[A-Z][\\w']+)?";
const scoresIn = (text = '') => [...String(text).matchAll(new RegExp(`\\b(${TEAM})\\s+(\\d{1,3})\\s*[-–]\\s*(\\d{1,3})\\s+(${TEAM})`, 'g'))].map((m) => {
  const before = String(text).slice(Math.max(0, m.index - 40), m.index);
  const side = (before.match(/\b(women|men)\b(?!.*\b(women|men)\b)/i) || [])[1];
  return `${side ? UP(side) + ': ' : ''}${UP(m[1])} ${m[2]}–${m[3]} ${UP(m[4])}`;
}).slice(0, 2);

// The page's headline for a story when the Studio hasn't written one.
export function headlineFor(item, kind, brand = 'tsb') {
  const t = clean(item.title);
  if (item.kind !== 'news') {
    const h = item.home || {};
    const a = item.away || {};
    const hs = Number(h.score);
    const as = Number(a.score);
    if (kind === 'preview') return brand === 'musc' ? 'MATCHDAY.' : `${h.name} vs ${a.name}.`;
    if (!Number.isFinite(hs) || !Number.isFinite(as) || h.score === '' || a.score === '') return `${h.name} vs ${a.name}.`;
    if (brand === 'musc') {
      const utd = /man(chester)? (utd|united)/i;
      const us = utd.test(h.name) ? h : utd.test(a.name) ? a : null;
      if (!us) return `${UP(h.name)} ${hs}–${as} ${UP(a.name)}.`;
      const won = (us === h && hs > as) || (us === a && as > hs);
      return hs === as ? 'ONE POINT. MORE QUESTIONS.' : won ? (Math.abs(hs - as) >= 3 ? 'STATEMENT MADE.' : 'THREE POINTS. NO DRAMA.') : 'A NIGHT TO FORGET.';
    }
    const place = (item.venue?.name || '').split(',')[0].replace(/\b(stadium|arena|ground|park)\b/gi, '').replace(/\s+/g, ' ').trim();
    if (hs === as) return place && place.split(' ').length <= 2 ? `Honours even at ${place}.` : 'Honours even.';
    const [w, l] = hs > as ? [h, a] : [a, h];
    return w === a && place && place.split(' ').length <= 2 ? `${w.name} take ${place}.` : `${w.name} beat ${l.name}.`;
  }
  const metal = (t.match(METAL) || [])[1];
  const who = personIn(t);
  if (kind === 'medal' && metal) return who ? `${UP(who)} ${UP(metal)}.` : /\bindia\b/i.test(t) ? `INDIA ${UP(metal)}.` : `${UP(metal)}.`;
  if (kind === 'stage') return /\b(two|both)\b[^.]{0,30}\bfinals\b/i.test(t) ? 'ONE DAY. TWO FINALS.' : /semi/i.test(t) ? 'MEDAL ASSURED.' : 'INTO THE FINAL.';
  if (kind === 'milestone') {
    const m = t.match(/\b(\d[\d,]*(?:st|nd|rd|th)?)\s+((?:ODI|Test|T20I|IPL|international|Premier League)\s+)?(runs|wickets|goals|caps|hundreds?|centuries|century|titles|wins|medals|appearances|matches)\b/i);
    if (m) return `${UP(m[1])} ${UP((m[2] || '') + m[3]).replace(/\s+/g, ' ')}.`;
  }
  if (kind === 'quote') {
    const q = t.match(/[“"]([^”"]{8,160})[”"]/);
    if (q) return `“${q[1].trim()}”`;
  }
  const first = t.replace(/^[^:]{3,30}:\s+/, '').split(/[:,–—]|\s-\s/)[0].split(/\s+/).slice(0, 7).join(' ');
  return `${UP(first).replace(/[.]$/, '')}.`;
}

// ---------------------------------------------------------------- layouts
// Every layout is a concrete brief: where things sit, in what type, at what size.
const TSB_LAYOUTS = {
  'medal-top': {
    title: 'Medal post — name on top',
    layout: [
      'Background: near-black (#141414) at the top, the photo rising into it from below. Competition logo space top-right (an empty square, I add the Games logo); badge space bottom-left.',
      'Top 4–7%, left-aligned at a 4% margin: the first name in small widely spaced white serif capitals.',
      'From 7% to 31% down, left-aligned: the TOP LINE (surname) in white condensed Didone capitals, then the BIG WORD directly under it in brushed metal, both filling the width to a 4% margin; the big word ~1.6x the height of the top line.',
      'Under it, one row: on the left the EVENT in spaced serif capitals over the competition in tiny caps; a thin vertical white rule; on the right the result (time / distance) in a white condensed serif, right-aligned.',
      'From 38% down to the bottom: the athlete from the photo, holding the flag wide or celebrating, filling the frame edge to edge; the flag’s colours run across behind them.',
    ],
  },
  'medal-bottom': {
    title: 'Medal post — metal word at the foot',
    layout: [
      'Top 0–62%: the photo, the athlete mid-action (throw, shout, celebration) in the upper half, cropped tight. Badge space top-left, competition logo space top-right.',
      'From 58% to 84% down, centred: the TOP LINE (name) in white condensed Didone capitals, then the BIG WORD in brushed metal, both filling the width to a 4% margin, sitting on the photo’s dark gradient.',
      'Footer row (bottom 12%) on near-black, three columns split by thin vertical white rules: left — the event in tiny spaced caps over the result in a gold serif ("17.17m"); centre — 2 lines of tiny spaced caps saying what happened; right — the country in tiny caps over a small real flag.',
    ],
  },
  'side-panel': {
    title: 'Medal / stage post — text panel on the left',
    layout: [
      'Background: the photo of the athlete in action on the right two-thirds, with a large black-and-white close-up of the same athlete faded into the dark background top-right (a double exposure). Left third darkened to near-black.',
      'Top-left: the competition in tiny spaced caps, 2 lines. Competition logo space top-right; badge space bottom-right.',
      'From 8% to 36% down, left-aligned at a 4% margin: the TOP LINE (name, 1–2 lines) in white condensed Didone capitals, then the BIG WORD in brushed metal under it, ~60% of the width; the EVENT in spaced caps under that.',
      'Left column from 44% down, behind a thin vertical white rule: stat blocks stacked — each a big number in a white condensed sans ("2:11:37") over 2 lines of tiny spaced caps; the second block’s number larger and in pale blue or gold ("44 YEARS") with a bold small-caps line above it.',
      'The athlete overlaps the panel slightly, never covering its text.',
    ],
  },
  phrase: {
    title: 'Medal phrase post',
    layout: [
      'Top 0–58%: the photo of the athlete(s) in action, fading into near-black at its foot. Badge space top-left, competition logo space top-right.',
      'From 56% to 82%: the PHRASE in 2–3 lines, centred, each line filling the width (4% margins) in a condensed Didone: the first line in white and largest, the following lines in brushed gold/bronze, every sentence ending in a full stop.',
      'Under it: the athlete’s name in widely spaced white serif capitals, then one line of gold spaced caps with the key facts split by dots ("54.75 · NATIONAL RECORD · BRONZE").',
      'Very bottom: 2 lines of tiny spaced caps with the event and competition.',
    ],
  },
  number: {
    title: 'Number / milestone post',
    layout: [
      'Background: dark stadium night, the athlete from the photo on the right half from 35% down, in action.',
      'Top 5%: the athlete’s name in widely spaced small white caps.',
      'From 7% to 28%: the NUMBER in a wide high-contrast Didone, brushed gold, filling ~86% of the width.',
      'Under it: the UNIT in white condensed serif capitals, then the KICKER in small spaced caps.',
      'Left column from 45% down: badge space, then a supporting number in gold serif with a tiny caps label over and under it; then a small comparison block (a small photo square + a second number).',
      'Bottom 10%: a row of three stats split by thin vertical rules — each a gold serif number with 2 lines of tiny caps beside it.',
    ],
  },
  quote: {
    title: 'Quote post',
    layout: [
      'Top 0–58%: the portrait, face fully visible, looking off-frame. Badge space top-left.',
      'From 58% down: a large gold opening quote mark, then the QUOTE in 3–4 lines of semi-condensed serif, sentence case; the middle line in gold, the rest in white.',
      'Under it: the speaker’s name in widely spaced small caps, then a smaller second quote in a light serif.',
      'Bottom: a thin rule, the context on the left ("ON THE …"), the handle on the right, both tiny spaced caps.',
    ],
  },
  cream: {
    title: 'Result card — cream newspaper',
    layout: [
      'Background: warm cream paper (#F1ECE2) with a very subtle paper texture. No photo.',
      'Top: the competition and season in tiny spaced caps between two hairlines.',
      'Then the masthead "THE SPORTS BINGE" in a tall condensed newspaper serif, navy (#0F1B33), filling the full width, with a rule under it.',
      'Centre: the HEADLINE in 2 lines, heavy semi-condensed serif, sentence case, centred, navy.',
      'The STATUS LABEL in spaced caps between hairlines, then a row: team 1 mark · the score "X–Y" huge in navy serif · team 2 mark, separated by thin vertical rules (team marks: the real rectangular flag for a national team; for a club, an EMPTY square outline the size of a flag where I place the crest). Team names in spaced caps under the marks; each team’s scorers with minutes in small serif under that team.',
      'Bottom: the round/group in spaced caps between hairlines, then the handle.',
    ],
  },
  'result-photo': {
    title: 'Result over a photo',
    layout: [
      'Full-bleed photo of the scorer celebrating, right half of the frame, the stadium dark behind.',
      'Top-left: competition in tiny spaced caps. Badge space top-right.',
      'From 6% to 24%: the HEADLINE in 2 lines of cream condensed serif capitals, left-aligned, filling ~85% of the width, ending in a full stop.',
      'Left column under it: the KICKER in 3 short lines of white serif (sentence case), then each team stacked: a real flag (or an empty square for a club crest) beside a big white serif score, team name in tiny caps under; then the scorers with minutes in a small list.',
    ],
  },
  preview: {
    title: 'Match preview — two stars and a cream band',
    layout: [
      'Top 0–70%: the two star players facing each other in front of the stadium, sky visible; "TSB" in bold serif top-centre with the competition in spaced caps under it.',
      'Bottom 33%: a cream band with a soft painted edge; the photo fades into it.',
      'The HEADLINE in 2 lines of heavy semi-condensed serif: line 1 in white over the photo, line 2 in near-black on the cream.',
      'Under it: flag · thin rule · "VS" · thin rule · flag, team names in spaced caps; then the date, the time (larger) and the venue in small serif caps.',
    ],
  },
  vs: {
    title: 'Cream VS post',
    layout: [
      'Top 62%: cream paper. Real flags of both nations drape in from the left and right edges, partly cut off. Badge space top-left, competition logo space top-right.',
      'Team 1 name huge in a condensed Didone in deep navy, a small spaced "vs" in muted grey, team 2 name huge in deep navy — each filling ~70% of the width, centred between the flags.',
      'Under them: the stage ("SEMI-FINAL") in widely spaced serif capitals, the date in small caps, then two short fact columns split by a vertical rule.',
      'Bottom 38%: a real photo of the venue or the ball/equipment on the field, shallow depth of field, fading into the cream at its top edge.',
    ],
  },
  tally: {
    title: 'Medal tally',
    layout: [
      'Cream paper background. Painted saffron and green brush strokes sweep diagonally behind the big number.',
      'Top: country name huge in navy condensed serif, "MEDAL TALLY" under it, then "AS OF <date> · <place>" in small caps and a short tricolour rule.',
      'Centre: the TOTAL huge in navy serif, "TOTAL MEDALS" in spaced caps under it.',
      'Bottom: four columns split by thin rules — real gold, silver and bronze medal photos (and a rank icon) with the counts in large serif in matching metal tones, labels in spaced caps.',
      'Very bottom: tiny line "Medal standings are subject to change as events conclude."',
    ],
  },
  verdict: {
    title: 'Breaking report',
    layout: [
      'Top 56%: near-black background. "BREAKING REPORT" in red spaced caps with a red hairline.',
      'The full HEADLINE in high-contrast serif capitals, each line filling the width and stepping down in size; the key phrase line (the verdict) in red #D7191C, the rest in off-white.',
      'Under it: a short red dash and 2 lines of serif body, then "Reported by …" small.',
      'Bottom 44%: a real photo of the club’s stadium or crest at dusk, graded cold blue, fading up into the black.',
    ],
  },
  team: {
    title: 'Team medal — the squad and one huge word',
    layout: [
      'Background: dark, the venue blurred behind. Competition in tiny spaced caps top-left; badge space top-right; competition logo space under the competition.',
      'From 12% to 18%: the EVENT in widely spaced serif capitals, 2 lines, centred.',
      'From 20% to 72%: the team from the photo standing side by side with their medals, waist up, evenly spaced.',
      'From 60% to 80%: the BIG WORD huge in brushed metal across the full width (3% margins), overlapping the athletes’ waists, with a soft dark shadow.',
      'A TOP LINE, if given, sits just above the big word in small white spaced caps.',
      'Under it: one line of spaced caps saying what happened, then the NAMES ROW — one name per column in tiny spaced caps, the columns split by thin vertical rules.',
      'Very bottom: a painted sweep of the country’s flag colours across the width.',
    ],
  },
  duo: {
    title: 'Two medals — two athletes, two columns',
    layout: [
      'Top 0–58%: the two athletes from the photo side by side in action, the stadium lit behind. Badge space top-left, competition in tiny caps top-centre, competition logo space top-right.',
      'From 50% to 76%: the HEADLINE in 2 lines of brushed gold condensed Didone, centred, each line filling the width.',
      'Under it: one spaced line in white caps with a small real flag at its end.',
      'Bottom 20%: two columns split by a thin vertical rule — each: the athlete’s name in tiny spaced caps, their medal word in its own metal (silver / bronze / gold), the result under it in white condensed type.',
      'Very bottom: 2 lines of tiny spaced caps with context.',
    ],
  },
  scores: {
    title: 'Two results — two score panels',
    layout: [
      'Thin corner brackets in the four corners. Competition in tiny spaced serif caps top-centre.',
      'Top 0–50%: the team(s) from the photo in action, fading into navy-black.',
      'From 40% to 66%: the HEADLINE in 2 lines, centred: line 1 white, line 2 brushed gold, each filling the width.',
      'Under it: the KICKER in 2 lines of spaced white caps.',
      'Then two panels side by side split by a thin rule: each has a label in gold spaced caps ("WOMEN" / "MEN") over a row "TEAM  48–24  TEAM" with the score in gold.',
      'Under them: one line of tiny caps, then a thin gold-outlined pill with a date line. Badge space bottom-left, competition logo space bottom-right.',
    ],
  },
  table: {
    title: 'Grid / standings — photo and a results table',
    layout: [
      'Top-left 0–45%: the star from the photo, smiling, chest up. Top-right: the venue at night with the event in tiny spaced caps (2–3 lines).',
      'From 40% to 58%, left-aligned: the HEADLINE in 2 lines of heavy condensed Didone capitals — line 1 white, line 2 in the team colour (teal, red, orange…).',
      'Under it: the KICKER in tiny spaced caps.',
      'Then a results table on a dark translucent panel, 4 rows: a small coloured position chip ("P1"), the name, a small grey team mark, the team name and the time/gap right-aligned — tiny clean sans.',
      'Bottom-left: the car / equipment on track. Bottom-right: a second person cut out with their name and position huge in white/teal ("P16") and a 3-line tiny caption.',
    ],
  },
  cover: {
    title: 'Carousel cover — type only',
    layout: [
      'Warm paper background with faint texture. No photo.',
      'A meta row at the top: place on the left, series name on the right, tiny caps, hairline under.',
      'Two blocks of stacked condensed serif capitals in near-black; the key word of each block on its own line, larger, in brushed bronze. A short saffron-white-green dash between the blocks.',
      'Bottom: 2–3 lines of tiny spaced caps on the left, badge space and a thin arrow on the right.',
    ],
  },
};
const MUSC_LAYOUTS = {
  head: {
    title: 'Headline over photo — centred',
    layout: [
      'Full-bleed photo, graded red: shadows pushed to maroon, a deep red-to-black fade over the bottom 45%.',
      'Bottom: a label in condensed bold capitals between two red rules, then the HEADLINE one word per line (2–4 lines), each line filling the width, in an ultra-condensed heavy grotesque, cream #F3E6D0 with slight texture; any accent word in red #DA291C.',
      'Badge space top-left.',
    ],
  },
  'head-left': {
    title: 'Headline in a left column',
    layout: [
      'Photo on the right two-thirds; the left half darkened to near-black with a thin red bar on the far left edge.',
      'Left column from 20% down: a red label, then the HEADLINE in 3–4 lines of ultra-condensed heavy capitals, cream, the accent word in red; a red rule; a two-line subhead in bold sans; two lines of small capitals.',
    ],
  },
  'head-slant': {
    title: 'Slanted headline with a tag',
    layout: [
      'Full-bleed photo of the people in the story, graded dark red at the bottom.',
      'Bottom: the HEADLINE in 2 lines of ultra-condensed heavy italic capitals slanted forward ~9°, white, the key word in red; a red underline stroke.',
      'Bottom-left: a handwritten-style aside; bottom-right: a red tag box with white border, tilted -3°, with a short word in it.',
    ],
  },
  matchday: {
    title: 'Matchday',
    layout: [
      'Split background: United red on the left, the opponent’s colour on the right. One player from each side, facing each other, filling the top 60%.',
      'Top-centre: the competition badge area and the round in small caps.',
      'Lower third: crest · "VS" · crest with team names under each in small caps.',
      'Then the date and time in big yellow (#FFD23F) condensed capitals, the venue small, and "WATCH LIVE ONLY ON" in white with "FANCODE" in orange #FF7A1A italic.',
    ],
  },
  result: {
    title: 'Result',
    layout: [
      'Full-bleed photo of United players celebrating, graded red; left side darkened.',
      'Left column: crest and the score huge in white condensed capitals, "MAN UTD v OPPONENT" small under it, then scorers as rows "27’ | M. CUNHA" with a thin red bar between minute and name.',
      'Bottom: the HEADLINE in 2 lines of ultra-condensed heavy capitals, cream, the accent word in red; competition and handle in tiny caps under it. A red "FULL TIME" tag top-right.',
    ],
  },
  statement: {
    title: 'Statement on red',
    layout: [
      'A red poster panel (#B2160E with a soft radial highlight) inset on near-black, a thin cream inner border.',
      'Top: "MATCHDAY" small above the panel.',
      'Upper half of the panel: the STATEMENT in 2 lines of ultra-condensed heavy capitals, cream with a subtle print texture, filling the width.',
      'Under it: the fixture "MANCHESTER UNITED V OPPONENT" in spaced caps, the competition and date smaller; badge space at the bottom centre.',
    ],
  },
  signing: {
    title: 'New signing — cream',
    layout: [
      'Top 50%: off-white background. "MUSC RED DEVILS" in red spaced caps between hairlines, then the label ("ACADEMY SIGNING") in bold spaced caps.',
      'The HEADLINE in a heavy high-contrast serif, sentence case: first line black, last word in deep red with a full stop ("A new / Red.").',
      'The player’s name in bold spaced caps, one line of context under it.',
      'Bottom 50%: the player standing at Old Trafford on the pitch, real stadium behind, natural light.',
    ],
  },
};

// The layout the story's shape calls for (team, two medals, two finals, a grid), if any.
function shapeOf(kind, words, item) {
  if (item.kind !== 'news') return '';
  const t = `${item.title || ''} ${item.summary || ''}`;
  if (kind === 'medal' && /\b(team|relay|trio|squad|4\s*[x×]\s*\d{3})\b/i.test(t)) return 'team';
  if ((kind === 'medal' || kind === 'milestone') && ((words.podium || []).length >= 2 || /\b(double podium|one-two|1-2 finish)\b/i.test(t) || (namesIn(item.title).length >= 2 && (t.match(/\b(gold|silver|bronze)\b/gi) || []).length >= 2))) return 'duo';
  if (/\b(two|both)\b[^.]{0,30}\bfinals?\b|\btwo golds\b/i.test(t) && scoresIn(t).length >= 2) return 'scores';
  if (/\b(on pole|pole position|qualifying|grid|standings|leaderboard)\b/i.test(t) && (words.stats || []).length >= 2) return 'table';
  if (kind === 'stage' || (kind === 'medal' && (words.stats || []).length >= 2)) return 'side-panel';
  return '';
}

function layoutFor(brand, kind, words, item, template, pinned) {
  const strip = String(template || '').replace(/^(tsb|musc)-/, '');
  const table = brand === 'musc' ? MUSC_LAYOUTS : TSB_LAYOUTS;
  const shape = brand === 'tsb' && !pinned ? shapeOf(kind, words, item) : '';
  if (shape) return shape;
  if (strip && table[strip]) return strip;
  if (strip === 'dark') template = null;
  if (brand === 'musc') {
    if (item.kind !== 'news') return kind === 'preview' ? 'matchday' : 'result';
    if (/\b(signs?|signing|joins?|unveil)/i.test(`${item.title} ${words.headline}`)) return 'signing';
    return 'head';
  }
  if (item.kind !== 'news') return kind === 'preview' ? 'preview' : kind === 'live' ? 'result-photo' : 'cream';
  if (kind === 'tally') return 'tally';
  if (kind === 'quote') return 'quote';
  if (kind === 'breaking') return 'verdict';
  if (/^\d/.test(words.headline || '') && kind !== 'medal') return 'number';
  if (METAL.test(String(words.headline || '').split(/\s+/).pop())) return 'medal-top';
  if (kind === 'medal' || kind === 'milestone') return 'phrase';
  return 'medal-bottom';
}

// The exact words the AI must set, labelled the way the layout names them.
function textLines(brand, key, words, item, when) {
  const W = [];
  const add = (label, s) => s && W.push(`${label}: "${clean(s)}"`);
  const head = clean(words.headline);
  const parts = head.split(/\s+/);
  const isMetalTier = /^(medal-(top|bottom)|side-panel|team)$/.test(key) && parts.length >= 2 && METAL.test(parts[parts.length - 1]);
  if (isMetalTier || (/^medal-(top|bottom)$/.test(key) && parts.length >= 2)) {
    add('TOP LINE', parts.slice(0, -1).join(' '));
    add('BIG WORD', parts[parts.length - 1].replace(/\.$/, ''));
  } else if (key === 'team' && METAL.test(head)) {
    add('BIG WORD', UP(head.match(METAL)[1]));
  } else if (key === 'number') {
    add('NUMBER', parts[0]);
    add('UNIT', parts.slice(1).join(' ').replace(/\.$/, ''));
  } else if (key === 'phrase') add('PHRASE', head.replace(/\.$/, ''));
  else if (key === 'quote') add('QUOTE', head);
  else if (key === 'statement') add('STATEMENT', head);
  else add('HEADLINE', head);
  add(key === 'number' ? 'NAME' : 'EVENT / NAME LINE', words.name);
  add('KICKER', words.kicker);
  if (key === 'cream' || key === 'result-photo' || key === 'preview' || key === 'vs' || key === 'matchday' || key === 'result') {
    if (item.home && item.away) {
      add('TEAM 1', item.home.name);
      add('TEAM 2', item.away.name);
      if (item.status?.state !== 'pre' && item.home.score !== undefined && item.home.score !== '') add('SCORE', `${item.home.score}–${item.away.score}`);
      const goals = (item.events || []).filter((e) => /goal/i.test(e.type) && e.player).slice(0, 6);
      const side = (t) => goals.filter((g) => [t.name, t.abbr, t.short].filter(Boolean).some((n) => String(g.team || '').toUpperCase() === String(n).toUpperCase())).map((g) => `${scorer(g.player)} ${g.minute}`);
      if (side(item.home).length) add(`SCORERS UNDER ${UP(item.home.name)}`, side(item.home).join(', '));
      if (side(item.away).length) add(`SCORERS UNDER ${UP(item.away.name)}`, side(item.away).join(', '));
      if (item.status?.state === 'pre' && when) add('DATE & TIME', when);
      if (item.venue?.name) add('VENUE', [item.venue.name, item.venue.city].filter(Boolean).join(', '));
    }
  }
  const story = `${item.title || ''} ${item.summary || ''}`;
  if (key === 'team') {
    const names = (words.podium || []).map((p) => p.name).filter(Boolean);
    const list = names.length >= 2 ? names : namesIn(story);
    if (list.length >= 2) add('NAMES ROW (one per column)', list.map(UP).join(' | '));
  }
  if (key === 'duo') {
    const pod = (words.podium || []).slice(0, 2);
    if (pod.length === 2) pod.forEach((p, i) => add(i ? 'RIGHT COLUMN' : 'LEFT COLUMN', `${UP(p.name)} / ${UP(p.metal)}${p.value ? ' / ' + p.value : ''}`));
    else
      namesIn(story).slice(0, 2).forEach((n, i) => {
        // each name takes the first medal word after it in the story
        const metal = (story.slice(story.indexOf(n)).match(METAL) || [])[1];
        add(i ? 'RIGHT COLUMN' : 'LEFT COLUMN', `${UP(n)}${metal ? ' / ' + UP(metal) : ''}`);
      });
  }
  if (key === 'scores') scoresIn(story).forEach((x, i) => add(`SCORE PANEL ${i + 1}`, x));
  for (const st of (words.stats || []).slice(0, key === 'table' ? 4 : 3)) add(key === 'table' ? 'TABLE ROW' : 'STAT', `${st.value} — ${st.label}`);
  if (key !== 'duo' && key !== 'team') for (const p of words.podium || []) add('PODIUM', `${p.name}: ${UP(p.metal)}${p.value ? ' ' + p.value : ''}`);
  if (words.big) add('TOTAL', words.big);
  if (item.kind !== 'news' && !words.eyebrow) {
    const d = item.date ? new Date(item.date) : null;
    const season = d && /league|liga|serie|bundesliga|ligue|cup/i.test(item.league?.name || '') ? ` · ${d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1}/${String((d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1) + 1).slice(2)}` : '';
    add('COMPETITION', `${UP(item.league?.name || '')}${season}`);
  } else add('COMPETITION', words.eyebrow);
  const status = item.status?.state === 'in' ? 'LIVE' : item.status?.state === 'pre' ? '' : 'FULL TIME';
  const FIXED = {
    cream: [['MASTHEAD', 'THE SPORTS BINGE'], ['STATUS LABEL', status || when]],
    preview: [['TOP MARK', 'TSB'], ['BETWEEN THE FLAGS', 'VS']],
    vs: [['SMALL WORD BETWEEN THE NAMES', 'vs']],
    tally: [['UNDER THE TOTAL', 'TOTAL MEDALS']],
    verdict: [['TAG', 'BREAKING REPORT']],
    result: [['TAG', status]],
    'result-photo': [],
    statement: [['ABOVE THE PANEL', 'MATCHDAY']],
    signing: [['TOP LINE', 'MUSC RED DEVILS']],
  };
  for (const [label, val] of FIXED[key] || []) add(label, val);
  if (brand === 'musc' && key === 'matchday') add('BROADCAST', 'WATCH LIVE ONLY ON FANCODE');
  add('HANDLE', BRAND_INFO[brand].handle);
  return W;
}

const TSB_LOOK = [
  'TYPE: an extra-condensed, very high-contrast Didone serif in black weight for the big words (like the condensed display cuts of Bodoni / Didot used by sports magazines), a semi-condensed heavy serif for sentence-case headlines, and a clean geometric sans (Montserrat) in widely spaced capitals for labels. Tight tracking on display words, generous tracking (0.3em) on labels.',
  'METAL: gold #F7E3A1→#C8962E→#7A5512, silver #FFFFFF→#B9BCC4→#6E7079, bronze #F6C49A→#C77A44→#6E3714 — a brushed-metal fill with a bright band a third of the way down, a darker foot, fine grain, and a soft dark drop shadow so it lifts off the photo. Never glossy 3D chrome.',
  'COLOUR: ink #121212, cream #F1ECE2, navy #0F1B33, breaking red #D7191C. For India: saffron #FF9933, white, green #138808 as light, paint strokes or a thin rule — never a cartoon flag icon.',
  'PHOTO GRADE: deep blacks, contrast up slightly, saturation up slightly, the background darkened so the athlete pops, a soft vignette, a dark gradient (to about 85% black) only where text sits. Fine film grain over the whole image.',
];
const MUSC_LOOK = [
  'TYPE: an ultra-condensed heavy grotesque (like Anton / Bebas Neue / Druk) in capitals for headlines, cream #F3E6D0 with a faint print texture, accent words in Manchester United red #DA291C; condensed bold sans (Oswald) in spaced capitals for labels.',
  'COLOUR: United red #DA291C, deep maroon shadows, black #0B0B0D, cream #F3E6D0. Yellow #FFD23F only for matchday dates, orange #FF7A1A only for FANCODE.',
  'PHOTO GRADE: shadows pushed toward maroon, contrast up, a red-to-black fade under the text, a soft vignette, fine grain.',
];
const NOT_AI = [
  'Make it look like a real post designed in Photoshop by a sports media page and shot by an agency photographer — NOT like AI art.',
  'Photo: real editorial sports photography (Getty / Reuters / AP style), 70–200mm telephoto look, natural skin texture with pores, real sweat and fabric folds, real stadium light and crowd bokeh, correct hands and fingers, correct kit, correct equipment.',
  'Do NOT add: plastic or airbrushed skin, glowing outlines, lens flares, sparkles, lightning, smoke, motion streaks, neon, 3D chrome text, bevel/emboss, fantasy backgrounds, extra people, duplicated limbs, warped numbers on shirts, made-up sponsor logos, made-up text anywhere.',
  'Text: render ONLY the words listed under TEXT, spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.',
  'Logos and badges: do NOT draw or imitate any brand badge, club crest, competition logo or sponsor mark. If I attached our badge, place that exact image, unchanged, in the badge space (a circle about 110px across); otherwise leave the badge space as a clean empty circle — I add the real logo myself. Competition logo spaces stay empty.',
  'Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.',
];

function planFor(item, { brand = 'tsb', words = {}, template = '', pinned = false } = {}) {
  const kind = kindOf(item);
  const w = { ...Object.fromEntries(Object.entries(words).filter(([, v]) => v !== undefined && v !== '')) };
  w.headline ||= headlineFor(item, kind, brand);
  const key = layoutFor(brand, kind, w, item, template, pinned);
  if (key === 'duo' && !words.headline) w.headline = 'DOUBLE PODIUM.';
  return { kind, w, key };
}

// The real post to attach as a style reference for this story's layout.
// `exact` is false when the brand has no post in that layout and a close one stands in.
export function styleRef(item, opts = {}) {
  const brand = opts.brand || 'tsb';
  const { key } = planFor(item, opts);
  const exact = REFS[brand].includes(key);
  const near = exact ? key : brand === 'musc' ? (key === 'result' ? 'matchday' : 'head') : 'medal-bottom';
  return { key, exact, url: `${SITE}/studio/refs/${brand}-${near}.jpg`, badge: `${SITE}${BADGES[brand]}` };
}

// The full prompt. `photo` says whether the owner will attach a real photo; `pinned`
// that the owner chose the layout, so the story's shape doesn't override it.
export function posterPrompt(item, { brand = 'tsb', words = {}, template = '', size = '3:4', when = '', photo = true, pinned = false } = {}) {
  const { w, key } = planFor(item, { brand, words, template, pinned });
  const ref = styleRef(item, { brand, words, template, pinned });
  const usesPhoto = PHOTO_LAYOUTS.has(key);
  const L = (brand === 'musc' ? MUSC_LAYOUTS : TSB_LAYOUTS)[key];
  const info = BRAND_INFO[brand];
  const dims = size === '9:16' ? '1080×1920 (9:16 story)' : size === '4:5' ? '1080×1350 (4:5)' : size === '1:1' ? '1080×1080 (1:1)' : '1080×1440 (3:4, Instagram grid shape)';
  const subject = item.kind === 'news' ? personIn(item.title) || 'the athlete or team in the story' : `${item.home?.name || ''} and ${item.away?.name || ''} players`;
  const recap = item.details?.recap || item.headline || '';
  const story = item.kind === 'news' ? `${clean(item.title)}${item.summary ? ' — ' + clean(item.summary).slice(0, 300) : ''}` : `${item.home?.name} ${item.home?.score ?? ''} – ${item.away?.score ?? ''} ${item.away?.name} · ${item.league?.name || ''}${item.note ? ' · ' + item.note : ''}${item.venue?.name ? ' · ' + item.venue.name : ''}${recap ? ' — ' + clean(recap).slice(0, 260) : ''}`;
  const utdGame = brand === 'tsb' && item.kind !== 'news' && /manchester united|man utd/i.test(`${item.home?.name} ${item.away?.name}`);
  const out = [
    utdGame ? '(Man United game — for @musc_reddevils use Formats → “AI prompt · MUSC” instead.)\n' : null,
    `You are the senior designer of ${info.name} (${info.handle}) on Instagram. Design ONE finished post image.`,
    '',
    `STORY (facts only — do not add any): ${story}`,
    `FORMAT: ${dims}, portrait, edge to edge, no border, no mock-up, no phone frame.`,
    '',
    `ATTACHMENTS (in this order):`,
    usesPhoto ? `• Image 1 — the real photo${photo ? '' : ' (if you have one; see PHOTO)'}.` : null,
    ref.exact
      ? `• Image ${usesPhoto ? 2 : 1} — STYLE REFERENCE, a real ${info.handle} post in this exact layout: ${ref.url}`
      : `• Image ${usesPhoto ? 2 : 1} — STYLE REFERENCE for type, colour and grade only (a real ${info.handle} post; the layout below differs): ${ref.url}`,
    `• Image ${usesPhoto ? 3 : 2} (optional) — our badge: ${ref.badge}`,
    '',
    'STYLE REFERENCE RULES:',
    ref.exact
      ? '• Match the style reference exactly: the same positions, proportions, type sizes, typefaces, letter spacing, colours, metal finish, photo grade, rules and margins. Make it look like the next post in the same series.'
      : '• Match the style reference’s typefaces, colours, metal finish, photo grade and finish; follow the LAYOUT below for positions.',
    '• Copy NOTHING else from it: none of its words, numbers, people, flags or logos. All words come from TEXT; the person comes from the real photo.',
    '• If the reference and this prompt disagree on words, this prompt wins; on look and finish, the reference wins.',
    '',
    'PHOTO:',
    !usesPhoto
      ? '• This layout uses no photo: type, paper and graphic marks only. Do not add any person or scene.'
      : photo
      ? `• I am attaching a real photo of ${subject}. Use it as the hero image EXACTLY as given: do not redraw, retouch, beautify, age, slim or change the face, body, hair, kit, numbers or logos in it. You may only crop, scale, place, colour-grade and darken it.`
      : `• No photo is attached. Do NOT invent the face of a real person. Use a real-looking scene without a recognisable face: the athlete seen from behind or in silhouette against stadium lights, or a close-up of the equipment (ball, javelin, bat, medal) in the venue, shallow depth of field.`,
    usesPhoto ? `• If you cannot keep a real person's face unchanged, leave the photo area as a dark neutral placeholder rather than generating a lookalike.` : null,
    '',
    `LAYOUT — ${L.title}:`,
    ...L.layout.map((x) => `• ${x}`),
    '',
    'TEXT (exact words, exact spelling — nothing else):',
    ...textLines(brand, key, w, item, when).map((x) => `• ${x}`),
    '',
    'LOOK:',
    ...(brand === 'musc' ? MUSC_LOOK : TSB_LOOK).filter((x) => METAL_LAYOUTS.has(key) || !/^METAL:/.test(x)).filter((x) => PHOTO_LAYOUTS.has(key) || !/^PHOTO GRADE:/.test(x)).map((x) => `• ${x}`),
    '',
    'MUST NOT LOOK AI-GENERATED:',
    ...NOT_AI.map((x) => `• ${x}`),
    '',
    'BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; every word matches the TEXT list letter for letter; no extra text; faces untouched; hands and numbers correct; the badge space holds only our attached badge or nothing; nothing is cropped at the edges.',
  ];
  return out.filter((x) => x !== null).join('\n');
}

// A short follow-up the owner can paste if the first image is off.
export const FIX_PROMPT = 'Keep the layout. Fix only: (1) any word that differs from the TEXT list, (2) any change to the real photo — put it back exactly as attached, (3) anything that looks AI-made (glow, plastic skin, extra objects, fake logos), (4) anything that drifts from the style reference’s type, spacing, metal finish or grade. Return the corrected image at the same size.';
