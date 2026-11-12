// Manchester United only: results and fixtures in every competition, the live match, the
// Premier League table, the squad and United headlines. All from ESPN's free team
// endpoints plus the newsroom's news feeds.
import { espnGet, normalizeCompetition, soccerLeague, fetchSoccerAll } from './espn.js';
import { fetchWithTimeout, memoize } from './http.js';
import { getNews } from './feeds.js';

export const UNITED = { id: '360', name: 'Manchester United', short: 'Man Utd', league: 'eng.1' };
const STANDINGS = ['https://site.api.espn.com/apis/v2/sports/soccer', 'https://site.web.api.espn.com/apis/v2/sports/soccer'];

// Headlines about United: the club's names and home, never "West Ham United" and the like.
export const UNITED_RE = /\bman(?:chester)?\.?\s*(?:utd|united)\b|\bold trafford\b|\bred devils\b|\bmufc\b|\bcarrington\b/i;

// Schedule events → the newsroom's match shape (league from the event itself).
function fromSchedule(events = []) {
  const out = [];
  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    // schedule scores come as {value, displayValue}
    comp.competitors = (comp.competitors || []).map((c) => ({ ...c, score: typeof c.score === 'object' && c.score ? c.score.displayValue ?? c.score.value : c.score }));
    const lg = ev.league?.slug ? soccerLeague(ev.league.slug, ev.league.name) : soccerLeague(UNITED.league, 'Premier League');
    const m = normalizeCompetition(ev, comp, lg);
    m.competition = ev.league?.abbreviation || ev.league?.name || lg.name;
    out.push(m);
  }
  return out;
}

function standingsRows(data) {
  const group = data?.children?.[0];
  const entries = group?.standings?.entries || [];
  const stat = (e, name) => e.stats?.find((s) => s.name === name)?.displayValue ?? '';
  return {
    name: group?.name || 'Premier League',
    rows: entries
      .map((e) => ({
        rank: Number(stat(e, 'rank')) || 0,
        id: String(e.team?.id || ''),
        team: e.team?.shortDisplayName || e.team?.displayName || '',
        logo: e.team?.logos?.[0]?.href || '',
        played: stat(e, 'gamesPlayed'),
        won: stat(e, 'wins'),
        drawn: stat(e, 'ties'),
        lost: stat(e, 'losses'),
        gd: stat(e, 'pointDifferential'),
        points: stat(e, 'points'),
      }))
      .sort((a, b) => a.rank - b.rank),
  };
}

const POS_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
function squadOf(roster) {
  const players = (roster?.athletes || []).map((a) => ({
    name: a.displayName || a.fullName || '',
    number: a.jersey || '',
    position: a.position?.displayName || 'Squad',
    age: a.age || '',
    nation: a.citizenship || '',
    flag: a.flag?.href || '',
  }));
  return POS_ORDER.concat('Squad')
    .map((pos) => ({ position: pos, players: players.filter((p) => (POS_ORDER.includes(p.position) ? p.position : 'Squad') === pos).sort((a, b) => (Number(a.number) || 99) - (Number(b.number) || 99)) }))
    .filter((g) => g.players.length);
}

async function standings() {
  let err;
  for (const host of STANDINGS) {
    try {
      return await fetchWithTimeout(`${host}/${UNITED.league}/standings`, { timeout: 6000 });
    } catch (e) {
      err = e;
    }
  }
  throw err;
}

const settle = (p) => p.then((v) => v, () => null);

export function getUnited() {
  return memoize(
    'united',
    (v) => (v.live ? 60_000 : 4 * 60_000),
    async () => {
      const t = UNITED.id;
      const [team, results, fixtures, table, roster, today, news] = await Promise.all([
        settle(espnGet(`soccer/${UNITED.league}/teams/${t}`, { timeout: 6000 })),
        settle(espnGet(`soccer/all/teams/${t}/schedule`, { timeout: 6000 })),
        settle(espnGet(`soccer/all/teams/${t}/schedule?fixture=true`, { timeout: 6000 })),
        settle(standings()),
        settle(espnGet(`soccer/${UNITED.league}/teams/${t}/roster`, { timeout: 6000 })),
        settle(fetchSoccerAll()),
        settle(getNews()),
      ]);
      if (!results && !fixtures && !team) throw new Error('ESPN did not answer for Manchester United');
      const isUs = (m) => m.home?.id === t || m.away?.id === t;
      // Today's all-competitions feed has the freshest live minute and score.
      const fresh = new Map((today || []).filter(isUs).map((m) => [m.id, m]));
      const take = (list) => list.map((m) => (fresh.has(m.id) ? { ...fresh.get(m.id), competition: m.competition } : m));
      const played = take(fromSchedule(results?.events)).filter((m) => m.status.state !== 'pre');
      const upcoming = take(fromSchedule(fixtures?.events)).filter((m) => m.status.state !== 'post');
      const live = [...played, ...upcoming, ...fresh.values()].find((m) => m.status.state === 'in') || null;
      const byDate = (a, b) => Date.parse(a.date) - Date.parse(b.date);
      const tm = team?.team || {};
      return {
        updatedAt: new Date().toISOString(),
        team: {
          id: t,
          name: tm.displayName || UNITED.name,
          logo: tm.logos?.[0]?.href || 'https://a.espncdn.com/i/teamlogos/soccer/500/360.png',
          color: tm.color ? `#${tm.color}` : '#da020e',
          standing: tm.standingSummary || '',
          record: tm.record?.items?.[0]?.summary || '',
          venue: tm.franchise?.venue?.fullName || tm.venue?.fullName || 'Old Trafford',
        },
        live,
        next: upcoming.filter((m) => m.status.state === 'pre').sort(byDate)[0] || null,
        last: played.filter((m) => m.status.state === 'post').sort((a, b) => byDate(b, a))[0] || null,
        results: played.filter((m) => m.status.state === 'post').sort((a, b) => byDate(b, a)).slice(0, 30),
        fixtures: upcoming.filter((m) => m.status.state === 'pre').sort(byDate).slice(0, 30),
        table: table ? standingsRows(table) : null,
        squad: roster ? squadOf(roster) : [],
        news: (news?.items || []).filter((n) => UNITED_RE.test(n.title || '') || (UNITED_RE.test(n.summary || '') && n.sport === 'soccer')).slice(0, 80),
      };
    },
  );
}
