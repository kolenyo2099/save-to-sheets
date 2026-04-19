// ── Available fields definition ───────────────────────────────────────────────
const AVAILABLE_FIELDS = [
  { key: 'id',              label: 'ID (auto-generated)',     ctx: 'all' },
  { key: 'timestamp',       label: 'Timestamp',               ctx: 'all' },
  { key: 'savedBy',         label: 'Saved By',                ctx: 'all' },
  { key: 'title',           label: 'Title',                   ctx: 'all' },
  { key: 'url',             label: 'URL',                     ctx: 'all' },
  { key: 'domain',          label: 'Domain',                  ctx: 'all' },
  { key: 'query',           label: 'Search Query',            ctx: 'search' },
  { key: 'snippet',         label: 'Snippet / Description',   ctx: 'search' },
  { key: 'position',        label: 'Search Result Position',  ctx: 'search' },
  { key: 'metaDescription', label: 'Meta Description',        ctx: 'page' },
  { key: 'ogTitle',         label: 'OG Title',                ctx: 'page' },
  { key: 'ogDescription',   label: 'OG Description',          ctx: 'page' },
  { key: 'ogType',          label: 'Content Type (OG)',        ctx: 'page' },
  { key: 'author',          label: 'Author',                  ctx: 'page' },
  { key: 'publishDate',     label: 'Published Date',          ctx: 'page' },
  { key: 'canonicalUrl',    label: 'Canonical URL',           ctx: 'page' },
  { key: 'language',        label: 'Page Language',           ctx: 'page' },
  { key: 'tweetId',          label: 'Tweet ID',                ctx: 'tweet' },
  { key: 'tweetText',        label: 'Tweet Text',              ctx: 'tweet' },
  { key: 'authorName',       label: 'Author Display Name',     ctx: 'tweet' },
  { key: 'authorUsername',   label: 'Author @handle',          ctx: 'tweet' },
  { key: 'tweetDate',        label: 'Tweet Date/Time',         ctx: 'tweet' },
  { key: 'videoId',          label: 'Video ID',                ctx: 'youtube' },
  { key: 'channelName',      label: 'Channel Name',            ctx: 'youtube' },
  { key: 'channelUrl',       label: 'Channel URL',             ctx: 'youtube' },
  { key: 'viewCount',        label: 'View Count',              ctx: 'youtube' },
  { key: 'videoDescription', label: 'Video Description',       ctx: 'youtube' },
  { key: 'uploadDate',       label: 'Upload Date',             ctx: 'youtube' },
  { key: 'duration',         label: 'Duration (ISO 8601)',      ctx: 'youtube' },
  { key: 'fbPostId',         label: 'Post ID',                 ctx: 'facebook' },
  { key: 'fbAuthorName',     label: 'Author Name',             ctx: 'facebook' },
  { key: 'fbPostText',       label: 'Post Text',               ctx: 'facebook' },
  { key: 'fbPostDate',       label: 'Post Date',               ctx: 'facebook' },
  { key: 'fbReactionCount',  label: 'Reaction Count',          ctx: 'facebook' },
];

const CTX_LABELS = {
  all:      'All contexts',
  search:   'Search only',
  page:     'Save page',
  tweet:    'Tweet (X.com)',
  youtube:  'YouTube',
  facebook: 'Facebook',
};

