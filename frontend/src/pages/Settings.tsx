import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSettings, updateSetting, getSetting, getSubscriptionInfo, getAIProviderKeys, createAIProviderKey, deleteAIProviderKey, testAIProviderKey, type SubscriptionInfo, type AIProviderKey, type AIProviderKeyCreate } from '../services/api';
import Modal from '../components/Modal';
import { getAvailablePlugins, isPluginEnabled, togglePlugin, loadPluginFiles, unloadPluginFiles, type PluginMetadata } from '../utils/pluginLoader';

interface Settings {
  theme: 'light' | 'dark';
  notifications: boolean;
}

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>({
    theme: 'light',
    notifications: true
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', type: 'info' as 'info' | 'warning' | 'error' | 'success' });

  // Plugins state
  const [plugins, setPlugins] = useState<PluginMetadata[]>([]);
  const [unconfiguredPlugins, setUnconfiguredPlugins] = useState<any[]>([]);

  // Plugin configuration modal state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<any>(null);
  const [pluginConfig, setPluginConfig] = useState({
    name: '',
    version: '1.0.0',
    description: '',
    icon: '🔌',
    author: '',
    html_file: 'index.html',
    script_file: 'script.js',
    style_file: 'style.css'
  });

  // Tab state - restore from localStorage if available
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'plugins' | 'billing'>(() => {
    const savedTab = localStorage.getItem('settingsActiveTab');
    return (savedTab as 'general' | 'appearance' | 'plugins' | 'billing') || 'general';
  });

  // Subscription & AI Keys state
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [aiKeys, setAIKeys] = useState<AIProviderKey[]>([]);
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<AIProviderKeyCreate>({
    provider: 'openai',
    name: '',
    api_key: '',
    model: ''
  });
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const showModal = (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    setModalContent({ title, message, type });
    setModalOpen(true);
  };

  useEffect(() => {
    // Check if user is admin (Lead level)
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role?.toLowerCase() !== 'admin') {
          alert('Access Denied: Lead level (Admin) privileges required');
          navigate('/');
          return;
        }
      } catch (e) {
        navigate('/');
        return;
      }
    } else {
      navigate('/login');
      return;
    }

    loadSettings();
    loadPlugins();
    loadSubscriptionData();
  }, [navigate]);

  const loadSubscriptionData = async () => {
    try {
      const info = await getSubscriptionInfo();
      setSubscriptionInfo(info);
      const keys = await getAIProviderKeys();
      setAIKeys(keys);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    }
  };

  const handleAddAIKey = async () => {
    if (!newKeyData.name || !newKeyData.api_key) {
      showModal('Error', 'Please fill in all required fields', 'error');
      return;
    }

    try {
      await createAIProviderKey(newKeyData);
      setShowAddKeyModal(false);
      setNewKeyData({ provider: 'openai', name: '', api_key: '', model: '' });
      setTestResult(null);
      await loadSubscriptionData();
      showModal('Success', 'AI API key added successfully', 'success');
    } catch (error: any) {
      showModal('Error', error.message || 'Failed to add API key', 'error');
    }
  };

  const handleDeleteAIKey = async (keyId: number, keyName: string) => {
    if (!confirm(`Are you sure you want to delete "${keyName}"?`)) return;

    try {
      await deleteAIProviderKey(keyId);
      await loadSubscriptionData();
      showModal('Success', 'AI API key deleted successfully', 'success');
    } catch (error: any) {
      showModal('Error', error.message || 'Failed to delete API key', 'error');
    }
  };

  const handleTestAIKey = async () => {
    if (!newKeyData.api_key) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setTestingKey(true);
    setTestResult(null);

    try {
      const result = await testAIProviderKey({
        provider: newKeyData.provider,
        api_key: newKeyData.api_key,
        model: newKeyData.model || undefined
      });
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Connection test failed' });
    } finally {
      setTestingKey(false);
    }
  };

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('settingsActiveTab', activeTab);
  }, [activeTab]);

  const loadPlugins = async () => {
    const availablePlugins = await getAvailablePlugins();
    setPlugins(availablePlugins);
    console.log('Loaded configured plugins:', availablePlugins);

    // Load unconfigured plugins
    try {
      const response = await fetch('/api/plugins/unconfigured');
      if (response.ok) {
        const unconfigured = await response.json();
        console.log('Loaded unconfigured plugins:', unconfigured);
        setUnconfiguredPlugins(unconfigured);
      }
    } catch (error) {
      console.error('Failed to load unconfigured plugins:', error);
    }
  };

  const handleTogglePlugin = async (pluginId: string, currentlyEnabled: boolean) => {
    const newState = !currentlyEnabled;

    // Toggle plugin state
    togglePlugin(pluginId, newState);

    // Find the plugin metadata
    const plugin = plugins.find(p => p.id === pluginId);

    if (plugin) {
      if (newState) {
        // Load plugin files when enabling
        try {
          await loadPluginFiles(plugin);
        } catch (error) {
          console.error(`Failed to load plugin ${pluginId}:`, error);
        }
      } else {
        // Unload plugin files when disabling
        unloadPluginFiles(pluginId);
      }
    }

    // Refresh plugins list to show updated state immediately
    await loadPlugins();
  };

  const handleSetupPlugin = (plugin: any) => {
    console.log('Setup plugin clicked:', plugin);
    setSelectedPlugin(plugin);
    setPluginConfig({
      name: plugin.folder_name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      version: '1.0.0',
      description: '',
      icon: '🔌',
      author: '',
      html_file: plugin.files.find((f: string) => f.endsWith('.html')) || 'index.html',
      script_file: plugin.files.find((f: string) => f.endsWith('.js')) || 'script.js',
      style_file: plugin.files.find((f: string) => f.endsWith('.css')) || 'style.css'
    });
    setConfigModalOpen(true);
    console.log('Modal should open now, configModalOpen:', true);
  };

  const handleSavePluginConfig = async () => {
    if (!selectedPlugin) return;

    if (!pluginConfig.name.trim()) {
      showModal('Validation Error', 'Plugin name is required', 'error');
      return;
    }

    try {
      const response = await fetch('/api/plugins/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_name: selectedPlugin.folder_name,
          ...pluginConfig,
          id: selectedPlugin.folder_name
        }),
      });

      if (response.ok) {
        showModal('Success', 'Plugin configured successfully! It will now appear in your plugin list.', 'success');
        setConfigModalOpen(false);
        setSelectedPlugin(null);
        // Reload plugins to show the newly configured one
        await loadPlugins();
      } else {
        const error = await response.json();
        showModal('Error', error.detail || 'Failed to configure plugin', 'error');
      }
    } catch (error) {
      console.error('Failed to configure plugin:', error);
      showModal('Error', 'Failed to configure plugin. Please try again.', 'error');
    }
  };

  const loadSettings = async () => {
    try {
      const allSettings = await getAllSettings();

      let loadedSettings = { ...settings };

      // Parse each setting from database
      allSettings.forEach(setting => {
        try {
          const parsedValue = JSON.parse(setting.value);

          switch (setting.key) {
            case 'theme':
              loadedSettings.theme = parsedValue;
              break;
            case 'notifications':
              loadedSettings.notifications = parsedValue;
              break;
          }
        } catch (e) {
          console.error(`Failed to parse setting ${setting.key}:`, e);
        }
      });

      setSettings(loadedSettings);

      // Also save to localStorage for backward compatibility with other components
      localStorage.setItem('appSettings', JSON.stringify(loadedSettings));

      // Apply theme immediately
      if (loadedSettings.theme) {
        document.body.setAttribute('data-theme', loadedSettings.theme);
      }

    } catch (error) {
      console.error('Failed to load settings from API:', error);
      // Fallback to localStorage if API fails
      const saved = localStorage.getItem('appSettings');
      if (saved) {
        const parsedSettings = { ...settings, ...JSON.parse(saved) };
        setSettings(parsedSettings);
        // Apply theme from localStorage
        if (parsedSettings.theme) {
          document.body.setAttribute('data-theme', parsedSettings.theme);
        }
      }
    }
  };

  const saveAllSettings = async (updated: Settings) => {
    // Save to localStorage and apply theme immediately (even if API fails)
    setSettings(updated);
    localStorage.setItem('appSettings', JSON.stringify(updated));

    // Apply theme immediately
    if (updated.theme) {
      document.body.setAttribute('data-theme', updated.theme);
    }

    try {
      // Save each setting to API
      await Promise.all([
        updateSetting('theme', { value: JSON.stringify(updated.theme), description: 'Application theme' }),
        updateSetting('notifications', { value: JSON.stringify(updated.notifications), description: 'Notification preferences' })
      ]);

    } catch (error) {
      console.error('Failed to save settings to API:', error);
      // Settings are already saved to localStorage, so just show a warning
      showModal('API Save Warning', 'Settings applied locally but failed to sync with server.', 'warning');
    }
  };

  const saveSettings = (updated: Settings) => {
    saveAllSettings(updated);
  };

  return (
    <div className="tasks-board-container">
      <div className="page-header">
        <h1>⚙️ Settings</h1>
        <p style={{ color: '#6b7280', marginTop: '8px' }}>
          Customize your workspace and preferences (Lead level access)
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-header" style={{ marginBottom: '24px' }}>
        <button
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          🔔 General
        </button>
        <button
          className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          🎨 Appearance
        </button>
        <button
          className={`tab-btn ${activeTab === 'plugins' ? 'active' : ''}`}
          onClick={() => setActiveTab('plugins')}
        >
          🔌 Plugins
        </button>
        <button
          className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          💳 Billing & AI
        </button>
      </div>

      <div className="settings-content">
        {/* General Tab */}
        {activeTab === 'general' && (
          <>
            {/* Notifications Section */}
            <div className="settings-section">
              <h2>🔔 Notifications</h2>
              <p>Manage notification preferences</p>

              <label className="toggle-option">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => saveSettings({ ...settings, notifications: e.target.checked })}
                />
                <span>Enable desktop notifications</span>
              </label>
            </div>
          </>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <>
            {/* Theme Section */}
            <div className="settings-section">
              <h2>🎨 Theme</h2>
              <p>Customize the look and feel</p>

              <div className="theme-selector">
                <label className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={settings.theme === 'light'}
                    onChange={() => saveSettings({ ...settings, theme: 'light' })}
                  />
                  <span>☀️ Light Mode</span>
                </label>
                <label className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={settings.theme === 'dark'}
                    onChange={() => saveSettings({ ...settings, theme: 'dark' })}
                  />
                  <span>🌙 Dark Mode</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* Plugins Tab */}
        {activeTab === 'plugins' && (
          <>
            {/* Plugins Management Section */}
            <div className="settings-section">
              <h2>🔌 Plugins Management</h2>
              <p>Enable or disable plugins to customize your workspace</p>

              <div style={{ marginTop: '20px' }}>
                {plugins.filter(plugin => !plugin.hidden).map(plugin => {
                  const enabled = isPluginEnabled(plugin.id);
                  return (
                    <div
                      key={plugin.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        background: 'white',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        border: '1px solid #e5e7eb',
                        transition: 'all 0.3s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <span style={{ fontSize: '32px' }}>{plugin.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                            {plugin.name}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            {plugin.description}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            v{plugin.version} • {plugin.author}
                          </div>
                        </div>
                      </div>

                      <label
                        className="toggle-switch"
                        style={{ marginLeft: '16px' }}
                      >
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => handleTogglePlugin(plugin.id, enabled)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unconfigured Plugins Section */}
            {unconfiguredPlugins.length > 0 && (
              <div className="settings-section" style={{ marginTop: '32px' }}>
                <h2>⚙️ Unconfigured Plugins</h2>
                <p>These plugin folders need to be configured before they can be used</p>

                <div style={{ marginTop: '20px' }}>
                  {unconfiguredPlugins.map(plugin => (
                    <div
                      key={plugin.folder_name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        background: '#fff7ed',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        border: '1px solid #fed7aa',
                        transition: 'all 0.3s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <span style={{ fontSize: '32px' }}>📦</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                            {plugin.folder_name}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            Files: {plugin.files.join(', ')}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            Not configured • Needs setup
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSetupPlugin(plugin)}
                        style={{
                          marginLeft: '16px',
                          padding: '8px 16px',
                          background: '#f97316',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '14px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#ea580c'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#f97316'}
                      >
                        ⚙️ Setup
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Billing & AI Keys Tab */}
        {activeTab === 'billing' && (
          <>
            {/* Subscription Section */}
            <div className="settings-section">
              <h2>💳 Subscription Plan</h2>
              <p>Manage your subscription and view usage</p>

              {subscriptionInfo ? (
                <div style={{ marginTop: '20px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    padding: '24px',
                    color: 'white',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Current Plan</div>
                        <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>
                          {subscriptionInfo.plan.display_name}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>
                          {subscriptionInfo.tenant.subscription_status === 'trialing' ? (
                            <>Trial ends: {new Date(subscriptionInfo.tenant.trial_ends_at || '').toLocaleDateString()}</>
                          ) : (
                            <>{subscriptionInfo.plan.description}</>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '32px', fontWeight: 700 }}>
                          ${subscriptionInfo.plan.price_monthly}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>/month</div>
                      </div>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                    {Object.entries(subscriptionInfo.usage).map(([key, value]) => (
                      <div key={key} style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '16px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '13px', color: '#6b7280', textTransform: 'capitalize' }}>
                          {key.replace('_', ' ')}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', marginTop: '4px' }}>
                          {value.current}
                          <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 400 }}>
                            /{value.limit === -1 ? '∞' : value.limit}
                          </span>
                        </div>
                        <div style={{
                          marginTop: '8px',
                          height: '4px',
                          background: '#e5e7eb',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: value.limit === -1 ? '0%' : `${Math.min((value.current / value.limit) * 100, 100)}%`,
                            height: '100%',
                            background: value.limit !== -1 && value.current / value.limit > 0.8 ? '#ef4444' : '#3b82f6',
                            borderRadius: '2px',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Loading subscription info...
                </div>
              )}
            </div>

            {/* AI API Keys Section */}
            <div className="settings-section" style={{ marginTop: '32px' }}>
              <h2>🤖 AI API Keys</h2>
              <p>Manage API keys for AI services like ChatGPT, Claude, etc.</p>

              <div style={{ marginTop: '20px' }}>
                {aiKeys.length > 0 ? (
                  aiKeys.map(key => (
                    <div key={key.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      background: 'white',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: key.provider === 'openai' ? '#10a37f' :
                                     key.provider === 'anthropic' ? '#d4a27f' :
                                     key.provider === 'google' ? '#4285f4' : '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '14px'
                        }}>
                          {key.provider.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1f2937' }}>{key.name}</div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            {key.provider} • {key.api_key_masked} • Used {key.usage_count}x
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: key.is_active ? '#dcfce7' : '#fee2e2',
                          color: key.is_active ? '#166534' : '#991b1b'
                        }}>
                          {key.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => handleDeleteAIKey(key.id, key.name)}
                          style={{
                            padding: '8px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    color: '#6b7280'
                  }}>
                    No AI API keys configured yet
                  </div>
                )}

                <button
                  onClick={() => setShowAddKeyModal(true)}
                  style={{
                    marginTop: '16px',
                    padding: '12px 24px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ➕ Add API Key
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add AI Key Modal */}
      {showAddKeyModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowAddKeyModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#1f2937' }}>
              🔑 Add AI API Key
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              Add an API key for AI services
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Provider */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Provider *
                </label>
                <select
                  value={newKeyData.provider}
                  onChange={(e) => setNewKeyData({ ...newKeyData, provider: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="openai">OpenAI (ChatGPT)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="azure">Azure OpenAI</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={newKeyData.name}
                  onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                  placeholder="e.g., Production GPT-4"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* API Key */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  API Key *
                </label>
                <input
                  type="password"
                  value={newKeyData.api_key}
                  onChange={(e) => setNewKeyData({ ...newKeyData, api_key: e.target.value })}
                  placeholder="sk-..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              {/* Model (optional) */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Default Model (optional)
                </label>
                <input
                  type="text"
                  value={newKeyData.model || ''}
                  onChange={(e) => setNewKeyData({ ...newKeyData, model: e.target.value })}
                  placeholder="e.g., gpt-4, claude-3-opus"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Test Result */}
              {testResult && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: testResult.success ? '#dcfce7' : '#fee2e2',
                  color: testResult.success ? '#166534' : '#991b1b',
                  fontSize: '14px'
                }}>
                  {testResult.success ? '✅' : '❌'} {testResult.message}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => {
                  setShowAddKeyModal(false);
                  setNewKeyData({ provider: 'openai', name: '', api_key: '', model: '' });
                  setTestResult(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleTestAIKey}
                disabled={testingKey}
                style={{
                  padding: '10px 20px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: testingKey ? 'wait' : 'pointer',
                  fontWeight: 600,
                  opacity: testingKey ? 0.7 : 1
                }}
              >
                {testingKey ? '⏳ Testing...' : '🧪 Test Connection'}
              </button>
              <button
                onClick={handleAddAIKey}
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                ✅ Add Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalContent.title}
        type={modalContent.type}
      >
        {modalContent.message}
      </Modal>

      {/* Plugin Configuration Modal */}
      {configModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setConfigModalOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#1f2937' }}>
              🔌 Configure Plugin
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              Set up {selectedPlugin?.folder_name} plugin configuration
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Plugin Name *
                </label>
                <input
                  type="text"
                  value={pluginConfig.name}
                  onChange={(e) => setPluginConfig({ ...pluginConfig, name: e.target.value })}
                  placeholder="e.g., Repository Monitor"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Description
                </label>
                <textarea
                  value={pluginConfig.description}
                  onChange={(e) => setPluginConfig({ ...pluginConfig, description: e.target.value })}
                  placeholder="Brief description of what this plugin does"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Icon */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  value={pluginConfig.icon}
                  onChange={(e) => setPluginConfig({ ...pluginConfig, icon: e.target.value })}
                  placeholder="🔌"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Version and Author */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                    Version
                  </label>
                  <input
                    type="text"
                    value={pluginConfig.version}
                    onChange={(e) => setPluginConfig({ ...pluginConfig, version: e.target.value })}
                    placeholder="1.0.0"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                    Author
                  </label>
                  <input
                    type="text"
                    value={pluginConfig.author}
                    onChange={(e) => setPluginConfig({ ...pluginConfig, author: e.target.value })}
                    placeholder="Your name"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* File Names */}
              <div style={{
                background: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>
                  Plugin Files
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>
                      HTML File
                    </label>
                    <input
                      type="text"
                      value={pluginConfig.html_file}
                      onChange={(e) => setPluginConfig({ ...pluginConfig, html_file: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '13px',
                        background: 'white'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>
                      JavaScript File
                    </label>
                    <input
                      type="text"
                      value={pluginConfig.script_file}
                      onChange={(e) => setPluginConfig({ ...pluginConfig, script_file: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '13px',
                        background: 'white'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#6b7280' }}>
                      CSS File
                    </label>
                    <input
                      type="text"
                      value={pluginConfig.style_file}
                      onChange={(e) => setPluginConfig({ ...pluginConfig, style_file: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '13px',
                        background: 'white'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setConfigModalOpen(false);
                  setSelectedPlugin(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#d1d5db'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#e5e7eb'}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePluginConfig}
                style={{
                  padding: '10px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
