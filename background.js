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

// Build the POST payload — dynamic (name-keyed rowData) or legacy fixed object
function buildPayload(fields, columns, fieldMapping, sheetName = '') {
  if (columns && columns.length > 0) {
    const rowData = {};
    columns.forEach(col => {
      if (!col.name) return; // skip columns with no header name
      const mapping = (fieldMapping && fieldMapping[col.id]) || '';
      if (mapping.startsWith('__static__:')) {
        // Literal value typed by the user in the options UI
        rowData[col.name] = mapping.slice('__static__:'.length);
      } else if (mapping && fields[mapping] !== undefined) {
        // Map to a known extracted field
        rowData[col.name] = fields[mapping];
      }
      // Unmapped columns are simply omitted; Apps Script leaves them blank
    });
    return { action: 'data', rowData, sheetName };
  }
  // Legacy fixed format (no custom columns configured)
  return {
    id:      fields.id,
    title:   fields.title,
    url:     fields.url,
    snippet: fields.snippet,
    query:   fields.query,
    savedBy: fields.savedBy,
    sheetName: sheetName,
  };
}

function isPdfUrl(url = '') {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return /\.pdf(?:[?#]|$)/i.test(url);
  }
}

function isImageUrl(url = '') {
  try {
    const parsed = new URL(url);
    return /\.(?:apng|avif|bmp|gif|jpe?g|png|svg|webp)(?:$)/i.test(parsed.pathname);
  } catch {
    return /\.(?:apng|avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(url);
  }
}

function getEmbeddedPdfUrl(url = '') {
  try {
    const parsed = new URL(url);
    const src = parsed.searchParams.get('src');
    return src || '';
  } catch {
    return '';
  }
}

function getPdfUrl(info = {}, tab = {}) {
  const candidates = [tab.url, info.pageUrl, info.frameUrl].filter(Boolean);

  for (const candidate of candidates) {
    const embeddedPdfUrl = getEmbeddedPdfUrl(candidate);
    if (embeddedPdfUrl) return embeddedPdfUrl;
  }

  for (const candidate of candidates) {
    if (isPdfUrl(candidate)) return candidate;
  }

  return /\.pdf\b/i.test(tab.title || '') ? (tab.url || info.pageUrl || '') : '';
}

function getFilenameTitle(url = '') {
  try {
    const pathname = new URL(url).pathname;
    const filename = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
    return filename.trim();
  } catch {
    const filename = url.split(/[?#]/)[0].split('/').filter(Boolean).pop() || '';
    return decodeURIComponent(filename).trim();
  }
}

function getPdfFallbackTitle(tab, pdfUrl = '') {
  const title = (tab.title || '').replace(/\s*[-–]\s*.*PDF.*$/i, '').trim();
  if (title && !/^about:blank$/i.test(title)) return title;

  try {
    const pathname = new URL(pdfUrl || tab.url || '').pathname;
    const filename = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
    return filename.replace(/\.pdf$/i, '').trim();
  } catch {
    return '';
  }
}

async function promptForPdfTitleAndSave({ defaultTitle, pendingSave }) {
  const requestId = crypto.randomUUID();
  const promptUrl = chrome.runtime.getURL(
    `pdf-title.html?requestId=${encodeURIComponent(requestId)}&title=${encodeURIComponent(defaultTitle || '')}`
  );

  await chrome.storage.session.set({
    [`pdfSave:${requestId}`]: pendingSave
  });

  try {
    const win = await chrome.windows.create({
      url: promptUrl,
      type: 'popup',
      width: 420,
      height: 220,
      focused: true
    });
    await chrome.storage.session.set({
      [`pdfSaveWindow:${requestId}`]: win?.id
    });
  } catch {
    await chrome.storage.session.remove(`pdfSave:${requestId}`);
    flashBadge('!', '#c53030');
  }
}

function getPendingPdfTitle(tab, pdfUrl = '') {
  return getPdfFallbackTitle(tab, pdfUrl);
}

function getPageSaveUrl(info, tab) {
  const pdfUrl = getPdfUrl(info, tab);
  if (pdfUrl) return pdfUrl;

  if (info.srcUrl && isImageUrl(info.srcUrl)) return info.srcUrl;
  return tab.url || '';
}

async function saveFields({ fields, scriptUrl, columns, fieldMapping, sheetName, tabId }) {
  const payload = buildPayload(fields, columns, fieldMapping, sheetName);

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

  await notifySaveResult(tabId, fields, success);
}

async function notifySaveResult(tabId, fields, success) {
  // Inject a toast into the page; fall back to badge on restricted pages
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
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
          ? `\u2705 Saved: "${(fields.title || fields.url).slice(0, 60)}"`
          : '\u274C Save failed. Check your Apps Script URL in options.',
        success
      ]
    });
  } catch {
    flashBadge(success ? '\u2713' : '!', success ? '#276749' : '#c53030');
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'sts-pdf-title-response' || !message.requestId) return;

  (async () => {
    const pendingKey = `pdfSave:${message.requestId}`;
    const windowKey = `pdfSaveWindow:${message.requestId}`;
    const data = await chrome.storage.session.get([pendingKey, windowKey]);
    const pendingSave = data[pendingKey];
    const windowId = data[windowKey];
    await chrome.storage.session.remove([pendingKey, windowKey]);

    if (typeof windowId === 'number') {
      chrome.windows.remove(windowId).catch(() => {});
    }

    if (!pendingSave) {
      flashBadge('!', '#c53030');
      return;
    }

    const title = typeof message.title === 'string' ? message.title.trim() : '';
    if (!title) {
      flashBadge('x', '#718096');
      return;
    }

    pendingSave.fields.title = title;
    await saveFields(pendingSave);
  })();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sts-save-link',
    title: 'Save link to Sheets',
    contexts: ['link']
  });
  chrome.contextMenus.create({
    id: 'sts-save-page',
    title: 'Save page to Sheets',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const storageData = await chrome.storage.sync.get(['activeProjectId', 'projects']);
  const activeProjectId = storageData.activeProjectId || '';
  const proj = (storageData.projects && storageData.projects[activeProjectId]) || {};
  const { scriptUrl, userName, idPrefix, columns, fieldMapping, sheetName } = proj;

  if (!scriptUrl) {
    flashBadge('!', '#c53030');
    return;
  }

  const id = await generateId(idPrefix, userName);
  let fields;

  if (info.menuItemId === 'sts-save-link') {
    // Try to read the link's text content, set by context-tracker.js
    let linkText = '';
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.__stsContext?.linkText ?? ''
      });
      linkText = result?.value ?? '';
    } catch { /* restricted page (chrome://, pdf, etc.) */ }

    const url = info.linkUrl;
    const pdfUrl = isPdfUrl(url) ? url : '';

    fields = {
      id,
      timestamp:       new Date().toISOString(),
      savedBy:         userName || 'Anonymous',
      query:           '',
      title:           linkText,
      url,
      snippet:         '',
      domain:          (() => { try { return new URL(url).hostname; } catch { return ''; } })(),
      position:        '',
      metaDescription: '',
      ogTitle:         '',
      ogDescription:   '',
      ogType:          '',
      author:          '',
      publishDate:     '',
      canonicalUrl:    '',
      language:        '',
      tweetId:         '',
      tweetText:       '',
      authorName:      '',
      authorUsername:  '',
      tweetDate:       '',
    };

    if (pdfUrl) {
      await promptForPdfTitleAndSave({
        defaultTitle: getPendingPdfTitle(tab, pdfUrl),
        pendingSave: { fields, scriptUrl, columns, fieldMapping, sheetName, tabId: tab.id }
      });
      return;
    }

  } else {
    // sts-save-page — extract page metadata via scripting
    let pageMeta = {};
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const getMeta = (name) =>
            document.querySelector(`meta[name="${name}"]`)?.content ||
            document.querySelector(`meta[property="${name}"]`)?.content || '';
          return {
            metaDescription: getMeta('description'),
            ogTitle:         getMeta('og:title'),
            ogDescription:   getMeta('og:description'),
            ogType:          getMeta('og:type'),
            author:          getMeta('author') || getMeta('article:author'),
            publishDate:     getMeta('article:published_time') || getMeta('date') || getMeta('pubdate') || '',
            canonicalUrl:    document.querySelector('link[rel="canonical"]')?.href || '',
            language:        document.documentElement.lang || '',
          };
        }
      });
      pageMeta = result?.value || {};
    } catch { /* restricted page */ }

    const pdfUrl = getPdfUrl(info, tab);
    const url = pdfUrl || getPageSaveUrl(info, tab);
    const imageTitle = isImageUrl(url) ? getFilenameTitle(url) : undefined;

    fields = {
      id,
      timestamp:       new Date().toISOString(),
      savedBy:         userName || 'Anonymous',
      query:           '',
      title:           imageTitle !== undefined ? imageTitle : (tab.title || ''),
      url,
      snippet:         '',
      domain:          (() => { try { return new URL(url).hostname; } catch { return ''; } })(),
      position:        '',
      tweetId:         '',
      tweetText:       '',
      authorName:      '',
      authorUsername:  '',
      tweetDate:       '',
      ...pageMeta,
    };

    if (pdfUrl) {
      await promptForPdfTitleAndSave({
        defaultTitle: getPendingPdfTitle(tab, url),
        pendingSave: { fields, scriptUrl, columns, fieldMapping, sheetName, tabId: tab.id }
      });
      return;
    }
  }

  await saveFields({ fields, scriptUrl, columns, fieldMapping, sheetName, tabId: tab.id });
});

function flashBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);
}
