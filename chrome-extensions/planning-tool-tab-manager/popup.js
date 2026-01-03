// Popup script
console.log('📋 Planning Tool - Popup loaded');

// Load stats on popup open
document.addEventListener('DOMContentLoaded', () => {
  loadStats();

  // Open Planning Tool button
  document.getElementById('openPlanningTool').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost/bookmarks' });
  });

  // Refresh stats button
  document.getElementById('refreshStats').addEventListener('click', () => {
    loadStats();
  });
});

function loadStats() {
  const statsDiv = document.getElementById('stats');
  statsDiv.innerHTML = '<div class="loading">⏳ Loading...</div>';

  chrome.tabs.query({}, (tabs) => {
    const totalTabs = tabs.length;
    const windows = new Set(tabs.map(tab => tab.windowId)).size;
    const activeTabs = tabs.filter(tab => tab.active).length;
    const pinnedTabs = tabs.filter(tab => tab.pinned).length;

    statsDiv.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total Tabs</span>
        <span class="stat-value">${totalTabs}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Windows</span>
        <span class="stat-value">${windows}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Pinned Tabs</span>
        <span class="stat-value">${pinnedTabs}</span>
      </div>
    `;
  });
}
