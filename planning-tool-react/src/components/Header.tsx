import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userInitial, setUserInitial] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalUserName, setOriginalUserName] = useState('');
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Get page title based on current path
  const getPageTitle = () => {
    const path = location.pathname;
    const titles: { [key: string]: string } = {
      '/': '🏠 Home',
      '/tasks': '📋 Tasks Board',
      '/backlog': '📦 Product Backlog',
      '/dashboard': '📊 Dashboard',
      '/dashboard-automated': '🔄 Automated Dashboard',
      '/dashboard-test-cases': '🧪 Test Cases Dashboard',
      '/burndown': '📈 Burndown Chart',
      '/members': '👥 Members & Teams',
      '/user-management': '🔐 User Management',
      '/settings': '⚙️ Settings',
      '/ai-agent': '🤖 AI Agent',
      '/bookmarks': '🔖 Bookmarks',
      '/task-detail': '📝 Task Details',
      '/skill-matrix': '🎯 Skill Matrix',
      '/training': '🎓 Training'
    };
    return titles[path] || '🏠 Home';
  };

  useEffect(() => {
    // Load user info from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || '');
        setUserEmail(user.email || '');
        setUserRole(user.role || '');
        setUserInitial((user.name || '?')[0].toUpperCase());
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }

    // Check if impersonating
    const originalUser = localStorage.getItem('originalUser');
    if (originalUser) {
      try {
        const original = JSON.parse(originalUser);
        setIsImpersonating(true);
        setOriginalUserName(original.name || '');
      } catch (e) {
        console.error('Failed to parse original user data');
      }
    } else {
      setIsImpersonating(false);
    }
  }, [location]); // Re-check when location changes

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const viewProfile = () => {
    alert('Profile view - To be implemented');
    setShowProfileMenu(false);
  };

  const logout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('originalUser'); // Clear impersonation
      navigate('/login');
    }
    setShowProfileMenu(false);
  };

  const switchBackToOriginal = () => {
    const originalUser = localStorage.getItem('originalUser');
    if (!originalUser) return;

    if (confirm(`Switch back to ${originalUserName}?`)) {
      localStorage.setItem('currentUser', originalUser);
      localStorage.removeItem('originalUser');
      window.location.reload();
    }
  };

  return (
    <header>
      <h1>{getPageTitle()}</h1>
      <div className="header-buttons">
        {/* Impersonation Banner - Show if viewing as another user */}
        {isImpersonating && (
          <button
            onClick={switchBackToOriginal}
            style={{
              marginRight: '15px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.3)';
            }}
            title={`Currently viewing as ${userName}. Click to switch back to ${originalUserName}`}
          >
            <span>👤</span>
            <span>Switch back to {originalUserName}</span>
          </button>
        )}
        {/* Profile Dropdown */}
        <div className="profile-dropdown" ref={profileDropdownRef}>
          <div
            className="profile-btn dropdown-toggle"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="profile-avatar" id="profileAvatar">
              {userInitial}
            </div>
            <span className="profile-name" id="profileName">
              {userName}
            </span>
            <span className="profile-arrow">▼</span>
          </div>

          {showProfileMenu && (
            <div className="dropdown-menu profile-menu" style={{ display: 'block' }}>
              <div className="profile-info">
                <div className="profile-avatar-large" id="profileAvatarLarge">
                  {userInitial}
                </div>
                <div className="profile-details">
                  <div className="profile-display-name" id="profileDisplayName">
                    {userName}
                  </div>
                  <div className="profile-email" id="profileEmail">
                    {userEmail}
                  </div>
                  <div className="profile-role-badge" id="profileRoleBadge">
                    {userRole}
                  </div>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <a
                href="#"
                className="dropdown-item"
                onClick={(e) => {
                  e.preventDefault();
                  viewProfile();
                }}
              >
                <span className="dropdown-icon">👤</span>
                View Profile
              </a>
              <a
                href="#"
                className="dropdown-item"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/settings');
                  setShowProfileMenu(false);
                }}
              >
                <span className="dropdown-icon">⚙️</span>
                Settings
              </a>
              <div className="dropdown-divider"></div>
              <a
                href="#"
                className="dropdown-item danger"
                onClick={(e) => {
                  e.preventDefault();
                  logout();
                }}
              >
                <span className="dropdown-icon">🚪</span>
                Logout
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
