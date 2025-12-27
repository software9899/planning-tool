import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { DataManager, type Task } from '../services/api';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Burndown() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days'>('30days');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await DataManager.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo' || t.column === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress' || t.column === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done' || t.column === 'done').length,
  };

  // Get date range based on selection
  const getDateRange = () => {
    const days = [];
    const dayCount = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;

    for (let i = dayCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const days = getDateRange();
  const totalTasks = tasks.length;

  // Calculate remaining tasks for each day
  const remainingTasks = days.map(date => {
    const completedByDate = tasks.filter(t => {
      if (t.status !== 'done' && t.column !== 'done') return false;
      const dateValue = t.updatedAt || t.updated_at || t.createdAt || t.created_at;
      if (!dateValue) return false;
      const taskDate = new Date(dateValue).toISOString().split('T')[0];
      return taskDate <= date;
    }).length;
    return totalTasks - completedByDate;
  });

  // Calculate ideal burndown line (linear from total to 0)
  const idealBurndown = days.map((_, index) => {
    return totalTasks - (totalTasks / (days.length - 1)) * index;
  });

  // Burndown Chart Data
  const burndownData = {
    labels: days.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Actual Remaining Tasks',
        data: remainingTasks,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Ideal Burndown',
        data: idealBurndown,
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0,
        fill: false,
        borderWidth: 2,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Remaining Tasks',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
    },
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading burndown chart...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937', marginBottom: '10px' }}>
          🔥 Burndown Chart
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Track your team's progress over time. The blue line shows actual remaining tasks, while the red dashed line shows the ideal burndown rate.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Total Tasks</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{stats.total}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(107, 114, 128, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>To Do</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{stats.todo}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>In Progress</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{stats.inProgress}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Done</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{stats.done}</div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '5px' }}>
            {stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}% complete
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Time Range:</span>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => setTimeRange('7days')}
            style={{
              padding: '8px 16px',
              border: timeRange === '7days' ? '2px solid #667eea' : '2px solid #e5e7eb',
              background: timeRange === '7days' ? '#ede9fe' : 'white',
              color: timeRange === '7days' ? '#667eea' : '#6b7280',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            style={{
              padding: '8px 16px',
              border: timeRange === '30days' ? '2px solid #667eea' : '2px solid #e5e7eb',
              background: timeRange === '30days' ? '#ede9fe' : 'white',
              color: timeRange === '30days' ? '#667eea' : '#6b7280',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('90days')}
            style={{
              padding: '8px 16px',
              border: timeRange === '90days' ? '2px solid #667eea' : '2px solid #e5e7eb',
              background: timeRange === '90days' ? '#ede9fe' : 'white',
              color: timeRange === '90days' ? '#667eea' : '#6b7280',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            Last 90 Days
          </button>
        </div>
      </div>

      {/* Burndown Chart */}
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        height: '500px'
      }}>
        <Line data={burndownData} options={chartOptions} />
      </div>

      {/* Insights */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#374151' }}>
          📊 Insights
        </h3>
        <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
          {remainingTasks[remainingTasks.length - 1] < idealBurndown[idealBurndown.length - 1] ? (
            <div style={{ color: '#10b981', fontWeight: 600 }}>
              ✅ Great job! Your team is ahead of schedule. The actual burndown is below the ideal line.
            </div>
          ) : remainingTasks[remainingTasks.length - 1] === idealBurndown[idealBurndown.length - 1] ? (
            <div style={{ color: '#667eea', fontWeight: 600 }}>
              ✨ Perfect! Your team is on track with the ideal burndown rate.
            </div>
          ) : (
            <div style={{ color: '#f59e0b', fontWeight: 600 }}>
              ⚠️ Your team is behind schedule. Consider reviewing task priorities or adding more resources.
            </div>
          )}
          <div style={{ marginTop: '10px' }}>
            <strong>Current remaining tasks:</strong> {remainingTasks[remainingTasks.length - 1]} <br />
            <strong>Ideal remaining tasks:</strong> {Math.round(idealBurndown[idealBurndown.length - 1])}
          </div>
        </div>
      </div>
    </div>
  );
}
