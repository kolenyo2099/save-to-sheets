// Save to Sheets — content script
// Injects save buttons next to Google search results

async function generateId(prefix, userName) {
  if (!prefix) return '';
  const year = new Date().getFullYear();
  const { idSeq } = await chrome.storage.local.get('idSeq');
  const seq = (idSeq && idSeq.year === year) ? idSeq : { year, count: 0 };
  seq.count += 1;
  await chrome.storage.local.set({ idSeq: seq });
  const name = (userName || 'Anonymous').trim().split(/\s+/)[0];
  return `${prefix}-${year}-${name}-${String(seq.count).padStart(3, '0')}`;
}

let lastUrl = location.href;

function getCurrentQuery() {
  return new URLSearchParams(window.location.search).get('q') || '';
}

function addSaveButtons() {
  const results = document.querySelectorAll('div.g, div[data-hveid]');

  results.forEach(result => {
    // Avoid double-injecting
    if (result.querySelector('.sts-save-btn')) return;

    const titleEl = result.querySelector('h3');
    const linkEl = result.querySelector('a[href]');
    const snippetEl = result.querySelector('.VwiC3b, [data-sncf="1"], [data-sncf="2"]');

    if (!titleEl || !linkEl) return;

    // Filter out non-result links (e.g. image carousels, ads)
    const href = linkEl.href;
    if (!href || href.startsWith('https://www.google.com')) return;

    const btn = document.createElement('button');
    btn.className = 'sts-save-btn';
    btn.innerHTML = `<span class="sts-icon">💾</span><span class="sts-label">Save</span>`;
    btn.title = 'Save to Google Sheets';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const { scriptUrl, userName, idPrefix } = await chrome.storage.sync.get(['scriptUrl', 'userName', 'idPrefix']);

      if (!scriptUrl) {
        showToast('⚙️ Please set your Apps Script URL in the extension options first.', 'warn');
        return;
      }

      btn.disabled = true;
      btn.classList.add('sts-saving');
      btn.innerHTML = `<span class="sts-icon">⏳</span><span class="sts-label">Saving…</span>`;

      const id = await generateId(idPrefix, userName);
      const payload = {
        id,
        title: titleEl.textContent.trim(),
        url: href,
        snippet: snippetEl ? snippetEl.textContent.trim() : '',
        query: getCurrentQuery(),
        savedBy: userName || 'Anonymous'
      };

      try {
        const res = await fetch(scriptUrl, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'text/plain' } // avoids CORS preflight
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        btn.classList.remove('sts-saving');
        btn.classList.add('sts-saved');
        btn.innerHTML = `<span class="sts-icon">✅</span><span class="sts-label">Saved</span>`;
        showToast(`✅ Saved: "${payload.title.slice(0, 60)}…"`, 'success');

      } catch (err) {
        btn.disabled = false;
        btn.classList.remove('sts-saving');
        btn.classList.add('sts-error');
        btn.innerHTML = `<span class="sts-icon">❌</span><span class="sts-label">Error</span>`;
        showToast('❌ Could not save. Check your Apps Script URL in options.', 'error');
        setTimeout(() => {
          btn.classList.remove('sts-error');
          btn.innerHTML = `<span class="sts-icon">💾</span><span class="sts-label">Save</span>`;
        }, 3000);
      }
    });

    // Insert button after the title
    titleEl.parentElement.insertBefore(btn, titleEl.nextSibling);
  });
}

// Toast notification
let toastEl = null;
function showToast(message, type = 'info') {
  if (toastEl) toastEl.remove();
  toastEl = document.createElement('div');
  toastEl.className = `sts-toast sts-toast-${type}`;
  toastEl.textContent = message;
  document.body.appendChild(toastEl);
  setTimeout(() => { if (toastEl) toastEl.remove(); }, 4000);
}

// Google uses SPA navigation — watch for URL changes and DOM updates
function init() {
  addSaveButtons();

  // Re-run on DOM changes (lazy-loaded results, pagination)
  const observer = new MutationObserver(() => {
    // Also detect SPA navigation
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(addSaveButtons, 500);
    } else {
      addSaveButtons();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
