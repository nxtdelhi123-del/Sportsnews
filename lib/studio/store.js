// Small key-value store for the autopilot: Upstash Redis over its REST API (what Vercel's
// "Upstash for Redis" / KV integration provides), or an in-memory map when no store is
// configured (local runs and tests). Only the handful of commands the autopilot needs.

const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const storeConfigured = () => !!(url() && token());

const mem = new Map(); // key → { value, expires }
export function resetMemoryStore() {
  mem.clear();
}

async function redis(cmd) {
  const res = await fetch(url(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.error) throw new Error(`store: ${out.error || `HTTP ${res.status}`}`);
  return out.result;
}

const live = (k) => {
  const e = mem.get(k);
  if (e && e.expires && e.expires < Date.now()) {
    mem.delete(k);
    return undefined;
  }
  return e;
};

// SET key value NX EX ttl → true when this call claimed the key.
export async function claim(key, ttlSeconds) {
  if (storeConfigured()) return (await redis(['SET', key, '1', 'NX', 'EX', String(ttlSeconds)])) === 'OK';
  if (live(key)) return false;
  mem.set(key, { value: '1', expires: Date.now() + ttlSeconds * 1000 });
  return true;
}

export async function getJSON(key) {
  const raw = storeConfigured() ? await redis(['GET', key]) : live(key)?.value;
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setJSON(key, value, ttlSeconds) {
  const raw = JSON.stringify(value);
  if (storeConfigured()) return redis(['SET', key, raw, 'EX', String(ttlSeconds)]);
  mem.set(key, { value: raw, expires: Date.now() + ttlSeconds * 1000 });
}

export async function incr(key, ttlSeconds) {
  if (storeConfigured()) {
    const n = await redis(['INCR', key]);
    if (n === 1) await redis(['EXPIRE', key, String(ttlSeconds)]);
    return n;
  }
  const n = Number(live(key)?.value || 0) + 1;
  mem.set(key, { value: String(n), expires: live(key)?.expires || Date.now() + ttlSeconds * 1000 });
  return n;
}

export async function getNumber(key) {
  const raw = storeConfigured() ? await redis(['GET', key]) : live(key)?.value;
  return Number(raw || 0);
}

export async function del(key) {
  if (storeConfigured()) return redis(['DEL', key]);
  mem.delete(key);
}

// A capped list, newest first (LPUSH + LTRIM). Used for the editor's Post/Skip history.
export async function pushList(key, value, max) {
  const raw = JSON.stringify(value);
  if (storeConfigured()) {
    await redis(['LPUSH', key, raw]);
    return redis(['LTRIM', key, '0', String(max - 1)]);
  }
  const list = [raw, ...(live(key)?.value || [])].slice(0, max);
  mem.set(key, { value: list, expires: 0 });
}

export async function getList(key, max) {
  const raw = storeConfigured() ? await redis(['LRANGE', key, '0', String(max - 1)]) : live(key)?.value || [];
  return (raw || []).map((r) => {
    try {
      return JSON.parse(r);
    } catch {
      return null;
    }
  }).filter(Boolean);
}
