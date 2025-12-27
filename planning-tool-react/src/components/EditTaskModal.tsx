import { useState, useEffect } from 'react';
import type { Task } from '../services/api';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: Task) => void;
  task: Task | null;
}

export default function EditTaskModal({ isOpen, onClose, onSaveTask, task }: EditTaskModalProps) {
  const [step, setStep] = useState(1);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskStatus, setTaskStatus] = useState('todo');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimateHours, setEstimateHours] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => {
    // Load members from localStorage
    const membersData = localStorage.getItem('members');
    if (membersData) {
      setMembers(JSON.parse(membersData));
    }

    // Load task types from localStorage
    const typesData = localStorage.getItem('taskTypes');
    if (typesData) {
      const parsedTypes = JSON.parse(typesData);
      setTypes(parsedTypes);
    } else {
      // Default types
      const defaultTypes = ['Feature', 'Bug Fix', 'Enhancement', 'Documentation', 'Research'];
      setTypes(defaultTypes);
    }
  }, []);

  // Load task data when task prop changes
  useEffect(() => {
    if (task) {
      setTaskTitle(task.title || task.text || '');
      setTaskDesc(task.description || '');
      setTaskType(task.type || types[0] || 'Feature');
      setTaskPriority(task.priority || 'Medium');
      setTaskStatus(task.status || task.column || 'todo');

      // Handle assignee - convert array to first element or use as string
      const assigneeValue = task.assignee || task.assignedTo || task.assigned_to;
      const assigneeString = Array.isArray(assigneeValue)
        ? (assigneeValue.length > 0 ? String(assigneeValue[0]) : '')
        : (assigneeValue ? String(assigneeValue) : '');
      setAssignee(assigneeString);

      setDueDate(task.dueDate || task.due_date || '');
      setEstimateHours(task.estimateHours?.toString() || task.estimate_hours?.toString() || '');
    }
  }, [task, types]);

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  const goToStep2 = () => {
    if (!taskTitle.trim()) {
      alert('กรุณาใส่ชื่อ Task');
      return;
    }
    setStep(2);
  };

  const handleSaveTask = () => {
    if (!taskTitle.trim()) {
      alert('กรุณาใส่ชื่อ Task');
      return;
    }

    if (!task) return;

    const updatedTask: Task = {
      ...task,
      title: taskTitle,
      text: taskTitle,
      description: taskDesc,
      type: taskType,
      priority: taskPriority,
      status: taskStatus,
      column: taskStatus,
      assignedTo: assignee,
      assignee: assignee,
      dueDate: dueDate,
      due_date: dueDate,
      estimateHours: estimateHours ? parseFloat(estimateHours) : undefined,
      estimate_hours: estimateHours ? parseFloat(estimateHours) : undefined,
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSaveTask(updatedTask);
    handleClose();
  };

  if (!isOpen || !task) return null;

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content">
        <span className="close-create" onClick={handleClose}>&times;</span>
        <h2>✏️ แก้ไข Task</h2>

        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className={`progress-step ${step === 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">ข้อมูลพื้นฐาน</div>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${step === 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">รายละเอียดเพิ่มเติม</div>
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="form-step active">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '15px', alignItems: 'start' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>ชื่อ Task *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="ชื่อ Task"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
                <label>ชนิด *</label>
                <select value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                  {types.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>รายละเอียด</label>
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="รายละเอียด (optional)"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>สถานะ</label>
              <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="step-buttons">
              <button className="btn-secondary" onClick={handleClose}>ยกเลิก</button>
              <button className="btn-primary" onClick={goToStep2}>ถัดไป →</button>
            </div>
          </div>
        )}

        {/* Step 2: Additional Details */}
        {step === 2 && (
          <div className="form-step active">
            <div className="form-group">
              <label>Priority</label>
              <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="form-group">
              <label>Assignee</label>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">-- Select Member --</option>
                {members.map(member => (
                  <option key={member.name} value={member.name}>{member.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Estimate Hours</label>
              <input
                type="number"
                value={estimateHours}
                onChange={(e) => setEstimateHours(e.target.value)}
                placeholder="จำนวนชั่วโมงโดยประมาณ"
                min="0"
                step="0.5"
              />
            </div>

            <div className="step-buttons">
              <button className="btn-secondary" onClick={() => setStep(1)}>← ย้อนกลับ</button>
              <button className="btn-primary" onClick={handleSaveTask}>💾 บันทึก</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
