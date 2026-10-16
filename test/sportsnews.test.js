import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as espnModule from '../lib/espn.js';
import { normalizeScoreboard } from '../lib/espn.js';
import { normalizeCricinfo, normalizeCricinfoRss } from '../lib/cricket.js';
import { parseFeed, classify } from '../lib/rss.js';
import { mergeNews, sortMatches } from '../lib/feeds.js';
import { formatMatch, scoreline, toText } from '../public/js/format.js';
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
