import { fetchAllEspn } from './espn.js';
import { fetchCricket } from './cricket.js';
import { parseFeed, classify } from './rss.js';
import { NEWS_FEEDS } from './sources.js';
import { fetchWithTimeout, memoize, nextSlot } from './http.js';

const STATE_RANK = { in: 0, pre: 1, post: 2 };
const WARM_TTL = 4 * 60_000;

export function sortMatches(list) {
  return list.sort((a, b) => {
    const r = (STATE_RANK[a.status.state] ?? 1) - (STATE_RANK[b.status.state] ?? 1);
    if (r) return r;
    const ta = Date.parse(a.date) || 0;
    const tb = Date.parse(b.date) || 0;
    return a.status.state === 'post' ? tb - ta : ta - tb;
  });
}

export function getScores() {
  return memoize('scores', WARM_TTL, async () => {
    const now = Date.now();
    const [espn, cricket] = await Promise.allSettled([fetchAllEspn(now), fetchCricket()]);
    const matches = [];
    const failed = [];
    let ok = 0;
    if (espn.status === 'fulfilled') {
      matches.push(...espn.value.matches);
      failed.push(...espn.value.failed);
      ok += espn.value.ok;
    } else failed.push({ source: 'ESPN', error: String(espn.reason) });
    if (cricket.status === 'fulfilled') {
      matches.push(...cricket.value);
      ok += 1;
    } else failed.push({ source: 'ESPNcricinfo', error: String(cricket.reason?.message || cricket.reason) });

    const seen = new Set();
    const unique = matches.filter((m) => {
      const k = `${m.league.path}:${m.id}`;
      return seen.has(k) ? false : seen.add(k);
    });
    return {
      updatedAt: new Date(now).toISOString(),
      nextUpdateAt: new Date(nextSlot(now)).toISOString(),
      count: unique.length,
      sources: { ok, failed },
      matches: sortMatches(unique),
    };
  });
}

const titleKey = (t) => t.toLowerCase().replace(/\s+-\s+[^-]+$/, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 90);
const MAX_AGE = 3 * 86_400_000;

export function mergeNews(perFeed, now = Date.now()) {
  const seen = new Map();
  for (const { feed, items } of perFeed) {
    for (const it of items) {
      if (it.published && now - Date.parse(it.published) > MAX_AGE) continue;
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
      const prev = seen.get(key);
      if (!prev) seen.set(key, item);
      else if (!prev.image && item.image) prev.image = item.image;
    }
  }
  return [...seen.values()].sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0)).slice(0, 400);
}

export function getNews() {
  return memoize('news', WARM_TTL, async () => {
    const now = Date.now();
    const results = await Promise.allSettled(NEWS_FEEDS.map((f) => fetchWithTimeout(f.url, { as: 'text' })));
    const perFeed = [];
    const failed = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') perFeed.push({ feed: NEWS_FEEDS[i], items: parseFeed(r.value) });
      else failed.push({ source: NEWS_FEEDS[i].name, error: String(r.reason?.message || r.reason) });
    });
    const items = mergeNews(perFeed, now);
    return {
      updatedAt: new Date(now).toISOString(),
      nextUpdateAt: new Date(nextSlot(now)).toISOString(),
      count: items.length,
      sources: { ok: perFeed.length, failed },
      items,
    };
  });
}
