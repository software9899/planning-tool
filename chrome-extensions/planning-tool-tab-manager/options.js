// Options page script
console.log('⚙️ Planning Tool - Options page loaded');

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();

  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', resetSettings);
});

async function loadSettings() {
  try {
    const backendUrl = await Config.getBackendUrl();
    const planningToolUrl = await Config.getPlanningToolUrl();

    document.getElementById('backendUrl').value = backendUrl;
    document.getElementById('planningToolUrl').value = planningToolUrl;

    console.log('✅ Settings loaded');
  } catch (error) {
    console.error('❌ Error loading settings:', error);
    showMessage('Failed to load settings', 'error');
  }
}

async function saveSettings() {
  try {
    const backendUrl = document.getElementById('backendUrl').value.trim();
    const planningToolUrl = document.getElementById('planningToolUrl').value.trim();

    // Validate URLs
    if (!backendUrl || !planningToolUrl) {
      showMessage('Please fill in all fields', 'error');
      return;
    }

    // Save to storage
    await Config.setBackendUrl(backendUrl);
    await Config.setPlanningToolUrl(planningToolUrl);

    console.log('✅ Settings saved');
    showMessage('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('❌ Error saving settings:', error);
    showMessage('Failed to save settings', 'error');
  }
}

async function resetSettings() {
  try {
    document.getElementById('backendUrl').value = Config.DEFAULT_BACKEND_URL;
    document.getElementById('planningToolUrl').value = Config.DEFAULT_PLANNING_TOOL_URL;

    await Config.setBackendUrl(Config.DEFAULT_BACKEND_URL);
    await Config.setPlanningToolUrl(Config.DEFAULT_PLANNING_TOOL_URL);

    console.log('✅ Settings reset to default');
    showMessage('Settings reset to default values', 'success');
  } catch (error) {
    console.error('❌ Error resetting settings:', error);
    showMessage('Failed to reset settings', 'error');
  }
}

function showMessage(message, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}
