import { fetchEspn } from './espn.js';
import { fetchCricket } from './cricket.js';
import { fetchSofaSport, fetchSofaLive } from './sofa.js';
import { fetchSportsDb, TSDB_SPORTS, TSDB_OVERVIEW } from './sportsdb.js';
import { parseFeed, classify } from './rss.js';
import { ESPN_LEAGUES, NEWS_FEEDS, SOFA_SPORTS } from './sources.js';
import { errorText, fetchWithTimeout, memoize, nextSlot, pool, within } from './http.js';
import { matchTier, newsTier, TIERS } from './importance.js';

const STATE_RANK = { in: 0, pre: 1, post: 2 };
const WARM_TTL = 4 * 60_000;
const PARTIAL_TTL = 40_000;
// Hard budget for one build: whatever hasn't answered by then is left out and the
// response is marked partial, so the page always loads quickly.
const BUDGET_MS = 9000;
const MAX_MATCHES = 3500;

export function sortMatches(list) {
  return list.sort((a, b) => {
    const r = (STATE_RANK[a.status.state] ?? 1) - (STATE_RANK[b.status.state] ?? 1);
    if (r) return r;
    const ta = Date.parse(a.date) || 0;
    const tb = Date.parse(b.date) || 0;
    return a.status.state === 'post' ? tb - ta : ta - tb;
  });
}

// ---------- de-duplication across sources ----------
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
  for (const m of primary) {
    if (m.kind !== 'versus') continue;
    const t = Date.parse(m.date);
    if (!t) continue;
    const key = `${m.sport}|${Math.floor(t / HOUR)}`;
    const entry = { h: tokens(m.home?.name), a: tokens(m.away?.name), t };
    (index.get(key) || index.set(key, []).get(key)).push(entry);
  }
  const extra = secondary.filter((m) => {
    const t = Date.parse(m.date);
    if (!t) return true;
    const h = tokens(m.home?.name);
    const a = tokens(m.away?.name);
    if (!h.size || !a.size) return true;
    const bucket = Math.floor(t / HOUR);
    for (let b = bucket - 3; b <= bucket + 3; b++) {
      for (const p of index.get(`${m.sport}|${b}`) || []) {
        if ((overlap(h, p.h) && overlap(a, p.a)) || (overlap(h, p.a) && overlap(a, p.h))) return false;
      }
    }
    return true;
  });
  return [...primary, ...extra];
}

function finalize(matches) {
  const seen = new Set();
  let unique = matches.filter((m) => {
    const k = `${m.league.path}:${m.id}`;
    return seen.has(k) ? false : seen.add(k);
  });
  if (unique.length > MAX_MATCHES) {
    // Keep live first, then the most important competitions.
    unique = unique
      .sort((a, b) => (STATE_RANK[a.status.state] ?? 1) - (STATE_RANK[b.status.state] ?? 1) || (b.league.priority || 0) - (a.league.priority || 0))
      .slice(0, MAX_MATCHES);
  }
  for (const m of unique) {
    const { tier, reason } = matchTier(m);
    m.tier = tier;
    m.tierReason = reason;
  }
  return sortMatches(unique);
}

const SCORE_SPORTS = new Set([...ESPN_LEAGUES.map((l) => l.sport), ...Object.keys(SOFA_SPORTS), ...Object.keys(TSDB_SPORTS)]);
export const isScoreSport = (s) => s === 'all' || SCORE_SPORTS.has(s);

// Collect pool results for one source family into matches + a status summary.
function gather(results, labelOf, family) {
  const out = { matches: [], failed: [], ok: 0, pending: 0, attempted: results.length };
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      out.matches.push(...(Array.isArray(r.value) ? r.value : r.value?.matches || []));
      out.ok++;
    } else if (r.status === 'pending') out.pending++;
    else out.failed.push({ source: `${family} ${labelOf(i)}`.trim(), error: errorText(r.reason) });
  });
  return out;
}

