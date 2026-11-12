// Sofascore's public JSON API from the server. The normalizers live in
// public/js/sofa.js so the browser can run them too: Sofascore answers 403 to
// datacenter IPs (Vercel's included), and no header set gets past that, so when
// the server is blocked the visitor's browser fetches Sofascore itself.
import { SOFA_HOSTS, buildSofaMatch, collectSofa, normalizeSofa, sofaLivePath, sofaSportPaths } from '../public/js/sofa.js';
import { blockFor, blockedFor, fetchWithTimeout, memoize, pool } from './http.js';

export { normalizeSofa };

// What Chrome sends for a cross-site XHR from sofascore.com.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-GB,en;q=0.9',
  Origin: 'https://www.sofascore.com',
  Referer: 'https://www.sofascore.com/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'X-Requested-With': 'XMLHttpRequest',
  'Cache-Control': 'no-cache',
};

// Try each host in turn: one may be rate-limited or blocked when the other isn't.
// After a 403 (bot protection) Sofascore is left alone for 30 minutes.
export async function sofaGet(path, timeout = 8000) {
  const mins = blockedFor('sofascore');
  if (mins) throw Object.assign(new Error(`HTTP 403 (blocked here, next try in ${mins} min)`), { status: 403 });
  let err;
  for (const host of SOFA_HOSTS) {
    try {
      return await fetchWithTimeout(host + path, { headers: HEADERS, timeout, retries: 0 });
    } catch (e) {
      err = e;
      if (e.status === 404) break;
    }
  }
  if (err?.status === 403) blockFor('sofascore', 30 * 60_000);
  throw err;
}

function sofaList(path, ttl) {
  return memoize(`sofa:${path}`, ttl, async () => (await sofaGet(path)).events || []);
}

// Everything for one sport from yesterday to tomorrow (UTC), plus whatever is live.
export async function fetchSofaSport(slug, now = Date.now()) {
  const paths = sofaSportPaths(slug, now);
  const results = await pool(paths, 4, (p) => sofaList(p, p.includes('/live') ? 2 * 60_000 : 4 * 60_000));
  if (results.every((r) => r.status === 'rejected')) throw results[0].reason;
  return collectSofa(
    results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
    slug,
    now,
  );
}

export async function fetchSofaLive(slug, now = Date.now()) {
  return (await sofaList(sofaLivePath(slug), 2 * 60_000)).map((e) => normalizeSofa(e, slug, now)).filter(Boolean);
}

// Full match details (for copy / poster).
export const sofaMatch = (slug, id, now = Date.now()) => buildSofaMatch((path) => sofaGet(path), slug, id, now);
