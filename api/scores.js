import { getScores, isScoreSport } from '../lib/feeds.js';
import { setCache, sendJSON, slim } from '../lib/http.js';

// /api/scores            → overview: top competitions + every live match in the world
// /api/scores?sport=soccer → every match of that sport, yesterday to tomorrow
export default async function handler(req, res) {
  const { sport = 'all', state } = req.query || {};
  if (!isScoreSport(sport)) return sendJSON(res, 400, { error: 'Unknown sport' });
  try {
    const data = await getScores(sport);
    const matches = state ? data.matches.filter((m) => m.status.state === state) : data.matches;
    setCache(res);
    sendJSON(res, 200, slim({ ...data, count: matches.length, matches }));
  } catch (err) {
    sendJSON(res, 502, { error: 'Failed to load scores', detail: String(err?.message || err) });
  }
}
