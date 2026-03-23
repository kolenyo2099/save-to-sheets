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
  // Count already-injected buttons to approximate position offset
  let positionCounter = document.querySelectorAll('.sts-save-btn').length;

  results.forEach(result => {
    if (result.querySelector('.sts-save-btn')) return;

    const titleEl   = result.querySelector('h3');
    const linkEl    = result.querySelector('a[href]');
    const snippetEl = result.querySelector('.VwiC3b, [data-sncf="1"], [data-sncf="2"]');

    if (!titleEl || !linkEl) return;

    const href = linkEl.href;
    if (!href || href.startsWith('https://www.google.com')) return;

    positionCounter++;
    const position = positionCounter; // captured in closure

    const btn = document.createElement('button');
    btn.className = 'sts-save-btn';
    btn.textContent = '💾';
    btn.title = 'Save to Google Sheets';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const { scriptUrl, userName, idPrefix, columns, fieldMapping } =
        await chrome.storage.sync.get(['scriptUrl', 'userName', 'idPrefix', 'columns', 'fieldMapping']);

      if (!scriptUrl) {
        showToast('⚙️ Please set your Apps Script URL in the extension options first.', 'warn');
        return;
      }

      btn.disabled = true;
      btn.textContent = '⏳';

      const id = await generateId(idPrefix, userName);

      const fields = {
        id,
        timestamp:       new Date().toISOString(),
        savedBy:         userName || 'Anonymous',
        query:           getCurrentQuery(),
        title:           titleEl.textContent.trim(),
        url:             href,
        snippet:         snippetEl ? snippetEl.textContent.trim() : '',
        domain:          (() => { try { return new URL(href).hostname; } catch { return ''; } })(),
        position:        String(position),
        // Page-level fields not available from search results
        metaDescription: '',
        ogTitle:         '',
        ogDescription:   '',
        ogType:          '',
        author:          '',
        publishDate:     '',
        canonicalUrl:    '',
        language:        '',
      };

      const payload = buildPayload(fields, columns, fieldMapping);

      try {
        const res = await fetch(scriptUrl, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'text/plain' } // avoids CORS preflight
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        btn.textContent = '✅';
        showToast(`✅ Saved: "${fields.title.slice(0, 60)}…"`, 'success');

      } catch (err) {
        btn.disabled = false;
        btn.textContent = '❌';
        showToast('❌ Could not save. Check your Apps Script URL in options.', 'error');
        setTimeout(() => { btn.textContent = '💾'; }, 3000);
      }
    });

    titleEl.parentElement.insertBefore(btn, titleEl.nextSibling);
  });
}

// Build the POST payload — dynamic (column-mapped array) or legacy fixed object
function buildPayload(fields, columns, fieldMapping) {
  if (columns && columns.length > 0) {
    const row = columns.map(col => {
      const key = fieldMapping && fieldMapping[col.id];
      return key && fields[key] !== undefined ? fields[key] : '';
    });
    return { action: 'data', row };
  }
  // Legacy format — works with both old and new Apps Script
  return {
    id:      fields.id,
    title:   fields.title,
    url:     fields.url,
    snippet: fields.snippet,
    query:   fields.query,
    savedBy: fields.savedBy,
  };
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

  const observer = new MutationObserver(() => {
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
