import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataManager, type Task } from '../services/api';
import CreateBacklogTaskModal from '../components/CreateBacklogTaskModal';
import EditBacklogModal from '../components/EditBacklogModal';
import BacklogSettingsPanel from '../components/BacklogSettingsPanel';

type BacklogFilter = 'all' | 'S' | 'M' | 'L' | 'XL';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export default function Backlog() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sizeFilter, setSizeFilter] = useState<BacklogFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBlockedTasks, setShowBlockedTasks] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(() => {
    const saved = localStorage.getItem('backlogSettingsPanelOpen');
    return saved ? JSON.parse(saved) : false;
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, []);

  // Persist settings panel state
  useEffect(() => {
    localStorage.setItem('backlogSettingsPanelOpen', JSON.stringify(settingsPanelOpen));
  }, [settingsPanelOpen]);

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

  const getBacklogTasks = (column: 'need-details' | 'ready') => {
    let filtered = tasks.filter(task => {
      const status = task.status || task.column;

      // Only show backlog tasks (not TaskBoard tasks)
      const isBacklogTask =
        status === 'need-details' ||
        status === 'Need More Details' ||
        status === 'ready' ||
        status === 'ready-to-implement' ||
        status === 'Ready to Implement';

      if (!isBacklogTask) return false;

      if (column === 'need-details') {
        return status === 'need-details' || status === 'Need More Details';
      } else {
        return status === 'ready' || status === 'ready-to-implement' || status === 'Ready to Implement';
      }
    });

    // Apply size filter
    if (sizeFilter !== 'all') {
      filtered = filtered.filter(t => (t as any).size === sizeFilter);
    }

    // Apply blocked filter
    if (!showBlockedTasks) {
      filtered = filtered.filter(t => !(t as any).blocked);
    }

    return filtered;
  };

  const handleTaskClick = (task: Task, e: React.MouseEvent) => {
    // If clicking on edit button, don't navigate
    if ((e.target as HTMLElement).closest('.edit-btn')) {
      return;
    }
    if (task.id) {
      navigate(`/task-detail?id=${task.id}`, { state: { returnUrl: '/backlog' } });
    }
  };

  const handleEditClick = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleSaveTask = async (taskId: string | number, updates: Partial<Task>) => {
    try {
      const updatedTask = tasks.find(t => t.id === taskId);
      if (updatedTask) {
        const merged = { ...updatedTask, ...updates };
        await DataManager.saveTask(merged);
        await loadTasks();
      }
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Failed to save task');
    }
  };

  const handleChecklistToggle = async (task: Task, itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const checklist = (task as any).readinessChecklist || (task as any).readiness_checklist || [];
    const updatedChecklist = checklist.map((item: ChecklistItem) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    // Check if all items are now completed
    const allCompleted = updatedChecklist.every((item: ChecklistItem) => item.checked);
    const newStatus = allCompleted ? 'Ready to Implement' : 'Need More Details';

    try {
      const updatedTask = {
        ...task,
        readinessChecklist: updatedChecklist,
        readiness_checklist: updatedChecklist,
        status: newStatus,
        column: newStatus
      } as any;

      await DataManager.saveTask(updatedTask);
      await loadTasks();
    } catch (error) {
      console.error('Failed to update checklist:', error);
      alert('Failed to update checklist');
    }
  };

  const getChecklistProgress = (task: Task): { completed: number; total: number; percentage: number } => {
    const checklist = (task as any).readinessChecklist || (task as any).readiness_checklist || [];
    if (checklist.length === 0) {
      return { completed: 0, total: 0, percentage: 100 };
    }

    const completed = checklist.filter((item: ChecklistItem) => item.checked).length;
    const total = checklist.length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  };

  const handleCreateTask = async (newTask: Task) => {
    try {
      // Set backlog status based on checklist completion
      const taskWithStatus = {
        ...newTask,
        status: 'Need More Details',
        column: 'Need More Details'
      };
      await DataManager.saveTask(taskWithStatus);
      await loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (task: Task, e: React.DragEvent) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (targetStatus: 'Need More Details' | 'Ready to Implement', e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (!draggedTask) return;

    // Check if moving to "Ready to Implement" and validate checklist completion
    if (targetStatus === 'Ready to Implement') {
      const checklist = (draggedTask as any).readinessChecklist || (draggedTask as any).readiness_checklist || [];

      if (checklist.length > 0) {
        const allCompleted = checklist.every((item: ChecklistItem) => item.checked);

        if (!allCompleted) {
          const completed = checklist.filter((item: ChecklistItem) => item.checked).length;
          alert(`❌ Cannot move to Ready to Implement!\n\nYou must complete all checklist items first.\n\nProgress: ${completed}/${checklist.length} completed`);
          setDraggedTask(null);
          return;
        }
      }
    }

    try {
      const updatedTask = {
        ...draggedTask,
        status: targetStatus,
        column: targetStatus
      };
      await DataManager.saveTask(updatedTask);
      await loadTasks();
      setDraggedTask(null);
    } catch (error) {
      console.error('Failed to move task:', error);
      alert('Failed to move task');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading backlog...</div>
      </div>
    );
  }

  const needDetailsTasks = getBacklogTasks('need-details');
  const readyTasks = getBacklogTasks('ready');

  return (
    <div className={`backlog-container ${settingsPanelOpen ? 'panel-open' : ''}`}>
      {/* Create Backlog Task Modal */}
      <CreateBacklogTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTask={handleCreateTask}
      />

      {/* Edit Backlog Modal */}
      <EditBacklogModal
        isOpen={showEditModal}
        task={selectedTask}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
      />

      {/* Filters */}
      <div className="backlog-filters">
        <button
          className={`filter-btn ${sizeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSizeFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${sizeFilter === 'S' ? 'active' : ''}`}
          onClick={() => setSizeFilter('S')}
        >
          S
        </button>
        <button
          className={`filter-btn ${sizeFilter === 'M' ? 'active' : ''}`}
          onClick={() => setSizeFilter('M')}
        >
          M
        </button>
        <button
          className={`filter-btn ${sizeFilter === 'L' ? 'active' : ''}`}
          onClick={() => setSizeFilter('L')}
        >
          L
        </button>
        <button
          className={`filter-btn ${sizeFilter === 'XL' ? 'active' : ''}`}
          onClick={() => setSizeFilter('XL')}
        >
          XL
        </button>

        <button
          className="settings-toggle-btn"
          onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
          style={{ marginLeft: 'auto' }}
        >
          ⚙️ Settings
        </button>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-create-backlog"
        >
          ➕ Create Item
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="backlog-two-columns">
        {/* Need More Details Column */}
        <div
          className="backlog-column"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop('Need More Details', e)}
        >
          <div className="column-header need-details">
            <h2>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              Need More Details
            </h2>
            <span className="column-count-badge need-details">{needDetailsTasks.length}</span>
          </div>
          <div className="column-tasks">
            {needDetailsTasks.length === 0 ? (
              <div className="empty-column-message">
                No items need details
              </div>
            ) : (
              needDetailsTasks.map((task) => {
                const progress = getChecklistProgress(task);
                return (
                  <div
                    key={String(task.id)}
                    className={`task-card backlog-task-card ${
                      progress.total > 0 && progress.percentage === 100
                        ? 'need-details-complete'
                        : 'need-details-incomplete'
                    } ${draggedTask?.id === task.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(task, e)}
                    onClick={(e) => handleTaskClick(task, e)}
                  >
                    <div className="task-card-header">
                      <div className="task-title">
                        {task.title || task.text || 'Untitled Task'}
                      </div>
                    </div>

                    {task.description && (
                      <div className="task-description" style={{ marginBottom: '12px' }}>
                        {task.description.substring(0, 100)}
                        {task.description.length > 100 ? '...' : ''}
                      </div>
                    )}

                    {/* Readiness Checklist Items */}
                    {(() => {
                      const checklist = (task as any).readinessChecklist || (task as any).readiness_checklist || [];
                      console.log('Task:', task.title, 'Checklist:', checklist);

                      // Ensure all checklist items have id
                      const checklistWithIds = checklist.map((item: any, index: number) => ({
                        id: item.id || `checklist-${index}-${Date.now()}`,
                        text: item.text || item,
                        checked: item.checked || false
                      }));

                      return checklistWithIds.length > 0 ? (
                        <div className="checklist-section" style={{ marginTop: '12px', marginBottom: '12px' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                              📋 Readiness Checklist
                            </span>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: progress.percentage === 100 ? '#16a34a' : '#f59e0b',
                              background: progress.percentage === 100 ? '#d1fae5' : '#fef3c7',
                              padding: '2px 8px',
                              borderRadius: '12px'
                            }}>
                              {progress.completed}/{progress.total}
                            </span>
                          </div>
                          {checklistWithIds.map((item: ChecklistItem, index: number) => (
                            <div
                              key={item.id || index}
                              className={`checklist-item ${item.checked ? 'completed' : ''}`}
                              onClick={(e) => handleChecklistToggle(task, item.id, e)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                background: item.checked ? '#d1fae5' : '#f9fafb',
                                borderRadius: '6px',
                                marginBottom: '6px',
                                cursor: 'pointer',
                                border: item.checked ? '1px solid #10b981' : '1px solid #e5e7eb',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
                                border: item.checked ? '2px solid #10b981' : '2px solid #d1d5db',
                                background: item.checked ? '#10b981' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {item.checked && <span style={{ color: 'white', fontSize: '12px', fontWeight: 700 }}>✓</span>}
                              </div>
                              <span style={{
                                fontSize: '13px',
                                color: item.checked ? '#059669' : '#374151',
                                textDecoration: item.checked ? 'line-through' : 'none',
                                flex: 1
                              }}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    <div className="task-meta">
                      {task.priority && (
                        <span className={`priority-badge priority-${task.priority}`}>
                          {task.priority}
                        </span>
                      )}
                      {(task.assignedTo || task.assigned_to) && (
                        <span className="assignee-badge">
                          👤 {task.assignedTo || task.assigned_to}
                        </span>
                      )}
                      {(task as any).blocked && (
                        <span className="priority-badge" style={{
                          background: '#fee2e2',
                          color: '#991b1b'
                        }}>
                          🚫 Blocked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ready to Implement Column */}
        <div
          className="backlog-column"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop('Ready to Implement', e)}
        >
          <div className="column-header ready">
            <h2>
              <span style={{ fontSize: '24px' }}>✅</span>
              Ready to Implement
            </h2>
            <span className="column-count-badge ready">{readyTasks.length}</span>
          </div>
          <div className="column-tasks">
            {readyTasks.length === 0 ? (
              <div className="empty-column-message">
                No items ready to implement
              </div>
            ) : (
              readyTasks.map((task) => {
                const progress = getChecklistProgress(task);
                return (
                  <div
                    key={String(task.id)}
                    className={`task-card backlog-task-card ready ${draggedTask?.id === task.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(task, e)}
                    onClick={(e) => handleTaskClick(task, e)}
                  >
                    <div className="task-card-header">
                      <div className="task-title">
                        {task.title || task.text || 'Untitled Task'}
                      </div>
                    </div>

                    {task.description && (
                      <div className="task-description" style={{ marginBottom: '12px' }}>
                        {task.description.substring(0, 100)}
                        {task.description.length > 100 ? '...' : ''}
                      </div>
                    )}

                    {/* Readiness Checklist Items (Completed) */}
                    {(() => {
                      const checklist = (task as any).readinessChecklist || (task as any).readiness_checklist || [];

                      // Ensure all checklist items have id
                      const checklistWithIds = checklist.map((item: any, index: number) => ({
                        id: item.id || `checklist-${index}-${Date.now()}`,
                        text: item.text || item,
                        checked: item.checked || false
                      }));

                      return checklistWithIds.length > 0 ? (
                        <div className="checklist-section" style={{ marginTop: '12px', marginBottom: '12px' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>
                              ✅ Checklist Complete
                            </span>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#16a34a',
                              background: '#d1fae5',
                              padding: '2px 8px',
                              borderRadius: '12px'
                            }}>
                              {checklistWithIds.length}/{checklistWithIds.length}
                            </span>
                          </div>
                          {checklistWithIds.map((item: ChecklistItem, index: number) => (
                            <div
                              key={item.id || index}
                              className="checklist-item completed"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                background: '#d1fae5',
                                borderRadius: '6px',
                                marginBottom: '6px',
                                border: '1px solid #10b981',
                                opacity: 0.8
                              }}
                            >
                              <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
                                border: '2px solid #10b981',
                                background: '#10b981',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <span style={{ color: 'white', fontSize: '12px', fontWeight: 700 }}>✓</span>
                              </div>
                              <span style={{
                                fontSize: '13px',
                                color: '#059669',
                                textDecoration: 'line-through',
                                flex: 1
                              }}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    <div className="task-meta">
                      {task.priority && (
                        <span className={`priority-badge priority-${task.priority}`}>
                          {task.priority}
                        </span>
                      )}
                      {(task.assignedTo || task.assigned_to) && (
                        <span className="assignee-badge">
                          👤 {task.assignedTo || task.assigned_to}
                        </span>
                      )}
                      {(task.dueDate || task.due_date) && (
                        <span className="assignee-badge">
                          📅 {task.dueDate || task.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Backlog Settings Panel */}
      <BacklogSettingsPanel
        isOpen={settingsPanelOpen}
        onClose={() => setSettingsPanelOpen(false)}
      />
    </div>
  );
}
