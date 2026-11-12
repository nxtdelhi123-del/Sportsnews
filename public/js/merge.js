// Combining matches from several providers: ordering and de-duplication.
// Shared by the server (lib/feeds.js) and the browser (js/app.js), which merges
// Sofascore's answer into the page when the server can't reach Sofascore.

const STATE_RANK = { in: 0, pre: 1, post: 2 };

export function sortMatches(list) {
  return list.sort((a, b) => {
    const r = (STATE_RANK[a.status.state] ?? 1) - (STATE_RANK[b.status.state] ?? 1);
    if (r) return r;
    const ta = Date.parse(a.date) || 0;
    const tb = Date.parse(b.date) || 0;
    return a.status.state === 'post' ? tb - ta : ta - tb;
  });
}

const STOP = new Set(['fc', 'cf', 'afc', 'sc', 'ac', 'club', 'the', 'and', 'united', 'city', 'utd', 'real', 'sporting', 'athletic', 'cd', 'ca', 'fk', 'sk', 'women', 'ladies', 'u19', 'u20', 'u21', 'u23', 'de', 'del', 'la']);
const tokens = (name = '') =>
  new Set(
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(' ')
      .filter((w) => w.length >= 3 && !STOP.has(w)),
  );
const overlap = (a, b) => [...a].some((x) => b.has(x));
const HOUR = 3600_000;

// `primary` (richer data) wins over `secondary` for the same fixture.
export function mergeSources(primary, secondary) {
  const index = new Map();
  const bySport = new Map();
  for (const m of primary) {
    if (m.kind !== 'versus') continue;
    const entry = { h: tokens(m.home?.name), a: tokens(m.away?.name) };
    (bySport.get(m.sport) || bySport.set(m.sport, []).get(m.sport)).push(entry);
    const t = Date.parse(m.date);
    if (!t) continue;
    const key = `${m.sport}|${Math.floor(t / HOUR)}`;
    (index.get(key) || index.set(key, []).get(key)).push(entry);
  }
  const same = (h, a, p) => (overlap(h, p.h) && overlap(a, p.a)) || (overlap(h, p.a) && overlap(a, p.h));
  const extra = secondary.filter((m) => {
    const h = tokens(m.home?.name);
    const a = tokens(m.away?.name);
    if (!h.size || !a.size) return true;
    const t = Date.parse(m.date);
    // No kick-off time (e.g. a live-score RSS entry): match on names alone.
    if (!t) return !(bySport.get(m.sport) || []).some((p) => same(h, a, p));
    const bucket = Math.floor(t / HOUR);
    for (let b = bucket - 3; b <= bucket + 3; b++) {
      for (const p of index.get(`${m.sport}|${b}`) || []) if (same(h, a, p)) return false;
    }
    return true;
  });
  return [...primary, ...extra];
}
