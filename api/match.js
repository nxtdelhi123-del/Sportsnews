import { LEAGUE_BY_PATH, SOFA_SLUGS } from '../lib/sources.js';
import { espnMatch } from '../lib/espn.js';
import { sofaMatch } from '../lib/sofa.js';
import { cricketMatch, fetchCricket } from '../lib/cricket.js';
import { memoize, setCache, sendJSON, siteUrl, slim } from '../lib/http.js';
import { getScores } from '../lib/feeds.js';
import { TSDB_SPORTS } from '../lib/sportsdb.js';
import { formatMatch, FORMATS } from '../public/js/format.js';

const TYPES = { text: 'text/plain', markdown: 'text/markdown', embed: 'text/html', api: 'text/plain', poster: 'text/plain' };
const FORMAT_IDS = new Set(FORMATS.map((f) => f.id));

// Full details for one match: everything the copy / poster formats use.
export function loadMatch(l, id) {
  return memoize(`match:${l}:${id}`, 60_000, async () => {
    if (l === 'cricket') {
      const base = (await fetchCricket()).find((m) => m.id === id);
      return base ? cricketMatch(base) : null;
    }
    if (l.startsWith('sofa/')) return sofaMatch(l.slice(5), id);
    if (l.startsWith('tsdb/')) {
      // Usually already in the cached overview; only build the sport list if not.
      const find = (d) => d.matches.find((m) => m.source === 'sportsdb' && m.id === id);
      return find(await getScores('all')) || find(await getScores(l.slice(5))) || null;
    }
    return espnMatch(LEAGUE_BY_PATH.get(l), id);
  });
}

const validLeague = (l) => l === 'cricket' || LEAGUE_BY_PATH.has(l) || (l.startsWith('sofa/') && SOFA_SLUGS.has(l.slice(5))) || (l.startsWith('tsdb/') && l.slice(5) in TSDB_SPORTS);

export default async function handler(req, res) {
  const { l = '', id = '', format = 'json', tz } = req.query || {};
  if (!/^[\w.-]{1,40}$/.test(id)) return sendJSON(res, 400, { error: 'Invalid or missing id' });
  if (!validLeague(l)) return sendJSON(res, 400, { error: 'Unknown league path', hint: 'Use the "l" value shown in the match API link' });
  if (format !== 'json' && !FORMAT_IDS.has(format)) return sendJSON(res, 400, { error: 'Unknown format', formats: [...FORMAT_IDS] });

  try {
    const match = await loadMatch(l, id);
    if (!match) return sendJSON(res, 404, { error: 'Match not found' });

    setCache(res, match.status.state === 'in' ? 60 : undefined);
    if (format === 'json') return sendJSON(res, 200, slim(match));
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
