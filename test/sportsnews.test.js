import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as espnModule from '../lib/espn.js';
import { normalizeScoreboard } from '../lib/espn.js';
import { normalizeCricinfo, normalizeCricinfoRss } from '../lib/cricket.js';
import { parseFeed, classify } from '../lib/rss.js';
import { mergeNews, sortMatches } from '../lib/feeds.js';
import { formatMatch, scoreline, toText, statusLabel } from '../public/js/format.js';
import * as fx from './fixtures.js';

const NOW = Date.parse('2026-10-16T20:00:00Z');
const EPL = { path: 'soccer/eng.1', name: 'Premier League', sport: 'soccer', range: true };

test('team-sport leagues are fetched one day at a time; tournaments in one request', () => {
  const { scoreboardUrls } = espnModule;
  assert.deepEqual(
    scoreboardUrls(EPL, NOW).map((u) => u.split('?')[1]),
    ['limit=300&dates=20261015', 'limit=300&dates=20261016', 'limit=300&dates=20261017'],
  );
  assert.deepEqual(scoreboardUrls({ path: 'golf/pga' }, NOW), ['https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?limit=300']);
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
  const liveOnly = normalizeEspnCricket({ sports: [{ leagues: [{ name: 'x', events: [{ ...fx.espnCricketHeader.sports[0].leagues[0].events[0], summary: 'LIVE', fullStatus: {} }] }] }] })[0];
  assert.equal(statusLabel(liveOnly), 'LIVE');
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
  clearMemo();
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

// ---- global coverage ----
import { normalizeSofa } from '../lib/sofa.js';
import { mergeSources } from '../lib/feeds.js';
import { cricketDetails } from '../lib/cricket.js';
import { summaryDetails } from '../lib/espn.js';
import { resultLine, newsPoster } from '../public/js/format.js';
import { clearMemo, retryPolicy, pool } from '../lib/http.js';
import { normalizeSportsDb } from '../lib/sportsdb.js';
retryPolicy.delay = 0;

test('normalizes Sofascore football with live minute, country and colours', () => {
  const now = Date.parse('2026-10-17T15:21:30Z');
  const m = normalizeSofa(fx.sofaFootballLive.events[0], 'football', now);
  assert.equal(m.sport, 'soccer');
  assert.equal(m.league.path, 'sofa/football');
  assert.equal(m.league.country, 'England');
  assert.equal(m.status.state, 'in');
  assert.equal(m.status.clock, "67'");
  assert.equal(m.home.score, '2');
  assert.equal(m.home.color, '#cc0000');
  assert.match(m.home.logo, /img\.sofascore\.com\/api\/v1\/team\/42\/image/);
  assert.equal(m.note, 'Round 8');
});

test('Sofascore tennis keeps sets and winner', () => {
  const m = normalizeSofa(fx.sofaTennisDay.events[0], 'tennis', NOW);
  assert.equal(m.status.state, 'post');
  assert.deepEqual(m.home.linescores, ['6', '7']);
  assert.equal(m.home.winner, true);
  assert.equal(resultLine(m), 'Sinner J. beat Alcaraz C. 2–0');
});

test('drops Sofascore duplicates of ESPN fixtures, keeps the rest', () => {
  const espn = normalizeScoreboard(fx.soccerScoreboard, EPL, NOW);
  const sofa = fx.sofaFootballLive.events.map((e) => normalizeSofa(e, 'football', NOW));
  const merged = mergeSources(espn, sofa);
  assert.equal(merged.length, espn.length + 1);
  assert.ok(merged.some((m) => m.home.name === 'Mohun Bagan SG'));
  assert.equal(merged.filter((m) => /Arsenal/.test(m.name)).length, 1);
});

test('ESPN summary becomes rich details', () => {
  const [m] = normalizeScoreboard(fx.soccerScoreboard, EPL, NOW);
  const d = summaryDetails(fx.espnSummary, m);
  assert.deepEqual(d.stats[0], { label: 'Possession', home: '58%', away: '42%' });
  assert.equal(d.attendance, 60123);
  assert.deepEqual(d.officials, ['Referee: Michael Oliver']);
  assert.equal(d.lineups[0].formation, '4-3-3');
  assert.equal(m.headline, 'Arsenal edge Chelsea in derby thriller');
});

test('cricket details: innings highlights, toss, player of the match', () => {
  const d = cricketDetails(fx.cricinfoDetails);
  assert.equal(d.innings[0].total, '301/7 (50 ov)');
  assert.deepEqual(d.innings[0].topBatters, ['Virat Kohli 112 (98)', 'Rohit Sharma 45 (40)']);
  assert.deepEqual(d.innings[0].topBowlers, ['Pat Cummins 3/55 (10)']);
  assert.equal(d.toss, 'India won the toss and chose to bat');
  assert.equal(d.playerOfTheMatch, 'Virat Kohli');
});

test('AI poster brief has every detail and a ready prompt', () => {
  const [m] = normalizeScoreboard(fx.soccerScoreboard, EPL, NOW);
  m.details = summaryDetails(fx.espnSummary, m);
  m.home.color = '#EF0107';
  const p = formatMatch(m, 'poster', { siteUrl: 'https://nxt.example', timeZone: 'Asia/Kolkata' });
  for (const want of [/SPORT: Football ⚽/, /COMPETITION: Premier League/, /STATUS: LIVE · 67'/, /19:30 GMT\+5:30\s+\|\s+.*14:00 UTC/, /VENUE: Emirates Stadium, London, England \(capacity 60,704\) · attendance 60,123/, /HOME: Arsenal \(ARS\) — 2/, /RESULT: Live: Arsenal lead Chelsea 2–1/, /KEY MOMENTS:\n• 23' Goal — Bukayo Saka/, /Possession: 58% – 42%/, /LINE-UPS:\nArsenal \(4-3-3\): 22 David Raya/, /TEAM COLOURS: Arsenal: #EF0107/, /PROMPT FOR AI/, /live score update graphic/, /NXT Sports/]) {
    assert.match(p, want);
  }
  const pre = normalizeScoreboard(fx.soccerScoreboard, EPL, NOW)[1];
  assert.match(formatMatch(pre, 'poster', {}), /RESULT: Upcoming: Liverpool vs Everton[\s\S]*match-day preview poster/);
});

test('news poster copy', () => {
  const p = newsPoster({ sport: 'cricket', title: 'Kohli hits 50th ODI hundred', summary: 'Record day.', source: 'BBC', link: 'https://x', published: '2026-10-16T10:00:00Z' });
  assert.match(p, /SPORT: Cricket 🏏\nHEADLINE: Kohli hits 50th ODI hundred\nSUMMARY: Record day\./);
  assert.match(p, /BREAKING CRICKET NEWS/);
});

function mockFetchGlobal() {
  clearMemo();
  globalThis.fetch = async (url) => {
    const u = String(url);
    const json = (b) => new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json' } });
    if (u.includes('soccer/eng.1/scoreboard')) return json(fx.soccerScoreboard);
    if (u.includes('soccer/eng.1/summary')) return json(fx.espnSummary);
    if (u.includes('sofascore.com/api/v1/sport/football/events/live')) return json(fx.sofaFootballLive);
    if (u.includes('sofascore.com/api/v1/sport/tennis/scheduled-events')) return json({ events: fx.sofaTennisDay.events.map((e) => ({ ...e, startTimestamp: Math.floor(Date.now() / 1000) - 3600 })) });
    if (u.includes('sofascore.com/api/v1/sport/')) return json({ events: [] });
    if (u.includes('/event/12345678/incidents')) return json(fx.sofaIncidents);
    if (u.includes('/event/12345678/statistics')) return json(fx.sofaStats);
    if (u.includes('/event/12345678/lineups')) return json(fx.sofaLineups);
    if (u.includes('/event/12345678')) return json(fx.sofaEventDetail);
    if (u.includes('hs-consumer-api.espncricinfo.com/v1/pages/matches/current')) return json(fx.cricinfoCurrent);
    if (u.includes('hs-consumer-api.espncricinfo.com/v1/pages/match/details')) return json(fx.cricinfoDetails);
    return new Response('nope', { status: 404 });
  };
}

test('API: per-sport scores include worldwide matches', async () => {
  mockFetchGlobal();
  const { default: scores } = await import('../api/scores.js?global');
  let res = mockRes();
  await scores({ query: { sport: 'tennis' }, headers: {} }, res);
  let data = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.ok(data.matches.some((m) => m.source === 'sofascore' && m.home.name === 'Sinner J.'));

  res = mockRes();
  await scores({ query: { sport: 'nope' }, headers: {} }, res);
  assert.equal(res.statusCode, 400);
});

test('API: match details for Sofascore and cricket in poster format', async () => {
  mockFetchGlobal();
  const { default: match } = await import('../api/match.js?global');
  const req = (q) => ({ query: q, headers: { host: 'nxt.example' } });

  let res = mockRes();
  await match(req({ l: 'sofa/football', id: '12345678', format: 'poster' }), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /VENUE: Emirates Stadium, London, England \(capacity 60,704\)/);
  assert.match(res.body, /• 23' Goal — Bukayo Saka \(assist Martin Ødegaard\) \(Arsenal\) \[1-0\]/);
  assert.match(res.body, /Ball possession: 58% – 42%/);
  assert.match(res.body, /OFFICIALS: Referee: Michael Oliver \(England\)/);
  assert.match(res.body, /COACHES: Arsenal: Mikel Arteta \| Chelsea: Enzo Maresca/);

  res = mockRes();
  await match(req({ l: 'cricket', id: '1449900', format: 'poster' }), res);
  assert.match(res.body, /TOSS: India won the toss and chose to bat/);
  assert.match(res.body, /PLAYER OF THE MATCH: Virat Kohli/);

  res = mockRes();
  await match(req({ l: 'sofa/evil', id: '1' }), res);
  assert.equal(res.statusCode, 400);
});

// ---- resilience ----
test('pool honours a deadline and marks the rest pending', async () => {
  const slow = (ms) => () => new Promise((r) => setTimeout(() => r(ms), ms));
  const t0 = Date.now();
  const out = await pool([slow(10), slow(2000), slow(10), slow(2000)], 2, (f) => f(), { deadline: Date.now() + 150 });
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(out[0].status, 'fulfilled');
  assert.equal(out[1].status, 'pending');
  assert.equal(out.filter((r) => r.status === 'pending').length >= 1, true);
  const full = await pool([slow(5), slow(5), slow(5)], 2, (f) => f());
  assert.deepEqual(full.map((r) => r.status), ['fulfilled', 'fulfilled', 'fulfilled']);
});

test('TheSportsDB events normalize with status, badges and priority', () => {
  const now = Date.parse('2026-10-17T15:10:00Z');
  const [live, done, pre, race] = fx.tsdbSoccerDay.events.map((e) => normalizeSportsDb(e, 'soccer', now));
  assert.equal(live.status.state, 'in');
  assert.equal(live.status.clock, "67'");
  assert.equal(live.home.score, '2');
  assert.equal(live.league.priority, 9900);
  assert.equal(live.league.country, '');
  assert.match(live.home.logo, /arsenal\.png$/);
  assert.equal(done.status.state, 'post');
  assert.equal(done.home.winner, true);
  assert.equal(pre.status.state, 'pre');
  assert.equal(pre.date, '2026-10-17T17:00:00.000Z');
  assert.equal(race.kind, 'field');
});

test('ESPN: unknown league codes count as empty, not as failures', async () => {
  clearMemo();
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('ksa.1')) return new Response('bad', { status: 400 });
    if (/dates=\d{8}$/.test(u)) return new Response(JSON.stringify({ events: [fx.soccerScoreboard.events[u.includes('20261017') ? 0 : 1]] }));
    return new Response('x', { status: 404 });
  };
  const { fetchEspn } = await import('../lib/espn.js');
  const r = await fetchEspn([EPL, { path: 'soccer/ksa.1', name: 'Saudi Pro League', sport: 'soccer', range: true }], NOW);
  assert.equal(r.failed.length, 0);
  assert.equal(r.ok, 2);
  assert.deepEqual(r.unknown, ['Saudi Pro League']);
  assert.equal(r.matches.length, 3);
});

test('ESPN: blocked host falls over to the second host and failures are reported', async () => {
  clearMemo();
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.startsWith('https://site.api.espn.com')) return new Response('blocked', { status: 403 });
    if (u.includes('eng.1')) return new Response(JSON.stringify({ events: u.includes('20261016') ? fx.soccerScoreboard.events : [] }));
    return new Response('down', { status: 503 });
  };
  const { fetchEspn } = await import('../lib/espn.js');
  const r = await fetchEspn([EPL, { path: 'soccer/esp.1', name: 'LaLiga', sport: 'soccer', range: true }], NOW);
  assert.equal(r.matches.length, 2);
  assert.equal(r.failed.length, 1);
  assert.match(r.failed[0].error, /503/);
});

