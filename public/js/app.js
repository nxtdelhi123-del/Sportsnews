import { SPORTS, FORMATS, sportOf, statusLabel, formatMatch, apiUrl } from './format.js';

const REFRESH_MS = 10 * 60_000;
const SITE = location.origin;
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const $ = (sel) => document.querySelector(sel);
const state = {
  matches: [],
  news: [],
  sport: 'all',
  status: 'all',
  query: '',
  format: store('fmt') || 'text',
  updatedAt: null,
  nextAt: null,
  byKey: new Map(),
};

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

async function load({ bust = false } = {}) {
  const q = bust ? `?t=${Date.now()}` : '';
  $('#refreshBtn').disabled = true;
  $('#refreshBtn').classList.add('spinning');
  const [scores, news] = await Promise.allSettled([getJSON(`/api/scores${q}`), getJSON(`/api/news${q}`)]);
  if (scores.status === 'fulfilled') {
    state.matches = scores.value.matches || [];
    state.byKey = new Map(state.matches.map((m) => [keyOf(m), m]));
    state.updatedAt = scores.value.updatedAt;
    state.nextAt = scores.value.nextUpdateAt;
    state.scoreSources = scores.value.sources;
  } else if (!state.matches.length) {
    $('#matches').innerHTML = `<div class="empty">Couldn't load scores right now. Retrying soon…</div>`;
  }
  if (news.status === 'fulfilled') {
    state.news = news.value.items || [];
    state.newsSources = news.value.sources;
    state.updatedAt ||= news.value.updatedAt;
    state.nextAt ||= news.value.nextUpdateAt;
  } else if (!state.news.length) {
    $('#news').innerHTML = `<div class="empty">Couldn't load headlines right now.</div>`;
  }
  $('#refreshBtn').disabled = false;
  $('#refreshBtn').classList.remove('spinning');
  render();
  schedule();
}

// Refresh on every 10-minute mark, a few seconds after the server rebuilds.
let timer;
function schedule() {
  clearTimeout(timer);
  const step = REFRESH_MS;
  const next = Math.floor(Date.now() / step) * step + step + 8000;
  state.nextAt = new Date(next).toISOString();
  timer = setTimeout(() => load(), next - Date.now());
}

