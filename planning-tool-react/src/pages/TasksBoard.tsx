import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataManager, type Task } from '../services/api';
import CreateTaskModal from '../components/CreateTaskModal';
import EditTaskModal from '../components/EditTaskModal';
import AssigneeModal from '../components/AssigneeModal';
import MultiAssigneeModal from '../components/MultiAssigneeModal';
import TaskSettingsPanel from '../components/TaskSettingsPanel';
import DashboardView from '../components/DashboardView';

type ViewMode = 'kanban' | 'table' | 'timeline' | 'dashboard';
type TableFilter = 'all' | 'todo' | 'in-progress' | 'done' | 'assignedToMe';

export default function TasksBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [tableFilter, setTableFilter] = useState<TableFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [showMultiAssigneeModal, setShowMultiAssigneeModal] = useState(false);
  const [pendingTaskMove, setPendingTaskMove] = useState<{ task: Task; newStatus: string; draggedBy?: string } | null>(null);
  const [selectedTaskForAssignees, setSelectedTaskForAssignees] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [recentlyMovedTaskIds, setRecentlyMovedTaskIds] = useState<(number | string)[]>([]);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(() => {
    const saved = localStorage.getItem('taskSettingsPanelOpen');
    return saved ? JSON.parse(saved) : false;
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
    loadUsers();
    // Load saved view mode
    const savedView = localStorage.getItem('viewMode');
    if (savedView && (savedView === 'kanban' || savedView === 'table' || savedView === 'timeline' || savedView === 'dashboard')) {
      setViewMode(savedView as ViewMode);
    }
  }, []);

  // Persist settings panel state
  useEffect(() => {
    localStorage.setItem('taskSettingsPanelOpen', JSON.stringify(settingsPanelOpen));
  }, [settingsPanelOpen]);

  // Auto-clear recently moved highlight after 3 seconds
  useEffect(() => {
    if (recentlyMovedTaskIds.length > 0) {
      const timers: number[] = [];

      recentlyMovedTaskIds.forEach(taskId => {
        // Trigger fade animation after a tiny delay
        setTimeout(() => {
          const card = document.querySelector(`[data-task-id="${taskId}"]`);
          if (card) {
            card.classList.add('fading');
          }
        }, 50);

        // Remove from array after 3 seconds
        const timer = setTimeout(() => {
          setRecentlyMovedTaskIds(prev => prev.filter(id => id !== taskId));
        }, 3000);
        timers.push(timer);
      });

      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [recentlyMovedTaskIds]);

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

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const getTasksByStatus = (status: string) => {
    const filteredTasks = tasks.filter(task =>
      (task.status === status || task.column === status)
    );

    // Sort by last updated (most recent first)
    return filteredTasks.sort((a, b) => {
      const aUpdated = a.updatedAt || a.updated_at || a.createdAt || a.created_at || '';
      const bUpdated = b.updatedAt || b.updated_at || b.createdAt || b.created_at || '';
      return bUpdated.localeCompare(aUpdated);
    });
  };

  const handleTaskClick = (taskId: number | string | undefined) => {
    if (taskId) {
      navigate(`/task-detail?id=${taskId}`);
    }
  };

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

  // Native HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();

    if (!draggedTask) return;

    console.log('Dropping task:', draggedTask.title, 'to:', newStatus);

    // Check if moving to "in-progress" and task needs assignee or estimate hours
    if (newStatus === 'in-progress') {
      const assignee = draggedTask.assignee || draggedTask.assignedTo || draggedTask.assigned_to;
      const estimate = draggedTask.estimateHours || draggedTask.estimate_hours;

      console.log('Checking assignee and estimate:', { assignee, estimate });

      if (!assignee || !estimate) {
        console.log('Opening assignee modal');

        // Get current user (the person dragging)
        const currentUserData = localStorage.getItem('currentUser');
        const draggedBy = currentUserData ? JSON.parse(currentUserData).name : undefined;

        // Show modal to collect assignee and estimate hours
        setPendingTaskMove({ task: draggedTask, newStatus, draggedBy });
        setTimeout(() => {
          setShowAssigneeModal(true);
        }, 100);
        setDraggedTask(null);
        return;
      }
    }

    const updatedTask = {
      ...draggedTask,
      status: newStatus,
      column: newStatus,
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // Mark as recently moved for highlight effect
      setRecentlyMovedTaskIds(prev => [...prev, draggedTask.id!]);

      // Update local state immediately
      setTasks(prevTasks =>
        prevTasks.map(t => t.id === draggedTask.id ? updatedTask : t)
      );

      // Update in API/localStorage
      await DataManager.updateTask(updatedTask);
      console.log('✅ Task updated successfully');
    } catch (error) {
      console.error('❌ Failed to update task:', error);
      // Revert on error
      setTasks(prevTasks =>
        prevTasks.map(t => t.id === draggedTask.id ? draggedTask : t)
      );
      setRecentlyMovedTaskIds(prev => prev.filter(id => id !== draggedTask.id));
    } finally {
      setDraggedTask(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleAssigneeConfirm = async (assignee: string, estimateHours: number) => {
    if (!pendingTaskMove) return;

    const { task, newStatus } = pendingTaskMove;

    // Get existing assignees as array
    const existingAssignee = task.assignee || task.assignedTo || task.assigned_to;
    let assigneesArray: string[] = [];

    if (Array.isArray(existingAssignee)) {
      // Already an array, add new assignee if not already included
      assigneesArray = existingAssignee.includes(assignee) ? existingAssignee : [...existingAssignee, assignee];
    } else if (existingAssignee && typeof existingAssignee === 'string') {
      // Convert to array and add new assignee if different
      assigneesArray = existingAssignee === assignee ? [existingAssignee] : [existingAssignee, assignee];
    } else {
      // No existing assignee, create new array
      assigneesArray = [assignee];
    }

    const updatedTask = {
      ...task,
      status: newStatus,
      column: newStatus,
      assignee: assigneesArray,
      assignedTo: assigneesArray[0],
      assigned_to: assigneesArray[0],
      estimateHours: estimateHours,
      estimate_hours: estimateHours,
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('🔵 handleAssigneeConfirm - Updated task:', updatedTask);

    try {
      // Mark as recently moved for highlight effect
      setRecentlyMovedTaskIds(prev => [...prev, task.id!]);

      console.log('🔵 Calling DataManager.updateTask...');
      const result = await DataManager.updateTask(updatedTask);
      console.log('✅ DataManager.updateTask result:', result);

      // Reload all tasks to ensure consistency
      console.log('🔵 Reloading tasks...');
      const allTasks = await DataManager.getTasks();
      console.log('✅ Got tasks:', allTasks.length, 'tasks');
      setTasks(allTasks);

      setShowAssigneeModal(false);
      setPendingTaskMove(null);
      console.log('✅ Task update completed successfully');
    } catch (error) {
      console.error('❌ Failed to update task:', error);
      alert('Failed to update task: ' + (error instanceof Error ? error.message : String(error)));
      setRecentlyMovedTaskIds(prev => prev.filter(id => id !== task.id));
    }
  };

  const handleAssigneeCancel = () => {
    setShowAssigneeModal(false);
    setPendingTaskMove(null);
  };

  const handleAddAssignees = (task: Task) => {
    setSelectedTaskForAssignees(task);
    setShowMultiAssigneeModal(true);
  };

  const handleMultiAssigneeConfirm = async (assigneeIds: number[]) => {
    if (!selectedTaskForAssignees) return;

    console.log('🔵 handleMultiAssigneeConfirm called with IDs:', assigneeIds);
    console.log('🔵 Selected task BEFORE update:', selectedTaskForAssignees);

    // Clean up - remove any invalid IDs
    const cleanedAssignees = assigneeIds.filter(id => id && id > 0);

    const updatedTask = {
      ...selectedTaskForAssignees,
      assignee: cleanedAssignees,  // Array of user IDs
      assignedTo: cleanedAssignees.length > 0 ? cleanedAssignees[0] : undefined,  // First ID for backward compatibility
      assigned_to: cleanedAssignees.length > 0 ? cleanedAssignees[0] : undefined,  // Backend expects single integer
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('🔵 Updated task AFTER update:', updatedTask);
    console.log('🔵 assignee field:', updatedTask.assignee, 'length:', updatedTask.assignee?.length);
    console.log('🔵 assigned_to field:', updatedTask.assigned_to);

    try {
      await DataManager.updateTask(updatedTask);
      console.log('✅ Task updated in DataManager');

      // Close modal first
      setShowMultiAssigneeModal(false);
      setSelectedTaskForAssignees(null);

      // Force a complete state refresh after a small delay
      setTimeout(async () => {
        const allTasks = await DataManager.getTasks();
        console.log('✅ Reloaded all tasks from DataManager:', allTasks);
        const updatedTaskFromStorage = allTasks.find(t => t.id === selectedTaskForAssignees.id);
        console.log('✅ Updated task from storage:', updatedTaskFromStorage);
        setTasks([...allTasks]);
      }, 100);

    } catch (error) {
      console.error('❌ Failed to update assignees:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      alert('Failed to update assignees: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleMultiAssigneeCancel = () => {
    setShowMultiAssigneeModal(false);
    setSelectedTaskForAssignees(null);
  };

  const handleUpdateTaskField = async (taskId: number | string, field: string, value: any) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = {
      ...task,
      [field]: value
    };

    try {
      await DataManager.updateTask(updatedTask);
      setTasks(prevTasks =>
        prevTasks.map(t => t.id === taskId ? updatedTask : t)
      );
    } catch (error) {
      console.error('Failed to update task field:', error);
    }
  };

  const handleDeleteTask = async (taskId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await DataManager.deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task');
    }
  };

  const handleRemoveAssignee = async (task: Task, assigneeName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const assignee = task.assignee || task.assignedTo || task.assigned_to;
    const assignees = assignee ? (Array.isArray(assignee) ? assignee : [assignee]) : [];

    // Check if task is "In Progress" and this is the last assignee
    if (task.status === 'in-progress' && assignees.length === 1) {
      alert('Cannot remove the last assignee from an "In Progress" task.\n\nTasks in progress must have at least one assignee.');
      return;
    }

    if (!confirm(`Remove "${assigneeName}" from this task?`)) return;

    const newAssignees = assignees.filter(name => name !== assigneeName);
    const updatedTask = {
      ...task,
      assignee: newAssignees,
      assignedTo: newAssignees.length > 0 ? newAssignees[0] : undefined,
      assigned_to: newAssignees.length > 0 ? newAssignees[0] : undefined
    };

    try {
      await DataManager.updateTask(updatedTask);
      setTasks(prevTasks =>
        prevTasks.map(t => t.id === task.id ? updatedTask : t)
      );
    } catch (error) {
      console.error('Failed to remove assignee:', error);
      alert('Failed to remove assignee');
    }
  };

  const toggleSubtasksExpansion = (taskId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const handleAddSubtask = async (task: Task, subtaskTitle: string) => {
    if (!subtaskTitle.trim()) return;

    const newSubtask = {
      id: Date.now(),
      title: subtaskTitle,
      description: '',
      assignee: '',
      points: 0,
      startDate: '',
      endDate: '',
      estimateHours: 0,
      completed: false,
      waiting: false,
      blocked: false,
      status: '',
      priority: '',
      createdAt: new Date().toISOString()
    };

    const updatedSubtasks = [...(task.subtasks || []), newSubtask];
    await handleUpdateTaskField(task.id!, 'subtasks', updatedSubtasks);
  };

  const handleUpdateSubtaskField = async (task: Task, subtaskId: number, field: string, value: any) => {
    const updatedSubtasks = task.subtasks!.map((sub: any) => {
      if (sub.id === subtaskId) {
        return { ...sub, [field]: value };
      }
      return sub;
    });
    await handleUpdateTaskField(task.id!, 'subtasks', updatedSubtasks);
  };

  const handleDeleteSubtask = async (task: Task, subtaskId: number) => {
    if (!confirm('Delete this subtask?')) return;
    const updatedSubtasks = task.subtasks!.filter((sub: any) => sub.id !== subtaskId);
    await handleUpdateTaskField(task.id!, 'subtasks', updatedSubtasks);
  };

  const handleSubtaskStatusChange = async (task: Task, subtaskId: number, statusType: 'done' | 'waiting') => {
    const updatedSubtasks = task.subtasks!.map((sub: any) => {
      if (sub.id === subtaskId) {
        if (statusType === 'done') {
          return { ...sub, completed: true, waiting: false, blocked: false, status: sub.status === 'Blocked' ? 'Done' : sub.status };
        } else {
          return { ...sub, completed: false, waiting: true, blocked: false, status: sub.status === 'Blocked' ? 'In Progress' : sub.status };
        }
      }
      return sub;
    });
    await handleUpdateTaskField(task.id!, 'subtasks', updatedSubtasks);
  };

  const getFilteredTasks = () => {
    if (tableFilter === 'all') {
      return tasks;
    } else if (tableFilter === 'assignedToMe') {
      const currentUserData = localStorage.getItem('currentUser');
      if (currentUserData) {
        const currentUser = JSON.parse(currentUserData);
        return tasks.filter(t => {
          const assignee = t.assignee || t.assignedTo || t.assigned_to;
          // Support both user ID (number) and legacy name (string) formats
          if (Array.isArray(assignee)) {
            return assignee.includes(currentUser.id) || assignee.includes(currentUser.name);
          }
          return assignee === currentUser.id || assignee === currentUser.name;
        });
      }
      return [];
    } else {
      return tasks.filter(t => (t.status === tableFilter || t.column === tableFilter));
    }
  };

  const handleCreateTask = async (newTask: Task) => {
    try {
      await DataManager.saveTask(newTask);
      await loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  };

  const handleEditTask = (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleSaveEditedTask = async (updatedTask: Task) => {
    try {
      await DataManager.updateTask(updatedTask);
      await loadTasks();
      setShowEditModal(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className={`tasks-board-container ${settingsPanelOpen ? 'panel-open' : ''}`}>
      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTask={handleCreateTask}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTask(null);
        }}
        onSaveTask={handleSaveEditedTask}
        task={selectedTask}
      />

      {/* Assignee Modal */}
      <AssigneeModal
        isOpen={showAssigneeModal}
        taskTitle={pendingTaskMove?.task.title || pendingTaskMove?.task.text || 'Untitled'}
        currentAssignee={(() => {
          const assignee = pendingTaskMove?.draggedBy || pendingTaskMove?.task.assignee || pendingTaskMove?.task.assignedTo || pendingTaskMove?.task.assigned_to;
          return Array.isArray(assignee) ? assignee[0] : assignee;
        })()}
        currentEstimate={pendingTaskMove?.task.estimateHours || pendingTaskMove?.task.estimate_hours}
        onConfirm={handleAssigneeConfirm}
        onCancel={handleAssigneeCancel}
      />

      {/* Multi-Assignee Modal */}
      <MultiAssigneeModal
        isOpen={showMultiAssigneeModal}
        taskTitle={selectedTaskForAssignees?.title || selectedTaskForAssignees?.text || 'Untitled'}
        currentAssignees={(() => {
          if (!selectedTaskForAssignees) return [];
          const assignee = selectedTaskForAssignees.assignee || selectedTaskForAssignees.assignedTo || selectedTaskForAssignees.assigned_to;
          if (!assignee) return [];
          // Convert to number array - handle both arrays and single values
          if (Array.isArray(assignee)) {
            return assignee.filter((a): a is number => typeof a === 'number');
          }
          // If single value, convert to number if it's a valid number
          const numValue = typeof assignee === 'number' ? assignee : parseInt(String(assignee));
          return !isNaN(numValue) ? [numValue] : [];
        })()}
        onConfirm={handleMultiAssigneeConfirm}
        onCancel={handleMultiAssigneeCancel}
      />

      {/* Controls */}
      <div className="current-controls">
        <div className="view-selector">
          <select
            className="view-dropdown"
            value={viewMode}
            onChange={(e) => handleViewChange(e.target.value as ViewMode)}
          >
            <option value="kanban">📋 Kanban Board</option>
            <option value="table">📊 Table View</option>
            <option value="timeline">📅 Timeline (Gantt)</option>
            <option value="dashboard">📊 Dashboard</option>
          </select>
        </div>
        <button className="add-column-btn">➕ Add Column</button>
        <button className="settings-btn">↕️ Reorder</button>
        <div style={{ flex: 1 }}></div>
        <button
          className="settings-toggle-btn"
          onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
        >
          ⚙️ Settings
        </button>
        <button className="create-task-btn" onClick={() => setShowCreateModal(true)}>
          ➕ สร้าง Task
        </button>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
          <div className="kanban-board">
            {['todo', 'in-progress', 'done'].map(status => (
              <div
                key={status}
                className="kanban-column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                    <div className="column-header">
                      <h3>
                        {status === 'todo' ? '📝 To Do' :
                         status === 'in-progress' ? '⚙️ In Progress' :
                         '✅ Done'}
                      </h3>
                      <span className="task-count">
                        {getTasksByStatus(status).length}
                      </span>
                    </div>
                    <div className="column-tasks">
                      {/* Placeholder card for empty To Do column */}
                      {status === 'todo' && getTasksByStatus(status).length === 0 && (
                        <div
                          className="task-card placeholder-card"
                          onClick={() => setShowCreateModal(true)}
                          style={{
                            border: '2px dashed #d1d5db',
                            background: '#f9fafb',
                            cursor: 'pointer',
                            textAlign: 'center',
                            padding: '30px 20px',
                            color: '#6b7280'
                          }}
                        >
                          <div style={{ fontSize: '32px', marginBottom: '10px' }}>➕</div>
                          <div style={{ fontWeight: 600, marginBottom: '5px' }}>No tasks yet</div>
                          <div style={{ fontSize: '13px' }}>Click here to create your first task</div>
                        </div>
                      )}
                      {getTasksByStatus(status).map((task) => {
                        // Check if task or any subtask is blocked/waiting
                        const isBlocked = (task as any).blocked ||
                          (task.subtasks && task.subtasks.some((s: any) => s.blocked || s.status === 'Blocked' || s.waiting));

                        return (
                          <div
                            key={String(task.id)}
                            data-task-id={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onDragEnd={handleDragEnd}
                            className={`task-card ${isBlocked ? 'blocked' : ''} ${recentlyMovedTaskIds.includes(task.id!) ? 'recently-moved' : ''}`}
                            onClick={() => handleTaskClick(task.id)}
                          >
                              {/* Card Actions */}
                              <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={(e) => handleEditTask(task, e)}
                                  style={{
                                    background: '#f3f4f6',
                                    border: 'none',
                                    borderRadius: '4px',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#667eea';
                                    e.currentTarget.style.color = 'white';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#f3f4f6';
                                    e.currentTarget.style.color = '#374151';
                                  }}
                                  title="Edit task"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={(e) => handleDeleteTask(task.id!, e)}
                                  style={{
                                    background: '#f3f4f6',
                                    border: 'none',
                                    borderRadius: '4px',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#ef4444';
                                    e.currentTarget.style.color = 'white';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#f3f4f6';
                                    e.currentTarget.style.color = '#374151';
                                  }}
                                  title="Delete task"
                                >
                                  🗑️
                                </button>
                              </div>

                              {/* Task Type Badge */}
                              {task.type && (
                                <div className="task-type-badge">
                                  {task.type}
                                </div>
                              )}

                              <div className="task-title">
                                {task.title || task.text || 'Untitled Task'}
                              </div>
                              {task.description && (
                                <div className="task-description">
                                  {task.description.substring(0, 100)}
                                  {task.description.length > 100 ? '...' : ''}
                                </div>
                              )}

                              {/* Subtask Progress Bar */}
                              {task.subtasks && task.subtasks.length > 0 && (() => {
                                const subtasksCount = task.subtasks.length;
                                const subtasksCompleted = task.subtasks.filter((s: any) => s.completed).length;
                                const progress = (subtasksCompleted / subtasksCount) * 100;

                                return (
                                  <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>
                                        Subtasks: {subtasksCompleted}/{subtasksCount}
                                      </span>
                                      <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                        {Math.round(progress)}%
                                      </span>
                                    </div>
                                    <div style={{
                                      width: '100%',
                                      height: '6px',
                                      background: '#e5e7eb',
                                      borderRadius: '3px',
                                      overflow: 'hidden'
                                    }}>
                                      <div style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        background: progress === 100 ? '#10b981' : '#667eea',
                                        transition: 'width 0.3s ease'
                                      }} />
                                    </div>
                                  </div>
                                );
                              })()}

                              <div className="task-meta">
                                {task.priority && (
                                  <span className={`priority-badge priority-${task.priority}`}>
                                    {task.priority}
                                  </span>
                                )}
                                {isBlocked && (
                                  <span className="priority-badge" style={{
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    border: '1px solid #ef4444'
                                  }}>
                                    🚫 Blocked
                                  </span>
                                )}
                                {/* Due Date Badge */}
                                {(task.dueDate || task.due_date) && (() => {
                                  const dueDate = new Date(task.dueDate || task.due_date || '');
                                  const today = new Date();
                                  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                  const isOverdue = diffDays < 0;
                                  const isDueSoon = diffDays >= 0 && diffDays <= 3;

                                  return (
                                    <span className="assignee-badge" style={{
                                      background: isOverdue ? '#fee2e2' : isDueSoon ? '#fef3c7' : '#e0e7ff',
                                      color: isOverdue ? '#991b1b' : isDueSoon ? '#92400e' : '#3730a3',
                                      border: `1px solid ${isOverdue ? '#ef4444' : isDueSoon ? '#fbbf24' : '#818cf8'}`
                                    }}>
                                      📅 {new Date(task.dueDate || task.due_date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      {isOverdue && ' (Overdue)'}
                                      {isDueSoon && !isOverdue && ' (Soon)'}
                                    </span>
                                  );
                                })()}
                                {/* Assignee Avatars */}
                                <div className="task-assignees">
                                  {(() => {
                                    // Get assignee IDs - support both number[] and legacy formats
                                    const assignee = task.assignee || task.assignedTo || task.assigned_to;
                                    let assigneeIds: number[] = [];

                                    if (Array.isArray(assignee)) {
                                      assigneeIds = assignee.filter((a): a is number => typeof a === 'number');
                                    } else if (typeof assignee === 'number') {
                                      assigneeIds = [assignee];
                                    }

                                    return (
                                      <>
                                        {assigneeIds.slice(0, 3).map((userId: number, idx: number) => {
                                          const user = users.find((u: any) => u.id === userId);
                                          if (!user) return null;

                                          const initials = user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                                          const color = user.color || '#667eea';

                                          return (
                                            <div
                                              key={`${task.id}-${userId}-${idx}`}
                                              className="assignee-avatar"
                                              style={{
                                                background: color,
                                                marginLeft: idx > 0 ? '-8px' : '0'
                                              }}
                                              title={user.name}
                                            >
                                              {initials}
                                            </div>
                                          );
                                        })}
                                        {assigneeIds.length > 3 && (
                                          <div className="assignee-avatar assignee-more">
                                            +{assigneeIds.length - 3}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                  <div
                                    className="assignee-avatar add-assignee-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddAssignees(task);
                                    }}
                                    title="Add assignee"
                                  >
                                    +
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                      })}
                    </div>
                  </div>
            ))}
          </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="table-view-container">
          {/* Table View Tabs */}
          <div className="table-view-tabs">
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                className={`table-view-tab ${tableFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTableFilter('all')}
              >
                All
              </button>
              <button
                className={`table-view-tab ${tableFilter === 'todo' ? 'active' : ''}`}
                onClick={() => setTableFilter('todo')}
              >
                To Do
              </button>
              <button
                className={`table-view-tab ${tableFilter === 'in-progress' ? 'active' : ''}`}
                onClick={() => setTableFilter('in-progress')}
              >
                In Progress
              </button>
              <button
                className={`table-view-tab ${tableFilter === 'done' ? 'active' : ''}`}
                onClick={() => setTableFilter('done')}
              >
                Done
              </button>
            </div>
            <button
              className={`table-view-tab ${tableFilter === 'assignedToMe' ? 'active' : ''}`}
              onClick={() => setTableFilter('assignedToMe')}
              style={{
                background: tableFilter === 'assignedToMe' ? '#10b981' : 'white',
                color: tableFilter === 'assignedToMe' ? 'white' : '#10b981',
                border: '2px solid #10b981',
                fontWeight: 600
              }}
            >
              👤 Assigned to Me
            </button>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th style={{ width: '250px' }}>Task Name</th>
                  <th style={{ width: '200px' }}>Subtasks</th>
                  <th style={{ width: '120px' }}>Owner</th>
                  <th style={{ width: '100px' }}>Due Date</th>
                  <th style={{ width: '100px' }}>Est. Hours</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredTasks().length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                      No tasks found. Click "➕ สร้าง Task" to create one.
                    </td>
                  </tr>
                ) : (
                  <>
                    {getFilteredTasks().map((task, index) => {
                      const assignee = task.assignee || task.assignedTo || task.assigned_to;
                      let assigneeIds: number[] = [];

                      if (Array.isArray(assignee)) {
                        assigneeIds = assignee.filter((a): a is number => typeof a === 'number');
                      } else if (typeof assignee === 'number') {
                        assigneeIds = [assignee];
                      }

                      const subtasksCount = task.subtasks ? task.subtasks.length : 0;
                      const subtasksCompleted = task.subtasks ? task.subtasks.filter((s: any) => s.completed).length : 0;
                      const totalEstimateHours = task.subtasks ? task.subtasks.reduce((sum: number, s: any) => sum + (parseFloat(s.estimateHours) || 0), 0) : 0;
                      const completedHours = task.subtasks ? task.subtasks.filter((s: any) => s.completed).reduce((sum: number, s: any) => sum + (parseFloat(s.estimateHours) || 0), 0) : 0;
                      const remainingHours = totalEstimateHours - completedHours;
                      const isExpanded = expandedTaskId === task.id;

                      const estimateHours = parseFloat(String(task.estimateHours || task.estimate_hours || 0));
                      const fontSize = Math.min(24, Math.max(14, 14 + estimateHours));

                      // Get latest due date from subtasks if task doesn't have one
                      let displayDueDate = task.dueDate || task.due_date || '';
                      let isFromSubtask = false;

                      if (!displayDueDate && task.subtasks && task.subtasks.length > 0) {
                        const subtasksWithDates = task.subtasks.filter((s: any) => s.endDate);
                        if (subtasksWithDates.length > 0) {
                          // Find the latest (furthest) date from today
                          const subtaskDates = subtasksWithDates.map((s: any) => ({
                            date: new Date(s.endDate),
                            endDate: s.endDate
                          }));
                          // Sort descending to get the furthest date (latest)
                          subtaskDates.sort((a, b) => b.date.getTime() - a.date.getTime());
                          displayDueDate = subtaskDates[0].endDate;
                          isFromSubtask = true;
                        }
                      }

                      // Date cell styling
                      const hasDueDate = task.dueDate || task.due_date || isFromSubtask;

                      const dateStyle = !hasDueDate
                        ? { backgroundColor: '#fee2e2', borderColor: '#ef4444', border: '2px solid #ef4444' }
                        : isFromSubtask
                        ? { backgroundColor: '#fef3c7', borderColor: '#fbbf24', color: '#92400e', fontStyle: 'italic', border: '2px solid #fbbf24' }
                        : {};

                      // Check if all subtasks are completed but status is still "In Progress"
                      const allSubtasksCompleted = subtasksCount > 0 && subtasksCompleted === subtasksCount;
                      const needsStatusChange = allSubtasksCompleted && (task.status === 'In Progress' || task.status === 'in-progress');

                      return (
                        <React.Fragment key={task.id}>
                          <tr onClick={() => handleTaskClick(task.id)} style={{ cursor: 'pointer' }}>
                            <td>{index + 1}</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ fontWeight: 600, color: '#667eea', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => handleTaskClick(task.id)}>
                                {task.title || task.text || 'Untitled'}
                              </div>
                            </td>
                            <td onClick={(e) => toggleSubtasksExpansion(task.id!, e)} style={{ cursor: 'pointer' }}>
                              {subtasksCount > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ color: '#6b7280', fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
                                  <span>{subtasksCompleted}/{subtasksCount}</span>
                                  <span style={{ color: '#6b7280', fontSize: '12px' }}>
                                    {remainingHours.toFixed(1)}h remaining
                                  </span>
                                </div>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '12px' }}>No subtasks</span>
                              )}
                            </td>
                            <td onClick={(e) => { e.stopPropagation(); handleAddAssignees(task); }} style={{ cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                {assigneeIds.slice(0, 3).map((userId, idx) => {
                                  const user = users.find((u: any) => u.id === userId);
                                  if (!user) return null;

                                  const initials = user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                                  const color = user.color || '#667eea';

                                  return (
                                    <div key={idx} className="assignee-avatar-wrapper" style={{ position: 'relative', marginLeft: idx > 0 ? '-8px' : '0', zIndex: 3 - idx }}>
                                      <div className="assignee-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }} title={user.name}>
                                        {initials}
                                      </div>
                                      <div className="remove-assignee-btn" style={{ display: 'none', position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', color: 'white', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, cursor: 'pointer', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 100 }} onClick={(e) => handleRemoveAssignee(task, user.name, e)} title={`Remove ${user.name}`}>
                                        ×
                                      </div>
                                    </div>
                                  );
                                })}
                                {assigneeIds.length > 3 && (
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e5e7eb', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginLeft: '-8px', position: 'relative', zIndex: 0 }} title={`${assigneeIds.length - 3} more`}>
                                    +{assigneeIds.length - 3}
                                  </div>
                                )}
                                <div className="assignee-add-btn" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, border: '2px dashed #d1d5db', marginLeft: assigneeIds.length > 0 ? '-8px' : '0', position: 'relative', zIndex: 0, cursor: 'pointer' }} title="Add assignee">
                                  +
                                </div>
                              </div>
                            </td>
                            <td onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                              <input
                                type="date"
                                value={displayDueDate}
                                onChange={(e) => handleUpdateTaskField(task.id!, 'dueDate', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  ...dateStyle
                                }}
                                title={isFromSubtask ? 'Latest subtask due date (click to set task due date)' : ''}
                              />
                              {isFromSubtask && (
                                <div style={{
                                  fontSize: '9px',
                                  color: '#92400e',
                                  position: 'absolute',
                                  bottom: '2px',
                                  left: '5px',
                                  pointerEvents: 'none'
                                }}>
                                  From subtask
                                </div>
                              )}
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <input type="number" min="0" step="0.5" value={task.estimateHours || task.estimate_hours || ''} onChange={(e) => handleUpdateTaskField(task.id!, 'estimateHours', parseFloat(e.target.value))} placeholder="0" style={{ width: '70px', textAlign: 'center', fontSize: `${fontSize}px`, fontWeight: 600, padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <select
                                value={task.status || task.column}
                                onChange={(e) => handleUpdateTaskField(task.id!, 'status', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px',
                                  border: needsStatusChange ? '2px solid #f59e0b' : '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  backgroundColor: needsStatusChange ? '#fef3c7' : 'white',
                                  color: needsStatusChange ? '#92400e' : 'inherit',
                                  fontWeight: needsStatusChange ? 600 : 'normal'
                                }}
                                title={needsStatusChange ? 'All subtasks completed! Consider moving to Done' : ''}
                              >
                                <option value="todo">To Do</option>
                                <option value="in-progress">In Progress</option>
                                <option value="done">Done</option>
                              </select>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="table-action-btn" onClick={() => handleTaskClick(task.id)} title="View Details" style={{ padding: '4px 8px', fontSize: '16px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                  👁️
                                </button>
                                <button className="table-action-btn" onClick={(e) => handleEditTask(task, e)} title="Edit" style={{ padding: '4px 8px', fontSize: '16px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                  ✏️
                                </button>
                                <button className="table-action-btn delete" onClick={(e) => handleDeleteTask(task.id!, e)} title="Delete" style={{ padding: '4px 8px', fontSize: '16px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${task.id}-subtasks`} className="subtask-expansion-row">
                              <td colSpan={8} style={{ padding: '15px 20px', background: '#f9fafb', borderTop: 'none' }}>
                                <div className="table-subtasks-container">
                                  {/* Header Row */}
                                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px 100px 70px 80px 40px', gap: '10px', padding: '6px 10px', background: '#f3f4f6', borderRadius: '6px', marginBottom: '6px', fontWeight: 600, fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>
                                    <div>Status</div>
                                    <div>Title</div>
                                    <div>Assignee</div>
                                    <div>Start Date</div>
                                    <div>End Date</div>
                                    <div>Points</div>
                                    <div>Hours</div>
                                    <div></div>
                                  </div>

                                  {/* Subtask Rows */}
                                  {task.subtasks && task.subtasks.map((subtask: any) => {
                                    const currentState = subtask.waiting ? 'waiting' : (subtask.completed ? 'done' : 'notStarted');
                                    const membersData = localStorage.getItem('members');
                                    const members = membersData ? JSON.parse(membersData) : [];

                                    return (
                                      <div key={subtask.id} className="subtask-row" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px 100px 70px 80px 40px', gap: '10px', alignItems: 'center', padding: '6px 10px', background: 'white', borderRadius: '6px', marginBottom: '4px' }}>
                                        {/* 3-State Status Buttons */}
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleSubtaskStatusChange(task, subtask.id, 'done'); }}
                                            title="Done"
                                            style={{
                                              padding: '4px 8px',
                                              border: `2px solid ${currentState === 'done' ? '#10b981' : 'transparent'}`,
                                              borderRadius: '4px',
                                              background: currentState === 'done' ? '#d1fae5' : '#f3f4f6',
                                              cursor: 'pointer',
                                              fontSize: '14px',
                                              minWidth: '32px'
                                            }}
                                          >
                                            ✓
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleSubtaskStatusChange(task, subtask.id, 'waiting'); }}
                                            title="Waiting"
                                            style={{
                                              padding: '4px 8px',
                                              border: `2px solid ${currentState === 'waiting' ? '#f59e0b' : 'transparent'}`,
                                              borderRadius: '4px',
                                              background: currentState === 'waiting' ? '#fef3c7' : '#f3f4f6',
                                              cursor: 'pointer',
                                              fontSize: '14px',
                                              minWidth: '32px'
                                            }}
                                          >
                                            ⏸
                                          </button>
                                        </div>

                                        {/* Title (Editable) */}
                                        <div>
                                          <input
                                            type="text"
                                            value={subtask.title}
                                            onChange={(e) => handleUpdateSubtaskField(task, subtask.id, 'title', e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className={subtask.completed ? 'subtask-title-input completed' : 'subtask-title-input'}
                                            style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px' }}
                                          />
                                        </div>

                                        {/* Assignee */}
                                        <select
                                          value={subtask.assignee || ''}
                                          onChange={(e) => handleUpdateSubtaskField(task, subtask.id, 'assignee', e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ fontSize: '12px', padding: '4px' }}
                                        >
                                          <option value="">-</option>
                                          {members.map((m: any) => (
                                            <option key={m.name} value={m.name}>{m.name}</option>
                                          ))}
                                        </select>

                                        {/* Start Date */}
                                        <input
                                          type="date"
                                          value={subtask.startDate || ''}
                                          onChange={(e) => handleUpdateSubtaskField(task, subtask.id, 'startDate', e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ fontSize: '12px', padding: '4px', width: '100%' }}
                                        />

                                        {/* End Date */}
                                        <input
                                          type="date"
                                          value={subtask.endDate || ''}
                                          onChange={(e) => handleUpdateSubtaskField(task, subtask.id, 'endDate', e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ fontSize: '12px', padding: '4px', width: '100%' }}
                                        />

                                        {/* Points */}
                                        <input
                                          type="number"
                                          min="0"
                                          value={subtask.points || ''}
                                          onChange={(e) => handleUpdateSubtaskField(task, subtask.id, 'points', parseInt(e.target.value) || 0)}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="0"
                                          style={{ width: '50px', fontSize: '12px', padding: '4px' }}
                                        />

                                        {/* Estimate Hours */}
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.5"
                                          value={subtask.estimateHours || ''}
                                          onChange={(e) => handleUpdateSubtaskField(task, subtask.id, 'estimateHours', parseFloat(e.target.value) || 0)}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="0"
                                          style={{ width: '70px', fontSize: '12px', padding: '4px' }}
                                        />

                                        {/* Delete Button */}
                                        <button
                                          className="subtask-delete-btn"
                                          onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(task, subtask.id); }}
                                          style={{ padding: '4px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    );
                                  })}

                                  {/* Add Subtask Input */}
                                  <div style={{ marginTop: '10px' }}>
                                    <input
                                      type="text"
                                      className="add-subtask-input"
                                      placeholder="+ Add subtask (press Enter)"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          const input = e.target as HTMLInputElement;
                                          handleAddSubtask(task, input.value);
                                          input.value = '';
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{ width: '30%', padding: '6px 10px', border: '2px dashed #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
          <button
            className="create-task-btn"
            style={{ marginTop: '20px' }}
            onClick={() => setShowCreateModal(true)}
          >
            ➕ Add New Task
          </button>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="timeline-view-container">
          <div className="timeline-header">
            <h3>📅 Timeline View</h3>
            <div className="timeline-controls">
              <button className="btn-secondary">➖ Zoom Out</button>
              <button className="btn-secondary">➕ Zoom In</button>
              <button className="btn-primary">📍 Today</button>
            </div>
          </div>
          <div className="timeline-content">
            <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              Timeline view - Coming soon
            </p>
          </div>
        </div>
      )}

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <DashboardView tasks={tasks} loading={loading} />
      )}

      {/* Task Settings Panel */}
      <TaskSettingsPanel
        isOpen={settingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
        onSettingsChange={loadTasks}
      />
    </div>
  );
}
