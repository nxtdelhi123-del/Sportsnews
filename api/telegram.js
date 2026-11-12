import { publishDraft, skipDraft, runAutopilot } from '../lib/studio/autopilot.js';
import { answerCallback, clearButtons, sendText } from '../lib/studio/telegram.js';
import { readJSON, sendJSON } from '../lib/http.js';

// POST /api/telegram — the bot's webhook. Register it once with
// https://api.telegram.org/bot<TOKEN>/setWebhook?url=<site>/api/telegram&secret_token=<AUTOPILOT_SECRET>
// Only the owner's chat (TELEGRAM_CHAT_ID) can press the buttons.
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  const secret = process.env.AUTOPILOT_SECRET;
  if (!secret || req.headers?.['x-telegram-bot-api-secret-token'] !== secret) return sendJSON(res, 401, { error: 'Unauthorized' });
  let update;
  try {
    update = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: 'Body must be JSON' });
  }
  const owner = String(process.env.TELEGRAM_CHAT_ID || '');
  const cb = update?.callback_query;
  try {
    if (cb) {
      const chatId = String(cb.message?.chat?.id ?? '');
      if (chatId !== owner) return sendJSON(res, 200, { ignored: true });
      const [action, id] = String(cb.data || '').split(':');
      if (action === 'post') {
        await answerCallback(cb.id, 'Posting…').catch(() => null);
        const out = await publishDraft(id);
        if (out.ok) await clearButtons(chatId, cb.message.message_id);
        await sendText(out.ok ? `✅ ${out.message}${out.permalink ? `\n${out.permalink}` : ''}` : `⚠️ ${out.message}`, { reply_to_message_id: cb.message.message_id });
      } else if (action === 'skip') {
        const out = await skipDraft(id);
        await answerCallback(cb.id, out.message).catch(() => null);
        if (out.ok) await clearButtons(chatId, cb.message.message_id);
      }
    } else if (String(update?.message?.chat?.id ?? '') === owner && /^\/(check|now)\b/.test(update.message.text || '')) {
      // "/check" in the chat runs a pass straight away.
      const out = await runAutopilot();
      await sendText(out.drafted.length ? `Sent ${out.drafted.length} new draft(s).` : `Nothing new above the bar.${out.errors.length ? `\n${out.errors.join('\n')}` : ''}`);
    }
  } catch (err) {
    console.error('telegram webhook:', err?.message || err);
  }
  // Always 200 so Telegram doesn't retry the same tap.
  sendJSON(res, 200, { ok: true });
}
