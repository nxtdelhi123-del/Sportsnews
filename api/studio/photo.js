import { sendJSON } from '../../lib/http.js';

// GET /api/studio/photo?url=https://… — fetches a picture the owner pasted so the
// desk can read its pixels (cross-origin images can't be cut out in the browser).
const MAX = 8_000_000;
const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?|172\.(1[6-9]|2\d|3[01])\.)/i;

export default async function handler(req, res) {
  const url = String(req.query?.url || '');
  let u;
  try {
    u = new URL(url);
  } catch {
    return sendJSON(res, 400, { error: 'Paste a full image link (https://…)' });
  }
  if (!/^https?:$/.test(u.protocol) || PRIVATE.test(u.hostname) || !/\./.test(u.hostname)) return sendJSON(res, 400, { error: 'That link cannot be fetched' });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const up = await fetch(u, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36', Accept: 'image/*,*/*;q=0.5', Referer: `${u.protocol}//${u.host}/` } });
    if (!up.ok) return sendJSON(res, 502, { error: `The site answered HTTP ${up.status}` });
    const type = (up.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(type)) return sendJSON(res, 415, { error: `That link is not a picture (${type || 'unknown type'})` });
    if (Number(up.headers.get('content-length')) > MAX) return sendJSON(res, 413, { error: 'Picture is over 8 MB' });
    const buf = Buffer.from(await up.arrayBuffer());
    if (buf.length > MAX) return sendJSON(res, 413, { error: 'Picture is over 8 MB' });
    res.statusCode = 200;
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(buf);
  } catch (e) {
    sendJSON(res, 502, { error: e.name === 'AbortError' ? 'The site took too long' : `Could not fetch: ${e.message}` });
  } finally {
    clearTimeout(timer);
  }
}
