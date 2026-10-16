import { ESPN_LEAGUES, NEWS_FEEDS, SOFA_SPORTS, CRICINFO_CURRENT } from '../lib/sources.js';
import { fetchWithTimeout, nextSlot, sendJSON } from '../lib/http.js';
import { sofaGet } from '../lib/sofa.js';

async function probe(name, fn) {
  const t = Date.now();
  try {
    const n = await fn();
    return { source: name, ok: true, ms: Date.now() - t, items: n };
  } catch (e) {
    return { source: name, ok: false, ms: Date.now() - t, error: String(e?.message || e) };
  }
}

// /api/health          → quick check
// /api/health?deep=1   → tests one request against each kind of upstream
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const body = {
    ok: true,
    now: new Date().toISOString(),
    nextUpdateAt: new Date(nextSlot()).toISOString(),
    sources: { espnCompetitions: ESPN_LEAGUES.length, sofascoreSports: Object.keys(SOFA_SPORTS).length, newsFeeds: NEWS_FEEDS.length },
  };
  if (req.query?.deep) {
    body.probes = await Promise.all([
      probe('ESPN (Premier League)', async () => (await fetchWithTimeout('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard')).events?.length ?? 0),
      probe('Sofascore (football live)', async () => (await sofaGet('/sport/football/events/live')).events?.length ?? 0),
      probe('ESPNcricinfo', async () => (await fetchWithTimeout(CRICINFO_CURRENT, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.espncricinfo.com/' } })).matches?.length ?? 0),
      probe('BBC Sport RSS', async () => ((await fetchWithTimeout(NEWS_FEEDS[0].url, { as: 'text' })).match(/<item/g) || []).length),
      probe('Google News RSS', async () => ((await fetchWithTimeout(NEWS_FEEDS.find((f) => f.url.includes('news.google')).url, { as: 'text' })).match(/<item/g) || []).length),
    ]);
    body.ok = body.probes.every((p) => p.ok);
  }
  sendJSON(res, 200, body);
}
