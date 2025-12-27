import { useState, useEffect } from 'react';
import { getAllSettings, updateSetting } from '../services/api';
import Modal from './Modal';

interface Settings {
  statuses: string[];
  priorities: string[];
  tags: string[];
  taskTypes?: string[];
  checklistTemplates?: { [key: string]: string[] };
}

interface TaskSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: () => void;
}

export default function TaskSettingsPanel({ isOpen, onClose, onSettingsChange }: TaskSettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>({
    statuses: ['to-do', 'in-progress', 'done'],
    priorities: ['Low', 'Medium', 'High'],
    tags: ['Bug', 'Feature', 'Enhancement'],
    taskTypes: ['Feature', 'Bug Fix', 'Enhancement', 'Documentation'],
    checklistTemplates: {}
  });

  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newTaskType, setNewTaskType] = useState('');
  const [newChecklistItems, setNewChecklistItems] = useState<{ [key: string]: string }>({});

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', type: 'info' as 'info' | 'warning' | 'error' | 'success' });

  const showModal = (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    setModalContent({ title, message, type });
    setModalOpen(true);
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const allSettings = await getAllSettings();

      let loadedSettings = { ...settings };

      // Parse each setting from database
      allSettings.forEach(setting => {
        try {
          const parsedValue = JSON.parse(setting.value);

          switch (setting.key) {
            case 'taskTypes':
              loadedSettings.taskTypes = parsedValue;
              break;
            case 'priorities':
              loadedSettings.priorities = parsedValue;
              break;
            case 'statuses':
              loadedSettings.statuses = parsedValue;
              break;
            case 'tags':
              loadedSettings.tags = parsedValue;
              break;
            case 'checklistTemplates':
              loadedSettings.checklistTemplates = parsedValue;
              break;
          }
        } catch (e) {
          console.error(`Failed to parse setting ${setting.key}:`, e);
        }
      });

      setSettings(loadedSettings);

      // Also save to localStorage for backward compatibility with other components
      localStorage.setItem('taskTypes', JSON.stringify(loadedSettings.taskTypes));
      localStorage.setItem('taskPriorities', JSON.stringify(loadedSettings.priorities));
      localStorage.setItem('checklistTemplates', JSON.stringify(loadedSettings.checklistTemplates));

    } catch (error) {
      console.error('Failed to load settings from API:', error);
      // Fallback to localStorage if API fails
      const saved = localStorage.getItem('appSettings');
      if (saved) {
        const parsedSettings = { ...settings, ...JSON.parse(saved) };
        setSettings(parsedSettings);
      }
    }
  };

  const saveAllSettings = async (updated: Settings) => {
    // Save to local state and localStorage immediately (even if API fails)
    setSettings(updated);
    localStorage.setItem('taskTypes', JSON.stringify(updated.taskTypes));
    localStorage.setItem('taskPriorities', JSON.stringify(updated.priorities));
    localStorage.setItem('checklistTemplates', JSON.stringify(updated.checklistTemplates));

    try {
      // Save each setting to API
      await Promise.all([
        updateSetting('taskTypes', { value: JSON.stringify(updated.taskTypes), description: 'Available task types for categorization' }),
        updateSetting('priorities', { value: JSON.stringify(updated.priorities), description: 'Task priority levels' }),
        updateSetting('statuses', { value: JSON.stringify(updated.statuses), description: 'Task status options for Kanban board' }),
        updateSetting('tags', { value: JSON.stringify(updated.tags), description: 'Available task tags' }),
        updateSetting('checklistTemplates', { value: JSON.stringify(updated.checklistTemplates), description: 'Readiness checklist templates for each task type' })
      ]);

      // Notify parent component that settings changed
      if (onSettingsChange) {
        onSettingsChange();
      }

      // Dispatch storage event for cross-tab synchronization
      window.dispatchEvent(new Event('storage'));

    } catch (error) {
      console.error('Failed to save settings to API:', error);
      showModal('API Save Warning', 'Settings applied locally but failed to sync with server.', 'warning');
    }
  };

  const saveSettings = (updated: Settings) => {
    saveAllSettings(updated);
  };

  const addStatus = () => {
    if (newStatus.trim()) {
      saveSettings({ ...settings, statuses: [...settings.statuses, newStatus.trim()] });
      setNewStatus('');
    }
  };

  const removeStatus = (status: string) => {
    saveSettings({ ...settings, statuses: settings.statuses.filter(s => s !== status) });
  };

  const addPriority = () => {
    if (newPriority.trim()) {
      saveSettings({ ...settings, priorities: [...settings.priorities, newPriority.trim()] });
      setNewPriority('');
    }
  };

  const removePriority = (priority: string) => {
    saveSettings({ ...settings, priorities: settings.priorities.filter(p => p !== priority) });
  };

  const addTag = () => {
    if (newTag.trim()) {
      saveSettings({ ...settings, tags: [...settings.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    saveSettings({ ...settings, tags: settings.tags.filter(t => t !== tag) });
  };

  const addTaskType = () => {
    if (newTaskType.trim()) {
      const taskTypes = settings.taskTypes || [];
      if (taskTypes.includes(newTaskType.trim())) {
        showModal('Duplicate Task Type', 'ชนิด Task นี้มีอยู่แล้ว', 'warning');
        return;
      }
      const checklistTemplates = settings.checklistTemplates || {};
      checklistTemplates[newTaskType.trim()] = [];
      saveSettings({
        ...settings,
        taskTypes: [...taskTypes, newTaskType.trim()],
        checklistTemplates
      });
      setNewTaskType('');
    }
  };

  const removeTaskType = (type: string) => {
    const taskTypes = settings.taskTypes || [];
    const checklistTemplates = { ...(settings.checklistTemplates || {}) };
    delete checklistTemplates[type];
    saveSettings({
      ...settings,
      taskTypes: taskTypes.filter(t => t !== type),
      checklistTemplates
    });
  };

  const addChecklistItem = (type: string) => {
    const newItem = newChecklistItems[type];
    if (!newItem || !newItem.trim()) {
      showModal('Empty Item', 'กรุณาใส่รายการ Checklist', 'warning');
      return;
    }

    const checklistTemplates = { ...(settings.checklistTemplates || {}) };
    const currentItems = checklistTemplates[type] || [];

    if (currentItems.includes(newItem.trim())) {
      showModal('Duplicate Item', 'รายการนี้มีอยู่แล้ว', 'warning');
      return;
    }

    checklistTemplates[type] = [...currentItems, newItem.trim()];

    saveSettings({
      ...settings,
      checklistTemplates
    });

    setNewChecklistItems({ ...newChecklistItems, [type]: '' });
  };

  const removeChecklistItem = (type: string, index: number) => {
    const checklistTemplates = { ...(settings.checklistTemplates || {}) };
    const currentItems = [...(checklistTemplates[type] || [])];
    currentItems.splice(index, 1);
    checklistTemplates[type] = currentItems;

    saveSettings({
      ...settings,
      checklistTemplates
    });
  };

  return (
    <>
      <div className={`task-settings-panel ${isOpen ? 'open' : ''}`}>
        <div className="task-settings-panel-header">
          <h2>⚙️ Task Settings</h2>
          <button onClick={onClose} aria-label="Close settings panel">×</button>
        </div>

        <div className="task-settings-panel-content">
          {/* Statuses Section */}
          <div className="settings-section">
            <h2>📋 Task Statuses</h2>
            <p>Manage available task statuses for your Kanban board</p>

            <div className="items-list">
              {settings.statuses.map(status => (
                <div key={status} className="item-tag">
                  <span>{status}</span>
                  {settings.statuses.length > 1 && (
                    <button className="remove-btn" onClick={() => removeStatus(status)}>×</button>
                  )}
                </div>
              ))}
            </div>

            <div className="add-item-form">
              <input
                type="text"
                placeholder="New status name"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addStatus()}
              />
              <button onClick={addStatus}>Add Status</button>
            </div>
          </div>

          {/* Priorities Section */}
          <div className="settings-section">
            <h2>🔥 Task Priorities</h2>
            <p>Define priority levels for tasks</p>

            <div className="items-list">
              {settings.priorities.map(priority => (
                <div key={priority} className="item-tag">
                  <span>{priority}</span>
                  {settings.priorities.length > 1 && (
                    <button className="remove-btn" onClick={() => removePriority(priority)}>×</button>
                  )}
                </div>
              ))}
            </div>

            <div className="add-item-form">
              <input
                type="text"
                placeholder="New priority level"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPriority()}
              />
              <button onClick={addPriority}>Add Priority</button>
            </div>
          </div>

          {/* Task Types Section */}
          <div className="settings-section">
            <h2>📋 Task Types</h2>
            <p>Define different types of tasks (required for backlog checklist)</p>

            <div className="items-list">
              {(settings.taskTypes || []).map(type => (
                <div key={type} className="item-tag">
                  <span>{type}</span>
                  {(settings.taskTypes?.length || 0) > 1 && (
                    <button className="remove-btn" onClick={() => removeTaskType(type)}>×</button>
                  )}
                </div>
              ))}
            </div>

            <div className="add-item-form">
              <input
                type="text"
                placeholder="New task type name"
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTaskType()}
              />
              <button onClick={addTaskType}>Add Task Type</button>
            </div>
          </div>

          {/* Readiness Checklist Templates Section */}
          <div className="settings-section">
            <h2>📋 Readiness Checklist Templates</h2>
            <p style={{ marginBottom: '20px' }}>กำหนด Checklist สำหรับแต่ละชนิดของ Task (ใช้ใน Backlog)</p>

            {(settings.taskTypes || []).map(type => {
              const items = (settings.checklistTemplates || {})[type] || [];
              return (
                <div key={type} style={{
                  marginBottom: '24px',
                  padding: '20px',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb'
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📌 {type}
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#6b7280',
                      marginLeft: 'auto'
                    }}>
                      {items.length} items
                    </span>
                  </h4>

                  {items.length === 0 ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontStyle: 'italic',
                      fontSize: '14px'
                    }}>
                      ยังไม่มี Checklist (Task จะไป Ready to Implement ทันที)
                    </div>
                  ) : (
                    <div style={{ marginBottom: '12px' }}>
                      {items.map((item, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          background: 'white',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <span style={{ fontSize: '14px', color: '#16a34a' }}>✓</span>
                          <span style={{ flex: 1, fontSize: '14px', color: '#374151' }}>{item}</span>
                          <button
                            className="remove-btn"
                            onClick={() => removeChecklistItem(type, index)}
                            style={{
                              padding: '4px 8px',
                              background: '#fee2e2',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: '#991b1b',
                              fontSize: '16px',
                              fontWeight: 700
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="add-item-form">
                    <input
                      type="text"
                      placeholder="เพิ่มรายการ Checklist ใหม่..."
                      value={newChecklistItems[type] || ''}
                      onChange={(e) => setNewChecklistItems({ ...newChecklistItems, [type]: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && addChecklistItem(type)}
                    />
                    <button onClick={() => addChecklistItem(type)}>+ เพิ่ม</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tags Section */}
          <div className="settings-section">
            <h2>🏷️ Task Tags</h2>
            <p>Create custom tags to categorize tasks</p>

            <div className="items-list">
              {settings.tags.map(tag => (
                <div key={tag} className="item-tag">
                  <span>{tag}</span>
                  <button className="remove-btn" onClick={() => removeTag(tag)}>×</button>
                </div>
              ))}
            </div>

            <div className="add-item-form">
              <input
                type="text"
                placeholder="New tag name"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <button onClick={addTag}>Add Tag</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for notifications */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalContent.title}
          type={modalContent.type}
        >
          {modalContent.message}
        </Modal>
      )}
    </>
  );
}
