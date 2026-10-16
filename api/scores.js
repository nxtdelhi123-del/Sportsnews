import { getScores } from '../lib/feeds.js';
import { setCache, sendJSON } from '../lib/http.js';

export default async function handler(req, res) {
  try {
    const data = await getScores();
    const { sport, state } = req.query || {};
    let matches = data.matches;
    if (sport) matches = matches.filter((m) => m.sport === sport);
    if (state) matches = matches.filter((m) => m.status.state === state);
    setCache(res);
    sendJSON(res, 200, { ...data, count: matches.length, matches });
  } catch (err) {
    sendJSON(res, 502, { error: 'Failed to load scores', detail: String(err?.message || err) });
  }
}