// ── Auto-map a column name to a known field key ───────────────────────────────
function autoMapField(name) {
  const n = name.toLowerCase().trim();
  const map = {
    'id': 'id',
    'timestamp': 'timestamp', 'date': 'timestamp', 'time': 'timestamp', 'saved at': 'timestamp',
    'saved by': 'savedBy', 'savedby': 'savedBy', 'user': 'savedBy', 'name': 'savedBy',
    'title': 'title', 'page title': 'title',
    'url': 'url', 'link': 'url',
    'domain': 'domain', 'source': 'domain', 'site': 'domain',
    'query': 'query', 'search query': 'query', 'search': 'query',
    'snippet': 'snippet', 'description': 'snippet', 'excerpt': 'snippet',
    'position': 'position', 'rank': 'position', 'result position': 'position',
    'meta description': 'metaDescription', 'meta desc': 'metaDescription',
    'og title': 'ogTitle',
    'og description': 'ogDescription',
    'og type': 'ogType', 'content type': 'ogType', 'type': 'ogType',
    'author': 'author', 'by': 'author',
    'published date': 'publishDate', 'publish date': 'publishDate', 'published': 'publishDate',
    'canonical url': 'canonicalUrl', 'canonical': 'canonicalUrl',
    'language': 'language', 'lang': 'language', 'page language': 'language',
    'tweet id': 'tweetId', 'tweetid': 'tweetId',
    'tweet text': 'tweetText', 'tweet content': 'tweetText', 'tweet': 'tweetText',
    'author display name': 'authorName', 'display name': 'authorName',
    'handle': 'authorUsername', 'username': 'authorUsername', '@handle': 'authorUsername', 'author handle': 'authorUsername',
    'tweet date': 'tweetDate', 'tweet time': 'tweetDate', 'tweet date/time': 'tweetDate',
    'video id': 'videoId', 'videoid': 'videoId', 'youtube id': 'videoId',
    'channel': 'channelName', 'channel name': 'channelName',
    'channel url': 'channelUrl', 'channel link': 'channelUrl',
    'views': 'viewCount', 'view count': 'viewCount',
    'video description': 'videoDescription', 'video desc': 'videoDescription',
    'upload date': 'uploadDate', 'uploaded': 'uploadDate', 'published date': 'uploadDate',
    'duration': 'duration', 'length': 'duration', 'video length': 'duration',
    'post id': 'fbPostId', 'fb post id': 'fbPostId', 'facebook post id': 'fbPostId',
    'post text': 'fbPostText', 'fb post text': 'fbPostText', 'post content': 'fbPostText',
    'post date': 'fbPostDate', 'fb post date': 'fbPostDate', 'facebook date': 'fbPostDate',
    'reactions': 'fbReactionCount', 'reaction count': 'fbReactionCount', 'likes': 'fbReactionCount',
    'fb author': 'fbAuthorName', 'facebook author': 'fbAuthorName', 'poster': 'fbAuthorName',
  };
  return map[n] || '';
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Project storage schema ────────────────────────────────────────────────────
// chrome.storage.sync layout:
// {
//   activeProjectId: string,
//   projects: {
//     [id]: {
//       name: string,
//       scriptUrl: string,
//       sheetName: string,       // selected tab name, '' = first sheet
//       userName: string,
//       idPrefix: string,
//       columns: Array,
//       fieldMapping: Object
//     }
//   }
// }

let allProjects    = {};   // { [id]: projectConfig }
let activeProjectId = '';
let localColumns     = [];
let localFieldMapping = {};

function getActiveProject() {
  return allProjects[activeProjectId] || {};
}

// ── Auto-save ─────────────────────────────────────────────────────────────────
let _autoSaveTimer;
let _autoSaveReady = false;

function scheduleAutoSave() {
  if (!_autoSaveReady) return;
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    persistActiveProject(() => {
      const el = document.getElementById('autoSaveStatus');
      if (!el) return;
      el.textContent = '✓ Saved';
      setTimeout(() => { el.textContent = ''; }, 2000);
    });
  }, 400);
}

function persistActiveProject(cb) {
  if (!activeProjectId) return;
  const scriptUrl = document.getElementById('scriptUrl').value.trim();
  const userName  = document.getElementById('userName').value.trim();
  const idPrefix  = document.getElementById('idPrefix').value.trim();
  const sheetName = document.getElementById('sheetSelect')?.value || '';

  allProjects[activeProjectId] = {
    ...allProjects[activeProjectId],
    scriptUrl, userName, idPrefix, sheetName,
    columns: localColumns,
    fieldMapping: localFieldMapping,
  };

  chrome.storage.sync.set({ activeProjectId, projects: allProjects }, cb || (() => {}));
}

