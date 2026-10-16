// Some upstreams refuse requests that don't look like a browser, so every call
// identifies as Chrome.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
export const REFRESH_MINUTES = 10;

const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);
// Tests set delay to 0.
export const retryPolicy = { delay: 400 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithTimeout(url, { timeout = 7000, headers = {}, as = 'json', retries = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': UA,
          Accept: as === 'json' ? 'application/json, text/plain, */*' : 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-GB,en;q=0.9',
          ...headers,
        },
      });
      if (!res.ok) {
        if (attempt < retries && RETRY_STATUS.has(res.status)) {
          await sleep(retryPolicy.delay * (attempt + 1) + Math.random() * retryPolicy.delay);
          continue;
        }
        throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, url });
      }
      return as === 'json' ? await res.json() : await res.text();
    } catch (e) {
      if (e.status) throw e;
      // Timeout or network error.
      if (attempt < retries) {
        await sleep(retryPolicy.delay * (attempt + 1));
        continue;
      }
      throw Object.assign(new Error(e.name === 'AbortError' ? `timeout after ${timeout}ms` : e.message), { url, cause: e });
    } finally {
      clearTimeout(timer);
    }
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

// Run fn over items with at most `limit` in flight. Resolves with allSettled-style
// results; with a `deadline` (absolute ms) it resolves at that time and leaves the
// unfinished items as { status: 'pending' } so a slow upstream can't stall the page.
export function pool(items, limit, fn, { deadline = Infinity } = {}) {
  return new Promise((resolve) => {
    const out = items.map(() => ({ status: 'pending' }));
    let next = 0;
    let active = 0;
    let finished = false;
    let timer = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(out);
    };
    if (Number.isFinite(deadline)) timer = setTimeout(finish, Math.max(0, deadline - Date.now()));
    const launch = () => {
      while (!finished && active < limit && next < items.length && Date.now() < deadline) {
        const i = next++;
        active++;
        Promise.resolve()
          .then(() => fn(items[i], i))
          .then(
            (value) => (out[i] = { status: 'fulfilled', value }),
            (reason) => (out[i] = { status: 'rejected', reason }),
          )
          .then(() => {
            active--;
            if (next >= items.length && active === 0) finish();
            else launch();
          });
      }
      if (!items.length || (active === 0 && next >= items.length)) finish();
    };
    launch();
  });
}

// Settle one promise by a deadline.
export function within(promise, deadline) {
  return pool([promise], 1, (p) => p, { deadline }).then((r) => r[0]);
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

// Small in-memory memo for warm function instances. Concurrent callers share one
// fetch. `ttl` may be a function of the resolved value (shorter for partial results).
const memo = new Map();
export const clearMemo = () => memo.clear();
export function memoize(key, ttl, fn) {
  const hit = memo.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = Promise.resolve().then(fn);
  const entry = { value, expires: Date.now() + (typeof ttl === 'function' ? 60_000 : ttl) };
  memo.set(key, entry);
  value.then(
    (v) => {
      if (typeof ttl === 'function') entry.expires = Date.now() + ttl(v);
    },
    () => memo.delete(key),
  );
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

export const errorText = (e) => `${e?.status ? `HTTP ${e.status}` : e?.message || e}`;
