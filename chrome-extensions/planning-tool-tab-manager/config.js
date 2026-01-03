// Configuration helper for Planning Tool Extension

const Config = {
  // Default backend URL
  DEFAULT_BACKEND_URL: 'http://localhost:8002',
  DEFAULT_PLANNING_TOOL_URL: 'http://localhost/api/plugins/virtual-office/html',

  // Get backend URL from storage or use default
  async getBackendUrl() {
    try {
      const result = await chrome.storage.sync.get(['backendUrl']);
      return result.backendUrl || this.DEFAULT_BACKEND_URL;
    } catch (error) {
      console.error('Error getting backend URL:', error);
      return this.DEFAULT_BACKEND_URL;
    }
  },

  // Get Planning Tool URL from storage or use default
  async getPlanningToolUrl() {
    try {
      const result = await chrome.storage.sync.get(['planningToolUrl']);
      return result.planningToolUrl || this.DEFAULT_PLANNING_TOOL_URL;
    } catch (error) {
      console.error('Error getting Planning Tool URL:', error);
      return this.DEFAULT_PLANNING_TOOL_URL;
    }
  },

  // Save backend URL to storage
  async setBackendUrl(url) {
    try {
      await chrome.storage.sync.set({ backendUrl: url });
      return true;
    } catch (error) {
      console.error('Error saving backend URL:', error);
      return false;
    }
  },

  // Save Planning Tool URL to storage
  async setPlanningToolUrl(url) {
    try {
      await chrome.storage.sync.set({ planningToolUrl: url });
      return true;
    } catch (error) {
      console.error('Error saving Planning Tool URL:', error);
      return false;
    }
  }
};
