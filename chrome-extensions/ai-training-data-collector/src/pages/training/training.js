/**
 * Training Data Page Script
 */

let allData = [];
let recordingSessions = [];
let expandedRows = new Set();

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  await loadRecordingSessions();
  setupEventListeners();
});

/**
 * Load training data from storage
 */
async function loadData() {
  const result = await chrome.storage.local.get(['trainingData']);
  allData = result.trainingData || [];
  renderTable(allData);
  updateSidebarStats();
}

/**
 * Load recording sessions from storage
 */
async function loadRecordingSessions() {
  const result = await chrome.storage.local.get(['recordingSessions']);
  recordingSessions = result.recordingSessions || [];
  renderRecordingSessions();
  updateSidebarStats();
}

/**
 * Render recording sessions
 */
function renderRecordingSessions() {
  const container = document.getElementById('sessionsContainer');
  const emptyState = document.getElementById('emptyStateSessions');

  if (recordingSessions.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  container.innerHTML = recordingSessions.map((session, sessionIndex) => `
    <div class="session-card" style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); margin-bottom: 20px; overflow: hidden;">
      <div class="session-header" style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <h3 style="margin: 0 0 10px 0; font-size: 18px;">${session.sessionName}</h3>
        <div style="font-size: 13px; opacity: 0.9;">
          ${new Date(session.startTime).toLocaleString()} - ${new Date(session.endTime).toLocaleString()}<br>
          ${session.pages.length} pages captured
        </div>
      </div>

      <!-- Page Tabs -->
      <div class="session-tabs" style="display: flex; gap: 5px; padding: 15px 20px; background: #f3f4f6; border-bottom: 2px solid #e5e7eb; overflow-x: auto;">
        ${session.pages.map((page, pageIndex) => `
          <button
            class="page-tab ${pageIndex === 0 ? 'active' : ''}"
            data-session="${sessionIndex}"
            data-page="${pageIndex}"
            style="padding: 10px 20px; border: none; background: ${pageIndex === 0 ? 'white' : '#e5e7eb'}; color: ${pageIndex === 0 ? '#667eea' : '#6b7280'}; border-radius: 8px 8px 0 0; cursor: pointer; font-size: 13px; font-weight: 600; white-space: nowrap; transition: all 0.3s;"
          >
            📄 Page ${pageIndex + 1}
          </button>
        `).join('')}
      </div>

      <!-- Page Content -->
      <div class="session-pages">
        ${session.pages.map((page, pageIndex) => `
          <div class="page-content" data-session="${sessionIndex}" data-page="${pageIndex}" style="display: ${pageIndex === 0 ? 'block' : 'none'}; padding: 20px;">
            ${renderPageContent(page)}
          </div>
        `).join('')}
      </div>

      <div style="padding: 15px 20px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
        <button class="btn btn-danger btn-small" onclick="deleteSession(${sessionIndex})">🗑️ Delete Session</button>
      </div>
    </div>
  `).join('');

  // Add tab click listeners
  document.querySelectorAll('.page-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const sessionId = e.target.dataset.session;
      const pageId = e.target.dataset.page;

      // Update active tab
      document.querySelectorAll(`.page-tab[data-session="${sessionId}"]`).forEach(t => {
        t.style.background = '#e5e7eb';
        t.style.color = '#6b7280';
      });
      e.target.style.background = 'white';
      e.target.style.color = '#667eea';

      // Show corresponding page content
      document.querySelectorAll(`.page-content[data-session="${sessionId}"]`).forEach(p => {
        p.style.display = 'none';
      });
      document.querySelector(`.page-content[data-session="${sessionId}"][data-page="${pageId}"]`).style.display = 'block';
    });
  });
}

/**
 * Render content for a single page
 */
function renderPageContent(page) {
  let html = `
    <div style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #667eea;">
      <div style="font-size: 13px; color: #6b7280;">
        <strong style="color: #1f2937;">URL:</strong> ${page.url}<br>
        <strong style="color: #1f2937;">Page Title:</strong> ${page.pageTitle}<br>
        <strong style="color: #1f2937;">Captured:</strong> ${new Date(page.timestamp).toLocaleString()}<br>
        <strong style="color: #1f2937;">Total Fields:</strong> ${page.totalFields}
      </div>
    </div>
  `;

  // Render fields
  html += renderExpandedContent(page);

  return html;
}

/**
 * Delete a recording session
 */
window.deleteSession = async function(index) {
  if (!confirm('Delete this recording session?')) return;

  recordingSessions.splice(index, 1);
  await chrome.storage.local.set({ recordingSessions: recordingSessions });
  await loadRecordingSessions();
};

