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

// Returns true if the extension context is still valid.
// Content scripts become "orphaned" (context invalidated) when the extension
// is reloaded while the tab is still open. Checking chrome.runtime.id is the
// lightest way to detect this before making any API calls.
function extensionContextAlive() {
  try { return !!chrome.runtime?.id; } catch { return false; }
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

      if (!extensionContextAlive()) {
        showToast('🔄 Extension was reloaded — please refresh this page.', 'warn');
        return;
      }

      const storageData = await chrome.storage.sync.get(['activeProjectId', 'projects']);
      const activeProjectId = storageData.activeProjectId || '';
      const proj = (storageData.projects && storageData.projects[activeProjectId]) || {};
      const { scriptUrl, userName, idPrefix, columns, fieldMapping, sheetName } = proj;

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

      const payload = buildPayload(fields, columns, fieldMapping, sheetName);

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

      if (!extensionContextAlive()) {
        showToast('🔄 Extension was reloaded — please refresh this page.', 'warn');
        return;
      }

      const storageData = await chrome.storage.sync.get(['activeProjectId', 'projects']);
      const activeProjectId = storageData.activeProjectId || '';
      const proj = (storageData.projects && storageData.projects[activeProjectId]) || {};
      const { scriptUrl, userName, idPrefix, columns, fieldMapping, sheetName } = proj;

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

      const payload = buildPayload(fields, columns, fieldMapping, sheetName);

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

// ── YouTube ───────────────────────────────────────────────────────────────────

function extractYouTubeData() {
  const videoId  = new URLSearchParams(location.search).get('v') || '';
  const videoUrl = location.href;

  // Title — yt-formatted-string inside h1, fallback to document.title
  const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string')
    || document.querySelector('#title h1 yt-formatted-string')
    || document.querySelector('h1 yt-formatted-string');
  const title = titleEl?.textContent?.trim()
    || document.title.replace(/\s*[-–]\s*YouTube\s*$/, '').trim();

  // View count — prefer full number, fall back to abbreviated
  const viewCount =
    document.querySelector('span.view-count')?.textContent?.trim()
    || document.querySelector('span.short-view-count')?.textContent?.trim()
    || '';

  // Channel name + URL
  const channelAnchor = document.querySelector('#channel-name a')
    || document.querySelector('ytd-channel-name a');
  const channelName = channelAnchor?.textContent?.trim() || '';
  const channelHref = channelAnchor?.getAttribute('href') || '';
  const channelUrl  = channelHref
    ? new URL(channelHref, location.origin).href
    : '';

  // Description — grab collapsed text; good enough for logging purposes
  const descEl = document.querySelector('ytd-expandable-video-description-body-renderer');
  const videoDescription = descEl?.textContent?.trim() || '';

  // Upload date + duration from JSON-LD (most reliable)
  let uploadDate = '';
  let duration   = '';
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
    try {
      const data = JSON.parse(s.textContent);
      if (data['@type'] === 'VideoObject') {
        uploadDate = data.uploadDate || data.datePublished || '';
        duration   = data.duration   || '';           // ISO 8601, e.g. PT4M13S
      }
    } catch {}
  });

  return { videoId, videoUrl, title, viewCount, channelName, channelUrl, videoDescription, uploadDate, duration };
}

