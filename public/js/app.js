import { copyOrShow } from './copy.js';
import { SPORTS, FORMATS, NEWS_ONLY, TIER_LABELS, sportOf, statusLabel, formatMatch, newsPoster, apiUrl } from './format.js';

const REFRESH_MS = 10 * 60_000;
const SITE = location.origin;
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const CHUNK = 60; // cards rendered per scroll step

const $ = (sel) => document.querySelector(sel);
const state = {
  datasets: new Map(), // sport → { matches, updatedAt, nextUpdateAt, sources, live }
  loading: new Set(),
  news: [],
  sport: store('sport') || 'all',
  status: 'all',
  tier: store('tier') || 'all',
  query: '',
  format: store('fmt2') || 'poster',
  updatedAt: null,
  nextAt: null,
  byKey: new Map(),
  details: new Map(), // key → { at, promise }
};
if (!SPORTS[state.sport] && state.sport !== 'all') state.sport = 'all';

function store(k, v) {
  try {
    if (v === undefined) return localStorage.getItem(`sn:${k}`);
    localStorage.setItem(`sn:${k}`, v);
  } catch {
    return null;
  }
}

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
const keyOf = (m) => `${m.league.path}:${m.id}`;
const groupName = (m) => (m.league.country ? `${m.league.country} · ${m.league.name}` : m.league.name);

function timeAgo(iso) {
  const t = Date.parse(iso);
  if (!t) return '';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const localTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date().toDateString() === d.toDateString();
  return d.toLocaleString(undefined, today ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// ---------- data ----------
async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

const current = () => state.datasets.get(state.sport);
const stale = (ds) => !ds || Date.now() > Date.parse(ds.nextUpdateAt || 0) + 5000;

async function loadSport(sport, { bust = false, quiet = false } = {}) {
  if (state.loading.has(sport)) return;
  state.loading.add(sport);
  if (!quiet && sport === state.sport) renderMatches();
  try {
    const q = new URLSearchParams(sport === 'all' ? {} : { sport });
    if (bust) q.set('t', Date.now());
    const data = await getJSON(`/api/scores${q.size ? '?' + q : ''}`);
    state.datasets.set(sport, data);
  } catch {
    if (!state.datasets.has(sport) && sport === state.sport) $('#matches').innerHTML = `<div class="empty">Couldn't load ${sport === 'all' ? 'scores' : sportOf(sport).label + ' scores'} right now. Retrying soon…</div>`;
  } finally {
    state.loading.delete(sport);
  }
  if (sport === state.sport || sport === 'all') render();
  if (location.hash.startsWith('#m=')) openFromHash();
}

// The newest 300 headlines load first (a small download); a sport's full list is added
// the first time that sport is opened.
const NEWS_FIRST = 300;
function mergeNewsItems(items) {
  const seen = new Set(state.news.map((n) => n.id));
  const add = items.filter((n) => !seen.has(n.id));
  if (add.length) state.news = [...state.news, ...add].sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0));
}

async function loadNews(bust) {
  try {
    const q = new URLSearchParams({ limit: NEWS_FIRST });
    if (bust) q.set('t', Date.now());
    const data = await getJSON(`/api/news?${q}`);
    state.news = data.items || [];
    state.newsSports = new Set();
    state.newsSources = data.sources;
    state.newsAt = data.updatedAt;
  } catch {
    if (!state.news.length) $('#news').innerHTML = `<div class="empty">Couldn't load headlines right now.</div>`;
  }
  if (state.sport !== 'all') loadSportNews(state.sport);
  renderNews();
  renderTicker();
  renderStatus();
}

async function loadSportNews(sport) {
  state.newsSports ||= new Set();
  if (sport === 'all' || state.newsSports.has(sport)) return;
  state.newsSports.add(sport);
  try {
    const data = await getJSON(`/api/news?sport=${encodeURIComponent(sport)}&limit=200`);
    mergeNewsItems(data.items || []);
    if (state.sport === sport) renderNews();
  } catch {
    state.newsSports.delete(sport);
  }
}

async function load({ bust = false } = {}) {
  $('#refreshBtn').disabled = true;
  const jobs = [loadSport('all', { bust, quiet: state.sport !== 'all' }), loadNews(bust)];
  if (state.sport !== 'all' && !NEWS_ONLY.has(state.sport)) jobs.push(loadSport(state.sport, { bust, quiet: true }));
  await Promise.allSettled(jobs);
  $('#refreshBtn').disabled = false;
  state.details.clear();
  schedule();
}

