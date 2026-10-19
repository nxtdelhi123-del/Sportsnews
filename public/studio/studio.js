import { findSubject, findText, cropHero, cutoutOf, cleanBand, withoutText } from '/studio/cutout.js';
import { posterPrompt, styleRef } from '/js/prompts.js';

const ASPECT = { tall: 1080 / 1440, post: 1080 / 1350, story: 1080 / 1920, square: 1 };

const $ = (s) => document.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const TEMPLATES = { tsb: ['tsb-medal-top', 'tsb-medal-bottom', 'tsb-phrase', 'tsb-number', 'tsb-cream'], musc: ['musc-head', 'musc-head-left', 'musc-head-slant', 'musc-result', 'musc-matchday'] };
const TPL_NAMES = { 'tsb-medal-top': 'Name on top', 'tsb-medal-bottom': 'Metal at foot', 'tsb-phrase': 'Phrase', 'tsb-number': 'Number', 'tsb-quote': 'Quote', 'tsb-cream': 'Cream result', 'tsb-result-photo': 'Photo result', 'tsb-preview': 'Preview', 'tsb-vs': 'Cream VS', 'tsb-tally': 'Tally', 'tsb-verdict': 'Breaking', 'tsb-cover': 'Cover', 'tsb-dark': 'Dark', 'musc-head': 'Centre', 'musc-head-left': 'Left', 'musc-head-slant': 'Slant', 'musc-matchday': 'Matchday', 'musc-result': 'Result', 'musc-statement': 'Statement', 'musc-signing': 'Signing' };
const state = { brand: localStorage.getItem('studio:brand') || 'tsb', packs: [], current: null, size: 'tall', template: null, photo: null, src: null, rejected: new Set(JSON.parse(localStorage.getItem('studio:rejected') || '[]')), cutout: localStorage.getItem('studio:cutout') === 'on' };

const renderUrl = (p, size = 'tall', template = null, w = 0) => `/api/studio/render?brand=${state.brand}&key=${encodeURIComponent(p.key)}&size=${size}${template ? '&template=' + template : ''}${w ? '&w=' + w : ''}`;
// Stories pasted by the owner are not in the newsroom: every render carries the story itself.
const custom = (p) => (p?.story?.source === 'pasted' ? { story: p.story } : {});

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

let toastTimer;
function toast(msg, sticky = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  if (!sticky) toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}
const hideToast = () => $('#toast').classList.remove('show');

// ---- the words the owner can change ----
const statsText = (stats = []) => stats.map((s) => `${s.value} ${s.label}`.trim()).join(' | ');
const parseStats = (txt) =>
  txt
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((s) => {
      const [value, ...label] = s.split(/\s+/);
      return { value, label: label.join(' ') };
    });
function fillFields(words) {
  $('#fHeadline').value = words.headline || '';
  $('#fName').value = words.name || '';
  $('#fKicker').value = words.kicker || '';
  $('#fStats').value = statsText(words.stats);
  $('#fCaption').value = words.caption || '';
}
function edits() {
  const w = state.current.words;
  const out = {};
  const headline = $('#fHeadline').value.trim();
  const name = $('#fName').value.trim();
  const kicker = $('#fKicker').value.trim();
  const stats = parseStats($('#fStats').value);
  if (headline && headline !== w.headline) out.headline = headline;
  if (name !== (w.name || '')) out.name = name;
  if (kicker !== (w.kicker || '')) out.kicker = kicker;
  if (statsText(stats) !== statsText(w.stats)) out.stats = stats;
  if (out.headline) {
    // Keep the metal on the last word when the owner rewrites a medal headline.
    const last = out.headline.split(/\s+/).pop().toLowerCase().replace(/[.,!?]/g, '');
    if (/^(gold|silver|bronze|podium|later|ever|final|assured|record|history|made|guilty)$/.test(last)) out.accentWords = [last];
  }
  return Object.keys(out).length ? out : null;
}

