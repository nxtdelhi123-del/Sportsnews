const $ = (s) => document.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const TEMPLATES = { tsb: ['tsb-cream', 'tsb-dark'], musc: ['musc-result', 'musc-matchday'] };
const state = { brand: localStorage.getItem('studio:brand') || 'tsb', packs: [], current: null, size: 'post', template: null, rejected: new Set(JSON.parse(localStorage.getItem('studio:rejected') || '[]')) };

const renderUrl = (p, size = 'post', template = null, w = 0) => `/api/studio/render?brand=${state.brand}&key=${encodeURIComponent(p.key)}&size=${size}${template ? '&template=' + template : ''}${w ? '&w=' + w : ''}`;

async function load(bust = false) {
  $('#packs').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
  try {
    const r = await fetch(`/api/studio/candidates?brand=${state.brand}${bust ? '&t=' + Date.now() : ''}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || r.status);
    state.packs = data.packs || [];
  } catch (e) {
    $('#packs').innerHTML = `<div class="empty">Couldn't load stories: ${esc(e.message)}</div>`;
    return;
  }
  render();
}

function render() {
  if (!state.packs.length) {
    $('#packs').innerHTML = '<div class="empty">Nothing worth posting right now for this page.</div>';
    return;
  }
  $('#packs').innerHTML = state.packs
    .map(
      (p, i) => `<article class="pack${state.rejected.has(p.key) ? ' rejected' : ''}" data-i="${i}">
      <img class="thumb" src="${renderUrl(p, 'post', null, 540)}" alt="" loading="lazy">
      <div class="info">
        <div class="h">${esc(p.words.headline)}</div>
        <div class="m"><span class="ptype">${esc(p.type)}</span><span class="score">${p.score}</span><span>${esc(p.reason || '')}</span></div>
      </div></article>`,
    )
    .join('');
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

async function open(i) {
  const p = state.packs[i];
  state.current = p;
  state.template = null;
  $('#packTitle').textContent = p.story.name || p.story.title || 'Post';
  $('#fHeadline').value = p.words.headline;
  $('#fCaption').value = p.words.caption;
  $('#packMeta').textContent = `${p.type} · score ${p.score} · ${p.reason || ''} · words by ${p.words.by || 'formula'}`;
  $('#tplSeg').innerHTML = TEMPLATES[state.brand].map((t) => `<button data-tpl="${t}" class="${t === p.template ? 'active' : ''}">${t.replace(/^\w+-/, '')}</button>`).join('');
  document.querySelectorAll('#sizeSeg button').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  updatePreview();
  $('#packDialog').showModal();
  // Words written by Claude arrive with the full pack.
  try {
    const full = await (await fetch(renderUrl(p) + '&json=1')).json();
    if (full?.words && state.current === p) {
      p.words = full.words;
      $('#fHeadline').value = full.words.headline;
      $('#fCaption').value = full.words.caption;
      $('#packMeta').textContent = `${p.type} · score ${p.score} · ${p.reason || ''} · words by ${full.words.by || 'formula'}`;
    }
  } catch {
    /* formula words stay */
  }
}

function updatePreview() {
  const url = renderUrl(state.current, state.size, state.template);
  $('#packImg').src = url;
  $('#download').href = url;
  $('#download').download = `${state.brand}-${state.size}.png`;
  // Fetch the file now so the Share tap can hand it over immediately (share sheets need a fresh tap).
  state.file = fetch(url)
    .then((r) => r.blob())
    .then((b) => new File([b], `${state.brand}-${state.size}.png`, { type: 'image/png' }))
    .catch(() => null);
}

async function share() {
  const caption = $('#fCaption').value;
  try {
    await navigator.clipboard.writeText(caption);
  } catch {
    /* clipboard may be unavailable; the share text carries the caption too */
  }
  const file = await state.file;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: $('#fHeadline').value, text: caption });
      fetch('/api/studio/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand: state.brand, key: state.current.key, decision: 'approve', type: state.current.type, score: state.current.score, sport: state.current.story.sport, competition: state.current.story.league?.name, headline: $('#fHeadline').value }) }).catch(() => {});
      toast('Caption copied. Paste it in Instagram.');
    } catch (e) {
      if (e?.name !== 'AbortError') toast('Sharing failed here. Use Download.');
    }
  } else {
    toast('This browser can’t share files. Use Download, then post from your gallery.');
  }
}

$('#brandTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-brand]');
  if (!b) return;
  state.brand = b.dataset.brand;
  localStorage.setItem('studio:brand', state.brand);
  document.querySelectorAll('#brandTabs button').forEach((x) => x.classList.toggle('active', x === b));
  load();
});
$('#packs').addEventListener('click', (e) => {
  const a = e.target.closest('.pack');
  if (a) open(Number(a.dataset.i));
});
$('#sizeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-size]');
  if (!b) return;
  state.size = b.dataset.size;
  document.querySelectorAll('#sizeSeg button').forEach((x) => x.classList.toggle('active', x === b));
  updatePreview();
});
$('#tplSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tpl]');
  if (!b) return;
  state.template = b.dataset.tpl;
  document.querySelectorAll('#tplSeg button').forEach((x) => x.classList.toggle('active', x === b));
  updatePreview();
});
$('#share').addEventListener('click', share);
$('#copyCaption').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('#fCaption').value);
  toast('Caption copied');
});
$('#reject').addEventListener('click', async () => {
  const p = state.current;
  state.rejected.add(p.key);
  localStorage.setItem('studio:rejected', JSON.stringify([...state.rejected]));
  fetch('/api/studio/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand: state.brand, key: p.key, decision: 'reject', type: p.type, score: p.score, sport: p.story.sport, competition: p.story.league?.name, headline: p.words.headline }) }).catch(() => {});
  $('#packDialog').close();
  render();
  toast('Noted. It learns from this.');
});
$('#refreshBtn').addEventListener('click', () => load(true));
document.querySelectorAll('#brandTabs button').forEach((x) => x.classList.toggle('active', x.dataset.brand === state.brand));
load();
