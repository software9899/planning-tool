import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { type Task } from '../services/api';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface DashboardViewProps {
  tasks: Task[];
  loading?: boolean;
}

export default function DashboardView({ tasks, loading = false }: DashboardViewProps) {
  // Calculate stats for charts only
  const stats = {
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    high: tasks.filter(t => t.priority === 'high' || t.priority === 'High').length,
    medium: tasks.filter(t => t.priority === 'medium' || t.priority === 'Medium').length,
    low: tasks.filter(t => t.priority === 'low' || t.priority === 'Low').length,
  };

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

  // Calculate remaining tasks for each day
  const remainingTasks = days.map(date => {
    const completedByDate = tasks.filter(t => {
      if (t.status !== 'done') return false;
      const dateValue = t.updatedAt || t.createdAt;
      if (!dateValue) return false;
      const taskDate = new Date(dateValue).toISOString().split('T')[0];
      return taskDate <= date;
    }).length;
    return totalTasks - completedByDate;
  });

  // Burndown Chart Data with real data
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

  // Get tasks completed on specific date
  const getTasksCompletedOnDate = (date: string) => {
    return tasks.filter(t => {
      if (t.status !== 'done') return false;
      const dateValue = t.updatedAt || t.createdAt;
      if (!dateValue) return false;
      const taskDate = new Date(dateValue).toISOString().split('T')[0];
      return taskDate === date;
    });
  };

  // Stack Bar Chart Data with real data
  const taskTypes = ['Feature', 'Bug', 'Improvement', 'Documentation', 'Other'];
  const stackBarData = {
    labels: days.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: taskTypes.map((type, index) => {
      const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];
      return {
        label: type,
        data: days.map(date => {
          return getTasksCompletedOnDate(date).filter(t => t.type === type).length;
        }),
        backgroundColor: colors[index % colors.length]
      };
    })
  };

  // Type Pie Chart Data with real data
  const doneTasks_filtered = tasks.filter(t => t.status === 'done');
  const typeCounts = taskTypes.reduce((acc, type) => {
    acc[type] = doneTasks_filtered.filter(t => t.type === type).length;
    return acc;
  }, {} as Record<string, number>);

  const typePieData = {
    labels: Object.keys(typeCounts).filter(key => typeCounts[key] > 0),
    datasets: [
      {
        data: Object.values(typeCounts).filter(val => val > 0),
        backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'],
      },
    ],
  };

  // Priority Pie Chart Data
  const priorityPieData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        data: [stats.high, stats.medium, stats.low],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
      },
    ],
  };

  // Status Chart Data
  const statusData = {
    labels: ['To Do', 'In Progress', 'Done'],
    datasets: [
      {
        label: 'Tasks',
        data: [stats.todo, stats.inProgress, stats.done],
        backgroundColor: ['#6b7280', '#667eea', '#10b981'],
      },
    ],
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
      {/* Charts */}
      <div className="charts-grid">
        {/* Burndown Chart */}
        <div className="chart-card full-width">
          <h2>🔥 Burndown Chart</h2>
          <Line data={burndownData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        {/* Daily Stack Bar Chart */}
        <div className="chart-card full-width">
          <h2>📊 Daily Completion by Type</h2>
          <Bar data={stackBarData} options={{ responsive: true, maintainAspectRatio: true, scales: { x: { stacked: true }, y: { stacked: true } } }} />
        </div>

        {/* Type Pie Chart */}
        <div className="chart-card">
          <h2>📋 Done Tasks by Type</h2>
          <Pie data={typePieData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        {/* Priority Pie Chart */}
        <div className="chart-card">
          <h2>🎯 Priority Distribution</h2>
          <Pie data={priorityPieData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        {/* Status Chart */}
        <div className="chart-card">
          <h2>📈 Status Overview</h2>
          <Bar data={statusData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      </div>
    </div>
  );
}
