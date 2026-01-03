import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';
import type { Task } from '../services/api';

interface PerformanceDashboardProps {
  tasks: Task[];
}

const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PerformanceDashboard({ tasks }: PerformanceDashboardProps) {
  // Calculate metrics
  const metrics = useMemo(() => {
    const totalTasks = tasks.length;
    const todoTasks = tasks.filter(t => t.status === 'todo' || t.column === 'todo').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress' || t.column === 'in-progress').length;
    const doneTasks = tasks.filter(t => t.status === 'done' || t.column === 'done').length;
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    // Tasks by status
    const statusData = [
      { name: 'To Do', value: todoTasks, color: '#667eea' },
      { name: 'In Progress', value: inProgressTasks, color: '#f59e0b' },
      { name: 'Done', value: doneTasks, color: '#10b981' }
    ].filter(item => item.value > 0);

    // Tasks by priority
    const priorityCount: Record<string, number> = {};
    tasks.forEach(task => {
      const priority = task.priority || 'None';
      priorityCount[priority] = (priorityCount[priority] || 0) + 1;
    });
    const priorityData = Object.entries(priorityCount).map(([name, value]) => ({ name, value }));

    // Tasks by member
    const memberCount: Record<string, number> = {};
    tasks.forEach(task => {
      const assignee = task.assignee || task.assignedTo || task.assigned_to;
      const assignees = assignee ? (Array.isArray(assignee) ? assignee : [assignee]) : ['Unassigned'];
      assignees.forEach(name => {
        memberCount[name] = (memberCount[name] || 0) + 1;
      });
    });
    const memberData = Object.entries(memberCount)
      .map(([name, value]) => ({ name, tasks: value }))
      .sort((a, b) => b.tasks - a.tasks)
      .slice(0, 10);

    // Completion trend (last 30 days)
    const completionTrend: Record<string, { todo: number; inProgress: number; done: number }> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      completionTrend[dateStr] = { todo: 0, inProgress: 0, done: 0 };
    }

    tasks.forEach(task => {
      const createdDate = task.createdAt || task.created_at;
      if (createdDate) {
        const dateStr = new Date(createdDate).toISOString().split('T')[0];
        if (completionTrend[dateStr]) {
          const status = task.status || task.column || 'todo';
          if (status === 'todo') completionTrend[dateStr].todo++;
          else if (status === 'in-progress') completionTrend[dateStr].inProgress++;
          else if (status === 'done') completionTrend[dateStr].done++;
        }
      }
    });

    // Cumulative trend
    let cumulativeTodo = 0, cumulativeInProgress = 0, cumulativeDone = 0;
    const trendData = Object.entries(completionTrend).map(([date, counts]) => {
      cumulativeTodo += counts.todo;
      cumulativeInProgress += counts.inProgress;
      cumulativeDone += counts.done;
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        'To Do': cumulativeTodo,
        'In Progress': cumulativeInProgress,
        'Done': cumulativeDone,
        Total: cumulativeTodo + cumulativeInProgress + cumulativeDone
      };
    }).filter(d => d.Total > 0);

    // Estimate hours analysis
    const totalEstimateHours = tasks.reduce((sum, task) =>
      sum + (parseFloat(String(task.estimateHours || task.estimate_hours || 0))), 0
    );
    const doneEstimateHours = tasks
      .filter(t => t.status === 'done' || t.column === 'done')
      .reduce((sum, task) => sum + (parseFloat(String(task.estimateHours || task.estimate_hours || 0))), 0);

    // Weekly velocity (tasks completed per week)
    const weeklyVelocity: Record<string, number> = {};
    tasks.filter(t => t.status === 'done' || t.column === 'done').forEach(task => {
      const updatedDate = task.updatedAt || task.updated_at || task.createdAt || task.created_at;
      if (updatedDate) {
        const date = new Date(updatedDate);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekStr = weekStart.toISOString().split('T')[0];
        weeklyVelocity[weekStr] = (weeklyVelocity[weekStr] || 0) + 1;
      }
    });

    const velocityData = Object.entries(weeklyVelocity)
      .map(([week, count]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: count
      }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
      .slice(-8);

    return {
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      completionRate,
      statusData,
      priorityData,
      memberData,
      trendData,
      totalEstimateHours,
      doneEstimateHours,
      velocityData
    };
  }, [tasks]);

  return (
    <div style={{ marginBottom: '30px' }}>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Total Tasks</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{metrics.totalTasks}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Completed</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{metrics.doneTasks}</div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '5px' }}>{metrics.completionRate}% completion rate</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>In Progress</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{metrics.inProgressTasks}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', padding: '20px', borderRadius: '12px', color: 'white', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>Estimate Hours</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{metrics.totalEstimateHours.toFixed(0)}h</div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '5px' }}>{metrics.doneEstimateHours.toFixed(0)}h completed</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
        {/* Cumulative Progress Chart */}
        {metrics.trendData.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>📈 Cumulative Progress (30 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={metrics.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '11px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Legend />
                <Area type="monotone" dataKey="Done" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.8} />
                <Area type="monotone" dataKey="In Progress" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.8} />
                <Area type="monotone" dataKey="To Do" stackId="1" stroke="#667eea" fill="#667eea" fillOpacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status Distribution */}
        {metrics.statusData.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>📊 Task Distribution by Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={metrics.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {metrics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Member Performance */}
        {metrics.memberData.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>👥 Tasks by Team Member</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.memberData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '11px' }} />
                <YAxis type="category" dataKey="name" stroke="#6b7280" style={{ fontSize: '11px' }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="tasks" fill="#667eea" radius={[0, 8, 8, 0]}>
                  {metrics.memberData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weekly Velocity */}
        {metrics.velocityData.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>⚡ Weekly Velocity (Tasks Completed)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" stroke="#6b7280" style={{ fontSize: '11px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="completed" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Priority Distribution */}
        {metrics.priorityData.length > 0 && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>🎯 Tasks by Priority</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics.priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '11px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]}>
                  {metrics.priorityData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Burndown / Progress Chart */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', color: '#374151' }}>🔥 Burndown Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={[
              { name: 'To Do', value: metrics.todoTasks },
              { name: 'In Progress', value: metrics.inProgressTasks },
              { name: 'Done', value: metrics.doneTasks }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '11px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Line type="monotone" dataKey="value" stroke="#667eea" strokeWidth={3} dot={{ fill: '#667eea', r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
