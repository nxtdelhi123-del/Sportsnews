import { ESPN_LEAGUES } from './sources.js';
import { fetchWithTimeout } from './http.js';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const DAY = 86_400_000;

const ymd = (t) => new Date(t).toISOString().slice(0, 10).replace(/-/g, '');

export function scoreboardUrl(league, now = Date.now()) {
  const qs = new URLSearchParams({ limit: '300' });
  if (league.range) qs.set('dates', `${ymd(now - DAY)}-${ymd(now + DAY)}`);
  return `${BASE}/${league.path}/scoreboard?${qs}`;
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
  };
}

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
    league: { path: league.path, name: extra.leagueName || league.name },
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

export async function fetchLeague(league, now = Date.now()) {
  const data = await fetchWithTimeout(scoreboardUrl(league, now));
  return normalizeScoreboard(data, league, now);
}

export async function fetchAllEspn(now = Date.now()) {
  const results = await Promise.allSettled(ESPN_LEAGUES.map((l) => fetchLeague(l, now)));
  const matches = [];
  const failed = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') matches.push(...r.value);
    else failed.push({ source: ESPN_LEAGUES[i].name, error: String(r.reason?.message || r.reason) });
  });
  return { matches, failed, ok: ESPN_LEAGUES.length - failed.length };
}
