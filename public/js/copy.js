// Copying that works on every phone browser. A ready string goes through the Clipboard API
// inside the tap, or a selected text box where that API is missing (some in-app browsers);
// text still being fetched goes through ClipboardItem, the one way to copy it in the same
// tap. Phones can report a copy that never reached the clipboard, so on a touch screen, and
// whenever copying fails, the text also opens in a sheet with its own Copy button and
// press-and-hold to copy by hand.

function selectCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  // 16px stops iOS zooming in; off-screen and transparent so nothing flashes
  ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;font-size:16px;';
  // with a modal dialog open everything outside it is inert, so the box goes in the dialog
  // the tap came from (the top one), else the last one opened
  const open = [...document.querySelectorAll('dialog[open]')];
  (document.activeElement?.closest?.('dialog[open]') || open[open.length - 1] || document.body).appendChild(ta);
  const sel = document.getSelection();
  const saved = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
  ta.focus({ preventScroll: true });
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  // only trust execCommand when the box really holds the selection (an inert box can't)
  if (document.activeElement !== ta || ta.selectionEnd - ta.selectionStart !== text.length) {
    ta.remove();
    return false;
  }
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  if (saved && sel) {
    sel.removeAllRanges();
    sel.addRange(saved);
  }
  return ok;
}

// Call straight from the tap. Resolves true when the text is on the clipboard.
export async function copyText(textOrPromise) {
  if (typeof textOrPromise === 'string') {
    if (!navigator.clipboard?.writeText) return selectCopy(textOrPromise);
    try {
      await navigator.clipboard.writeText(textOrPromise);
      return true;
    } catch {
      return selectCopy(textOrPromise);
    }
  }
  if (window.ClipboardItem && navigator.clipboard?.write) {
    try {
      const blob = Promise.resolve(textOrPromise).then((t) => new Blob([t], { type: 'text/plain' }));
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return true;
    } catch {
      /* fall through */
    }
  }
  const text = await textOrPromise;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return selectCopy(text);
  }
}

// The fallback: the text in a sheet, selected, with a Copy button (a fresh tap, so it copies).
const HINT = 'press and hold the text → Select All → Copy.';
export function copySheet(text, title = 'Copy this text', copied = false) {
  let dlg = document.getElementById('copySheet');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'copySheet';
    dlg.style.cssText = 'width:min(640px,94vw);max-height:86vh;border:0;border-radius:14px;padding:16px;background:#16181d;color:#f2f2f2;box-shadow:0 20px 60px rgba(0,0,0,.6);';
    dlg.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px">
        <strong data-title style="font:600 16px system-ui,sans-serif"></strong>
        <button type="button" data-close style="background:none;border:0;color:#aaa;font-size:22px;cursor:pointer" aria-label="Close">×</button>
      </div>
      <textarea readonly data-text style="width:100%;height:52vh;box-sizing:border-box;font:13px/1.45 ui-monospace,Menlo,monospace;background:#0d0e11;color:#eaeaea;border:1px solid #333;border-radius:10px;padding:10px;resize:vertical"></textarea>
      <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
        <button type="button" data-copy style="background:#f5b52d;color:#111;border:0;border-radius:10px;padding:10px 16px;font:700 15px system-ui,sans-serif;cursor:pointer;white-space:nowrap;flex:none">⧉ Copy</button>
        <button type="button" data-share hidden style="background:#2a2d35;color:#fff;border:0;border-radius:10px;padding:10px 14px;font:600 15px system-ui,sans-serif;cursor:pointer;white-space:nowrap;flex:none">↗ Share</button>
        <span data-note style="font:13px system-ui,sans-serif;color:#aaa"></span>
      </div>`;
    document.body.appendChild(dlg);
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    // the phone's share menu: Copy, or straight into the ChatGPT / Gemini app
    const shareBtn = dlg.querySelector('[data-share]');
    shareBtn.hidden = typeof navigator.share !== 'function';
    shareBtn.addEventListener('click', () => navigator.share({ text: dlg.querySelector('[data-text]').value }).catch(() => {}));
    dlg.querySelector('[data-copy]').addEventListener('click', async () => {
      const ta = dlg.querySelector('[data-text]');
      const ok = await copyText(ta.value);
      ta.focus();
      ta.select();
      dlg.querySelector('[data-note]').textContent = ok ? `✓ Copied — paste it into your AI. If it doesn’t paste, ${HINT}` : `Your browser blocks copying here: ${HINT}`;
    });
  }
  dlg.querySelector('[data-title]').textContent = title;
  dlg.querySelector('[data-note]').textContent = copied ? `✓ Copied. If it doesn’t paste, tap Copy again — or ${HINT}` : `Tap Copy — or ${HINT}`;
  const ta = dlg.querySelector('[data-text]');
  ta.value = text;
  if (!dlg.open) dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '');
  ta.focus();
  ta.select();
  ta.scrollTop = 0;
}

// Copy, and open the sheet when the browser refuses or on a touch screen, so the text is
// never lost.
const touch = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
export async function copyOrShow(textOrPromise, title) {
  const ok = await copyText(textOrPromise);
  if (!ok || touch()) copySheet(await textOrPromise, title, ok);
  return ok;
}