/**
 * Render data table
 */
function renderTable(data) {
  const tbody = document.getElementById('tableBody');
  const emptyState = document.getElementById('emptyState');

  if (data.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  tbody.innerHTML = '';

  data.forEach((record, index) => {
    const isExpanded = expandedRows.has(index);

    // Main row
    const mainRow = document.createElement('tr');
    mainRow.style.cursor = 'pointer';
    mainRow.innerHTML = `
      <td>
        <span style="margin-right: 8px; font-size: 12px; color: #6b7280;">
          ${isExpanded ? '▼' : '▶'}
        </span>
        ${index + 1}
      </td>
      <td>${new Date(record.timestamp).toLocaleString()}</td>
      <td>${record.pageTitle}</td>
      <td class="url-cell" title="${record.url}">${record.url}</td>
      <td>
        <span class="field-badge">${record.totalFields} fields</span>
        <br><small style="color: #6b7280;">
          ${record.fields.inputs.length} inputs,
          ${record.fields.selects.length} selects,
          ${record.fields.textareas.length} textareas
        </small>
      </td>
      <td style="font-size: 20px;">
        ${isExpanded ? '🔽' : '▶️'}
      </td>
    `;

    mainRow.addEventListener('click', () => toggleRow(index));
    mainRow.addEventListener('mouseenter', () => mainRow.style.background = '#f9fafb');
    mainRow.addEventListener('mouseleave', () => mainRow.style.background = 'white');
    tbody.appendChild(mainRow);

    // Expanded row
    if (isExpanded) {
      const expandedRow = document.createElement('tr');
      expandedRow.innerHTML = `
        <td colspan="6" style="padding: 0; background: #f9fafb;">
          ${renderExpandedContent(record)}
        </td>
      `;
      tbody.appendChild(expandedRow);
    }
  });
}

/**
 * Toggle row expansion
 */
function toggleRow(index) {
  if (expandedRows.has(index)) {
    expandedRows.delete(index);
  } else {
    expandedRows.add(index);
  }
  renderTable(allData.filter(record => {
    const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;

    const matchesSearch = searchTerm === '' ||
      record.url.toLowerCase().includes(searchTerm) ||
      record.pageTitle.toLowerCase().includes(searchTerm);

    const matchesType = typeFilter === 'all' ||
      (typeFilter === 'input' && record.fields.inputs.length > 0) ||
      (typeFilter === 'select' && record.fields.selects.length > 0) ||
      (typeFilter === 'textarea' && record.fields.textareas.length > 0);

    return matchesSearch && matchesType;
  }));
}

/**
 * Render expanded content for a record
 */
function renderExpandedContent(record) {
  let html = '<div style="padding: 20px; border-top: 2px solid #e0e7ff;">';

  // Record info
  html += `
    <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #667eea;">
      <div style="font-size: 13px; color: #6b7280;">
        <strong style="color: #1f2937;">URL:</strong> ${record.url}<br>
        <strong style="color: #1f2937;">Page Title:</strong> ${record.pageTitle}<br>
        <strong style="color: #1f2937;">Captured:</strong> ${new Date(record.timestamp).toLocaleString()}
      </div>
    </div>
  `;

  // Input fields
  if (record.fields.inputs.length > 0) {
    html += `
      <div style="margin-bottom: 20px;">
        <h4 style="font-size: 16px; font-weight: 700; color: #667eea; margin-bottom: 12px;">
          📝 Input Fields (${record.fields.inputs.length})
        </h4>
        <div style="display: grid; gap: 10px;">
    `;

    record.fields.inputs.forEach((field, i) => {
      html += `
        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 13px;">
            <div><strong style="color: #6b7280;">Type:</strong> <span style="background: #dbeafe; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${field.inputType}</span></div>
            <div><strong style="color: #6b7280;">ID:</strong> ${field.id || '-'}</div>
            <div><strong style="color: #6b7280;">Name:</strong> ${field.name || '-'}</div>
            <div><strong style="color: #6b7280;">Label:</strong> ${field.label || '-'}</div>
          </div>
          ${field.placeholder ? `<div style="margin-top: 8px; font-size: 13px;"><strong style="color: #6b7280;">Placeholder:</strong> <em style="color: #9ca3af;">${field.placeholder}</em></div>` : ''}
          ${field.value ? `<div style="margin-top: 8px; font-size: 13px;"><strong style="color: #6b7280;">Value:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${field.value}</code></div>` : ''}
          ${field.required ? '<span style="margin-top: 8px; display: inline-block; background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">* Required</span>' : ''}
        </div>
      `;
    });

    html += '</div></div>';
  }

  // Select fields
  if (record.fields.selects.length > 0) {
    html += `
      <div style="margin-bottom: 20px;">
        <h4 style="font-size: 16px; font-weight: 700; color: #10b981; margin-bottom: 12px;">
          📋 Select/Dropdown Fields (${record.fields.selects.length})
        </h4>
        <div style="display: grid; gap: 10px;">
    `;

    record.fields.selects.forEach((field, i) => {
      html += `
        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 13px; margin-bottom: 10px;">
            <div><strong style="color: #6b7280;">ID:</strong> ${field.id || '-'}</div>
            <div><strong style="color: #6b7280;">Name:</strong> ${field.name || '-'}</div>
            <div><strong style="color: #6b7280;">Label:</strong> ${field.label || '-'}</div>
            <div><strong style="color: #6b7280;">Selected:</strong> <span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${field.selectedText || field.selectedValue || '-'}</span></div>
          </div>
      `;

      if (field.options && field.options.length > 0) {
        html += `
          <div style="margin-top: 10px;">
            <strong style="color: #6b7280; font-size: 13px;">Options (${field.options.length}):</strong>
            <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px;">
        `;

        field.options.slice(0, 10).forEach(opt => {
          const bgColor = opt.selected ? '#dbeafe' : '#f3f4f6';
          const textColor = opt.selected ? '#1e40af' : '#6b7280';
          const border = opt.selected ? '2px solid #3b82f6' : '1px solid #e5e7eb';
          html += `<span style="background: ${bgColor}; color: ${textColor}; padding: 4px 10px; border-radius: 6px; font-size: 12px; border: ${border};">${opt.text || opt.value}</span>`;
        });

        if (field.options.length > 10) {
          html += `<span style="padding: 4px 10px; font-size: 12px; color: #9ca3af;">+${field.options.length - 10} more</span>`;
        }

        html += '</div></div>';
      }

      html += '</div>';
    });

    html += '</div></div>';
  }

  // Textarea fields
  if (record.fields.textareas.length > 0) {
    html += `
      <div style="margin-bottom: 20px;">
        <h4 style="font-size: 16px; font-weight: 700; color: #f59e0b; margin-bottom: 12px;">
          📄 Textarea Fields (${record.fields.textareas.length})
        </h4>
        <div style="display: grid; gap: 10px;">
    `;

    record.fields.textareas.forEach((field, i) => {
      html += `
        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 13px;">
            <div><strong style="color: #6b7280;">ID:</strong> ${field.id || '-'}</div>
            <div><strong style="color: #6b7280;">Name:</strong> ${field.name || '-'}</div>
            <div><strong style="color: #6b7280;">Label:</strong> ${field.label || '-'}</div>
          </div>
          ${field.placeholder ? `<div style="margin-top: 8px; font-size: 13px;"><strong style="color: #6b7280;">Placeholder:</strong> <em style="color: #9ca3af;">${field.placeholder}</em></div>` : ''}
          ${field.value ? `<div style="margin-top: 8px; font-size: 13px;"><strong style="color: #6b7280;">Value:</strong><div style="background: #f3f4f6; padding: 8px; border-radius: 6px; margin-top: 4px; font-size: 12px; font-family: monospace; white-space: pre-wrap;">${field.value}</div></div>` : ''}
        </div>
      `;
    });

    html += '</div></div>';
  }

  html += '</div>';
  return html;
}

/**
 * View record details (legacy - now using expand)
 */
window.viewDetails = function(index) {
  const record = allData[index];
  const modal = document.getElementById('detailModal');
  const modalBody = document.getElementById('modalBody');

  let html = `
    <div style="margin-bottom: 20px;">
      <strong>URL:</strong> ${record.url}<br>
      <strong>Page Title:</strong> ${record.pageTitle}<br>
      <strong>Timestamp:</strong> ${new Date(record.timestamp).toLocaleString()}
    </div>
  `;

  // Inputs
  if (record.fields.inputs.length > 0) {
    html += '<h4 style="margin: 20px 0 10px 0; color: #667eea;">📝 Input Fields</h4>';
    record.fields.inputs.forEach((field, i) => {
      html += `
        <div class="field-detail">
          <h4>Input #${i + 1} - ${field.inputType}</h4>
          <pre>${JSON.stringify(field, null, 2)}</pre>
        </div>
      `;
    });
  }

  // Selects
  if (record.fields.selects.length > 0) {
    html += '<h4 style="margin: 20px 0 10px 0; color: #667eea;">📋 Select Fields</h4>';
    record.fields.selects.forEach((field, i) => {
      html += `
        <div class="field-detail">
          <h4>Select #${i + 1}</h4>
          <pre>${JSON.stringify(field, null, 2)}</pre>
        </div>
      `;
    });
  }

  // Textareas
  if (record.fields.textareas.length > 0) {
    html += '<h4 style="margin: 20px 0 10px 0; color: #667eea;">📄 Textarea Fields</h4>';
    record.fields.textareas.forEach((field, i) => {
      html += `
        <div class="field-detail">
          <h4>Textarea #${i + 1}</h4>
          <pre>${JSON.stringify(field, null, 2)}</pre>
        </div>
      `;
    });
  }

  modalBody.innerHTML = html;
  modal.classList.add('show');
};

/**
 * Delete a record
 */
window.deleteRecord = async function(index) {
  if (!confirm('Delete this record?')) return;

  allData.splice(index, 1);
  await chrome.storage.local.set({ trainingData: allData });
  await loadData();
};

/**
 * Update sidebar stats
 */
function updateSidebarStats() {
  const totalRecords = allData.length;
  const totalFields = allData.reduce((sum, record) => sum + record.totalFields, 0);

  document.getElementById('sidebarRecords').textContent = totalRecords;
  document.getElementById('sidebarFields').textContent = totalFields;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.dataset.tab;

      // Update nav
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update content
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Search filter
  document.getElementById('searchFilter').addEventListener('input', filterData);
  document.getElementById('typeFilter').addEventListener('change', filterData);

  // Export buttons
  document.getElementById('exportJson').addEventListener('click', exportJson);
  document.getElementById('exportCsv').addEventListener('click', exportCsv);
  document.getElementById('exportJsonFull').addEventListener('click', exportJson);
  document.getElementById('exportCsvFull').addEventListener('click', exportCsv);

  // Clear all
  document.getElementById('clearAll').addEventListener('click', clearAllData);

  // Clear sessions
  document.getElementById('clearSessions').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete ALL recording sessions? This cannot be undone.')) {
      return;
    }
    await chrome.storage.local.set({ recordingSessions: [] });
    await loadRecordingSessions();
  });

  // Modal close
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('detailModal').classList.remove('show');
  });
}

