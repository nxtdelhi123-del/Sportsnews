import { getUnited } from '../lib/united.js';
import { setCache, sendJSON, slim } from '../lib/http.js';

// /api/united → Manchester United only: live / next / last match, results and fixtures in
// every competition, the Premier League table, the squad and United headlines.
export default async function handler(req, res) {
  try {
    const data = await getUnited();
    setCache(res, data.live ? 60 : undefined);
    sendJSON(res, 200, slim(data));
  } catch (err) {
    sendJSON(res, 502, { error: 'Failed to load Manchester United', detail: String(err?.message || err) });
  }
}
