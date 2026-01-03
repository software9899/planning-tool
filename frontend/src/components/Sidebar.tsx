import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAvailablePlugins, isPluginEnabled, togglePlugin, type PluginMetadata } from '../utils/pluginLoader';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('Member');
  const [userInitial, setUserInitial] = useState('U');
  const [plugins, setPlugins] = useState<PluginMetadata[]>([]);

  useEffect(() => {
    // Load user info from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || 'User');
        setUserRole(user.role || 'Member');
        setUserInitial((user.name || 'U')[0].toUpperCase());
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }

    // Load available plugins
    loadPlugins();

    // Listen for plugin changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'enabled_plugins') {
        loadPlugins();
      }
    };

    // Listen for plugin changes from same tab (custom event)
    const handlePluginChange = () => {
      loadPlugins();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pluginsChanged', handlePluginChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pluginsChanged', handlePluginChange);
    };
  }, []);

  const loadPlugins = async () => {
    const availablePlugins = await getAvailablePlugins();
    setPlugins(availablePlugins);
  };


  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      // Clear all auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenType');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('originalUser');

      // Redirect to login
      navigate('/login');
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} id="sidebar">
      {/* Toggle Button */}
      <div
        className="sidebar-toggle"
        id="sidebarToggle"
        title="หุบ/ขยาย Sidebar"
        onClick={onToggle}
      >
        {isCollapsed ? (
          // Panel Left Open - Show expand icon
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M9 3v18"></path>
            <path d="m14 9 3 3-3 3"></path>
          </svg>
        ) : (
          // Panel Left Close - Show collapse icon
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M9 3v18"></path>
            <path d="m16 15-3-3 3-3"></path>
          </svg>
        )}
      </div>

      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo">
          <span>📋 Planning Tool</span>
        </Link>
      </div>

      <nav className="sidebar-menu">
        {/* Main Section */}
        <div className="menu-section">
          <div className="menu-section-title">Main</div>
          <Link to="/" className={`menu-item ${isActive('/')}`}>
            <span className="menu-icon">🏠</span>
            <span>Home</span>
          </Link>
          <Link to="/tasks" className={`menu-item ${isActive('/tasks')}`}>
            <span className="menu-icon">📋</span>
            <span>Tasks Board</span>
          </Link>
          <Link to="/backlog" className={`menu-item ${isActive('/backlog')}`}>
            <span className="menu-icon">📦</span>
            <span>Backlog</span>
          </Link>
        </div>

        {/* Dashboards Section */}
        <div className="menu-section">
          <div className="menu-section-title">Dashboards</div>
          <Link to="/burndown" className={`menu-item ${isActive('/burndown')}`}>
            <span className="menu-icon">📈</span>
            <span>Burndown Chart</span>
          </Link>
          <Link to="/dashboard" className={`menu-item ${isActive('/dashboard')}`}>
            <span className="menu-icon">📊</span>
            <span>Dashboard</span>
          </Link>
          <Link to="/dashboard-automated" className={`menu-item ${isActive('/dashboard-automated')}`}>
            <span className="menu-icon">🔄</span>
            <span>Auto Dashboard</span>
          </Link>
          {isPluginEnabled('test-cases') && (
            <Link to="/dashboard-test-cases" className={`menu-item ${isActive('/dashboard-test-cases')}`}>
              <span className="menu-icon">🧪</span>
              <span>Test Cases</span>
            </Link>
          )}
        </div>

        {/* HR Management Section - Shown when HR plugin is active */}
        {userRole.toLowerCase() === 'admin' && isPluginEnabled('hr') && (
          <div className="menu-section">
            <div className="menu-section-title">HR Management</div>
            <Link to="/org-chart" className={`menu-item ${isActive('/org-chart')}`}>
              <span className="menu-icon">🏢</span>
              <span>Org Chart</span>
            </Link>
            <Link to="/skill-matrix" className={`menu-item ${isActive('/skill-matrix')}`}>
              <span className="menu-icon">🎯</span>
              <span>Skill Matrix</span>
            </Link>
            <Link to="/leave-management" className={`menu-item ${isActive('/leave-management')}`}>
              <span className="menu-icon">🏖️</span>
              <span>Leave Management</span>
            </Link>
            <Link to="/recruitment" className={`menu-item ${isActive('/recruitment')}`}>
              <span className="menu-icon">👔</span>
              <span>Recruitment</span>
            </Link>
            <Link to="/plugin/kpi" className={`menu-item ${isActive('/plugin/kpi')}`}>
              <span className="menu-icon">📊</span>
              <span>KPI Dashboard</span>
            </Link>
          </div>
        )}

        {/* Settings Section - Admin/Lead Only */}
        {userRole.toLowerCase() === 'admin' && (
          <div className="menu-section">
            <div className="menu-section-title">Settings</div>
            <Link to="/members" className={`menu-item ${isActive('/members')}`}>
              <span className="menu-icon">👥</span>
              <span>Members & Teams</span>
            </Link>
            <Link to="/settings" className={`menu-item ${isActive('/settings')}`}>
              <span className="menu-icon">⚙️</span>
              <span>Settings</span>
            </Link>
          </div>
        )}

        {/* Plugins Section */}
        <div className="menu-section">
          <div className="menu-section-title">Plugins</div>

          {/* Enabled Plugins Only */}
          {plugins
            .filter(plugin => {
              if (plugin.hidden) return false;
              // Don't show KPI plugin here if HR plugin is active (KPI will be in Management section)
              if (plugin.id === 'kpi' && isPluginEnabled('hr')) return false;
              return isPluginEnabled(plugin.id);
            })
            .map(plugin => (
              <Link
                key={plugin.id}
                to={plugin.route}
                className={`menu-item ${isActive(plugin.route)}`}
              >
                <span className="menu-icon">{plugin.icon}</span>
                <span>{plugin.sidebarLabel}</span>
              </Link>
            ))}
        </div>
      </nav>

      <div className="sidebar-footer" style={{ padding: '20px', borderTop: '1px solid var(--sidebar-border)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          background: 'var(--sidebar-border)',
          borderRadius: '10px',
          marginBottom: '12px'
        }}>
          <div
            className="profile-avatar"
            id="sidebarAvatar"
            style={{
              width: '40px',
              height: '40px',
              fontSize: '16px',
              background: 'linear-gradient(135deg, var(--primary-gradient-start) 0%, var(--primary-gradient-end) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              id="sidebarUserName"
              style={{
                fontWeight: 600,
                fontSize: '14px',
                color: 'var(--sidebar-text-hover)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {userName}
            </div>
            <div
              id="sidebarUserRole"
              style={{
                fontSize: '11px',
                color: 'var(--sidebar-text)',
                textTransform: 'uppercase'
              }}
            >
              {userRole}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '10px',
            background: 'var(--sidebar-border)',
            border: '1px solid var(--sidebar-border)',
            borderRadius: '8px',
            color: 'var(--sidebar-text-hover)',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
