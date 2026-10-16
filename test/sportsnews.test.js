import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScoreboard, scoreboardUrl } from '../lib/espn.js';
import { normalizeCricinfo, normalizeCricinfoRss } from '../lib/cricket.js';
import { parseFeed, classify } from '../lib/rss.js';
import { mergeNews, sortMatches } from '../lib/feeds.js';
import { formatMatch, scoreline, toText } from '../public/js/format.js';
import * as fx from './fixtures.js';

const NOW = Date.parse('2026-10-16T20:00:00Z');
const EPL = { path: 'soccer/eng.1', name: 'Premier League', sport: 'soccer', range: true };

test('scoreboard URL covers yesterday to tomorrow for team sports', () => {
  assert.match(scoreboardUrl(EPL, NOW), /soccer\/eng\.1\/scoreboard\?limit=300&dates=20261015-20261017$/);
  assert.doesNotMatch(scoreboardUrl({ path: 'golf/pga' }, NOW), /dates=/);
});

test('normalizes a live soccer match with key events', () => {
  const [live, pre] = normalizeScoreboard(fx.soccerScoreboard, EPL, NOW);
  assert.equal(live.kind, 'versus');
  assert.equal(live.home.name, 'Arsenal');
  assert.equal(live.away.score, '1');
  assert.equal(live.status.state, 'in');
  assert.equal(live.venue.name, 'Emirates Stadium');
  assert.deepEqual(live.broadcasts, ['Sky Sports']);
  assert.equal(live.events[2].type, 'Penalty goal');
  assert.equal(live.events[2].team, 'CHE');
  assert.equal(scoreline(live), 'Arsenal 2 – 1 Chelsea');
  assert.equal(scoreline(pre), 'Liverpool vs Everton');
});

test('flattens tennis groupings and drops matches outside the window', () => {
  const ms = normalizeScoreboard(fx.tennisScoreboard, { path: 'tennis/atp', name: 'ATP', sport: 'tennis' }, NOW);
  assert.equal(ms.length, 1);
  assert.equal(ms[0].name, 'Jannik Sinner vs Carlos Alcaraz');
  assert.equal(ms[0].note, "Men's Singles");
  assert.deepEqual(ms[0].home.linescores, [6, 7]);
  assert.equal(scoreline(ms[0]), 'Jannik Sinner 6 7 – 4 6 Carlos Alcaraz');
});

test('golf becomes a ranked leaderboard', () => {
  const [g] = normalizeScoreboard(fx.golfScoreboard, { path: 'golf/pga', name: 'PGA Tour', sport: 'golf' }, NOW);
  assert.equal(g.kind, 'field');
  assert.deepEqual(g.leaders.map((l) => l.name), ['Ludvig Åberg', 'Tom Kim', 'Max Homa']);
  assert.match(toText(g), /Leaderboard:\n {2}1\. Ludvig Åberg -11/);
});

test('cricinfo matches normalize with scores and link', () => {
  const [m] = normalizeCricinfo(fx.cricinfoCurrent);
  assert.equal(m.status.state, 'in');
  assert.equal(m.home.score, '301/7 (50 ov)');
  assert.equal(m.league.name, 'Australia tour of India 2026');
  assert.match(m.link, /australia-tour-of-india-2026-1449890\/india-vs-australia-2nd-odi-1449900\/live-cricket-score$/);
});

test('cricinfo RSS fallback parses titles', () => {
  const xml = '<rss><channel><item><title>India 301/7 v Australia 182/4 *</title><link>https://www.espncricinfo.com/ci/engine/match/1449900.html</link></item></channel></rss>';
  const [m] = normalizeCricinfoRss(xml);
  assert.equal(m.home.name, 'India');
  assert.equal(m.away.score, '182/4');
  assert.equal(m.status.state, 'in');
  assert.equal(m.id, '1449900');
});

test('parses RSS and Atom feeds', () => {
  const rss = parseFeed(fx.rssFeed);
  assert.equal(rss.length, 3);
  assert.equal(rss[0].title, 'Arsenal beat Chelsea in London derby');
  assert.equal(rss[0].summary, 'Saka & Rice score as Arsenal go top.');
  assert.equal(rss[0].image, 'https://ichef.bbci.co.uk/a.jpg');
  const [atom] = parseFeed(fx.atomFeed);
  assert.equal(atom.link, 'https://example.com/f1/pole');
  assert.equal(atom.summary, 'Max Verstappen – pole in Austin.');
});

test('classifies general headlines by sport', () => {
  assert.equal(classify('Lakers open season with win over Warriors'), 'basketball');
  assert.equal(classify('India set Australia 302 to win second ODI'), 'cricket');
  assert.equal(classify('Verstappen takes pole at US Grand Prix'), 'racing');
  assert.equal(classify('Chiefs quarterback throws four touchdowns'), 'football');
  assert.equal(classify('Arsenal beat Chelsea in Premier League'), 'soccer');
});

