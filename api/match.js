import { LEAGUE_BY_PATH } from '../lib/sources.js';
import { fetchLeague, normalizeCompetition } from '../lib/espn.js';
import { getScores } from '../lib/feeds.js';
import { fetchWithTimeout, memoize, setCache, sendJSON, siteUrl } from '../lib/http.js';
import { formatMatch } from '../public/js/format.js';

const TYPES = { text: 'text/plain', markdown: 'text/markdown', embed: 'text/html', api: 'text/plain' };

async function findEspn(league, id) {
  const list = await memoize(`league:${league.path}`, 60_000, () => fetchLeague(league));
  const hit = list.find((m) => m.id === id || m.eventId === id);
  if (hit) return hit;
  // Not on the current scoreboard (older/future match): use the summary endpoint.
  const sum = await fetchWithTimeout(`https://site.api.espn.com/apis/site/v2/sports/${league.path}/summary?event=${id}`);
  const comp = sum?.header?.competitions?.[0];
  if (!comp) return null;
  const ev = { id, name: '', links: sum.header.links, competitions: [comp] };
  const m = normalizeCompetition(ev, { ...comp, venue: comp.venue || sum.gameInfo?.venue }, league);
  if (m.kind === 'versus' && m.events.length === 0 && Array.isArray(sum.keyEvents)) {
    m.events = sum.keyEvents
      .filter((k) => k.scoringPlay || /card/i.test(k.type?.text || ''))
      .map((k) => ({ minute: k.clock?.displayValue || '', type: k.type?.text || '', player: k.participants?.[0]?.athlete?.displayName || '', team: k.team?.abbreviation || k.team?.displayName || '' }));
  }
  return m;
}

export default async function handler(req, res) {
  const { l = '', id = '', format = 'json', tz } = req.query || {};
  if (!/^[\w.-]{1,40}$/.test(id)) return sendJSON(res, 400, { error: 'Invalid or missing id' });

  try {
    let match = null;
    if (l === 'cricket') {
      match = (await getScores()).matches.find((m) => m.sport === 'cricket' && m.id === id) || null;
    } else {
      const league = LEAGUE_BY_PATH.get(l);
      if (!league) return sendJSON(res, 400, { error: 'Unknown league path', hint: 'Use the "l" value shown in the match API link' });
      match = await findEspn(league, id);
    }
    if (!match) return sendJSON(res, 404, { error: 'Match not found' });

    setCache(res, match.status.state === 'in' ? 60 : undefined);
    if (format === 'json') return sendJSON(res, 200, match);
    let timeZone;
    try {
      timeZone = tz ? new Intl.DateTimeFormat('en', { timeZone: tz }).resolvedOptions().timeZone : undefined;
    } catch {
      timeZone = undefined;
    }
    const body = formatMatch(match, format, { siteUrl: siteUrl(req), timeZone });
    res.statusCode = 200;
    res.setHeader('Content-Type', `${TYPES[format] || 'text/plain'}; charset=utf-8`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(body);
  } catch (err) {
    sendJSON(res, 502, { error: 'Failed to load match', detail: String(err?.message || err) });
  }
}
