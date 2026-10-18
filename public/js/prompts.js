// Art-direction prompts for image AIs (ChatGPT, Gemini, Midjourney, Ideogram…), written
// from docs/STYLE_SHEETS.md so the result reads as a post designed for
// @thesportsbinge or @musc_reddevils, not as AI art. Shared by the newsroom and the Studio.

const UP = (s) => String(s || '').toUpperCase();
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const METAL = /\b(gold|silver|bronze)\b/i;
const NAME = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\b/;
const NOT_NAMES = /^(Asian Games|Premier League|World Cup|Nations League|Champions League|Manchester United|Manchester City|Real Madrid|Team India|New Zealand|South Africa|Sri Lanka)$/;

export const BRAND_INFO = {
  tsb: { name: 'The Sports Binge', handle: '@thesportsbinge' },
  musc: { name: 'MUSC Red Devils', handle: '@musc_reddevils' },
};

// What kind of post a story makes (same rules as the Studio, simplified for the browser).
export function kindOf(item) {
  if (item.kind !== 'news') return item.status?.state === 'pre' ? 'preview' : item.status?.state === 'in' ? 'live' : 'result';
  const t = `${item.title || ''} ${item.summary || ''}`;
  if (/medal (tally|count|table)|total medals|\b\d{1,3} medals\b/i.test(t)) return 'tally';
  if (/\b(reach|reaches|storms?|into|through to|assures?)\b[^.]{0,40}\b(final|semi-?finals?|medal)\b/i.test(t) && !/\b(wins?|won|takes?|clinch\w*|bags?)\b[^.]{0,30}\b(gold|silver|bronze)/i.test(t)) return 'stage';
  if (METAL.test(t) || /medal|podium/i.test(t)) return 'medal';
  if (/record|fastest|first[- ]ever|youngest|milestone|\b\d{1,3},\d{3}\b|century|hat-trick/i.test(t)) return 'milestone';
  if (/["“”]|\bsays\b|\bsaid\b/i.test(item.title || '')) return 'quote';
  return 'breaking';
}

function personIn(text = '') {
  const m = String(text).match(NAME);
  return m && !NOT_NAMES.test(m[1]) ? m[1] : '';
}

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
    if (hs === as) return 'Honours even.';
    const [w, l] = hs > as ? [h, a] : [a, h];
    const place = (item.venue?.name || '').replace(/\b(stadium|arena|ground|park)\b/gi, '').trim();
    return w === a && place && place.split(' ').length <= 2 ? `${w.name} take ${place}.` : `${w.name} beat ${l.name}.`;
  }
  const metal = (t.match(METAL) || [])[1];
  const who = personIn(t);
  if (kind === 'medal' && metal) return who ? `${UP(who)} ${UP(metal)}.` : /\bindia\b/i.test(t) ? `INDIA ${UP(metal)}.` : `${UP(metal)}.`;
  if (kind === 'stage') return /semi/i.test(t) ? 'MEDAL ASSURED.' : 'INTO THE FINAL.';
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
      'Top 6%: tiny spaced caps "THE SPORTS BINGE" top-left and the competition top-right, white at 75% opacity.',
      'From 7% to 32% down: the TOP LINE in white, then the BIG WORD directly under it, both centred and each filling the full width edge to edge (3% side margins). The big word is about 2x the height of the top line.',
      'Under the big word: the EVENT in widely spaced capitals between two thin hairlines.',
      'From 35% down to the bottom: the athlete from the photo, celebrating, filling the frame; the top of the head may tuck just under the event line.',
      'Bottom-left: the KICKER in 3–4 short stacked lines of condensed bold capitals, and under it 2–3 lines of small body text.',
      'Bottom-right (if numbers are given): a dark translucent box listing the numbers with a small metal disc beside each.',
    ],
  },
  'medal-bottom': {
    title: 'Medal post — metal word at the foot',
    layout: [
      'Top 0–70%: the photo, the athlete’s head in the upper third. Badge space top-left, competition top-right in small spaced caps.',
      'Left side at 40% down: the athlete’s name in a light serif, widely spaced capitals, one word per line, with a short white rule under it.',
      'From 66% to 80% down: the BIG WORD across the full width (3% margins), its base sitting on the photo’s dark gradient.',
      'Directly under it: one line of widely spaced small capitals summarising the story, then a short saffron-white-green rule.',
      'Footer row: the event and place bottom-left in small serif caps; bottom-right a thin white outlined box with "FINAL TIME" (or the stat label) over the number.',
    ],
  },
  phrase: {
    title: 'Medal phrase post',
    layout: [
      'Top 0–60%: the photo of the athlete(s).',
      'From 58% to 78%: the PHRASE in 2 lines, centred, each line filling the width, in metallic gold.',
      'Under it: one spaced line naming the athletes and the event, with a small Indian flag if it is India.',
      'Bottom 15%: two stat columns split by a thin vertical rule — each column: name in small caps, the metal word in its own metal, the number below.',
      'Very bottom: one line of tiny spaced caps with context.',
    ],
  },
  number: {
    title: 'Number / milestone post',
    layout: [
      'Top 5%: the athlete’s name in widely spaced small caps between two hairlines.',
      'From 7% to 28%: the NUMBER in a wide high-contrast serif, metallic gold, filling ~86% of the width.',
      'Under it: the UNIT in white condensed serif capitals, then one spaced line (the kicker) and a short gold rule.',
      'Right/centre from 40% down: the athlete from the photo.',
      'Left column from 50% down: 1–2 supporting numbers in gold serif with small labels under each.',
      'Bottom 10%: a dark bar with a thin gold top border carrying one line of body text or three stats split by rules.',
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
      '"FULL TIME" in spaced caps between hairlines, then a row: real flag of team 1 (rectangle) · the score "X–Y" huge in navy serif · real flag of team 2, separated by thin vertical rules; team names in spaced caps under the flags; scorers with minutes in small serif under each team.',
      'Bottom: the round/group in spaced caps between hairlines, then the handle.',
    ],
  },
  'result-photo': {
    title: 'Result over a photo',
    layout: [
      'Full-bleed photo of the scorer celebrating, right half of the frame.',
      'Top-left: competition in small caps with a hairline running right.',
      'Under it: the HEADLINE in 2 lines of cream serif capitals filling the width.',
      'Left column: one or two lines of serif body (the kicker), a short red rule, then flag + big score for each team stacked, team names in small caps, scorers with minutes in a ruled list.',
      'Badge space bottom-right.',
    ],
  },
  preview: {
    title: 'Match preview — two stars and a cream band',
    layout: [
      'Top 0–70%: the two star players facing each other in front of the stadium, sky visible; "TSB" in bold serif top-centre with the competition in spaced caps under it.',
      'Bottom 33%: a torn-paper cream band with a ragged top edge and painted brush strokes in each team’s colours at its corners.',
      'The HEADLINE in 2 lines of heavy semi-condensed serif: line 1 in white over the photo, line 2 in near-black on the cream.',
      'Under it: flag · thin rule · "VS" · thin rule · flag, team names in spaced caps; then the date, the time (larger) and the venue in small serif caps.',
    ],
  },
  vs: {
    title: 'Cream VS post',
    layout: [
      'Top 62%: cream paper. Real flags of both nations drape in from the left and right edges.',
      'Team 1 name huge in a condensed serif in its team colour, a small italic "vs" in muted gold, team 2 name huge in its team colour — each filling ~84% of the width.',
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

function layoutFor(brand, kind, words, item, template) {
  const strip = String(template || '').replace(/^(tsb|musc)-/, '');
  const table = brand === 'musc' ? MUSC_LAYOUTS : TSB_LAYOUTS;
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
  const isMetalTier = /^medal-(top|bottom)$/.test(key) && parts.length >= 2;
  if (isMetalTier) {
    add('TOP LINE', parts.slice(0, -1).join(' '));
    add('BIG WORD', parts[parts.length - 1].replace(/\.$/, ''));
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
      if (goals.length) add('SCORERS', goals.map((g) => `${g.player.replace(/\s*\(.*\)/, '')} ${g.minute}${g.team ? ` (${g.team})` : ''}`).join(', '));
      if (item.status?.state === 'pre' && when) add('DATE & TIME', when);
      if (item.venue?.name) add('VENUE', [item.venue.name, item.venue.city].filter(Boolean).join(', '));
    }
  }
  for (const st of (words.stats || []).slice(0, 3)) add('STAT', `${st.value} — ${st.label}`);
  for (const p of words.podium || []) add('PODIUM', `${p.name}: ${UP(p.metal)}${p.value ? ' ' + p.value : ''}`);
  if (words.big) add('TOTAL', words.big);
  add('COMPETITION', words.eyebrow);
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
  'Logos and badges: do NOT draw any brand badge, club crest, competition logo or sponsor mark — leave a clean empty circle of about 110px where the badge goes (top-left unless stated); I add the real logo myself.',
  'Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.',
];

// The full prompt. `photo` says whether the owner will attach a real photo.
export function posterPrompt(item, { brand = 'tsb', words = {}, template = '', size = '3:4', when = '', photo = true } = {}) {
  const kind = kindOf(item);
  const w = { ...Object.fromEntries(Object.entries(words).filter(([, v]) => v !== undefined && v !== '')) };
  w.headline ||= headlineFor(item, kind, brand);
  const key = layoutFor(brand, kind, w, item, template);
  const L = (brand === 'musc' ? MUSC_LAYOUTS : TSB_LAYOUTS)[key];
  const info = BRAND_INFO[brand];
  const dims = size === '9:16' ? '1080×1920 (9:16 story)' : size === '4:5' ? '1080×1350 (4:5)' : size === '1:1' ? '1080×1080 (1:1)' : '1080×1440 (3:4, Instagram grid shape)';
  const subject = item.kind === 'news' ? personIn(item.title) || 'the athlete or team in the story' : `${item.home?.name || ''} and ${item.away?.name || ''} players`;
  const story = item.kind === 'news' ? `${clean(item.title)}${item.summary ? ' — ' + clean(item.summary).slice(0, 300) : ''}` : `${item.home?.name} ${item.home?.score ?? ''} – ${item.away?.score ?? ''} ${item.away?.name} · ${item.league?.name || ''}${item.note ? ' · ' + item.note : ''}`;
  const out = [
    `You are the senior designer of ${info.name} (${info.handle}) on Instagram. Design ONE finished post image.`,
    '',
    `STORY (facts only — do not add any): ${story}`,
    `FORMAT: ${dims}, portrait, edge to edge, no border, no mock-up, no phone frame.`,
    '',
    'PHOTO:',
    photo
      ? `• I am attaching a real photo of ${subject}. Use it as the hero image EXACTLY as given: do not redraw, retouch, beautify, age, slim or change the face, body, hair, kit, numbers or logos in it. You may only crop, scale, place, colour-grade and darken it.`
      : `• No photo is attached. Do NOT invent the face of a real person. Use a real-looking scene without a recognisable face: the athlete seen from behind or in silhouette against stadium lights, or a close-up of the equipment (ball, javelin, bat, medal) in the venue, shallow depth of field.`,
    `• If you cannot keep a real person's face unchanged, leave the photo area as a dark neutral placeholder rather than generating a lookalike.`,
    '',
    `LAYOUT — ${L.title}:`,
    ...L.layout.map((x) => `• ${x}`),
    '',
    'TEXT (exact words, exact spelling — nothing else):',
    ...textLines(brand, key, w, item, when).map((x) => `• ${x}`),
    '',
    'LOOK:',
    ...(brand === 'musc' ? MUSC_LOOK : TSB_LOOK).map((x) => `• ${x}`),
    '',
    'MUST NOT LOOK AI-GENERATED:',
    ...NOT_AI.map((x) => `• ${x}`),
    '',
    'BEFORE YOU FINISH, CHECK: every word matches the TEXT list letter for letter; no extra text; faces untouched; hands and numbers correct; the badge circle is empty; nothing is cropped at the edges.',
  ];
  return out.join('\n');
}

// A short follow-up the owner can paste if the first image is off.
export const FIX_PROMPT = 'Keep the layout. Fix only: (1) any word that differs from the TEXT list, (2) any change to the real photo — put it back exactly as attached, (3) anything that looks AI-made (glow, plastic skin, extra objects, fake logos). Return the corrected image at the same size.';
