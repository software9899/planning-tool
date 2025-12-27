import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { DataManager, type Task } from '../services/api';

export default function TaskDetail() {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{[key: string]: boolean}>({});
  const [editValues, setEditValues] = useState<{[key: string]: any}>({});
  const [members, setMembers] = useState<any[]>([]);
  const [priorities] = useState(['Low', 'Medium', 'High']);
  const [sizes] = useState(['S', 'M', 'L', 'XL']);
  const [statuses] = useState([
    { id: 'todo', name: 'To Do' },
    { id: 'in-progress', name: 'In Progress' },
    { id: 'done', name: 'Done' }
  ]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const taskId = searchParams.get('id');
  const returnUrl = (location.state as any)?.returnUrl || '/';

  // Labels state
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#667eea');

  // Subtasks state
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<number | null>(null);

  useEffect(() => {
    if (!taskId) {
      navigate(returnUrl);
      return;
    }
    loadTask();
    loadMembers();
  }, [taskId]);

  const loadMembers = () => {
    const membersData = localStorage.getItem('members');
    if (membersData) {
      setMembers(JSON.parse(membersData));
    }
  };

  const loadTask = async () => {
    try {
      setLoading(true);
      const tasks = await DataManager.getTasks();
      const foundTask = tasks.find(t => String(t.id) === taskId);

      if (!foundTask) {
        alert('Task not found');
        navigate(returnUrl);
        return;
      }

      setTask(foundTask);
      setEditValues({
        title: foundTask.title || foundTask.text || '',
        description: foundTask.description || '',
        assignedTo: foundTask.assignedTo || foundTask.assigned_to || '',
        dueDate: foundTask.dueDate || foundTask.due_date || '',
        estimateHours: foundTask.estimateHours || foundTask.estimate_hours || '',
        priority: foundTask.priority || 'Medium',
        status: foundTask.status || foundTask.column || 'todo',
        size: (foundTask as any).size || ''
      });
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !task.id) return;

    if (!confirm(`คุณแน่ใจว่าต้องการลบ "${task.title || task.text}" หรือไม่?`)) {
      return;
    }

    try {
      await DataManager.deleteTask(task.id);
      alert('ลบ Task สำเร็จ');
      navigate(returnUrl);
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('ไม่สามารถลบ Task ได้');
    }
  };

  const startEdit = (field: string) => {
    setEditing({ ...editing, [field]: true });
  };

  const cancelEdit = (field: string) => {
    setEditing({ ...editing, [field]: false });
    // Reset to original value
    if (task) {
      const originalValue = field === 'title' ? (task.title || task.text) :
                          field === 'assignedTo' ? (task.assignedTo || task.assigned_to) :
                          field === 'dueDate' ? (task.dueDate || task.due_date) :
                          field === 'estimateHours' ? (task.estimateHours || task.estimate_hours) :
                          (task as any)[field];
      setEditValues({ ...editValues, [field]: originalValue });
    }
  };

  // Common update function
  const updateTask = async (updatedTask: Task) => {
    try {
      // DataManager will automatically add updatedAt and updatedBy
      const savedTask = await DataManager.updateTask(updatedTask);
      setTask(savedTask);
      setEditValues({
        title: savedTask.title || savedTask.text || '',
        description: savedTask.description || '',
        assignedTo: savedTask.assignedTo || savedTask.assigned_to || '',
        dueDate: savedTask.dueDate || savedTask.due_date || '',
        estimateHours: savedTask.estimateHours || savedTask.estimate_hours || '',
        priority: savedTask.priority || 'Medium',
        status: savedTask.status || savedTask.column || 'todo',
        size: (savedTask as any).size || ''
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    }
  };

  // Label functions
  const handleAddLabel = async () => {
    if (!task || !newLabelText.trim()) return;

    const labels = task.labels || [];
    const newLabel = {
      id: Date.now().toString(),
      text: newLabelText.trim(),
      color: newLabelColor
    };

    const updatedTask = { ...task, labels: [...labels, newLabel] };
    await updateTask(updatedTask);
    setNewLabelText('');
    setNewLabelColor('#667eea');
    setShowAddLabel(false);
  };

  const handleRemoveLabel = async (labelId: string) => {
    if (!task) return;
    const labels = (task.labels || []).filter((l: any) => l.id !== labelId);
    const updatedTask = { ...task, labels };
    await updateTask(updatedTask);
  };

  // Subtask functions
  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return;

    const newSubtask = {
      id: Date.now(),
      title: newSubtaskTitle.trim(),
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

    const subtasks = [...(task.subtasks || []), newSubtask];
    const updatedTask = { ...task, subtasks };
    await updateTask(updatedTask);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtaskComplete = async (subtaskId: number) => {
    if (!task) return;
    const subtasks = (task.subtasks || []).map((sub: any) =>
      sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
    );
    const updatedTask = { ...task, subtasks };
    await updateTask(updatedTask);
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    if (!task || !confirm('Delete this subtask?')) return;
    const subtasks = (task.subtasks || []).filter((sub: any) => sub.id !== subtaskId);
    const updatedTask = { ...task, subtasks };
    await updateTask(updatedTask);
  };

  const saveEdit = async (field: string) => {
    if (!task) return;

    try {
      const updatedTask = {
        ...task,
        [field]: editValues[field]
      };

      await DataManager.updateTask(updatedTask);
      setTask(updatedTask);
      setEditing({ ...editing, [field]: false });
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('ไม่สามารถบันทึกการแก้ไขได้');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading task...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Task not found</div>
      </div>
    );
  }

  const status = editValues.status || task.status || task.column || 'todo';
  const priority = editValues.priority || task.priority || 'medium';

  return (
    <div className="task-detail-container" style={{ padding: '30px', width: '100%', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          padding: '10px 20px',
          marginBottom: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 600,
          color: '#374151',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f9fafb';
          e.currentTarget.style.borderColor = '#667eea';
          e.currentTarget.style.color = '#667eea';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'white';
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.color = '#374151';
        }}
      >
        ← Back
      </button>

      {/* Task Header */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            {editing.title ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={editValues.title}
                  onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                  style={{
                    flex: 1,
                    fontSize: '28px',
                    fontWeight: 700,
                    padding: '8px',
                    border: '2px solid #667eea',
                    borderRadius: '8px'
                  }}
                />
                <button className="btn-primary" onClick={() => saveEdit('title')}>✓</button>
                <button className="btn-secondary" onClick={() => cancelEdit('title')}>✗</button>
              </div>
            ) : (
              <h1
                onClick={() => startEdit('title')}
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  marginBottom: '10px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f7fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title="Click to edit"
              >
                {editValues.title || 'Untitled Task'}
              </h1>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
              {/* Status Badge */}
              {editing.status ? (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <select
                    value={editValues.status}
                    onChange={(e) => setEditValues({ ...editValues, status: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: '12px', border: '2px solid #667eea' }}
                  >
                    {statuses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => saveEdit('status')}>✓</button>
                  <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => cancelEdit('status')}>✗</button>
                </div>
              ) : (
                <span
                  className={`priority-badge priority-${status}`}
                  onClick={() => startEdit('status')}
                  style={{ cursor: 'pointer' }}
                  title="Click to edit"
                >
                  {statuses.find(s => s.id === status)?.name || status}
                </span>
              )}

              {/* Priority Badge */}
              {editing.priority ? (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <select
                    value={editValues.priority}
                    onChange={(e) => setEditValues({ ...editValues, priority: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: '12px', border: '2px solid #667eea' }}
                  >
                    {priorities.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => saveEdit('priority')}>✓</button>
                  <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => cancelEdit('priority')}>✗</button>
                </div>
              ) : (
                <span
                  className={`priority-badge priority-${priority}`}
                  onClick={() => startEdit('priority')}
                  style={{ cursor: 'pointer' }}
                  title="Click to edit"
                >
                  {priority}
                </span>
              )}

              {/* Size Badge */}
              {editing.size ? (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <select
                    value={editValues.size}
                    onChange={(e) => setEditValues({ ...editValues, size: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: '12px', border: '2px solid #667eea' }}
                  >
                    <option value="">No Size</option>
                    {sizes.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => saveEdit('size')}>✓</button>
                  <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => cancelEdit('size')}>✗</button>
                </div>
              ) : (
                <span
                  className="priority-badge"
                  onClick={() => startEdit('size')}
                  style={{
                    cursor: 'pointer',
                    background: editValues.size ? '#e0e7ff' : '#f3f4f6',
                    color: editValues.size ? '#3730a3' : '#6b7280',
                    border: editValues.size ? 'none' : '1px dashed #d1d5db'
                  }}
                  title="Click to edit"
                >
                  {editValues.size ? `📏 ${editValues.size}` : '📏 Set Size'}
                </span>
              )}

              <div style={{ padding: '4px 10px', background: '#e0e7ff', color: '#3730a3', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                ID: {task.id}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-danger" onClick={handleDelete}>
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      {/* Task Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Main Section */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '15px', color: '#1f2937' }}>
            📝 Description
          </h2>
          {editing.description ? (
            <div>
              <textarea
                value={editValues.description}
                onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                rows={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn-primary" onClick={() => saveEdit('description')}>Save</button>
                <button className="btn-secondary" onClick={() => cancelEdit('description')}>Cancel</button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => startEdit('description')}
              style={{
                padding: '12px',
                background: '#f9fafb',
                borderRadius: '8px',
                minHeight: '150px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
              title="Click to edit"
            >
              {editValues.description || 'No description provided. Click to add.'}
            </div>
          )}
        </div>

        {/* Side Section */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '15px', color: '#1f2937' }}>
            ℹ️ Details
          </h2>

          {/* Assignees */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              Assignees
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {(() => {
                const assignee = task.assignee || task.assignedTo || task.assigned_to;
                const assignees = assignee ? (Array.isArray(assignee) ? assignee : [assignee]) : [];

                if (assignees.length === 0) {
                  return (
                    <div style={{
                      padding: '8px 12px',
                      background: '#f3f4f6',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#9ca3af'
                    }}>
                      No assignees
                    </div>
                  );
                }

                return assignees.filter((name): name is string => typeof name === 'string' && name.trim() !== '').map((name: string, idx: number) => {
                  const member = members.find((m: any) => m.name === name);
                  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                  const color = member?.color || '#667eea';

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        background: 'white',
                        border: '2px solid #e5e7eb',
                        borderRadius: '20px',
                        fontSize: '14px'
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: color,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 600
                        }}
                      >
                        {initials}
                      </div>
                      <span style={{ fontWeight: 500, color: '#374151' }}>{name}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Due Date */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              Due Date
            </div>
            {editing.dueDate ? (
              <div>
                <input
                  type="date"
                  value={editValues.dueDate}
                  onChange={(e) => setEditValues({ ...editValues, dueDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                />
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => saveEdit('dueDate')}>Save</button>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => cancelEdit('dueDate')}>Cancel</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => startEdit('dueDate')}
                style={{
                  padding: '8px',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151'
                }}
                title="Click to edit"
              >
                📅 {editValues.dueDate || 'Not set'}
              </div>
            )}
          </div>

          {/* Estimate Hours */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              Estimate Hours
            </div>
            {editing.estimateHours ? (
              <div>
                <input
                  type="number"
                  value={editValues.estimateHours}
                  onChange={(e) => setEditValues({ ...editValues, estimateHours: e.target.value })}
                  step="0.5"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                />
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => saveEdit('estimateHours')}>Save</button>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => cancelEdit('estimateHours')}>Cancel</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => startEdit('estimateHours')}
                style={{
                  padding: '8px',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151'
                }}
                title="Click to edit"
              >
                ⏱️ {editValues.estimateHours ? `${editValues.estimateHours} hours` : 'Not set'}
              </div>
            )}
          </div>

          {/* Labels */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              🏷️ Labels
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {(task.labels || []).map((label: any) => (
                <div
                  key={label.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    background: label.color || '#667eea',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  <span>{label.text}</span>
                  <button
                    onClick={() => handleRemoveLabel(label.id)}
                    style={{
                      background: 'rgba(255,255,255,0.3)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '10px',
                      color: 'white'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {showAddLabel ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                    placeholder="Label name"
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', width: '120px' }}
                  />
                  <input
                    type="color"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    style={{ width: '32px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  />
                  <button onClick={handleAddLabel} style={{ padding: '4px 8px', fontSize: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    Add
                  </button>
                  <button onClick={() => setShowAddLabel(false)} style={{ padding: '4px 8px', fontSize: '12px', background: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddLabel(true)}
                  style={{
                    padding: '4px 10px',
                    background: 'white',
                    border: '2px dashed #d1d5db',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  + Add Label
                </button>
              )}
            </div>
          </div>

          {/* Created Date */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              Created
            </div>
            <div style={{ padding: '8px', background: '#f3f4f6', borderRadius: '8px', fontSize: '14px', color: '#374151' }}>
              🕐 {(() => {
                const createdAt = task.createdAt || task.created_at || new Date().toISOString();
                const formattedDate = createdAt.substring(0, 16).replace('T', ' ');
                const createdBy = task.createdBy || task.created_by;
                return createdBy ? `${formattedDate} by ${createdBy}` : formattedDate;
              })()}
            </div>
          </div>

          {/* Updated Date */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              Last Updated
            </div>
            <div style={{ padding: '8px', background: '#f3f4f6', borderRadius: '8px', fontSize: '14px', color: '#374151' }}>
              🔄 {(() => {
                const updatedAt = task.updatedAt || task.updated_at || task.createdAt || task.created_at || new Date().toISOString();
                const formattedDate = updatedAt.substring(0, 16).replace('T', ' ');
                const updatedBy = task.updatedBy || task.updated_by;
                return updatedBy ? `${formattedDate} by ${updatedBy}` : formattedDate;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Subtasks Section */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        marginTop: '30px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div
          onClick={() => setSubtasksExpanded(!subtasksExpanded)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: subtasksExpanded ? '20px' : '0',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>
            {subtasksExpanded ? '▼' : '▶'} 📋 Subtasks ({(task.subtasks || []).length})
          </h2>
        </div>

        {subtasksExpanded && (
          <>
            {(task.subtasks || []).map((subtask: any) => {
              const isExpanded = expandedSubtaskId === subtask.id;

              return (
                <div
                  key={subtask.id}
                  style={{
                    background: subtask.completed ? '#f0fdf4' : 'white',
                    border: '2px solid',
                    borderColor: subtask.completed ? '#86efac' : '#e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Subtask Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      background: isExpanded ? '#f9fafb' : 'transparent'
                    }}
                    onClick={() => setExpandedSubtaskId(isExpanded ? null : subtask.id)}
                  >
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSubtaskComplete(subtask.id);
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <span style={{
                      flex: 1,
                      textDecoration: subtask.completed ? 'line-through' : 'none',
                      color: subtask.completed ? '#6b7280' : '#1f2937',
                      fontSize: '14px',
                      fontWeight: 500
                    }}>
                      {subtask.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubtask(subtask.id);
                      }}
                      style={{
                        background: '#fee2e2',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#dc2626'
                      }}
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Subtask Details (Expanded) */}
                  {isExpanded && (
                    <div style={{ padding: '0 12px 12px 12px', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Assignee
                          </label>
                          <select
                            value={subtask.assignee || ''}
                            onChange={(e) => {
                              const updatedSubtasks = (task.subtasks || []).map((s: any) =>
                                s.id === subtask.id ? { ...s, assignee: e.target.value } : s
                              );
                              updateTask({ ...task, subtasks: updatedSubtasks });
                            }}
                            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                          >
                            <option value="">-</option>
                            {members.map((m: any) => (
                              <option key={m.name} value={m.name}>{m.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Estimate Hours
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={subtask.estimateHours || ''}
                            onChange={(e) => {
                              const updatedSubtasks = (task.subtasks || []).map((s: any) =>
                                s.id === subtask.id ? { ...s, estimateHours: parseFloat(e.target.value) || 0 } : s
                              );
                              updateTask({ ...task, subtasks: updatedSubtasks });
                            }}
                            placeholder="0"
                            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={subtask.startDate || ''}
                            onChange={(e) => {
                              const updatedSubtasks = (task.subtasks || []).map((s: any) =>
                                s.id === subtask.id ? { ...s, startDate: e.target.value } : s
                              );
                              updateTask({ ...task, subtasks: updatedSubtasks });
                            }}
                            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            End Date
                          </label>
                          <input
                            type="date"
                            value={subtask.endDate || ''}
                            onChange={(e) => {
                              const updatedSubtasks = (task.subtasks || []).map((s: any) =>
                                s.id === subtask.id ? { ...s, endDate: e.target.value } : s
                              );
                              updateTask({ ...task, subtasks: updatedSubtasks });
                            }}
                            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                          />
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Description
                          </label>
                          <textarea
                            value={subtask.description || ''}
                            onChange={(e) => {
                              const updatedSubtasks = (task.subtasks || []).map((s: any) =>
                                s.id === subtask.id ? { ...s, description: e.target.value } : s
                              );
                              updateTask({ ...task, subtasks: updatedSubtasks });
                            }}
                            placeholder="Add description..."
                            rows={2}
                            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', resize: 'vertical' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Subtask Input */}
            <div style={{ marginTop: '15px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                placeholder="+ Add subtask (press Enter)"
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={handleAddSubtask}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Add
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