async function build(sport) {
  const now = Date.now();
  const deadline = now + BUDGET_MS;
  const leagues = sport === 'all' ? ESPN_LEAGUES : ESPN_LEAGUES.filter((l) => l.sport === sport);
  const sofaSlugs = sport === 'all' ? Object.values(SOFA_SPORTS) : SOFA_SPORTS[sport] ? [SOFA_SPORTS[sport]] : [];
  const tsdbSports = sport === 'all' ? TSDB_OVERVIEW : TSDB_SPORTS[sport] ? [sport] : [];
  const wantCricket = sport === 'all' || sport === 'cricket';

  const [espn, cricket, sofaRes, tsdbRes] = await Promise.all([
    leagues.length ? fetchEspn(leagues, now, deadline) : { matches: [], failed: [], ok: 0, pending: 0 },
    wantCricket ? within(fetchCricket(), deadline) : null,
    pool(sofaSlugs, 8, (slug) => (sport === 'all' ? fetchSofaLive(slug, now) : fetchSofaSport(slug, now)), { deadline }),
    pool(tsdbSports, 3, (s) => fetchSportsDb(s, now), { deadline }),
  ]);

  const sofa = gather(sofaRes, (i) => sofaSlugs[i], 'Sofascore');
  const tsdb = gather(tsdbRes, (i) => tsdbSports[i], 'TheSportsDB');
  const cric = gather(cricket ? [cricket] : [], () => '', 'ESPNcricinfo');
  const families = {
    espn: { ...espn, attempted: leagues.length },
    cricinfo: cric,
    sofascore: sofa,
    sportsdb: tsdb,
  };

  // Richest data first; the others fill in what's missing.
  let merged = mergeSources([...espn.matches, ...cric.matches], sofa.matches);
  merged = mergeSources(merged, tsdb.matches);
  const matches = finalize(merged);

  const live = {};
  const bySource = {};
  const tiers = { vimp: 0, imp: 0, low: 0 };
  for (const m of matches) {
    tiers[m.tier] = (tiers[m.tier] || 0) + 1;
    if (m.status.state === 'in') live[m.sport] = (live[m.sport] || 0) + 1;
    bySource[m.source] = (bySource[m.source] || 0) + 1;
  }
  const failed = Object.values(families).flatMap((f) => f.failed);
  const pending = Object.values(families).reduce((n, f) => n + f.pending, 0);
  const summary = Object.fromEntries(
    Object.entries(families).map(([k, f]) => [k, { attempted: f.attempted, ok: f.ok, failed: f.failed.length, pending: f.pending, matches: bySource[k] || 0 }]),
  );
  return {
    sport,
    updatedAt: new Date(now).toISOString(),
    nextUpdateAt: new Date(nextSlot(now)).toISOString(),
    count: matches.length,
    partial: pending > 0,
    live,
    tiers,
    sources: { ok: Object.values(families).reduce((n, f) => n + f.ok, 0), pending, families: summary, failed: failed.slice(0, 60) },
    matches,
  };
}

export function getScores(sport = 'all') {
  return memoize(`scores:${sport}`, (v) => (v.partial ? PARTIAL_TTL : WARM_TTL), () => build(sport));
}

// ---------- news ----------
const titleKey = (t) => t.toLowerCase().replace(/\s+-\s+[^-]+$/, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 90);
const MAX_AGE = 3 * 86_400_000;

export function mergeNews(perFeed, now = Date.now()) {
  const seen = new Map();
  for (const { feed, items } of perFeed) {
    for (const it of items) {
      if (it.published && now - Date.parse(it.published) > MAX_AGE) continue;
      if (feed.filter && !feed.filter.test(it.link)) continue;
      // Google News appends " - Publisher" to titles.
      let { title } = it;
      let source = it.origin || feed.name;
      if (feed.url.includes('news.google.com')) {
        const m = title.match(/^(.*)\s+-\s+([^-]+)$/);
        if (m) {
          title = m[1];
          source = it.origin || m[2];
        }
      }
      const key = titleKey(title);
      if (!key) continue;
      const sport = feed.sport === 'general' ? classify(`${title} ${it.summary}`) : feed.sport;
      const item = { id: key.replace(/ /g, '-').slice(0, 60), title, link: it.link, source, sport, published: it.published, summary: it.summary, image: it.image };
      item.tier = newsTier(item);
      const prev = seen.get(key);
      if (!prev) seen.set(key, item);
      else {
        if (!prev.image && item.image) prev.image = item.image;
        if (!prev.summary && item.summary) prev.summary = item.summary;
      }
    }
  }
  return [...seen.values()].sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0)).slice(0, 900);
}

export function getNews() {
  return memoize('news', (v) => (v.partial ? PARTIAL_TTL : WARM_TTL), async () => {
    const now = Date.now();
    const results = await pool(NEWS_FEEDS, 16, (f) => fetchWithTimeout(f.url, { as: 'text', timeout: 6000 }), { deadline: now + BUDGET_MS });
    const perFeed = [];
    const failed = [];
    let pending = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') perFeed.push({ feed: NEWS_FEEDS[i], items: parseFeed(r.value) });
      else if (r.status === 'pending') pending++;
      else failed.push({ source: NEWS_FEEDS[i].name, error: errorText(r.reason) });
    });
    const items = mergeNews(perFeed, now);
    return {
      updatedAt: new Date(now).toISOString(),
      nextUpdateAt: new Date(nextSlot(now)).toISOString(),
      count: items.length,
      partial: pending > 0,
      sources: { ok: perFeed.length, pending, failed },
      items,
    };
  });
}