setInterval(tickClock, 1000);
function tickClock() {
  if (state.updatedAt) $('#updated').textContent = `Updated ${new Date(state.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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
  renderMatches();
  renderNews();
  renderTicker();
  renderStatus();
  tickClock();
}

function counts() {
  const c = { all: state.matches.length + state.news.length };
  for (const m of state.matches) c[m.sport] = (c[m.sport] || 0) + 1;
  for (const n of state.news) c[n.sport] = (c[n.sport] || 0) + 1;
  return c;
}

function renderChips() {
  const c = counts();
  const live = state.matches.filter((m) => m.status.state === 'in').length;
  const chips = [['all', '🌍', 'All sports', c.all], ...Object.entries(SPORTS).filter(([k]) => c[k]).map(([k, v]) => [k, v.emoji, v.label, c[k]])];
  $('#sportChips').innerHTML =
    chips.map(([k, e, l, n]) => `<button class="chip${state.sport === k ? ' active' : ''}" data-sport="${k}"><span>${e}</span>${esc(l)}<small>${n}</small></button>`).join('') +
    (live ? `<span class="live-pill"><i></i>${live} live now</span>` : '');
}

function visibleMatches() {
  const q = state.query.toLowerCase();
  return state.matches.filter((m) => {
    if (state.sport !== 'all' && m.sport !== state.sport) return false;
    if (state.status !== 'all' && m.status.state !== state.status) return false;
    if (!q) return true;
    const hay = [m.name, m.league.name, m.note, m.home?.name, m.away?.name, m.venue?.name, m.venue?.city, m.venue?.country, ...(m.leaders || []).map((l) => l.name)].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

function teamRow(t, m) {
  const logo = safeUrl(t.logo)
    ? `<img src="${esc(t.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" width="24" height="24" onerror="this.style.visibility='hidden'">`
    : `<span class="badge">${esc((t.abbr || t.name || '?').slice(0, 3).toUpperCase())}</span>`;
  const score = t.score !== '' && t.score != null ? t.score : (t.linescores || []).join(' ');
  const showScore = m.status.state !== 'pre' && score !== '';
  return `<div class="team${t.winner ? ' winner' : ''}">${logo}<span class="tname">${esc(t.name)}${t.record ? ` <small>${esc(t.record)}</small>` : ''}</span><span class="tscore">${showScore ? esc(score) : ''}</span></div>`;
}

function matchCard(m) {
  const sp = sportOf(m.sport);
  const st = m.status.state;
  const body =
    m.kind === 'field'
      ? `<div class="field-name">${esc(m.name)}</div><ol class="leaders">${(m.leaders || []).slice(0, 5).map((l) => `<li><span>${esc(l.position)}</span>${esc(l.name)}<b>${esc(l.score)}</b></li>`).join('')}</ol>`
      : teamRow(m.away, m) + teamRow(m.home, m);
  const events = (m.events || []).filter((e) => /goal|red/i.test(e.type)).slice(0, 6);
  const venue = [m.venue?.name, m.venue?.city].filter(Boolean).join(', ');
  return `<article class="card state-${st}" data-key="${esc(keyOf(m))}">
    <header class="card-head">
      <span class="league">${sp.emoji} ${esc(m.league.name)}</span>
      <span class="status ${st}">${st === 'in' ? '<i></i>' : ''}${esc(statusLabel(m))}</span>
    </header>
    ${m.note ? `<div class="note">${esc(m.note)}</div>` : ''}
    <div class="card-body">${body}</div>
    ${events.length ? `<ul class="events">${events.map((e) => `<li>${esc(e.minute)} ${/red/i.test(e.type) ? '🟥' : '⚽'} ${esc(e.player)}${e.team ? ` <small>${esc(e.team)}</small>` : ''}</li>`).join('')}</ul>` : ''}
    <div class="meta">
      <span title="${esc(m.date)}">🕒 ${esc(localTime(m.date))}</span>
      ${venue ? `<span>📍 ${esc(venue)}</span>` : ''}
      ${m.broadcasts?.length ? `<span>📺 ${esc(m.broadcasts.slice(0, 2).join(', '))}</span>` : ''}
    </div>
    <footer class="card-actions">
      <button class="btn small" data-act="copy">Copy</button>
      <button class="btn small ghost" data-act="code" title="View all code formats">&lt;/&gt; Codes</button>
      ${safeUrl(m.link) ? `<a class="btn small ghost" href="${esc(m.link)}" target="_blank" rel="noopener">Match centre ↗</a>` : ''}
    </footer>
  </article>`;
}

function renderMatches() {
  const list = visibleMatches();
  $('#matchCount').textContent = list.length ? `(${list.length})` : '';
  if (!list.length) {
    $('#matches').innerHTML = `<div class="empty">${state.matches.length ? 'No matches for this filter.' : 'No matches in the current window.'}</div>`;
    return;
  }
  const groups = new Map();
  for (const m of list) {
    const g = groups.get(m.league.name) || [];
    g.push(m);
    groups.set(m.league.name, g);
  }
  // Leagues with live games first
  const ordered = [...groups.entries()].sort(([, a], [, b]) => Number(b.some((m) => m.status.state === 'in')) - Number(a.some((m) => m.status.state === 'in')));
  $('#matches').innerHTML = ordered
    .map(([name, ms]) => `<section class="league-group"><h3>${sportOf(ms[0].sport).emoji} ${esc(name)} <small>${ms.length}</small></h3><div class="grid">${ms.map(matchCard).join('')}</div></section>`)
    .join('');
}

function renderNews() {
  const list = state.news.filter((n) => state.sport === 'all' || n.sport === state.sport).filter((n) => !state.query || `${n.title} ${n.summary}`.toLowerCase().includes(state.query.toLowerCase())).slice(0, 120);
  $('#newsCount').textContent = list.length ? `(${list.length})` : '';
  if (!list.length) {
    $('#news').innerHTML = `<div class="empty">No headlines for this filter.</div>`;
    return;
  }
  $('#news').innerHTML = list
    .map((n, i) => `<article class="news-item" data-idx="${i}">
      ${safeUrl(n.image) ? `<img src="${esc(n.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      <div>
        <a href="${esc(safeUrl(n.link))}" target="_blank" rel="noopener" class="news-title">${esc(n.title)}</a>
        <div class="news-meta">${sportOf(n.sport).emoji} ${esc(n.source)} · ${esc(timeAgo(n.published))}
          <button class="link-btn" data-copy-news="${i}" title="Copy headline and link">Copy</button></div>
      </div>
    </article>`)
    .join('');
  state.newsVisible = list;
}

