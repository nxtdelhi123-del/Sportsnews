import { publishDraft, skipDraft, markPosted, runAutopilot, secret as autopilotSecret } from '../autopilot.js';
import { answerCallback, clearButtons, sendText, ownerChat, claimOwner } from '../telegram.js';
import { readJSON, sendJSON } from '../../http.js';
import { pauseAutopost, resumeAutopost, autopostPaused, autopostSettings } from '../autopost.js';
import { instagramConfigured } from '../instagram.js';
import { whatsappConfigured } from '../whatsapp.js';
import { scheduleDraft, receiveUpload, setUploadCaption, digestText, upcomingDay } from '../calendar.js';

// POST /api/telegram — the bot's webhook (the autopilot registers it itself).
// Only the owner's chat can press the buttons: TELEGRAM_CHAT_ID, or the first chat to send /start.
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'POST only' });
  const secret = autopilotSecret();
  if (!secret || req.headers?.['x-telegram-bot-api-secret-token'] !== secret) return sendJSON(res, 401, { error: 'Unauthorized' });
  let update;
  try {
    update = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: 'Body must be JSON' });
  }
  const msg = update?.message;
  if (msg && /^\/start\b/.test(msg.text || '')) {
    const mine = await claimOwner(msg.chat.id, msg.from?.first_name || '').catch(() => false);
    if (mine) await sendText('✅ Connected. New big stories for @thesportsbinge will arrive here as drafts with Post / Skip buttons. Send /check any time to look for news right now.', { chat_id: msg.chat.id }).catch(() => null);
    return sendJSON(res, 200, { ok: true });
  }
  const owner = await ownerChat();
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
      } else if (action === 'sched') {
        const out = await scheduleDraft(id);
        await answerCallback(cb.id, out.message).catch(() => null);
        if (out.ok) await sendText(`🕒 ${out.message} Tap Skip to cancel.`, { reply_to_message_id: cb.message.message_id });
      } else if (action === 'skip' || action === 'mine') {
        const out = action === 'skip' ? await skipDraft(id) : await markPosted(id);
        await answerCallback(cb.id, out.message).catch(() => null);
        if (out.ok) await clearButtons(chatId, cb.message.message_id);
      }
    } else if (String(msg?.chat?.id ?? '') === owner && (msg.photo || msg.document)) {
      // A finished post from the team: queue it for its slot after the editor's tap.
      const out = await receiveUpload(msg);
      if (out.text) await sendText(out.text, { reply_to_message_id: msg.message_id });
    } else if (String(msg?.chat?.id ?? '') === owner && msg.reply_to_message && msg.text && !msg.text.startsWith('/')) {
      const out = await setUploadCaption(msg);
      if (out) await sendText(out.text, { reply_to_message_id: msg.message_id });
    } else if (String(msg?.chat?.id ?? '') === owner && /^\/(tomorrow|plan)\b/.test(msg.text || '')) {
      const day = upcomingDay();
      await sendText(digestText(day) || `Nothing on the ${day} calendar needs you.`);
    } else if (String(msg?.chat?.id ?? '') === owner && /^\/(pause|stop)\b/.test(msg.text || '')) {
      // the editor's off switch for posts that go out on their own
      await pauseAutopost();
      await sendText('⏸ Auto-posting paused. Confirmed breaking news now comes here as drafts for your tap. Send /resume to switch it back on.');
    } else if (String(msg?.chat?.id ?? '') === owner && /^\/(resume|start_autopost)\b/.test(msg.text || '')) {
      await resumeAutopost();
      await sendText('▶️ Auto-posting is back on: breaking news confirmed by an official source posts on its own; everything else waits for your tap.');
    } else if (String(msg?.chat?.id ?? '') === owner && /^\/(status|autopost)\b/.test(msg.text || '')) {
      const cfg = autopostSettings();
      const paused = await autopostPaused();
      await sendText(
        [
          `Auto-post: ${!cfg.on ? 'off (AUTOPOST=off)' : paused ? 'paused (/resume)' : 'on (/pause to stop)'}`,
          `Instagram: ${instagramConfigured('tsb') ? 'connected' : 'not connected yet, so confirmed news arrives here as drafts'}`,
          `WhatsApp alerts: ${whatsappConfigured() ? 'on' : 'not set up'}`,
          `Posts on its own: ${cfg.priorities.join('/')} breaking news from official sites, under ${cfg.maxAgeMin} min old, at most ${cfg.dailyCap} a day, ${cfg.gapMin} min apart.`,
        ].join('\n'),
      );
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