// ── Project manager UI ────────────────────────────────────────────────────────
function renderProjectDropdown() {
  const sel = document.getElementById('projectSelect');
  sel.innerHTML = '';
  Object.entries(allProjects).forEach(([id, proj]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = proj.name || 'Untitled Project';
    if (id === activeProjectId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function loadProjectIntoUI(id) {
  const proj = allProjects[id] || {};
  activeProjectId = id;

  document.getElementById('scriptUrl').value = proj.scriptUrl || '';
  document.getElementById('userName').value  = proj.userName  || '';
  document.getElementById('idPrefix').value  = proj.idPrefix  || '';

  localColumns      = proj.columns      || [];
  localFieldMapping = proj.fieldMapping || {};

  renderColumns();
  updatePreview();

  // Reset sheet dropdown and reload tabs if URL is set
  resetSheetDropdown();
  if (proj.scriptUrl) {
    fetchSheetTabsAndRender(proj.scriptUrl, proj.sheetName || '');
  }

  document.getElementById('status').textContent        = '';
  document.getElementById('columnsStatus').textContent = '';
}

function resetSheetDropdown() {
  const wrap = document.getElementById('sheetSelectWrap');
  const sel  = document.getElementById('sheetSelect');
  if (sel) sel.innerHTML = '<option value="">Loading tabs…</option>';
  wrap.style.display = 'none';
}

// ── Fetch available sheet tabs ────────────────────────────────────────────────
async function fetchSheetTabsAndRender(scriptUrl, currentSheetName) {
  const wrap   = document.getElementById('sheetSelectWrap');
  const sel    = document.getElementById('sheetSelect');
  const status = document.getElementById('sheetSelectStatus');

  if (!scriptUrl) return;

  sel.innerHTML = '<option value="">— loading tabs… —</option>';
  wrap.style.display = '';
  status.textContent = '';

  try {
    const res  = await fetch(scriptUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (!data || !Array.isArray(data.sheets)) {
      // Old script version — just allow manual typing
      sel.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '— default sheet (upgrade script for tab list) —';
      sel.appendChild(opt);
      wrap.style.display = '';
      return;
    }

    sel.innerHTML = '';
    // Add "any" option using first sheet
    const firstOpt = document.createElement('option');
    firstOpt.value = '';
    firstOpt.textContent = `— use default (${data.sheets[0] || 'Sheet1'}) —`;
    sel.appendChild(firstOpt);

    data.sheets.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === currentSheetName) opt.selected = true;
      sel.appendChild(opt);
    });

    if (!currentSheetName && data.sheets.length > 0) {
      // leave "default" selected
    }

    wrap.style.display = '';
    status.textContent = `${data.sheets.length} tab${data.sheets.length !== 1 ? 's' : ''} found`;
    setTimeout(() => { status.textContent = ''; }, 3000);
  } catch (err) {
    sel.innerHTML = '<option value="">— could not load tabs —</option>';
    wrap.style.display = '';
    status.textContent = `⚠ ${err.message}`;
  }
}

// ── Column designer ───────────────────────────────────────────────────────────
function renderColumns() {
  const list = document.getElementById('columnsList');
  list.innerHTML = '';

  if (localColumns.length === 0) {
    list.innerHTML = `
      <div style="background:#f8f9fa; border:1px solid #dadce0; border-radius:8px; padding:14px 16px;">
        <p style="font-size:13px; color:#202124; font-weight:500; margin-bottom:6px;">Using default column structure</p>
        <p style="font-size:12px; color:#5f6368; line-height:1.6;">
          No custom columns defined. The extension will save in this fixed order:<br>
          <span style="font-family:monospace; font-size:11px; color:#1a73e8;">
            ID &nbsp;·&nbsp; Timestamp &nbsp;·&nbsp; Saved By &nbsp;·&nbsp; Query &nbsp;·&nbsp; Title &nbsp;·&nbsp; URL &nbsp;·&nbsp; Snippet
          </span>
        </p>
        <p style="font-size:12px; color:#5f6368; margin-top:6px;">
          Add columns below to define a custom structure, or click <strong>Detect from Sheet</strong>
          if your sheet already has a header row.
        </p>
      </div>`;
    return;
  }

  localColumns.forEach(col => {
    const row = document.createElement('div');
    row.className = 'col-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'col-name';
    nameInput.placeholder = 'Column name';
    nameInput.value = col.name;
    nameInput.addEventListener('input', () => {
      const c = localColumns.find(c => c.id === col.id);
      if (c) c.name = nameInput.value;
      scheduleAutoSave();
    });

    const fieldSelect = document.createElement('select');
    fieldSelect.className = 'col-field';

    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '— leave blank —';
    fieldSelect.appendChild(noneOpt);

    AVAILABLE_FIELDS.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.key;
      opt.textContent = f.label;
      fieldSelect.appendChild(opt);
    });

    const staticOpt = document.createElement('option');
    staticOpt.value = '__static__';
    staticOpt.textContent = '— static value —';
    fieldSelect.appendChild(staticOpt);

    const staticInput = document.createElement('input');
    staticInput.type = 'text';
    staticInput.className = 'col-static';
    staticInput.placeholder = 'Enter a fixed value…';
    staticInput.style.display = 'none';

    const storedMapping = localFieldMapping[col.id] || '';
    if (storedMapping.startsWith('__static__:')) {
      fieldSelect.value = '__static__';
      staticInput.value = storedMapping.slice('__static__:'.length);
      staticInput.style.display = '';
    } else {
      fieldSelect.value = storedMapping;
    }

    fieldSelect.addEventListener('change', () => {
      if (fieldSelect.value === '__static__') {
        staticInput.style.display = '';
        localFieldMapping[col.id] = `__static__:${staticInput.value}`;
        staticInput.focus();
      } else {
        staticInput.style.display = 'none';
        localFieldMapping[col.id] = fieldSelect.value;
      }
      scheduleAutoSave();
    });

    staticInput.addEventListener('input', () => {
      localFieldMapping[col.id] = `__static__:${staticInput.value}`;
      scheduleAutoSave();
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'col-remove';
    removeBtn.title = 'Remove column';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      localColumns = localColumns.filter(c => c.id !== col.id);
      delete localFieldMapping[col.id];
      renderColumns();
      scheduleAutoSave();
    });

    row.appendChild(nameInput);
    row.appendChild(fieldSelect);
    row.appendChild(staticInput);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

// ── Field reference table ─────────────────────────────────────────────────────
function renderFieldsTable() {
  const tbody = document.querySelector('#fieldsTable tbody');
  AVAILABLE_FIELDS.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${f.key}</td>
      <td>${f.label}</td>
      <td><span class="ctx-badge ctx-${f.ctx}">${CTX_LABELS[f.ctx]}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Live ID preview ───────────────────────────────────────────────────────────
function updatePreview() {
  const prefix = document.getElementById('idPrefix').value.trim();
  const wrap   = document.getElementById('idPreviewWrap');
  const el     = document.getElementById('idPreview');

  if (!prefix) { wrap.style.display = 'none'; return; }

  const rawName = document.getElementById('userName').value.trim();
  const name    = rawName.split(/\s+/)[0] || 'You';
  const year    = new Date().getFullYear();
  el.textContent = `${prefix}-${year}-${name}-001`;
  wrap.style.display = 'block';
}

// ── Boot: load from storage ───────────────────────────────────────────────────
chrome.storage.sync.get(['activeProjectId', 'projects'], (data) => {
  allProjects     = data.projects || {};
  activeProjectId = data.activeProjectId || '';

  // If no projects exist yet, create a default one
  if (Object.keys(allProjects).length === 0) {
    const id = genId();
    allProjects[id] = {
      name: 'Project 1',
      scriptUrl: '', sheetName: '', userName: '', idPrefix: '',
      columns: [], fieldMapping: {},
    };
    activeProjectId = id;
  }

  // Ensure activeProjectId references a real project
  if (!allProjects[activeProjectId]) {
    activeProjectId = Object.keys(allProjects)[0];
  }

  renderProjectDropdown();
  loadProjectIntoUI(activeProjectId);
  renderFieldsTable();
  _autoSaveReady = true;
});

// ── Project manager events ────────────────────────────────────────────────────
document.getElementById('projectSelect').addEventListener('change', (e) => {
  // Save current before switching
  persistActiveProject(() => {
    activeProjectId = e.target.value;
    chrome.storage.sync.set({ activeProjectId });
    loadProjectIntoUI(activeProjectId);
  });
});

document.getElementById('newProjectBtn').addEventListener('click', () => {
  const name = prompt('Name for the new project:', `Project ${Object.keys(allProjects).length + 1}`);
  if (!name) return;
  persistActiveProject(() => {
    const id = genId();
    allProjects[id] = {
      name: name.trim(),
      scriptUrl: '', sheetName: '', userName: '', idPrefix: '',
      columns: [], fieldMapping: {},
    };
    activeProjectId = id;
    chrome.storage.sync.set({ activeProjectId, projects: allProjects }, () => {
      renderProjectDropdown();
      loadProjectIntoUI(activeProjectId);
    });
  });
});

document.getElementById('renameProjectBtn').addEventListener('click', () => {
  const current = allProjects[activeProjectId];
  if (!current) return;
  const name = prompt('Rename project to:', current.name);
  if (!name) return;
  current.name = name.trim();
  chrome.storage.sync.set({ projects: allProjects }, () => {
    renderProjectDropdown();
  });
});

document.getElementById('deleteProjectBtn').addEventListener('click', () => {
  const keys = Object.keys(allProjects);
  if (keys.length <= 1) {
    alert('You must keep at least one project.');
    return;
  }
  const current = allProjects[activeProjectId];
  if (!confirm(`Delete project "${current.name}"? This cannot be undone.`)) return;
  delete allProjects[activeProjectId];
  activeProjectId = Object.keys(allProjects)[0];
  chrome.storage.sync.set({ activeProjectId, projects: allProjects }, () => {
    renderProjectDropdown();
    loadProjectIntoUI(activeProjectId);
  });
});

// ── Input auto-save wiring ────────────────────────────────────────────────────
document.getElementById('idPrefix').addEventListener('input', updatePreview);
document.getElementById('userName').addEventListener('input', updatePreview);
document.getElementById('scriptUrl').addEventListener('input', scheduleAutoSave);
document.getElementById('userName').addEventListener('input', scheduleAutoSave);
document.getElementById('idPrefix').addEventListener('input', scheduleAutoSave);

// When the user changes the sheet tab selection, auto-save
document.getElementById('sheetSelect').addEventListener('change', scheduleAutoSave);

// When URL is blurred (finished typing), attempt to fetch sheet tabs
document.getElementById('scriptUrl').addEventListener('blur', () => {
  const url = document.getElementById('scriptUrl').value.trim();
  if (url) {
    const currentSheetName = document.getElementById('sheetSelect')?.value || '';
    fetchSheetTabsAndRender(url, currentSheetName);
  }
});

// ── Test connection ───────────────────────────────────────────────────────────
document.getElementById('testBtn').addEventListener('click', async () => {
  const scriptUrl = document.getElementById('scriptUrl').value.trim();
  const userName  = document.getElementById('userName').value.trim();
  const sheetName = document.getElementById('sheetSelect')?.value || '';
  const status    = document.getElementById('status');

  if (!scriptUrl) {
    status.textContent = '⚠️ Enter a URL first.';
    status.style.color = '#f9ab00';
    return;
  }

  status.textContent = '⏳ Testing…';
  status.style.color = '#5f6368';

  await new Promise(resolve => persistActiveProject(resolve));

  let payload;
  if (localColumns.length > 0) {
    const testFields = {
      id: 'TEST-000', timestamp: new Date().toISOString(), savedBy: userName || 'Anonymous',
      query: 'test query', title: '🧪 Test entry from Save to Sheets',
      url: 'https://example.com/test', snippet: 'This is a test save to verify the connection.',
      domain: 'example.com', position: '1',
      metaDescription: '', ogTitle: '', ogDescription: '', ogType: '',
      author: '', publishDate: '', canonicalUrl: '', language: '',
      tweetId: '', tweetText: '', authorName: '', authorUsername: '', tweetDate: '',
      videoId: '', channelName: '', channelUrl: '', viewCount: '',
      videoDescription: '', uploadDate: '', duration: '',
      fbPostId: '', fbAuthorName: '', fbPostText: '', fbPostDate: '', fbReactionCount: '',
    };
    const rowData = {};
    localColumns.forEach(col => {
      if (!col.name) return;
      const mapping = localFieldMapping[col.id] || '';
      if (mapping.startsWith('__static__:')) {
        rowData[col.name] = mapping.slice('__static__:'.length);
      } else if (mapping && testFields[mapping] !== undefined) {
        rowData[col.name] = testFields[mapping];
      }
    });
    payload = { action: 'data', rowData, sheetName };
  } else {
    payload = {
      title: '🧪 Test entry from Save to Sheets',
      url: 'https://example.com/test',
      snippet: 'This is a test save to verify the connection is working.',
      query: 'test query',
      savedBy: userName || 'Anonymous',
      sheetName,
    };
  }

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    status.textContent = '✅ Connection works! Check your sheet for the test row.';
    status.style.color = '#188038';

    // Also load tabs if we haven't yet
    fetchSheetTabsAndRender(scriptUrl, sheetName);
  } catch (err) {
    status.textContent = `❌ Failed: ${err.message}. Double-check your URL and that the script is deployed.`;
    status.style.color = '#c5221f';
  }
});

// ── Copy script button ────────────────────────────────────────────────────────
document.getElementById('copyScript').addEventListener('click', () => {
  const code = document.getElementById('scriptCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const msg = document.getElementById('copySuccess');
    msg.style.display = 'inline';
    setTimeout(() => msg.style.display = 'none', 2500);
  });
});

// ── Add column ────────────────────────────────────────────────────────────────
document.getElementById('addColumnBtn').addEventListener('click', () => {
  const id = genId();
  localColumns.push({ id, name: '' });
  renderColumns();
  scheduleAutoSave();
  const inputs = document.querySelectorAll('.col-name');
  if (inputs.length > 0) inputs[inputs.length - 1].focus();
});

// ── Apply columns to Sheet ────────────────────────────────────────────────────
document.getElementById('applyColumnsBtn').addEventListener('click', async () => {
  const scriptUrl     = document.getElementById('scriptUrl').value.trim();
  const sheetName     = document.getElementById('sheetSelect')?.value || '';
  const columnsStatus = document.getElementById('columnsStatus');

  if (!scriptUrl) {
    columnsStatus.textContent = '⚠️ Enter your Apps Script URL first (step 3).';
    columnsStatus.style.color = '#f9ab00';
    return;
  }
  if (localColumns.length === 0) {
    columnsStatus.textContent = '⚠️ Add at least one column first.';
    columnsStatus.style.color = '#f9ab00';
    return;
  }

  const headers = localColumns.map(c => c.name || '(unnamed)');
  const tabNote = sheetName ? ` in tab "${sheetName}"` : '';
  const confirmed = confirm(
    `This will write column headers to row 1 of your sheet${tabNote}:\n\n` +
    headers.map((h, i) => `  ${i + 1}. ${h}`).join('\n') +
    `\n\nAny existing content in row 1 will be overwritten. Continue?`
  );
  if (!confirmed) return;

  await new Promise(resolve => persistActiveProject(resolve));

  columnsStatus.textContent = '⏳ Applying…';
  columnsStatus.style.color = '#5f6368';

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'setHeaders', headers, sheetName }),
      headers: { 'Content-Type': 'text/plain' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    columnsStatus.textContent = `✅ ${headers.length} column headers written to sheet!`;
    columnsStatus.style.color = '#188038';
    setTimeout(() => columnsStatus.textContent = '', 5000);
  } catch (err) {
    columnsStatus.textContent = `❌ Failed: ${err.message}`;
    columnsStatus.style.color = '#c5221f';
  }
});