function renderTicker() {
  const top = state.news.slice(0, 15);
  const html = top.map((n) => `<a href="${esc(safeUrl(n.link))}" target="_blank" rel="noopener">${sportOf(n.sport).emoji} ${esc(n.title)}</a>`).join('<span class="dot">•</span>');
  $('#ticker').innerHTML = html + (html ? '<span class="dot">•</span>' + html : '');
}

function renderStatus() {
  const s = state.scoreSources;
  const n = state.newsSources;
  const parts = [];
  if (s) parts.push(`${s.ok} scoreboards online${s.failed?.length ? `, ${s.failed.length} unavailable` : ''}`);
  if (n) parts.push(`${n.ok} news feeds online${n.failed?.length ? `, ${n.failed.length} unavailable` : ''}`);
  parts.push(`Times shown in ${TZ}`);
  $('#sourceStatus').textContent = parts.join(' · ');
}

// ---------- copy ----------
async function copy(text, msg = 'Copied!') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(msg);
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

const fmtOpts = () => ({ siteUrl: SITE, timeZone: TZ });
const fmtLabel = (id) => FORMATS.find((f) => f.id === id)?.label || id;

let dialogMatch = null;
let dialogFormat = state.format;
function openCodes(m) {
  dialogMatch = m;
  dialogFormat = state.format;
  $('#dialogTitle').textContent = m.name || 'Match code';
  renderDialog();
  $('#codeDialog').showModal();
}

function renderDialog() {
  $('#formatTabs').innerHTML = FORMATS.map((f) => `<button role="tab" data-fmt="${f.id}" class="${f.id === dialogFormat ? 'active' : ''}">${f.label}</button>`).join('');
  $('#codeBox').textContent = formatMatch(dialogMatch, dialogFormat, fmtOpts());
  const hints = {
    text: 'Paste into WhatsApp, Telegram, X or email.',
    markdown: 'Paste into Discord, Reddit, GitHub or Notion.',
    json: 'Structured data for apps and spreadsheets.',
    embed: 'Live-updating widget for any website or blog.',
    api: `Always-fresh JSON. Add &format=text or &format=markdown.`,
  };
  $('#dialogHint').textContent = hints[dialogFormat] || '';
}

// ---------- events ----------
function bind() {
  $('#defaultFormat').innerHTML = FORMATS.map((f) => `<option value="${f.id}"${f.id === state.format ? ' selected' : ''}>${f.label}</option>`).join('');
  $('#defaultFormat').addEventListener('change', (e) => {
    state.format = e.target.value;
    store('fmt', state.format);
  });

  $('#sportChips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sport]');
    if (!b) return;
    state.sport = b.dataset.sport;
    render();
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
    }, 120);
  });

  $('#matches').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const m = state.byKey.get(b.closest('.card').dataset.key);
    if (!m) return;
    if (b.dataset.act === 'copy') copy(formatMatch(m, state.format, fmtOpts()), `Copied as ${fmtLabel(state.format)}`);
    else openCodes(m);
  });

  $('#news').addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy-news]');
    if (!b) return;
    const n = state.newsVisible?.[Number(b.dataset.copyNews)];
    if (n) copy(`${sportOf(n.sport).emoji} ${n.title} — ${n.source}\n${n.link}`, 'Headline copied');
  });

  $('#copyAll').addEventListener('click', () => {
    const list = visibleMatches();
    if (!list.length) return toast('Nothing to copy');
    const sep = state.format === 'json' ? null : state.format === 'markdown' ? '\n\n---\n\n' : '\n\n';
    const text = sep === null ? JSON.stringify(list, null, 2) : list.map((m) => formatMatch(m, state.format, fmtOpts())).join(sep);
    copy(text, `Copied ${list.length} matches`);
  });

  $('#formatTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fmt]');
    if (!b) return;
    dialogFormat = b.dataset.fmt;
    renderDialog();
  });
  $('#dialogCopy').addEventListener('click', () => copy($('#codeBox').textContent, `Copied ${fmtLabel(dialogFormat)}`));

  $('#refreshBtn').addEventListener('click', () => load({ bust: true }));

  document.querySelector('.view-switch').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    document.querySelectorAll('.view-switch button').forEach((x) => x.classList.toggle('active', x === b));
    document.body.dataset.view = b.dataset.view;
  });
}

// Debug helper: window.sportsnews.api(match) etc.
window.sportsnews = { state, formatMatch, apiUrl: (m) => apiUrl(m, SITE) };

bind();
document.body.dataset.view = 'scores';
load();
