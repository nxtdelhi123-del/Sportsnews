// Shared between the browser and the API functions: turns a normalized match
// object into copy-ready "codes" (AI poster brief, text, Markdown, JSON, embed, API URL).

// Order here is the order of the sport chips on the site.
export const SPORTS = {
  soccer: { label: 'Football', emoji: '⚽' },
  cricket: { label: 'Cricket', emoji: '🏏' },
  basketball: { label: 'Basketball', emoji: '🏀' },
  tennis: { label: 'Tennis', emoji: '🎾' },
  football: { label: 'American Football', emoji: '🏈' },
  baseball: { label: 'Baseball', emoji: '⚾' },
  hockey: { label: 'Ice Hockey', emoji: '🏒' },
  racing: { label: 'Motorsport', emoji: '🏎️' },
  combat: { label: 'MMA & Boxing', emoji: '🥊' },
  rugby: { label: 'Rugby', emoji: '🏉' },
  golf: { label: 'Golf', emoji: '⛳' },
  kabaddi: { label: 'Kabaddi', emoji: '🤼' },
  fieldhockey: { label: 'Field Hockey', emoji: '🏑' },
  badminton: { label: 'Badminton', emoji: '🏸' },
  tabletennis: { label: 'Table Tennis', emoji: '🏓' },
  volleyball: { label: 'Volleyball', emoji: '🏐' },
  beachvolley: { label: 'Beach Volleyball', emoji: '🏖️' },
  handball: { label: 'Handball', emoji: '🤾' },
  futsal: { label: 'Futsal', emoji: '🥅' },
  esports: { label: 'Esports', emoji: '🎮' },
  darts: { label: 'Darts', emoji: '🎯' },
  snooker: { label: 'Snooker', emoji: '🎱' },
  aussierules: { label: 'Aussie Rules', emoji: '🦘' },
  waterpolo: { label: 'Water Polo', emoji: '🤽' },
  floorball: { label: 'Floorball', emoji: '🏒' },
  bandy: { label: 'Bandy', emoji: '🏒' },
  athletics: { label: 'Athletics', emoji: '🏃' },
  cycling: { label: 'Cycling', emoji: '🚴' },
  chess: { label: 'Chess', emoji: '♟️' },
  shooting: { label: 'Shooting', emoji: '🎯' },
  archery: { label: 'Archery', emoji: '🏹' },
  squash: { label: 'Squash', emoji: '🎾' },
  wrestling: { label: 'Wrestling', emoji: '🤼' },
  weightlifting: { label: 'Weightlifting', emoji: '🏋️' },
  swimming: { label: 'Swimming', emoji: '🏊' },
  other: { label: 'Other', emoji: '🏅' },
};

// Sports we only have headlines for (no global live-score source).
export const NEWS_ONLY = new Set(['kabaddi', 'fieldhockey', 'athletics', 'cycling', 'chess', 'shooting', 'archery', 'squash', 'wrestling', 'weightlifting', 'swimming', 'other']);

export const FORMATS = [
  { id: 'poster', label: 'AI Poster / Video' },
  { id: 'text', label: 'Text' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'json', label: 'JSON' },
  { id: 'embed', label: 'HTML Embed' },
  { id: 'api', label: 'Live API' },
];

export const sportOf = (key) => SPORTS[key] || SPORTS.other;

export const TIER_LABELS = { vimp: 'VIMP', imp: 'IMP', low: 'Not important' };
export const tierLine = (m) => (m.tier ? `${TIER_LABELS[m.tier] || m.tier}${m.tierReason ? ` (${m.tierReason})` : ''}` : '');

export function statusLabel(m) {
  const s = m.status || {};
  if (s.state === 'in') return `LIVE${s.short && !/^(live|in progress)$/i.test(s.short.trim()) ? ' · ' + s.short : ''}`;
  if (s.state === 'post') return s.short || s.detail || 'Final';
  // ESPN's pre-match detail is in US Eastern time; the date line carries the real time.
  const d = `${s.short} ${s.detail}`;
  return /postpon|cancel|delay|suspend|abandon/i.test(d) ? s.short || s.detail : 'Scheduled';
}

