// The content calendar on autopilot. Every run (the same one-minute cron as the news autopilot):
//   1. Posts the editor queued for a slot go out at the slot's time ("🕒 Post at 12:30 PM").
//      Before Instagram is connected, the bot sends a "time to post" reminder instead.
//   2. CALENDAR_LEAD_MINUTES (30) before each Sports Binge slot, the slot's brief reaches the
//      phone: what to post, the template, the label and where to verify it. For result, data
//      card and main-story slots the bot also sends its best fresh story as a draft, with
//      "🕒 Post at <time>", "✅ Post now" and "✖ Skip".
//   0. The night before (CALENDAR_DIGEST_TIME, 10 PM IST), a list of tomorrow's posts that need
//      something from the editor or the team, and a heads-up 3 hours before each of them.
//   3. A finished post the team made (photo + caption) sent to the bot, as a reply to the slot's
//      brief, is queued for that slot after the editor's tap.
// Nothing reaches Instagram without the editor's tap (their rule since 17 Nov 2026).
import SLOTS from './calendar-data.js';
import * as store from './store.js';
import * as tg from './telegram.js';
import { instagramConfigured } from './instagram.js';
import { candidates, buildPack } from './packs.js';
import { ageHours } from './score.js';
import { draftFrom, seenKey, mediaUrl, photoCheck, publishDraft } from './autopilot.js';

const DAY = 24 * 3600;
const BRAND = 'tsb';
const QUEUE = 'ap:sched';
const lead = () => Number(process.env.CALENDAR_LEAD_MINUTES ?? 30) * 60e3;

