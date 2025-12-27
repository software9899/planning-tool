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
      // Load members from localStorage
      const membersData = localStorage.getItem('members');
      let loadedMembers: any[] = [];
      if (membersData) {
        loadedMembers = JSON.parse(membersData);
        setMembers(loadedMembers);
      }

      // Set assignee (currentAssignee is already draggedBy from parent)
      console.log('Setting assignee to:', currentAssignee);
      console.log('Available members:', loadedMembers.map((m: any) => m.name));
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
            {/* Add current assignee if not in members list */}
            {currentAssignee && !members.some(m => m.name === currentAssignee) && (
              <option value={currentAssignee}>{currentAssignee} (You)</option>
            )}
            {members.map(member => (
              <option key={member.name} value={member.name}>
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
