import { useState, useEffect } from 'react';

interface TrainingRecord {
  timestamp: string;
  url: string;
  pageTitle: string;
  fields: {
    inputs: any[];
    selects: any[];
    textareas: any[];
  };
  totalFields: number;
}

export default function Training() {
  const [trainingData, setTrainingData] = useState<TrainingRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = () => {
    // Try to load from Chrome extension storage or localStorage
    const storedData = localStorage.getItem('chromeExtensionTrainingData');
    if (storedData) {
      setTrainingData(JSON.parse(storedData));
    }
  };

  const filteredData = trainingData.filter(record => {
    const matchesSearch = searchTerm === '' ||
      record.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.pageTitle.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' ||
      (typeFilter === 'input' && record.fields.inputs.length > 0) ||
      (typeFilter === 'select' && record.fields.selects.length > 0) ||
      (typeFilter === 'textarea' && record.fields.textareas.length > 0);

    return matchesSearch && matchesType;
  });

  const exportJson = () => {
    const dataStr = JSON.stringify(trainingData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-training-data-${Date.now()}.json`;
    a.click();
  };

  const exportCsv = () => {
    const rows: string[][] = [];
    rows.push(['Timestamp', 'URL', 'Page Title', 'Field Type', 'Field ID', 'Field Name', 'Label', 'Value']);

    trainingData.forEach(record => {
      record.fields.inputs.forEach(field => {
        rows.push([
          record.timestamp,
          record.url,
          record.pageTitle,
          'input',
          field.id || '',
          field.name || '',
          field.label || '',
          field.value || ''
        ]);
      });

      record.fields.selects.forEach(field => {
        rows.push([
          record.timestamp,
          record.url,
          record.pageTitle,
          'select',
          field.id || '',
          field.name || '',
          field.label || '',
          field.selectedText || ''
        ]);
      });

      record.fields.textareas.forEach(field => {
        rows.push([
          record.timestamp,
          record.url,
          record.pageTitle,
          'textarea',
          field.id || '',
          field.name || '',
          field.label || '',
          field.value || ''
        ]);
      });
    });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-training-data-${Date.now()}.csv`;
    a.click();
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to delete ALL training data? This cannot be undone.')) {
      localStorage.removeItem('chromeExtensionTrainingData');
      setTrainingData([]);
    }
  };

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '10px' }}>
          🎓 AI Training Data
        </h1>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Captured form fields from websites for AI model training
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '25px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Records</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>{trainingData.length}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '25px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Fields</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>
            {trainingData.reduce((sum, r) => sum + r.totalFields, 0)}
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '25px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Unique URLs</div>
          <div style={{ fontSize: '36px', fontWeight: 700 }}>
            {new Set(trainingData.map(r => r.url)).size}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Search by URL or page title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: '250px', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
          >
            <option value="all">All Field Types</option>
            <option value="input">Inputs Only</option>
            <option value="select">Selects Only</option>
            <option value="textarea">Textareas Only</option>
          </select>
          <button onClick={exportJson} className="btn-secondary" style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 600 }}>
            💾 Export JSON
          </button>
          <button onClick={exportCsv} className="btn-secondary" style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 600 }}>
            📄 Export CSV
          </button>
          <button onClick={clearAllData} className="btn-danger" style={{ padding: '12px 20px', borderRadius: '8px', fontWeight: 600 }}>
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        {filteredData.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📭</div>
            <h3 style={{ fontSize: '24px', marginBottom: '10px', color: '#374151' }}>No Training Data Yet</h3>
            <p style={{ fontSize: '16px', marginBottom: '5px' }}>
              Install the Chrome Extension to start capturing form fields automatically.
            </p>
            <p style={{ fontSize: '14px' }}>
              Or manually add data to localStorage with key: <code>chromeExtensionTrainingData</code>
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <tr>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600 }}>#</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600 }}>Page Title</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600 }}>URL</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600 }}>Fields</th>
                <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((record, index) => {
                const isExpanded = expandedRows.has(index);
                return (
                  <>
                    <tr
                      key={index}
                      style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer', transition: 'background 0.2s' }}
                      onClick={() => toggleRow(index)}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '15px' }}>
                        <span style={{ marginRight: '8px', fontSize: '12px', color: '#6b7280' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        {index + 1}
                      </td>
                      <td style={{ padding: '15px', fontSize: '14px' }}>
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '15px', fontSize: '14px', fontWeight: 600 }}>{record.pageTitle}</td>
                      <td style={{ padding: '15px', fontSize: '13px', color: '#667eea', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.url}>
                        {record.url}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ background: '#e0e7ff', color: '#4c1d95', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                          {record.totalFields} fields
                        </span>
                        <br />
                        <small style={{ color: '#6b7280', fontSize: '12px' }}>
                          {record.fields.inputs.length} inputs, {record.fields.selects.length} selects, {record.fields.textareas.length} textareas
                        </small>
                      </td>
                      <td style={{ padding: '15px', fontSize: '20px' }}>
                        {isExpanded ? '🔽' : '▶️'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${index}-expanded`}>
                        <td colSpan={6} style={{ padding: '0', background: '#f9fafb' }}>
                          <div style={{ padding: '20px', borderTop: '2px solid #e0e7ff' }}>
                            {/* Record Info */}
                            <div style={{ marginBottom: '20px', padding: '15px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #667eea' }}>
                              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                <strong style={{ color: '#1f2937' }}>URL:</strong> {record.url}<br />
                                <strong style={{ color: '#1f2937' }}>Page Title:</strong> {record.pageTitle}<br />
                                <strong style={{ color: '#1f2937' }}>Captured:</strong> {new Date(record.timestamp).toLocaleString()}
                              </div>
                            </div>

                            {/* Input Fields */}
                            {record.fields.inputs.length > 0 && (
                              <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#667eea', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  📝 Input Fields ({record.fields.inputs.length})
                                </h4>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                  {record.fields.inputs.map((field, i) => (
                                    <div key={i} style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '13px' }}>
                                        <div>
                                          <strong style={{ color: '#6b7280' }}>Type:</strong> <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{field.inputType}</span>
                                        </div>
                                        <div><strong style={{ color: '#6b7280' }}>ID:</strong> {field.id || '-'}</div>
                                        <div><strong style={{ color: '#6b7280' }}>Name:</strong> {field.name || '-'}</div>
                                        <div><strong style={{ color: '#6b7280' }}>Label:</strong> {field.label || '-'}</div>
                                      </div>
                                      {field.placeholder && (
                                        <div style={{ marginTop: '8px', fontSize: '13px' }}>
                                          <strong style={{ color: '#6b7280' }}>Placeholder:</strong> <em style={{ color: '#9ca3af' }}>{field.placeholder}</em>
                                        </div>
                                      )}
                                      {field.value && (
                                        <div style={{ marginTop: '8px', fontSize: '13px' }}>
                                          <strong style={{ color: '#6b7280' }}>Value:</strong> <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{field.value}</code>
                                        </div>
                                      )}
                                      {field.required && (
                                        <span style={{ marginTop: '8px', display: 'inline-block', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                          * Required
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Select Fields */}
                            {record.fields.selects.length > 0 && (
                              <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  📋 Select/Dropdown Fields ({record.fields.selects.length})
                                </h4>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                  {record.fields.selects.map((field, i) => (
                                    <div key={i} style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '13px', marginBottom: '10px' }}>
                                        <div><strong style={{ color: '#6b7280' }}>ID:</strong> {field.id || '-'}</div>
                                        <div><strong style={{ color: '#6b7280' }}>Name:</strong> {field.name || '-'}</div>
                                        <div><strong style={{ color: '#6b7280' }}>Label:</strong> {field.label || '-'}</div>
                                        <div>
                                          <strong style={{ color: '#6b7280' }}>Selected:</strong>{' '}
                                          <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                            {field.selectedText || field.selectedValue || '-'}
                                          </span>
                                        </div>
                                      </div>
                                      {field.options && field.options.length > 0 && (
                                        <div style={{ marginTop: '10px' }}>
                                          <strong style={{ color: '#6b7280', fontSize: '13px' }}>Options ({field.options.length}):</strong>
                                          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {field.options.slice(0, 10).map((opt: any, oi: number) => (
                                              <span
                                                key={oi}
                                                style={{
                                                  background: opt.selected ? '#dbeafe' : '#f3f4f6',
                                                  color: opt.selected ? '#1e40af' : '#6b7280',
                                                  padding: '4px 10px',
                                                  borderRadius: '6px',
                                                  fontSize: '12px',
                                                  border: opt.selected ? '2px solid #3b82f6' : '1px solid #e5e7eb'
                                                }}
                                              >
                                                {opt.text || opt.value}
                                              </span>
                                            ))}
                                            {field.options.length > 10 && (
                                              <span style={{ padding: '4px 10px', fontSize: '12px', color: '#9ca3af' }}>
                                                +{field.options.length - 10} more
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Textarea Fields */}
                            {record.fields.textareas.length > 0 && (
                              <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  📄 Textarea Fields ({record.fields.textareas.length})
                                </h4>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                  {record.fields.textareas.map((field, i) => (
                                    <div key={i} style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '13px' }}>
                                        <div><strong style={{ color: '#6b7280' }}>ID:</strong> {field.id || '-'}</div>
                                        <div><strong style={{ color: '#6b7280' }}>Name:</strong> {field.name || '-'}</div>
                                        <div><strong style={{ color: '#6b7280' }}>Label:</strong> {field.label || '-'}</div>
                                      </div>
                                      {field.placeholder && (
                                        <div style={{ marginTop: '8px', fontSize: '13px' }}>
                                          <strong style={{ color: '#6b7280' }}>Placeholder:</strong> <em style={{ color: '#9ca3af' }}>{field.placeholder}</em>
                                        </div>
                                      )}
                                      {field.value && (
                                        <div style={{ marginTop: '8px', fontSize: '13px' }}>
                                          <strong style={{ color: '#6b7280' }}>Value:</strong>
                                          <div style={{ background: '#f3f4f6', padding: '8px', borderRadius: '6px', marginTop: '4px', fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                            {field.value}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
