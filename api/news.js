import { getNews } from '../lib/feeds.js';
import { setCache, sendJSON } from '../lib/http.js';

// /api/news                     → every headline (up to 900, newest first)
// /api/news?sport=cricket       → one sport
// /api/news?limit=300           → the newest N (the page's first load)
export default async function handler(req, res) {
  try {
    const data = await getNews();
    const { sport, limit } = req.query || {};
    let items = sport ? data.items.filter((n) => n.sport === sport) : data.items;
    const n = Number.parseInt(limit, 10);
    if (n > 0) items = items.slice(0, Math.min(n, 900));
    setCache(res);
    sendJSON(res, 200, { ...data, count: items.length, items });
  } catch (err) {
    sendJSON(res, 502, { error: 'Failed to load news', detail: String(err?.message || err) });
  }
}