async function open(i) {
  openPack(state.packs[i]);
}
async function openPack(p) {
  state.current = p;
  state.template = null;
  state.photo = null;
  state.src = null;
  $('#photoIn').value = '';
  $('#photoUrl').value = '';
  $('#packTitle').textContent = p.story.name || p.story.title || 'Post';
  fillFields(p.words);
  $('#packMeta').textContent = `${p.type} · score ${p.score} · ${p.reason || ''} · words by ${p.words.by || 'formula'}`;
  $('#tplSeg').innerHTML = (p.templates?.length ? p.templates : TEMPLATES[state.brand]).map((t) => `<button data-tpl="${t}" class="${t === p.template ? 'active' : ''}">${esc(TPL_NAMES[t] || t.replace(/^\w+-/, ''))}</button>`).join('');
  $('#nudge').hidden = true;
  $('#zoom').value = 1;
  document.querySelectorAll('#sizeSeg button').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  $('#cutoutOn').checked = state.cutout;
  updatePreview();
  $('#packDialog').showModal();
  if (p.story?.source === 'pasted') return;
  // Words written by Claude arrive with the full pack.
  try {
    const full = await (await fetch(renderUrl(p) + '&json=1')).json();
    if (full?.words && state.current === p) {
      p.words = full.words;
      fillFields(full.words);
      $('#packMeta').textContent = `${p.type} · score ${p.score} · ${p.reason || ''} · words by ${full.words.by || 'formula'}`;
    }
  } catch {
    /* formula words stay */
  }
}

function updatePreview() {
  const url = renderUrl(state.current, state.size, state.template);
  $('#download').download = `${state.brand}-${state.size}.png`;
  setStyleRef();
  const words = edits();
  if (state.photo || words || state.current.story?.source === 'pasted') {
    // Own photo, own words or a pasted story: render through POST, show and share the returned file.
    // Several renders can be in flight (the quick first draw, then the one with the athlete found);
    // only the latest one may reach the screen.
    const seq = (state.renderSeq = (state.renderSeq || 0) + 1);
    $('#packImg').style.opacity = 0.4;
    const body = { brand: state.brand, key: state.current.key, size: state.size, template: state.template || undefined, ...(state.photo || {}), words: words || undefined, ...custom(state.current) };
    state.file = fetch('/api/studio/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || r.status);
        return r.blob();
      })
      .then((b) => {
        if (seq !== state.renderSeq) return null;
        const objUrl = URL.createObjectURL(b);
        $('#packImg').src = objUrl;
        $('#packImg').style.opacity = 1;
        $('#download').href = objUrl;
        return new File([b], `${state.brand}-${state.size}.png`, { type: 'image/png' });
      })
      .catch((e) => {
        if (seq !== state.renderSeq) return null;
        $('#packImg').style.opacity = 1;
        toast(`Drawing failed: ${e.message}`);
        return null;
      });
    return;
  }
  $('#packImg').src = url;
  $('#download').href = url;
  // Fetch the file now so the Share tap can hand it over immediately (share sheets need a fresh tap).
  state.file = fetch(url)
    .then((r) => r.blob())
    .then((b) => new File([b], `${state.brand}-${state.size}.png`, { type: 'image/png' }))
    .catch(() => null);
}

