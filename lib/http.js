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
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
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

// Run fn over items with at most `limit` in flight; returns allSettled-style results.
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = { status: 'fulfilled', value: await fn(items[i], i) };
      } catch (reason) {
        out[i] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// Drop empty strings, nulls, false and empty arrays/objects to keep payloads small.
export function slim(v) {
  if (Array.isArray(v)) return v.map(slim);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) {
      if (x === '' || x === null || x === undefined || x === false) continue;
      const y = slim(x);
      if (Array.isArray(y) && !y.length) continue;
      if (y && typeof y === 'object' && !Array.isArray(y) && !Object.keys(y).length) continue;
      o[k] = y;
    }
    return o;
  }
  return v;
}

// Small in-memory memo for warm function instances. Concurrent callers share one fetch.
const memo = new Map();
export const clearMemo = () => memo.clear();
export async function memoize(key, ttlMs, fn) {
  const hit = memo.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = fn();
  memo.set(key, { value, expires: Date.now() + ttlMs });
  value.catch(() => memo.delete(key));
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