// ── Detect columns from Sheet ─────────────────────────────────────────────────
document.getElementById('detectColumnsBtn').addEventListener('click', async () => {
  const scriptUrl     = document.getElementById('scriptUrl').value.trim();
  const sheetName     = document.getElementById('sheetSelect')?.value || '';
  const columnsStatus = document.getElementById('columnsStatus');

  if (!scriptUrl) {
    columnsStatus.textContent = '⚠️ Enter your Apps Script URL first (step 3).';
    columnsStatus.style.color = '#f9ab00';
    return;
  }

  columnsStatus.textContent = '⏳ Reading sheet headers…';
  columnsStatus.style.color = '#5f6368';

  let data;
  try {
    // Pass sheetName as a query param so doGet reads the right tab
    const url  = sheetName ? `${scriptUrl}?sheetName=${encodeURIComponent(sheetName)}` : scriptUrl;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    try { data = JSON.parse(text); } catch { data = null; }
  } catch (err) {
    columnsStatus.textContent = `❌ Network error: ${err.message}`;
    columnsStatus.style.color = '#c5221f';
    return;
  }

  if (!data || !Array.isArray(data.headers)) {
    columnsStatus.innerHTML =
      '❌ Your Apps Script needs to be updated to support this feature. ' +
      'Copy the new script from <strong>Step 2</strong> above, replace the existing ' +
      'code in Apps Script, and click <strong>Deploy → Manage deployments → ' +
      'edit (pencil icon) → update version → Deploy</strong>. ' +
      'Your URL stays the same.';
    columnsStatus.style.color = '#c5221f';
    return;
  }

  // Refresh the tab list from the same response, if available
  if (Array.isArray(data.sheets)) {
    const sel = document.getElementById('sheetSelect');
    const current = sel?.value || sheetName;
    sel.innerHTML = '';
    const firstOpt = document.createElement('option');
    firstOpt.value = '';
    firstOpt.textContent = `— use default (${data.sheets[0] || 'Sheet1'}) —`;
    sel.appendChild(firstOpt);
    data.sheets.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === current) opt.selected = true;
      sel.appendChild(opt);
    });
    document.getElementById('sheetSelectWrap').style.display = '';
  }

  const headers = data.headers.map(String).filter(h => h.trim() !== '');
  if (headers.length === 0) {
    columnsStatus.textContent =
      '⚠️ Row 1 of your sheet is empty — no headers to detect. ' +
      'Add a header row manually or use Apply to Sheet.';
    columnsStatus.style.color = '#f9ab00';
    return;
  }

  const newColumns = headers.map(name => {
    const existing = localColumns.find(c => c.name === name);
    return { id: existing ? existing.id : genId(), name };
  });

  const newMapping = {};
  newColumns.forEach(col => {
    if (localFieldMapping[col.id]) {
      newMapping[col.id] = localFieldMapping[col.id];
    } else {
      const auto = autoMapField(col.name);
      if (auto) newMapping[col.id] = auto;
    }
  });

  localColumns      = newColumns;
  localFieldMapping = newMapping;
  renderColumns();
  scheduleAutoSave();

  columnsStatus.textContent =
    `✅ Detected ${headers.length} column${headers.length !== 1 ? 's' : ''}. ` +
    `Mappings saved automatically — review them and adjust if needed.`;
  columnsStatus.style.color = '#188038';
  setTimeout(() => columnsStatus.textContent = '', 7000);
});

// ── About modal ───────────────────────────────────────────────────────────────
(function () {
  const modal = document.getElementById('aboutModal');
  document.getElementById('aboutBtn').addEventListener('click', () => modal.classList.add('open'));
  document.getElementById('aboutClose').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
}());
