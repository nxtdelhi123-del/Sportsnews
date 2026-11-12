// Manchester United only (/united): the live or next match, the last result, fixtures and
// results in every competition, the Premier League table, the squad and United headlines.
import { copyOrShow } from './copy.js';
import { formatMatch, newsPoster, statusLabel } from './format.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const UTD = '360';
const keyOf = (m) => `${m.league.path}:${m.id}`;
const state = { data: null, tab: 'fixtures', byKey: new Map() };

const when = (iso, opts) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, opts || { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};
function timeAgo(iso) {
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (!Number.isFinite(s)) return '';
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
const crest = (t = {}, size = 32) =>
  safeUrl(t.logo)
    ? `<img src="${esc(t.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" width="${size}" height="${size}" onerror="this.style.visibility='hidden'">`
    : `<span class="badge" style="width:${size}px;height:${size}px">${esc((t.abbr || t.name || '?').slice(0, 3).toUpperCase())}</span>`;

// W / D / L from United's side.
function outcome(m) {
  const us = m.home?.id === UTD ? m.home : m.away;
  const them = us === m.home ? m.away : m.home;
  const a = Number(us?.score);
  const b = Number(them?.score);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '';
  return a > b ? 'W' : a < b ? 'L' : 'D';
}

// ---------- data ----------
async function load() {
  try {
    const res = await fetch('/api/united', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(res.status);
    state.data = await res.json();
    state.byKey = new Map([state.data.live, state.data.next, state.data.last, ...(state.data.fixtures || []), ...(state.data.results || [])].filter(Boolean).map((m) => [keyOf(m), m]));
    render();
  } catch {
    if (!state.data) $('#utdSpotlight').innerHTML = `<div class="empty">Couldn't load Manchester United right now. Retrying in a minute…</div>`;
  }
  schedule();
}

// A live match refreshes every minute, otherwise every 10 minutes.
let timer;
let nextAt = 0;
function schedule() {
  clearTimeout(timer);
  const ms = state.data?.live ? 60_000 : 10 * 60_000;
  nextAt = Date.now() + ms;
  timer = setTimeout(load, ms);
}
setInterval(() => {
  if (state.data?.updatedAt) $('#updated').textContent = `Updated ${new Date(state.data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const s = Math.max(0, Math.round((nextAt - Date.now()) / 1000));
  if (nextAt) $('#countdown').textContent = `next in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  tickCountdown();
}, 1000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && Date.now() > nextAt && load());

// ---------- rendering ----------
function render() {
  const d = state.data;
  const t = d.team || {};
  if (safeUrl(t.logo)) $('#utdCrest').src = t.logo;
  const row = d.table?.rows?.find((r) => r.id === UTD);
  $('#utdStanding').innerHTML = [
    row ? `<b>${esc(ordinal(row.rank))}</b> in the ${esc(d.table.name.replace(/^\d{4}-\d{2}\s+/, ''))}` : esc(t.standing || ''),
    row ? `P${esc(row.played)} · W${esc(row.won)} D${esc(row.drawn)} L${esc(row.lost)} · ${esc(row.points)} pts` : '',
    form(d.results),
  ]
    .filter(Boolean)
    .join('<span class="sep">|</span>');
  renderSpotlight();
  renderPanel();
  renderNews();
}

const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10] || 'th'}`;
function form(results = []) {
  const last = results.slice(0, 5).map(outcome).filter(Boolean);
  return last.length ? `Form ${last.map((r) => `<i class="form form-${r}">${r}</i>`).join('')}` : '';
}

function bigMatch(m, label) {
  const st = m.status.state;
  const score = (t) => (st === 'pre' ? '' : esc(t.score ?? ''));
  const res = st === 'post' ? outcome(m) : '';
  return `<article class="utd-big state-${st}" data-key="${esc(keyOf(m))}">
    <div class="mc-top"><span>${esc(label)} · ${esc(m.competition || m.league.name)}</span><span class="status ${st}">${st === 'in' ? '<i></i>' : ''}${esc(st === 'pre' ? when(m.date) : statusLabel(m))}${res ? ` <b class="form form-${res}">${res}</b>` : ''}</span></div>
    <div class="mc-board">
      <div class="mc-team">${crest(m.home, 56)}<b>${esc(m.home.short || m.home.name)}</b></div>
      <div class="mc-score"><span>${score(m.home)}</span><i>${st === 'pre' ? 'vs' : '–'}</i><span>${score(m.away)}</span></div>
      <div class="mc-team">${crest(m.away, 56)}<b>${esc(m.away.short || m.away.name)}</b></div>
    </div>
    ${st === 'pre' ? `<div class="utd-countdown" data-at="${esc(m.date)}"></div>` : ''}
    ${(m.events || []).filter((e) => /goal|red/i.test(e.type)).length ? `<ul class="events">${m.events.filter((e) => /goal|red/i.test(e.type)).map((e) => `<li>${esc(e.minute)} ${/red/i.test(e.type) ? '🟥' : '⚽'} ${esc(e.player)}</li>`).join('')}</ul>` : ''}
    <div class="meta">${m.venue?.name ? `<span>📍 ${esc([m.venue.name, m.venue.city].filter(Boolean).join(', '))}</span>` : ''}${m.broadcasts?.length ? `<span>📺 ${esc(m.broadcasts.join(', '))}</span>` : ''}</div>
    ${actions(m)}
  </article>`;
}

const actions = (m) => `<div class="card-actions">
    <button class="btn small copy-btn" data-act="copy" title="All the match details and a MUSC AI prompt">⧉ Copy + MUSC prompt</button>
    <a class="btn small ghost" href="/studio?brand=musc&key=${esc(encodeURIComponent(`match:${m.league.path}:${m.id}`))}" title="Make the @musc_reddevils post">🎨 Post</a>
    ${safeUrl(m.link) ? `<a class="btn small ghost" href="${esc(m.link)}" target="_blank" rel="noopener">ESPN ↗</a>` : ''}
  </div>`;

function renderSpotlight() {
  const d = state.data;
  const cards = [];
  if (d.live) cards.push(bigMatch(d.live, 'Live now'));
  if (d.next && d.next.id !== d.live?.id) cards.push(bigMatch(d.next, 'Next match'));
  if (d.last && d.last.id !== d.live?.id && cards.length < 2) cards.push(bigMatch(d.last, 'Last result'));
  $('#utdSpotlight').innerHTML = cards.join('') || '<div class="empty">No United match scheduled right now.</div>';
  tickCountdown();
}

function tickCountdown() {
  for (const el of document.querySelectorAll('.utd-countdown')) {
    const s = Math.max(0, Math.round((Date.parse(el.dataset.at) - Date.now()) / 1000));
    const dd = Math.floor(s / 86400);
    const hh = Math.floor((s % 86400) / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    el.innerHTML = s ? [[dd, 'days'], [hh, 'hrs'], [mm, 'min'], [ss, 'sec']].map(([v, l]) => `<span><b>${String(v).padStart(2, '0')}</b>${l}</span>`).join('') : '<span><b>Kick-off</b></span>';
  }
}

function matchRow(m) {
  const st = m.status.state;
  const res = st === 'post' ? outcome(m) : '';
  const score = st === 'pre' ? `<span class="utd-time">${esc(when(m.date, { hour: '2-digit', minute: '2-digit' }))}</span>` : `<b>${esc(m.home.score ?? '')} – ${esc(m.away.score ?? '')}</b>`;
  return `<article class="utd-row state-${st}" data-key="${esc(keyOf(m))}">
    <div class="utd-date"><b>${esc(when(m.date, { day: 'numeric' }))}</b><span>${esc(when(m.date, { month: 'short' }))}</span></div>
    <div class="utd-teams">
      <span class="utd-comp">${esc(m.competition || m.league.name)}</span>
      <span class="utd-line">${crest(m.home, 22)}<span class="${m.home.id === UTD ? 'us' : ''}">${esc(m.home.name)}</span></span>
      <span class="utd-line">${crest(m.away, 22)}<span class="${m.away.id === UTD ? 'us' : ''}">${esc(m.away.name)}</span></span>
    </div>
    <div class="utd-res">${score}${res ? `<i class="form form-${res}">${res}</i>` : ''}${st === 'in' ? '<span class="status in"><i></i>LIVE</span>' : ''}</div>
    <div class="utd-acts">
      <button class="icon-btn" data-act="copy" title="Copy the details and a MUSC prompt">⧉</button>
      <a class="icon-btn" href="/studio?brand=musc&key=${esc(encodeURIComponent(`match:${m.league.path}:${m.id}`))}" title="Make the post">🎨</a>
    </div>
  </article>`;
}

function renderPanel() {
  const d = state.data;
  document.querySelectorAll('#utdTabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
  let html = '';
  if (state.tab === 'fixtures' || state.tab === 'results') {
    const list = state.tab === 'fixtures' ? d.fixtures || [] : d.results || [];
    // grouped by month
    const groups = new Map();
    for (const m of list) {
      const k = when(m.date, { month: 'long', year: 'numeric' });
      (groups.get(k) || groups.set(k, []).get(k)).push(m);
    }
    html = list.length ? [...groups].map(([k, ms]) => `<h3 class="utd-month">${esc(k)}</h3>${ms.map(matchRow).join('')}`).join('') : `<div class="empty">No ${state.tab} listed.</div>`;
  } else if (state.tab === 'table') {
    const rows = d.table?.rows || [];
    html = rows.length
      ? `<table class="utd-table"><thead><tr><th>#</th><th class="l">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows
          .map(
            (r) => `<tr class="${r.id === UTD ? 'us' : ''}${r.rank <= 4 ? ' cl' : r.rank >= rows.length - 2 ? ' rel' : ''}"><td>${esc(r.rank)}</td><td class="l">${crest({ logo: r.logo, name: r.team }, 20)} ${esc(r.team)}</td><td>${esc(r.played)}</td><td>${esc(r.won)}</td><td>${esc(r.drawn)}</td><td>${esc(r.lost)}</td><td>${esc(r.gd)}</td><td><b>${esc(r.points)}</b></td></tr>`,
          )
          .join('')}</tbody></table><p class="hint">Top 4: Champions League · bottom 3: relegation.</p>`
      : '<div class="empty">The table is not available right now.</div>';
  } else {
    const squad = d.squad || [];
    html = squad.length
      ? squad
          .map(
            (g) => `<h3 class="utd-month">${esc(g.position)}s <small>${g.players.length}</small></h3><div class="utd-squad">${g.players
              .map((p) => `<div class="utd-player"><span class="num">${esc(p.number || '–')}</span><span class="pname">${esc(p.name)}</span><span class="pmeta">${safeUrl(p.flag) ? `<img src="${esc(p.flag)}" alt="" width="16" height="16" loading="lazy" referrerpolicy="no-referrer">` : ''}${esc(p.nation)}${p.age ? ` · ${esc(p.age)}` : ''}</span></div>`)
              .join('')}</div>`,
          )
          .join('')
      : '<div class="empty">The squad is not available right now.</div>';
  }
  $('#utdPanel').innerHTML = html;
}

function renderNews() {
  const list = state.data.news || [];
  $('#utdNewsCount').textContent = list.length ? `(${list.length})` : '';
  state.news = list;
  const lead = list.findIndex((n) => safeUrl(n.image));
  $('#utdNews').innerHTML = list.length
    ? list
        .map(
          (n, i) => `<article class="news-item${i === lead ? ' lead' : ''}">
      ${safeUrl(n.image) ? `<img src="${esc(n.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      <div>
        <a href="${esc(safeUrl(n.link))}" target="_blank" rel="noopener" class="news-title">${esc(n.title)}</a>
        <div class="news-meta">${esc(n.source)} · ${esc(timeAgo(n.published))}
          <button class="link-btn" data-copy-news="${i}" title="Copy the details and a MUSC AI prompt">⧉ Copy</button>
          <a class="link-btn" href="/studio?brand=musc&key=${esc(encodeURIComponent(`news:${n.id}`))}" title="Make the @musc_reddevils post">🎨 Post</a></div>
      </div>
    </article>`,
        )
        .join('')
    : '<div class="empty">No United headlines in the last three days.</div>';
}

