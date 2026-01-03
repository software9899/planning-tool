// Popup script
console.log('📋 Planning Tool - Popup loaded');

// Load config
let backendUrl = 'http://localhost:8002';
let planningToolUrl = 'http://localhost/api/plugins/virtual-office/html';

// Initialize config
(async () => {
  if (typeof Config !== 'undefined') {
    backendUrl = await Config.getBackendUrl();
    planningToolUrl = await Config.getPlanningToolUrl();
    console.log('📍 Using backend URL:', backendUrl);
    console.log('📍 Using Planning Tool URL:', planningToolUrl);
  }
})();

// Load stats on popup open
document.addEventListener('DOMContentLoaded', () => {
  loadStats();

  // Add current page to bookmarks
  document.getElementById('addCurrentPage').addEventListener('click', async () => {
    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        showMessage('❌ No active tab found', 'error');
        return;
      }

      // Get favicon URL
      const faviconUrl = tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;

      // Create bookmark
      const bookmark = {
        title: tab.title,
        url: tab.url,
        favicon: faviconUrl,
        description: `Added from Chrome Extension`
      };

      // Send to backend API
      const response = await fetch(`${backendUrl}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookmark)
      });

      if (!response.ok) {
        throw new Error(`Failed to save bookmark: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Bookmark saved:', result);

      showMessage('✅ Added to Bookmarks!', 'success');

    } catch (error) {
      console.error('❌ Error adding bookmark:', error);
      showMessage('❌ Failed to add bookmark', 'error');
    }
  });

  // Open Planning Tool button
  document.getElementById('openPlanningTool').addEventListener('click', () => {
    chrome.tabs.create({ url: planningToolUrl });
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

function showMessage(message, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';

  if (type === 'success') {
    messageDiv.style.background = 'rgba(76, 175, 80, 0.9)';
    messageDiv.style.color = 'white';
  } else if (type === 'error') {
    messageDiv.style.background = 'rgba(244, 67, 54, 0.9)';
    messageDiv.style.color = 'white';
  }

  // Auto-hide after 3 seconds
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}
