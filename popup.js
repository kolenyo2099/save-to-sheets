chrome.storage.sync.get(['scriptUrl', 'userName'], ({ scriptUrl, userName }) => {
  const box = document.getElementById('statusBox');
  if (scriptUrl && userName) {
    box.className = 'status-row status-ok';
    box.textContent = `✅ Ready — saving as "${userName}"`;
  } else if (scriptUrl) {
    box.className = 'status-row status-ok';
    box.textContent = '✅ Connected (no name set)';
  } else {
    box.className = 'status-row status-warn';
    box.textContent = '⚙️ Not configured yet';
  }
});

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
