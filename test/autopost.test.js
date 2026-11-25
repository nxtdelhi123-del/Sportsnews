import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BRANDS } from '../lib/studio/score.js';
import { writeFormula } from '../lib/studio/writer.js';
import { pickTemplate } from '../lib/studio/templates.js';
import { resetMemoryStore, getJSON } from '../lib/studio/store.js';
import { pollPolicy } from '../lib/studio/instagram.js';
import { officialSite } from '../lib/sources.js';
import { mergeNews } from '../lib/feeds.js';
import { parseFeed } from '../lib/rss.js';
import { autopostCheck } from '../lib/studio/autopost.js';
import { wantsWhatsapp } from '../lib/studio/whatsapp.js';
import * as ap from '../lib/studio/autopilot.js';

const NOW = Date.parse('2026-11-24T12:00:00Z');
const official = {
  kind: 'news',
  id: 'sa-squads',
  title: 'South Africa name multi-format squads for India home series',
  summary: 'Cricket South Africa has named its squads.',
  sport: 'cricket',
  source: 'ICC',
  official: 'ICC',
  link: 'https://news.google.com/rss/articles/x',
  published: new Date(NOW - 15 * 60e3).toISOString(),
  tier: 'imp',
};
const reported = { ...official, id: 'rep', title: 'Bumrah ruled out of the second Test', official: undefined, source: 'Times of India' };
const packFor = (s) => {
  const words = writeFormula(s, 'breaking', BRANDS.tsb);
  const pack = { key: `news:${s.id}`, type: 'breaking', score: 5, words, story: s, when: {} };
  pack.template = pickTemplate({ ...pack, brand: BRANDS.tsb });
  return pack;
};
const cand = (s) => ({ ...packFor(s), score: 5 });
const sharp = async () => ({ ok: true, sharp: true, credit: 'test' });
const brainSays = (priority) => async (brand, cands) => cands.map((c) => ({ ...c, priority, why: 'big', by: 'gemini', headline: 'SQUADS NAMED.' }));

let calls;
beforeEach(() => {
  resetMemoryStore();
  pollPolicy.delay = 0;
  for (const k of ['AUTOPOST', 'AUTOPOST_PRIORITIES', 'AUTOPOST_RESULTS', 'WHATSAPP_PHONE', 'WHATSAPP_APIKEY', 'WHATSAPP_ALERTS', 'ANTHROPIC_API_KEY']) delete process.env[k];
  Object.assign(process.env, { AUTOPILOT_SECRET: 's3cret', TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_CHAT_ID: '42', PUBLIC_URL: 'https://site.test', IG_TSB_USER_ID: '1784', IG_TSB_TOKEN: 'tok', GEMINI_API_KEY: 'g' });
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const body = init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : init.body ? JSON.parse(init.body) : null;
    calls.push({ url: u, body });
    const json = (b) => new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } });
    if (u.includes('api.telegram.org')) return json({ ok: true, result: { message_id: 77, chat: { id: 42 } } });
    if (u.includes('api.callmebot.com')) return new Response('Message queued. You will receive it in a few seconds.');
    if (u.includes('/media_publish')) return json({ id: 'M1' });
    if (/\/1784\/media$/.test(u)) return json({ id: 'C1' });
    if (u.includes('/C1?')) return json({ status_code: 'FINISHED' });
    if (u.includes('/M1?')) return json({ permalink: 'https://www.instagram.com/p/abc/' });
    return new Response('nope', { status: 404 });
  };
});
const run = (list, verdicts = brainSays('P1')) => ap.runAutopilot({ now: NOW, checkPhoto: sharp, getVerdicts: verdicts, getCandidates: async () => list, getPack: async (b, key) => packFor(list.find((c) => c.key === key).story) });
const igPublished = () => calls.filter((c) => c.url.includes('/media_publish')).length;

test('official sites: matched by host, subdomains included, outlets are not', () => {
  assert.equal(officialSite('https://www.icc-cricket.com'), 'ICC');
  assert.equal(officialSite('https://de.uefa.com/x'), 'UEFA');
  assert.equal(officialSite('https://bwfworldtour.bwfbadminton.com'), 'BWF');
  assert.equal(officialSite('https://www.espncricinfo.com/story'), '');
  assert.equal(officialSite('https://fakeicc-cricket.com'), '');
});

test('news feed: a Google News item from an official site is marked T1, and beats an outlet’s copy', () => {
  const xml = (src, url) => `<rss><channel><item><title>India name squad for SA Tests - ${src}</title><link>https://news.google.com/a</link><pubDate>${new Date(NOW).toUTCString()}</pubDate><source url="${url}">${src}</source></item></channel></rss>`;
  const gn = { url: 'https://news.google.com/rss/search?q=x', name: 'Google News', sport: 'cricket' };
  const items = mergeNews([{ feed: gn, items: parseFeed(xml('NDTV', 'https://sports.ndtv.com')) }, { feed: gn, items: parseFeed(xml('BCCI', 'https://www.bcci.tv')) }], NOW);
  assert.equal(items.length, 1);
  assert.equal(items[0].official, 'BCCI');
  assert.equal(items[0].source, 'BCCI');
  assert.equal(ap.statusOf({ ...items[0], kind: 'news' }), 'Confirmed');
  assert.equal(ap.statusOf({ ...items[0], kind: 'news', official: undefined }), 'Reported');
});

