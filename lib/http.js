const UA = 'Mozilla/5.0 (compatible; NXTSportsBot/1.0; +https://vercel.com)';
export const REFRESH_MINUTES = 10;

export async function fetchWithTimeout(url, { timeout = 7000, headers = {}, as = 'json' } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: as === 'json' ? 'application/json' : 'application/rss+xml, application/xml, text/xml, */*', ...headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return as === 'json' ? await res.json() : await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// Next 10-minute mark on the clock (:00, :10, :20 …). Updates line up with it.
export function nextSlot(now = Date.now()) {
  const step = REFRESH_MINUTES * 60_000;
  return Math.floor(now / step) * step + step;
}

// Cache at Vercel's edge until the next 10-minute mark, then serve stale while one
// request rebuilds it. Upstreams are hit at most once per 10 minutes per region.
export function setCache(res, maxSeconds) {
  const untilSlot = Math.ceil((nextSlot() - Date.now()) / 1000);
  const ttl = Math.max(30, Math.min(maxSeconds ?? untilSlot, untilSlot));
  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=120`);
}

// Small in-memory memo for warm function instances.
const memo = new Map();
export async function memoize(key, ttlMs, fn) {
  const hit = memo.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await fn();
  memo.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export function siteUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}` : '';
}

export function sendJSON(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}
