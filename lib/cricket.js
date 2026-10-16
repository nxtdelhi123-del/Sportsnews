import { CRICINFO_CURRENT, CRICINFO_RSS } from './sources.js';
import { fetchWithTimeout, memoize } from './http.js';
import { parseFeed } from './rss.js';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  Referer: 'https://www.espncricinfo.com/',
  Origin: 'https://www.espncricinfo.com',
};

const STATE = { LIVE: 'in', POST: 'post', RESULT: 'post', FINISHED: 'post', PRE: 'pre', UPCOMING: 'pre', SCHEDULED: 'pre' };

function team(t = {}) {
  const tm = t.team || {};
  return {
    id: String(tm.objectId ?? tm.id ?? ''),
    name: tm.longName || tm.name || 'TBD',
    short: tm.abbreviation || tm.name || '',
    abbr: tm.abbreviation || '',
    logo: '',
    score: [t.score, t.scoreInfo ? `(${t.scoreInfo})` : ''].filter(Boolean).join(' '),
    winner: false,
    record: '',
    linescores: [],
  };
}

export function normalizeCricinfo(data) {
  return (data?.matches || []).map((m) => {
    const [home, away] = [team(m.teams?.[0]), team(m.teams?.[1])];
    if (m.winnerTeamId) {
      home.winner = home.id === String(m.winnerTeamId);
      away.winner = away.id === String(m.winnerTeamId);
    }
    const state = STATE[String(m.state || m.stage || '').toUpperCase()] || 'pre';
    const series = m.series || {};
    const link = series.slug && m.slug ? `https://www.espncricinfo.com/series/${series.slug}-${series.objectId}/${m.slug}-${m.objectId}/live-cricket-score` : 'https://www.espncricinfo.com/live-cricket-score';
    return {
      id: String(m.objectId ?? m.id),
      source: 'cricinfo',
      sport: 'cricket',
      kind: 'versus',
      league: { path: 'cricket', name: series.longName || series.name || 'Cricket', priority: 9_500 },
      seriesId: String(series.objectId ?? ''),
      name: `${home.name} vs ${away.name}`,
      shortName: `${home.abbr || home.name} v ${away.abbr || away.name}`,
      date: m.startTime || m.startDate || '',
      status: { state, detail: m.statusText || m.status || '', short: m.statusText || m.status || '', clock: '', period: null, completed: state === 'post' },
      venue: { name: m.ground?.name || '', city: m.ground?.town?.name || '', country: m.ground?.country?.name || '' },
      note: [m.title, m.format].filter(Boolean).join(' · '),
      headline: '',
      broadcasts: [],
      link,
      home,
      away,
      events: [],
    };
  });
}

// "India 245/6 * v Australia 301" → two sides with scores
function splitSide(s) {
  const m = s.trim().match(/^(.*?)\s+([\d/&\s]+(?:\s*\*)?)$/);
  return m ? { name: m[1].trim(), score: m[2].replace(/\s+/g, ' ').trim() } : { name: s.trim().replace(/\s*\*$/, ''), score: '' };
}

export function normalizeCricinfoRss(xml) {
  return parseFeed(xml).map((it, i) => {
    const [l = '', r = ''] = it.title.split(/\s+v\s+/);
    const h = splitSide(l);
    const a = splitSide(r);
    const live = /\*/.test(it.title);
    const state = live ? 'in' : h.score || a.score ? 'post' : 'pre';
    const mk = (s) => ({ id: '', name: s.name || 'TBD', short: s.name, abbr: '', logo: '', score: s.score.replace(/\s*\*$/, ''), winner: false, record: '', linescores: [] });
    const id = it.link.match(/(\d{5,})/)?.[1] || String(i);
    return {
      id, source: 'cricinfo', sport: 'cricket', kind: 'versus',
      league: { path: 'cricket', name: 'Cricket' },
      name: `${h.name} vs ${a.name}`, shortName: '', date: it.published || '',
      status: { state, detail: live ? 'In progress' : '', short: live ? 'In progress' : '', clock: '', period: null, completed: false },
      venue: { name: '', city: '', country: '' }, note: '', headline: it.summary || '', broadcasts: [], link: it.link,
      home: mk(h), away: mk(a), events: [],
    };
  });
}

