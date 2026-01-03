import { useEffect, useState, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { DataManager, type Task } from '../services/api';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function AutoDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTasks();

    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadTasks();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  const loadTasks = async () => {
    try {
      const data = await DataManager.getTasks();
      setTasks(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  // Calculate velocity (tasks completed per week)
  const velocity = Math.round(stats.done / 4); // Assuming 4 weeks

  // Get last 7 days
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const days = getLast7Days();
  const totalTasks = tasks.length;

  // Burndown Chart Data
  const remainingTasks = days.map(date => {
    const completedByDate = tasks.filter(t => {
      if (t.status !== 'done') return false;
      const taskDate = new Date(t.updatedAt || t.createdAt).toISOString().split('T')[0];
      return taskDate <= date;
    }).length;
    return totalTasks - completedByDate;
  });

  const burndownData = {
    labels: days.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Remaining Tasks',
        data: remainingTasks,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Velocity Chart Data (last 4 weeks)
  const velocityData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Tasks Completed',
        data: [5, 8, 12, 10], // Placeholder data
        backgroundColor: '#10b981',
      },
    ],
  };

  const handleExport = () => {
    alert('Export to PDF feature coming soon!');
    // TODO: Implement PDF export using jsPDF
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            📊 Automated Dashboard
            {autoRefresh && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                background: '#10b981',
                color: 'white',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                animation: 'pulse 2s infinite'
              }}>
                🔄 Auto-refresh
              </span>
            )}
          </h1>
          <p style={{ color: '#6b7280' }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '8px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Auto-refresh (30s)</span>
          </label>

          <button
            onClick={handleExport}
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeft: '4px solid #667eea' }}>
          <div className="stat-info">
            <div className="stat-label">📊 Total</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #94a3b8' }}>
          <div className="stat-info">
            <div className="stat-label">📝 To Do</div>
            <div className="stat-value">{stats.todo}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-info">
            <div className="stat-label">⚙️ In Progress</div>
            <div className="stat-value">{stats.inProgress}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-info">
            <div className="stat-label">✅ Done</div>
            <div className="stat-value">{stats.done}</div>
          </div>
        </div>

        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderLeft: 'none'
        }}>
          <div className="stat-info">
            <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>🚀 Velocity</div>
            <div className="stat-value" style={{ color: 'white' }}>{velocity}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>tasks/week</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Burndown Chart */}
        <div className="chart-card">
          <h2>📉 Burndown Chart</h2>
          <div style={{ height: '300px' }}>
            <Line
              data={burndownData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px', textAlign: 'center' }}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        {/* Velocity Chart */}
        <div className="chart-card">
          <h2>🚀 Team Velocity</h2>
          <div style={{ height: '300px' }}>
            <Bar
              data={velocityData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px', textAlign: 'center' }}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
