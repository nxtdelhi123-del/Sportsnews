// Turns text the owner pasted into a story the Studio can draw: the newsroom's own
// "Copy details" text (match or headline), or any headline with a line or two under it.
import { classify } from '../rss.js';

const LABEL = /^\s*([A-Z][A-Z &/]{2,24}):\s*(.+)$/;
const clean = (s = '') => s.replace(/[━─═]{3,}/g, '').replace(/\s+/g, ' ').trim();
const strip = (s = '') => s.replace(/^[^\p{L}\p{N}"“(]+/u, '').trim();
const SCORE = /^(.{2,48}?)\s+(\d{1,3}(?:\/\d{1,2})?(?:\s*\([^)]{1,30}\))?)\s*[–—-]\s*(\d{1,3}(?:\/\d{1,2})?(?:\s*\([^)]{1,30}\))?)\s+(.{2,48}?)$/;
const VS = /^(.{2,40}?)\s+(?:vs?\.?|v)\s+(.{2,40}?)(?:\s*[|·,(].*)?$/i;
const EVENT = /^[•\-*·]?\s*(\d{1,3}(?:\+\d{1,2})?)'?\s*(?:min)?\s*(?:([A-Za-z ]{3,24}?)\s*[—–:-]\s*)?([^(—–:]{2,40}?)\s*\(([A-Z]{2,4})\)\s*$/;
const TEAM = /^(?:HOME|AWAY):\s*(.+?)\s*(?:\(([A-Z]{2,4})\))?\s*(?:[—–-]\s*(.+))?$/;

export function parsePasted(text = '') {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => clean(l))
    .filter((l) => l && !/^(🎨 PROMPT|Create a |LOGOS:|SOURCE:|LINK:|More:|TV|OFFICIALS|LINE-UPS|MATCH STATS|KEY MOMENTS|Key events)/i.test(l) && !/^\w+ \(\d-\d-\d\):/.test(l) && !/^(Possession|Shots)/i.test(l));
  const labels = {};
  const free = [];
  for (const l of lines) {
    const m = l.match(LABEL);
    if (m) labels[m[1].replace(/\s+/g, ' ')] = m[2].trim();
    else free.push(strip(l));
  }
  const get = (...keys) => keys.map((k) => labels[k]).find(Boolean) || '';
  const image = (text.match(/https?:\/\/\S+\.(?:jpe?g|png|webp)(?:\?\S*)?/i) || [])[0] || '';
  const sportLabel = get('SPORT').replace(/[^\p{L} ]/gu, '').trim();
  // ---- a match: HOME/AWAY lines, or a scoreline, or "A vs B".
  let home = null;
  let away = null;
  for (const l of lines) {
    const m = l.match(TEAM);
    if (m && /^HOME/.test(l)) home = { name: m[1], abbr: m[2] || '', score: (m[3] || '').trim() };
    if (m && /^AWAY/.test(l)) away = { name: m[1], abbr: m[2] || '', score: (m[3] || '').trim() };
  }
  if (!home) {
    for (const l of free) {
      const m = l.match(SCORE);
      if (m && !/\d{4}/.test(l) && !/[.!?]$/.test(l)) {
        home = { name: m[1].trim(), score: m[2].trim() };
        away = { name: m[4].trim(), score: m[3].trim() };
        break;
      }
      const v = l.match(VS);
      if (v && l.split(' ').length <= 5) {
        home = { name: v[1].trim(), score: '' };
        away = { name: v[2].trim(), score: '' };
        break;
      }
    }
  }
  const title = get('HEADLINE', 'TITLE', 'Summary', 'SUMMARY') || free[0] || '';
  const body = free.filter((l) => l !== title && !/^(Status|Importance|Date|Venue|RESULT|STATUS|IMPORTANCE|DATE & TIME|VENUE):/i.test(l));
  const competition = get('COMPETITION', 'LEAGUE') || (free[0] && home && !SCORE.test(free[0]) && !VS.test(free[0]) ? free[0] : '');
  const events = lines
    .map((l) => l.match(EVENT))
    .filter(Boolean)
    .slice(0, 10)
    .map((m) => ({ minute: `${m[1]}'`, type: (m[2] || 'Goal').trim(), player: m[3].trim(), team: m[4] }));
  const sport = (sportLabel && classify(sportLabel)) !== 'other' && sportLabel ? classify(sportLabel) : classify(`${title} ${competition} ${body.join(' ')}`);
  if (home && away) {
    const status = /full time|\bFT\b|RESULT:|beat|won by/i.test(text) || (home.score && away.score) ? 'post' : /live|in progress|'$/i.test(get('STATUS', 'Status')) ? 'in' : 'pre';
    const venue = get('VENUE', 'Venue').replace(/\s*\(capacity.*$/i, '').replace(/\s*·.*$/, '');
    return {
      kind: 'match',
      id: 'pasted',
      sport,
      league: { path: 'pasted', name: competition || (sport === 'soccer' ? 'Football' : sport) },
      name: `${away.name} at ${home.name}`,
      home: { ...home, abbr: home.abbr || home.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() },
      away: { ...away, abbr: away.abbr || away.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() },
      status: { state: status, detail: get('STATUS', 'Status') || (status === 'post' ? 'FT' : ''), completed: status === 'post' },
      venue: venue ? { name: venue.split(',')[0].trim(), city: (venue.split(',')[1] || '').trim() } : undefined,
      events,
      date: Date.parse(get('DATE & TIME', 'Date').split('|')[0]) ? new Date(Date.parse(get('DATE & TIME', 'Date').split('|')[0])).toISOString() : undefined,
      title: get('HEADLINE'),
      summary: get('RECAP', 'SUMMARY'),
      tier: 'vimp',
      tierReason: 'pasted',
      image,
      source: 'pasted',
    };
  }
  if (!title) return null;
  return {
    kind: 'news',
    id: 'pasted',
    title: title.replace(/[.]+$/, '').slice(0, 200),
    summary: (get('SUMMARY', 'RECAP') || body.join(' ')).replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 600),
    sport,
    source: get('SOURCE').split(' · ')[0] || 'pasted',
    published: new Date().toISOString(),
    tier: 'vimp',
    tierReason: 'pasted',
    image,
    link: (text.match(/https?:\/\/\S+/) || [])[0] || '',
  };
}

