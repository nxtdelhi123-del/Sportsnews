import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BRANDS } from '../lib/studio/score.js';
import { writeFormula } from '../lib/studio/writer.js';
import { pickTemplate } from '../lib/studio/templates.js';
import { resetMemoryStore, claim, getJSON } from '../lib/studio/store.js';
import { pollPolicy } from '../lib/studio/instagram.js';
import * as ap from '../lib/studio/autopilot.js';

const NOW = Date.parse('2026-11-12T11:30:00Z');
const story = {
  kind: 'news',
  id: 'lawson',
  title: 'Lawson to stay in F1 as Racing Bulls announces 2027 driver pairing',
  summary: 'Racing Bulls has confirmed Liam Lawson will stay with the team for 2027.',
  sport: 'racing',
  source: 'Autosport',
  link: 'https://www.autosport.com/f1/news/x',
  published: new Date(NOW - 10 * 60e3).toISOString(),
  tier: 'imp',
};
const packFor = (s) => {
  const words = writeFormula(s, 'breaking', BRANDS.tsb);
  const pack = { key: `news:${s.id}`, type: 'breaking', score: 4, words, story: s, when: {} };
  pack.template = pickTemplate({ ...pack, brand: BRANDS.tsb });
  return pack;
};
const cand = (s, score = 4, type = 'breaking') => ({ ...packFor(s), score, type });

function mockRes() {
  const res = { headers: {}, statusCode: 200, body: '' };
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v);
  res.end = (b) => (res.body = b);
  return res;
}

// Records every outbound call; answers Telegram and Instagram like the real APIs.
let calls;
function mockNet() {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const body = init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : init.body ? JSON.parse(init.body) : null;
    calls.push({ url: u, body });
    const json = (b) => new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } });
    if (u.includes('api.telegram.org')) return json({ ok: true, result: { message_id: 77, chat: { id: 42 } } });
    if (u.includes('/media_publish')) return json({ id: 'M1' });
    if (/\/1784\/media$/.test(u)) return json({ id: 'C1' });
    if (u.includes('/C1?')) return json({ status_code: 'FINISHED' });
    if (u.includes('/M1?')) return json({ permalink: 'https://www.instagram.com/p/abc/' });
    return new Response('nope', { status: 404 });
  };
}

beforeEach(() => {
  resetMemoryStore();
  pollPolicy.delay = 0;
  Object.assign(process.env, { AUTOPILOT_SECRET: 's3cret', TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_CHAT_ID: '42', PUBLIC_URL: 'https://site.test', IG_TSB_USER_ID: '1784', IG_TSB_TOKEN: 'tok' });
  mockNet();
});

test('autopilot: exactly five hashtags, the page tag last; caption keeps the source', () => {
  const tags = ap.fiveTags(['#F1', 'Formula1', '#F1', '#TheSportsBinge', '#LiamLawson', '#RacingBulls', '#Extra'], BRANDS.tsb, 'racing');
  assert.equal(tags.length, 5);
  assert.equal(tags.at(-1), '#TheSportsBinge');
  assert.equal(new Set(tags.map((t) => t.toLowerCase())).size, 5);
  const cap = ap.finalCaption({ caption: 'Lawson stays.\n\n#a #b #c', hashtags: [] }, story, BRANDS.tsb);
  assert.match(cap, /^Lawson stays\.\n\nSource: Autosport\n\n/);
  assert.equal(cap.split('\n').at(-1).split(' ').length, 5);
  assert.equal(ap.fiveTags([], BRANDS.tsb, 'nope').length, 5, 'padded from the page’s own tags');
});

test('autopilot: signed media links', () => {
  const sig = ap.sign('abc123');
  assert.ok(ap.checkSig('abc123', sig));
  assert.ok(!ap.checkSig('abc124', sig));
  assert.ok(!ap.checkSig('abc123', 'x'));
  assert.equal(ap.mediaUrl('abc123'), `https://site.test/api/studio/media?id=abc123&sig=${sig}`);
});

