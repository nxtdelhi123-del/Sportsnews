import { buildPack } from '../../lib/studio/packs.js';
import { BRANDS } from '../../lib/studio/score.js';
import { renderPack, loadAssets, dataUri } from '../../lib/studio/render.js';
import { TEMPLATES, SIZES } from '../../lib/studio/templates.js';
import { memoize, readJSON, sendJSON } from '../../lib/http.js';

const DATA_IMG = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

// The owner's edits from the desk: only these fields, only strings, bounded.
export function cleanWords(w) {
  if (!w || typeof w !== 'object') return null;
  const out = {};
  for (const [k, max] of [['headline', 80], ['name', 90], ['kicker', 120], ['explainer', 240], ['eyebrow', 60]]) {
    const v = str(w[k], max);
    if (v !== undefined) out[k] = v;
  }
  if (Array.isArray(w.stats)) out.stats = w.stats.slice(0, 8).map((s) => ({ value: str(s?.value, 14) || '', label: str(s?.label, 24) || '' })).filter((s) => s.value).slice(0, 3);
  if (Array.isArray(w.accentWords)) out.accentWords = w.accentWords.slice(0, 4).map((x) => str(x, 24)).filter(Boolean);
  if (typeof w.accent === 'string' && /^(gold|silver|bronze|red|none)$/.test(w.accent)) out.accent = w.accent;
  return Object.keys(out).length ? out : null;
}

// GET /api/studio/render?brand=tsb&key=match:soccer/eng.1:740001&size=post|story&template=tsb-dark&json=1
// POST the same fields as JSON, plus hero / cutout (data URIs), heroUrl, words (edits).
export default async function handler(req, res) {
  let body = {};
  if (req.method === 'POST') {
    try {
      body = await readJSON(req);
    } catch {
      return sendJSON(res, 400, { error: 'Body must be JSON' });
    }
    for (const k of ['hero', 'cutout']) {
      if (body[k] && !DATA_IMG.test(body[k])) return sendJSON(res, 400, { error: `${k} must be a PNG/JPEG/WebP data URI` });
      if (body[k] && body[k].length > 5_600_000) return sendJSON(res, 413, { error: 'Photo too large; keep it under 4 MB' });
    }
    if (body.heroUrl && !/^https?:\/\/\S{4,500}$/.test(body.heroUrl)) return sendJSON(res, 400, { error: 'heroUrl must be an http(s) link' });
  }
  const { brand = 'tsb', key = '', size = 'post', template, json, w } = { ...(req.query || {}), ...body };
  const width = Math.min(1080, Math.max(270, Number(w) || 1080));
  if (!BRANDS[brand]) return sendJSON(res, 400, { error: 'Unknown brand' });
  if (!/^(match|news):[\w.:/-]{1,140}$/.test(key)) return sendJSON(res, 400, { error: 'Invalid key' });
  if (!SIZES[size]) return sendJSON(res, 400, { error: 'Unknown size', sizes: Object.keys(SIZES) });
  if (template && !TEMPLATES[template]) return sendJSON(res, 400, { error: 'Unknown template', templates: Object.keys(TEMPLATES) });
  const edits = cleanWords(body.words);
  try {
    const base = await buildPack(brand, key);
    if (!base) return sendJSON(res, 404, { error: 'Story not found (it may have left the window)' });
    const pack = edits ? { ...base, words: { ...base.words, ...edits } } : base;
    if (json) return sendJSON(res, 200, pack);
    const own = !!(body.hero || body.cutout || body.heroUrl);
    const render = async () => {
      const hero = body.hero || (body.heroUrl ? await dataUri(body.heroUrl, { max: 8_000_000 }) : null);
      if (body.heroUrl && !hero) throw Object.assign(new Error('Could not fetch that picture'), { status: 502 });
      const aspect = Number(body.cutoutAspect);
      const assets = await loadAssets(pack, BRANDS[brand], { hero, cutout: body.cutout || null, cutoutAspect: aspect > 0.2 && aspect < 4 ? aspect : undefined });
      return renderPack({ ...pack, brand: BRANDS[brand], assets }, { size, template, width });
    };
    const { png, template: used } = own || edits ? await render() : await memoize(`studio:png:${brand}:${key}:${size}:${template || ''}:${width}`, 3 * 60_000, render);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', own || edits ? 'no-store' : 'public, max-age=0, s-maxage=180, stale-while-revalidate=120');
    res.setHeader('X-Template', used);
    res.setHeader('Content-Disposition', `inline; filename="${brand}-${key.replace(/[^\w.-]+/g, '_')}-${size}.png"`);
    res.end(png);
  } catch (err) {
    sendJSON(res, err?.status || 500, { error: err?.status ? err.message : 'Render failed', detail: String(err?.message || err) });
  }
}
