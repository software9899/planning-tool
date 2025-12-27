import { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  color?: string;
}

interface MultiAssigneeModalProps {
  isOpen: boolean;
  taskTitle: string;
  currentAssignees: number[];  // Changed from string[] to number[]
  onConfirm: (assigneeIds: number[]) => void;  // Changed from string[] to number[]
  onCancel: () => void;
}

export default function MultiAssigneeModal({
  isOpen,
  taskTitle,
  currentAssignees,
  onConfirm,
  onCancel
}: MultiAssigneeModalProps) {
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);  // Changed to number[]
  const [members, setMembers] = useState<User[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load members from database API
      fetchUsers();

      // Pre-fill current assignees
      setSelectedAssignees(currentAssignees || []);
    }
  }, [isOpen, currentAssignees]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        setMembers(users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleToggleAssignee = (memberId: number) => {
    if (selectedAssignees.includes(memberId)) {
      setSelectedAssignees(selectedAssignees.filter(id => id !== memberId));
    } else {
      setSelectedAssignees([...selectedAssignees, memberId]);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedAssignees);
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content small">
        <span className="close-assignee" onClick={onCancel}>&times;</span>
        <h3>👥 เลือก Assignees</h3>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
          Task: <strong>{taskTitle}</strong>
        </p>

        <div className="assignee-list">
          {members.map(member => {
            const isSelected = selectedAssignees.includes(member.id);
            return (
              <div
                key={member.id}
                className={`assignee-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleToggleAssignee(member.id)}
              >
                <div className="assignee-checkbox">
                  {isSelected && '✓'}
                </div>
                <div
                  className="assignee-avatar"
                  style={{
                    background: member.color || '#667eea',
                    width: '36px',
                    height: '36px',
                    fontSize: '13px'
                  }}
                >
                  {member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="assignee-info">
                  <div className="assignee-name">{member.name}</div>
                  <div className="assignee-role">{member.role || 'Member'}</div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedAssignees.length > 0 && (
          <div className="selected-count">
            เลือกแล้ว {selectedAssignees.length} คน
          </div>
        )}

        <div className="confirm-buttons">
          <button className="btn-secondary" onClick={onCancel}>
            ยกเลิก
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            ยืนยัน ({selectedAssignees.length})
          </button>
        </div>
      </div>
    </div>
  );
}