test('auto-post check: only confirmed, brain-judged, fresh, breaking, sharp', () => {
  const c = { ...cand(official), priority: 'P1', by: 'gemini', headline: 'SQUADS NAMED.' };
  assert.equal(autopostCheck({ ...c, headline: '' }, { now: NOW }).ok, false, 'needs a checked headline');
  assert.equal(autopostCheck(c, { now: NOW, exact: false }).ok, false, 'needs a photo certain to be of the story');
  assert.equal(autopostCheck(c, { now: NOW }).ok, true);
  assert.equal(autopostCheck({ ...c, story: reported }, { now: NOW }).ok, false, 'Reported waits');
  assert.equal(autopostCheck({ ...c, by: 'rules' }, { now: NOW }).ok, false, 'rules alone never auto-post');
  assert.equal(autopostCheck({ ...c, priority: 'P3' }, { now: NOW }).ok, false);
  assert.equal(autopostCheck(c, { now: NOW, sharp: false }).ok, false);
  assert.equal(autopostCheck({ ...c, story: { ...official, published: new Date(NOW - 3 * 3600e3).toISOString() } }, { now: NOW }).ok, false, 'old news');
  for (const title of ['PALMER: Where do Ferrari go from here?', 'The 5 drivers most likely to qualify fastest in Qatar', 'Thrilling final day predicted at UAE tournament', "Sri Lanka A vs India A at Doha, DP World Men's Asia Cup Rising Stars, Semi-Final, 26 Nov 2026", 'UFC Vegas 123', 'Jack Della Maddalena - UFC.com', 'Latest Hockey News and Updates', 'Scuderia Ferrari Lewis Hamilton Remember Who You Are 2026 Poster'])
    assert.equal(autopostCheck({ ...c, story: { ...official, title } }, { now: NOW }).ok, false, title);
  const result = { ...c, story: { kind: 'match', status: { state: 'post' } } };
  assert.equal(autopostCheck(result, { now: NOW }).ok, false, 'results wait unless AUTOPOST_RESULTS=1');
  process.env.AUTOPOST_RESULTS = '1';
  assert.equal(autopostCheck(result, { now: NOW }).ok, true);
});

test('autopilot: confirmed breaking news posts on its own, then tells Telegram; reported news waits for a tap', async () => {
  const out = await run([cand(official), cand(reported)]);
  assert.deepEqual(out.errors, []);
  assert.equal(igPublished(), 1, 'only the confirmed story reached Instagram');
  const msgs = calls.filter((c) => c.url.includes('/sendPhoto')).map((c) => c.body);
  assert.equal(msgs.length, 2);
  const auto = msgs.find((m) => /Posted on its own/.test(m.caption));
  assert.match(auto.caption, /^⚡ Posted on its own · P1 · Confirmed by ICC/);
  assert.match(auto.caption, /instagram\.com\/p\/abc/);
  assert.equal(auto.reply_markup, undefined, 'no buttons on a post that is already out');
  const wait = msgs.find((m) => !/Posted on its own/.test(m.caption));
  assert.match(wait.caption, /Reported/);
  assert.deepEqual(wait.reply_markup.inline_keyboard[0].map((b) => b.text), ['✅ Post now', '✖ Skip']);
  const d = await getJSON(`ap:draft:${out.drafted.find((x) => x.autoposted).id}`);
  assert.equal(d.state, 'published');
  assert.equal(d.auto, true);
});

test('autopilot: paused, P2-only settings or no Instagram means a draft with the reason', async () => {
  const { pauseAutopost } = await import('../lib/studio/autopost.js');
  await pauseAutopost();
  await run([cand(official)]);
  assert.equal(igPublished(), 0);
  assert.match(calls.find((c) => c.url.includes('/sendPhoto')).body.caption, /Not posted on its own: auto-posting is paused/);
  resetMemoryStore();
  delete process.env.IG_TSB_TOKEN;
  calls.length = 0;
  await run([cand(official)]);
  assert.equal(igPublished(), 0);
  assert.match(calls.find((c) => c.url.includes('/sendPhoto')).body.caption, /Confirmed[\s\S]*Instagram is not connected yet/);
});

test('autopilot: auto-posts keep a gap, so a burst becomes one post and drafts', async () => {
  const b = { ...official, id: 'b', title: 'Hockey India names squad for FIH Pro League' };
  await run([cand(official), cand(b)]);
  assert.equal(igPublished(), 1);
  assert.match(calls.filter((c) => c.url.includes('/sendPhoto')).at(-1).body.caption, /last auto-post was under 20 min ago/);
});