export function formatDate(iso, timeZone) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' };
  if (timeZone) opts.timeZone = timeZone;
  try {
    return new Intl.DateTimeFormat('en-GB', opts).format(d);
  } catch {
    return d.toISOString();
  }
}

const hasScore = (t) => t && t.score !== '' && t.score !== null && t.score !== undefined;

export function scoreline(m) {
  if (m.kind === 'field') return m.name;
  const h = m.home || {};
  const a = m.away || {};
  const hs = sideScore(h);
  const as = sideScore(a);
  if (m.status?.state !== 'pre' && (hs || as)) return `${h.name} ${hs || '-'} – ${as || '-'} ${a.name}`;
  return `${h.name} vs ${a.name}`;
}

function sideScore(t) {
  if (hasScore(t)) return String(t.score);
  if (t?.linescores?.length) return t.linescores.join(' ');
  return '';
}

function venueLine(m) {
  const v = m.venue || {};
  return [v.name, v.city, v.country].filter(Boolean).join(', ');
}

function eventLines(m) {
  return (m.events || []).slice(0, 20).map((e) => `${e.minute ? e.minute + ' ' : ''}${e.type}${e.player ? ': ' + e.player : ''}${e.team ? ' (' + e.team + ')' : ''}`);
}

function statLines(m) {
  return (m.details?.stats || []).filter((x) => x.home !== '' || x.away !== '').map((x) => `${x.label}: ${x.home} – ${x.away}`);
}

function inningsLines(m) {
  return (m.details?.innings || []).map((i) => [`${i.team}${i.total ? ' ' + i.total : ''}`, i.topBatters?.length ? `bat: ${i.topBatters.join(', ')}` : '', i.topBowlers?.length ? `bowl: ${i.topBowlers.join(', ')}` : ''].filter(Boolean).join(' | '));
}

function leaderLines(m) {
  return (m.leaders || []).slice(0, 10).map((l, i) => `${l.position || i + 1}. ${l.name}${l.score ? ' ' + l.score : ''}`);
}

export function apiUrl(m, siteUrl = '', fmt = 'json') {
  return `${siteUrl}/api/match?l=${encodeURIComponent(m.league?.path || '')}&id=${encodeURIComponent(m.id)}${fmt !== 'json' ? '&format=' + fmt : ''}`;
}

export function embedUrl(m, siteUrl = '') {
  return `${siteUrl}/embed?l=${encodeURIComponent(m.league?.path || '')}&id=${encodeURIComponent(m.id)}`;
}

export function toText(m, opts = {}) {
  const sp = sportOf(m.sport);
  const lines = [
    `${sp.emoji} ${m.league?.name || sp.label}${m.note ? ' — ' + m.note : ''}`,
    scoreline(m),
    `Status: ${statusLabel(m)}`,
    ...(m.tier ? [`Importance: ${tierLine(m)}`] : []),
    `Date: ${formatDate(m.date, opts.timeZone || 'UTC')}`,
  ];
  const v = venueLine(m);
  if (v) lines.push(`Venue: ${v}`);
  const ev = eventLines(m);
  if (ev.length) lines.push('Key events:', ...ev.map((e) => '  • ' + e));
  const ld = leaderLines(m);
  if (ld.length) lines.push('Leaderboard:', ...ld.map((e) => '  ' + e));
  const inn = inningsLines(m);
  if (inn.length) lines.push('Innings:', ...inn.map((e) => '  • ' + e));
  if (m.details?.playerOfTheMatch) lines.push(`Player of the match: ${m.details.playerOfTheMatch}`);
  if (m.headline) lines.push(`Summary: ${m.headline}`);
  if (m.broadcasts?.length) lines.push(`TV: ${m.broadcasts.join(', ')}`);
  if (m.link) lines.push(`More: ${m.link}`);
  if (opts.siteUrl) lines.push(`via NXT Sports · ${opts.siteUrl}`);
  return lines.join('\n');
}