test('API: overview survives ESPN and Sofascore being blocked thanks to TheSportsDB', async () => {
  clearMemo();
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('thesportsdb.com')) {
      if (!u.includes('s=Soccer')) return new Response(JSON.stringify({ events: null }));
      return new Response(JSON.stringify(fx.tsdbSoccerDay));
    }
    if (u.includes('espncricinfo.com')) return new Response(JSON.stringify(fx.cricinfoCurrent));
    return new Response('blocked', { status: 403 });
  };
  const { default: scores } = await import('../api/scores.js?resilient');
  const res = mockRes();
  await scores({ query: {}, headers: {} }, res);
  const data = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.ok(data.matches.some((m) => m.source === 'sportsdb' && /Arsenal/.test(m.name)));
  assert.ok(data.matches.some((m) => m.source === 'cricinfo'));
  assert.equal(data.sources.families.espn.ok, 0);
  assert.ok(data.sources.families.espn.failed > 0);
  assert.equal(data.sources.families.sportsdb.matches, 4);
  assert.ok(data.sources.failed.some((f) => /ESPN/.test(f.source) && /403/.test(f.error)));
});

// ---- importance ----
import { matchTier, newsTier } from '../lib/importance.js';

test('matches are labelled VIMP / IMP / not important', () => {
  const t = (m) => matchTier(m).tier;
  const vs = (league, home, away, extra = {}) => ({ sport: 'soccer', league: { name: league }, name: `${home} vs ${away}`, home: { name: home }, away: { name: away }, ...extra });
  assert.equal(t(vs('UEFA Champions League', 'Bayern Munich', 'Celtic')), 'vimp');
  assert.equal(t(vs('Premier League', 'Brentford', 'Fulham')), 'imp');
  assert.equal(t(vs('Premier League', 'Arsenal', 'Fulham')), 'vimp'); // marquee club
  assert.equal(t(vs('Premier League', 'Arsenal', 'Chelsea', { note: 'Round 8' })), 'vimp');
  assert.equal(t(vs('Premier League 2', 'Arsenal U21', 'Chelsea U21')), 'low'); // youth
  assert.equal(t(vs('Regionalliga Nord', 'Hannover II', 'Meppen')), 'low');
  assert.equal(t(vs('EFL Championship', 'Hull City', 'Preston')), 'imp');
  assert.equal(t(vs('Copa del Rey', 'Getafe', 'Osasuna', { note: 'Semi-final' })), 'vimp');
  assert.equal(t(vs('Kenya Premier League', 'Gor Mahia', 'AFC Leopards', { note: 'Final' })), 'low'); // low stays low
  assert.equal(t({ ...vs('Australia tour of India 2026', 'India', 'Australia'), sport: 'cricket', note: '2nd ODI · ODI' }), 'vimp');
  assert.equal(t({ ...vs('County Championship', 'Surrey', 'Kent'), sport: 'cricket' }), 'low');
  assert.equal(t({ ...vs('Big Bash League', 'Sydney Sixers', 'Perth Scorchers'), sport: 'cricket' }), 'imp');
  assert.equal(t({ sport: 'racing', league: { name: 'Formula 1' }, name: 'United States Grand Prix — Race', kind: 'field' }), 'vimp');
  assert.equal(t({ sport: 'racing', league: { name: 'Formula 1' }, name: 'United States Grand Prix — FP2', kind: 'field' }), 'low');
  assert.equal(t({ sport: 'tennis', league: { name: 'ATP · Shanghai Masters' }, name: 'Sinner vs Alcaraz', home: { name: 'Jannik Sinner' }, away: { name: 'Carlos Alcaraz' }, note: "Men's Singles" }), 'vimp');
  assert.equal(t({ sport: 'tennis', league: { name: 'ATP · Stockholm Open' }, name: 'A vs B', home: { name: 'Elias Ymer' }, away: { name: 'Jan Choinski' } }), 'imp');
  assert.equal(t({ sport: 'basketball', league: { name: 'NBA' }, name: 'x', home: { name: 'Orlando Magic' }, away: { name: 'Detroit Pistons' } }), 'imp');
  assert.equal(t({ sport: 'basketball', league: { name: 'NBA' }, name: 'x', home: { name: 'Los Angeles Lakers' }, away: { name: 'Detroit Pistons' } }), 'vimp');
  assert.equal(t({ sport: 'combat', league: { name: 'UFC' }, name: 'UFC 320: Pereira vs Ankalaev', kind: 'field' }), 'vimp');
  assert.equal(t({ sport: 'combat', league: { name: 'UFC' }, name: 'UFC Fight Night: Smith vs Jones', kind: 'field' }), 'vimp'); // "jones" is marquee
  assert.equal(t({ sport: 'volleyball', league: { name: 'Plusliga' }, name: 'x', home: { name: 'Resovia' }, away: { name: 'Skra' } }), 'low');
  assert.match(matchTier(vs('UEFA Champions League', 'Bayern Munich', 'Celtic')).reason, /Champions League/);
  // Seen live: a World Cup qualifying league for associate nations is not the World Cup.
  assert.equal(t({ ...vs("ICC Men's Cricket World Cup League 2", 'Canada', 'Nepal'), sport: 'cricket' }), 'low');
  assert.equal(t({ ...vs('ICC Cricket World Cup Qualifier', 'Scotland', 'Oman'), sport: 'cricket' }), 'low');
  assert.equal(t({ ...vs("ICC Men's T20 World Cup", 'India', 'Pakistan'), sport: 'cricket' }), 'vimp');
  assert.equal(t({ ...vs('FIFA World Cup', 'Brazil', 'Croatia'), note: 'Quarter-final' }), 'vimp');
});

