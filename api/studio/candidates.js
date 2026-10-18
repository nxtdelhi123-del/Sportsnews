import { candidates } from '../../lib/studio/packs.js';
import { BRANDS } from '../../lib/studio/score.js';
import { sendJSON, slim } from '../../lib/http.js';

// GET /api/studio/candidates?brand=tsb|musc → ranked post packs with formula words.
export default async function handler(req, res) {
  const brand = req.query?.brand || 'tsb';
  if (!BRANDS[brand]) return sendJSON(res, 400, { error: 'Unknown brand', brands: Object.keys(BRANDS) });
  try {
    const list = await candidates(brand, Number(req.query?.limit) || 24);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=120');
    sendJSON(res, 200, slim({ brand, updatedAt: new Date().toISOString(), count: list.length, packs: list }));
  } catch (err) {
    sendJSON(res, 502, { error: 'Failed to build candidates', detail: String(err?.message || err) });
  }
}
