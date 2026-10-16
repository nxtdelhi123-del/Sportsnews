// Sofascore's public JSON API: every match worldwide, for 20+ sports.
import { SPORT_BY_SOFA } from './sources.js';
import { blockFor, blockedFor, fetchWithTimeout, memoize, pool } from './http.js';

const HOSTS = ['https://api.sofascore.com/api/v1', 'https://www.sofascore.com/api/v1'];
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-GB,en;q=0.9',
  Origin: 'https://www.sofascore.com',
  Referer: 'https://www.sofascore.com/',
  'Cache-Control': 'no-cache',
};
const DAY = 86_400_000;

// Try each host in turn: one may be rate-limited or blocked when the other isn't.
// After a 403 (bot protection) Sofascore is left alone for 30 minutes.
export async function sofaGet(path, timeout = 8000) {
  const mins = blockedFor('sofascore');
  if (mins) throw Object.assign(new Error(`HTTP 403 (blocked here, next try in ${mins} min)`), { status: 403 });
  let err;
  for (const host of HOSTS) {
    try {
      return await fetchWithTimeout(host + path, { headers: HEADERS, timeout, retries: 0 });
    } catch (e) {
      err = e;
      if (e.status === 404) break;
    }
  }
  if (err?.status === 403) blockFor('sofascore', 30 * 60_000);
  throw err;
}

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

const ymd = (t) => new Date(t).toISOString().slice(0, 10);

function sofaList(path, ttl) {
  return memoize(`sofa:${path}`, ttl, async () => (await sofaGet(path)).events || []);
}

// Everything for one sport from yesterday to tomorrow (UTC), plus whatever is live.
export async function fetchSofaSport(slug, now = Date.now()) {
  const paths = [`/sport/${slug}/events/live`, ...[-1, 0, 1].map((d) => `/sport/${slug}/scheduled-events/${ymd(now + d * DAY)}`)];
  const results = await pool(paths, 4, (p) => sofaList(p, p.includes('/live') ? 2 * 60_000 : 4 * 60_000));
  if (results.every((r) => r.status === 'rejected')) throw results[0].reason;
  const seen = new Set();
  const out = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const e of r.value) {
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

export async function fetchSofaLive(slug, now = Date.now()) {
  return (await sofaList(`/sport/${slug}/events/live`, 2 * 60_000)).map((e) => normalizeSofa(e, slug, now)).filter(Boolean);
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

export async function sofaMatch(slug, id, now = Date.now()) {
  const [ev, inc, stats, lineups] = await Promise.allSettled([
    sofaGet(`/event/${id}`),
    sofaGet(`/event/${id}/incidents`),
    sofaGet(`/event/${id}/statistics`),
    sofaGet(`/event/${id}/lineups`),
  ]);
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