export function toMarkdown(m, opts = {}) {
  const sp = sportOf(m.sport);
  const out = [`### ${sp.emoji} ${scoreline(m)}`, '', `**${m.league?.name || sp.label}**${m.note ? ' · ' + m.note : ''} · **${statusLabel(m)}**`, ''];
  out.push(`- **Date:** ${formatDate(m.date, opts.timeZone || 'UTC')}`);
  const v = venueLine(m);
  if (v) out.push(`- **Venue:** ${v}`);
  if (m.broadcasts?.length) out.push(`- **TV:** ${m.broadcasts.join(', ')}`);
  const ev = eventLines(m);
  if (ev.length) out.push('', '**Key events**', ...ev.map((e) => `- ${e}`));
  const ld = leaderLines(m);
  if (ld.length) out.push('', '**Leaderboard**', ...ld.map((e) => `- ${e}`));
  if (m.headline) out.push('', `> ${m.headline}`);
  if (m.link) out.push('', `[Full match centre](${m.link})`);
  if (opts.siteUrl) out.push('', `_via [NXT Sports](${opts.siteUrl})_`);
  return out.join('\n');
}

export function toJSON(m) {
  const { home, away, ...rest } = m;
  const clean = { ...rest };
  if (m.kind !== 'field') Object.assign(clean, { home, away, scoreline: scoreline(m) });
  return JSON.stringify(clean, null, 2);
}

