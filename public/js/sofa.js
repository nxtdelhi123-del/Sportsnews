// Sofascore: the parts that don't care where they run. The server (lib/sofa.js)
// and the browser (js/app.js) both use these. Sofascore refuses datacenter IPs
// with a 403, so when the server can't reach it the visitor's browser asks
// Sofascore directly and merges the answer into the page.

// Our sport key → Sofascore sport slug.
export const SOFA_SPORTS = {
  soccer: 'football',
  cricket: 'cricket',
  basketball: 'basketball',
  tennis: 'tennis',
  hockey: 'ice-hockey',
  football: 'american-football',
  baseball: 'baseball',
  rugby: 'rugby',
  combat: 'mma',
  handball: 'handball',
  volleyball: 'volleyball',
  tabletennis: 'table-tennis',
  badminton: 'badminton',
  esports: 'esports',
  darts: 'darts',
  snooker: 'snooker',
  futsal: 'futsal',
  aussierules: 'aussie-rules',
  waterpolo: 'waterpolo',
  floorball: 'floorball',
  beachvolley: 'beach-volley',
  bandy: 'bandy',
};
export const SOFA_SLUGS = new Set(Object.values(SOFA_SPORTS));
export const SPORT_BY_SOFA = Object.fromEntries(Object.entries(SOFA_SPORTS).map(([k, v]) => [v, k]));

// Hosts that answer the same /api/v1 paths. The browser can only use the ones that
// allow cross-origin reads; the server tries them all.
export const SOFA_HOSTS = ['https://www.sofascore.com/api/v1', 'https://api.sofascore.app/api/v1', 'https://api.sofascore.com/api/v1'];
export const SOFA_BROWSER_HOSTS = ['https://api.sofascore.com/api/v1', 'https://api.sofascore.app/api/v1', 'https://www.sofascore.com/api/v1'];

const DAY = 86_400_000;
const ymd = (t) => new Date(t).toISOString().slice(0, 10);

export const sofaLivePath = (slug) => `/sport/${slug}/events/live`;
// Everything for one sport from yesterday to tomorrow (UTC), plus whatever is live.
export const sofaSportPaths = (slug, now = Date.now()) => [sofaLivePath(slug), ...[-1, 0, 1].map((d) => `/sport/${slug}/scheduled-events/${ymd(now + d * DAY)}`)];

const SET_SPORTS = new Set(['tennis', 'volleyball', 'beach-volley', 'badminton', 'table-tennis', 'snooker', 'darts']);
const STATE = { inprogress: 'in', notstarted: 'pre', finished: 'post', afterextra: 'post', afterpenalties: 'post' };

function team(t = {}, score = {}, slug) {
  const periods = SET_SPORTS.has(slug)
    ? ['period1', 'period2', 'period3', 'period4', 'period5'].map((p) => score[p]).filter((v) => v !== undefined && v !== null)
    : [];
  const shown = score.display ?? score.current;
  return {
    id: String(t.id ?? ''),
    name: t.name || 'TBD',
    short: t.shortName || t.name || '',
    abbr: t.nameCode || '',
    logo: t.id ? `https://img.sofascore.com/api/v1/team/${t.id}/image` : '',
    score: shown === undefined || shown === null ? '' : String(shown),
    linescores: periods.map(String),
    color: t.teamColors?.primary || '',
    altColor: t.teamColors?.secondary || '',
    country: t.country?.name || '',
  };
}

function liveClock(e, slug, now) {
  const start = e.time?.currentPeriodStartTimestamp;
  if (slug !== 'football' || !start) return '';
  const desc = (e.status?.description || '').toLowerCase();
  const base = desc.startsWith('1st') ? 0 : desc.startsWith('2nd') ? 45 : desc.includes('extra') ? 90 : null;
  if (base === null) return '';
  const mins = Math.floor((now / 1000 - start) / 60) + 1 + base;
  const cap = base + (base >= 90 ? 15 : 45);
  return mins > cap ? `${cap}+'` : `${Math.max(base + 1, mins)}'`;
}

export function normalizeSofa(e, slug, now = Date.now()) {
  if (!e?.homeTeam || !e?.awayTeam) return null;
  const sport = SPORT_BY_SOFA[slug] || 'other';
  const type = e.status?.type || '';
  const state = STATE[type] || (type === 'postponed' || type === 'canceled' || type === 'interrupted' ? 'post' : 'pre');
  const desc = e.status?.description || '';
  const clock = state === 'in' ? liveClock(e, slug, now) : '';
  const home = team(e.homeTeam, e.homeScore, slug);
  const away = team(e.awayTeam, e.awayScore, slug);
  if (e.winnerCode === 1) home.winner = true;
  if (e.winnerCode === 2) away.winner = true;
  const t = e.tournament || {};
  const ut = t.uniqueTournament || {};
  const country = t.category?.name || '';
  const comp = ut.name || t.name || 'Other';
  const short = state === 'in' ? [clock, desc].filter(Boolean).join(' · ') : state === 'post' ? (desc === 'Ended' ? 'FT' : desc) : desc;
  return {
    id: String(e.id),
    source: 'sofascore',
    sport,
    kind: 'versus',
    league: {
      path: `sofa/${slug}`,
      name: comp,
      country: country && !comp.toLowerCase().includes(country.toLowerCase()) ? country : '',
      priority: (ut.userCount ? Math.min(Math.log10(ut.userCount + 1) * 100, 900) : 0) + (t.priority || 0),
    },
    name: `${home.name} vs ${away.name}`,
    date: e.startTimestamp ? new Date(e.startTimestamp * 1000).toISOString() : '',
    status: { state, detail: desc, short: short || desc, clock, completed: state === 'post' },
    note: [e.roundInfo?.name || (e.roundInfo?.round ? `Round ${e.roundInfo.round}` : ''), t.name && t.name !== comp ? t.name : ''].filter(Boolean).join(' · '),
    link: e.slug && e.customId ? `https://www.sofascore.com/${e.slug}/${e.customId}#id:${e.id}` : '',
    home,
    away,
  };
}

