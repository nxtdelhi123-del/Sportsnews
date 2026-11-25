import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetMemoryStore, getJSON } from '../lib/studio/store.js';
import { pollPolicy } from '../lib/studio/instagram.js';
import { writeFormula } from '../lib/studio/writer.js';
import { pickTemplate } from '../lib/studio/templates.js';
import { BRANDS } from '../lib/studio/score.js';
import SLOTS from '../lib/studio/calendar-data.js';
import * as cal from '../lib/studio/calendar.js';

// 23 Nov 2026: 9:00 AM IST slot is "NZ v India 1st Test" result (fillable); 12:30 PM is a chess preview.
const at = (iso) => Date.parse(iso);
const story = { kind: 'news', id: 'nzind', title: 'India beat New Zealand in the 1st Test at Wellington', summary: '', sport: 'cricket', source: 'ESPNcricinfo', link: 'https://espncricinfo.com/x', published: new Date(at('2026-11-23T02:50:00Z')).toISOString() };
const packFor = (s) => {
  const words = writeFormula(s, 'result', BRANDS.tsb);
  const pack = { key: `news:${s.id}`, type: 'result', score: 5, words, story: s, when: {} };
  pack.template = pickTemplate({ ...pack, brand: BRANDS.tsb });
  return pack;
};
const other = { ...story, id: 'nba', title: 'Lakers beat Celtics', sport: 'basketball' };
const list = [{ ...packFor(other), score: 6 }, { ...packFor(story), score: 4 }];
const deps = { getCandidates: async () => list, getPack: async (_, key) => packFor(list.find((c) => c.key === key).story), checkPhoto: async () => ({ ok: true }) };

let calls;
beforeEach(() => {
  resetMemoryStore();
  pollPolicy.delay = 0;
  Object.assign(process.env, { AUTOPILOT_SECRET: 's3cret', TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_CHAT_ID: '42', PUBLIC_URL: 'https://site.test', IG_TSB_USER_ID: '1784', IG_TSB_TOKEN: 'tok', CALENDAR_MORNING_TIME: 'off' });
  calls = [];
  let n = 100;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const body = init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : init.body ? JSON.parse(init.body) : null;
    calls.push({ url: u, body });
    const json = (b) => new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } });
    if (u.includes('api.telegram.org')) return json({ ok: true, result: { message_id: ++n, chat: { id: 42 } } });
    if (u.includes('/media_publish')) return json({ id: 'M1' });
    if (/\/1784\/media$/.test(u)) return json({ id: 'C1' });
    if (u.includes('/C1?')) return json({ status_code: 'FINISHED' });
    if (u.includes('/M1?')) return json({ permalink: 'https://www.instagram.com/p/abc/' });
    return new Response('nope', { status: 404 });
  };
});
const sent = (m) => calls.filter((c) => c.url.endsWith(`/${m}`)).map((c) => c.body);

test('calendar: only Sports Binge slots with a clock time, in IST', () => {
  assert.ok(SLOTS.length > 200);
  const first = SLOTS[0];
  assert.equal(first.id, '2026-11-23T09:00');
  assert.equal(cal.slotAt(first), at('2026-11-23T03:30:00Z'));
  assert.equal(cal.clock({ time: '21:30' }), '9:30 PM');
  assert.equal(cal.clock({ time: '00:30' }), '12:30 AM');
  assert.ok(cal.fillable(first));
});

test('calendar: 30 min before a result slot, the brief and a matching draft with “Post at 9:00 AM”', async () => {
  const out = await cal.runCalendar({ now: at('2026-11-23T03:05:00Z'), ...deps });
  assert.deepEqual(out.errors, []);
  assert.deepEqual(out.briefs, ['2026-11-23T09:00']);
  assert.ok(sent('sendMessage').some((m) => /^🗓 9:00 AM slot/.test(m.text)));
  const photo = sent('sendPhoto')[0];
  assert.match(photo.caption, /^🗓 For 9:00 AM/);
  assert.match(photo.caption, /New Zealand/, 'the story the brief names beats a bigger unrelated one');
  assert.deepEqual(photo.reply_markup.inline_keyboard.map((r) => r.map((b) => b.text)), [['🕒 Post at 9:00 AM'], ['✅ Post now', '✖ Skip']]);
  const again = await cal.runCalendar({ now: at('2026-11-23T03:06:00Z'), ...deps });
  assert.equal(again.briefs.length, 0, 'one brief per slot');
});

test('calendar: a queued post goes to Instagram at the slot time, not before', async () => {
  const out = await cal.runCalendar({ now: at('2026-11-23T03:05:00Z'), ...deps });
  const id = out.drafted[0].id;
  assert.equal((await cal.scheduleDraft(id, at('2026-11-23T03:06:00Z'))).ok, true);
  await cal.runCalendar({ now: at('2026-11-23T03:29:00Z'), ...deps });
  assert.equal(calls.filter((c) => c.url.includes('/media_publish')).length, 0);
  const due = await cal.runCalendar({ now: at('2026-11-23T03:30:20Z'), ...deps });
  assert.deepEqual(due.published, [{ id, ok: true }]);
  assert.equal((await getJSON(`ap:draft:${id}`)).state, 'published');
  await cal.runCalendar({ now: at('2026-11-23T03:31:00Z'), ...deps });
  assert.equal(calls.filter((c) => c.url.includes('/media_publish')).length, 1, 'once');
});

