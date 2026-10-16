import { ESPN_LEAGUES, NEWS_FEEDS, SOFA_SPORTS, CRICINFO_CURRENT } from '../lib/sources.js';
import { errorText, fetchWithTimeout, nextSlot, sendJSON } from '../lib/http.js';
import { TSDB_SPORTS } from '../lib/sportsdb.js';

const BROWSER = { Referer: 'https://www.espncricinfo.com/' };
const SOFA = { Origin: 'https://www.sofascore.com', Referer: 'https://www.sofascore.com/' };

async function probe(name, url, count, opts = {}) {
  const t = Date.now();
  try {
    const body = await fetchWithTimeout(url, { retries: 0, timeout: 8000, ...opts });
    return { source: name, ok: true, ms: Date.now() - t, items: count(body) };
  } catch (e) {
    return { source: name, ok: false, ms: Date.now() - t, status: e.status || null, error: errorText(e) };
  }
}

const today = () => new Date().toISOString().slice(0, 10);

// /api/health          → quick check
// /api/health?deep=1   → one real request to each kind of upstream, from this server
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const body = {
    ok: true,
    now: new Date().toISOString(),
    nextUpdateAt: new Date(nextSlot()).toISOString(),
    region: process.env.VERCEL_REGION || null,
    sources: { espnCompetitions: ESPN_LEAGUES.length, sofascoreSports: Object.keys(SOFA_SPORTS).length, sportsDbSports: Object.keys(TSDB_SPORTS).length, newsFeeds: NEWS_FEEDS.length },
  };
  if (req.query?.deep) {
    const items = (b) => b?.events?.length ?? b?.matches?.length ?? 0;
    body.probes = await Promise.all([
      probe('ESPN (site.api)', 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard', items),
      probe('ESPN (site.web.api)', 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard', items),
      probe('ESPN date range', `https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard?dates=${today().replace(/-/g, '')}-${today().replace(/-/g, '')}`, items),
      probe('ESPN NBA', 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard', items),
      probe('Sofascore (api.)', 'https://api.sofascore.com/api/v1/sport/football/events/live', items, { headers: SOFA }),
      probe('Sofascore (www.)', 'https://www.sofascore.com/api/v1/sport/basketball/events/live', items, { headers: SOFA }),
      probe('TheSportsDB', `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today()}&s=Soccer`, items),
      probe('ESPNcricinfo', CRICINFO_CURRENT, items, { headers: BROWSER }),
      probe('BBC Sport RSS', NEWS_FEEDS[0].url, (t) => (t.match(/<item/g) || []).length, { as: 'text' }),
      probe('Google News RSS', NEWS_FEEDS.find((f) => f.url.includes('news.google')).url, (t) => (t.match(/<item/g) || []).length, { as: 'text' }),
    ]);
    body.ok = body.probes.some((p) => p.ok && /ESPN|Sofascore|TheSportsDB/.test(p.source));
  }
  sendJSON(res, 200, body);
}