// Normalize the event lists of several responses for one sport: de-duplicated, and
// only what is live or within yesterday→tomorrow.
export function collectSofa(lists, slug, now = Date.now()) {
  const seen = new Set();
  const out = [];
  for (const events of lists) {
    for (const e of events || []) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      const m = normalizeSofa(e, slug, now);
      if (!m) continue;
      const t = Date.parse(m.date);
      if (m.status.state === 'in' || (t > now - 30 * 3600_000 && t < now + 36 * 3600_000)) out.push(m);
    }
  }
  return out;
}

// ---------- full match details (for copy / poster) ----------
function incidentText(i, home, away) {
  const side = i.isHome === true ? home : i.isHome === false ? away : '';
  const minute = i.time !== undefined ? `${i.time}${i.addedTime ? '+' + i.addedTime : ''}'` : '';
  switch (i.incidentType) {
    case 'goal': {
      const kind = i.incidentClass === 'ownGoal' ? 'Own goal' : i.incidentClass === 'penalty' ? 'Penalty goal' : 'Goal';
      const assist = i.assist1?.name ? ` (assist ${i.assist1.name})` : '';
      return { minute, type: kind, player: `${i.player?.name || i.playerName || ''}${assist}`, team: side, score: i.homeScore !== undefined ? `${i.homeScore}-${i.awayScore}` : '' };
    }
    case 'card':
      return { minute, type: i.incidentClass === 'red' || i.incidentClass === 'yellowRed' ? 'Red card' : 'Yellow card', player: i.player?.name || i.playerName || '', team: side };
    case 'substitution':
      return { minute, type: 'Substitution', player: `${i.playerIn?.name || ''} ⇄ ${i.playerOut?.name || ''}`, team: side };
    case 'varDecision':
      return { minute, type: 'VAR', player: i.player?.name || '', team: side };
    case 'period':
      return i.text ? { minute: '', type: i.text, player: i.homeScore !== undefined ? `${i.homeScore}-${i.awayScore}` : '', team: '' } : null;
    default:
      return null;
  }
}

// `get(path)` resolves with the JSON of one /api/v1 path, wherever the request is made from.
export async function buildSofaMatch(get, slug, id, now = Date.now()) {
  const [ev, inc, stats, lineups] = await Promise.allSettled([get(`/event/${id}`), get(`/event/${id}/incidents`), get(`/event/${id}/statistics`), get(`/event/${id}/lineups`)]);
  if (ev.status !== 'fulfilled' || !ev.value?.event) return null;
  const e = ev.value.event;
  const m = normalizeSofa(e, slug, now);
  if (!m) return null;
  const v = e.venue || {};
  m.venue = { name: v.stadium?.name || v.name || '', city: v.city?.name || '', country: v.country?.name || '' };
  const d = {};
  if (v.stadium?.capacity) d.capacity = v.stadium.capacity;
  if (e.attendance) d.attendance = e.attendance;
  if (e.referee?.name) d.officials = [`Referee: ${e.referee.name}${e.referee.country?.name ? ` (${e.referee.country.name})` : ''}`];
  if (e.season?.name) d.season = e.season.name;
  if (e.homeTeam?.manager?.name || e.awayTeam?.manager?.name) d.managers = [e.homeTeam?.manager?.name, e.awayTeam?.manager?.name];

  if (inc.status === 'fulfilled') {
    m.events = (inc.value.incidents || [])
      .slice()
      .reverse()
      .sort((x, y) => (x.time ?? 0) + (x.addedTime ?? 0) / 100 - ((y.time ?? 0) + (y.addedTime ?? 0) / 100))
      .map((i) => incidentText(i, m.home.name, m.away.name))
      .filter(Boolean)
      .slice(0, 60);
  }
  if (stats.status === 'fulfilled') {
    const all = (stats.value.statistics || []).find((s) => s.period === 'ALL') || stats.value.statistics?.[0];
    const rows = (all?.groups || []).flatMap((g) => g.statisticsItems || []);
    d.stats = rows.slice(0, 18).map((r) => ({ label: r.name, home: String(r.home ?? ''), away: String(r.away ?? '') }));
  }
  if (lineups.status === 'fulfilled' && lineups.value.home) {
    const side = (s, name) => ({
      team: name,
      formation: s.formation || '',
      starters: (s.players || []).filter((p) => !p.substitute).map((p) => [p.shirtNumber ?? p.jerseyNumber, p.player?.name].filter((x) => x !== undefined && x !== '').join(' ')).slice(0, 15),
    });
    d.lineups = [side(lineups.value.home, m.home.name), side(lineups.value.away, m.away.name)].filter((l) => l.starters.length);
  }
  m.details = d;
  return m;
}

// Run fn over items, at most `limit` at a time; allSettled-style results.
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = { status: 'fulfilled', value: await fn(items[i], i) };
      } catch (reason) {
        out[i] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