// ---- photos: a file from the phone or a pasted link; the athlete cut out on the phone ----
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('That is not a picture this browser can open'));
    im.src = src;
  });
}
function shrink(im, max = 1600) {
  const k = Math.min(1, max / Math.max(im.width, im.height));
  const c = document.createElement('canvas');
  c.width = Math.round(im.width * k);
  c.height = Math.round(im.height * k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.86);
}
// Build the hero (and the cut-out) for the current poster shape from the photo in memory.
// Text already printed on the photo is cropped away when it sits in a band at the top or
// the bottom; when it runs through the middle, the athlete is cut out instead.
function buildPhoto() {
  const { image, text } = state.src;
  const aspect = ASPECT[state.size] || ASPECT.post;
  const boxes = text?.boxes || [];
  const hasText = boxes.length > 0 && text.coverage > 0.004;
  // Printed words are never part of the athlete.
  const subject = hasText ? withoutText(state.src.subject, boxes) : state.src.subject;
  let cutOn = $('#cutoutOn').checked && subject?.box;
  let band = null;
  let note = '';
  if (hasText && !cutOn) {
    band = cleanBand(boxes, subject?.box);
    const trial = cropHero(image, subject, aspect, { band });
    if (band.middle || trial.zoom > 1.9 || band.bottom - band.top < 0.45) {
      // Text runs through the picture: only the athlete can be kept.
      if (subject?.box && (subject.textOverlap || 0) < 0.3) {
        cutOn = true;
        note = 'Text on the photo runs through it: athlete cut out instead.';
      } else {
        band = null;
        note = subject?.box ? 'Text on the photo covers the athlete; used as it is. A clean photo works best.' : 'Text on the photo; could not avoid it.';
      }
    } else {
      note = 'Text on the photo cropped away.';
    }
  }
  const forced = cutOn && !$('#cutoutOn').checked;
  const { hero, subjectY } = cropHero(image, subject, aspect, { blur: cutOn ? (forced ? 48 : 30) : 0, dim: forced ? 0.36 : 0.72, band: cutOn ? null : band, nudge: cutOn ? null : state.src.nudge });
  $('#nudge').hidden = !!cutOn;
  const layout = !cutOn && subject?.box && subjectY > 0.58 ? 'top' : 'bottom';
  state.photo = { hero, layout };
  if (cutOn) {
    const { cutout, aspect: cutAspect } = cutoutOf(image, subject);
    state.photo = { hero, cutout, cutoutAspect: cutAspect, layout: 'bottom' };
  }
  state.photoNote = note;
}
async function usePhoto(src) {
  let im;
  try {
    im = await loadImage(src);
  } catch (e) {
    toast(e.message);
    return;
  }
  if (!state.template || !/dark|result/.test(state.template)) state.template = state.brand === 'tsb' ? 'tsb-dark' : 'musc-result';
  document.querySelectorAll('#tplSeg button').forEach((x) => x.classList.toggle('active', x.dataset.tpl === state.template));
  // Draw at once with a centred crop; then find the athlete and any printed text, and draw again around them.
  state.src = { image: im, subject: null, text: null, nudge: { zoom: 1, dx: 0, dy: 0 } };
  $('#zoom').value = 1;
  buildPhoto();
  updatePreview();
  try {
    const subject = await findSubject(im, {
      onProgress: (p, m) => toast(p < 1 ? `Getting the photo model (${m.size} MB, once)… ${Math.round(p * 100)}%` : 'Finding the athlete…', true),
    });
    if (state.src?.image !== im) return;
    state.src.subject = subject;
    let text = null;
    try {
      text = await findText(im, { onProgress: (p) => toast(p < 1 ? `Getting the text model… ${Math.round(p * 100)}%` : 'Checking for text on the photo…', true) });
    } catch {
      /* no text check; the photo is used as it is */
    }
    if (state.src?.image !== im) return;
    state.src.text = text;
    hideToast();
    buildPhoto();
    updatePreview();
    toast(state.photoNote || (subject.box ? ($('#cutoutOn').checked ? 'Athlete cut out. Re-drawing…' : 'Athlete found. Re-drawing…') : 'No clear subject found; using the photo as it is.'));
  } catch (e) {
    hideToast();
    toast(`Photo kept as it is (${e.message}).`);
  }
}
async function usePhotoLink(url) {
  if (!/^https?:\/\//i.test(url)) return toast('Paste a full picture link (https://…)');
  toast('Fetching the picture…', true);
  try {
    const r = await fetch(`/api/studio/photo?url=${encodeURIComponent(url)}`);
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    const blob = await r.blob();
    hideToast();
    usePhoto(URL.createObjectURL(blob));
  } catch (e) {
    hideToast();
    toast(e.message);
  }
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
      fetch('/api/studio/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand: state.brand, key: state.current.key, decision: edits() ? 'edit' : 'approve', type: state.current.type, score: state.current.score, sport: state.current.story.sport, competition: state.current.story.league?.name, headline: $('#fHeadline').value, edited: edits() || undefined }) }).catch(() => {});
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
  if (state.src) buildPhoto();
  updatePreview();
});
$('#tplSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tpl]');
  if (!b) return;
  state.template = b.dataset.tpl;
  document.querySelectorAll('#tplSeg button').forEach((x) => x.classList.toggle('active', x === b));
  updatePreview();
});
$('#redraw').addEventListener('click', updatePreview);

