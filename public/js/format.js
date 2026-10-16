// Shared between the browser and the API functions: turns a normalized match
// object into copy-ready "codes" (plain text, Markdown, JSON, embed, API URL).

export const SPORTS = {
  soccer: { label: 'Football', emoji: '⚽' },
  cricket: { label: 'Cricket', emoji: '🏏' },
  basketball: { label: 'Basketball', emoji: '🏀' },
  football: { label: 'American Football', emoji: '🏈' },
  baseball: { label: 'Baseball', emoji: '⚾' },
  hockey: { label: 'Ice Hockey', emoji: '🏒' },
  tennis: { label: 'Tennis', emoji: '🎾' },
  golf: { label: 'Golf', emoji: '⛳' },
  racing: { label: 'Motorsport', emoji: '🏎️' },
  combat: { label: 'MMA & Boxing', emoji: '🥊' },
  rugby: { label: 'Rugby', emoji: '🏉' },
  other: { label: 'Other', emoji: '🏅' },
};

export const FORMATS = [
  { id: 'text', label: 'Text' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'json', label: 'JSON' },
  { id: 'embed', label: 'HTML Embed' },
  { id: 'api', label: 'Live API' },
];

export const sportOf = (key) => SPORTS[key] || SPORTS.other;

export function statusLabel(m) {
  const s = m.status || {};
  if (s.state === 'in') return `LIVE${s.short ? ' · ' + s.short : ''}`;
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
    `Date: ${formatDate(m.date, opts.timeZone || 'UTC')}`,
  ];
  const v = venueLine(m);
  if (v) lines.push(`Venue: ${v}`);
  const ev = eventLines(m);
  if (ev.length) lines.push('Key events:', ...ev.map((e) => '  • ' + e));
  const ld = leaderLines(m);
  if (ld.length) lines.push('Leaderboard:', ...ld.map((e) => '  ' + e));
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

export function formatMatch(m, fmt, opts = {}) {
  switch (fmt) {
    case 'markdown': return toMarkdown(m, opts);
    case 'json': return toJSON(m);
    case 'embed': return toEmbed(m, opts);
    case 'api': return apiUrl(m, opts.siteUrl || '');
    default: return toText(m, opts);
  }
}