test('headlines are labelled by who and what', () => {
  assert.equal(newsTier({ sport: 'soccer', title: 'Messi signs new Inter Miami contract' }), 'vimp');
  assert.equal(newsTier({ sport: 'cricket', title: 'India name squad for Australia ODIs' }), 'imp');
  assert.equal(newsTier({ sport: 'soccer', title: 'Burnley draw 0-0 with Luton' }), 'low');
  assert.equal(newsTier({ sport: 'soccer', title: 'Brentford beat Fulham in Premier League' }), 'imp');
  assert.equal(newsTier({ sport: 'soccer', title: 'Liverpool beat Chelsea to go top' }), 'vimp');
  assert.equal(newsTier({ sport: 'other', title: 'Local club opens new changing rooms' }), 'low');
  assert.equal(newsTier({ sport: 'racing', title: 'Verstappen takes pole at US Grand Prix' }), 'vimp');
});

test('scores API carries tiers and counts', async () => {
  mockFetch();
  const { default: scores } = await import('../api/scores.js?tiers');
  const res = mockRes();
  await scores({ query: {}, headers: {} }, res);
  const data = JSON.parse(res.body);
  assert.ok(data.matches.every((m) => ['vimp', 'imp', 'low'].includes(m.tier)));
  assert.ok(data.tiers.vimp >= 1);
  const arsenal = data.matches.find((m) => /Arsenal/.test(m.name));
  assert.equal(arsenal.tier, 'vimp');
  assert.match(formatMatch(arsenal, 'poster', {}), /IMPORTANCE: VIMP \(Premier League, (Arsenal|Chelsea)\)/);
});

// ---- ESPN cricket ----
import { normalizeEspnCricket } from '../lib/espn-cricket.js';


test('ESPN cricket header feed normalizes and outranks the Cricinfo RSS copy', () => {
  const [m] = normalizeEspnCricket(fx.espnCricketHeader);
  assert.equal(m.sport, 'cricket');
  assert.equal(m.status.state, 'in');
  assert.equal(m.home.score, '301/7 (50 ov)');
  assert.equal(m.league.name, 'Australia tour of India 2026');
  const liveOnly = normalizeEspnCricket({ sports: [{ leagues: [{ name: 'x', events: [{ ...fx.espnCricketHeader.sports[0].leagues[0].events[0], summary: 'LIVE', fullStatus: {} }] }] }] })[0];
  assert.equal(statusLabel(liveOnly), 'LIVE');
  assert.equal(m.note, '2nd ODI');
  assert.equal(m.venue.name, 'Wankhede Stadium, Mumbai');
  // Cricinfo's live-score RSS has no timestamps: the duplicate must still be dropped.
  const rss = normalizeCricinfoRss('<rss><channel><item><title>India 301/7 v Australia 182/4 *</title><link>https://www.espncricinfo.com/ci/engine/match/1449900.html</link></item><item><title>Surrey 210 v Kent 180/4 *</title><link>https://www.espncricinfo.com/ci/engine/match/777.html</link></item></channel></rss>');
  assert.equal(rss[0].date, '');
  const merged = mergeSources([m], rss);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].source, 'espn');
  assert.equal(merged[1].name, 'Surrey vs Kent');
  assert.equal(matchTier(m).tier, 'vimp');
});

