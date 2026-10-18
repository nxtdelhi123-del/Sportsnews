import { buildPack } from '../../lib/studio/packs.js';
import { BRANDS } from '../../lib/studio/score.js';
import { renderPack, loadAssets } from '../../lib/studio/render.js';
import { TEMPLATES, SIZES } from '../../lib/studio/templates.js';
import { memoize, sendJSON } from '../../lib/http.js';

// GET /api/studio/render?brand=tsb&key=match:soccer/eng.1:740001&size=post|story&template=tsb-dark&json=1
export default async function handler(req, res) {
  const { brand = 'tsb', key = '', size = 'post', template, json, w } = req.query || {};
  const width = Math.min(1080, Math.max(270, Number(w) || 1080));
  if (!BRANDS[brand]) return sendJSON(res, 400, { error: 'Unknown brand' });
  if (!/^(match|news):[\w.:/-]{1,140}$/.test(key)) return sendJSON(res, 400, { error: 'Invalid key' });
  if (!SIZES[size]) return sendJSON(res, 400, { error: 'Unknown size', sizes: Object.keys(SIZES) });
  if (template && !TEMPLATES[template]) return sendJSON(res, 400, { error: 'Unknown template', templates: Object.keys(TEMPLATES) });
  try {
    const pack = await buildPack(brand, key);
    if (!pack) return sendJSON(res, 404, { error: 'Story not found (it may have left the window)' });
    if (json) return sendJSON(res, 200, pack);
    const { png, template: used } = await memoize(`studio:png:${brand}:${key}:${size}:${template || ''}:${width}`, 3 * 60_000, async () => {
      const assets = await loadAssets(pack, BRANDS[brand]);
      return renderPack({ ...pack, brand: BRANDS[brand], assets }, { size, template, width });
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=180, stale-while-revalidate=120');
    res.setHeader('X-Template', used);
    res.setHeader('Content-Disposition', `inline; filename="${brand}-${key.replace(/[^\w.-]+/g, '_')}-${size}.png"`);
    res.end(png);
  } catch (err) {
    sendJSON(res, 500, { error: 'Render failed', detail: String(err?.message || err) });
  }
}