export const slotAt = (s) => Date.parse(`${s.date}T${s.time}:00+05:30`);
export const clock = (s) => {
  const [h, m] = s.time.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
export const slotById = (id, slots = SLOTS) => slots.find((s) => s.id === id) || null;
export const nextSlot = (now, slots = SLOTS) => slots.find((s) => slotAt(s) > now) || null;

// Slots the bot can fill from the live newsroom: final scores, numbers, the day's big story.
const FILLABLE = /result|data card|main story|breaking|top 5/i;
const NEWS_TYPES = new Set(['result', 'medal', 'milestone', 'tally', 'stage', 'quote', 'breaking']);
export const fillable = (s) => FILLABLE.test(s.pillar) && /static/i.test(s.format);

// Words from the brief that name the event ("NZ v India 1st Test", "Gukesh"), for picking the story.
const STOP = new Set('the and for with from that this their into tonight today final result card data story biggest verified post posted full time top key numbers live game race'.split(' '));
const words = (t) => new Set(String(t).toLowerCase().match(/[a-z]{3,}/g)?.filter((w) => !STOP.has(w)) || []);

// The freshest big news-type story, preferring one the brief names, not sent before.
export async function pickStory(slot, list, now) {
  const want = words(slot.hook);
  let best = null;
  for (const c of list) {
    if (!NEWS_TYPES.has(c.type) || ageHours(c.story, now) > 12) continue;
    if ((await store.getNumber(seenKey(BRAND, c))) > 0) continue;
    const have = words(`${c.story.title} ${c.story.summary || ''} ${c.story.league?.name || ''}`);
    const hits = [...want].filter((w) => have.has(w)).length;
    const rank = hits * 3 + c.score + (c.type === 'result' ? 1 : 0);
    if (!best || rank > best.rank) best = { c, rank };
  }
  return best?.c || null;
}

export function briefText(s, { canPost }) {
  return [
    `🗓 ${clock(s)} slot (in ${Math.round(lead() / 60e3)} min) · ${s.pillar} · ${s.format}`,
    `Template: ${s.template} · Label: ${s.label} · Owner: ${s.owner}`,
    '',
    s.hook,
    '',
    `Verify with: ${s.verify}`,
    s.notes ? `Note: ${s.notes}` : null,
    s.approval === 'Needs approval' ? '⚠️ Needs your approval before it goes out.' : null,
    '',
    `Made it yourself? Reply to this message with the image (as a photo) and the caption, and I’ll ${canPost ? 'post it' : 'remind you'} at ${clock(s)} when you tap.`,
  ].filter((l) => l !== null).join('\n');
}

async function queue() {
  return (await store.getJSON(QUEUE)) || [];
}
async function saveQueue(q) {
  await store.setJSON(QUEUE, q, 60 * DAY);
}

// The editor's "🕒 Post at" tap.
export async function scheduleDraft(id, now = Date.now()) {
  const draft = await store.getJSON(`ap:draft:${id}`);
  if (!draft) return { ok: false, message: 'This draft has expired.' };
  if (draft.state === 'published') return { ok: false, message: 'Already posted.' };
  const slot = slotById(draft.slot);
  const at = slot ? slotAt(slot) : 0;
  if (!slot || at <= now) return { ok: false, message: 'That slot has passed. Tap Post now instead.' };
  if (!String(draft.caption || '').trim()) return { ok: false, message: 'Add a caption first: reply to the post with the caption text.' };
  await store.setJSON(`ap:draft:${id}`, { ...draft, state: 'scheduled', scheduledFor: new Date(at).toISOString() }, 7 * DAY);
  const q = (await queue()).filter((x) => x.id !== id);
  q.push({ id, at });
  await saveQueue(q);
  return { ok: true, message: instagramConfigured(draft.brand) ? `Queued. It goes out at ${clock(slot)}.` : `I’ll remind you at ${clock(slot)}.` };
}

// 1. Queued posts whose time has come.
async function releaseQueue(now, report) {
  const q = await queue();
  const due = q.filter((x) => x.at <= now);
  if (!due.length) return;
  await saveQueue(q.filter((x) => x.at > now));
  for (const { id } of due) {
    const draft = await store.getJSON(`ap:draft:${id}`);
    if (!draft || draft.state !== 'scheduled') continue; // skipped, posted or expired meanwhile
    const reply = draft.telegram?.messageId ? { reply_to_message_id: draft.telegram.messageId } : {};
    try {
      if (instagramConfigured(draft.brand)) {
        const out = await publishDraft(id);
        await tg.sendText(out.ok ? `✅ Slot post is live.${out.permalink ? `\n${out.permalink}` : ''}` : `⚠️ ${out.message}`, reply);
        if (out.ok && draft.telegram) await tg.clearButtons(draft.telegram.chatId, draft.telegram.messageId);
        report.published.push({ id, ok: out.ok });
      } else {
        await store.setJSON(`ap:draft:${id}`, { ...draft, state: 'sent' }, 7 * DAY);
        await tg.sendText('⏰ Time to post this one. Save the image above, post it with this caption, then tap “I posted it”.', reply);
        report.reminded.push(id);
      }
    } catch (e) {
      report.errors.push(`queue ${id}: ${e.message}`);
    }
  }
}

// 2. Briefs (and a ready draft where the bot can make one) for slots starting soon.
async function sendBriefs(now, report, { getCandidates, getPack, checkPhoto }) {
  const canPost = instagramConfigured(BRAND);
  const soon = SLOTS.filter((s) => slotAt(s) - lead() <= now && slotAt(s) > now);
  let list = null;
  for (const s of soon) {
    if (!(await store.claim(`ap:slot:${s.id}`, 3 * DAY))) continue;
    try {
      const msg = await tg.sendText(briefText(s, { canPost }));
      await store.setJSON(`ap:slotmsg:${msg.message_id}`, { slot: s.id }, 3 * DAY);
      report.briefs.push(s.id);
      if (!fillable(s)) continue;
      list ??= await getCandidates(BRAND, 40);
      const c = await pickStory(s, list, now);
      if (!c) {
        await tg.sendText(`Nothing fresh and verified in the feeds for the ${clock(s)} slot yet. Big results still arrive the moment they’re final.`, { reply_to_message_id: msg.message_id });
        continue;
      }
      if (!(await store.claim(seenKey(BRAND, c), 3 * DAY))) continue;
      const pack = (await getPack(BRAND, c.key)) || c;
      if (!(await checkPhoto(BRAND, pack)).ok) {
        await store.del(seenKey(BRAND, c)).catch(() => null);
        continue;
      }
      const draft = draftFrom(BRAND, c, pack, now, { slot: s.id });
      await store.setJSON(`ap:draft:${draft.id}`, draft, 7 * DAY);
      const sent = await tg.sendDraft(draft, mediaUrl(draft.id), { canPost, slotTime: clock(s), header: `🗓 For ${clock(s)} · ${draft.priority} · ${draft.status} · ${draft.type}` });
      draft.telegram = { chatId: sent.chat?.id, messageId: sent.message_id };
      await store.setJSON(`ap:draft:${draft.id}`, draft, 7 * DAY);
      report.drafted.push({ id: draft.id, slot: s.id, headline: pack.words?.headline });
    } catch (e) {
      report.errors.push(`slot ${s.id}: ${e.message}`);
    }
  }
}

// What a slot needs from a person: anything the bot can't make by itself (reels, carousels,
// research pieces), anything the calendar gives to the editor, and anything marked for approval.
export function needsYou(s) {
  const why = [];
  if (!fillable(s)) why.push(/reel/i.test(s.format) ? 'a reel to cut' : /carousel/i.test(s.format) ? 'carousel slides' : 'the finished post (research + design)');
  if (/editor|you/i.test(s.owner)) why.push('it’s yours on the calendar');
  if (s.approval === 'Needs approval') why.push('your approval');
  return why;
}
const istDate = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(t);
const istHHMM = (t) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(t);

// The working day a "what's coming" list is about: before 6 AM IST that is still today
// (someone up at 1 AM means the day that starts in a few hours), after that it is tomorrow.
export const upcomingDay = (now = Date.now()) => (istHHMM(now) < '06:00' ? istDate(now) : istDate(now + DAY * 1000));

// Lists the slots on `day` that need people. Headed with the date spelled out and, where it fits,
// "Today" / "Tomorrow" relative to `now`. For today only slots still ahead are listed.
export function digestText(day, slots = SLOTS, now = Date.now()) {
  const today = istDate(now);
  const list = slots.filter((s) => s.date === day && needsYou(s).length && (day !== today || slotAt(s) > now));
  if (!list.length) return '';
  const nice = new Date(`${day}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const label = day === today ? `Today, ${nice}` : day === istDate(now + DAY * 1000) ? `Tomorrow, ${nice}` : nice;
  return [
    `📋 ${label}: ${list.length} post${list.length > 1 ? 's' : ''} need${list.length > 1 ? '' : 's'} something from you or the team.`,
    '',
    ...list.map((s) => `• ${clock(s)} · ${s.pillar} (${s.owner}): ${needsYou(s).join(', ')}
  ${s.hook.length > 160 ? s.hook.slice(0, 157) + '…' : s.hook}`),
    '',
    `Result, data-card and main-story slots I fill myself from the live feeds. You’ll get each brief again ${headsUpHours()} hours before its time.`,
  ].join('\n');
}
const headsUpHours = () => Number(process.env.CALENDAR_HEADSUP_HOURS ?? 3);
const digestAt = () => process.env.CALENDAR_DIGEST_TIME || '22:00';

// 0. Advance notice: the night before, everything tomorrow needs from people; then a heads-up
//    CALENDAR_HEADSUP_HOURS (3) before each slot that needs content, before the 30-minute brief.
async function sendNotices(now, report) {
  if (istHHMM(now) >= digestAt()) {
    const tomorrow = istDate(now + DAY * 1000);
    const text = digestText(tomorrow, SLOTS, now);
    if (text && (await store.claim(`ap:digest:${tomorrow}`, 3 * DAY))) {
      await tg.sendText(text);
      report.notices.push(`digest ${tomorrow}`);
    }
  } else {
    // Catch-up: last night's list never went out (deploy, outage, cron gap), so send today's
    // remaining slots now, once, under the same key.
    const today = istDate(now);
    const text = digestText(today, SLOTS, now);
    if (text && (await store.claim(`ap:digest:${today}`, 3 * DAY))) {
      await tg.sendText(`${text}\n\n(Catching up: last night’s list didn’t go out.)`);
      report.notices.push(`digest ${today} (catch-up)`);
    }
  }
  const window = headsUpHours() * 3600e3;
  for (const s of SLOTS) {
    const at = slotAt(s);
    if (at - window > now || at - lead() <= now || !needsYou(s).length) continue;
    if (!(await store.claim(`ap:headsup:${s.id}`, 3 * DAY))) continue;
    await tg.sendText(`⏳ Heads-up: ${clock(s)} slot needs ${needsYou(s).join(', ')}.\n${s.pillar} · ${s.template} · Owner: ${s.owner}\n\n${s.hook}\n\nVerify with: ${s.verify}\n\nWhen it’s ready, send it here as a photo with its caption and I’ll line it up for ${clock(s)}.`);
    report.notices.push(`headsup ${s.id}`);
  }
}

export async function runCalendar({ now = Date.now(), getCandidates = candidates, getPack = buildPack, checkPhoto = photoCheck } = {}) {
  const report = { notices: [], briefs: [], drafted: [], published: [], reminded: [], errors: [] };
  if (!tg.telegramConfigured() || !(await tg.ownerChat())) return report;
  await releaseQueue(now, report);
  await sendNotices(now, report).catch((e) => report.errors.push(`notices: ${e.message}`));
  await sendBriefs(now, report, { getCandidates, getPack, checkPhoto });
  return report;
}

// 3. A post the team made, sent to the bot. Returns the reply to show.
export async function receiveUpload(msg, now = Date.now()) {
  const doc = msg.document;
  const fileId = msg.photo?.length ? msg.photo.at(-1).file_id : doc && /^image\/jpe?g$/i.test(doc.mime_type || '') ? doc.file_id : '';
  if (!fileId) return { text: 'Send the post as a photo, or as a JPEG file for full quality. Instagram only takes JPEG.' };
  const ref = msg.reply_to_message ? await store.getJSON(`ap:slotmsg:${msg.reply_to_message.message_id}`) : null;
  const slot = (ref && slotById(ref.slot)) || nextSlot(now);
  const live = slot && slotAt(slot) > now ? slot : null;
  const draft = {
    id: (await import('node:crypto')).randomBytes(9).toString('base64url'),
    brand: BRAND,
    key: `upload:${fileId.slice(-16)}`,
    type: 'upload',
    priority: '',
    status: live?.label || '',
    source: '',
    link: '',
    caption: String(msg.caption || '').trim(),
    tgFile: fileId,
    slot: live?.id || '',
    state: 'sent',
    by: 'editor',
    createdAt: new Date(now).toISOString(),
  };
  await store.setJSON(`ap:draft:${draft.id}`, draft, 7 * DAY);
  const canPost = instagramConfigured(BRAND);
  const header = `📥 Your post${live ? ` for the ${clock(live)} slot` : ''}${draft.status ? ` · ${draft.status}` : ''}${draft.caption ? '' : '\n⚠️ No caption yet: reply to this message with the caption text.'}`;
  const sent = await tg.sendDraft(draft, fileId, { canPost, slotTime: live ? clock(live) : '', header });
  draft.telegram = { chatId: sent.chat?.id, messageId: sent.message_id };
  await store.setJSON(`ap:draft:${draft.id}`, draft, 7 * DAY);
  await store.setJSON(`ap:upmsg:${sent.message_id}`, { id: draft.id }, 7 * DAY);
  return { draft };
}

// A text reply to one of the team's posts sets its caption.
export async function setUploadCaption(msg) {
  const ref = await store.getJSON(`ap:upmsg:${msg.reply_to_message?.message_id}`);
  if (!ref) return null;
  const draft = await store.getJSON(`ap:draft:${ref.id}`);
  if (!draft || draft.state === 'published') return null;
  const caption = String(msg.text || '').trim().slice(0, 2200);
  await store.setJSON(`ap:draft:${draft.id}`, { ...draft, caption }, 7 * DAY);
  return { text: '✏️ Caption saved. Tap Post or the slot button on the post above.' };
}