export function fetchCricket() {
  return memoize('cricket', 4 * 60_000, fetchCricketNow);
}

async function fetchCricketNow() {
  try {
    const data = await fetchWithTimeout(CRICINFO_CURRENT, { headers: BROWSER_HEADERS });
    const matches = normalizeCricinfo(data);
    if (matches.length) return matches;
  } catch {
    /* fall through to RSS */
  }
  const xml = await fetchWithTimeout(CRICINFO_RSS, { as: 'text', headers: BROWSER_HEADERS });
  return normalizeCricinfoRss(xml);
}

// ---------- full match details (for copy / poster) ----------
const pname = (p) => p?.player?.longName || p?.player?.name || p?.player?.battingName || '';

export function cricketDetails(data) {
  const d = {};
  const content = data?.content || {};
  const innings = content.scorecard?.innings || content.innings || [];
  const lines = [];
  for (const inn of innings) {
    const team = inn.team?.longName || inn.team?.name || '';
    const total = [inn.runs !== undefined ? `${inn.runs}/${inn.wickets ?? ''}` : '', inn.overs !== undefined ? `(${inn.overs} ov)` : ''].filter(Boolean).join(' ');
    const bats = (inn.inningBatsmen || [])
      .filter((b) => b.runs !== undefined && b.runs !== null)
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 3)
      .map((b) => `${pname(b)} ${b.runs}${b.balls ? ` (${b.balls})` : ''}${b.isOut === false ? '*' : ''}`);
    const bowls = (inn.inningBowlers || [])
      .filter((b) => b.wickets !== undefined)
      .sort((a, b) => b.wickets - a.wickets || (a.conceded ?? 0) - (b.conceded ?? 0))
      .slice(0, 2)
      .map((b) => `${pname(b)} ${b.wickets}/${b.conceded ?? ''}${b.overs !== undefined ? ` (${b.overs})` : ''}`);
    lines.push({ team, total, topBatters: bats, topBowlers: bowls });
  }
  if (lines.length) d.innings = lines;
  const best = content.supportInfo?.bestPerformance || {};
  if (!lines.length && (best.batsmen || best.bowlers)) {
    d.innings = [{ team: 'Best performances', total: '', topBatters: (best.batsmen || []).slice(0, 3).map((b) => `${pname(b)} ${b.runs ?? ''}${b.balls ? ` (${b.balls})` : ''}`), topBowlers: (best.bowlers || []).slice(0, 3).map((b) => `${pname(b)} ${b.wickets ?? ''}/${b.conceded ?? ''}`) }];
  }
  const potm = (content.supportInfo?.playersOfTheMatch || []).map(pname).filter(Boolean);
  if (potm.length) d.playerOfTheMatch = potm.join(', ');
  const m = data?.match || {};
  if (m.tossWinnerTeamId && Array.isArray(m.teams)) {
    const t = m.teams.find((x) => String(x.team?.objectId ?? x.team?.id) === String(m.tossWinnerTeamId));
    if (t) d.toss = `${t.team.longName || t.team.name} won the toss and chose to ${m.tossWinnerChoice === 1 ? 'bat' : 'bowl'}`;
  }
  return d;
}

export async function cricketMatch(base) {
  if (!base?.seriesId || base.source !== 'cricinfo') return base;
  const m = structuredClone(base);
  try {
    const data = await fetchWithTimeout(`https://hs-consumer-api.espncricinfo.com/v1/pages/match/details?lang=en&seriesId=${base.seriesId}&matchId=${base.id}&latest=true`, { headers: BROWSER_HEADERS });
    m.details = cricketDetails(data);
  } catch {
    /* card data only */
  }
  return m;
}
