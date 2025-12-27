import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAvailablePlugins, type PluginMetadata } from '../utils/pluginLoader';

export default function PluginContainer() {
  const { pluginId } = useParams<{ pluginId: string }>();
  const [plugin, setPlugin] = useState<PluginMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlugin() {
      try {
        const plugins = await getAvailablePlugins();
        const foundPlugin = plugins.find(p => p.id === pluginId);

        if (!foundPlugin) {
          setError(`Plugin "${pluginId}" not found`);
          setLoading(false);
          return;
        }

        setPlugin(foundPlugin);
        setLoading(false);
      } catch (err) {
        setError('Failed to load plugin');
        setLoading(false);
      }
    }

    loadPlugin();
  }, [pluginId]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading plugin...
      </div>
    );
  }

  if (error || !plugin) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '16px'
      }}>
        <div style={{ fontSize: '48px' }}>❌</div>
        <div style={{ fontSize: '18px', color: '#d32f2f', fontWeight: 600 }}>
          {error || 'Plugin not found'}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Plugin ID: {pluginId}
        </div>
      </div>
    );
  }

  // Construct the plugin URL
  const pluginUrl = `/api/plugins/${plugin.id}/html`;

  const handlePopOut = () => {
    window.open(pluginUrl, '_blank');
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Pop Out Button */}
      <button
        onClick={handlePopOut}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1000,
          padding: '10px 16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        }}
        title="Open in new window"
      >
        <span>🚀</span>
        <span>Pop Out</span>
      </button>

      <iframe
        src={pluginUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          overflow: 'hidden'
        }}
        title={plugin.name}
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
      />
    </div>
  );
}