// While anything is live, scores refresh every minute (the server rebuilds them as often);
// a score that changes flashes.
const LIVE_MS = 60_000;
let liveTimer;
function scheduleLive() {
  clearTimeout(liveTimer);
  const anyLive = [...state.datasets.values()].some((d) => Object.values(d?.live || {}).some((n) => n > 0));
  if (!anyLive) return;
  liveTimer = setTimeout(async () => {
    if (document.visibilityState === 'visible') {
      const before = new Map([...state.byKey.values()].map((m) => [keyOf(m), scoreSig(m)]));
      const jobs = [loadSport('all', { quiet: true })];
      if (state.sport !== 'all' && !NEWS_ONLY.has(state.sport)) jobs.push(loadSport(state.sport, { quiet: true }));
      await Promise.allSettled(jobs);
      flashChanged(before);
    }
    scheduleLive();
  }, LIVE_MS);
}
const scoreSig = (m) => `${m.home?.score ?? ''}-${m.away?.score ?? ''}-${m.status?.short || ''}`;
function flashChanged(before) {
  for (const m of state.byKey.values()) {
    const k = keyOf(m);
    const was = before.get(k);
    if (was && was.split('-').slice(0, 2).join('-') !== scoreSig(m).split('-').slice(0, 2).join('-')) {
      document.querySelectorAll(`[data-key="${CSS.escape(k)}"]`).forEach((el) => {
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
      });
    }
  }
}

// Refresh on every 10-minute mark, a few seconds after the server rebuilds.
let timer;
function schedule() {
  scheduleLive();
  clearTimeout(timer);
  const next = Math.floor(Date.now() / REFRESH_MS) * REFRESH_MS + REFRESH_MS + 8000;
  state.nextAt = new Date(next).toISOString();
  timer = setTimeout(() => load(), next - Date.now());
}

setInterval(tickClock, 1000);
function tickClock() {
  const ds = current() || state.datasets.get('all');
  const at = ds?.updatedAt || state.newsAt;
  if (at) $('#updated').textContent = `Updated ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (state.nextAt) {
    const s = Math.max(0, Math.round((Date.parse(state.nextAt) - Date.now()) / 1000));
    $('#countdown').textContent = `next in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.nextAt && Date.now() > Date.parse(state.nextAt)) load();
});

// ---------- rendering ----------
function render() {
  renderChips();
  renderRail();
  renderMatches();
  renderNews();
  renderTicker();
  renderStatus();
  tickClock();
}

function renderChips() {
  const live = state.datasets.get('all')?.live || {};
  const newsCount = {};
  for (const n of state.news) newsCount[n.sport] = (newsCount[n.sport] || 0) + 1;
  const totalLive = Object.values(live).reduce((a, b) => a + b, 0);
  const chip = (k, emoji, label, liveN) =>
    `<button class="chip${state.sport === k ? ' active' : ''}" data-sport="${k}"><span>${emoji}</span>${esc(label)}${liveN ? `<small class="live-n" title="${liveN} live">${liveN}</small>` : ''}</button>`;
  $('#sportChips').innerHTML =
    chip('all', '🌍', 'All sports', totalLive) +
    Object.entries(SPORTS)
      .filter(([k]) => !NEWS_ONLY.has(k) || newsCount[k] || live[k])
      .map(([k, v]) => chip(k, v.emoji, v.label, live[k]))
      .join('') +
    (totalLive ? `<span class="live-pill"><i></i>${totalLive} live now</span>` : '');
}

const TIER_RANK = { vimp: 3, imp: 2, low: 1 };

// "Live now" across the top: the biggest live matches, or the next big kick-offs when
// nothing is live. Tapping one opens its match centre.
function railMatches() {
  const ds = current() || state.datasets.get('all');
  if (!ds) return { live: false, list: [] };
  const pool = ds.matches.filter((m) => m.kind === 'versus' && (state.sport === 'all' || m.sport === state.sport));
  const rank = (m) => (TIER_RANK[m.tier] || 0) * 100000 + (m.league?.priority || 0);
  let live = pool.filter((m) => m.status.state === 'in').sort((a, b) => rank(b) - rank(a));
  // minor competitions only fill in when there are few big ones
  const big = live.filter((m) => m.tier !== 'low');
  if (big.length >= 6) live = big;
  if (live.length) return { live: true, list: live.slice(0, 18) };
  const soon = pool.filter((m) => m.status.state === 'pre' && Date.parse(m.date) - Date.now() < 18 * 3600_000).sort((a, b) => (TIER_RANK[b.tier] || 0) - (TIER_RANK[a.tier] || 0) || Date.parse(a.date) - Date.parse(b.date));
  return { live: false, list: soon.slice(0, 18) };
}

const crest = (t = {}, size = 28) =>
  safeUrl(t.logo)
    ? `<img src="${esc(t.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" width="${size}" height="${size}" onerror="this.style.visibility='hidden'">`
    : `<span class="badge" style="width:${size}px;height:${size}px">${esc((t.abbr || t.name || '?').slice(0, 3).toUpperCase())}</span>`;