export function toEmbed(m, opts = {}) {
  const src = embedUrl(m, opts.siteUrl || '');
  const title = scoreline(m).replace(/"/g, '&quot;');
  return `<iframe src="${src}" title="${title}" width="100%" height="230" style="border:0;border-radius:12px;max-width:520px" loading="lazy"></iframe>`;
}

// ---------- AI poster / video brief ----------
const num = (v) => (/^\d+$/.test(String(v ?? '').trim()) ? Number(v) : NaN);

export function resultLine(m) {
  const s = m.status || {};
  if (m.kind === 'field') {
    const lead = m.leaders?.[0];
    return lead ? `${s.state === 'post' ? 'Winner' : 'Leader'}: ${lead.name}${lead.score ? ' (' + lead.score + ')' : ''}` : m.name;
  }
  const h = m.home || {};
  const a = m.away || {};
  const hs = sideScore(h);
  const as = sideScore(a);
  if (s.state === 'pre') return `Upcoming: ${h.name} vs ${a.name}${/postpon|cancel/i.test(s.detail || '') ? ` (${s.detail})` : ''}`;
  const hn = num(h.score);
  const an = num(a.score);
  const numeric = !Number.isNaN(hn) && !Number.isNaN(an);
  if (s.state === 'in') {
    const where = s.clock || s.short || s.detail || '';
    if (!numeric) return `Live: ${h.name} ${hs} – ${as} ${a.name}${where ? ' (' + where + ')' : ''}`;
    const lead = hn === an ? `${h.name} and ${a.name} level at ${hn}–${an}` : hn > an ? `${h.name} lead ${a.name} ${hn}–${an}` : `${a.name} lead ${h.name} ${an}–${hn}`;
    return `Live: ${lead}${where ? ' (' + where + ')' : ''}`;
  }
  if (!numeric || m.sport === 'cricket') return s.detail && !/^(ft|final|ended)$/i.test(s.detail) ? s.detail : `${h.name} ${hs} – ${as} ${a.name}`;
  if (h.winner || (!a.winner && hn > an)) return `${h.name} beat ${a.name} ${hn}–${an}`;
  if (a.winner || an > hn) return `${a.name} beat ${h.name} ${an}–${hn}`;
  return `Draw: ${h.name} ${hn}–${an} ${a.name}`;
}

function bothTimes(iso, timeZone) {
  const local = formatDate(iso, timeZone);
  const utc = formatDate(iso, 'UTC');
  return timeZone && timeZone !== 'UTC' && local !== utc ? `${local}  |  ${utc}` : utc;
}

export function toPoster(m, opts = {}) {
  const sp = sportOf(m.sport);
  const d = m.details || {};
  const s = m.status || {};
  const L = [];
  const comp = [m.league?.name, m.league?.country ? `(${m.league.country})` : '', m.note ? `· ${m.note}` : ''].filter(Boolean).join(' ');
  const statusWord = s.state === 'in' ? `LIVE${s.clock ? ' · ' + s.clock : ''}${s.detail && s.detail !== s.clock ? ' · ' + s.detail : ''}` : s.state === 'post' ? (s.detail && !/^(ended|final|ft)$/i.test(s.detail) ? `FULL TIME · ${s.detail}` : 'FULL TIME') : statusLabel(m).toUpperCase();
  L.push('🏆 MATCH DETAILS — for poster / video', '━━━━━━━━━━━━━━━━━━━━━━━━');
  L.push(`SPORT: ${sp.label} ${sp.emoji}`);
  L.push(`COMPETITION: ${comp}`);
  if (d.season) L.push(`SEASON: ${d.season}`);
  L.push(`STATUS: ${statusWord}`);
  if (m.tier) L.push(`IMPORTANCE: ${tierLine(m)}`);
  L.push(`DATE & TIME: ${bothTimes(m.date, opts.timeZone)}`);
  const v = venueLine(m);
  if (v) L.push(`VENUE: ${v}${d.capacity ? ` (capacity ${Number(d.capacity).toLocaleString('en')})` : ''}${d.attendance ? ` · attendance ${Number(d.attendance).toLocaleString('en')}` : ''}`);
  L.push('');
  if (m.kind === 'field') {
    L.push(`EVENT: ${m.name}`);
    const ld = leaderLines(m);
    if (ld.length) L.push('LEADERBOARD:', ...ld.map((x) => '  ' + x));
  } else {
    const h = m.home || {};
    const a = m.away || {};
    const sideLine = (label, t) => `${label}: ${t.name}${t.abbr ? ` (${t.abbr})` : ''}${s.state !== 'pre' && sideScore(t) ? ` — ${sideScore(t)}` : ''}${t.record ? ` [record ${t.record}]` : ''}`;
    L.push(sideLine('HOME', h), sideLine('AWAY', a));
    if (h.linescores?.length && hasScore(h)) L.push(`BY PERIOD/SET: ${h.name} ${h.linescores.join(' ')} | ${a.name} ${(a.linescores || []).join(' ')}`);
    L.push(`RESULT: ${resultLine(m)}`);
    if (d.managers?.some(Boolean)) L.push(`COACHES: ${h.name}: ${d.managers[0] || '-'} | ${a.name}: ${d.managers[1] || '-'}`);
  }
  if (d.toss) L.push(`TOSS: ${d.toss}`);
  const inn = inningsLines(m);
  if (inn.length) L.push('', 'INNINGS:', ...inn.map((x) => '• ' + x));
  if (d.playerOfTheMatch) L.push(`PLAYER OF THE MATCH: ${d.playerOfTheMatch}`);
  const ev = (m.events || []).filter((e) => e.type !== 'Substitution');
  if (ev.length) L.push('', 'KEY MOMENTS:', ...ev.slice(0, 25).map((e) => `• ${e.minute ? e.minute + ' ' : ''}${e.type}${e.player ? ' — ' + e.player : ''}${e.team ? ` (${e.team})` : ''}${e.score ? ` [${e.score}]` : ''}`));
  const st = statLines(m);
  if (st.length) L.push('', `MATCH STATS (${m.home?.name} – ${m.away?.name}):`, ...st.map((x) => '• ' + x));
  if (d.lineups?.length) L.push('', 'LINE-UPS:', ...d.lineups.map((l) => `${l.team}${l.formation ? ` (${l.formation})` : ''}: ${l.starters.join(', ')}`));
  if (d.playerLeaders?.length) L.push('', 'TOP PERFORMERS:', ...d.playerLeaders.map((x) => '• ' + x));
  if (d.officials?.length) L.push(`OFFICIALS: ${d.officials.join('; ')}`);
  if (m.broadcasts?.length) L.push(`TV / STREAM: ${m.broadcasts.join(', ')}`);
  if (m.headline) L.push(`HEADLINE: ${m.headline}`);
  if (d.recap) L.push(`RECAP: ${d.recap}`);
  const colours = [m.home, m.away].filter((t) => t?.color).map((t) => `${t.name}: ${t.color}${t.altColor ? ' / ' + t.altColor : ''}`);
  if (colours.length) L.push('', `TEAM COLOURS: ${colours.join(' | ')}`);
  const logos = [m.home, m.away].filter((t) => t?.logo).map((t) => `${t.name}: ${t.logo}`);
  if (logos.length) L.push(`LOGOS: ${logos.join(' | ')}`);
  if (m.link) L.push(`SOURCE: ${m.link}`);

  // Ready-made prompt for an image / video AI.
  const kind = s.state === 'post' ? 'full-time result poster' : s.state === 'in' ? 'live score update graphic' : 'match-day preview poster';
  const headline = m.kind === 'field' ? `${m.name}: ${resultLine(m)}` : s.state === 'pre' ? `${m.home?.name} vs ${m.away?.name}` : scoreline(m);
  const moments = ev.filter((e) => /goal|try|touchdown|wicket|ko|knockout|red/i.test(e.type)).slice(0, 4).map((e) => `${e.minute ? e.minute + ' ' : ''}${e.player || e.type}`);
  const colourHint = colours.length ? `Use the team colours (${colours.join('; ')})` : 'Use bold colours that suit both sides';
  const when = s.state === 'pre' ? ` Show the kick-off time (${formatDate(m.date, opts.timeZone || 'UTC')})${v ? ` and venue (${v})` : ''}.` : v ? ` Show the venue (${v}) and date in small type.` : '';
  L.push(
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    '🎨 PROMPT FOR AI (poster / video):',
    `Create a bold, high-energy ${sp.label.toLowerCase()} ${kind} for "${headline}" in the ${m.league?.name || sp.label}. ` +
      `${s.state === 'pre' ? 'Put both team names and crests face to face with a big "VS".' : 'Put the score in huge type at the centre with both team names and crests on either side.'} ` +
      `Add the competition name${m.note ? ` (${m.note})` : ''} at the top.${when} ` +
      `${moments.length ? `Highlight: ${moments.join(', ')}. ` : ''}` +
      `${colourHint}, dramatic stadium lighting and motion streaks. Add a small "NXT Sports" badge in a corner (black, chrome silver and red). ` +
      'Poster: 1080×1350 (Instagram portrait). Video: 15-second vertical reel (1080×1920): score reveal, key moments as quick cuts, end card "NXT Sports".',
  );
  if (opts.siteUrl) L.push('', `via NXT Sports · ${opts.siteUrl}`);
  return L.join('\n');
}

export function newsPoster(n, opts = {}) {
  const sp = sportOf(n.sport);
  return [
    '📰 NEWS DETAILS — for poster / video',
    '━━━━━━━━━━━━━━━━━━━━━━━━',
    `SPORT: ${sp.label} ${sp.emoji}`,
    n.tier ? `IMPORTANCE: ${TIER_LABELS[n.tier]}` : '',
    `HEADLINE: ${n.title}`,
    n.summary ? `SUMMARY: ${n.summary}` : '',
    `SOURCE: ${n.source}${n.published ? ' · ' + formatDate(n.published, opts.timeZone || 'UTC') : ''}`,
    n.image ? `IMAGE: ${n.image}` : '',
    `LINK: ${n.link}`,
    '',
    '🎨 PROMPT FOR AI (poster / video):',
    `Create a striking "BREAKING ${sp.label.toUpperCase()} NEWS" social poster for the headline "${n.title}". Large headline text, a dramatic ${sp.label.toLowerCase()} action background, a red "BREAKING" tag and a small "NXT Sports" badge (black, chrome silver and red). Poster 1080×1350; video version: 10-second vertical reel (1080×1920) with the headline animating in.`,
  ]
    .filter((x) => x !== '')
    .join('\n');
}

export function formatMatch(m, fmt, opts = {}) {
  switch (fmt) {
    case 'poster': return toPoster(m, opts);
    case 'markdown': return toMarkdown(m, opts);
    case 'json': return toJSON(m);
    case 'embed': return toEmbed(m, opts);
    case 'api': return apiUrl(m, opts.siteUrl || '');
    default: return toText(m, opts);
  }
}
