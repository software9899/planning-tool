// Content script for Planning Tool Tab Manager
console.log('🔌 Planning Tool - Content Script injected');

// Notify page that extension is ready
window.postMessage({
  type: 'TAB_MANAGER_READY',
  source: 'planning-tool-extension'
}, '*');

// Listen for messages from the page
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return;

  const message = event.data;

  // Check if it's a message for our extension
  if (message.type === 'TAB_MANAGER_REQUEST') {
    console.log('📨 Content script received request:', message);

    // Forward to background script
    chrome.runtime.sendMessage(message, (response) => {
      console.log('✅ Content script received response:', response);

      // Send response back to page
      window.postMessage({
        type: 'TAB_MANAGER_RESPONSE',
        ...response
      }, '*');
    });
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content script received from background:', request);

  // Forward to page
  window.postMessage({
    type: 'TAB_MANAGER_EVENT',
    ...request
  }, '*');

  sendResponse({ received: true });
});

console.log('✅ Planning Tool - Content Script ready');
