// Milestones straight from the live scorecard, minutes before any outlet writes them up.
//
// On 24 Nov 2026 Vaibhav Sooryavanshi made a 28-ball hundred and a 53-ball 204 for India A and
// no post went out on its own. Headlines about it arrived late and were judged too junior. This
// reads ESPN's live scorecards (the ESPNcricinfo data) for every cricket match an Indian team is
// playing, at any level, and turns these into stories the moment they happen:
//   - an Indian batter reaching 100, 150, 200, 250 or 300;
//   - an Indian bowler taking 5 or more wickets in an innings.
// Only numbers from the scorecard are used (runs, balls, fours, sixes, wickets, format). No
// record is ever claimed: a record needs an outlet or an official source to say so.
// These are drafts for the editor's tap and always reach the phone (they skip the brain); they
// post on their own only with AUTOPOST_RESULTS=1, like final scores.
import { fetchWithTimeout, memoize } from '../http.js';
import * as store from './store.js';

const INDIA = /\bindia\b/i;
const MARKS = [300, 250, 200, 150, 100];
const SUMMARY = (league, id) => `https://site.web.api.espn.com/apis/site/v2/sports/cricket/${league}/summary?event=${id}`;

const statsOf = (ls) => {
  const out = {};
  for (const c of ls?.statistics?.categories || []) for (const s of c.stats || []) out[s.name] = s.value;
  return out;
};
const leagueIdOf = (m) => (String(m.league?.path || '').match(/^cricket-espn\/(\d+)$/) || [])[1] || '';

// The matches worth reading: cricket from ESPN's feed, an Indian side, live or finished in the
// last few hours.
export function watchedMatches(matches, now = Date.now()) {
  return matches.filter((m) => {
    if (m.sport !== 'cricket' || !leagueIdOf(m)) return false;
    if (!INDIA.test(`${m.home?.name} ${m.away?.name}`)) return false;
    if (m.status?.state === 'in') return true;
    if (m.status?.state !== 'post') return false;
    const t = Date.parse(m.date) || 0;
    return now - t < 20 * 3600e3;
  });
}

// Milestones in one match's scorecard (pure, for tests).
export function milestonesIn(summary, match) {
  const out = [];
  const comp = summary?.header?.competitions?.[0] || {};
  const format = comp.class?.generalClassCard || '';
  // the match's own series name: a summary fetched through another league id carries that league's name
  const series = match.league?.name || summary?.header?.league?.name || '';
  const teams = (summary?.rosters || []).map((r) => r.team?.displayName || '');
  for (const r of summary?.rosters || []) {
    const team = r.team?.displayName || '';
    if (!INDIA.test(team)) continue;
    const opponent = teams.find((t) => t && t !== team) || '';
    for (const p of r.roster || []) {
      const name = p.athlete?.displayName || '';
      if (!name) continue;
      for (const inn of p.linescores || []) {
        for (const ls of inn.linescores || []) {
          const st = statsOf(ls);
          const runs = Number(st.runs) || 0;
          const mark = MARKS.find((m) => runs >= m);
          if (st.batted && mark) {
            const balls = Number(st.ballsFaced) || 0;
            out.push({
              key: `bat:${p.athlete.id}:${inn.period}:${mark}`,
              player: name,
              team,
              opponent,
              series,
              format,
              mark,
              runs,
              balls,
              fours: Number(st.fours) || 0,
              sixes: Number(st.sixes) || 0,
              notOut: !Number(st.outs),
              what: 'bat',
            });
          }
          const wkts = Number(st.wickets) || 0;
          if (wkts >= 5) out.push({ key: `bowl:${p.athlete.id}:${inn.period}:${wkts >= 7 ? 7 : 5}`, player: name, team, opponent, series, format, wickets: wkts, conceded: Number(st.conceded) || 0, overs: st.overs, what: 'bowl' });
        }
      }
    }
  }
  return out;
}

const markWord = (m) => (m >= 200 ? `double century` : m >= 150 ? '150' : 'century');
export function storyFrom(ms, match, firstSeen) {
  const vs = ms.opponent ? ` against ${ms.opponent}` : '';
  const where = [ms.series, ms.format].filter(Boolean).join(', ');
  let title;
  let summary;
  let headline;
  if (ms.what === 'bat') {
    const what = ms.runs >= 300 ? 'a triple century' : ms.mark >= 200 ? 'a double century' : ms.mark >= 150 ? `${ms.runs}` : 'a century';
    title = `${ms.player} hits ${what} for ${ms.team}${vs}`;
    summary = `${ms.player} ${ms.notOut ? 'is on' : 'made'} ${ms.runs}${ms.notOut ? ' not out' : ''}${ms.balls ? ` off ${ms.balls} balls` : ''}${ms.fours || ms.sixes ? ` (${ms.fours} fours, ${ms.sixes} sixes)` : ''} for ${ms.team}${vs}${where ? `, ${where}` : ''}.`;
    headline = ms.balls ? `${ms.runs} OFF ${ms.balls} BALLS.` : `${ms.runs}${ms.notOut ? '*' : ''}.`;
  } else {
    title = `${ms.player} takes ${ms.wickets} wickets for ${ms.team}${vs}`;
    summary = `${ms.player} took ${ms.wickets} for ${ms.conceded}${ms.overs ? ` in ${ms.overs} overs` : ''} for ${ms.team}${vs}${where ? `, ${where}` : ''}.`;
    headline = `${ms.wickets} FOR ${ms.conceded}.`;
  }
  return {
    kind: 'news',
    id: `live-${match.id}-${ms.key.replace(/:/g, '-')}`,
    title,
    summary,
    headline,
    sport: 'cricket',
    source: 'ESPNcricinfo scorecard',
    scorecard: true,
    link: match.link || '',
    published: new Date(firstSeen).toISOString(),
    tier: 'vimp',
    milestone: ms,
  };
}

// Stories for every milestone in the watched matches. A milestone's time is when this first
// saw it, so it stays fresh for the autopilot's age window however often it is read.
export function liveMilestones(matches, { now = Date.now(), fetchSummary } = {}) {
  return memoize('studio:live-milestones', 60_000, async () => {
    const get = fetchSummary || ((league, id) => fetchWithTimeout(SUMMARY(league, id), { timeout: 5000, retries: 0 }));
    const out = [];
    const list = watchedMatches(matches, now).slice(0, 8);
    const results = await Promise.allSettled(list.map((m) => get(leagueIdOf(m), m.id)));
    for (let i = 0; i < list.length; i++) {
      if (results[i].status !== 'fulfilled') continue;
      const m = list[i];
      for (const ms of milestonesIn(results[i].value, m)) {
        const seenKey = `ap:ms-seen:${m.id}:${ms.key}`;
        let first = await store.getNumber(seenKey).catch(() => 0);
        if (!first) {
          first = now;
          await store.setJSON(seenKey, now, 3 * 24 * 3600).catch(() => null);
        }
        // only the highest mark per innings: a 204 is one double-century story, not three
        const inn = ms.key.split(':').slice(0, 3).join(':');
        if (out.some((s) => s.milestone.key.startsWith(inn) && s.milestone.mark > (ms.mark || 0))) continue;
        for (let j = out.length - 1; j >= 0; j--) if (out[j].milestone.key.startsWith(inn) && (out[j].milestone.mark || 0) < (ms.mark || 0)) out.splice(j, 1);
        out.push(storyFrom(ms, m, first));
      }
    }
    return out;
  });
}
