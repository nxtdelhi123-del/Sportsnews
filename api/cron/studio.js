import { runAutopilot } from '../../lib/studio/autopilot.js';
import { sendJSON } from '../../lib/http.js';

// GET /api/cron/studio — one autopilot pass. Call it every 1–2 minutes from a scheduler
// (cron-job.org, GitHub Actions, or Vercel Cron on Pro) with
// `Authorization: Bearer <AUTOPILOT_SECRET>` (or CRON_SECRET, which Vercel Cron sends) or `?key=<AUTOPILOT_SECRET>`.
export default async function handler(req, res) {
  const want = [process.env.AUTOPILOT_SECRET, process.env.CRON_SECRET].filter(Boolean);
  const got = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '') || String(req.query?.key || '');
  if (!want.length) return sendJSON(res, 503, { error: 'Set AUTOPILOT_SECRET first' });
  if (!want.includes(got)) return sendJSON(res, 401, { error: 'Unauthorized' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    sendJSON(res, 200, { at: new Date().toISOString(), ...(await runAutopilot()) });
  } catch (err) {
    sendJSON(res, 500, { error: 'Autopilot run failed', detail: String(err?.message || err) });
  }
}
