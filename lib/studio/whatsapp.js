// WhatsApp alerts to the editor's own phone, free, through CallMeBot (callmebot.com).
// CallMeBot sends WhatsApp messages to a number that has allowed it, at no cost, for personal
// alerts. Setup on the phone, once: add CallMeBot's WhatsApp number (shown on
// callmebot.com → WhatsApp) to contacts, send it "I allow callmebot to send me messages", and
// it replies with an API key. Then in Vercel: WHATSAPP_PHONE (with country code, e.g.
// +9198xxxxxxxx) and WHATSAPP_APIKEY.
//
// WHATSAPP_ALERTS picks what is sent: 'autopost' (only posts that went out on their own),
// 'p1' (those, plus P1 drafts waiting for a tap), 'all' (every draft; the default, as the editor
// asked on 25 Nov for every important and breaking story on WhatsApp), 'off'.
// A failed WhatsApp alert never stops a draft or a post: Telegram stays the main channel.

// Since 25 Nov 2026 the first choice is Meta's own WhatsApp Cloud API, the way the MUSC delivery
// bot sends: the free test number of the editor's Meta app. Settings: WA_TOKEN (the system
// user's permanent token), WA_PHONE_NUMBER_ID (the sending number's id) and WA_TO (the editor's
// WhatsApp number with country code, digits only). With it each post arrives as the full-quality
// image file, then the caption as a second message. Meta delivers free-form messages only within
// 24 hours of the editor's last message to that number; outside it, the bot sends Meta's
// "hello_world" template once a day as a nudge to reply and reopen the window.
// CallMeBot (WHATSAPP_PHONE, WHATSAPP_APIKEY) stays as the fallback: text only.
import * as store from './store.js';

const meta = () => ({ token: process.env.WA_TOKEN, from: process.env.WA_PHONE_NUMBER_ID, to: String(process.env.WA_TO || process.env.WHATSAPP_PHONE || '').replace(/\D/g, '') });
export const metaConfigured = () => {
  const m = meta();
  return !!(m.token && m.from && m.to);
};
const callmebotConfigured = () => !!(process.env.WHATSAPP_PHONE && process.env.WHATSAPP_APIKEY);
export const whatsappConfigured = () => metaConfigured() || callmebotConfigured();
const level = () => String(process.env.WHATSAPP_ALERTS || 'all').toLowerCase();

export function wantsWhatsapp({ autoposted = false, priority = '' } = {}) {
  if (!whatsappConfigured()) return false;
  const l = level();
  if (l === 'off') return false;
  if (autoposted) return true;
  if (l === 'all') return true;
  return l === 'p1' && priority === 'P1';
}

const WA_VERSION = 'v23.0';
async function metaSend(payload) {
  const m = meta();
  const res = await fetch(`https://graph.facebook.com/${WA_VERSION}/${m.from}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${m.token}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: m.to, ...payload }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.error) {
    const e = new Error(`whatsapp: ${out.error?.message || `HTTP ${res.status}`}`);
    e.code = out.error?.code;
    throw e;
  }
  return out;
}
// Outside Meta's 24-hour window (error 131047, or accepted but undeliverable), one template a
// day asks the editor to reply, which reopens the window.
async function nudge() {
  const day = new Date().toISOString().slice(0, 10);
  if (!(await store.claim(`ap:wa-nudge:${day}`, 24 * 3600).catch(() => false))) return;
  await metaSend({ type: 'template', template: { name: process.env.WA_TEMPLATE || 'hello_world', language: { code: 'en_US' } } }).catch(() => null);
}

// text, and optionally a picture sent first as a full-quality file (Meta only).
export async function sendWhatsapp(text, { imageUrl = '', filename = 'sports-binge-post.jpg' } = {}) {
  if (metaConfigured()) {
    try {
      if (imageUrl) await metaSend({ type: 'document', document: { link: imageUrl, filename } });
      await metaSend({ type: 'text', text: { body: String(text).slice(0, 4000), preview_url: false } });
      return { ok: true, via: 'meta' };
    } catch (e) {
      if (e.code === 131047 || /re-?engage|24 hours/i.test(e.message)) await nudge();
      if (!callmebotConfigured()) throw e;
    }
  }
  if (!callmebotConfigured()) return { ok: false, skipped: true };
  const qs = new URLSearchParams({ phone: process.env.WHATSAPP_PHONE, text: String(text).slice(0, 1500), apikey: process.env.WHATSAPP_APIKEY });
  const res = await fetch(`https://api.callmebot.com/whatsapp.php?${qs}`);
  const body = await res.text().catch(() => '');
  if (!res.ok || /error|invalid|not allowed|apikey is not/i.test(body.slice(0, 400))) throw new Error(`whatsapp: ${res.status} ${body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 120)}`);
  return { ok: true, via: 'callmebot' };
}

// What happened and where to act; with Meta's sender the Instagram caption follows, ready to copy.
export function whatsappText(draft, { autoposted = false, permalink = '' } = {}) {
  const head = draft.pack?.words?.headline || draft.pack?.story?.title || '';
  return [
    autoposted ? `✅ The Sports Binge posted (Confirmed, ${draft.source}):` : `🆕 ${draft.priority} ${draft.status} · ${draft.source || ''}`.trim(),
    head,
    autoposted ? permalink || '' : 'Tap Post or Skip in the Telegram bot.',
    metaConfigured() && draft.caption ? `\nCaption:\n${draft.caption}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function alertWhatsapp(draft, opts = {}, log = console) {
  if (!wantsWhatsapp({ autoposted: opts.autoposted, priority: draft.priority })) return false;
  try {
    await sendWhatsapp(whatsappText(draft, opts), { imageUrl: opts.imageUrl, filename: `sports-binge-${draft.id}.jpg` });
    return true;
  } catch (e) {
    log.error?.('whatsapp:', e.message);
    return false;
  }
}
