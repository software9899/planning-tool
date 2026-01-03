// Planning Tool Plugin Template Script

/**
 * Plugin SDK Helper
 * Provides standardized methods for interacting with Planning Tool Backend
 */
class PluginSDK {
  constructor(pluginId) {
    this.pluginId = pluginId;
    this.baseURL = this.getBackendURL();
    this.apiVersion = '1.0';
  }

  /**
   * Get backend URL from environment or use default
   */
  getBackendURL() {
    // Try to detect from current location
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocal) {
      return 'http://localhost:8002';
    } else {
      // Use same host for remote deployments
      return `http://${hostname}:8002`;
    }
  }

  /**
   * Make API request to backend
   * @param {string} endpoint - API endpoint path
   * @param {object} options - Fetch options
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'X-Plugin-ID': this.pluginId,
        'X-API-Version': this.apiVersion
      }
    };

    const config = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[${this.pluginId}] API Request failed:`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * Log plugin message
   */
  log(message, type = 'info') {
    const prefix = `[Plugin: ${this.pluginId}]`;
    switch (type) {
      case 'error':
        console.error(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }
}

// Initialize Plugin
const plugin = new PluginSDK('example-plugin');

// Example: Test API Call
document.getElementById('testBtn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
  const btn = document.getElementById('testBtn');

  try {
    btn.classList.add('loading');
    btn.textContent = 'Loading...';

    // Example API call
    const data = await plugin.get('/api/bookmarks');

    resultDiv.innerHTML = `<span class="text-success">✅ Success!</span>\n\n${JSON.stringify(data, null, 2)}`;
    plugin.log('API call successful', 'info');

  } catch (error) {
    resultDiv.innerHTML = `<span class="text-error">❌ Error!</span>\n\n${error.message}`;
    plugin.log(error, 'error');

  } finally {
    btn.classList.remove('loading');
    btn.textContent = 'Test API Call';
  }
});

// Plugin initialization
document.addEventListener('DOMContentLoaded', () => {
  plugin.log('Plugin loaded successfully');
});
