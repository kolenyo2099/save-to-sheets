// Save to Sheets — background service worker
// Handles the right-click context menu for saving links and pages on any site

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

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sts-save-link',
    title: 'Save link to Sheets',
    contexts: ['link']
  });
  chrome.contextMenus.create({
    id: 'sts-save-page',
    title: 'Save page to Sheets',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { scriptUrl, userName, idPrefix } = await chrome.storage.sync.get(['scriptUrl', 'userName', 'idPrefix']);

  if (!scriptUrl) {
    flashBadge('!', '#c53030');
    return;
  }

  let payload;

  if (info.menuItemId === 'sts-save-link') {
    // Try to read the link's text content, set by context-tracker.js
    let linkText = '';
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.__stsContext?.linkText ?? ''
      });
      linkText = result?.value ?? '';
    } catch { /* restricted page (chrome://, pdf, etc.) — proceed without link text */ }

    const id = await generateId(idPrefix, userName);
    payload = {
      id,
      title: linkText,
      url: info.linkUrl,
      snippet: '',
      query: '',
      savedBy: userName || 'Anonymous'
    };

  } else {
    // sts-save-page: tab.title is always available
    const id = await generateId(idPrefix, userName);
    payload = {
      id,
      title: tab.title || '',
      url: tab.url,
      snippet: '',
      query: '',
      savedBy: userName || 'Anonymous'
    };
  }

  let success = false;
  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    success = true;
  } catch { /* network or server error */ }

  // Inject a toast into the page; fall back to badge on restricted pages
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (msg, ok) => {
        const id = '__sts_bg_toast__';
        document.getElementById(id)?.remove();
        const el = document.createElement('div');
        el.id = id;
        el.textContent = msg;
        Object.assign(el.style, {
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: '2147483647',
          padding: '10px 16px',
          borderRadius: '6px',
          background: ok ? '#276749' : '#c53030',
          color: '#fff',
          fontSize: '14px',
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          pointerEvents: 'none'
        });
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
      },
      args: [
        success
          ? `\u2705 Saved: "${(payload.title || payload.url).slice(0, 60)}"`
          : '\u274C Save failed. Check your Apps Script URL in options.',
        success
      ]
    });
  } catch {
    flashBadge(success ? '\u2713' : '!', success ? '#276749' : '#c53030');
  }
});

function flashBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);
}