test('autopilot: a new big story goes to Telegram once, with Post and Skip', async () => {
  const old = { ...story, id: 'old', title: 'Something from yesterday', published: new Date(NOW - 20 * 3600e3).toISOString() };
  const small = { ...story, id: 'small', title: 'Minor news' };
  const list = [cand(story), cand(old), cand(small, 1)];
  const run = () => ap.runAutopilot({ now: NOW, getCandidates: async () => list, getPack: async (b, key) => packFor(list.find((c) => c.key === key).story) });
  const first = await run();
  assert.deepEqual(first.errors, []);
  assert.equal(first.drafted.length, 1, 'only the fresh story above the bar');
  const tg = calls.filter((c) => c.url.includes('/sendPhoto'));
  assert.equal(tg.length, 1);
  const { photo, caption, reply_markup: kb } = tg[0].body;
  assert.match(photo, /^https:\/\/site\.test\/api\/studio\/media\?id=[\w-]+&sig=[0-9a-f]{32}$/);
  assert.match(caption, /^🆕 P2 · Reported · breaking\nSource: Autosport — https:\/\/www\.autosport\.com/);
  assert.deepEqual(kb.inline_keyboard[0].map((b) => b.text), ['✅ Post now', '✖ Skip']);
  const draft = await getJSON(`ap:draft:${first.drafted[0].id}`);
  assert.equal(draft.telegram.messageId, 77);
  const second = await run();
  assert.equal(second.drafted.length, 0, 'the same story is never sent twice');
});

test('autopilot: without Instagram set up, the draft says so and has no Post button', async () => {
  delete process.env.IG_TSB_TOKEN;
  await ap.runAutopilot({ now: NOW, getCandidates: async () => [cand(story)], getPack: async () => packFor(story) });
  const { caption, reply_markup: kb } = calls.find((c) => c.url.includes('/sendPhoto')).body;
  assert.match(caption, /Instagram isn’t connected yet/);
  assert.deepEqual(kb.inline_keyboard[0].map((b) => b.text), ['✖ Skip']);
});

test('autopilot: tapping Post publishes once; Skip blocks it', async () => {
  const { drafted } = await ap.runAutopilot({ now: NOW, getCandidates: async () => [cand(story)], getPack: async () => packFor(story) });
  const id = drafted[0].id;
  const { default: webhook } = await import('../lib/studio/routes/telegram.js');
  const tap = (data, chat = 42, secret = 's3cret') => {
    const res = mockRes();
    return webhook({ method: 'POST', headers: { 'x-telegram-bot-api-secret-token': secret }, body: { callback_query: { id: 'q', data, message: { message_id: 77, chat: { id: chat } } } } }, res).then(() => res);
  };
  assert.equal((await tap(`post:${id}`, 42, 'wrong')).statusCode, 401);
  await tap(`post:${id}`, 999);
  assert.equal(calls.filter((c) => c.url.includes('/media_publish')).length, 0, 'a stranger’s tap does nothing');
  await tap(`post:${id}`);
  const container = calls.find((c) => /\/1784\/media$/.test(c.url));
  assert.equal(container.body.image_url, ap.mediaUrl(id));
  assert.match(container.body.caption, /#TheSportsBinge$/);
  assert.equal(calls.filter((c) => c.url.includes('/media_publish')).length, 1);
  assert.ok(calls.some((c) => c.url.includes('/sendMessage') && c.body.text.includes('instagram.com/p/abc')));
  await tap(`post:${id}`);
  assert.equal(calls.filter((c) => c.url.includes('/media_publish')).length, 1, 'a second tap does not post twice');
  assert.equal((await getJSON(`ap:draft:${id}`)).state, 'published');

  const two = await ap.runAutopilot({ now: NOW, getCandidates: async () => [cand({ ...story, id: 'b', title: 'Andreeva beats Sabalenka 6-4, 6-0 to reach WTA Finals semis', sport: 'tennis' })], getPack: async () => packFor({ ...story, id: 'b', title: 'Andreeva beats Sabalenka', sport: 'tennis' }) });
  const id2 = two.drafted[0].id;
  await tap(`skip:${id2}`);
  assert.equal((await ap.publishDraft(id2)).ok, false);
});

test('autopilot: the media link renders a 1080×1350 JPEG; bad signatures are refused', async () => {
  const { drafted } = await ap.runAutopilot({ now: NOW, getCandidates: async () => [cand(story)], getPack: async () => packFor(story) });
  const id = drafted[0].id;
  const { default: media } = await import('../lib/studio/routes/media.js');
  let res = mockRes();
  await media({ query: { id, sig: 'f'.repeat(32) }, headers: {} }, res);
  assert.equal(res.statusCode, 403);
  res = mockRes();
  await media({ query: { id, sig: ap.sign(id) }, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'image/jpeg');
  const b = res.body;
  assert.equal(b.readUInt16BE(0), 0xffd8, 'JPEG magic');
  // Find the SOF0 frame header for the size.
  let i = 2;
  while (i < b.length && b[i + 1] !== 0xc0) i += 2 + b.readUInt16BE(i + 2);
  assert.deepEqual([b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)], [1080, 1350]);
});

test('autopilot: the cron endpoint runs at most once every 45 seconds', async () => {
  const { default: cron } = await import('../lib/studio/routes/cron.js');
  delete process.env.TELEGRAM_BOT_TOKEN;
  let res = mockRes();
  await cron({ query: {}, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /TELEGRAM_BOT_TOKEN not set/);
  res = mockRes();
  await cron({ query: {}, headers: {} }, res);
  assert.match(res.body, /ran less than 45 s ago/);
  assert.equal(await claim('k', 10), true);
  assert.equal(await claim('k', 10), false);
});

test('autopilot: only a bot token is needed; the first /start claims the bot', async () => {
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.AUTOPILOT_SECRET;
  assert.equal(ap.secret().length, 48, 'secret derived from the bot token');
  const noOwner = await ap.runAutopilot({ now: NOW, getCandidates: async () => [cand(story)], getPack: async () => packFor(story) });
  assert.match(noOwner.errors.join(' '), /Send \/start/);
  const hook = calls.find((c) => c.url.endsWith('/setWebhook'));
  assert.equal(hook.body.url, 'https://site.test/api/telegram');
  assert.equal(hook.body.secret_token, ap.secret());
  const { default: webhook } = await import('../lib/studio/routes/telegram.js');
  const start = (chat) => webhook({ method: 'POST', headers: { 'x-telegram-bot-api-secret-token': ap.secret() }, body: { message: { text: '/start', chat: { id: chat }, from: { first_name: 'N' } } } }, mockRes());
  await start(555);
  await start(666);
  assert.equal(calls.filter((c) => c.url.endsWith('/sendMessage') && /Connected/.test(c.body.text)).map((c) => c.body.chat_id).join(), '555', 'only the first chat is welcomed');
  const run = await ap.runAutopilot({ now: NOW, getCandidates: async () => [cand(story)], getPack: async () => packFor(story) });
  assert.equal(run.drafted.length, 1);
  assert.equal(calls.find((c) => c.url.endsWith('/sendPhoto')).body.chat_id, '555');
});

test('autopilot: the three routes share one function and stay within Vercel Hobby’s 12', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const fns = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fns(`${dir}/${e.name}`) : e.name.endsWith('.js') ? [e.name] : []));
  assert.ok(fns('api').length <= 12, `${fns('api').length} functions`);
  const { rewrites } = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(rewrites.map((r) => r.source).sort(), ['/api/cron/studio', '/api/studio/media', '/api/telegram']);
  const { default: one } = await import('../api/studio/autopilot.js');
  const res = mockRes();
  await one({ query: { route: 'nope' }, headers: {} }, res);
  assert.equal(res.statusCode, 404);
});