function addYouTubeSaveButton() {
  if (!location.pathname.startsWith('/watch')) return;
  if (document.querySelector('.sts-yt-btn')) return;

  // Like/dislike bar — try a few selector paths YouTube has used
  const actionsEl = document.querySelector('#actions #top-level-buttons-computed')
    || document.querySelector('#top-level-buttons-computed')
    || document.querySelector('#actions');
  if (!actionsEl) return;

  const btn = document.createElement('button');
  btn.className = 'sts-yt-btn';
  btn.textContent = '💾';
  btn.title = 'Save video to Google Sheets';
  btn.setAttribute('aria-label', 'Save to Sheets');

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!extensionContextAlive()) {
      showToast('🔄 Extension was reloaded — please refresh this page.', 'warn');
      return;
    }

    const storageData = await chrome.storage.sync.get(['activeProjectId', 'projects']);
    const activeProjectId = storageData.activeProjectId || '';
    const proj = (storageData.projects && storageData.projects[activeProjectId]) || {};
    const { scriptUrl, userName, idPrefix, columns, fieldMapping, sheetName } = proj;

    if (!scriptUrl) {
      showToast('⚙️ Please set your Apps Script URL in extension options.', 'warn');
      return;
    }

    btn.disabled  = true;
    btn.textContent = '⏳';

    const data = extractYouTubeData();
    const id   = await generateId(idPrefix, userName);

    const fields = {
      id,
      timestamp:        new Date().toISOString(),
      savedBy:          userName || 'Anonymous',
      title:            data.title,
      url:              data.videoUrl,
      domain:           location.hostname,
      videoId:          data.videoId,
      channelName:      data.channelName,
      channelUrl:       data.channelUrl,
      viewCount:        data.viewCount,
      videoDescription: data.videoDescription,
      uploadDate:       data.uploadDate,
      duration:         data.duration,
      // fields not applicable for YouTube
      query: '', snippet: '', position: '',
      metaDescription: '', ogTitle: '', ogDescription: '', ogType: '',
      author: data.channelName, publishDate: data.uploadDate,
      canonicalUrl: data.videoUrl, language: '',
      tweetId: '', tweetText: '', authorName: '', authorUsername: '', tweetDate: '',
    };

    const payload = buildPayload(fields, columns, fieldMapping, sheetName);

    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      btn.textContent = '✅';
      showToast(`✅ Saved: "${data.title.slice(0, 60)}"`, 'success');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = '❌';
      showToast('❌ Could not save. Check your Apps Script URL in options.', 'error');
      setTimeout(() => { btn.textContent = '💾'; }, 3000);
    }
  });

  actionsEl.appendChild(btn);
}

