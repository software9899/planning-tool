import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status?: 'active' | 'inactive';
  created_at?: string;
  avatar_url?: string | null;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user is admin
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role?.toLowerCase() !== 'admin') {
          alert('Access Denied: Admin privileges required');
          navigate('/');
          return;
        }
        // Load users if admin
        loadUsers();
      } catch (e) {
        navigate('/');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers();
      // Map to include status (all users are active by default)
      const mappedUsers = data.map((user: any) => ({
        ...user,
        status: 'active' as const
      }));
      setUsers(mappedUsers);
    } catch (err: any) {
      setError('Failed to load users from database');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return '#dc2626';
      case 'member': return '#667eea';
      default: return '#6b7280';
    }
  };

  return (
    <div className="user-management-container">
      <div className="page-header">
        <div>
          <h1>🔐 System Administration</h1>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            Manage user accounts, authentication, and system permissions
          </p>
        </div>
        <button className="add-btn" onClick={() => navigate('/register')}>
          ➕ Add User
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Loading users...
        </div>
      )}

      {error && (
        <div style={{
          background: '#fed7d7',
          color: '#c53030',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="users-table-container">
            <div style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
              Total Users: <strong>{users.length}</strong>
            </div>
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#6b7280' }}>#{user.id}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1f2937' }}>{user.name}</div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-badge" style={{
                        background: getRoleBadgeColor(user.role),
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.status}`}>
                        {user.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                      </span>
                    </td>
                    <td>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="action-btn edit"
                          title="Edit user"
                          onClick={() => alert('Edit feature coming soon!')}
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn delete"
                          title="Delete user"
                          onClick={() => {
                            if (confirm(`Delete user ${user.name}?`)) {
                              alert('Delete feature coming soon!');
                            }
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="permissions-section">
        <h2>🔐 System Roles & Permissions</h2>
        <p style={{ color: '#6b7280', marginTop: '8px', marginBottom: '20px' }}>
          Define what each role can do in the system
        </p>
        <div className="permissions-grid">
          <div className="permission-card">
            <h3 style={{ color: '#dc2626' }}>🛡️ Admin</h3>
            <ul>
              <li>✅ Full system access</li>
              <li>✅ User Management (create/edit/delete users)</li>
              <li>✅ System settings and configuration</li>
              <li>✅ Manage all tasks and projects</li>
              <li>✅ View all analytics and reports</li>
              <li>✅ Database migration access</li>
            </ul>
          </div>
          <div className="permission-card">
            <h3 style={{ color: '#667eea' }}>👤 Member</h3>
            <ul>
              <li>✅ Create and edit own tasks</li>
              <li>✅ Comment on tasks</li>
              <li>✅ View dashboards and analytics</li>
              <li>✅ Participate in teams</li>
              <li>✅ Update skill matrix</li>
              <li>❌ User management</li>
              <li>❌ System administration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
