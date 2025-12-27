import { useState, useEffect } from 'react';

interface LeaveRequest {
  id: string;
  user_id: string;
  user_name: string;
  leave_type: 'annual' | 'sick' | 'personal' | 'unpaid';
  start_date: string;
  end_date: string;
  days: number;
  half_day_type?: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_date: string;
  reviewed_by?: string;
  reviewed_date?: string;
  dates?: string[] | null;  // List of all leave dates
}

interface LeaveBalance {
  user_id: string;
  user_name: string;
  annual_total: number;
  annual_used: number;
  annual_remaining: number;
  sick_total: number;
  sick_used: number;
  sick_remaining: number;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'requests' | 'balances'>('calendar');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Calendar/Gantt Chart state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<{ userId: string; date: string; userName: string; startDate?: string; endDate?: string } | null>(null);
  const [showQuickLeaveModal, setShowQuickLeaveModal] = useState(false);
  const [showQuickSelectPopup, setShowQuickSelectPopup] = useState(false);
  const [showHalfDayPopup, setShowHalfDayPopup] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [selectedLeaveDate, setSelectedLeaveDate] = useState<string | null>(null); // Store the specific date clicked for half-day conversion
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<{ userId: string; date: string; userName: string } | null>(null);
  const [draggedCells, setDraggedCells] = useState<Array<{ userId: string; date: string }>>([]);

