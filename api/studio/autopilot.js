import cron from '../../lib/studio/routes/cron.js';
import media from '../../lib/studio/routes/media.js';
import telegram from '../../lib/studio/routes/telegram.js';
import { sendJSON } from '../../lib/http.js';

// One function for the three autopilot routes (Vercel Hobby allows 12 functions).
// vercel.json rewrites /api/cron/studio, /api/studio/media and /api/telegram here.
const ROUTES = { cron, media, telegram };
export default function handler(req, res) {
  const route = ROUTES[String(req.query?.route || '')];
  return route ? route(req, res) : sendJSON(res, 404, { error: 'Unknown route' });
}