/**
 * Filter data
 */
function filterData() {
  const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
  const typeFilter = document.getElementById('typeFilter').value;

  let filtered = allData;

  // Search filter
  if (searchTerm) {
    filtered = filtered.filter(record =>
      record.url.toLowerCase().includes(searchTerm) ||
      record.pageTitle.toLowerCase().includes(searchTerm)
    );
  }

  // Type filter
  if (typeFilter !== 'all') {
    filtered = filtered.filter(record => {
      if (typeFilter === 'input') return record.fields.inputs.length > 0;
      if (typeFilter === 'select') return record.fields.selects.length > 0;
      if (typeFilter === 'textarea') return record.fields.textareas.length > 0;
      return true;
    });
  }

  renderTable(filtered);
}

/**
 * Export as JSON
 */
function exportJson() {
  const dataStr = JSON.stringify(allData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-training-data-${Date.now()}.json`;
  a.click();
}

/**
 * Export as CSV
 */
function exportCsv() {
  const rows = [];
  rows.push(['Timestamp', 'URL', 'Page Title', 'Field Type', 'Field ID', 'Field Name', 'Label', 'Value']);

  allData.forEach(record => {
    // Add inputs
    record.fields.inputs.forEach(field => {
      rows.push([
        record.timestamp,
        record.url,
        record.pageTitle,
        'input',
        field.id,
        field.name,
        field.label,
        field.value
      ]);
    });

    // Add selects
    record.fields.selects.forEach(field => {
      rows.push([
        record.timestamp,
        record.url,
        record.pageTitle,
        'select',
        field.id,
        field.name,
        field.label,
        field.selectedText
      ]);
    });

    // Add textareas
    record.fields.textareas.forEach(field => {
      rows.push([
        record.timestamp,
        record.url,
        record.pageTitle,
        'textarea',
        field.id,
        field.name,
        field.label,
        field.value
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
}

/**
 * Clear all data
 */
async function clearAllData() {
  if (!confirm('Are you sure you want to delete ALL training data? This cannot be undone.')) {
    return;
  }

  await chrome.storage.local.set({ trainingData: [] });
  await loadData();
}
