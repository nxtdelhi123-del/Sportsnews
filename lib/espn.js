import { LEAGUE_BY_PATH } from './sources.js';
import { errorText, fetchWithTimeout, memoize, pool } from './http.js';

// Two hosts serve the same API; if one refuses us the other usually doesn't.
const HOSTS = ['https://site.api.espn.com/apis/site/v2/sports', 'https://site.web.api.espn.com/apis/site/v2/sports'];
const BASE = HOSTS[0];
const DAY = 86_400_000;

const ymd = (t) => new Date(t).toISOString().slice(0, 10).replace(/-/g, '');

// ESPN rejects date ranges (HTTP 400) but accepts one day at a time, so a
// team-sport league is fetched as three single-day requests.
export function scoreboardUrl(league, day = null, host = BASE) {
  const qs = new URLSearchParams({ limit: '300' });
  if (league.range && day) qs.set('dates', ymd(day));
  return `${host}/${league.path}/scoreboard?${qs}`;
}

export const scoreboardUrls = (league, now = Date.now(), host = BASE) => (league.range ? [-DAY, 0, DAY].map((d) => scoreboardUrl(league, now + d, host)) : [scoreboardUrl(league, null, host)]);

// GET a path on whichever host answers.
export async function espnGet(path, opts) {
  let err;
  for (const host of HOSTS) {
    try {
      return await fetchWithTimeout(`${host}/${path}`, opts);
    } catch (e) {
      err = e;
      if (e.status === 404 || e.status === 400) break;
    }
  }
  throw err;
}

// One league's scoreboard for yesterday→tomorrow. 400/404 means ESPN doesn't know
// the league: the caller treats that as empty.
export async function fetchScoreboard(league, now = Date.now()) {
  const opts = { timeout: 6000 };
  let err;
  for (const host of HOSTS) {
    try {
      const days = await Promise.all(scoreboardUrls(league, now, host).map((u) => fetchWithTimeout(u, opts)));
      return { events: days.flatMap((x) => x?.events || []) };
    } catch (e) {
      err = e;
      if (e.status === 404 || e.status === 400) break;
    }
  }
  throw err;
}

function side(c = {}) {
  const t = c.team || c.athlete || {};
  const score = typeof c.score === 'object' && c.score !== null ? c.score.displayValue ?? c.score.value : c.score;
  return {
    id: String(c.id ?? t.id ?? ''),
    name: t.displayName || t.fullName || t.name || 'TBD',
    short: t.shortDisplayName || t.abbreviation || t.displayName || '',
    abbr: t.abbreviation || '',
    logo: t.logo || t.logos?.[0]?.href || t.flag?.href || '',
    score: score ?? '',
    winner: !!c.winner,
    record: c.records?.[0]?.summary || '',
    linescores: (c.linescores || []).map((l) => l.displayValue ?? l.value).filter((v) => v !== undefined && v !== null),
    color: hex(t.color),
    altColor: hex(t.alternateColor),
  };
}

const hex = (c) => (/^[0-9a-f]{6}$/i.test(c || '') ? `#${c}` : '');

function statusOf(s = {}) {
  const t = s.type || {};
  return {
    state: t.state || 'pre',
    detail: t.detail || t.description || '',
    short: t.shortDetail || t.detail || '',
    clock: s.displayClock || '',
    period: s.period ?? null,
    completed: !!t.completed,
  };
}

function keyEvents(comp, teams) {
  const byId = new Map(teams.map((t) => [t.id, t.abbr || t.short || t.name]));
  return (comp.details || [])
    .map((d) => {
      let type = d.type?.text || '';
      if (d.ownGoal) type = 'Own goal';
      else if (d.penaltyKick && d.scoringPlay) type = 'Penalty goal';
      else if (d.redCard) type = 'Red card';
      else if (d.yellowCard) type = 'Yellow card';
      else if (d.scoringPlay && !type) type = 'Goal';
      return {
        minute: d.clock?.displayValue || '',
        type,
        player: d.athletesInvolved?.[0]?.displayName || '',
        playerId: d.athletesInvolved?.[0]?.id ? String(d.athletesInvolved[0].id) : '',
        team: byId.get(String(d.team?.id ?? '')) || '',
      };
    })
    .filter((e) => e.type);
}

function eventLink(ev) {
  const links = ev.links || [];
  const pick = links.find((l) => (l.rel || []).includes('summary')) || links.find((l) => (l.rel || []).includes('desktop')) || links[0];
  return pick?.href || '';
}

