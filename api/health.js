import { ESPN_LEAGUES, NEWS_FEEDS } from '../lib/sources.js';
import { nextSlot, sendJSON } from '../lib/http.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  sendJSON(res, 200, {
    ok: true,
    now: new Date().toISOString(),
    nextUpdateAt: new Date(nextSlot()).toISOString(),
    sources: { scoreboards: ESPN_LEAGUES.length + 1, newsFeeds: NEWS_FEEDS.length },
  });
}
