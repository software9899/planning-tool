import { useState, useEffect } from 'react';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface CreateBacklogTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (task: any) => void;
}

export default function CreateBacklogTaskModal({ isOpen, onClose, onCreateTask }: CreateBacklogTaskModalProps) {
  const [step, setStep] = useState(1);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskSize, setTaskSize] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (step === 2 && taskType) {
      loadChecklistForType(taskType);
    }
  }, [step, taskType]);

  const loadSettings = () => {
    // Load task types
    const typesData = localStorage.getItem('taskTypes');
    if (typesData) {
      const parsedTypes = JSON.parse(typesData);
      setTypes(parsedTypes);
      if (parsedTypes.length > 0) {
        setTaskType(parsedTypes[0]);
      }
    } else {
      const defaultTypes = ['Feature', 'Bug Fix', 'Enhancement', 'Documentation'];
      setTypes(defaultTypes);
      setTaskType(defaultTypes[0]);
    }

    // Load priorities
    const prioritiesData = localStorage.getItem('taskPriorities');
    if (prioritiesData) {
      setPriorities(JSON.parse(prioritiesData));
    } else {
      setPriorities(['Low', 'Medium', 'High']);
    }
  };

  const loadChecklistForType = (type: string) => {
    try {
      const settingsData = localStorage.getItem('appSettings');
      if (settingsData) {
        const settings = JSON.parse(settingsData);
        const templates = settings.checklistTemplates || {};
        const template = templates[type] || [];

        setChecklist(template.map((text: string, index: number) => ({
          id: `checklist-${type}-${index}-${Date.now()}`,
          text,
          checked: false
        })));
      } else {
        setChecklist([]);
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
      setChecklist([]);
    }
  };

  const handleChecklistToggle = (index: number) => {
    setChecklist(prev => prev.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    ));
  };

  const handleClose = () => {
    setStep(1);
    setTaskTitle('');
    setTaskDesc('');
    setTaskType(types[0] || '');
    setTaskPriority('Medium');
    setTaskSize('');
    setChecklist([]);
    onClose();
  };

  const goToStep2 = () => {
    if (!taskTitle.trim()) {
      alert('กรุณาใส่ชื่อ Task');
      return;
    }
    setStep(2);
  };

  const goToStep1 = () => {
    setStep(1);
  };

  const handleCreate = () => {
    if (!taskTitle.trim()) {
      alert('กรุณาใส่ชื่อ Task');
      return;
    }

    const allChecked = checklist.length === 0 || checklist.every(item => item.checked);
    const status = allChecked ? 'Ready to Implement' : 'Need More Details';

    const newTask = {
      id: Date.now(),
      title: taskTitle,
      text: taskTitle,
      description: taskDesc,
      type: taskType,
      priority: taskPriority,
      size: taskSize,
      status: status,
      column: status,
      readinessChecklist: checklist,
      createdAt: new Date().toISOString()
    };

    onCreateTask(newTask);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700 }}>
          ➕ สร้าง Task ใหม่
        </h2>

        {/* Progress Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '32px',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: step === 1 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#10b981',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '18px'
            }}>
              {step === 1 ? '1' : '✓'}
            </div>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: step === 1 ? '#667eea' : '#10b981'
            }}>
              ข้อมูลพื้นฐาน
            </span>
          </div>

          <div style={{
            flex: 1,
            height: '3px',
            background: step === 2 ? '#10b981' : '#e5e7eb',
            borderRadius: '2px'
          }} />

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: step === 2 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
              color: step === 2 ? 'white' : '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '18px'
            }}>
              2
            </div>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: step === 2 ? '#667eea' : '#9ca3af'
            }}>
              Readiness Checklist
            </span>
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: '#374151'
              }}>
                ชื่อ Task *
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="ชื่อ Task"
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
                รายละเอียด
              </label>
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="รายละเอียด (optional)"
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600,
                  color: '#374151'
                }}>
                  ชนิด *
                </label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  {types.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600,
                  color: '#374151'
                }}>
                  Priority *
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: '#374151'
              }}>
                Backlog Size
              </label>
              <select
                value={taskSize}
                onChange={(e) => setTaskSize(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="">-</option>
                <option value="S">S - Small</option>
                <option value="M">M - Medium</option>
                <option value="L">L - Large</option>
                <option value="XL">XL - Extra Large</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '10px 24px',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.3s'
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={goToStep2}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.3s'
                }}
              >
                ถัดไป →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Readiness Checklist */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700 }}>
                📋 Readiness Checklist
              </h4>
              {checklist.length > 0 ? (
                <>
                  <p style={{
                    margin: '0 0 16px 0',
                    padding: '12px',
                    background: '#fef3c7',
                    borderRadius: '8px',
                    color: '#92400e',
                    fontSize: '13px',
                    fontWeight: 500
                  }}>
                    ⚠️ ต้องเช็คครบทุกข้อ ถึงจะไปอยู่ "Ready to Implement" ได้
                  </p>
                  {checklist.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleChecklistToggle(index)}
                        id={`checklist-${index}`}
                        style={{
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer'
                        }}
                      />
                      <label
                        htmlFor={`checklist-${index}`}
                        style={{
                          flex: 1,
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: item.checked ? '#9ca3af' : '#4b5563',
                          textDecoration: item.checked ? 'line-through' : 'none'
                        }}
                      >
                        {item.text}
                      </label>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  border: '2px dashed #16a34a'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                  <div style={{ color: '#166534', fontWeight: 600, marginBottom: '4px' }}>
                    ชนิด Task นี้ไม่มี Checklist
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803d' }}>
                    Task จะถูกสร้างที่ Ready to Implement ทันที
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={goToStep1}
                style={{
                  padding: '10px 24px',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.3s'
                }}
              >
                ← ย้อนกลับ
              </button>
              <button
                onClick={handleCreate}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.3s'
                }}
              >
                สร้าง Task
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
