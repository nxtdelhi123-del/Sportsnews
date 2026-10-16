// TheSportsDB free v1 API: fixtures and results per day for every sport it tracks
// (the big leagues of each sport). Independent of ESPN and Sofascore, so the site
// still shows the major matches if either of those is blocked.
import { fetchWithTimeout, memoize } from './http.js';

// '123' is the free key that answers; '3' is tried in case that changes.
const KEYS = ['123', '3'];
const DAY = 86_400_000;

// Our sport key → TheSportsDB sport name.
export const TSDB_SPORTS = {
  soccer: 'Soccer',
  cricket: 'Cricket',
  basketball: 'Basketball',
  football: 'American Football',
  baseball: 'Baseball',
  hockey: 'Ice Hockey',
  rugby: 'Rugby',
  racing: 'Motorsport',
  combat: 'Fighting',
  tennis: 'Tennis',
  golf: 'Golf',
  esports: 'Esports',
  darts: 'Darts',
  snooker: 'Snooker',
  handball: 'Handball',
  volleyball: 'Volleyball',
  aussierules: 'Australian Football',
  badminton: 'Badminton',
  tabletennis: 'Table Tennis',
  fieldhockey: 'Field Hockey',
  cycling: 'Cycling',
  athletics: 'Athletics',
};
// Fetched for the "All sports" overview: 3 days for the two biggest sports, today only
// for the rest, so one build stays under the free tier's ~30 requests a minute.
export const TSDB_OVERVIEW = { soccer: [0, -1, 1], cricket: [0, -1, 1], basketball: [0], football: [0] };

const BIG = [
  [/champions league/i, 9950],
  [/premier league$/i, 9900],
  [/indian premier league|\bipl\b/i, 9900],
  [/la ?liga$/i, 9880],
  [/serie a$/i, 9870],
  [/bundesliga$/i, 9860],
  [/ligue 1$/i, 9850],
  [/europa league/i, 9840],
  [/world cup|euro(pean championship)?$|copa am|nations league|africa cup|asian cup/i, 9930],
  [/^nba$|^nfl$|^mlb$|^nhl$/i, 9800],
  [/super league|\bisl\b|saudi|mls|liga mx|libertadores|brasileir|eredivisie|primeira|championship$/i, 9700],
  [/\bufc\b|\bt20\b|\bodi\b|test/i, 9600],
];
const priorityOf = (league) => BIG.find(([re]) => re.test(league))?.[1] || 6000;

const FINISHED = /finish|^ft$|^aet$|^pen$|^ap$|ended|final|^full/i;
const LIVE = /^(1h|2h|ht|et|bt|p|live|in progress|q\d|ot|\d+'?|[1-9](st|nd|rd|th) (half|quarter|period|inning|set))$/i;
const OFF = /postpon|cancel|abandon|suspend|interrupt|delay/i;

function stateOf(e, start, now) {
  const s = (e.strStatus || '').trim();
  if (e.strPostponed === 'yes' || OFF.test(s)) return { state: 'post', detail: s || 'Postponed' };
  if (FINISHED.test(s)) return { state: 'post', detail: 'FT' };
  if (LIVE.test(s)) return { state: 'in', detail: e.strProgress ? `${e.strProgress}'` : s };
  const scored = e.intHomeScore !== null && e.intHomeScore !== undefined && e.intHomeScore !== '';
  if (start && now > start) {
    // No explicit status: guess from the clock and whether a score exists.
    if (now - start < 4 * 3600_000 && scored) return { state: 'in', detail: s || 'In progress' };
    if (scored) return { state: 'post', detail: 'FT' };
  }
  return { state: 'pre', detail: s || 'Scheduled' };
}

const team = (name, id, badge, score, winner) => ({
  id: String(id || ''),
  name: name || 'TBD',
  short: name || '',
  abbr: '',
  logo: badge || '',
  score: score === null || score === undefined ? '' : String(score),
  winner,
  linescores: [],
});

export function normalizeSportsDb(e, sport, now = Date.now()) {
  if (!e?.idEvent) return null;
  const startIso = e.strTimestamp ? `${e.strTimestamp}${/Z|[+-]\d\d:?\d\d$/.test(e.strTimestamp) ? '' : 'Z'}` : e.dateEvent ? `${e.dateEvent}T${e.strTime || '00:00:00'}Z` : '';
  const start = Date.parse(startIso) || 0;
  const { state, detail } = stateOf(e, start, now);
  const league = e.strLeague || 'Other';
  // "English Premier League" already says England; don't repeat the country.
  const stem = (e.strCountry || '').toLowerCase().slice(0, 3);
  const country = e.strCountry && !(stem && new RegExp(`\\b${stem}`, 'i').test(league)) ? e.strCountry : '';
  const base = {
    id: String(e.idEvent),
    source: 'sportsdb',
    sport,
    league: { path: `tsdb/${sport}`, name: league, country, priority: priorityOf(league) },
    name: e.strEvent || `${e.strHomeTeam} vs ${e.strAwayTeam}`,
    date: start ? new Date(start).toISOString() : '',
    status: { state, detail, short: detail, clock: state === 'in' && e.strProgress ? `${e.strProgress}'` : '', completed: state === 'post' },
    venue: { name: e.strVenue || '', city: e.strCity || '', country: e.strCountry || '' },
    note: [e.strSeason, e.intRound ? `Round ${e.intRound}` : ''].filter(Boolean).join(' · '),
    link: `https://www.thesportsdb.com/event/${e.idEvent}`,
  };
  if (!e.strHomeTeam || !e.strAwayTeam) return { ...base, kind: 'field', leaders: [] };
  const hs = Number(e.intHomeScore);
  const as = Number(e.intAwayScore);
  const decided = state === 'post' && Number.isFinite(hs) && Number.isFinite(as) && hs !== as;
  return {
    ...base,
    kind: 'versus',
    home: team(e.strHomeTeam, e.idHomeTeam, e.strHomeTeamBadge, e.intHomeScore, decided && hs > as),
    away: team(e.strAwayTeam, e.idAwayTeam, e.strAwayTeamBadge, e.intAwayScore, decided && as > hs),
    events: [],
  };
}

const ymd = (t) => new Date(t).toISOString().slice(0, 10);

async function tsdbGet(path) {
  let err;
  for (const key of KEYS) {
    try {
      return await fetchWithTimeout(`https://www.thesportsdb.com/api/v1/json/${key}/${path}`, { timeout: 9000, retries: 0 });
    } catch (e) {
      err = e;
      // 429 is the rate limit: another key won't help and only burns more quota.
      if (e.status === 429 || !(e.status >= 400 && e.status < 500)) break;
    }
  }
  throw err;
}

export function fetchSportsDbDay(sport, day) {
  const name = TSDB_SPORTS[sport];
  return memoize(`tsdb:${sport}:${ymd(day)}`, 4 * 60_000, async () => {
    const data = await tsdbGet(`eventsday.php?d=${ymd(day)}&s=${encodeURIComponent(name)}`);
    return (data?.events || []).map((e) => normalizeSportsDb(e, sport)).filter(Boolean);
  });
}

// Days are fetched one after another to stay inside the free tier's rate limit
// (about 30 requests a minute). The overview only asks for today for most sports.
export async function fetchSportsDb(sport, now = Date.now(), days = [0, -1, 1]) {
  const out = [];
  let failures = 0;
  let lastErr;
  for (const d of days) {
    try {
      out.push(...(await fetchSportsDbDay(sport, now + d * DAY)));
    } catch (e) {
      failures++;
      lastErr = e;
    }
  }
  if (failures === days.length) throw lastErr;
  return out;
}
