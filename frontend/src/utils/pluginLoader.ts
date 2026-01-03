export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  route: string;
  sidebarLabel: string;
  author?: string;
  enabled: boolean;
  hidden?: boolean;
  files: {
    script: string;
    style: string;
    component?: string;
  };
  requirements?: string[];
}

export interface Plugin {
  metadata: PluginMetadata;
  loaded: boolean;
  error?: string;
}

const PLUGIN_STORAGE_KEY = 'enabled_plugins';

/**
 * Get all available plugins from the backend
 */
export async function getAvailablePlugins(): Promise<PluginMetadata[]> {
  try {
    const response = await fetch('/api/plugins');
    if (!response.ok) {
      throw new Error('Failed to fetch plugins');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching plugins:', error);
    return [];
  }
}

/**
 * Get enabled plugins from localStorage
 */
export function getEnabledPlugins(): string[] {
  const stored = localStorage.getItem(PLUGIN_STORAGE_KEY);
  if (!stored) {
    // Default plugins enabled on first load
    // Note: KPI is not here because it's only accessible through HR Management section
    const defaultPlugins = ['diagram-editor', 'hr', 'browser-tabs', 'ai-assistant', 'test-cases'];
    setEnabledPlugins(defaultPlugins);
    return defaultPlugins;
  }
  return JSON.parse(stored);
}

/**
 * Set enabled plugins in localStorage
 */
export function setEnabledPlugins(pluginIds: string[]): void {
  localStorage.setItem(PLUGIN_STORAGE_KEY, JSON.stringify(pluginIds));
}

/**
 * Toggle plugin enabled state
 */
export function togglePlugin(pluginId: string, enabled: boolean): void {
  const enabledPlugins = getEnabledPlugins();
  if (enabled && !enabledPlugins.includes(pluginId)) {
    enabledPlugins.push(pluginId);
  } else if (!enabled) {
    const index = enabledPlugins.indexOf(pluginId);
    if (index > -1) {
      enabledPlugins.splice(index, 1);
    }
  }
  setEnabledPlugins(enabledPlugins);

  // Notify other components about plugin changes
  window.dispatchEvent(new CustomEvent('pluginsChanged', { detail: { pluginId, enabled } }));
}

/**
 * Check if a plugin is enabled
 */
export function isPluginEnabled(pluginId: string): boolean {
  return getEnabledPlugins().includes(pluginId);
}

/**
 * Load plugin files (script and style)
 */
export async function loadPluginFiles(plugin: PluginMetadata): Promise<void> {
  const baseUrl = '/api/plugins';

  // Load CSS
  if (plugin.files.style) {
    const linkId = `plugin-style-${plugin.id}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `${baseUrl}/${plugin.id}/style`;
      document.head.appendChild(link);
    }
  }

  // Load JavaScript
  if (plugin.files.script) {
    const scriptId = `plugin-script-${plugin.id}`;
    if (!document.getElementById(scriptId)) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `${baseUrl}/${plugin.id}/script`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load plugin script: ${plugin.id}`));
        document.body.appendChild(script);
      });
    }
  }
}

/**
 * Unload plugin files
 */
export function unloadPluginFiles(pluginId: string): void {
  // Remove CSS
  const link = document.getElementById(`plugin-style-${pluginId}`);
  if (link) {
    link.remove();
  }

  // Remove script (note: this doesn't unload the JS from memory)
  const script = document.getElementById(`plugin-script-${pluginId}`);
  if (script) {
    script.remove();
  }
}
