/**
 * Popup Script: Handles UI interactions
 */

let isRecording = false;

document.addEventListener('DOMContentLoaded', async () => {
  await updateStats();
  await updateRecordingState();

  // Toggle Recording button
  document.getElementById('toggleRecording').addEventListener('click', async () => {
    if (isRecording) {
      // Stop recording
      const response = await chrome.runtime.sendMessage({ action: 'stopRecording' });
      isRecording = false;
      updateRecordingUI();
      showStatus('⏹️ Recording stopped', 'success');
    } else {
      // Start recording
      const response = await chrome.runtime.sendMessage({ action: 'startRecording' });
      isRecording = true;
      updateRecordingUI();
      showStatus('🔴 Recording started - Navigate to pages to capture', 'success');
    }
  });

  // Capture Now button
  document.getElementById('captureNow').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: 'captureNow' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }

      if (response?.success) {
        showStatus('✅ Page captured successfully!', 'success');
        updateStats();
      }
    });
  });

  // View Training Data button
  document.getElementById('viewTraining').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/training/training.html') });
  });

  // Clear Data button
  document.getElementById('clearData').addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all training data?')) {
      await chrome.storage.local.set({ trainingData: [] });
      showStatus('🗑️ All data cleared', 'success');
      await updateStats();
    }
  });
});

// Listen for data updates and recording updates
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'dataUpdated') {
    updateStats();
  } else if (request.action === 'recordingPageAdded') {
    document.getElementById('pageCount').textContent = request.pageCount;
  } else if (request.action === 'recordingStopped') {
    isRecording = false;
    updateRecordingUI();
    showStatus(`✅ Recording saved with ${request.session.pages.length} pages`, 'success');
  }
});

async function updateRecordingState() {
  const response = await chrome.runtime.sendMessage({ action: 'getRecordingState' });
  isRecording = response.recording;
  updateRecordingUI();
}

function updateRecordingUI() {
  const btn = document.getElementById('toggleRecording');
  const icon = document.getElementById('recordingIcon');
  const text = document.getElementById('recordingText');
  const info = document.getElementById('recordingInfo');

  if (isRecording) {
    btn.classList.add('recording');
    icon.textContent = '⏹️';
    text.textContent = 'Stop Recording';
    info.style.display = 'block';
  } else {
    btn.classList.remove('recording');
    icon.textContent = '🔴';
    text.textContent = 'Start Recording';
    info.style.display = 'none';
  }
}

async function updateStats() {
  const result = await chrome.storage.local.get(['trainingData']);
  const data = result.trainingData || [];

  const totalRecords = data.length;
  const totalFields = data.reduce((sum, record) => sum + record.totalFields, 0);

  document.getElementById('totalRecords').textContent = totalRecords;
  document.getElementById('totalFields').textContent = totalFields;
}

function showStatus(message, type = '') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = 'status ' + type;

  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = 'status';
  }, 3000);
}
