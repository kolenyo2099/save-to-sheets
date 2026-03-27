// Save to Sheets — content script
// Injects save buttons next to Google Search results and X.com / Twitter tweets

// ── Shared utilities ──────────────────────────────────────────────────────────

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
function buildPayload(fields, columns, fieldMapping) {
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
    return { action: 'data', rowData };
  }
  // Legacy fixed format (no custom columns configured)
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

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// ── Google Search ─────────────────────────────────────────────────────────────

let lastUrl = location.href;

function getCurrentQuery() {
  return new URLSearchParams(window.location.search).get('q') || '';
}

function addSaveButtons() {
  const results = document.querySelectorAll('div.g, div[data-hveid]');
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
    const position = positionCounter;

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
        metaDescription: '',
        ogTitle:         '',
        ogDescription:   '',
        ogType:          '',
        author:          '',
        publishDate:     '',
        canonicalUrl:    '',
        language:        '',
        // tweet fields not applicable
        tweetId: '', tweetText: '', authorName: '', authorUsername: '', tweetDate: '',
      };

      const payload = buildPayload(fields, columns, fieldMapping);

      try {
        const res = await fetch(scriptUrl, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'text/plain' }
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

function initGoogle() {
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

// ── X.com / Twitter ───────────────────────────────────────────────────────────

function extractTweetData(article) {
  // Permalink — the <a> wrapping the <time> element is the most reliable anchor
  const permalinkAnchor = article.querySelector('a[href*="/status/"] time')
    ?.closest('a[href*="/status/"]');
  const tweetPath = permalinkAnchor?.getAttribute('href') || '';
  const tweetId   = tweetPath.split('/status/')[1]?.split(/[/?#]/)[0] || '';
  const tweetUrl  = tweetId ? `https://${location.hostname}${tweetPath}` : location.href;

  // Tweet body
  const tweetText = article.querySelector('[data-testid="tweetText"]')?.innerText || '';

  // Author — User-Name block, first role="link" anchor = profile link
  const userBlock   = article.querySelector('[data-testid="User-Name"]');
  const profileLink = userBlock?.querySelector('a[role="link"]');
  const rawHandle   = profileLink?.getAttribute('href')?.replace(/^\//, '')?.split('/')[0] || '';
  const authorUsername = rawHandle ? `@${rawHandle}` : '';
  // Display name: nested span>span inside the profile link
  const authorName =
    profileLink?.querySelector('span > span')?.innerText ||
    profileLink?.querySelector('span')?.innerText || '';

  // Datetime from <time datetime="ISO string">
  const tweetDate = article.querySelector('time')?.getAttribute('datetime') || '';

  return { tweetId, tweetUrl, tweetText, authorName, authorUsername, tweetDate };
}

function addTweetSaveButtons() {
  document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
    if (article.querySelector('.sts-tweet-btn')) return;

    // Action bar = the [role="group"] that contains the reply button
    const replyBtn   = article.querySelector('[data-testid="reply"]');
    if (!replyBtn) return;
    const actionGroup = replyBtn.closest('[role="group"]');
    if (!actionGroup) return;

    const btn = document.createElement('button');
    btn.className = 'sts-tweet-btn';
    btn.textContent = '💾';
    btn.title = 'Save tweet to Google Sheets';
    btn.setAttribute('aria-label', 'Save to Sheets');

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const { scriptUrl, userName, idPrefix, columns, fieldMapping } =
        await chrome.storage.sync.get(['scriptUrl', 'userName', 'idPrefix', 'columns', 'fieldMapping']);

      if (!scriptUrl) {
        showToast('⚙️ Please set your Apps Script URL in extension options.', 'warn');
        return;
      }

      btn.disabled = true;
      btn.textContent = '⏳';

      const data = extractTweetData(article);
      const id   = await generateId(idPrefix, userName);

      const fields = {
        id,
        timestamp:      new Date().toISOString(),
        savedBy:        userName || 'Anonymous',
        // title = handle + first 100 chars of tweet — useful in default/legacy format
        title:          data.authorUsername
          ? `${data.authorUsername}: ${data.tweetText.slice(0, 100)}`
          : data.tweetText.slice(0, 100),
        url:            data.tweetUrl,
        domain:         location.hostname,
        tweetId:        data.tweetId,
        tweetText:      data.tweetText,
        authorName:     data.authorName,
        authorUsername: data.authorUsername,
        tweetDate:      data.tweetDate,
        // fields not applicable for tweets
        query: '', snippet: '', position: '',
        metaDescription: '', ogTitle: '', ogDescription: '', ogType: '',
        author: data.authorName, publishDate: data.tweetDate,
        canonicalUrl: data.tweetUrl, language: '',
      };

      const payload = buildPayload(fields, columns, fieldMapping);

      try {
        const res = await fetch(scriptUrl, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'text/plain' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        btn.textContent = '✅';
        showToast(
          `✅ Saved tweet${data.authorUsername ? ` by ${data.authorUsername}` : ''}`,
          'success'
        );
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '❌';
        showToast('❌ Could not save. Check your Apps Script URL in options.', 'error');
        setTimeout(() => { btn.textContent = '💾'; }, 3000);
      }
    });

    actionGroup.appendChild(btn);
  });
}

function initTwitter() {
  addTweetSaveButtons();

  // Debounce to avoid hammering addTweetSaveButtons on every micro-mutation
  const debouncedAdd = debounce(addTweetSaveButtons, 300);

  const observer = new MutationObserver(mutations => {
    if (mutations.some(m => m.addedNodes.length > 0)) debouncedAdd();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ── Entry point ───────────────────────────────────────────────────────────────

function init() {
  const host = location.hostname;
  if (host === 'x.com' || host === 'twitter.com') {
    initTwitter();
  } else {
    initGoogle();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