function renderRail() {
  const box = $('#liveRail');
  if (!box) return;
  const { live, list } = railMatches();
  if (!list.length || NEWS_ONLY.has(state.sport)) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const tile = (m) => {
    const st = m.status.state;
    const sc = (t) => (st === 'pre' ? '' : esc(t.score ?? ''));
    return `<button class="rail-tile state-${st}" data-key="${esc(keyOf(m))}" data-open="1" title="${esc(m.name)}">
      <span class="rail-league">${sportOf(m.sport).emoji} ${esc(m.league.name)}</span>
      ${[m.home, m.away].map((t) => `<span class="rail-team${String(t.score ?? '').length > 5 ? ' long' : ''}">${crest(t, 22)}<b>${esc(t.abbr || t.short || t.name)}</b><em>${sc(t)}</em></span>`).join('')}
      <span class="rail-status ${st}">${st === 'in' ? '<i></i>' : ''}${esc(st === 'pre' ? localTime(m.date) : statusLabel(m))}</span>
    </button>`;
  };
  box.innerHTML = `<div class="rail-head">${live ? '<i class="dot-live"></i>Live now' : 'Up next'}</div><div class="rail-track">${list.map(tile).join('')}</div>`;
}
const tierOk = (t) => state.tier === 'all' || (state.tier === 'vimp' ? t === 'vimp' : t === 'vimp' || t === 'imp');
const tierBadge = (t) => (t ? `<span class="tier tier-${t}" title="${esc(TIER_LABELS[t])}">${t === 'low' ? 'NOT IMP' : esc(TIER_LABELS[t])}</span>` : '');