test('API: ESPN cricket matches can be copied through /api/match', async () => {
  clearMemo();
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('scoreboard/header?sport=cricket')) return new Response(JSON.stringify(fx.espnCricketHeader));
    return new Response('blocked', { status: 403 });
  };
  const { default: match } = await import('../api/match.js?espncricket');
  const res = mockRes();
  await match({ query: { l: 'cricket-espn/1449890', id: '1449900', format: 'poster' }, headers: { host: 'nxt.example' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /HOME: India \(IND\) — 301\/7 \(50 ov\)/);
  assert.match(res.body, /IMPORTANCE: VIMP \(international cricket\)/);
});

test('Sofascore is left alone for 30 minutes after a 403', async () => {
  clearMemo();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('blocked', { status: 403 });
  };
  const { sofaGet } = await import('../lib/sofa.js');
  await assert.rejects(sofaGet('/sport/football/events/live'), /403/);
  const after = calls;
  await assert.rejects(sofaGet('/sport/tennis/events/live'), /blocked here/);
  assert.equal(calls, after);
});

// ---- Studio ----
import { BRANDS, scoreStory, postType } from '../lib/studio/score.js';
import { writeFormula } from '../lib/studio/writer.js';
import { pickTemplate, TEMPLATES } from '../lib/studio/templates.js';
import { renderPack } from '../lib/studio/render.js';

const NOWS = Date.parse('2026-10-17T16:30:00Z');
const matchFT = () => {
  const [m] = normalizeScoreboard(fx.soccerScoreboard, EPL, NOWS);
  m.status = { state: 'post', detail: 'FT', short: 'FT', completed: true };
  m.home.winner = true;
  m.tier = 'vimp';
  return m;
};

test('studio: scoring follows each page’s interests', () => {
  const ars = matchFT();
  const tsbScore = scoreStory(ars, BRANDS.tsb, NOWS);
  assert.equal(tsbScore.type, 'result');
  assert.ok(tsbScore.score > 2, 'a Premier League result with Arsenal is worth posting on TSB');
  const indiaNews = { kind: 'news', id: 'n1', title: 'India beat Australia to level the ODI series', summary: '', sport: 'cricket', published: new Date(NOWS - 1800e3).toISOString(), tier: 'vimp' };
  assert.ok(scoreStory(indiaNews, BRANDS.tsb, NOWS).score > scoreStory(ars, BRANDS.tsb, NOWS).score, 'India cricket outranks a Premier League result on TSB');
  assert.ok(scoreStory(ars, BRANDS.musc, NOWS).score < 1, 'a non-United match is nearly worthless to MUSC');
  const utd = { ...ars, id: 'u', away: { ...ars.away, name: 'Manchester United', abbr: 'MUN' }, name: 'Manchester United at Arsenal' };
  assert.ok(scoreStory(utd, BRANDS.musc, NOWS).score > 5, 'a United match is top priority for MUSC');
  const youth = { ...utd, id: 'y', league: { path: 'x', name: 'Premier League 2' }, name: 'Manchester United U21 at Arsenal U21' };
  assert.equal(scoreStory(youth, BRANDS.musc, NOWS).score, 0);
  assert.equal(postType({ kind: 'news', title: 'Parul Chaudhary wins bronze in 5000m' }, BRANDS.tsb), 'medal');
  assert.equal(postType({ kind: 'news', title: 'India medal tally rises to 45' }, BRANDS.tsb), 'tally');
  assert.equal(postType({ kind: 'news', title: 'Kohli fastest to 15,000 ODI runs' }, BRANDS.tsb), 'milestone');
});

test('studio: formula words follow the brand voice', () => {
  const esp = { ...matchFT(), home: { name: 'England', abbr: 'ENG', score: '2' }, away: { name: 'Spain', abbr: 'ESP', score: '3', winner: true }, venue: { name: 'Wembley Stadium', city: 'London', country: 'England' }, league: { path: 'soccer/uefa.nations', name: 'UEFA Nations League' }, note: 'League A', events: [] };
  const w = writeFormula(esp, 'result', BRANDS.tsb);
  assert.equal(w.headline, 'Spain take Wembley.');
  assert.match(w.explainer, /^Spain beat England 3–2 at Wembley Stadium\./);
  assert.ok(w.hashtags.includes('#ENGESP') && w.hashtags.includes('#TheSportsBinge'));
  assert.doesNotMatch(w.headline, /[!?]/);
  const utd = { ...esp, home: { name: 'Liverpool', abbr: 'LIV', score: '1' }, away: { name: 'Manchester United', abbr: 'MUN', score: '2', winner: true }, venue: { name: 'Anfield', city: 'Liverpool' } };
  const mw = writeFormula(utd, 'result', BRANDS.musc);
  assert.equal(mw.headline, 'THREE POINTS. NO DRAMA.');
  assert.ok(mw.hashtags.includes('#MUFC'));
  assert.equal(writeFormula({ ...utd, away: { ...utd.away, score: '0', winner: false }, home: { ...utd.home, score: '3', winner: true } }, 'result', BRANDS.musc).headline, 'A NIGHT TO FORGET VS LIV.');
  const news = writeFormula({ kind: 'news', title: 'Virat Kohli becomes fastest to 15,000 ODI runs: the numbers', summary: 'x', sport: 'cricket', source: 'ESPNcricinfo' }, 'milestone', BRANDS.tsb);
  assert.equal(news.headline, '15,000 ODI RUNS.');
  assert.deepEqual(news.accentWords, ['15,000']);
  assert.equal(news.name, 'VIRAT KOHLI');
});

test('studio: every template renders a PNG', async () => {
  const esp = { ...matchFT(), home: { name: 'England', abbr: 'ENG', score: '2' }, away: { name: 'Spain', abbr: 'ESP', score: '3', winner: true }, venue: { name: 'Wembley Stadium', city: 'London' }, league: { path: 'soccer/uefa.nations', name: 'UEFA Nations League' } };
  const packFor = (brand, story, type) => ({ brand, type, words: writeFormula(story, type, brand), story, when: { day: 'SAT, 18 OCT', time: '5:00 PM IST' }, assets: {} });
  for (const [name, brand, story, type] of [['tsb-cream', BRANDS.tsb, esp, 'result'], ['tsb-dark', BRANDS.tsb, { kind: 'news', id: 'k', title: 'Kohli fastest to 15,000 ODI runs', summary: 'In 303 innings.', sport: 'cricket', source: 'x' }, 'milestone'], ['musc-result', BRANDS.musc, esp, 'result'], ['musc-matchday', BRANDS.musc, { ...esp, status: { state: 'pre' } }, 'preview']]) {
    const { png, width, height } = await renderPack(packFor(brand, story, type), { size: 'post', template: name });
    assert.ok(png.length > 20_000, `${name} produced ${png.length} bytes`);
    assert.equal(png.readUInt32BE(16), 1080, `${name} width`);
    assert.deepEqual([width, height], [1080, 1350]);
  }
  const story = await renderPack(packFor(BRANDS.tsb, esp, 'result'), { size: 'story' });
  assert.equal(story.height, 1920);
  assert.equal(pickTemplate({ brand: BRANDS.tsb, type: 'result', story: esp }), 'tsb-cream');
  assert.equal(pickTemplate({ brand: BRANDS.musc, type: 'preview', story: esp }), 'musc-matchday');
  assert.ok(Object.keys(TEMPLATES).length >= 4);
});

