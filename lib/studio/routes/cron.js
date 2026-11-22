import { runAutopilot } from '../autopilot.js';
import { runCalendar } from '../calendar.js';
import { claim } from '../store.js';
import { sendJSON } from '../../http.js';

// GET /api/cron/studio — one autopilot pass. Called every few minutes by the GitHub Actions
// workflow (.github/workflows/autopilot.yml) and, optionally, every minute by cron-job.org.
// It needs no key: a pass only ever sends drafts to the owner's own Telegram chat, never sends a
// story twice, and runs at most once every 45 seconds however often it is called.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!(await claim('ap:run', 45).catch(() => true))) return sendJSON(res, 200, { skipped: 'ran less than 45 s ago' });
  try {
    // The calendar first: queued slot posts are due at an exact minute.
    const calendar = await runCalendar().catch((e) => ({ errors: [e.message] }));
    sendJSON(res, 200, { at: new Date().toISOString(), ...(await runAutopilot()), calendar });
  } catch (err) {
    sendJSON(res, 500, { error: 'Autopilot run failed', detail: String(err?.message || err) });
  }
}
