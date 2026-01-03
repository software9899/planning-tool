import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import FloatingAIChat from '../components/FloatingAIChat';
import { isPluginEnabled } from '../utils/pluginLoader';

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(() => isPluginEnabled('ai-assistant'));

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  useEffect(() => {
    // Listen for plugin changes
    const handlePluginChange = () => {
      setAiAssistantEnabled(isPluginEnabled('ai-assistant'));
    };

    window.addEventListener('pluginsChanged', handlePluginChange);

    return () => {
      window.removeEventListener('pluginsChanged', handlePluginChange);
    };
  }, []);

  return (
    <div className="app-layout">
      <Sidebar isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
        <Outlet />
      </div>

      {/* Floating AI Chat Assistant - Only show when plugin is enabled */}
      {aiAssistantEnabled && <FloatingAIChat />}
    </div>
  );
}
