// Copying that works on every phone browser. iPhone Safari and in-app browsers (Instagram,
// WhatsApp, Gmail) only copy inside the tap itself and often refuse the Clipboard API, so a
// ready string is copied with a selected text box first, then the Clipboard API. Text that
// is still being fetched goes through ClipboardItem, the one way to copy it in the same tap.
// If the browser still refuses, the text opens in a sheet, selected, with its own Copy button.

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
    if (selectCopy(textOrPromise)) return true;
    try {
      await navigator.clipboard.writeText(textOrPromise);
      return true;
    } catch {
      return false;
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
export function copySheet(text, title = 'Copy this text') {
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
        <button type="button" data-copy style="background:#f5b52d;color:#111;border:0;border-radius:10px;padding:10px 16px;font:700 15px system-ui,sans-serif;cursor:pointer">⧉ Copy</button>
        <span data-note style="font:13px system-ui,sans-serif;color:#aaa">If Copy doesn’t work, the text is selected — press and hold it, then Copy.</span>
      </div>`;
    document.body.appendChild(dlg);
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    dlg.querySelector('[data-copy]').addEventListener('click', async () => {
      const ta = dlg.querySelector('[data-text]');
      const ok = await copyText(ta.value);
      ta.focus();
      ta.select();
      dlg.querySelector('[data-note]').textContent = ok ? '✓ Copied — paste it into your AI.' : 'Your browser blocks copying here: the text is selected — press and hold it, then Copy.';
    });
  }
  dlg.querySelector('[data-title]').textContent = title;
  dlg.querySelector('[data-note]').textContent = 'If Copy doesn’t work, the text is selected — press and hold it, then Copy.';
  const ta = dlg.querySelector('[data-text]');
  ta.value = text;
  if (!dlg.open) dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '');
  ta.focus();
  ta.select();
  ta.scrollTop = 0;
}

// Copy, and when the browser refuses, open the sheet so the text is never lost.
export async function copyOrShow(textOrPromise, title) {
  const ok = await copyText(textOrPromise);
  if (!ok) copySheet(await textOrPromise, title);
  return ok;
}
