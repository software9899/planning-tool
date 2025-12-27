import { useState, useEffect } from 'react';
import { DataManager } from '../services/api';

interface BacklogSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BacklogSettingsPanel({ isOpen, onClose }: BacklogSettingsPanelProps) {
  const [settings, setSettings] = useState<any>({
    taskTypes: [],
    checklistTemplates: {}
  });
  const [newChecklistItems, setNewChecklistItems] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      // Try to load from API first
      const apiSettings = await DataManager.getSettings();
      if (apiSettings) {
        setSettings({
          taskTypes: apiSettings.taskTypes || [],
          checklistTemplates: apiSettings.checklistTemplates || {}
        });
        return;
      }
    } catch (error) {
      console.log('API not available, loading from localStorage');
    }

    // Fallback to localStorage
    const storedSettings = localStorage.getItem('appSettings');
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      setSettings({
        taskTypes: parsed.taskTypes || [],
        checklistTemplates: parsed.checklistTemplates || {}
      });
    }
  };

  const saveSettings = async () => {
    try {
      // Save to API
      await DataManager.saveSettings(settings);
    } catch (error) {
      console.log('API not available, saving to localStorage only');
    }

    // Always save to localStorage as backup
    const currentSettings = localStorage.getItem('appSettings');
    const parsed = currentSettings ? JSON.parse(currentSettings) : {};
    const updated = {
      ...parsed,
      taskTypes: settings.taskTypes,
      checklistTemplates: settings.checklistTemplates
    };
    localStorage.setItem('appSettings', JSON.stringify(updated));
  };

  const addChecklistItem = (taskType: string) => {
    const newItem = newChecklistItems[taskType]?.trim();
    if (!newItem) return;

    const currentItems = settings.checklistTemplates[taskType] || [];
    const updatedSettings = {
      ...settings,
      checklistTemplates: {
        ...settings.checklistTemplates,
        [taskType]: [...currentItems, newItem]
      }
    };

    setSettings(updatedSettings);
    setNewChecklistItems({ ...newChecklistItems, [taskType]: '' });

    // Save immediately
    setTimeout(() => {
      saveSettings();
    }, 100);
  };

  const removeChecklistItem = (taskType: string, index: number) => {
    const currentItems = settings.checklistTemplates[taskType] || [];
    const updatedItems = currentItems.filter((_: any, i: number) => i !== index);

    const updatedSettings = {
      ...settings,
      checklistTemplates: {
        ...settings.checklistTemplates,
        [taskType]: updatedItems
      }
    };

    setSettings(updatedSettings);

    // Save immediately
    setTimeout(() => {
      saveSettings();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className={`task-settings-panel ${isOpen ? 'open' : ''}`}>
      <div className="task-settings-panel-header">
        <h2>⚙️ Backlog Settings</h2>
        <button onClick={onClose}>×</button>
      </div>

      <div className="task-settings-panel-content">
        {/* Readiness Checklist Templates Section */}
        <div className="settings-section">
          <h2>📋 Readiness Checklist Templates</h2>
          <p style={{ marginBottom: '20px', color: '#6b7280', fontSize: '14px' }}>
            กำหนด Checklist สำหรับแต่ละชนิดของ Task (ใช้ใน Backlog)
          </p>

          {(settings.taskTypes || []).length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: '#f9fafb',
              borderRadius: '12px',
              border: '2px dashed #d1d5db'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                ยังไม่มี Task Types
              </div>
              <div style={{ color: '#9ca3af', fontSize: '13px' }}>
                กรุณาไปที่ Tasks Board → Settings เพื่อเพิ่ม Task Types ก่อน
              </div>
            </div>
          ) : (
            (settings.taskTypes || []).map((type: string) => {
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
                      {items.map((item: string, index: number) => (
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
            })
          )}
        </div>
      </div>
    </div>
  );
}
