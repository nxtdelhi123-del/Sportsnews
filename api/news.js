import { getNews } from '../lib/feeds.js';
import { setCache, sendJSON } from '../lib/http.js';

export default async function handler(req, res) {
  try {
    const data = await getNews();
    const { sport } = req.query || {};
    const items = sport ? data.items.filter((n) => n.sport === sport) : data.items;
    setCache(res);
    sendJSON(res, 200, { ...data, count: items.length, items });
  } catch (err) {
    sendJSON(res, 502, { error: 'Failed to load news', detail: String(err?.message || err) });
  }
}