function initYouTube() {
  const debouncedAdd = debounce(addYouTubeSaveButton, 600);

  // YouTube fires this custom event on SPA navigation (new video loaded)
  document.addEventListener('yt-navigate-finish', () => {
    document.querySelectorAll('.sts-yt-btn').forEach(b => b.remove());
    if (location.pathname.startsWith('/watch')) debouncedAdd();
  });

  // MutationObserver as fallback for initial load and slow renders
  const observer = new MutationObserver(mutations => {
    if (
      location.pathname.startsWith('/watch') &&
      !document.querySelector('.sts-yt-btn') &&
      mutations.some(m => m.addedNodes.length > 0)
    ) {
      debouncedAdd();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Attempt immediately (may already be rendered)
  debouncedAdd();
}

// ── Facebook ──────────────────────────────────────────────────────────────────

function isFacebookPostPage() {
  const path   = location.pathname;
  const search = location.search;
  return path.includes('/posts/')
    || path.includes('/videos/')
    || path.includes('/photos/')
    || /\/permalink(\.php)?/.test(path)
    || search.includes('story_fbid=');
}

function extractFacebookData() {
  const postUrl = location.href;

  // Post ID — several URL formats exist
  const postId =
    location.pathname.match(/\/posts\/([^/?#]+)/)?.[1]
    || location.pathname.match(/\/videos\/([^/?#]+)/)?.[1]
    || location.pathname.match(/\/photos\/([^/?#]+)/)?.[1]
    || new URLSearchParams(location.search).get('story_fbid')
    || '';

  // Post text — data-testid is more stable than hashed class names
  const postTextEl =
    document.querySelector('[data-testid="post_message"]')
    || document.querySelector('[data-ad-preview="message"]');
  const postText = postTextEl?.innerText?.trim() || '';

  // Author name
  const authorEl =
    document.querySelector('[data-testid="actor-name"]')
    || document.querySelector('h2 strong a')
    || document.querySelector('h3 strong a');
  const authorName = authorEl?.innerText?.trim() || '';

  // Post date — time[datetime] is most reliable (ISO string); fall back to
  // data-utime (Unix seconds) or abbr[title] (human-readable)
  let postDate = '';
  const timeEl =
    document.querySelector('time[datetime]')
    || document.querySelector('abbr[data-utime]')
    || document.querySelector('abbr[title]');
  if (timeEl) {
    const raw =
      timeEl.getAttribute('datetime')
      || timeEl.getAttribute('data-utime')
      || timeEl.getAttribute('title')
      || '';
    postDate = /^\d{10}$/.test(raw)
      ? new Date(parseInt(raw, 10) * 1000).toISOString()
      : raw;
  }

  // Reaction count — first aria-label matching "reactions" pattern
  let reactionCount = '';
  for (const el of document.querySelectorAll('[aria-label]')) {
    const label = el.getAttribute('aria-label') || '';
    const m =
      label.match(/^([\d,]+)\s*(?:people\s+)?reaction/i)
      || label.match(/All reactions:\s*([\d,]+)/i);
    if (m) { reactionCount = m[1].replace(/,/g, ''); break; }
  }

  return { postId, postUrl, postText, authorName, postDate, reactionCount };
}

function addFacebookSaveButton() {
  if (!isFacebookPostPage()) return;
  if (document.querySelector('.sts-fb-btn')) return;

  // Anchor on the Like button, then climb to the action bar row
  const likeBtn =
    document.querySelector('[aria-label="Like"][role="button"]')
    || document.querySelector('[aria-label^="Like"][type="button"]');
  if (!likeBtn) return;

  const actionBar =
    likeBtn.closest('[role="toolbar"]')
    || likeBtn.parentElement?.parentElement;
  if (!actionBar) return;

  const btn = document.createElement('button');
  btn.className = 'sts-fb-btn';
  btn.textContent = '💾';
  btn.title = 'Save post to Google Sheets';
  btn.setAttribute('aria-label', 'Save to Sheets');

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!extensionContextAlive()) {
      showToast('🔄 Extension was reloaded — please refresh this page.', 'warn');
      return;
    }

    const storageData = await chrome.storage.sync.get(['activeProjectId', 'projects']);
    const activeProjectId = storageData.activeProjectId || '';
    const proj = (storageData.projects && storageData.projects[activeProjectId]) || {};
    const { scriptUrl, userName, idPrefix, columns, fieldMapping, sheetName } = proj;

    if (!scriptUrl) {
      showToast('⚙️ Please set your Apps Script URL in extension options.', 'warn');
      return;
    }

    btn.disabled = true;
    btn.textContent = '⏳';

    const data = extractFacebookData();
    const id   = await generateId(idPrefix, userName);

    const fields = {
      id,
      timestamp:       new Date().toISOString(),
      savedBy:         userName || 'Anonymous',
      title:           data.authorName
        ? `${data.authorName}: ${data.postText.slice(0, 100)}`
        : data.postText.slice(0, 100),
      url:             data.postUrl,
      domain:          location.hostname,
      // generic page-level aliases so existing generic columns resolve
      author:          data.authorName,
      publishDate:     data.postDate,
      canonicalUrl:    data.postUrl,
      language:        '',
      metaDescription: '', ogTitle: '', ogDescription: '', ogType: '',
      query: '', snippet: '', position: '',
      // Facebook-specific
      fbPostId:        data.postId,
      fbAuthorName:    data.authorName,
      fbPostText:      data.postText,
      fbPostDate:      data.postDate,
      fbReactionCount: data.reactionCount,
    };

    const payload = buildPayload(fields, columns, fieldMapping, sheetName);

    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      btn.textContent = '✅';
      showToast(
        `✅ Saved post${data.authorName ? ` by ${data.authorName}` : ''}`,
        'success'
      );
    } catch (err) {
      btn.disabled = false;
      btn.textContent = '❌';
      showToast('❌ Could not save. Check your Apps Script URL in options.', 'error');
      setTimeout(() => { btn.textContent = '💾'; }, 3000);
    }
  });

  actionBar.appendChild(btn);
}

function initFacebook() {
  const debouncedAdd = debounce(addFacebookSaveButton, 800);
  let lastFbUrl = location.href;

  // Facebook is a SPA — catch URL changes (pushState) via MutationObserver
  const observer = new MutationObserver(mutations => {
    if (location.href !== lastFbUrl) {
      lastFbUrl = location.href;
      document.querySelectorAll('.sts-fb-btn').forEach(b => b.remove());
    }
    if (
      isFacebookPostPage() &&
      !document.querySelector('.sts-fb-btn') &&
      mutations.some(m => m.addedNodes.length > 0)
    ) {
      debouncedAdd();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  debouncedAdd();
}

// ── Entry point ───────────────────────────────────────────────────────────────

function init() {
  const host = location.hostname;
  if (host === 'x.com' || host === 'twitter.com') {
    initTwitter();
  } else if (host === 'www.youtube.com') {
    initYouTube();
  } else if (host === 'www.facebook.com') {
    initFacebook();
  } else {
    initGoogle();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