export function normalizeCompetition(ev, comp, league, extra = {}) {
  const competitors = (comp.competitors || []).map((c) => ({ ...side(c), homeAway: c.homeAway, order: c.order ?? c.sortOrder ?? null, position: c.status?.position?.displayName || '' }));
  const status = statusOf(comp.status || ev.status);
  const venue = comp.venue || ev.venue || {};
  const base = {
    id: String(comp.id || ev.id),
    eventId: String(ev.id),
    source: 'espn',
    sport: league.sport,
    league: { path: league.path, name: extra.leagueName || league.name, priority: LEAGUE_BY_PATH.get(league.path)?.priority || 0 },
    name: extra.name || ev.name || '',
    shortName: ev.shortName || '',
    date: comp.date || ev.date || '',
    status,
    venue: { name: venue.fullName || venue.name || '', city: venue.address?.city || '', country: venue.address?.country || '' },
    note: comp.notes?.[0]?.headline || extra.note || '',
    headline: comp.headlines?.[0]?.shortLinkText || comp.headlines?.[0]?.description || '',
    broadcasts: [...new Set((comp.broadcasts || []).flatMap((b) => b.names || []))],
    link: eventLink(ev),
  };

  if (competitors.length > 2) {
    const ranked = [...competitors].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    return { ...base, kind: 'field', leaders: ranked.slice(0, 10).map((c, i) => ({ position: c.position || String(i + 1), name: c.name, score: c.score === '' ? '' : String(c.score) })) };
  }

  const home = competitors.find((c) => c.homeAway === 'home') || competitors[0] || side();
  const away = competitors.find((c) => c.homeAway === 'away' && c !== home) || competitors.find((c) => c !== home) || side();
  const strip = ({ homeAway, order, position, ...t }) => t;
  return {
    ...base,
    kind: 'versus',
    name: base.name || `${away.name} at ${home.name}`,
    home: strip(home),
    away: strip(away),
    events: keyEvents(comp, [home, away]),
  };
}

const inWindow = (comp, now) => {
  const s = comp.status?.type?.state;
  if (s === 'in') return true;
  const t = Date.parse(comp.date);
  return Number.isFinite(t) && Math.abs(t - now) < 1.5 * DAY;
};

export function normalizeScoreboard(data, league, now = Date.now()) {
  const out = [];
  for (const ev of data?.events || []) {
    if (ev.groupings?.length) {
      // Tennis: tournament → draws (Men's Singles…) → matches
      for (const g of ev.groupings) {
        const comps = (g.competitions || []).filter((c) => inWindow(c, now)).slice(0, 40);
        for (const comp of comps) {
          const m = normalizeCompetition(ev, comp, league, { leagueName: `${league.name} · ${ev.name}`, note: g.grouping?.displayName || '' });
          m.name = `${m.home?.name} vs ${m.away?.name}`;
          out.push(m);
        }
      }
      continue;
    }
    const comps = ev.competitions || [];
    if (comps.length > 1) {
      // Racing weekend: practice / qualifying / race sessions
      for (const comp of comps.filter((c) => inWindow(c, now))) {
        const label = comp.type?.abbreviation || comp.type?.text || '';
        out.push(normalizeCompetition(ev, comp, league, { name: `${ev.name}${label ? ' — ' + label : ''}` }));
      }
    } else if (comps[0]) {
      out.push(normalizeCompetition(ev, comps[0], league));
    }
  }
  return out;
}

export function fetchLeague(league, now = Date.now()) {
  return memoize(`espn:${league.path}`, 4 * 60_000, async () => normalizeScoreboard(await fetchScoreboard(league, now), league, now));
}

// 404 means ESPN has no scoreboard for that slug: empty, not a failure. Anything else
// that fails is reported so the footer and /debug show it.
export async function fetchEspn(leagues, now = Date.now(), deadline = Infinity) {
  const results = await pool(leagues, 20, (l) => fetchLeague(l, now), { deadline });
  const matches = [];
  const failed = [];
  const unknown = [];
  let pending = 0;
  let ok = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      matches.push(...r.value);
      ok++;
    } else if (r.status === 'pending') pending++;
    else if (r.reason?.status === 404 || r.reason?.status === 400) {
      ok++;
      unknown.push(leagues[i].name);
    } else failed.push({ source: `ESPN ${leagues[i].name}`, error: errorText(r.reason) });
  });
  return { matches, failed, unknown, ok, pending };
}

