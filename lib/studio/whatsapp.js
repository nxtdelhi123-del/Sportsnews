// WhatsApp alerts to the editor's own phone, free, through CallMeBot (callmebot.com).
// CallMeBot sends WhatsApp messages to a number that has allowed it, at no cost, for personal
// alerts. Setup on the phone, once: add CallMeBot's WhatsApp number (shown on
// callmebot.com → WhatsApp) to contacts, send it "I allow callmebot to send me messages", and
// it replies with an API key. Then in Vercel: WHATSAPP_PHONE (with country code, e.g.
// +9198xxxxxxxx) and WHATSAPP_APIKEY.
//
// WHATSAPP_ALERTS picks what is sent: 'autopost' (only posts that went out on their own),
// 'p1' (those, plus P1 drafts waiting for a tap; the default), 'all' (every draft), 'off'.
// A failed WhatsApp alert never stops a draft or a post: Telegram stays the main channel.

export const whatsappConfigured = () => !!(process.env.WHATSAPP_PHONE && process.env.WHATSAPP_APIKEY);
const level = () => String(process.env.WHATSAPP_ALERTS || 'p1').toLowerCase();

export function wantsWhatsapp({ autoposted = false, priority = '' } = {}) {
  if (!whatsappConfigured()) return false;
  const l = level();
  if (l === 'off') return false;
  if (autoposted) return true;
  if (l === 'all') return true;
  return l === 'p1' && priority === 'P1';
}

export async function sendWhatsapp(text) {
  if (!whatsappConfigured()) return { ok: false, skipped: true };
  const qs = new URLSearchParams({ phone: process.env.WHATSAPP_PHONE, text: String(text).slice(0, 1500), apikey: process.env.WHATSAPP_APIKEY });
  const res = await fetch(`https://api.callmebot.com/whatsapp.php?${qs}`);
  const body = await res.text().catch(() => '');
  if (!res.ok || /error|invalid|not allowed|apikey is not/i.test(body.slice(0, 400))) throw new Error(`whatsapp: ${res.status} ${body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 120)}`);
  return { ok: true };
}

// One short alert: what happened, the headline, and where to act.
export function whatsappText(draft, { autoposted = false, permalink = '' } = {}) {
  const head = draft.pack?.words?.headline || draft.pack?.story?.title || '';
  return [
    autoposted ? `✅ The Sports Binge posted (Confirmed, ${draft.source}):` : `🆕 ${draft.priority} ${draft.status} draft waiting in Telegram:`,
    head,
    autoposted ? permalink || '' : 'Open the Telegram bot to Post or Skip.',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function alertWhatsapp(draft, opts = {}, log = console) {
  if (!wantsWhatsapp({ autoposted: opts.autoposted, priority: draft.priority })) return false;
  try {
    await sendWhatsapp(whatsappText(draft, opts));
    return true;
  } catch (e) {
    log.error?.('whatsapp:', e.message);
    return false;
  }
}
