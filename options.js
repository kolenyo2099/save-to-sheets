// Load saved settings
chrome.storage.sync.get(['scriptUrl', 'userName', 'idPrefix'], ({ scriptUrl, userName, idPrefix }) => {
  if (scriptUrl) document.getElementById('scriptUrl').value = scriptUrl;
  if (userName)  document.getElementById('userName').value  = userName;
  if (idPrefix)  document.getElementById('idPrefix').value  = idPrefix;
  updatePreview();
});

// Live ID preview (updates as user types in prefix or name)
function updatePreview() {
  const prefix = document.getElementById('idPrefix').value.trim();
  const wrap   = document.getElementById('idPreviewWrap');
  const el     = document.getElementById('idPreview');

  if (!prefix) {
    wrap.style.display = 'none';
    return;
  }

  const rawName = document.getElementById('userName').value.trim();
  const name    = rawName.split(/\s+/)[0] || 'You';
  const year    = new Date().getFullYear();
  el.textContent = `${prefix}-${year}-${name}-001`;
  wrap.style.display = 'block';
}

document.getElementById('idPrefix').addEventListener('input', updatePreview);
document.getElementById('userName').addEventListener('input', updatePreview);

// Save settings
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
  chrome.storage.sync.set({ scriptUrl, userName, idPrefix }, () => {
    status.textContent = '✅ Saved!';
    status.style.color = '#188038';
    setTimeout(() => status.textContent = '', 3000);
  });
});

// Test connection
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

  const payload = {
    title:   '🧪 Test entry from Save to Sheets',
    url:     'https://example.com/test',
    snippet: 'This is a test save to verify the connection is working.',
    query:   'test query',
    savedBy: userName || 'Anonymous'
  };

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

// Copy script button
document.getElementById('copyScript').addEventListener('click', () => {
  const code = document.getElementById('scriptCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const msg = document.getElementById('copySuccess');
    msg.style.display = 'inline';
    setTimeout(() => msg.style.display = 'none', 2500);
  });
});