// ---------- full match details (for copy / poster) ----------
const statRow = (label, home, away) => ({ label, home: String(home ?? ''), away: String(away ?? '') });

export function summaryDetails(sum, match) {
  const d = {};
  const gi = sum.gameInfo || {};
  if (gi.venue) {
    match.venue = {
      name: gi.venue.fullName || match.venue?.name || '',
      city: gi.venue.address?.city || match.venue?.city || '',
      country: gi.venue.address?.country || match.venue?.country || '',
    };
    if (gi.venue.capacity) d.capacity = gi.venue.capacity;
  }
  if (gi.attendance) d.attendance = gi.attendance;
  const officials = (gi.officials || []).map((o) => [o.position?.displayName || o.position?.name, o.displayName || o.fullName].filter(Boolean).join(': '));
  if (officials.length) d.officials = officials.slice(0, 4);

  // Team stats: boxscore.teams[] each with statistics[{label, displayValue}]
  const teams = sum.boxscore?.teams || [];
  if (teams.length === 2 && match.home) {
    const isHome = (t) => String(t.team?.id) === String(match.home.id) || t.homeAway === 'home';
    const h = teams.find(isHome) || teams[0];
    const a = teams.find((t) => t !== h) || teams[1];
    const amap = new Map((a.statistics || []).map((x) => [x.label || x.name, x.displayValue]));
    d.stats = (h.statistics || [])
      .filter((x) => x.displayValue !== undefined && (x.label || x.name))
      .slice(0, 16)
      .map((x) => statRow(x.label || x.name, x.displayValue, amap.get(x.label || x.name)));
  }

  // Key events (soccer and others)
  if (Array.isArray(sum.keyEvents) && sum.keyEvents.length) {
    match.events = sum.keyEvents
      .filter((k) => k.scoringPlay || /card|goal|penalt|substitution/i.test(k.type?.text || ''))
      .map((k) => ({
        minute: k.clock?.displayValue || '',
        type: k.type?.text || '',
        player: k.participants?.map((p) => p.athlete?.displayName).filter(Boolean).join(' / ') || '',
        team: k.team?.displayName || '',
      }))
      .slice(0, 40);
  } else if (Array.isArray(sum.scoringPlays) && sum.scoringPlays.length) {
    match.events = sum.scoringPlays.slice(-30).map((p) => ({
      minute: [p.period?.number ? `P${p.period.number}` : '', p.clock?.displayValue].filter(Boolean).join(' '),
      type: p.type?.text || 'Score',
      player: p.text || '',
      team: p.team?.displayName || p.team?.abbreviation || '',
    }));
  }

  // Line-ups (soccer)
  const rosters = sum.rosters || [];
  if (rosters.length === 2) {
    d.lineups = rosters.map((r) => ({
      team: r.team?.displayName || '',
      formation: r.formation || '',
      starters: (r.roster || []).filter((p) => p.starter).map((p) => [p.jersey, p.athlete?.displayName].filter(Boolean).join(' ')).slice(0, 11),
    }));
  }

  // Player leaders (NBA, NFL, MLB, NHL …)
  const leaders = [];
  for (const t of sum.leaders || []) {
    for (const cat of t.leaders || []) {
      const top = cat.leaders?.[0];
      if (top) leaders.push(`${t.team?.displayName || ''} ${cat.displayName}: ${top.athlete?.displayName || ''} (${top.displayValue || ''})`.trim());
    }
  }
  if (leaders.length) d.playerLeaders = leaders.slice(0, 12);

  const recap = sum.article?.headline || sum.header?.gameNote || '';
  if (recap) match.headline = recap;
  if (sum.article?.description) d.recap = sum.article.description;
  return d;
}

export async function espnMatch(league, id) {
  const list = await fetchLeague(league).catch(() => []);
  let match = list.find((m) => m.id === id || m.eventId === id);
  let sum = null;
  try {
    sum = await espnGet(`${league.path}/summary?event=${match?.eventId || id}`);
  } catch {
    /* scoreboard data is still useful */
  }
  if (!match && sum?.header?.competitions?.[0]) {
    const comp = sum.header.competitions[0];
    match = normalizeCompetition({ id, name: '', links: sum.header.links, competitions: [comp] }, comp, league);
  }
  if (!match) return null;
  match = structuredClone(match);
  if (sum) match.details = summaryDetails(sum, match);
  return match;
}
