import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface TestCase {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'pending';
  category: string;
  priority: string;
  lastRun: string;
}

export default function TestCasesDashboard() {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestCases();
  }, []);

  const loadTestCases = () => {
    // Mock data for now - replace with actual API call
    const mockData: TestCase[] = [
      { id: '1', name: 'User Login Test', status: 'passed', category: 'Authentication', priority: 'High', lastRun: new Date().toISOString() },
      { id: '2', name: 'User Registration Test', status: 'passed', category: 'Authentication', priority: 'High', lastRun: new Date().toISOString() },
      { id: '3', name: 'Task Creation Test', status: 'failed', category: 'Tasks', priority: 'Medium', lastRun: new Date().toISOString() },
      { id: '4', name: 'Task Update Test', status: 'passed', category: 'Tasks', priority: 'Medium', lastRun: new Date().toISOString() },
      { id: '5', name: 'Dashboard Load Test', status: 'pending', category: 'UI', priority: 'Low', lastRun: new Date().toISOString() },
    ];
    setTestCases(mockData);
    setLoading(false);
  };

  // Calculate statistics
  const stats = {
    total: testCases.length,
    passed: testCases.filter(t => t.status === 'passed').length,
    failed: testCases.filter(t => t.status === 'failed').length,
    pending: testCases.filter(t => t.status === 'pending').length,
  };

  const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

  // Status Chart Data
  const statusChartData = {
    labels: ['Passed', 'Failed', 'Pending'],
    datasets: [
      {
        data: [stats.passed, stats.failed, stats.pending],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
      },
    ],
  };

  // Category Chart Data
  const categoryData = testCases.reduce((acc, tc) => {
    acc[tc.category] = (acc[tc.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = {
    labels: Object.keys(categoryData),
    datasets: [
      {
        label: 'Test Cases by Category',
        data: Object.values(categoryData),
        backgroundColor: ['#667eea', '#764ba2', '#f093fb'],
      },
    ],
  };

  const runAllTests = () => {
    alert('Running all tests... This feature is coming soon!');
  };

  const runFailedTests = () => {
    alert('Running failed tests... This feature is coming soon!');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading test cases...</div>
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
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '10px' }}>
            🧪 Test Cases Dashboard
          </h1>
          <p style={{ color: '#6b7280' }}>Monitor and manage your test cases</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={runAllTests}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            ▶️ Run All Tests
          </button>

          <button
            onClick={runFailedTests}
            style={{
              padding: '10px 20px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            🔄 Rerun Failed
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeft: '4px solid #667eea' }}>
          <div className="stat-info">
            <div className="stat-label">📊 Total Tests</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-info">
            <div className="stat-label">✅ Passed</div>
            <div className="stat-value" style={{ color: '#10b981' }}>{stats.passed}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="stat-info">
            <div className="stat-label">❌ Failed</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{stats.failed}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-info">
            <div className="stat-label">⏳ Pending</div>
            <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.pending}</div>
          </div>
        </div>

        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderLeft: 'none'
        }}>
          <div className="stat-info">
            <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>📈 Pass Rate</div>
            <div className="stat-value" style={{ color: 'white' }}>{passRate}%</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Status Chart */}
        <div className="chart-card">
          <h2>📊 Test Status Distribution</h2>
          <div style={{ height: '300px' }}>
            <Pie
              data={statusChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
              }}
            />
          </div>
        </div>

        {/* Category Chart */}
        <div className="chart-card">
          <h2>📋 Tests by Category</h2>
          <div style={{ height: '300px' }}>
            <Bar
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="chart-card full-width" style={{ marginTop: '24px' }}>
        <h2>📝 Test Cases</h2>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Category</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Priority</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Last Run</th>
            </tr>
          </thead>
          <tbody>
            {testCases.map(tc => (
              <tr key={tc.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{tc.name}</td>
                <td style={{ padding: '12px' }}>{tc.category}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: tc.priority === 'High' ? '#fee2e2' : tc.priority === 'Medium' ? '#fef3c7' : '#dbeafe',
                    color: tc.priority === 'High' ? '#dc2626' : tc.priority === 'Medium' ? '#d97706' : '#2563eb'
                  }}>
                    {tc.priority}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: tc.status === 'passed' ? '#d1fae5' : tc.status === 'failed' ? '#fee2e2' : '#fef3c7',
                    color: tc.status === 'passed' ? '#059669' : tc.status === 'failed' ? '#dc2626' : '#d97706'
                  }}>
                    {tc.status === 'passed' ? '✅ Passed' : tc.status === 'failed' ? '❌ Failed' : '⏳ Pending'}
                  </span>
                </td>
                <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
                  {new Date(tc.lastRun).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