test('autopilot: news layouts rotate so neighbouring posts differ', async () => {
  const list = ['a', 'b', 'c'].map((id) => cand({ ...reported, id, title: `Story ${id} for India` }));
  const out = await run(list, brainSays('P2'));
  const tpls = await Promise.all(out.drafted.map((d) => getJSON(`ap:draft:${d.id}`).then((x) => x.pack.template)));
  assert.equal(new Set(tpls).size, 3, tpls.join(','));
});

test('whatsapp: alerts for auto-posts and drafts, when set up', async () => {
  assert.equal(wantsWhatsapp({ autoposted: true }), false, 'off until set up');
  Object.assign(process.env, { WHATSAPP_PHONE: '+910000000000', WHATSAPP_APIKEY: 'k' });
  assert.equal(wantsWhatsapp({ autoposted: true }), true);
  assert.equal(wantsWhatsapp({ priority: 'P2' }), true, 'every draft by default');
  process.env.WHATSAPP_ALERTS = 'p1';
  assert.equal(wantsWhatsapp({ priority: 'P1' }), true);
  assert.equal(wantsWhatsapp({ priority: 'P2' }), false);
  delete process.env.WHATSAPP_ALERTS;
  await run([cand(official)]);
  const wa = calls.filter((c) => c.url.includes('api.callmebot.com'));
  assert.equal(wa.length, 1);
  assert.match(decodeURIComponent(new URL(wa[0].url).searchParams.get('text')), /The Sports Binge posted \(Confirmed, ICC\)/);
});

test('brain headline: kept only when every fact is in the story', async () => {
  const { safeHeadline } = await import('../lib/studio/editor.js');
  const st = { title: 'South Africa name multi-format squads for India home series', summary: 'Temba Bavuma returns as Test captain.' };
  assert.equal(safeHeadline('BAVUMA RETURNS AS CAPTAIN.', st), 'BAVUMA RETURNS AS CAPTAIN.');
  assert.equal(safeHeadline('SOUTH AFRICA NAME SQUADS.', st), 'SOUTH AFRICA NAME SQUADS.');
  assert.equal(safeHeadline('MARKRAM RETURNS AS CAPTAIN.', st), '', 'a name not in the story');
  assert.equal(safeHeadline('BAVUMA BACK FOR 3 TESTS.', st), '', 'a number not in the story');
  assert.equal(safeHeadline('IS THIS THE END?', st), '');
  assert.equal(safeHeadline(null, st), '');
});

test('live scorecard: an Indian double hundred becomes a story at once, and always reaches the phone', async () => {
  const { milestonesIn, storyFrom } = await import('../lib/studio/live-milestones.js');
  const bat = (id, name, runs, balls, outs, extra = {}) => ({ athlete: { id, displayName: name }, linescores: [{ period: 2, linescores: [{ statistics: { categories: [{ stats: Object.entries({ runs, ballsFaced: balls, batted: 1, outs, fours: 7, sixes: 28, ...extra }).map(([name, value]) => ({ name, value })) }] } }] }] });
  const summary = {
    header: { league: { name: 'Indian Premier League' }, competitions: [{ class: { generalClassCard: 'List A' } }] },
    rosters: [
      { team: { displayName: 'India A' }, roster: [bat('1', 'Vaibhav Sooryavanshi', 204, 53, 1), bat('2', 'Other Batter', 40, 30, 1)] },
      { team: { displayName: 'United Arab Emirates' }, roster: [bat('3', 'UAE Batter', 120, 100, 1)] },
    ],
  };
  const match = { id: '1562353', league: { name: 'DP World Asia Cup Rising Stars' }, link: 'https://x' };
  const ms = milestonesIn(summary, match);
  assert.equal(ms.length, 1, 'only Indian players, only milestones');
  assert.equal(ms[0].mark, 200);
  const s = storyFrom(ms[0], match, NOW);
  assert.equal(s.title, 'Vaibhav Sooryavanshi hits a double century for India A against United Arab Emirates');
  assert.match(s.summary, /made 204 off 53 balls \(7 fours, 28 sixes\).*DP World Asia Cup Rising Stars, List A\./);
  assert.doesNotMatch(s.summary, /Premier League/, 'the series, not the league id the data was read through');
  assert.equal(s.headline, '204 OFF 53 BALLS.');
  assert.equal(ap.statusOf(s), 'Confirmed');
  // the brain says no to everything; the scorecard story still goes, as a draft for a tap
  const out = await run([{ ...cand(s), type: 'milestone' }], async () => []);
  assert.equal(out.drafted.length, 1);
  assert.equal(out.drafted[0].priority, 'P1');
  assert.equal(igPublished(), 0, 'scorecard milestones wait for a tap unless AUTOPOST_RESULTS=1');
  const d = await getJSON(`ap:draft:${out.drafted[0].id}`);
  assert.equal(d.pack.words.headline, '204 OFF 53 BALLS.');
});
