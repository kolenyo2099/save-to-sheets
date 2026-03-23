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
];

const CTX_LABELS = {
  all:    'All contexts',
  search: 'Search only',
  page:   'Save page',
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
  };
  return map[n] || '';
}

// ── Column state (kept in memory, persisted on save / apply) ─────────────────
let localColumns     = []; // [{id: string, name: string}]
let localFieldMapping = {}; // {columnId: fieldKey}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Render the column designer rows ──────────────────────────────────────────
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

    // Column name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'col-name';
    nameInput.placeholder = 'Column name';
    nameInput.value = col.name;
    nameInput.addEventListener('input', () => {
      const c = localColumns.find(c => c.id === col.id);
      if (c) c.name = nameInput.value;
    });

    // Field dropdown
    const fieldSelect = document.createElement('select');
    fieldSelect.className = 'col-field';

    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '— unmapped —';
    fieldSelect.appendChild(noneOpt);

    AVAILABLE_FIELDS.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.key;
      opt.textContent = f.label;
      fieldSelect.appendChild(opt);
    });

    fieldSelect.value = localFieldMapping[col.id] || '';
    fieldSelect.addEventListener('change', () => {
      localFieldMapping[col.id] = fieldSelect.value;
    });

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'col-remove';
    removeBtn.title = 'Remove column';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      localColumns = localColumns.filter(c => c.id !== col.id);
      delete localFieldMapping[col.id];
      renderColumns();
    });

    row.appendChild(nameInput);
    row.appendChild(fieldSelect);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

// ── Render the field reference table ─────────────────────────────────────────
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

// ── Load saved settings ───────────────────────────────────────────────────────
chrome.storage.sync.get(['scriptUrl', 'userName', 'idPrefix', 'columns', 'fieldMapping'], (data) => {
  if (data.scriptUrl) document.getElementById('scriptUrl').value = data.scriptUrl;
  if (data.userName)  document.getElementById('userName').value  = data.userName;
  if (data.idPrefix)  document.getElementById('idPrefix').value  = data.idPrefix;

  localColumns      = data.columns      || [];
  localFieldMapping = data.fieldMapping || {};

  renderColumns();
  updatePreview();
});

renderFieldsTable();

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

document.getElementById('idPrefix').addEventListener('input', updatePreview);
document.getElementById('userName').addEventListener('input', updatePreview);

// ── Save settings ─────────────────────────────────────────────────────────────
document.getElementById('saveBtn').addEventListener('click', () => {
  const scriptUrl = document.getElementById('scriptUrl').value.trim();
  const userName  = document.getElementById('userName').value.trim();
  const status    = document.getElementById('status');

  if (!scriptUrl) {
    status.textContent = '⚠️ Please enter a URL.';
    status.style.color = '#f9ab00';
    return;
  }

  const idPrefix = document.getElementById('idPrefix').value.trim();
  chrome.storage.sync.set(
    { scriptUrl, userName, idPrefix, columns: localColumns, fieldMapping: localFieldMapping },
    () => {
      status.textContent = '✅ Saved!';
      status.style.color = '#188038';
      setTimeout(() => status.textContent = '', 3000);
    }
  );
});

// ── Test connection ───────────────────────────────────────────────────────────
document.getElementById('testBtn').addEventListener('click', async () => {
  const scriptUrl = document.getElementById('scriptUrl').value.trim();
  const userName  = document.getElementById('userName').value.trim();
  const status    = document.getElementById('status');

  if (!scriptUrl) {
    status.textContent = '⚠️ Enter a URL first.';
    status.style.color = '#f9ab00';
    return;
  }

  status.textContent = '⏳ Testing…';
  status.style.color = '#5f6368';

  let payload;
  if (localColumns.length > 0) {
    // Send a test row with the configured columns
    const testFields = {
      id: 'TEST-000', timestamp: new Date().toISOString(), savedBy: userName || 'Anonymous',
      query: 'test query', title: '🧪 Test entry from Save to Sheets',
      url: 'https://example.com/test', snippet: 'This is a test save to verify the connection.',
      domain: 'example.com', position: '1',
      metaDescription: '', ogTitle: '', ogDescription: '', ogType: '',
      author: '', publishDate: '', canonicalUrl: '', language: '',
    };
    const row = localColumns.map(col => {
      const key = localFieldMapping[col.id];
      return key && testFields[key] !== undefined ? testFields[key] : '';
    });
    payload = { action: 'data', row };
  } else {
    payload = {
      title: '🧪 Test entry from Save to Sheets',
      url: 'https://example.com/test',
      snippet: 'This is a test save to verify the connection is working.',
      query: 'test query',
      savedBy: userName || 'Anonymous',
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
  // Focus the new name input
  const inputs = document.querySelectorAll('.col-name');
  if (inputs.length > 0) inputs[inputs.length - 1].focus();
});

// ── Apply columns to Sheet ────────────────────────────────────────────────────
document.getElementById('applyColumnsBtn').addEventListener('click', async () => {
  const scriptUrl    = document.getElementById('scriptUrl').value.trim();
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

  const confirmed = confirm(
    `This will write column headers to row 1 of your sheet:\n\n` +
    headers.map((h, i) => `  ${i + 1}. ${h}`).join('\n') +
    `\n\nAny existing content in row 1 will be overwritten. Continue?`
  );
  if (!confirmed) return;

  // Persist column config before sending to sheet
  await new Promise(resolve => {
    const idPrefix = document.getElementById('idPrefix').value.trim();
    const userName = document.getElementById('userName').value.trim();
    chrome.storage.sync.set(
      { columns: localColumns, fieldMapping: localFieldMapping,
        scriptUrl, userName, idPrefix },
      resolve
    );
  });

  columnsStatus.textContent = '⏳ Applying…';
  columnsStatus.style.color = '#5f6368';

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'setHeaders', headers }),
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
// Uses a GET request (calls doGet in the Apps Script) — read-only, safe.
// Requires the updated Apps Script from Step 2 to be deployed.
document.getElementById('detectColumnsBtn').addEventListener('click', async () => {
  const scriptUrl     = document.getElementById('scriptUrl').value.trim();
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
    const res = await fetch(scriptUrl); // GET → calls doGet()
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      // Response is HTML, not JSON — script doesn't have doGet (old version)
      data = null;
    }
  } catch (err) {
    columnsStatus.textContent = `❌ Network error: ${err.message}`;
    columnsStatus.style.color = '#c5221f';
    return;
  }

  // Old script returns HTML error page (no doGet function)
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

  const headers = data.headers.map(String).filter(h => h.trim() !== '');

  if (headers.length === 0) {
    columnsStatus.textContent =
      '⚠️ Row 1 of your sheet is empty — no headers to detect. ' +
      'Add a header row manually or use Apply to Sheet.';
    columnsStatus.style.color = '#f9ab00';
    return;
  }

  // Build new columns, reusing existing IDs where the name already matches
  const newColumns = headers.map(name => {
    const existing = localColumns.find(c => c.name === name);
    return { id: existing ? existing.id : genId(), name };
  });

  // Keep existing mappings where IDs match; otherwise auto-detect from name
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

  columnsStatus.textContent =
    `✅ Detected ${headers.length} column${headers.length !== 1 ? 's' : ''}. ` +
    `Review the field mappings, then click Save settings.`;
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
