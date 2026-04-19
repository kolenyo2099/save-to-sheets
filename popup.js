chrome.storage.sync.get(['activeProjectId', 'projects'], (data) => {
  const allProjects     = data.projects || {};
  const activeProjectId = data.activeProjectId || '';
  const activeProject   = allProjects[activeProjectId] || {};

  const box     = document.getElementById('statusBox');
  const sel     = document.getElementById('activeProject');
  const wrap    = document.getElementById('projectWrap');

  // Populate dropdown
  if (Object.keys(allProjects).length > 0) {
    wrap.style.display = 'block';
    Object.entries(allProjects).forEach(([id, proj]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = proj.name || 'Untitled Project';
      if (id === activeProjectId) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', (e) => {
      chrome.storage.sync.set({ activeProjectId: e.target.value }, () => {
        window.location.reload(); // Quick refresh of the popup to update status
      });
    });
  }

  // Set status
  if (activeProject.scriptUrl) {
    box.className = 'status-row status-ok';
    const name = activeProject.userName ? ` as "${activeProject.userName}"` : '';
    const tab  = activeProject.sheetName ? ` → [${activeProject.sheetName}]` : '';
    box.textContent = `✅ Ready — saving${name}${tab}`;
  } else {
    box.className = 'status-row status-warn';
    box.textContent = '⚙️ Active project not configured yet';
  }
});

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