function visibleMatches() {
  const ds = current();
  if (!ds) return [];
  const q = state.query.toLowerCase();
  return ds.matches.filter((m) => {
    if (state.sport !== 'all' && m.sport !== state.sport) return false;
    if (state.status !== 'all' && m.status.state !== state.status) return false;
    if (!tierOk(m.tier)) return false;
    if (!q) return true;
    const hay = [m.name, m.league.name, m.league.country, m.note, m.home?.name, m.away?.name, m.venue?.name, m.venue?.city, m.venue?.country, ...(m.leaders || []).map((l) => l.name)].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

function teamRow(t = {}, m) {
  const logo = safeUrl(t.logo)
    ? `<img src="${esc(t.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" width="26" height="26" onerror="this.style.visibility='hidden'">`
    : `<span class="badge">${esc((t.abbr || t.name || '?').slice(0, 3).toUpperCase())}</span>`;
  const score = t.score !== '' && t.score != null ? t.score : (t.linescores || []).join(' ');
  const showScore = m.status.state !== 'pre' && score !== '';
  const sets = t.linescores?.length && t.score !== undefined && t.score !== '' ? `<small class="sets">${esc(t.linescores.join(' '))}</small>` : '';
  const long = showScore && String(score).length > 8;
  return `<div class="team${t.winner ? ' winner' : ''}${long ? ' long' : ''}">${logo}<span class="tname">${esc(t.name || 'TBD')}${t.record ? ` <small>${esc(t.record)}</small>` : ''}</span><span class="tscore">${sets}${showScore ? esc(score) : ''}</span></div>`;
}

function matchCard(m) {
  const sp = sportOf(m.sport);
  const st = m.status.state;
  const body =
    m.kind === 'field'
      ? `<div class="field-name">${esc(m.name)}</div><ol class="leaders">${(m.leaders || []).slice(0, 5).map((l) => `<li><span>${esc(l.position)}</span>${esc(l.name)}<b>${esc(l.score)}</b></li>`).join('')}</ol>`
      : teamRow(m.home, m) + teamRow(m.away, m);
  const events = (m.events || []).filter((e) => /goal|red/i.test(e.type)).slice(0, 6);
  const venue = [m.venue?.name, m.venue?.city].filter(Boolean).join(', ');
  const accent = m.kind === 'versus' ? ` style="--home:${esc(m.home?.color || 'transparent')};--away:${esc(m.away?.color || 'transparent')}"` : '';
  return `<article class="card state-${st}" data-key="${esc(keyOf(m))}"${accent}>
    <header class="card-head">
      <span class="league">${tierBadge(m.tier)}${sp.emoji} ${esc(groupName(m))}</span>
      <span class="status ${st}">${st === 'in' ? '<i></i>' : ''}${esc(statusLabel(m))}</span>
    </header>
    ${m.note ? `<div class="note">${esc(m.note)}</div>` : ''}
    <div class="card-body" data-open="1" role="button" tabindex="0" title="Open the match centre">${body}</div>
    ${events.length ? `<ul class="events">${events.map((e) => `<li>${esc(e.minute)} ${/red/i.test(e.type) ? '🟥' : '⚽'} ${esc(e.player)}${e.team ? ` <small>${esc(e.team)}</small>` : ''}</li>`).join('')}</ul>` : ''}
    <div class="meta">
      <span title="${esc(m.date)}">🕒 ${esc(localTime(m.date))}</span>
      ${venue ? `<span>📍 ${esc(venue)}</span>` : ''}
      ${m.broadcasts?.length ? `<span>📺 ${esc(m.broadcasts.slice(0, 2).join(', '))}</span>` : ''}
    </div>
    <footer class="card-actions">
      <button class="btn small copy-btn" data-act="copy" title="Copy all match details">⧉ Copy details</button>
      <a class="btn small ghost" href="/studio?brand=tsb&key=${esc(encodeURIComponent(`match:${m.league?.path || 'x'}:${m.id}`))}" title="Make the Instagram post in the Studio">🎨 Post</a>
      <button class="btn small ghost" data-act="code" title="Preview and pick a format">&lt;/&gt; Formats</button>
      ${safeUrl(m.link) ? `<a class="btn small ghost" href="${esc(m.link)}" target="_blank" rel="noopener" title="Match centre">↗</a>` : ''}
    </footer>
  </article>`;
}

// Groups ordered: live first, then most important competitions, then by name.
function groupMatches(list) {
  const groups = new Map();
  for (const m of list) {
    const k = `${m.sport}|${groupName(m)}`;
    let g = groups.get(k);
    if (!g) groups.set(k, (g = { name: groupName(m), sport: m.sport, priority: m.league.priority || 0, live: 0, rank: 0, matches: [] }));
    g.matches.push(m);
    g.rank = Math.max(g.rank, TIER_RANK[m.tier] || 0);
    if (m.status.state === 'in') g.live++;
  }
  return [...groups.values()].sort((a, b) => Number(b.live > 0) - Number(a.live > 0) || b.rank - a.rank || b.priority - a.priority || a.name.localeCompare(b.name));
}

let renderQueue = [];
let observer;
function renderMatches() {
  const ds = current();
  const box = $('#matches');
  observer?.disconnect();
  if (NEWS_ONLY.has(state.sport)) {
    $('#matchCount').textContent = '';
    $('#scoresHint').textContent = '';
    box.innerHTML = `<div class="empty">${sportOf(state.sport).emoji} Live scores for ${esc(sportOf(state.sport).label)} aren't available from our sources yet.<br>All the latest ${esc(sportOf(state.sport).label)} headlines are in the <b>Headlines</b> panel, each with a Copy button.</div>`;
    return;
  }
  if (!ds) {
    box.innerHTML = state.loading.has(state.sport)
      ? `<div class="loading-note">Loading every ${state.sport === 'all' ? '' : esc(sportOf(state.sport).label) + ' '}match worldwide…</div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`
      : '';
    if (!state.loading.has(state.sport)) loadSport(state.sport);
    $('#matchCount').textContent = '';
    return;
  }
  const list = visibleMatches();
  state.byKey = new Map(ds.matches.map((m) => [keyOf(m), m]));
  const liveN = list.filter((m) => m.status.state === 'in').length;
  const vimpN = list.filter((m) => m.tier === 'vimp').length;
  $('#matchCount').textContent = list.length ? `(${list.length.toLocaleString()}${liveN ? ` · ${liveN} live` : ''}${vimpN ? ` · ${vimpN} VIMP` : ''})` : '';
  $('#scoresHint').innerHTML =
    state.sport === 'all'
      ? 'Showing the <b>top competitions worldwide</b>: yesterday, today and tomorrow. Pick a sport for its full list.'
      : `${esc(sportOf(state.sport).label)} worldwide · yesterday, today and tomorrow.`;
  if (!list.length) {
    box.innerHTML = `<div class="empty">${ds.matches.length ? 'No matches for this filter.' : `No ${state.sport === 'all' ? '' : esc(sportOf(state.sport).label) + ' '}matches right now — check the headlines.`}</div>`;
    return;
  }
  renderQueue = groupMatches(list);
  box.innerHTML = '';
  appendChunk();
}

function appendChunk() {
  const box = $('#matches');
  box.querySelector('.sentinel')?.remove();
  let cards = 0;
  const html = [];
  while (renderQueue.length && cards < CHUNK) {
    const g = renderQueue.shift();
    cards += g.matches.length;
    html.push(
      `<section class="league-group"><h3>${sportOf(g.sport).emoji} ${esc(g.name)} <small>${g.matches.length}</small>${g.live ? `<span class="glive">${g.live} live</span>` : ''}</h3><div class="grid">${g.matches.map(matchCard).join('')}</div></section>`,
    );
  }
  box.insertAdjacentHTML('beforeend', html.join(''));
  if (renderQueue.length) {
    box.insertAdjacentHTML('beforeend', '<div class="sentinel">Loading more…</div>');
    observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && appendChunk(), { rootMargin: '800px' });
    observer.observe(box.querySelector('.sentinel'));
  }
}

function visibleNews() {
  const q = state.query.toLowerCase();
  return state.news.filter((n) => (state.sport === 'all' || n.sport === state.sport) && tierOk(n.tier) && (!q || `${n.title} ${n.summary}`.toLowerCase().includes(q))).slice(0, 200);
}

function renderNews() {
  const list = visibleNews();
  $('#newsCount').textContent = list.length ? `(${list.length})` : '';
  state.newsVisible = list;
  if (!list.length) {
    $('#news').innerHTML = state.news.length ? `<div class="empty">No headlines for this filter.</div>` : '<div class="skeleton"></div><div class="skeleton"></div>';
    return;
  }
  const lead = list.findIndex((n) => safeUrl(n.image) && n.tier !== 'low');
  $('#news').innerHTML = list
    .map(
      (n, i) => `<article class="news-item${i === lead ? ' lead' : ''}">
      ${safeUrl(n.image) ? `<img src="${esc(n.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      <div>
        <a href="${esc(safeUrl(n.link))}" target="_blank" rel="noopener" class="news-title">${esc(n.title)}</a>
        <div class="news-meta">${tierBadge(n.tier)}${sportOf(n.sport).emoji} ${esc(n.source)} · ${esc(timeAgo(n.published))}
          <button class="link-btn" data-copy-news="${i}" title="Copy the details and a Sports Binge AI prompt">⧉ Copy</button>
          ${n.sport === 'soccer' ? `<button class="link-btn" data-copy-news="${i}" data-brand="musc" title="Copy the details and a MUSC AI prompt">⧉ MUSC</button>` : ''}
          <a class="link-btn" href="/studio?brand=tsb&key=${esc(encodeURIComponent(`news:${n.id}`))}" title="Make the Instagram post in the Studio">🎨 Post</a></div>
      </div>
    </article>`,
    )
    .join('');
}

function renderTicker() {
  const top = [...state.news].sort((a, b) => (TIER_RANK[b.tier] || 0) - (TIER_RANK[a.tier] || 0)).slice(0, 20);
  const html = top.map((n) => `<a href="${esc(safeUrl(n.link))}" target="_blank" rel="noopener">${sportOf(n.sport).emoji} ${esc(n.title)}</a>`).join('<span class="dot">•</span>');
  $('#ticker').innerHTML = html + (html ? '<span class="dot">•</span>' + html : '');
}

const FAMILY_NAMES = { espn: 'ESPN', cricinfo: 'Cricinfo', sofascore: 'Sofascore', sportsdb: 'TheSportsDB' };

function renderStatus() {
  const ds = current() || state.datasets.get('all');
  const s = ds?.sources;
  const n = state.newsSources;
  const parts = [];
  if (s?.families) {
    const fams = Object.entries(s.families);
    parts.push(fams.filter(([, f]) => f.matches).map(([k, f]) => `${FAMILY_NAMES[k] || k} ${f.matches}`).join(' · '));
    const blocked = fams.filter(([, f]) => f.attempted && !f.ok).map(([k]) => FAMILY_NAMES[k] || k);
    if (blocked.length) parts.push(`${blocked.join(', ')} blocked`);
  } else if (s) parts.push(`${s.ok} score sources online${s.failed?.length ? `, ${s.failed.length} unavailable` : ''}`);
  if (n) parts.push(`${n.ok} news feeds${n.failed?.length ? `, ${n.failed.length} unavailable` : ''}`);
  if (ds?.partial) parts.push('some sources still loading');
  parts.push(`Times in ${TZ}`);
  $('#sourceStatus').innerHTML = `${esc(parts.join(' · '))} · <a href="/debug">source check</a>`;

  // Warn when the big providers are down so a short list is never a mystery.
  const banner = $('#sourceBanner');
  const dead = s?.families ? Object.entries(s.families).filter(([, f]) => f.attempted && f.failed && !f.ok).map(([k]) => FAMILY_NAMES[k] || k) : [];
  if (dead.length && (ds?.count || 0) < 60) {
    banner.hidden = false;
    banner.innerHTML = `⚠️ ${esc(dead.join(' and '))} ${dead.length > 1 ? 'are' : 'is'} not reachable from the server right now, so the list is short. <a href="/debug">Run the source check</a>.`;
  } else banner.hidden = true;
}

// ---------- copy ----------
// Clipboard writes must start inside the tap (public/js/copy.js); when a browser refuses,
// the text opens in a sheet so it can still be copied.
const writeClipboard = (textOrPromise, title) => copyOrShow(textOrPromise, title);

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

const fmtOpts = () => ({ siteUrl: SITE, timeZone: TZ });
const fmtLabel = (id) => FORMATS.find((f) => f.id === id)?.label || id;

// Full details (scorers, stats, line-ups, venue, officials…) from /api/match, cached 2 min.
function detailed(m) {
  const k = keyOf(m);
  const hit = state.details.get(k);
  if (hit && Date.now() - hit.at < 120_000) return hit.promise;
  const promise = getJSON(apiUrl(m, '', 'json'))
    .then((full) => ({ ...m, ...full, league: { ...m.league, ...full.league }, details: full.details }))
    .catch(() => m);
  state.details.set(k, { at: Date.now(), promise });
  return promise;
}

async function copyMatch(m, btn) {
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Copying…';
  const fmt = state.format;
  const text = detailed(m).then((full) => formatMatch(full, fmt, fmtOpts()));
  const ok = await writeClipboard(text);
  btn.disabled = false;
  btn.innerHTML = ok ? '✓ Copied' : label;
  btn.classList.toggle('done', ok);
  setTimeout(() => {
    btn.innerHTML = label;
    btn.classList.remove('done');
  }, 1800);
  toast(ok ? `Copied ${fmtLabel(fmt)} — paste it into your AI` : 'Your browser blocked copying — tap Copy in the box');
}

let dialogMatch = null;
let dialogFormat = state.format;
async function openCodes(m) {
  dialogMatch = m;
  dialogFormat = state.format;
  renderDialog();
  $('#codeDialog').showModal();
  const full = await detailed(m);
  if (dialogMatch === m) {
    dialogMatch = full;
    renderDialog();
  }
}

function renderDialog() {
  $('#dialogTitle').textContent = dialogMatch.name || 'Match details';
  $('#formatTabs').innerHTML = FORMATS.map((f) => `<button role="tab" data-fmt="${f.id}" class="${f.id === dialogFormat ? 'active' : ''}">${f.label}</button>`).join('');
  $('#codeBox').textContent = formatMatch(dialogMatch, dialogFormat, fmtOpts());
  const hints = {
    poster: 'Everything about the match plus a ready-made prompt. Paste into ChatGPT, Gemini, Canva, Midjourney or any video AI.',
    text: 'Short summary for WhatsApp, Telegram, X or email.',
    markdown: 'Paste into Discord, Reddit, GitHub or Notion.',
    json: 'Structured data for apps and spreadsheets.',
    embed: 'Live-updating widget for any website or blog.',
    api: 'Always-fresh JSON. Add &format=poster, text or markdown.',
  };
  $('#dialogHint').textContent = hints[dialogFormat] || '';
}

// ---------- match centre ----------
// Tap a match: a big scoreboard with the timeline, team stats, line-ups and venue, plus
// the copy / post actions. The address bar carries #m=<key>, so a match can be shared.
function findMatch(k) {
  if (state.byKey.has(k)) return state.byKey.get(k);
  for (const ds of state.datasets.values()) {
    const m = ds?.matches?.find((x) => keyOf(x) === k);
    if (m) return m;
  }
  return null;
}

let centreMatch = null;
let centreTab = 'timeline';
async function openCentre(m) {
  centreMatch = m;
  centreTab = 'timeline';
  renderCentre(m, true);
  const dlg = $('#matchDialog');
  if (!dlg.open) dlg.showModal();
  history.replaceState(null, '', `#m=${encodeURIComponent(keyOf(m))}`);
  const full = await detailed(m);
  if (centreMatch === m) {
    centreMatch = full;
    renderCentre(full, false);
  }
}

const EVENT_ICON = (t = '') => (/own goal/i.test(t) ? '⚽︎' : /penalty.*(miss|saved)/i.test(t) ? '❌' : /goal|penalty/i.test(t) ? '⚽' : /red/i.test(t) ? '🟥' : /yellow/i.test(t) ? '🟨' : /sub/i.test(t) ? '🔁' : '•');
const pct = (h, a) => {
  const n = (v) => Number.parseFloat(String(v).replace('%', '')) || 0;
  const x = n(h);
  const y = n(a);
  return x + y > 0 ? Math.round((x / (x + y)) * 100) : 50;
};

function renderCentre(m, loading) {
  const st = m.status.state;
  const d = m.details || {};
  const versus = m.kind === 'versus';
  const side = (t, which) => `<div class="mc-team ${which}${t.winner ? ' winner' : ''}">${crest(t, 64)}<b>${esc(t.name || 'TBD')}</b>${t.record ? `<small>${esc(t.record)}</small>` : ''}</div>`;
  const score = (t) => (st === 'pre' ? '' : esc(t.score ?? ''));
  // Cricket-style scores ("434/9d & 42/1 (14.1 ov)") get a stacked board: one team per row.
  const long = versus && [m.home, m.away].some((t) => String(t.score ?? '').length > 5);
  const row = (t) => `<div class="mc-row${t.winner ? ' winner' : ''}">${crest(t, 40)}<b>${esc(t.name || 'TBD')}</b><span>${score(t)}</span></div>`;
  const head = !versus
    ? `<div class="mc-field"><b>${esc(m.name)}</b></div>`
    : long
      ? `<div class="mc-stack">${row(m.home)}${row(m.away)}</div>`
      : `<div class="mc-board">${side(m.home, 'home')}<div class="mc-score"><span>${score(m.home)}</span><i>${st === 'pre' ? 'vs' : '–'}</i><span>${score(m.away)}</span></div>${side(m.away, 'away')}</div>`;
  const events = (m.events || []).filter((e) => e.type);
  const tabs = [
    ['timeline', 'Timeline', versus ? events.length : (m.leaders || []).length],
    ['stats', 'Stats', d.stats?.length],
    ['lineups', 'Line-ups', (d.lineups || []).some((l) => l.starters?.length)],
    ['info', 'Info', 1],
  ].filter(([, , n]) => n);
  if (!tabs.some(([k]) => k === centreTab)) centreTab = tabs[0]?.[0] || 'info';
  let body = '';
  if (centreTab === 'timeline') {
    body = versus
      ? `<ol class="mc-timeline">${events
          .map((e) => {
            const home = e.team && [m.home.name, m.home.abbr, m.home.short].some((x) => x && String(x).toLowerCase() === String(e.team).toLowerCase());
            return `<li class="${home ? 'h' : 'a'}"><span class="min">${esc(e.minute)}</span><span class="ev">${EVENT_ICON(e.type)} <b>${esc(e.player || e.type)}</b>${e.player ? ` <small>${esc(e.type)}</small>` : ''}</span></li>`;
          })
          .join('')}</ol>`
      : `<ol class="leaders mc-leaders">${(m.leaders || []).map((l) => `<li><span>${esc(l.position)}</span>${esc(l.name)}<b>${esc(l.score)}</b></li>`).join('')}</ol>`;
  } else if (centreTab === 'stats') {
    body = `<div class="mc-stats">${d.stats
      .map((r) => {
        const p = pct(r.home, r.away);
        return `<div class="stat"><div class="stat-row"><b>${esc(r.home)}</b><span>${esc(r.label)}</span><b>${esc(r.away)}</b></div><div class="bar"><i style="width:${p}%"></i><i style="width:${100 - p}%"></i></div></div>`;
      })
      .join('')}</div>`;
  } else if (centreTab === 'lineups') {
    body = `<div class="mc-lineups">${d.lineups.map((l) => `<div><h4>${esc(l.team)} ${l.formation ? `<small>${esc(l.formation)}</small>` : ''}</h4><ol>${(l.starters || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div>`).join('')}</div>`;
  } else {
    const rows = [
      ['Competition', m.league.name],
      ['Round', m.note],
      ['Kick-off', `${localTime(m.date)}`],
      ['Venue', [m.venue?.name, m.venue?.city, m.venue?.country].filter(Boolean).join(', ')],
      ['Capacity', d.capacity ? Number(d.capacity).toLocaleString() : ''],
      ['Attendance', d.attendance ? Number(d.attendance).toLocaleString() : ''],
      ['Officials', (d.officials || []).join(' · ')],
      ['On TV', (m.broadcasts || []).join(', ')],
    ].filter(([, v]) => v);
    body = `${m.headline || d.recap ? `<p class="mc-recap">${esc(d.recap || m.headline)}</p>` : ''}<dl class="mc-info">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${(d.playerLeaders || []).length ? `<ul class="mc-leadersline">${d.playerLeaders.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
  }
  const dlg = $('#matchDialog');
  dlg.className = `match-dialog state-${st}`;
  dlg.style.setProperty('--home', m.home?.color || 'var(--red)');
  dlg.style.setProperty('--away', m.away?.color || '#555');
  $('#mcBody').innerHTML = `
    <div class="mc-top"><span>${sportOf(m.sport).emoji} ${esc(m.league.name)}${m.note ? ` · ${esc(m.note)}` : ''}</span><span class="status ${st}">${st === 'in' ? '<i></i>' : ''}${esc(statusLabel(m))}</span></div>
    ${head}
    <nav class="mc-tabs">${tabs.map(([k, label]) => `<button data-tab="${k}" class="${k === centreTab ? 'active' : ''}">${label}</button>`).join('')}</nav>
    <div class="mc-panel">${body || (loading ? '<div class="skeleton"></div>' : '<div class="empty">No details yet.</div>')}${loading ? '<p class="loading-note">Loading the full match details…</p>' : ''}</div>
    <div class="mc-actions">
      <button class="btn copy-btn" data-mc="copy">⧉ Copy details</button>
      <a class="btn ghost" href="/studio?brand=tsb&key=${esc(encodeURIComponent(`match:${m.league?.path || 'x'}:${m.id}`))}">🎨 Make a post</a>
      <button class="btn ghost" data-mc="formats">&lt;/&gt; Formats</button>
      ${safeUrl(m.link) ? `<a class="btn ghost" href="${esc(m.link)}" target="_blank" rel="noopener">ESPN ↗</a>` : ''}
    </div>`;
}

function bindCentre() {
  const dlg = $('#matchDialog');
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) return dlg.close();
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      centreTab = tab.dataset.tab;
      return renderCentre(centreMatch, false);
    }
    const act = e.target.closest('[data-mc]');
    if (!act || !centreMatch) return;
    if (act.dataset.mc === 'copy') copyMatch(centreMatch, act);
    else {
      dlg.close();
      openCodes(centreMatch);
    }
  });
  dlg.addEventListener('close', () => {
    centreMatch = null;
    if (location.hash.startsWith('#m=')) history.replaceState(null, '', location.pathname + location.search);
  });
}

// A shared link (#m=<key>) opens that match once the scores are in.
function openFromHash() {
  const k = location.hash.startsWith('#m=') ? decodeURIComponent(location.hash.slice(3)) : '';
  const m = k && findMatch(k);
  if (m && !$('#matchDialog').open) openCentre(m);
  return !!m;
}

// ---------- events ----------
function setSport(sport) {
  state.sport = sport;
  store('sport', sport);
  state.status = 'all';
  document.querySelectorAll('#stateFilter button').forEach((x) => x.classList.toggle('active', x.dataset.state === 'all'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (!NEWS_ONLY.has(sport) && stale(state.datasets.get(sport))) loadSport(sport);
  loadSportNews(sport);
  render();
  document.querySelector(`.chip[data-sport="${sport}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}

function bind() {
  $('#defaultFormat').innerHTML = FORMATS.map((f) => `<option value="${f.id}"${f.id === state.format ? ' selected' : ''}>${f.label}</option>`).join('');
  $('#defaultFormat').addEventListener('change', (e) => {
    state.format = e.target.value;
    store('fmt2', state.format);
    toast(`Copy buttons now copy ${fmtLabel(state.format)}`);
  });

  $('#sportChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sport]');
    if (b) setSport(b.dataset.sport);
  });

  document.querySelectorAll('#tierFilter button').forEach((x) => x.classList.toggle('active', x.dataset.tier === state.tier));
  $('#tierFilter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tier]');
    if (!b) return;
    state.tier = b.dataset.tier;
    store('tier', state.tier);
    document.querySelectorAll('#tierFilter button').forEach((x) => x.classList.toggle('active', x === b));
    renderMatches();
    renderNews();
  });

  $('#stateFilter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-state]');
    if (!b) return;
    state.status = b.dataset.state;
    document.querySelectorAll('#stateFilter button').forEach((x) => x.classList.toggle('active', x === b));
    renderMatches();
  });

  let debounce;
  $('#search').addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.query = e.target.value.trim();
      renderMatches();
      renderNews();
    }, 150);
  });

  $('#matches').addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    const m = card && findMatch(card.dataset.key);
    if (!m) return;
    const b = e.target.closest('[data-act]');
    if (b) {
      if (b.dataset.act === 'copy') copyMatch(m, b);
      else openCodes(m);
    } else if (e.target.closest('[data-open]') && !e.target.closest('a')) openCentre(m);
  });
  $('#matches').addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-open]')) {
      e.preventDefault();
      const m = findMatch(e.target.closest('.card')?.dataset.key);
      if (m) openCentre(m);
    }
  });
  $('#liveRail').addEventListener('click', (e) => {
    const t = e.target.closest('[data-open]');
    const m = t && findMatch(t.dataset.key);
    if (m) openCentre(m);
  });
  bindCentre();

  $('#news').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy-news]');
    if (!b) return;
    const n = state.newsVisible?.[Number(b.dataset.copyNews)];
    if (!n) return;
    const ok = await writeClipboard(newsPoster(n, { ...fmtOpts(), brand: b.dataset.brand || 'tsb' }));
    toast(ok ? 'Copied — in your image AI attach the real photo, the style reference and the logo sheet linked in the prompt' : 'Your browser blocked copying — tap Copy in the box');
  });

  $('#copyAll').addEventListener('click', async () => {
    const list = visibleMatches().slice(0, 300);
    if (!list.length) return toast('Nothing to copy');
    const sep = state.format === 'json' ? null : '\n\n════════════════════════\n\n';
    const text = sep === null ? JSON.stringify(list, null, 2) : list.map((m) => formatMatch(m, state.format, fmtOpts())).join(sep);
    const ok = await writeClipboard(text);
    toast(ok ? `Copied ${list.length} matches` : 'Your browser blocked copying — tap Copy in the box');
  });

  $('#formatTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fmt]');
    if (!b) return;
    dialogFormat = b.dataset.fmt;
    renderDialog();
  });
  $('#dialogCopy').addEventListener('click', async () => {
    const ok = await writeClipboard($('#codeBox').textContent);
    toast(ok ? `Copied ${fmtLabel(dialogFormat)}` : 'Your browser blocked copying — tap Copy in the box');
  });

  $('#refreshBtn').addEventListener('click', () => load({ bust: true }));

  document.querySelector('.view-switch').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    document.querySelectorAll('.view-switch button').forEach((x) => x.classList.toggle('active', x === b));
    document.body.dataset.view = b.dataset.view;
  });
}

// Debug helper: window.nxt.state etc.
window.nxt = { state, formatMatch, apiUrl: (m) => apiUrl(m, SITE) };

bind();
document.body.dataset.view = 'scores';
render();
load();
