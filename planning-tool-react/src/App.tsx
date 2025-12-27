import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import TasksBoard from './pages/TasksBoard';
import TaskDetail from './pages/TaskDetail';
import Backlog from './pages/Backlog';
import Dashboard from './pages/Dashboard';
import Burndown from './pages/Burndown';
import AutoDashboard from './pages/AutoDashboard';
import TestCasesDashboard from './pages/TestCasesDashboard';
import AIAgent from './pages/AIAgent';
import Training from './pages/Training';
import Members from './pages/Members';
import OrgChart from './pages/OrgChart';
import SkillMatrix from './pages/SkillMatrix';
import LeaveManagement from './pages/LeaveManagement';
import Bookmarks from './pages/Bookmarks';
import Recruitment from './pages/Recruitment';
import PluginContainer from './components/PluginContainer';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import ComingSoon from './pages/ComingSoon';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { initializeDefaultData } from './utils/initializeData';

function App() {
  useEffect(() => {
    // Initialize default data on app load
    initializeDefaultData();

    // Load and apply theme from settings
    const loadTheme = () => {
      const storedSettings = localStorage.getItem('appSettings');
      if (storedSettings) {
        try {
          const settings = JSON.parse(storedSettings);
          if (settings.theme) {
            document.body.setAttribute('data-theme', settings.theme);
          }
        } catch (e) {
          console.error('Failed to load theme settings');
        }
      }
    };

    loadTheme();

    // Listen for theme changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appSettings') {
        loadTheme();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication routes (no layout) */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Main app routes (with layout) */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="tasks" element={<TasksBoard />} />
          <Route path="task-detail" element={<TaskDetail />} />
          <Route path="backlog" element={<Backlog />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboard-automated" element={<AutoDashboard />} />
          <Route path="dashboard-test-cases" element={<TestCasesDashboard />} />
          <Route path="burndown" element={<Burndown />} />
          <Route path="members" element={<Members />} />
          <Route path="org-chart" element={<OrgChart />} />
          <Route path="skill-matrix" element={<SkillMatrix />} />
          <Route path="leave-management" element={<LeaveManagement />} />
          <Route path="recruitment" element={<Recruitment />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="settings" element={<Settings />} />
          <Route path="ai-agent" element={<AIAgent />} />
          <Route path="training" element={<Training />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          {/* Plugin routes - dynamic loading */}
          <Route path="plugin/:pluginId" element={<PluginContainer />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
