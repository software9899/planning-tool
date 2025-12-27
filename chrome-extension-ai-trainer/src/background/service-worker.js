/**
 * Background Service Worker: Manages data storage and communication
 */

console.log('🤖 AI Training Data Collector - Service Worker Started');

// Recording state
let isRecording = false;
let currentRecordingSession = null;

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveTrainingData') {
    if (isRecording) {
      saveToRecordingSession(request.data);
    } else {
      saveTrainingData(request.data);
    }
    sendResponse({ success: true });
  } else if (request.action === 'startRecording') {
    startRecording();
    sendResponse({ success: true, recording: true });
  } else if (request.action === 'stopRecording') {
    stopRecording();
    sendResponse({ success: true, recording: false });
  } else if (request.action === 'getRecordingState') {
    sendResponse({ recording: isRecording });
  }
});

/**
 * Save training data to Chrome storage
 */
async function saveTrainingData(data) {
  try {
    // Get existing data
    const result = await chrome.storage.local.get(['trainingData']);
    const existingData = result.trainingData || [];

    // Add new data
    existingData.push(data);

    // Save back to storage
    await chrome.storage.local.set({ trainingData: existingData });

    console.log('✅ Training data saved. Total records:', existingData.length);

    // Notify popup if it's open
    chrome.runtime.sendMessage({
      action: 'dataUpdated',
      count: existingData.length
    }).catch(() => {
      // Popup might not be open, ignore error
    });
  } catch (error) {
    console.error('❌ Error saving training data:', error);
  }
}

/**
 * Start recording session
 */
function startRecording() {
  isRecording = true;
  currentRecordingSession = {
    id: Date.now(),
    startTime: new Date().toISOString(),
    pages: [],
    sessionName: `Recording ${new Date().toLocaleString()}`
  };
  console.log('🔴 Recording started:', currentRecordingSession.id);
}

/**
 * Stop recording session
 */
async function stopRecording() {
  if (!isRecording || !currentRecordingSession) {
    console.log('⚠️ No active recording to stop');
    return;
  }

  isRecording = false;
  currentRecordingSession.endTime = new Date().toISOString();

  // Save recording session
  try {
    const result = await chrome.storage.local.get(['recordingSessions']);
    const sessions = result.recordingSessions || [];
    sessions.push(currentRecordingSession);
    await chrome.storage.local.set({ recordingSessions: sessions });

    console.log('⏹️ Recording stopped. Total pages:', currentRecordingSession.pages.length);

    // Notify popup
    chrome.runtime.sendMessage({
      action: 'recordingStopped',
      session: currentRecordingSession
    }).catch(() => {});

    currentRecordingSession = null;
  } catch (error) {
    console.error('❌ Error saving recording session:', error);
  }
}

/**
 * Save data to current recording session
 */
function saveToRecordingSession(data) {
  if (!currentRecordingSession) {
    console.log('⚠️ No active recording session');
    return;
  }

  currentRecordingSession.pages.push(data);
  console.log(`📄 Page ${currentRecordingSession.pages.length} added to recording`);

  // Notify popup of page count
  chrome.runtime.sendMessage({
    action: 'recordingPageAdded',
    pageCount: currentRecordingSession.pages.length
  }).catch(() => {});
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('🎉 AI Training Data Collector installed');

  // Initialize storage
  chrome.storage.local.set({
    trainingData: [],
    recordingSessions: []
  });
});

/**
 * Listen for tab updates to detect page changes
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('📄 Page loaded:', tab.url);
  }
});
