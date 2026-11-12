import { checkSig, renderDraft } from '../../lib/studio/autopilot.js';
import { getJSON } from '../../lib/studio/store.js';
import { sendJSON } from '../../lib/http.js';

// GET /api/studio/media?id=&sig= — an autopilot draft as a 1080×1350 JPEG. This is the
// public URL Telegram and Instagram fetch; the signature keeps other drafts private.
export default async function handler(req, res) {
  const id = String(req.query?.id || '');
  if (!/^[\w-]{6,40}$/.test(id) || !checkSig(id, req.query?.sig)) return sendJSON(res, 403, { error: 'Bad link' });
  const draft = await getJSON(`ap:draft:${id}`).catch(() => null);
  if (!draft) return sendJSON(res, 404, { error: 'Draft not found or expired' });
  try {
    const jpeg = await renderDraft(draft);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400');
    res.end(Buffer.from(jpeg));
  } catch (err) {
    sendJSON(res, 500, { error: 'Render failed', detail: String(err?.message || err) });
  }
}
