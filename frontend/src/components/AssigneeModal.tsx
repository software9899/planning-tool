import { useState, useEffect } from 'react';

interface AssigneeModalProps {
  isOpen: boolean;
  taskTitle: string;
  currentAssignee?: string;
  currentEstimate?: number;
  onConfirm: (assignee: string, estimateHours: number) => void;
  onCancel: () => void;
}

export default function AssigneeModal({
  isOpen,
  taskTitle,
  currentAssignee,
  currentEstimate,
  onConfirm,
  onCancel
}: AssigneeModalProps) {
  const [assignee, setAssignee] = useState('');
  const [estimateHours, setEstimateHours] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load members from API first, fallback to localStorage
      const loadMembers = async () => {
        try {
          const response = await fetch('/api/users');
          if (response.ok) {
            const users = await response.json();
            console.log('Loaded members from API:', users);
            setMembers(users);
            // Also save to localStorage for offline use
            localStorage.setItem('members', JSON.stringify(users));
            return;
          }
        } catch (error) {
          console.log('Failed to load members from API, trying localStorage');
        }

        // Fallback to localStorage
        const membersData = localStorage.getItem('members');
        if (membersData) {
          const loadedMembers = JSON.parse(membersData);
          console.log('Loaded members from localStorage:', loadedMembers);
          setMembers(loadedMembers);
        } else {
          console.warn('No members found in API or localStorage');
          setMembers([]);
        }
      };

      loadMembers();

      // Set assignee
      console.log('Setting assignee to:', currentAssignee);
      setAssignee(currentAssignee || '');
      setEstimateHours(currentEstimate ? String(currentEstimate) : '');
    }
  }, [isOpen, currentAssignee, currentEstimate]);

  const handleConfirm = () => {
    if (!assignee.trim()) {
      alert('กรุณาเลือก Assignee');
      return;
    }

    if (!estimateHours || parseFloat(estimateHours) <= 0) {
      alert('กรุณาใส่ Estimate Hours');
      return;
    }

    onConfirm(assignee, parseFloat(estimateHours));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content">
        <span className="close-assignee" onClick={onCancel}>&times;</span>
        <h3>กรุณาใส่ข้อมูล</h3>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
          Task: <strong>{taskTitle}</strong>
        </p>

        <div className="form-group">
          <label>Assignee *</label>
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">-- Select Member --</option>
            {members.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Estimate Hours *</label>
          <input
            type="number"
            value={estimateHours}
            onChange={(e) => setEstimateHours(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="จำนวนชั่วโมงโดยประมาณ"
            min="0"
            step="0.5"
            autoFocus
            className="estimate-hours-input"
          />
        </div>

        <div className="confirm-buttons">
          <button className="btn-secondary" onClick={onCancel}>
            ยกเลิก
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}
