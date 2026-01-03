import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';

interface Stats {
  totalTasks: number;
  inProgress: number;
  completed: number;
  pending: number;
  completionRate: number;
}

interface RecentTask {
  id: number;
  title: string;
  status: string;
  priority?: string;
}

export default function Home() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('Member');
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    inProgress: 0,
    completed: 0,
    pending: 0,
    completionRate: 0
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
      navigate('/login');
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      if (!user.email) {
        navigate('/login');
        return;
      }
      setUserName(user.name || 'User');
      setUserRole(user.role || 'Member');
    } catch (e) {
      console.error('Failed to parse user data');
      navigate('/login');
      return;
    }

    loadStats();
  }, [navigate]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const tasks = await ApiService.getTasks();

      const inProgress = tasks.filter((t: any) =>
        t.status === 'In Progress' || t.column === 'in-progress'
      ).length;

      const completed = tasks.filter((t: any) =>
        t.status === 'Done' || t.column === 'done'
      ).length;

      const pending = tasks.filter((t: any) =>
        t.status === 'To Do' || t.column === 'todo' || t.status === 'Backlog'
      ).length;

      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

      setStats({
        totalTasks,
        inProgress,
        completed,
        pending,
        completionRate
      });

      // Get recent tasks (last 5)
      const recent = tasks
        .sort((a: any, b: any) => {
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status || t.column,
          priority: t.priority
        }));

      setRecentTasks(recent);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getMotivationalMessage = () => {
    const messages = [
      'Ready to make today productive?',
      'Every task completed is a step forward!',
      'Focus on progress, not perfection.',
      'You\'ve got this! Let\'s tackle those tasks.',
      'Small steps lead to big achievements.',
      'Stay focused and keep moving forward!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('done') || statusLower.includes('complete')) return '#10b981';
    if (statusLower.includes('progress')) return '#f59e0b';
    return '#6b7280';
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return '#6b7280';
    const priorityLower = priority.toLowerCase();
    if (priorityLower === 'high') return '#ef4444';
    if (priorityLower === 'medium') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="tasks-board-container">
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '40px',
        marginBottom: '30px',
        color: 'white',
        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
      }}>
        <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '8px' }}>
          {getGreeting()}, {userName}!
        </div>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 700,
          margin: '0 0 12px',
          color: 'white'
        }}>
          Welcome to Your Workspace
        </h1>
        <p style={{
          fontSize: '18px',
          opacity: 0.9,
          margin: '0 0 24px',
          maxWidth: '600px'
        }}>
          {getMotivationalMessage()}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/backlog')}
            style={{
              background: 'white',
              color: '#667eea',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Create New Task
          </button>
          <button
            onClick={() => navigate('/tasks')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '2px solid white',
              padding: '12px 24px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.color = '#667eea';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = 'white';
            }}
          >
            View All Tasks
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Loading your stats...
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            {/* Total Tasks */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Tasks
                </div>
                <div style={{ fontSize: '24px' }}>📋</div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937' }}>
                {stats.totalTasks}
              </div>
            </div>

            {/* In Progress */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                  In Progress
                </div>
                <div style={{ fontSize: '24px' }}>⚡</div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#f59e0b' }}>
                {stats.inProgress}
              </div>
            </div>

            {/* Completed */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                  Completed
                </div>
                <div style={{ fontSize: '24px' }}>✅</div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#10b981' }}>
                {stats.completed}
              </div>
            </div>

            {/* Completion Rate */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                  Completion Rate
                </div>
                <div style={{ fontSize: '24px' }}>🎯</div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#667eea' }}>
                {stats.completionRate}%
              </div>
            </div>
          </div>

          {/* Recent Tasks */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                Recent Tasks
              </h2>
              <button
                onClick={() => navigate('/tasks')}
                style={{
                  background: 'transparent',
                  color: '#667eea',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                View All →
              </button>
            </div>

            {recentTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                <p>No tasks yet. Create your first task to get started!</p>
                <button
                  onClick={() => navigate('/backlog')}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '16px'
                  }}
                >
                  Create Task
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    style={{
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#667eea';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: getStatusColor(task.status) + '20',
                          color: getStatusColor(task.status),
                          fontWeight: 600
                        }}>
                          {task.status}
                        </span>
                        {task.priority && (
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: getPriorityColor(task.priority) + '20',
                            color: getPriorityColor(task.priority),
                            fontWeight: 600
                          }}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '20px' }}>→</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
