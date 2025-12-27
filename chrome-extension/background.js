// Background service worker for Planning Tool Tab Manager
console.log('🚀 Planning Tool - Tab Manager Extension loaded');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received message:', request);

  if (request.action === 'getTabs') {
    // Get all tabs from all windows
    chrome.tabs.query({}, (tabs) => {
      console.log('📊 Found tabs:', tabs.length);

      // Filter and format tab data
      const tabData = tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        windowId: tab.windowId,
        active: tab.active,
        pinned: tab.pinned,
        index: tab.index
      }));

      // Send response back
      sendResponse({
        success: true,
        action: 'getTabs',
        data: {
          tabs: tabData,
          totalTabs: tabData.length
        }
      });
    });

    // Return true to indicate async response
    return true;
  }

  if (request.action === 'focusTab') {
    const tabId = request.tabId;
    chrome.tabs.update(tabId, { active: true }, (tab) => {
      chrome.windows.update(tab.windowId, { focused: true });
      sendResponse({ success: true, action: 'focusTab' });
    });
    return true;
  }

  if (request.action === 'closeTab') {
    const tabId = request.tabId;
    chrome.tabs.remove(tabId, () => {
      sendResponse({ success: true, action: 'closeTab' });
    });
    return true;
  }
});

// Listen for tab updates to notify content script
chrome.tabs.onCreated.addListener(() => {
  notifyTabsUpdated();
});

chrome.tabs.onRemoved.addListener(() => {
  notifyTabsUpdated();
});

chrome.tabs.onUpdated.addListener(() => {
  notifyTabsUpdated();
});

function notifyTabsUpdated() {
  // Send message to all tabs running our content script
  chrome.tabs.query({ url: 'http://localhost:*/*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'tabsUpdated' }).catch(() => {
        // Ignore errors for tabs that don't have our content script
      });
    });
  });
}