  // Context menu state (right-click)
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuLeave, setContextMenuLeave] = useState<LeaveRequest | null>(null);
  const [contextMenuDate, setContextMenuDate] = useState<string | null>(null); // Store the specific date clicked

  // Request Leave Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'personal' | 'unpaid'>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadCurrentUser();
    loadMembers();
    loadLeaveRequests();
    loadLeaveBalances();
  }, []);

  // Close quick select popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showQuickSelectPopup && !target.closest('.quick-select-popup')) {
        setShowQuickSelectPopup(false);
        setSelectedCell(null);
        setStartDate('');
        setEndDate('');
        setDraggedCells([]); // Clear highlighted cells when closing popup
      }
      if (showHalfDayPopup && !target.closest('.half-day-popup')) {
        setShowHalfDayPopup(false);
        setSelectedLeave(null);
      }
      if (showContextMenu && !target.closest('.context-menu')) {
        setShowContextMenu(false);
        setContextMenuLeave(null);
        setContextMenuDate(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuickSelectPopup, showHalfDayPopup, showContextMenu]);

  const loadCurrentUser = () => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  };

  const loadMembers = async () => {
    try {
      const response = await fetch('http://localhost:8002/api/members');
      if (response.ok) {
        const data = await response.json();
        // Filter only active members
        setMembers(data.filter((m: Member) => m.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      const response = await fetch('http://localhost:8002/api/leave-requests');
      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data);
      }
    } catch (error) {
      console.error('Failed to load leave requests:', error);
    }
  };

  const loadLeaveBalances = async () => {
    try {
      const response = await fetch('http://localhost:8002/api/leave-balances');
      if (response.ok) {
        const data = await response.json();
        setLeaveBalances(data);
      }
    } catch (error) {
      console.error('Failed to load leave balances:', error);
    }
  };

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const generateDatesArray = (start: string, end: string): string[] => {
    if (!start || !end) return [];
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);

    const current = new Date(startDate);
    while (current <= endDate) {
      dates.push(formatDate(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const handleRequestLeave = async () => {
    if (!startDate || !endDate || !reason.trim()) {
      alert('❌ Please fill in all required fields');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert('❌ End date must be after start date');
      return;
    }

    try {
      const days = calculateDays(startDate, endDate);
      const dates = generateDatesArray(startDate, endDate);

      // Convert date strings to ISO datetime
      const startDateTime = new Date(startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(endDate + 'T23:59:59').toISOString();

      const response = await fetch('http://localhost:8002/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser?.id,
          user_name: currentUser?.name,
          leave_type: leaveType,
          start_date: startDateTime,
          end_date: endDateTime,
          days,
          dates,
          reason: reason.trim(),
          status: 'pending',
          requested_date: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit leave request');
      }

      alert('✅ Leave request submitted successfully');
      setShowRequestModal(false);
      resetRequestForm();
      await loadLeaveRequests();
      await loadLeaveBalances();
    } catch (error: any) {
      console.error('Failed to submit leave request:', error);
      alert(`❌ Failed to submit leave request: ${error.message}`);
    }
  };

  const resetRequestForm = () => {
    setLeaveType('annual');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const handleApproveReject = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`http://localhost:8002/api/leave-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewed_by: currentUser?.name,
          reviewed_date: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${status} leave request`);
      }

      alert(`✅ Leave request ${status} successfully`);
      await loadLeaveRequests();
      await loadLeaveBalances();
    } catch (error: any) {
      console.error(`Failed to ${status} leave request:`, error);
      alert(`❌ Failed to ${status} leave request: ${error.message}`);
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      annual: 'Annual Leave',
      sick: 'Sick Leave',
      personal: 'Personal Leave',
      unpaid: 'Unpaid Leave'
    };
    return labels[type] || type;
  };

  const getLeaveTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      annual: '🏖️',
      sick: '🤒',
      personal: '👤',
      unpaid: '💼'
    };
    return icons[type] || '📅';
  };

  const getLeaveTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      annual: '#3b82f6',
      sick: '#ef4444',
      personal: '#f59e0b',
      unpaid: '#6b7280'
    };
    return colors[type] || '#6b7280';
  };

  const getStatusBadge = (status: string) => {
    const config: { [key: string]: { bg: string; text: string; label: string } } = {
      pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
      approved: { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
      rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' }
    };
    const { bg, text, label } = config[status] || config.pending;
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        background: bg,
        color: text
      }}>
        {label}
      </span>
    );
  };

  // Calendar/Gantt Chart functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLeaveForUserAndDate = (userId: string, date: string) => {
    return leaveRequests.find(req => {
      if (req.user_id !== userId) return false;
      if (req.status === 'rejected') return false;

      // If dates array exists, check if date is in the list
      if (req.dates && req.dates.length > 0) {
        return req.dates.includes(date);
      }

      // Fallback to start_date/end_date for backward compatibility
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      const current = new Date(date);
      return current >= start && current <= end;
    });
  };

  const handleCellClick = (userId: string, date: string, userName: string, event: React.MouseEvent) => {
    console.log('handleCellClick called - button:', event.button, 'userId:', userId, 'date:', date);

    // Don't show half-day popup if it's a right-click (context menu will handle it)
    if (event.button === 2) {
      console.log('Right click - skipping');
      return;
    }

    // Check if there's already a leave on this date
    const existingLeave = getLeaveForUserAndDate(userId, date);
    console.log('existingLeave:', existingLeave);

    if (existingLeave) {
      // Show half-day popup for any leave (including already half-day leaves to allow changing)
      console.log('Showing half-day popup for date:', date);
      setSelectedLeave(existingLeave);
      setSelectedLeaveDate(date); // Store the specific date clicked
      setPopupPosition({ x: event.clientX, y: event.clientY });
      setShowHalfDayPopup(true);
      return;
    }

    // Only allow users to create leave for themselves, or admins can create for anyone
    const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
    if (!isAdmin && userId !== currentUser?.id) {
      alert('You can only create leave requests for yourself');
      return;
    }

    // Set selected cell and show popup at mouse position
    setSelectedCell({ userId, date, userName });
    setPopupPosition({ x: event.clientX, y: event.clientY });
    setShowQuickSelectPopup(true);
    // Highlight the clicked cell
    setDraggedCells([{ userId, date }]);
  };

  const handleQuickLeaveSubmit = async () => {
    if (!selectedCell || !reason.trim()) {
      alert('❌ Please provide a reason for your leave');
      return;
    }

    try {
      const member = members.find(m => m.id === selectedCell.userId);
      const days = calculateDays(startDate, endDate);
      const dates = generateDatesArray(startDate, endDate);

      // Convert date strings to ISO datetime
      const startDateTime = new Date(startDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(endDate + 'T23:59:59').toISOString();

      const response = await fetch('http://localhost:8002/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedCell.userId,
          user_name: member?.name || currentUser?.name,
          leave_type: leaveType,
          start_date: startDateTime,
          end_date: endDateTime,
          days,
          dates,
          reason: reason.trim(),
          status: 'pending',
          requested_date: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit leave request');
      }

      alert('✅ Leave request submitted successfully');
      setShowQuickLeaveModal(false);
      setSelectedCell(null);
      resetRequestForm();
      await loadLeaveRequests();
      await loadLeaveBalances();
    } catch (error: any) {
      console.error('Failed to submit leave request:', error);
      alert(`❌ Failed to submit leave request: ${error.message}`);
    }
  };

  const handleQuickLeaveTypeSelect = async (selectedLeaveType: 'annual' | 'sick' | 'personal' | 'unpaid') => {
    if (!selectedCell) return;

    try {
      // Use startDate and endDate from selectedCell if set (from drag selection), otherwise use single date
      const effectiveStartDate = selectedCell.startDate || selectedCell.date;
      const effectiveEndDate = selectedCell.endDate || selectedCell.date;
      const days = calculateDays(effectiveStartDate, effectiveEndDate);
      const dates = generateDatesArray(effectiveStartDate, effectiveEndDate);

      console.log('Creating leave - Start:', effectiveStartDate, 'End:', effectiveEndDate, 'Days:', days);
      console.log('Dates array:', dates);

      // Convert date string to ISO datetime
      const startDateTime = new Date(effectiveStartDate + 'T00:00:00').toISOString();
      const endDateTime = new Date(effectiveEndDate + 'T23:59:59').toISOString();

      const response = await fetch('http://localhost:8002/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedCell.userId,
          user_name: selectedCell.userName,
          leave_type: selectedLeaveType,
          start_date: startDateTime,
          end_date: endDateTime,
          days,
          dates,
          reason: `${getLeaveTypeLabel(selectedLeaveType)} - Quick request`,
          status: 'pending',
          requested_date: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit leave request');
      }

      alert(`✅ ${getLeaveTypeLabel(selectedLeaveType)} request submitted successfully (${days} day${days > 1 ? 's' : ''})`);
      setShowQuickSelectPopup(false);
      setSelectedCell(null);
      setStartDate('');
      setEndDate('');
      setDraggedCells([]); // Clear highlighted cells after successful submission
      await loadLeaveRequests();
      await loadLeaveBalances();
    } catch (error: any) {
      console.error('Failed to submit leave request:', error);
      alert(`❌ Failed to submit leave request: ${error.message}`);
      setDraggedCells([]); // Clear highlighted cells on error
    }
  };

  const handleAdvancedLeaveClick = () => {
    if (!selectedCell) return;

    setStartDate(selectedCell.date);
    setEndDate(selectedCell.date);
    setReason('');
    setLeaveType('annual');
    setShowQuickSelectPopup(false);
    setShowQuickLeaveModal(true);
  };

  const handleConvertToHalfDay = async (halfDayType: 'morning' | 'afternoon') => {
    if (!selectedLeave || !selectedLeaveDate) return;

    try {
      // Case 1: Already half-day - just change the type (morning <-> afternoon)
      if (selectedLeave.half_day_type) {
        await fetch(`http://localhost:8002/api/leave-requests/${selectedLeave.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            half_day_type: halfDayType
          })
        });

        alert(`✅ Changed to ${halfDayType === 'morning' ? 'ครึ่งเช้า (Morning)' : 'ครึ่งบ่าย (Afternoon)'}`);
      } else {
        // Case 2 & 3: Not yet half-day - need to convert
        const dates = selectedLeave.dates || [];
        const isMultiDay = dates.length > 1;

        if (isMultiDay) {
          // Multi-day leave: remove the selected date and create a new half-day leave
          const newDates = dates.filter(d => d !== selectedLeaveDate);

          // Update the original leave (remove the selected date)
          await fetch(`http://localhost:8002/api/leave-requests/${selectedLeave.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dates: newDates,
              days: newDates.length
            })
          });

          // Create a new half-day leave for the selected date
          // Use simple string concatenation to avoid timezone issues
          const selectedDatetime = selectedLeaveDate + 'T12:00:00.000Z';

          const createResponse = await fetch('http://localhost:8002/api/leave-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: selectedLeave.user_id,
              user_name: selectedLeave.user_name,
              leave_type: selectedLeave.leave_type,
              start_date: selectedDatetime,
              end_date: selectedDatetime,
              days: 0.5,
              dates: [selectedLeaveDate],
              half_day_type: halfDayType,
              reason: selectedLeave.reason,
              status: selectedLeave.status,
              requested_date: new Date().toISOString()
            })
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            console.error('Failed to create half-day leave:', errorData);
            alert(`❌ Failed to create half-day leave. Please check console for details.`);
            return;
          }

          alert(`✅ Converted ${new Date(selectedLeaveDate).toLocaleDateString('th-TH')} to half-day (${halfDayType === 'morning' ? 'ครึ่งเช้า' : 'ครึ่งบ่าย'})`);
        } else {
          // Single-day leave: just update the half_day_type
          await fetch(`http://localhost:8002/api/leave-requests/${selectedLeave.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              half_day_type: halfDayType,
              days: 0.5
            })
          });

          alert(`✅ Leave converted to half-day (${halfDayType === 'morning' ? 'ครึ่งเช้า' : 'ครึ่งบ่าย'}) successfully`);
        }
      }

      setShowHalfDayPopup(false);
      setSelectedLeave(null);
      setSelectedLeaveDate(null);
      await loadLeaveRequests();
      await loadLeaveBalances();
    } catch (error: any) {
      console.error('Failed to convert to half-day:', error);
      alert(`❌ Failed to convert to half-day: ${error.message}`);
    }
  };

  const handleResetToFullDay = async () => {
    if (!selectedLeave) return;

    try {
      // Reset half-day leave back to full day
      // Ensure we maintain the dates array
      const leaveDates = selectedLeave.dates && selectedLeave.dates.length > 0
        ? selectedLeave.dates
        : [selectedLeaveDate];

      await fetch(`http://localhost:8002/api/leave-requests/${selectedLeave.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          half_day_type: null,
          days: 1,
          dates: leaveDates
        })
      });

      alert(`✅ Reset to full day (1.0) successfully`);

      setShowHalfDayPopup(false);
      setSelectedLeave(null);
      setSelectedLeaveDate(null);
      await loadLeaveRequests();
      await loadLeaveBalances();
    } catch (error: any) {
      console.error('Failed to reset to full day:', error);
      alert(`❌ Failed to reset to full day: ${error.message}`);
    }
  };

  const handleDeleteLeave = async () => {
    if (!selectedLeave) return;

    if (!confirm(`Are you sure you want to delete this ${getLeaveTypeLabel(selectedLeave.leave_type)}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8002/api/leave-requests/${selectedLeave.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete leave request');
      }

      alert('✅ Leave request deleted successfully');
      setShowHalfDayPopup(false);
      setSelectedLeave(null);
      await loadLeaveRequests();
      await loadLeaveBalances();
    } catch (error: any) {
      console.error('Failed to delete leave:', error);
      alert(`❌ Failed to delete leave: ${error.message}`);
    }
  };

  // Context menu handlers (right-click)
  const handleContextMenu = (event: React.MouseEvent, leave: LeaveRequest, date: string) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent event from bubbling up to td's onClick
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuLeave(leave);
    setContextMenuDate(date);
    setShowContextMenu(true);
  };

  const handleDeleteFromContextMenu = async () => {
    if (!contextMenuLeave || !contextMenuDate) return;

    const clickedDateStr = contextMenuDate;
    const dates = contextMenuLeave.dates || [];

    // If only one day left, delete entire leave
    if (dates.length <= 1) {
      if (!confirm(`Are you sure you want to delete this ${getLeaveTypeLabel(contextMenuLeave.leave_type)}?`)) {
        return;
      }

      try {
        const response = await fetch(`http://localhost:8002/api/leave-requests/${contextMenuLeave.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete leave request');
        }

        alert('✅ Leave deleted successfully');
        setShowContextMenu(false);
        setContextMenuLeave(null);
        setContextMenuDate(null);
        setDraggedCells([]);
        await loadLeaveRequests();
        await loadLeaveBalances();
      } catch (error: any) {
        console.error('Failed to delete leave:', error);
        alert(`❌ Failed to delete leave: ${error.message}`);
      }
      return;
    }

    if (!confirm(`Are you sure you want to remove ${new Date(clickedDateStr).toLocaleDateString('th-TH')} from this leave?`)) {
      return;
    }

    try {
      // Remove clicked date from dates array
      const newDates = dates.filter(d => d !== clickedDateStr);
      const newDays = newDates.length;

      console.log('Removing date:', clickedDateStr);
      console.log('Remaining dates:', newDates);
      console.log('New days count:', newDays);

      const updatePayload = {
        dates: newDates,
        days: newDays
      };

      const response = await fetch(`http://localhost:8002/api/leave-requests/${contextMenuLeave.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update failed:', response.status, errorText);
        throw new Error('Failed to update leave request');
      }

      const updatedLeave = await response.json();
      console.log('Updated leave response:', updatedLeave);

      alert('✅ Day removed from leave successfully');
      setShowContextMenu(false);
      setContextMenuLeave(null);
      setContextMenuDate(null);
      setDraggedCells([]);
      await loadLeaveRequests();
      await loadLeaveBalances();
    } catch (error: any) {
      console.error('Failed to update leave:', error);
      alert(`❌ Failed to update leave: ${error.message}`);
    }
  };

  // Drag selection handlers
  const handleDragStart = (userId: string, date: string, userName: string, event: React.MouseEvent) => {
    // Check if there's already a leave on this date - don't allow drag if there is
    const existingLeave = getLeaveForUserAndDate(userId, date);
    if (existingLeave) {
      return; // Don't start drag if there's already a leave
    }

    // Check permissions
    const isAdminUser = currentUser?.role?.toLowerCase() === 'admin';
    if (!isAdminUser && userId !== currentUser?.id) {
      return; // Users can only create leave for themselves
    }

    event.preventDefault();
    setIsDragging(true);
    setDragStartCell({ userId, date, userName });
    setDraggedCells([{ userId, date }]);
  };

  const handleDragEnter = (userId: string, date: string) => {
    if (!isDragging || !dragStartCell) return;

    // Only allow dragging on the same user's row
    if (userId !== dragStartCell.userId) return;

    // Calculate the range between start and current date
    const startDate = new Date(dragStartCell.date);
    const currentDate = new Date(date);

    // Determine the earlier and later dates
    const earlierDate = startDate <= currentDate ? startDate : currentDate;
    const laterDate = startDate <= currentDate ? currentDate : startDate;

    // Build array of all dates in the range
    const newDraggedCells: Array<{ userId: string; date: string }> = [];
    const current = new Date(earlierDate);

    while (current <= laterDate) {
      newDraggedCells.push({
        userId,
        date: formatDate(current)
      });
      current.setDate(current.getDate() + 1);
    }

    setDraggedCells(newDraggedCells);
  };

  const handleDragEnd = async (event: MouseEvent) => {
    // Don't show quick-select popup if it's a right-click (context menu will handle it)
    if (event.button === 2) {
      setIsDragging(false);
      setDragStartCell(null);
      setDraggedCells([]);
      return;
    }

    if (!isDragging || !dragStartCell || draggedCells.length === 0) {
      setIsDragging(false);
      setDragStartCell(null);
      setDraggedCells([]);
      return;
    }

    // Get all dates from dragged cells and sort them
    const dates = draggedCells
      .map(cell => cell.date)
      .sort();

    if (dates.length === 0) {
      setIsDragging(false);
      setDragStartCell(null);
      setDraggedCells([]);
      return;
    }

    const dragStartDate = dates[0];
    const dragEndDate = dates[dates.length - 1];

    console.log('Drag ended - Start:', dragStartDate, 'End:', dragEndDate, 'Days:', dates.length);

    // Set the selected cell with the date range info
    setSelectedCell({
      userId: dragStartCell.userId,
      date: dragStartDate,
      userName: dragStartCell.userName,
      startDate: dragStartDate,
      endDate: dragEndDate
    });

    // Set start and end dates for the multi-day leave
    setStartDate(dragStartDate);
    setEndDate(dragEndDate);

    // Show popup at mouse position
    setPopupPosition({ x: event.clientX, y: event.clientY });
    setShowQuickSelectPopup(true);

    // Reset drag state but keep draggedCells to show selection
    setIsDragging(false);
    setDragStartCell(null);
    // Don't clear draggedCells here - keep the highlight visible
  };

  // Add global mouseup listener for drag end
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        handleDragEnd(e);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStartCell, draggedCells]);

  const changeMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  return (
    <div style={{ padding: '30px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            🏖️ Leave Management
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Manage leave requests and track leave balances
          </p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(102, 126, 234, 0.3)';
          }}
        >
          ➕ Request Leave
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '30px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'calendar' ? '3px solid #667eea' : '3px solid transparent',
            color: activeTab === 'calendar' ? '#667eea' : '#6b7280',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s',
            marginBottom: '-2px'
          }}
        >
          📅 Calendar View
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'requests' ? '3px solid #667eea' : '3px solid transparent',
            color: activeTab === 'requests' ? '#667eea' : '#6b7280',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s',
            marginBottom: '-2px'
          }}
        >
          📝 Leave Requests
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'balances' ? '3px solid #667eea' : '3px solid transparent',
            color: activeTab === 'balances' ? '#667eea' : '#6b7280',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s',
            marginBottom: '-2px'
          }}
        >
          📊 Leave Balances
        </button>
      </div>

      {/* Calendar/Gantt Chart Tab */}
      {activeTab === 'calendar' && (
        <>
          {/* Month Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            padding: '16px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <button
              onClick={() => changeMonth(-1)}
              style={{
                padding: '8px 16px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              ← Previous Month
            </button>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => changeMonth(1)}
              style={{
                padding: '8px 16px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Next Month →
            </button>
          </div>

          {/* Gantt Chart */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'auto',
            maxHeight: '70vh'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#374151',
                    minWidth: '150px',
                    position: 'sticky',
                    left: 0,
                    background: '#f9fafb',
                    zIndex: 11
                  }}>
                    Member
                  </th>
                  {getDaysInMonth(currentMonth).map((day, idx) => (
                    <th key={idx} style={{
                      padding: '8px 4px',
                      textAlign: 'center',
                      fontWeight: 600,
                      fontSize: '11px',
                      color: '#374151',
                      minWidth: '35px',
                      background: day.getDay() === 0 || day.getDay() === 6 ? '#fef3c7' : '#f9fafb'
                    }}>
                      <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div style={{ fontSize: '13px', marginTop: '2px' }}>{day.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{
                      padding: '12px 16px',
                      fontWeight: 600,
                      color: '#111827',
                      fontSize: '14px',
                      position: 'sticky',
                      left: 0,
                      background: 'white',
                      zIndex: 5,
                      borderRight: '2px solid #e5e7eb'
                    }}>
                      {member.name}
                    </td>
                    {getDaysInMonth(currentMonth).map((day, idx) => {
                      const dateStr = formatDate(day);
                      const leave = getLeaveForUserAndDate(member.id, dateStr);
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const isToday = formatDate(new Date()) === dateStr;

                      const isDraggedCell = draggedCells.some(cell => cell.userId === member.id && cell.date === dateStr);

                      return (
                        <td
                          key={idx}
                          onClick={(e) => {
                            // Only trigger click if not dragging
                            if (!isDragging) {
                              handleCellClick(member.id, dateStr, member.name, e);
                            }
                          }}
                          onMouseDown={(e) => handleDragStart(member.id, dateStr, member.name, e)}
                          onMouseEnter={() => handleDragEnter(member.id, dateStr)}
                          style={{
                            padding: '4px',
                            textAlign: 'center',
                            cursor: isDragging ? 'crosshair' : 'pointer',
                            background: isDraggedCell
                              ? 'rgba(102, 126, 234, 0.3)'
                              : leave
                              ? getLeaveTypeColor(leave.leave_type) + (leave.status === 'approved' ? 'CC' : '66')
                              : isWeekend
                              ? '#fef3c7'
                              : 'white',
                            border: isDraggedCell
                              ? '2px solid #667eea'
                              : '1px solid #e5e7eb',
                            transition: 'all 0.2s',
                            position: 'relative',
                            minHeight: '40px',
                            userSelect: 'none'
                          }}
                          title={leave ? `${getLeaveTypeLabel(leave.leave_type)}${leave.half_day_type ? ` (Half-day: ${leave.half_day_type})` : ''} - ${leave.status}` : isDragging ? 'Selecting range...' : 'Click to request leave or drag to select multiple days'}
                        >
                          {leave && (
                            <div
                              onContextMenu={(e) => handleContextMenu(e, leave, dateStr)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                position: 'relative'
                              }}>
                              {/* Show 0.5 on top for morning half-day */}
                              {leave.half_day_type === 'morning' && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: 'white',
                                  background: 'rgba(0,0,0,0.6)',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  marginBottom: '2px'
                                }}>
                                  0.5
                                </span>
                              )}

                              <span style={{ fontSize: '18px' }}>
                                {getLeaveTypeIcon(leave.leave_type)}
                              </span>

                              {/* Show 0.5 on bottom for afternoon half-day */}
                              {leave.half_day_type === 'afternoon' && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: 'white',
                                  background: 'rgba(0,0,0,0.6)',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  marginTop: '2px'
                                }}>
                                  0.5
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={getDaysInMonth(currentMonth).length + 1} style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#9ca3af'
                    }}>
                      No members found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
              Legend:
            </h4>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: getLeaveTypeColor('annual') + 'CC',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}>
                  {getLeaveTypeIcon('annual')}
                </div>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Annual Leave</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: getLeaveTypeColor('sick') + 'CC',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}>
                  {getLeaveTypeIcon('sick')}
                </div>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Sick Leave</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: getLeaveTypeColor('personal') + 'CC',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}>
                  {getLeaveTypeIcon('personal')}
                </div>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Personal Leave</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: getLeaveTypeColor('unpaid') + 'CC',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}>
                  {getLeaveTypeIcon('unpaid')}
                </div>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Unpaid Leave</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#fef3c7',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }} />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Weekend</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '18px' }}>⏳</div>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Pending</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '18px' }}>✓</div>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Approved</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Leave Requests Tab */}
      {activeTab === 'requests' && (
        <>
          {/* Filter */}
          <div style={{ marginBottom: '20px' }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={{
                padding: '10px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Requests</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Requests Table */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Employee</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Leave Type</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Start Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>End Date</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Days</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Reason</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Status</th>
                  {isAdmin && <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                      No leave requests found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(request => (
                    <tr key={request.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{request.user_name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                          Requested: {new Date(request.requested_date).toLocaleDateString('th-TH')}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: getLeaveTypeColor(request.leave_type) + '20',
                          color: getLeaveTypeColor(request.leave_type)
                        }}>
                          {getLeaveTypeLabel(request.leave_type)}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#374151' }}>
                        {new Date(request.start_date).toLocaleDateString('th-TH')}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#374151' }}>
                        {new Date(request.end_date).toLocaleDateString('th-TH')}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                        {request.days}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280', maxWidth: '200px' }}>
                        {request.reason}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {getStatusBadge(request.status)}
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          {request.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleApproveReject(request.id, 'approved')}
                                style={{
                                  padding: '6px 12px',
                                  background: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => handleApproveReject(request.id, 'rejected')}
                                style={{
                                  padding: '6px 12px',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}
                          {request.status !== 'pending' && (
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {request.reviewed_by && `by ${request.reviewed_by}`}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Leave Balances Tab */}
      {activeTab === 'balances' && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Employee</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Annual Leave</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: '#374151' }}>Sick Leave</th>
              </tr>
            </thead>
            <tbody>
              {leaveBalances.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    No leave balance data available
                  </td>
                </tr>
              ) : (
                leaveBalances.map(balance => (
                  <tr key={balance.user_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px', fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                      {balance.user_name}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {balance.annual_used} / {balance.annual_total} days used
                        </div>
                        <div style={{
                          width: '100%',
                          maxWidth: '200px',
                          height: '8px',
                          background: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${(balance.annual_used / balance.annual_total) * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                          {balance.annual_remaining} days remaining
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {balance.sick_used} / {balance.sick_total} days used
                        </div>
                        <div style={{
                          width: '100%',
                          maxWidth: '200px',
                          height: '8px',
                          background: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${(balance.sick_used / balance.sick_total) * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                          {balance.sick_remaining} days remaining
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Leave Modal */}
      {showRequestModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <span className="close-assignee" onClick={() => {
              setShowRequestModal(false);
              resetRequestForm();
            }}>&times;</span>
            <h3>📝 Request Leave</h3>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Leave Type *
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '15px'
                }}
              >
                <option value="annual">Annual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '15px'
                }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '15px'
                }}
              />

              {startDate && endDate && (
                <div style={{
                  padding: '12px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  marginBottom: '15px',
                  fontSize: '14px',
                  color: '#0c4a6e'
                }}>
                  Total days: <strong>{calculateDays(startDate, endDate)}</strong>
                </div>
              )}

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for your leave request"
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div className="confirm-buttons">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowRequestModal(false);
                  resetRequestForm();
                }}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleRequestLeave}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Leave Type Selection Popup */}
      {showQuickSelectPopup && selectedCell && (
        <div
          className="quick-select-popup"
          style={{
            position: 'fixed',
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '280px',
            padding: '16px'
          }}
        >
          <div style={{
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
              {selectedCell.userName}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {selectedCell.startDate && selectedCell.endDate && selectedCell.startDate !== selectedCell.endDate ? (
                <>
                  {new Date(selectedCell.startDate).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                  {' - '}
                  {new Date(selectedCell.endDate).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                  <div style={{
                    marginTop: '4px',
                    padding: '4px 8px',
                    background: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'inline-block'
                  }}>
                    {calculateDays(selectedCell.startDate, selectedCell.endDate)} days
                  </div>
                </>
              ) : (
                new Date(selectedCell.date).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Leave type buttons in horizontal layout */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'wrap' }}>
            {/* Annual Leave */}
            <button
              onClick={() => handleQuickLeaveTypeSelect('annual')}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #86efac 0%, #22c55e 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>🏖️</span>
              <span>Annual Leave</span>
            </button>

            {/* Sick Leave */}
            <button
              onClick={() => handleQuickLeaveTypeSelect('sick')}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #fdba74 0%, #f97316 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>🤒</span>
              <span>Sick Leave</span>
            </button>

            {/* Personal Leave */}
            <button
              onClick={() => handleQuickLeaveTypeSelect('personal')}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>👤</span>
              <span>Personal Leave</span>
            </button>

            {/* Unpaid Leave */}
            <button
              onClick={() => handleQuickLeaveTypeSelect('unpaid')}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>💼</span>
              <span>Unpaid Leave</span>
            </button>
            </div>

            {/* Advanced Option - Opens Full Modal */}
            <button
              onClick={handleAdvancedLeaveClick}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                color: '#6b7280',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              ⚙️ Advanced Options (Multi-day)
            </button>
          </div>
        </div>
      )}

      {/* Quick Leave Modal (from Calendar click) */}
      {showQuickLeaveModal && selectedCell && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <span className="close-assignee" onClick={() => {
              setShowQuickLeaveModal(false);
              setSelectedCell(null);
              resetRequestForm();
            }}>&times;</span>
            <h3>📝 Quick Leave Request</h3>

            <div style={{ marginTop: '20px' }}>
              <div style={{
                padding: '12px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                marginBottom: '15px',
                fontSize: '14px',
                color: '#0c4a6e'
              }}>
                <strong>Selected Date:</strong> {new Date(selectedCell.date).toLocaleDateString('th-TH')}
              </div>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Leave Type *
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '15px'
                }}
              >
                <option value="annual">Annual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '15px'
                }}
              />

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '15px'
                }}
              />

              {startDate && endDate && (
                <div style={{
                  padding: '12px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  marginBottom: '15px',
                  fontSize: '14px',
                  color: '#0c4a6e'
                }}>
                  Total days: <strong>{calculateDays(startDate, endDate)}</strong>
                </div>
              )}

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for your leave request"
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div className="confirm-buttons">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowQuickLeaveModal(false);
                  setSelectedCell(null);
                  resetRequestForm();
                }}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleQuickLeaveSubmit}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Half-Day Conversion Popup */}
      {showHalfDayPopup && selectedLeave && (
        <div
          className="half-day-popup"
          style={{
            position: 'fixed',
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '280px',
            padding: '16px'
          }}
        >
          <div style={{
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
              {getLeaveTypeIcon(selectedLeave.leave_type)} {getLeaveTypeLabel(selectedLeave.leave_type)}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {selectedLeave.user_name}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {new Date(selectedLeave.start_date).toLocaleDateString('th-TH')}
            </div>
          </div>

          {/* Display selected date if available */}
          {selectedLeaveDate && (
            <div style={{
              padding: '8px 12px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              textAlign: 'center',
              color: '#0c4a6e',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '12px'
            }}>
              Selected: {new Date(selectedLeaveDate).toLocaleDateString('th-TH')}
            </div>
          )}

          {/* Conversion buttons - always shown */}
          <div style={{
            marginBottom: '12px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151',
            textAlign: 'center'
          }}>
            {selectedLeave.half_day_type ? 'Change Half-Day Type' : 'Convert to Half-Day Leave (0.5)'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            {/* Morning Half */}
            <button
              onClick={() => handleConvertToHalfDay('morning')}
              style={{
                padding: '12px 16px',
                background: selectedLeave.half_day_type === 'morning'
                  ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                  : 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)',
                border: selectedLeave.half_day_type === 'morning' ? '2px solid #78350f' : 'none',
                borderRadius: '8px',
                color: '#78350f',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: selectedLeave.half_day_type === 'morning' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>☀️</span>
              <span>ครึ่งเช้า (Morning Half)</span>
              {selectedLeave.half_day_type === 'morning' && <span style={{ marginLeft: '4px' }}>✓</span>}
            </button>

            {/* Afternoon Half */}
            <button
              onClick={() => handleConvertToHalfDay('afternoon')}
              style={{
                padding: '12px 16px',
                background: selectedLeave.half_day_type === 'afternoon'
                  ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)'
                  : 'linear-gradient(135deg, #ddd6fe 0%, #a78bfa 100%)',
                border: selectedLeave.half_day_type === 'afternoon' ? '2px solid #4c1d95' : 'none',
                borderRadius: '8px',
                color: '#4c1d95',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: selectedLeave.half_day_type === 'afternoon' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>🌙</span>
              <span>ครึ่งบ่าย (Afternoon Half)</span>
              {selectedLeave.half_day_type === 'afternoon' && <span style={{ marginLeft: '4px' }}>✓</span>}
            </button>

            {/* Reset to Full Day - only shown when already half-day */}
            {selectedLeave.half_day_type && (
              <button
                onClick={handleResetToFullDay}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#1f2937',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  borderTop: '1px solid #d1d5db',
                  paddingTop: '16px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span>🔄</span>
                <span>Reset to Full Day (1.0)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Right-Click Context Menu - Simple version with just delete button */}
      {showContextMenu && contextMenuLeave && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 1000,
            padding: '4px'
          }}
        >
          <button
            onClick={handleDeleteFromContextMenu}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #fecaca 0%, #ef4444 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span>🗑️</span>
            <span>{contextMenuLeave.days > 1 ? 'ลบวันนี้ (Remove this day)' : 'ลบวันลา (Delete Leave)'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