// Move the photo: drag the preview (or use the arrows), zoom with the slider.
let redrawTimer;
const redrawSoon = () => {
  clearTimeout(redrawTimer);
  redrawTimer = setTimeout(() => {
    buildPhoto();
    updatePreview();
  }, 180);
};
const nudgeBy = (dx, dy) => {
  if (!state.src) return toast('Add a photo first');
  state.src.nudge.dx += dx;
  state.src.nudge.dy += dy;
  redrawSoon();
};
let drag = null;
$('#packImg').addEventListener('pointerdown', (e) => {
  if (!state.src || $('#nudge').hidden) return;
  drag = { x: e.clientX, y: e.clientY, w: e.currentTarget.clientWidth, h: e.currentTarget.clientHeight };
  e.currentTarget.setPointerCapture(e.pointerId);
});
$('#packImg').addEventListener('pointerup', (e) => {
  if (!drag) return;
  const dx = (e.clientX - drag.x) / drag.w;
  const dy = (e.clientY - drag.y) / drag.h;
  drag = null;
  if (Math.abs(dx) + Math.abs(dy) > 0.01) nudgeBy(dx, dy);
});
$('#zoom').addEventListener('input', (e) => {
  if (!state.src) return;
  state.src.nudge.zoom = Number(e.target.value);
  redrawSoon();
});
document.querySelectorAll('#nudge [data-nudge]').forEach((b) =>
  b.addEventListener('click', () => {
    const [dx, dy] = b.dataset.nudge.split(',').map(Number);
    nudgeBy(dx, dy);
  }),
);
$('#nudgeReset').addEventListener('click', () => {
  if (!state.src) return;
  state.src.nudge = { zoom: 1, dx: 0, dy: 0 };
  $('#zoom').value = 1;
  redrawSoon();
});
for (const id of ['#fHeadline', '#fName', '#fKicker', '#fStats']) $(id).addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), updatePreview()));
$('#share').addEventListener('click', share);
$('#photoIn').addEventListener('change', (e) => e.target.files[0] && usePhoto(URL.createObjectURL(e.target.files[0])));
$('#photoGo').addEventListener('click', () => usePhotoLink($('#photoUrl').value.trim()));
$('#photoUrl').addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), usePhotoLink($('#photoUrl').value.trim())));
$('#cutoutOn').addEventListener('change', (e) => {
  state.cutout = e.target.checked;
  localStorage.setItem('studio:cutout', state.cutout ? 'on' : 'off');
  if (state.src) {
    buildPhoto();
    updatePreview();
  }
});
// A prompt for an image AI, with this post's words and layout, and the real post of the
// same layout to attach as its style reference. A layout picked on the desk is kept.
const SIZE_NAME = { tall: '3:4', post: '4:5', story: '9:16', square: '1:1' };
const promptOpts = (p) => ({ brand: state.brand, words: { ...p.words, ...(edits() || {}) }, template: state.template || p.template, pinned: !!state.template, size: SIZE_NAME[state.size], when: [p.when?.day, p.when?.time].filter(Boolean).join(', '), photo: true });
function setStyleRef() {
  const p = state.current;
  if (!p) return;
  const ref = styleRef(p.story, promptOpts(p));
  $('#styleRef').href = ref.url;
  $('#styleRef').download = ref.url.split('/').pop();
  $('#logoSheet').href = ref.logos;
  $('#logoSheet').download = `${state.brand}-logos.png`;
}
$('#copyPrompt').addEventListener('click', async () => {
  const p = state.current;
  if (!p) return;
  setStyleRef();
  const text = posterPrompt(p.story, promptOpts(p));
  try {
    await navigator.clipboard.writeText(text);
    toast('Prompt copied. In your image AI attach: the real photo, ⤓ Style reference and ⤓ Logos — then paste.');
  } catch {
    toast('Copy failed on this browser');
  }
});
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

// ---- a pasted story: text → story → pack → the same dialog ----
async function makeFromPaste() {
  const text = $('#pasteText').value.trim();
  if (!text) return toast('Paste something first');
  $('#pasteStatus').textContent = 'Reading…';
  try {
    const r = await fetch('/api/studio/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand: state.brand, paste: text, json: 1 }) });
    const pack = await r.json();
    if (!r.ok) throw new Error(pack.error || r.status);
    $('#pasteStatus').textContent = '';
    openPack(pack);
    // A picture link in the text becomes the photo, cut out like any other.
    if (pack.story?.image) usePhotoLink(pack.story.image);
  } catch (e) {
    $('#pasteStatus').textContent = e.message;
  }
}
$('#pasteGo').addEventListener('click', makeFromPaste);
$('#pasteText').addEventListener('keydown', (e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && makeFromPaste());

// ---- opened from the newsroom's Post button: /studio?brand=tsb&key=… ----
async function openFromLink() {
  const q = new URLSearchParams(location.search);
  const key = q.get('key');
  if (!key) return;
  if (q.get('brand') && TEMPLATES[q.get('brand')]) {
    state.brand = q.get('brand');
    localStorage.setItem('studio:brand', state.brand);
    document.querySelectorAll('#brandTabs button').forEach((x) => x.classList.toggle('active', x.dataset.brand === state.brand));
  }
  try {
    const r = await fetch(`/api/studio/render?brand=${state.brand}&key=${encodeURIComponent(key)}&json=1`);
    const pack = await r.json();
    if (!r.ok) throw new Error(pack.error || r.status);
    openPack(pack);
  } catch (e) {
    toast(`Couldn't open that story: ${e.message}`);
  }
  history.replaceState(null, '', location.pathname);
}
document.querySelectorAll('#brandTabs button').forEach((x) => x.classList.toggle('active', x.dataset.brand === state.brand));
load();
openFromLink();