// ---------- copy ----------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// Full match details from /api/match, written with a MUSC prompt.
function matchText(m) {
  return fetch(`/api/match?l=${encodeURIComponent(m.league.path)}&id=${encodeURIComponent(m.id)}`)
    .then((r) => (r.ok ? r.json() : m))
    .catch(() => m)
    .then((full) => formatMatch({ ...m, ...full, league: { ...m.league, ...full.league } }, 'poster', { siteUrl: location.origin, timeZone: TZ, brand: 'musc' }));
}

document.addEventListener('click', async (e) => {
  const tab = e.target.closest('#utdTabs [data-tab]');
  if (tab) {
    state.tab = tab.dataset.tab;
    return renderPanel();
  }
  const sw = e.target.closest('.utd-switch [data-view]');
  if (sw) {
    document.querySelectorAll('.utd-switch button').forEach((x) => x.classList.toggle('active', x === sw));
    document.body.dataset.view = sw.dataset.view;
    return;
  }
  const c = e.target.closest('[data-act="copy"]');
  if (c) {
    const m = state.byKey.get(c.closest('[data-key]')?.dataset.key);
    if (!m) return;
    const ok = await copyOrShow(matchText(m), 'Match details + MUSC prompt');
    return toast(ok ? 'Copied — paste it into your AI with the photo attached' : 'Your browser blocked copying — tap Copy in the box');
  }
  const n = e.target.closest('[data-copy-news]');
  if (n) {
    const item = state.news?.[Number(n.dataset.copyNews)];
    if (!item) return;
    const ok = await copyOrShow(newsPoster(item, { siteUrl: location.origin, timeZone: TZ, brand: 'musc' }), 'Headline + MUSC prompt');
    toast(ok ? 'Copied — paste it into your AI with the photo attached' : 'Your browser blocked copying — tap Copy in the box');
  }
});

document.body.dataset.view = 'matches';
load();