import { upscaleImageUrl, imageSize, findPhotos } from '../lib/studio/photos.js';
import { clearMemo } from '../lib/http.js';
import { Resvg } from '@resvg/resvg-js';

const pngOf = (w, hh) => Buffer.from(new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hh}"><rect width="100%" height="100%" fill="#345"/></svg>`).render().asPng());

test('photos: thumbnails are asked for at full size, and sizes are read from the bytes', () => {
  assert.equal(upscaleImageUrl('https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/x.jpg'), 'https://ichef.bbci.co.uk/ace/standard/1536/cpsprodpb/x.jpg');
  assert.match(upscaleImageUrl('https://a.espncdn.com/combiner/i?img=%2Fp.jpg&w=180&h=101'), /w=1600&h=900/);
  assert.equal(upscaleImageUrl('https://e0.365dm.com/26/11/768x432/x.jpg'), 'https://e0.365dm.com/26/11/1600x900/x.jpg');
  assert.equal(upscaleImageUrl('https://example.com/a.jpg'), 'https://example.com/a.jpg');
  assert.deepEqual(imageSize(`data:image/png;base64,${pngOf(1200, 800).toString('base64')}`), { w: 1200, h: 800 });
});

test('photos: the article’s sharp share picture beats the feed’s thumbnail', async () => {
  clearMemo();
  const big = pngOf(1400, 900);
  const small = pngOf(240, 135);
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u === 'https://news.example/story') return new Response('<html><head><meta property="og:image" content="https://img.example/big.png"></head></html>', { headers: { 'content-type': 'text/html' } });
    if (u === 'https://img.example/big.png') return new Response(big, { headers: { 'content-type': 'image/png' } });
    if (u === 'https://img.example/thumb.png') return new Response(small, { headers: { 'content-type': 'image/png' } });
    return new Response('nope', { status: 404 });
  };
  const got = await findPhotos({ kind: 'news', title: 'x', link: 'https://news.example/story', image: 'https://img.example/thumb.png', source: 'Example' });
  assert.equal(imageSize(got.hero).w, 1400);
  clearMemo();
  const fallback = await findPhotos({ kind: 'news', title: 'x', link: 'https://news.example/missing', image: 'https://img.example/thumb.png', source: 'Example' });
  assert.equal(imageSize(fallback.hero).w, 240, 'a soft picture is still better than none');
});