test('merges news: dedupes across feeds, strips Google suffix, drops stale', () => {
  const items = mergeNews(
    [
      { feed: { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', sport: 'general' }, items: parseFeed(fx.rssFeed) },
      { feed: { name: 'Google News', url: 'https://news.google.com/rss/x', sport: 'general' }, items: parseFeed(fx.googleNewsFeed) },
    ],
    NOW,
  );
  const titles = items.map((i) => i.title);
  assert.equal(titles.filter((t) => t.startsWith('Arsenal beat Chelsea')).length, 1);
  assert.ok(!titles.includes('Old story'));
  const lakers = items.find((i) => i.title.startsWith('Lakers'));
  assert.equal(lakers.title, 'Lakers open season with win over Warriors');
  assert.equal(lakers.source, 'ESPN');
  assert.equal(lakers.sport, 'basketball');
  assert.equal(items[0].title, 'Arsenal beat Chelsea in London derby'); // newest first
});

test('sorts live first, upcoming soonest, results newest', () => {
  const mk = (id, state, date) => ({ id, status: { state }, date });
  const out = sortMatches([mk('p1', 'post', '2026-10-15T10:00Z'), mk('u2', 'pre', '2026-10-18T10:00Z'), mk('l', 'in', '2026-10-16T10:00Z'), mk('u1', 'pre', '2026-10-17T10:00Z'), mk('p2', 'post', '2026-10-16T10:00Z')]);
  assert.deepEqual(out.map((m) => m.id), ['l', 'u1', 'u2', 'p2', 'p1']);
});

test('every copy format renders', () => {
  const [m] = normalizeScoreboard(fx.soccerScoreboard, EPL, NOW);
  const opts = { siteUrl: 'https://sportsnews.vercel.app', timeZone: 'UTC' };
  const text = formatMatch(m, 'text', opts);
  assert.match(text, /^⚽ Premier League\nArsenal 2 – 1 Chelsea\nStatus: LIVE · 67'/);
  assert.match(text, /Venue: Emirates Stadium, London, England/);
  assert.match(text, /23' Goal: Bukayo Saka \(ARS\)/);
  assert.match(formatMatch(m, 'markdown', opts), /^### ⚽ Arsenal 2 – 1 Chelsea/);
  assert.equal(JSON.parse(formatMatch(m, 'json', opts)).scoreline, 'Arsenal 2 – 1 Chelsea');
  assert.match(formatMatch(m, 'embed', opts), /<iframe src="https:\/\/sportsnews\.vercel\.app\/embed\?l=soccer%2Feng\.1&id=740001"/);
  assert.equal(formatMatch(m, 'api', opts), 'https://sportsnews.vercel.app/api/match?l=soccer%2Feng.1&id=740001');
});

// ---- API handlers with mocked upstream fetch ----
function mockRes() {
  const res = { headers: {}, statusCode: 200, body: '' };
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v);
  res.end = (b) => (res.body = b);
  return res;
}

function mockFetch() {
  globalThis.fetch = async (url) => {
    const u = String(url);
    let body;
    if (u.includes('soccer/eng.1/scoreboard')) body = fx.soccerScoreboard;
    else if (u.includes('golf/pga/scoreboard')) body = fx.golfScoreboard;
    else if (u.includes('hs-consumer-api.espncricinfo.com')) body = fx.cricinfoCurrent;
    else if (u.includes('feeds.bbci.co.uk/sport/rss.xml')) return new Response(fx.rssFeed);
    else if (u.includes('news.google.com')) return new Response(fx.googleNewsFeed);
    else return new Response('nope', { status: 503 });
    return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  };
}

test('API: /api/scores aggregates sources and survives failures', async () => {
  mockFetch();
  const { default: scores } = await import('../api/scores.js');
  const res = mockRes();
  await scores({ query: {}, headers: {} }, res);
  const data = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.ok(data.matches.some((m) => m.sport === 'cricket'));
  assert.ok(data.matches.some((m) => m.sport === 'golf'));
  assert.equal(data.matches[0].status.state, 'in');
  assert.ok(data.sources.failed.length > 0);
  assert.match(res.headers['cache-control'], /s-maxage=\d+, stale-while-revalidate/);

  const r2 = mockRes();
  await scores({ query: { sport: 'cricket' }, headers: {} }, r2);
  assert.ok(JSON.parse(r2.body).matches.every((m) => m.sport === 'cricket'));
});

test('API: /api/news returns deduped headlines', async () => {
  mockFetch();
  const { default: news } = await import('../api/news.js');
  const res = mockRes();
  await news({ query: {}, headers: {} }, res);
  const data = JSON.parse(res.body);
  assert.ok(data.items.length >= 3);
  assert.ok(data.sources.ok >= 2);
});

test('API: /api/match returns codes and validates input', async () => {
  mockFetch();
  const { default: match } = await import('../api/match.js');
  const req = (q) => ({ query: q, headers: { host: 'sportsnews.vercel.app', 'x-forwarded-proto': 'https' } });

  let res = mockRes();
  await match(req({ l: 'soccer/eng.1', id: '740001', format: 'text' }), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/plain/);
  assert.match(res.body, /Arsenal 2 – 1 Chelsea/);
  assert.match(res.headers['cache-control'], /s-maxage=(\d|[1-5]\d|60),/);

  res = mockRes();
  await match(req({ l: 'cricket', id: '1449900' }), res);
  assert.equal(JSON.parse(res.body).home.name, 'India');

  res = mockRes();
  await match(req({ l: 'evil.com/x', id: '1' }), res);
  assert.equal(res.statusCode, 400);

  res = mockRes();
  await match(req({ l: 'soccer/eng.1', id: '../../x' }), res);
  assert.equal(res.statusCode, 400);
});
