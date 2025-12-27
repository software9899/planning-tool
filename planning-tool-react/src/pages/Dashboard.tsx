import { useEffect, useState } from 'react';
import { DataManager, type Task } from '../services/api';
import DashboardView from '../components/DashboardView';
import PerformanceDashboard from '../components/PerformanceDashboard';

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="dashboard-container">
      <PerformanceDashboard tasks={tasks} />
      <DashboardView tasks={tasks} loading={loading} />
    </div>
  );
}