test('calendar: without Instagram, the slot time brings a reminder instead', async () => {
  delete process.env.IG_TSB_TOKEN;
  const out = await cal.runCalendar({ now: at('2026-11-23T03:05:00Z'), ...deps });
  const kb = sent('sendPhoto')[0].reply_markup.inline_keyboard;
  assert.equal(kb[0][0].text, '⏰ Remind me at 9:00 AM');
  await cal.scheduleDraft(out.drafted[0].id, at('2026-11-23T03:06:00Z'));
  const due = await cal.runCalendar({ now: at('2026-11-23T03:31:00Z'), ...deps });
  assert.equal(due.reminded.length, 1);
  assert.match(sent('sendMessage').at(-1).text, /^⏰ Time to post/);
});

test('calendar: the night before, a list of what tomorrow needs from people; then a 3-hour heads-up', async () => {
  const out = await cal.runCalendar({ now: at('2026-11-22T16:31:00Z'), ...deps }); // 10:01 PM IST, 22 Nov
  assert.deepEqual(out.notices, ['digest 2026-11-23']);
  const text = sent('sendMessage')[0].text;
  assert.match(text, /^📋 Tomorrow, Monday, 23 Nov: 4 posts need/);
  assert.match(text, /8:00 PM · Reel \(Editor\): a reel to cut/);
  assert.doesNotMatch(text, /9:00 AM/, 'the result slot is the bot’s job');
  const h = await cal.runCalendar({ now: at('2026-11-23T04:05:00Z'), ...deps }); // 9:35 AM IST
  assert.deepEqual(h.notices, ['headsup 2026-11-23T12:30']);
  assert.match(sent('sendMessage').at(-1).text, /^⏳ Heads-up: 12:30 PM slot/);
});

test('calendar: a photo sent as a reply to a brief is lined up for that slot; a text reply sets its caption', async () => {
  await cal.runCalendar({ now: at('2026-11-23T06:35:00Z'), ...deps }); // 12:05 PM IST: 12:30 brief
  const briefId = 100 + calls.findIndex((c) => c.url.endsWith('/sendMessage') && /^🗓 12:30 PM/.test(c.body.text)) + 1;
  const { draft } = await cal.receiveUpload({ message_id: 5, photo: [{ file_id: 'small' }, { file_id: 'BIGFILE' }], reply_to_message: { message_id: briefId } }, at('2026-11-23T06:40:00Z'));
  assert.equal(draft.slot, '2026-11-23T12:30');
  assert.equal(draft.tgFile, 'BIGFILE');
  const p = sent('sendPhoto').at(-1);
  assert.equal(p.photo, 'BIGFILE');
  assert.match(p.caption, /No caption yet/);
  assert.equal((await cal.scheduleDraft(draft.id, at('2026-11-23T06:41:00Z'))).ok, false, 'no caption, no queue');
  const r = await cal.setUploadCaption({ text: 'Gukesh v Sindarov starts tomorrow.', reply_to_message: { message_id: draft.telegram.messageId } });
  assert.match(r.text, /Caption saved/);
  assert.equal((await cal.scheduleDraft(draft.id, at('2026-11-23T06:41:00Z'))).ok, true);
  const png = await cal.receiveUpload({ message_id: 6, document: { file_id: 'x', mime_type: 'image/png' } });
  assert.match(png.text, /JPEG/);
});

test('calendar: after midnight the coming day is still today, and a missed night-before list is caught up once', async () => {
  assert.equal(cal.upcomingDay(at('2026-11-22T20:00:00Z')), '2026-11-23'); // 1:30 AM IST, 23 Nov
  assert.equal(cal.upcomingDay(at('2026-11-23T03:00:00Z')), '2026-11-24'); // 8:30 AM IST
  assert.match(cal.digestText('2026-11-23', SLOTS, at('2026-11-22T20:00:00Z')), /^📋 Today, Monday, 23 Nov/);
  const out = await cal.runCalendar({ now: at('2026-11-23T01:00:00Z'), ...deps }); // 6:30 AM IST, no list sent last night
  assert.deepEqual(out.notices, ['digest 2026-11-23 (catch-up)']);
  assert.match(sent('sendMessage')[0].text, /Catching up/);
  const again = await cal.runCalendar({ now: at('2026-11-23T01:01:00Z'), ...deps });
  assert.deepEqual(again.notices, [], 'only once');
  // Late in the day only the slots still ahead are listed.
  const late = cal.digestText('2026-11-23', SLOTS, at('2026-11-23T13:00:00Z')); // 6:30 PM IST
  assert.match(late, /^📋 Today, Monday, 23 Nov: 1 post needs/);
  assert.doesNotMatch(late, /12:30 PM/);
});

test('calendar: the 9 AM plan lists every post today, once, on Telegram and WhatsApp', async () => {
  const { morningText } = await import('../lib/studio/calendar.js');
  const text = morningText('2026-11-26');
  assert.match(text, /^☀️ The Sports Binge, today's posts \(Thursday, 26 Nov\): \d+/);
  assert.match(text, /9:00 AM · Result/);
  assert.equal(morningText('2020-01-01'), '');
});
