import { readJSON, sendJSON } from '../../lib/http.js';

// Phase 1: decisions are logged (Vercel function logs) and echoed back. Phase 2 stores them in KV.
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  let body;
  try {
    body = await readJSON(req);
  } catch {
    body = null;
  }
  if (!body || !body.key || !['approve', 'reject', 'edit'].includes(body.decision)) return sendJSON(res, 400, { error: 'Expected { brand, key, decision: approve|reject|edit, ... }' });
  const record = { at: new Date().toISOString(), brand: body.brand, key: body.key, decision: body.decision, type: body.type, score: body.score, sport: body.sport, competition: body.competition, headline: body.headline, edited: body.edited };
  console.log('studio-feedback', JSON.stringify(record));
  sendJSON(res, 200, { ok: true, record });
}