// A story object sent back by the desk: only known fields, only strings, bounded.
import { SPORTS } from '../../public/js/format.js';
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const url = (v) => (typeof v === 'string' && /^https?:\/\/\S{4,600}$/.test(v) ? v : '');
const team = (t) => (t && typeof t === 'object' && str(t.name, 48) ? { name: str(t.name, 48), abbr: str(t.abbr, 4).toUpperCase(), score: str(t.score, 24), winner: !!t.winner } : null);
export function cleanStory(s) {
  if (!s || typeof s !== 'object') return null;
  const sport = SPORTS[s.sport] ? s.sport : 'other';
  if (s.kind === 'match') {
    const home = team(s.home);
    const away = team(s.away);
    if (!home || !away) return null;
    const state = ['pre', 'in', 'post'].includes(s.status?.state) ? s.status.state : 'post';
    const date = Date.parse(s.date) ? new Date(Date.parse(s.date)).toISOString() : undefined;
    return {
      kind: 'match', id: 'pasted', sport, league: { path: 'pasted', name: str(s.league?.name, 60) || 'Match' }, name: `${away.name} at ${home.name}`, home, away,
      status: { state, detail: str(s.status?.detail, 40), completed: state === 'post' },
      venue: s.venue && str(s.venue.name, 60) ? { name: str(s.venue.name, 60), city: str(s.venue.city, 40) } : undefined,
      events: (Array.isArray(s.events) ? s.events : []).slice(0, 10).map((e) => ({ minute: str(e?.minute, 8), type: str(e?.type, 24) || 'Goal', player: str(e?.player, 48), team: str(e?.team, 4).toUpperCase() })).filter((e) => e.player),
      date, title: str(s.title, 200), summary: str(s.summary, 600), tier: 'vimp', tierReason: 'pasted', image: url(s.image), source: 'pasted',
    };
  }
  const title = str(s.title, 200);
  if (!title) return null;
  return { kind: 'news', id: 'pasted', title, summary: str(s.summary, 600), sport, source: str(s.source, 60) || 'pasted', published: Date.parse(s.published) ? new Date(Date.parse(s.published)).toISOString() : new Date().toISOString(), tier: 'vimp', tierReason: 'pasted', image: url(s.image), link: url(s.link) };
}