test('studio: render endpoint accepts every story key shape', async () => {
  mockFetchGlobal();
  const { default: render } = await import('../api/studio/render.js?keys');
  for (const key of ['match:soccer/eng.1:740001', 'match:sofa/football:12345678', 'match:cricket-espn/1449890:1449900', 'news:some-headline-id']) {
    const res = mockRes();
    await render({ query: { brand: 'tsb', key, json: '1' }, headers: { host: 'x' } }, res);
    assert.notEqual(res.statusCode, 400, `${key} should be a valid key`);
  }
  const res = mockRes();
  await render({ query: { brand: 'tsb', key: 'match:soccer/eng.1:740001', w: '540' }, headers: { host: 'x' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'image/png');
  assert.equal(res.body.readUInt32BE(16), 540, 'thumbnail width honoured');
});

// ---- Studio photos ----
import { namesIn } from '../lib/studio/photos.js';
import { upsize } from '../lib/rss.js';

test('studio: athlete names are picked out of headlines, nations and events are not', () => {
  assert.deepEqual(namesIn('Parul Chaudhary wins bronze in women\'s 5000m at Asian Games'), ['Parul Chaudhary']);
  assert.deepEqual(namesIn('India beat Australia to level the ODI series'), []);
  assert.deepEqual(namesIn('Virat Kohli becomes fastest to 15,000 ODI runs as India win'), ['Virat Kohli']);
  assert.deepEqual(namesIn('Lamine Yamal and Nico Williams sink England at Wembley'), ['Lamine Yamal', 'Nico Williams']);
});

test('feed images are asked for at poster size', () => {
  assert.equal(upsize('https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/abcd/live/x.jpg'), 'https://ichef.bbci.co.uk/ace/standard/976/cpsprodpb/abcd/live/x.jpg');
  assert.equal(upsize('https://a.espncdn.com/photo/2026/1016/r1_600x400_16-9.jpg'), 'https://a.espncdn.com/photo/2026/1016/r1_1296x729_16-9.jpg');
  assert.equal(upsize('https://example.com/pic.jpg'), 'https://example.com/pic.jpg');
  const [item] = parseFeed('<rss><channel><item><title>T</title><link>https://x/1</link><media:content url="https://i.guim.co.uk/a/140.jpg" width="140"/><media:content url="https://i.guim.co.uk/a/460.jpg" width="460"/></item></channel></rss>');
  assert.equal(item.image, 'https://i.guim.co.uk/a/460.jpg');
});

test('studio: a photo sent with the request becomes the poster background', async () => {
  mockFetchGlobal();
  const { default: render } = await import('../api/studio/render.js?hero');
  // 2×2 red PNG
  const hero = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP4z8DwHwyBNAMDAC+YA/0h2fHCAAAAAElFTkSuQmCC';
  let res = mockRes();
  await render({ method: 'POST', body: { brand: 'tsb', key: 'news:nope', hero: 'data:text/plain;base64,QUJD' }, query: {}, headers: { host: 'x' } }, res);
  assert.equal(res.statusCode, 400);
  res = mockRes();
  await render({ method: 'POST', body: { brand: 'tsb', key: 'match:soccer/eng.1:740001', hero, template: 'tsb-dark', w: 360 }, query: {}, headers: { host: 'x' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'image/png');
});

// ---- Studio: calibrated against @thesportsbinge's grid ----
import { competitionOf, eventOf, markOf } from '../lib/studio/writer.js';
import { dupKey } from '../lib/studio/packs.js';

const NOWG = Date.parse('2026-10-18T10:00:00Z');
const headline = (title, sport = 'athletics', summary = '') => ({ kind: 'news', id: title.slice(0, 24), title, summary, sport, source: 'The Hindu', published: new Date(NOWG - 3600e3).toISOString(), tier: 'vimp' });

test('Olympic-programme sports get their own labels; India–Pakistan hockey is not ice hockey', () => {
  assert.equal(classify('India vs Pakistan hockey semi-final set for October 1 at Asian Games'), 'fieldhockey');
  assert.equal(classify('Maple Leafs beat Bruins in overtime hockey thriller'), 'hockey');
  assert.equal(classify('Esha Singh wins silver in women\'s 25m pistol after five shoot-offs'), 'shooting');
  assert.equal(classify('Curry\'s shooting carries Warriors past Lakers'), 'basketball');
  assert.equal(classify('Dhiraj Bommadevara tops men\'s recurve qualification'), 'archery');
  assert.equal(classify('Anahat Singh storms into Asian Games squash final'), 'squash');
  assert.equal(classify('Vithya Ramraj breaks national record in 400m hurdles'), 'athletics');
  assert.equal(classify('Pincky Balhara wins kurash bronze'), 'wrestling');
  assert.equal(classify('WWE Raw results: Cody Rhodes retains'), 'combat');
  assert.equal(newsTier({ sport: 'athletics', title: 'Parul Chaudhary wins bronze in women\'s 5000m at Asian Games' }), 'vimp');
});

test('studio: TSB ranks an Indian medal above a Nations League thriller, and both above the NBA', () => {
  const medal = headline('Gulveer Singh wins silver in men\'s 10,000m at Asian Games');
  const nations = headline('Spain beat England 3-2 at Wembley in Nations League thriller', 'soccer');
  const nba = { ...headline('Lakers beat Warriors as LeBron scores 40', 'basketball'), tier: 'imp' };
  const a = scoreStory(medal, BRANDS.tsb, NOWG).score;
  const b = scoreStory(nations, BRANDS.tsb, NOWG).score;
  const c = scoreStory(nba, BRANDS.tsb, NOWG).score;
  assert.ok(a > b && b > c, `${a} > ${b} > ${c}`);
  assert.ok(b >= BRANDS.tsb.threshold, 'a big European result still gets drafted');
  assert.ok(c < BRANDS.tsb.threshold, 'the NBA does not');
  assert.equal(scoreStory(headline('How to watch Asian Games live streaming in India', 'other'), BRANDS.tsb, NOWG).score, 0, 'how-to-watch pieces are never posts');
  assert.equal(postType(headline('Anahat Singh storms into Asian Games women\'s singles final', 'squash'), BRANDS.tsb), 'stage');
  assert.equal(postType(headline('Anahat Singh wins silver after reaching the final', 'squash'), BRANDS.tsb), 'medal');
  assert.equal(postType(headline('India\'s medal count at Asian Games rises to 45', 'other'), BRANDS.tsb), 'tally');
});

test('studio: medal, record and tally headlines follow the grid', () => {
  const W = (title, type, sport = 'athletics', summary = '') => writeFormula(headline(title, sport, summary), type, BRANDS.tsb, NOWG);
  let w = W('Asian Games 2026: Parul Chaudhary wins bronze in women\'s 5000m with a national record', 'medal', 'athletics', 'She clocked 15:14.61.');
  assert.equal(w.headline, 'PARUL CHAUDHARY BRONZE.');
  assert.equal(w.name, "WOMEN'S 5000M");
  assert.equal(w.eyebrow, 'ASIAN GAMES · AICHI-NAGOYA 2026');
  assert.deepEqual(w.stats.map((x) => x.value), ['15:14.61', 'NR']);
  assert.equal(w.accent, 'bronze');
  assert.ok(w.hashtags.includes('#AsianGames2026'));
  assert.equal(W('India win gold in women\'s 4x400m relay at Asian Games 2026', 'medal').headline, 'INDIA GOLD.');
  assert.equal(W('Yashvir Singh takes silver and Rohit Yadav bronze as India\'s javelin duo deliver', 'medal').headline, 'DOUBLE PODIUM.');
  w = W('Manush Shah and Diya Chitale win bronze in mixed doubles table tennis', 'medal', 'tabletennis');
  assert.equal(w.headline, 'BRONZE.');
  assert.equal(w.name, 'MANUSH SHAH & DIYA CHITALE · MIXED DOUBLES TABLE TENNIS');
  assert.equal(W('Sarvesh Kushare wins high jump silver, India\'s first high jump medal in 56 years', 'medal').headline, '56 YEARS LATER.');
  assert.equal(W('Vithya Ramraj breaks 42-year-old national record in 400m hurdles, wins bronze', 'medal').headline, '42 YEARS. THE RECORD FINALLY FALLS.');
  assert.equal(W('Baranica wins pole vault bronze, India\'s first-ever Asian Games medal in the event', 'medal').headline, 'INDIA’S FIRST EVER.');
  assert.equal(W('India beat Iran 39-35 to win men\'s kabaddi gold at Asian Games', 'medal', 'kabaddi').stats[0].value, '39–35');
  assert.equal(W('11-year-old Bodhana Sivanandan becomes youngest ever woman grandmaster', 'milestone', 'chess').headline, '11 YEARS OLD. HISTORY MADE.');
  assert.equal(W('Dhiraj Bommadevara sets Asian Games record with 698/720 in men\'s recurve qualification', 'milestone', 'archery').headline, '698/720. ASIAN GAMES RECORD.');
  assert.equal(W('Anahat Singh storms into Asian Games women\'s singles final', 'stage', 'squash', 'Fights back from 0-2 down to beat Satomi Watanabe 3-2.').headline, 'INTO THE FINAL.');
  assert.equal(W('Anahat Singh reaches semi-finals, assures India of a squash medal', 'stage', 'squash').headline, 'MEDAL ASSURED.');
  w = W('India\'s medal count at Asian Games rises to 45: 4 gold, 20 silver, 21 bronze, 12th in the medal table', 'tally', 'other');
  assert.equal(w.headline, 'INDIA MEDAL COUNT.');
  assert.equal(w.big, 45);
  assert.deepEqual(w.stats.map((x) => x.value), ['4', '20', '21', '12th']);
  w = W('Virat Kohli: "For me, it\'s the last World Cup I\'m going to play for India"', 'quote', 'cricket');
  assert.equal(w.headline, '“For me, it\'s the last World Cup I\'m going to play for India”');
  assert.equal(w.name, 'VIRAT KOHLI');
  assert.equal(W('Manchester City found guilty on almost all Premier League financial charges', 'breaking', 'soccer').headline, 'MANCHESTER CITY FOUND GUILTY.');
  assert.equal(W('Russell takes pole at Azerbaijan Grand Prix, Antonelli crashes out in Q1', 'breaking', 'racing').eyebrow, 'AZERBAIJAN GRAND PRIX');
  assert.equal(W('India vs Sri Lanka: Asian Games cricket semi-final preview', 'breaking', 'cricket').headline, 'INDIA VS SRI LANKA.');
  assert.equal(eventOf("Men's 50m rifle 3 positions team event silver"), "MEN'S 50M RIFLE 3 POSITIONS TEAM");
  assert.deepEqual(markOf('Sawan Barwal ran 2:11:37, a national record'), { value: '2:11:37', label: 'Time' });
  assert.equal(competitionOf('WPL 2027 retentions confirmed').eyebrow, 'TATA WPL');
});

test('studio: the same medal from two outlets is one candidate; the tally poster renders', async () => {
  const a = headline('Gulveer Singh wins silver in men\'s 10,000m at Asian Games');
  const b = headline('Asian Games: Gulveer Singh takes 10,000m silver for India');
  assert.equal(dupKey(a, 'medal'), dupKey(b, 'medal'));
  assert.notEqual(dupKey(a, 'medal'), dupKey(headline('Gulveer Singh wins silver in men\'s 1500m at Asian Games'), 'medal'));
  const story = headline('India\'s medal count at Asian Games rises to 45: 4 gold, 20 silver, 21 bronze', 'other');
  const words = writeFormula(story, 'tally', BRANDS.tsb, NOWG);
  const pack = { brand: BRANDS.tsb, type: 'tally', words, story, when: {}, assets: {} };
  assert.equal(pickTemplate(pack), 'tsb-tally');
  const { png, template } = await renderPack(pack, { size: 'post' });
  assert.equal(template, 'tsb-tally');
  assert.ok(png.length > 20_000);
});

// ---- Studio: the look (cut-outs, photo links, edits, tiers, kickers) ----
import { cleanWords } from '../api/studio/render.js';
import { splitTiers } from '../lib/studio/templates.js';
import { kickerOf } from '../lib/studio/writer.js';
import { codeOf, flagUrl } from '../lib/studio/flags.js';
import { withGrain } from '../lib/studio/render.js';

test('studio: headlines split into a name tier and a metal tier; kickers pick the striking fact', () => {
  assert.deepEqual(splitTiers({ headline: 'PARUL CHAUDHARY BRONZE.', accent: 'bronze', accentWords: ['bronze'] }, 'medal'), { top: 'PARUL CHAUDHARY', big: 'BRONZE.', metal: 'bronze' });
  assert.deepEqual(splitTiers({ headline: '56 YEARS LATER.', accent: 'silver', accentWords: ['later'] }, 'medal'), { top: '56 YEARS', big: 'LATER.', metal: 'silver' });
  assert.equal(splitTiers({ headline: '15,000 ODI RUNS.', accent: 'gold', accentWords: ['15,000'] }, 'milestone'), null, 'the accent is not the last word');
  assert.equal(splitTiers({ headline: 'Spain take Wembley.', accent: 'gold', accentWords: ['take'] }, 'result'), null);
  assert.equal(kickerOf("Sawan Barwal wins marathon silver in 2:11:37, India's first men's marathon medal in 44 years", 'A new national record.', '44 YEARS LATER.'), "INDIA'S FIRST MEN'S MARATHON MEDAL IN 44 YEARS");
  assert.equal(kickerOf('Parul Chaudhary wins bronze', 'She clocked 15:14.61 in Aichi-Nagoya.', 'PARUL CHAUDHARY BRONZE.', ['15:14.61']), '', 'a bare number already in the stats is not a kicker');
  assert.equal(kickerOf('Parul Chaudhary wins bronze', 'She clocked 15:14.61 in Aichi-Nagoya. Her second medal of these Games.', 'PARUL CHAUDHARY BRONZE.', ['15:14.61']), 'HER SECOND MEDAL OF THESE GAMES');
  assert.equal(kickerOf('Kohli fastest to 15,000 ODI runs', 'Only two have been here. He got there in 303 innings.', '15,000 ODI RUNS.'), 'ONLY TWO HAVE BEEN HERE');
  assert.equal(codeOf('India'), 'in');
  assert.equal(codeOf('England'), 'gb-eng');
  assert.equal(codeOf('Visitors 3'), '');
  assert.equal(flagUrl('Spain'), 'https://flagcdn.com/w320/es.png');
  const svg = withGrain('<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg"><rect/></svg>', 10, 10, 'tsb-dark');
  assert.match(svg, /<pattern id="nxt-grain"[\s\S]*<\/svg>$/);
});

test('studio: the desk’s edits are whitelisted and bounded', () => {
  assert.equal(cleanWords(null), null);
  assert.equal(cleanWords({ by: 'claude', caption: 'x' }), null, 'fields the poster does not draw are dropped');
  const w = cleanWords({ headline: ' INDIA GOLD. ', name: "WOMEN'S 4×400M RELAY", kicker: 'x'.repeat(400), stats: [{ value: '3:29.69', label: 'Time' }, { value: '', label: 'nothing' }, { value: 'a', label: 'b' }, { value: 'c', label: 'd' }, { value: 'e', label: 'f' }], accentWords: ['gold'], accent: 'purple', evil: '<script>' });
  assert.equal(w.headline, 'INDIA GOLD.');
  assert.equal(w.kicker.length, 120);
  assert.deepEqual(w.stats.map((s) => s.value), ['3:29.69', 'a', 'c']);
  assert.deepEqual(w.accentWords, ['gold']);
  assert.equal(w.accent, undefined);
  assert.equal(w.evil, undefined);
});

test('studio: render accepts a cut-out, a photo link and word edits; refuses bad ones', async () => {
  mockFetchGlobal();
  const { default: render } = await import('../api/studio/render.js?look');
  const px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP4z8DwHwyBNAMDAC+YA/0h2fHCAAAAAElFTkSuQmCC';
  let res = mockRes();
  await render({ method: 'POST', body: { brand: 'tsb', key: 'match:soccer/eng.1:740001', hero: px, cutout: px, cutoutAspect: 0.8, template: 'tsb-dark', w: 360, words: { headline: 'ARSENAL GOLD.', kicker: 'A KICKER', stats: [{ value: '2–1', label: 'Final score' }] } }, query: {}, headers: { host: 'x' } }, res);
  assert.equal(res.statusCode, 200, res.body?.toString?.().slice(0, 200));
  assert.equal(res.headers['content-type'], 'image/png');
  assert.equal(res.headers['cache-control'], 'no-store', 'own photos and edits are never cached');
  res = mockRes();
  await render({ method: 'POST', body: { brand: 'tsb', key: 'match:soccer/eng.1:740001', cutout: 'data:text/html;base64,QUJD' }, query: {}, headers: { host: 'x' } }, res);
  assert.equal(res.statusCode, 400);
  res = mockRes();
  await render({ method: 'POST', body: { brand: 'tsb', key: 'match:soccer/eng.1:740001', heroUrl: 'ftp://nope' }, query: {}, headers: { host: 'x' } }, res);
  assert.equal(res.statusCode, 400);
  res = mockRes();
  await render({ method: 'POST', body: { brand: 'tsb', key: 'match:soccer/eng.1:740001', json: 1, words: { headline: 'EDITED.' } }, query: {}, headers: { host: 'x' } }, res);
  assert.equal(JSON.parse(res.body).words.headline, 'EDITED.');
});

test('studio: the photo proxy fetches pictures only, from public hosts only', async () => {
  const { default: photo } = await import('../api/studio/photo.js');
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u) => {
    const s = String(u);
    if (s.includes('pic.jpg')) return new Response(Buffer.from('ffd8ffe0', 'hex'), { status: 200, headers: { 'content-type': 'image/jpeg' } });
    return new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } });
  };
  try {
    let res = mockRes();
    await photo({ query: { url: 'https://example.com/pic.jpg' }, headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'image/jpeg');
    for (const url of ['https://example.com/page', 'http://localhost/pic.jpg', 'http://192.168.1.4/pic.jpg', 'file:///etc/passwd', 'not a link']) {
      res = mockRes();
      await photo({ query: { url }, headers: {} }, res);
      assert.ok(res.statusCode >= 400, `${url} → ${res.statusCode}`);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ---- Studio: pasted stories and the world's feeds ----
import { parsePasted, cleanStory } from '../lib/studio/paste.js';
import { NEWS_FEEDS } from '../lib/sources.js';
import { toPoster } from '../public/js/format.js';

test('studio: the newsroom’s own Copy text pastes back into a match or a headline', () => {
  const [m] = normalizeScoreboard(fx.soccerScoreboard, EPL, NOW);
  m.status = { state: 'post', detail: 'FT', short: 'FT', completed: true };
  m.home.winner = true;
  m.tier = 'vimp';
  m.details = summaryDetails(fx.espnSummary, m);
  for (const text of [toPoster(m, { timeZone: 'Asia/Kolkata' }), toText(m, { timeZone: 'Asia/Kolkata' })]) {
    const s = parsePasted(text);
    assert.equal(s.kind, 'match', text.slice(0, 40));
    assert.equal(s.home.name, 'Arsenal');
    assert.equal(s.away.name, 'Chelsea');
    assert.deepEqual([s.home.score, s.away.score], ['2', '1']);
    assert.equal(s.league.name, 'Premier League');
    assert.equal(s.status.state, 'post');
    assert.ok(s.events.some((e) => e.player === 'Bukayo Saka' && e.minute === "23'"), JSON.stringify(s.events));
    assert.equal(cleanStory(s).home.name, 'Arsenal', 'the parsed story survives the desk round trip');
  }
  const n = parsePasted(newsPoster({ title: "Parul Chaudhary wins bronze in women's 5000m", summary: 'She clocked 15:14.61.', sport: 'athletics', source: 'The Hindu', link: 'https://x', published: new Date(NOW).toISOString(), tier: 'vimp' }));
  assert.equal(n.kind, 'news');
  assert.equal(n.title, "Parul Chaudhary wins bronze in women's 5000m");
  assert.equal(n.summary, 'She clocked 15:14.61.');
  assert.equal(n.sport, 'athletics');
  const loose = parsePasted("Gulveer Singh wins silver in men's 10,000m at Asian Games\nHe clocked 28:38.63, a national record.\nhttps://pics.example/g.jpg");
  assert.equal(loose.kind, 'news');
  assert.equal(loose.image, 'https://pics.example/g.jpg');
  assert.doesNotMatch(loose.summary, /https?:/);
  assert.equal(parsePasted('India vs Pakistan hockey semi-final, October 1').kind, 'news', 'a sentence with "vs" is a headline, not a fixture');
  assert.equal(parsePasted('   '), null);
  assert.equal(cleanStory({ kind: 'match', home: { name: 'A' } }), null);
  assert.equal(cleanStory({ kind: 'news', title: 'x', image: 'javascript:alert(1)' }).image, '');
});

test('studio: render draws a pasted story and refuses empty text', async () => {
  mockFetchGlobal();
  const { default: render } = await import('../api/studio/render.js?paste');
  let res = mockRes();
  await render({ method: 'POST', body: { brand: 'tsb', paste: "Parul Chaudhary wins bronze in women's 5000m at Asian Games\nShe clocked 15:14.61, a national record.", json: 1 }, query: {}, headers: { host: 'x' } }, res);
  assert.equal(res.statusCode, 200, res.body);
  const pack = JSON.parse(res.body);
  assert.equal(pack.key, 'news:pasted');
  assert.equal(pack.words.headline, 'PARUL CHAUDHARY BRONZE.');
  assert.equal(pack.story.source, 'pasted');
  res = mockRes();
  await render({ method: 'POST', body: { brand: 'tsb', story: pack.story, size: 'post', w: 360 }, query: {}, headers: { host: 'x' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'image/png');
  res = mockRes();
  await render({ method: 'POST', body: { brand: 'tsb', paste: '⚽ Premier League\nArsenal 2 – 1 Chelsea\nStatus: FT', json: 1 }, query: {}, headers: { host: 'x' } }, res);
  assert.equal(JSON.parse(res.body).template, 'tsb-cream');
  res = mockRes();
  await render({ method: 'POST', body: { brand: 'tsb', paste: '   ', json: 1 }, query: {}, headers: { host: 'x' } }, res);
  assert.equal(res.statusCode, 400);
});

test('news feeds cover the world', () => {
  assert.ok(NEWS_FEEDS.length >= 120, `${NEWS_FEEDS.length} feeds`);
  const countries = NEWS_FEEDS.filter((f) => /Google News \(/.test(f.name)).length;
  assert.ok(countries >= 25, `${countries} country editions`);
  assert.ok(NEWS_FEEDS.some((f) => /Olympic/.test(f.url)));
  assert.equal(new Set(NEWS_FEEDS.map((f) => f.url)).size, NEWS_FEEDS.length, 'no duplicate feed URLs');
});

test('studio: the headline moves to the top when the desk says the athlete is low', async () => {
  mockFetchGlobal();
  const { default: render } = await import('../api/studio/render.js?layout');
  const px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP4z8DwHwyBNAMDAC+YA/0h2fHCAAAAAElFTkSuQmCC';
  for (const layout of ['top', 'bottom', 'sideways']) {
    const res = mockRes();
    await render({ method: 'POST', body: { brand: 'tsb', key: 'match:soccer/eng.1:740001', hero: px, template: 'tsb-dark', layout, w: 300 }, query: {}, headers: { host: 'x' } }, res);
    assert.equal(res.statusCode, 200, layout);
  }
  const res = mockRes();
  await render({ method: 'POST', body: { brand: 'tsb', key: 'match:soccer/eng.1:740001', layout: 'top', json: 1 }, query: {}, headers: { host: 'x' } }, res);
  assert.equal(JSON.parse(res.body).layout, 'top');
});


// ---- Studio: the type engine and the page-matched templates ----
import { measure, fitSize, breakLines, setText, linesFor } from '../lib/studio/type.js';
import { templateOptions } from '../lib/studio/templates.js';

test('studio: type fills its measure and breaks lines like an editor', () => {
  const size = fitSize('BRONZE', 'cond', 1000);
  const w = measure('BRONZE', 'cond', size);
  assert.ok(w <= 1000 && w > 970, `BRONZE at ${size}px is ${w}px wide`);
  assert.deepEqual(setText('TWO FINALS. TWO SILVERS.', 'cond', 960, { max: 220, maxLines: 2 }).lines, ['TWO FINALS.', 'TWO SILVERS.'], 'breaks after a full stop');
  assert.deepEqual(setText('Wembley gets a heavyweight opener.', 'semi', 900, { max: 160, maxLines: 2 }).lines, ['Wembley gets a', 'heavyweight opener.']);
  assert.equal(breakLines('ONE TWO THREE FOUR FIVE SIX', 'cond', 400, 300, { maxLines: 2 }), null, 'no layout is reported, not faked');
  assert.ok(linesFor('MAN CITY FOUND GUILTY ON ALMOST ALL PREMIER LEAGUE FINANCIAL CHARGES', 'didone', 108, 970, { maxLines: 5 }).length <= 5);
});

test('studio: every kind has its own layout, with alternatives on the desk', async () => {
  const b = { tsb: BRANDS.tsb, musc: BRANDS.musc };
  const n = (title, type, words = {}) => ({ brand: b.tsb, type, story: { kind: 'news', title }, words: { headline: title, ...words }, key: title });
  assert.match(pickTemplate(n('PARUL CHAUDHARY BRONZE.', 'medal', { accent: 'bronze' })), /^tsb-medal-(top|bottom)$/);
  assert.equal(pickTemplate(n('DOUBLE PODIUM.', 'medal')), 'tsb-phrase');
  assert.equal(pickTemplate(n('15,000 ODI RUNS.', 'milestone')), 'tsb-number');
  assert.equal(pickTemplate(n('“For me, it’s the last World Cup”', 'quote')), 'tsb-quote');
  assert.equal(pickTemplate(n('MANCHESTER CITY FOUND GUILTY.', 'breaking')), 'tsb-verdict');
  assert.ok(templateOptions(n('INDIA GOLD.', 'medal')).length >= 3, 'the desk offers alternatives');
  const signing = { brand: b.musc, type: 'breaking', story: { kind: 'news', title: 'Isaac Konde joins Manchester United' }, words: { headline: 'A new Red.' }, key: 'k' };
  assert.equal(pickTemplate(signing), 'musc-signing');
  const variety = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((k) => pickTemplate({ brand: b.musc, type: 'breaking', story: { kind: 'news', title: 'x' }, words: { headline: 'X' }, key: k })));
  assert.ok(variety.size >= 2, 'neighbouring MUSC news posts do not all share one layout');
  // every template draws at the page's 3:4 size
  const esp = { kind: 'match', sport: 'soccer', league: { path: 'x', name: 'UEFA Nations League' }, home: { name: 'England', abbr: 'ENG', score: '2' }, away: { name: 'Spain', abbr: 'ESP', score: '3', winner: true }, status: { state: 'post' }, events: [] };
  const news = { kind: 'news', id: 'k', title: 'Kohli fastest to 15,000 ODI runs', summary: 'In 303 innings.', sport: 'cricket', source: 'x' };
  for (const name of Object.keys(TEMPLATES)) {
    const brand = name.startsWith('musc') ? b.musc : b.tsb;
    const story = /cream|preview|vs|result|matchday|statement/.test(name) ? esp : news;
    const type = story === esp ? 'result' : 'milestone';
    const { png, height } = await renderPack({ brand, type, words: writeFormula(story, type, brand), story, when: { day: 'SAT, 18 OCT', time: '5:00 PM IST' }, assets: {} }, { template: name, width: 270 });
    assert.equal(height, 1440, name);
    assert.ok(png.length > 5_000, `${name} drew`);
  }
});
