// Telegram bot: sends each new draft to the owner's phone with Post / Skip buttons.
// Needs only TELEGRAM_BOT_TOKEN: the owner's chat is TELEGRAM_CHAT_ID when set, otherwise
// whoever sends /start to the bot first (remembered in the store).
import { claim, getJSON, setJSON } from './store.js';

export const telegramConfigured = () => !!process.env.TELEGRAM_BOT_TOKEN;
const FOREVER = 10 * 365 * 24 * 3600;
export async function ownerChat() {
  if (process.env.TELEGRAM_CHAT_ID) return String(process.env.TELEGRAM_CHAT_ID);
  const o = await getJSON('ap:owner').catch(() => null);
  return o?.chatId ? String(o.chatId) : '';
}
// The first /start claims the bot; later ones from other chats are ignored.
export async function claimOwner(chatId, name = '') {
  if (process.env.TELEGRAM_CHAT_ID) return String(process.env.TELEGRAM_CHAT_ID) === String(chatId);
  if (await claim('ap:owner-claimed', FOREVER)) {
    await setJSON('ap:owner', { chatId: String(chatId), name, at: new Date().toISOString() }, FOREVER);
    return true;
  }
  return (await ownerChat()) === String(chatId);
}

async function call(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const out = await res.json().catch(() => ({}));
  if (!out.ok) throw new Error(`telegram ${method}: ${out.description || `HTTP ${res.status}`}`);
  return out.result;
}

// Telegram captions are capped at 1024 characters.
const cap = (s, n = 1024) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function draftButtons(id, { canPost = true } = {}) {
  const row = canPost ? [{ text: '✅ Post now', callback_data: `post:${id}` }, { text: '✖ Skip', callback_data: `skip:${id}` }] : [{ text: '✖ Skip', callback_data: `skip:${id}` }];
  return { inline_keyboard: [row] };
}

// The message the owner reads before tapping Post: what it is, how sure we are, where
// it came from, then the exact Instagram caption.
export function draftMessage(d, opts = {}) {
  const { header } = opts;
  const lines = [
    header || `🆕 ${d.priority} · ${d.status} · ${d.type}`,
    d.source ? `Source: ${d.source}${d.link ? ` — ${d.link}` : ''}` : null,
    opts.canPost === false ? 'Instagram isn’t connected yet: save the image and post it yourself.' : null,
    '',
    d.caption,
  ].filter((x) => x !== null);
  return cap(lines.join('\n'));
}

export async function sendDraft(d, photoUrl, opts = {}) {
  return call('sendPhoto', {
    chat_id: opts.chatId || (await ownerChat()),
    photo: photoUrl,
    caption: draftMessage(d, opts),
    reply_markup: opts.buttons === false ? undefined : draftButtons(d.id, opts),
    disable_notification: false,
  });
}

export const sendText = async (text, extra = {}) => call('sendMessage', { chat_id: extra.chat_id || (await ownerChat()), text: cap(text, 4000), disable_web_page_preview: true, ...extra });
export const setWebhook = (url, secretToken) => call('setWebhook', { url, secret_token: secretToken, allowed_updates: ['message', 'callback_query'] });
export const answerCallback = (id, text) => call('answerCallbackQuery', { callback_query_id: id, text: text ? cap(text, 190) : undefined });
export const clearButtons = (chatId, messageId) => call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }).catch(() => null);
