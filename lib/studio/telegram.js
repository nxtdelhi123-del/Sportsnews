// Telegram bot: sends each new draft to the owner's phone with Post / Skip buttons.
// Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.

export const telegramConfigured = () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

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

export function sendDraft(d, photoUrl, opts = {}) {
  return call('sendPhoto', {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    photo: photoUrl,
    caption: draftMessage(d, opts),
    reply_markup: opts.buttons === false ? undefined : draftButtons(d.id, opts),
    disable_notification: false,
  });
}

export const sendText = (text, extra = {}) => call('sendMessage', { chat_id: process.env.TELEGRAM_CHAT_ID, text: cap(text, 4000), disable_web_page_preview: true, ...extra });
export const answerCallback = (id, text) => call('answerCallbackQuery', { callback_query_id: id, text: text ? cap(text, 190) : undefined });
export const clearButtons = (chatId, messageId) => call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }).catch(() => null);
