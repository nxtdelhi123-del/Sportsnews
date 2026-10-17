// ESPN's scoreboard "header" feed lists every cricket series it currently covers.
// It is served by the same hosts as the rest of ESPN, which Vercel can reach, unlike
// ESPNcricinfo's own API.
import { fetchWithTimeout, memoize } from './http.js';

export const ESPN_CRICKET_URLS = [
  'https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=cricket&lang=en&region=in',
  'https://site.api.espn.com/apis/v2/scoreboard/header?sport=cricket&lang=en&region=in',
];

const STATE = { in: 'in', pre: 'pre', post: 'post' };

function side(c = {}) {
  return {
    id: String(c.id ?? c.uid ?? ''),
    name: c.displayName || c.name || c.shortDisplayName || 'TBD',
    short: c.shortDisplayName || c.abbreviation || c.displayName || '',
    abbr: c.abbreviation || '',
    logo: c.logo || c.logoDark || c.flag?.href || '',
    score: c.score && typeof c.score === 'object' ? c.score.displayValue || '' : c.score ?? '',
    winner: !!c.winner,
    record: '',
    linescores: [],
  };
}

export function normalizeEspnCricket(data) {
  const out = [];
  for (const sport of data?.sports || []) {
    for (const league of sport.leagues || []) {
      const seriesName = league.name || league.shortName || 'Cricket';
      for (const ev of league.events || []) {
        const comps = ev.competitors || ev.competitions?.[0]?.competitors || [];
        if (comps.length < 2) continue;
        const home = side(comps.find((c) => c.homeAway === 'home') || comps[0]);
        const away = side(comps.find((c) => c.homeAway === 'away') || comps.find((c) => c !== comps[0]) || comps[1]);
        const full = ev.fullStatus?.type || {};
        const state = STATE[ev.status] || STATE[full.state] || 'pre';
        const raw = ev.summary || full.detail || full.shortDetail || full.description || '';
        // The feed's own "LIVE" says nothing the state doesn't already.
        const detail = /^(live|in progress)$/i.test(raw.trim()) ? '' : raw;
        out.push({
          id: String(ev.id),
          source: 'espn',
          sport: 'cricket',
          kind: 'versus',
          league: { path: `cricket-espn/${league.id || league.slug || 'x'}`, name: seriesName, priority: 9600 },
          name: ev.name || `${home.name} vs ${away.name}`,
          shortName: ev.shortName || '',
          date: ev.date || '',
          status: { state, detail, short: detail, clock: '', completed: state === 'post' || !!full.completed },
          venue: { name: ev.location || ev.venue?.fullName || '', city: '', country: '' },
          note: ev.note || ev.seriesSummary || '',
          headline: '',
          broadcasts: [],
          link: ev.link || ev.links?.[0]?.href || '',
          home,
          away,
          events: [],
        });
      }
    }
  }
  return out;
}

export function fetchEspnCricket() {
  return memoize('espn:cricket', 4 * 60_000, async () => {
    let err;
    for (const url of ESPN_CRICKET_URLS) {
      try {
        return normalizeEspnCricket(await fetchWithTimeout(url, { timeout: 6000 }));
      } catch (e) {
        err = e;
      }
    }
    throw err;
  });
}
