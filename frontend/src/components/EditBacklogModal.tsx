import { useState, useEffect } from 'react';
import { type Task } from '../services/api';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface EditBacklogModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (taskId: string | number, updates: Partial<Task>) => void;
}

export default function EditBacklogModal({ isOpen, task, onClose, onSave }: EditBacklogModalProps) {
  const [assignee, setAssignee] = useState('');
  const [eta, setEta] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (task) {
      setAssignee(task.assignedTo || task.assigned_to || '');
      setEta(task.dueDate || task.due_date || '');

      // Load checklist from task or from settings based on task type
      const taskChecklist = (task as any).readinessChecklist || [];
      if (taskChecklist.length > 0) {
        setChecklist(taskChecklist);
      } else {
        // Load from settings if available
        loadChecklistFromSettings(task.type || '');
      }
    }
  }, [task]);

  const loadChecklistFromSettings = (taskType: string) => {
    try {
      const settings = localStorage.getItem('appSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        const templates = parsedSettings.checklistTemplates || {};
        const template = templates[taskType] || [];

        setChecklist(template.map((text: string, index: number) => ({
          id: `checklist-${index}`,
          text,
          checked: false
        })));
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
      setChecklist([]);
    }
  };

  const handleChecklistToggle = (itemId: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ));
  };

  const handleSave = () => {
    if (!task?.id) return;

    const allChecked = checklist.length === 0 || checklist.every(item => item.checked);
    const newStatus = allChecked ? 'Ready to Implement' : 'Need More Details';

    const updates: Partial<Task> = {
      assignedTo: assignee,
      assigned_to: assignee,
      dueDate: eta,
      due_date: eta,
      status: newStatus,
      column: newStatus,
      readinessChecklist: checklist
    } as any;

    onSave(task.id, updates);
    onClose();
  };

  if (!isOpen || !task) return null;

  return (
    <div className="edit-backlog-modal" onClick={onClose}>
      <div className="edit-backlog-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>✏️ Edit Task Details</h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 600,
            color: '#374151'
          }}>
            Task: {task.title || task.text}
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 600,
            color: '#374151'
          }}>
            Assignee
          </label>
          <input
            type="text"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Enter assignee name"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 600,
            color: '#374151'
          }}>
            ETA (Due Date)
          </label>
          <input
            type="date"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        {checklist.length > 0 && (
          <div className="checklist-section">
            <h4>
              📋 Readiness Checklist
              {checklist.every(item => item.checked) && (
                <span style={{ color: '#16a34a', marginLeft: '8px', fontSize: '14px' }}>
                  ✅ All complete!
                </span>
              )}
            </h4>
            <div style={{
              padding: '12px',
              background: '#fef3c7',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#92400e'
            }}>
              ⚠️ Complete all checklist items to move this task to "Ready to Implement"
            </div>
            {checklist.map((item) => (
              <div
                key={item.id}
                className={`checklist-item ${item.checked ? 'completed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleChecklistToggle(item.id)}
                  id={item.id}
                />
                <label htmlFor={item.id}>{item.text}</label>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave}>
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
