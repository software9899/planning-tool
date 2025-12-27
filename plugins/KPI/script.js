// API Base URL
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:8002' : '';

// Current selected KPI Set
let currentKPISet = null;

// Current perspective for adding KPI
let currentPerspective = null;

// KPI Sets Data Structure (Multiple KPI Sets, each with 4 perspectives)
let kpiSets = [];

// Position/Level Templates with KPI vs Competency weights
const positionTemplates = {
    'qa-head': {
        name: 'Head of QA',
        kpiWeight: 70,
        competencyWeight: 30,
        description: 'เน้นผลลัพธ์ระดับองค์กร, กลยุทธ์ QA, Delivery'
    },
    'qa-manager': {
        name: 'QA Manager',
        kpiWeight: 65,
        competencyWeight: 35,
        description: 'บริหารทีม + กระบวนการ, Coaching + ขับผลลัพธ์'
    },
    'qa-lead': {
        name: 'QA Lead',
        kpiWeight: 60,
        competencyWeight: 40,
        description: 'งานเชิงเทคนิค + Lead ทีม Sprint/Release'
    },
    'qa-senior': {
        name: 'Senior QA',
        kpiWeight: 55,
        competencyWeight: 45,
        description: 'คุณภาพงาน, automation coverage, defect prevention'
    },
    'qa-mid': {
        name: 'Mid-level QA',
        kpiWeight: 50,
        competencyWeight: 50,
        description: 'สมดุลระหว่าง performance และพัฒนาทักษะ'
    },
    'qa-junior': {
        name: 'Junior QA',
        kpiWeight: 40,
        competencyWeight: 60,
        description: 'เน้นทักษะพื้นฐาน, การเรียนรู้, QA mindset'
    },
    'custom': {
        name: 'Custom',
        kpiWeight: 50,
        competencyWeight: 50,
        description: 'กำหนดเอง'
    }
};

// Default perspective template
const defaultPerspectives = [
    {
        id: 'performance',
        name: 'Performance',
        icon: '🎯',
        weight: 40,
        description: 'Work performance and delivery',
        subKPIs: []
    },
    {
        id: 'communication',
        name: 'Communication & Collaboration',
        icon: '💬',
        weight: 30,
        description: 'Team communication and collaboration',
        subKPIs: []
    },
    {
        id: 'adaptability',
        name: 'Adaptability & Growth',
        icon: '🌱',
        weight: 20,
        description: 'Learning and adaptation',
        subKPIs: []
    },
    {
        id: 'efficiency',
        name: 'Efficiency',
        icon: '⚡',
        weight: 10,
        description: 'Resource utilization efficiency',
        subKPIs: []
    }
];

// SMART Competency Data
const competencyData = [
    {
        name: 'Simple',
        meaning: 'ทำเรื่องยากให้เป็นเรื่องง่าย',
        rating: 'Guide',
        succeed: 'ทำตามมาตรฐานได้ดี',
        improvement: 'เข้าใจ Business Process',
        recommendation: 'สร้างความรู้ใน Product และระบบ'
    },
    {
        name: 'Motivated',
        meaning: 'ทำเร็วและมีคุณภาพ',
        rating: 'Role Model',
        succeed: 'มีแรงจูงใจสูง',
        improvement: '-',
        recommendation: 'รักษามาตรฐานและเป็นตัวอย่าง'
    },
    {
        name: 'Agile',
        meaning: 'ยอมรับการเปลี่ยนแปลง',
        rating: 'Role Model',
        succeed: 'ปรับตัวเร็ว',
        improvement: '-',
        recommendation: 'ใช้ความคล่องแคล่วสร้างแนวทางใหม่'
    },
    {
        name: 'Responsible',
        meaning: 'มีความรับผิดชอบ',
        rating: 'Guide',
        succeed: 'รับผิดชอบงานดี',
        improvement: 'เพิ่ม Ownership',
        recommendation: 'สร้างความเป็นเจ้าของงาน'
    },
    {
        name: 'Transformative',
        meaning: 'สร้างสรรค์สิ่งใหม่',
        rating: 'Guide',
        succeed: 'ทำตามมาตรฐานได้',
        improvement: 'ยังไม่แสดงนวัตกรรม',
        recommendation: 'เสนอไอเดียใหม่ในรอบถัดไป'
    }
];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadUsers();
    loadAllKPISets();
    loadCompetencyData();
});

// Setup Event Listeners
function setupEventListeners() {
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });

    // Create KPI Set Modal
    const createKPISetBtn = document.getElementById('createKPISetBtn');
    const createKPISetModal = document.getElementById('createKPISetModal');
    const closeCreateKPISetModal = document.getElementById('closeCreateKPISetModal');
    const cancelCreateKPISet = document.getElementById('cancelCreateKPISet');
    const confirmCreateKPISet = document.getElementById('confirmCreateKPISet');

    if (createKPISetBtn) {
        createKPISetBtn.addEventListener('click', openCreateKPISetModal);
    }

    if (closeCreateKPISetModal) {
        closeCreateKPISetModal.addEventListener('click', () => {
            createKPISetModal.style.display = 'none';
        });
    }

    if (cancelCreateKPISet) {
        cancelCreateKPISet.addEventListener('click', () => {
            createKPISetModal.style.display = 'none';
        });
    }

    if (confirmCreateKPISet) {
        confirmCreateKPISet.addEventListener('click', createNewKPISet);
    }

    // Assign Modal
    const assignModal = document.getElementById('assignModal');
    const closeAssignModal = document.getElementById('closeAssignModal');
    const cancelAssign = document.getElementById('cancelAssign');
    const confirmAssign = document.getElementById('confirmAssign');

    if (closeAssignModal) {
        closeAssignModal.addEventListener('click', () => {
            assignModal.style.display = 'none';
        });
    }

    if (cancelAssign) {
        cancelAssign.addEventListener('click', () => {
            assignModal.style.display = 'none';
        });
    }

    if (confirmAssign) {
        confirmAssign.addEventListener('click', saveAssignments);
    }

    // Add KPI Modal
    const addKPIModal = document.getElementById('addKPIModal');
    const closeAddKPIModal = document.getElementById('closeAddKPIModal');
    const cancelAddKPI = document.getElementById('cancelAddKPI');
    const confirmAddKPI = document.getElementById('confirmAddKPI');

    if (closeAddKPIModal) {
        closeAddKPIModal.addEventListener('click', () => {
            addKPIModal.style.display = 'none';
        });
    }

    if (cancelAddKPI) {
        cancelAddKPI.addEventListener('click', () => {
            addKPIModal.style.display = 'none';
        });
    }

    if (confirmAddKPI) {
        confirmAddKPI.addEventListener('click', addNewKPI);
    }

    // Upload Excel
    const uploadBtn = document.getElementById('uploadExcel');
    const fileInput = document.getElementById('excelFileInput');

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // Export
    const exportBtn = document.getElementById('exportData');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportReport);
    }
}

// Switch Tabs
function switchTab(tabName) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    const targetSection = document.getElementById(`${tabName}Section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    if (tabName === 'summary') {
        renderSummaryCharts();
    }
}

// ============ KPI SET MANAGEMENT ============

// Open Create KPI Set Modal
function openCreateKPISetModal() {
    const modal = document.getElementById('createKPISetModal');
    modal.style.display = 'flex';

    // Clear form
    document.getElementById('newKPISetName').value = '';
    document.getElementById('newKPISetPosition').value = 'qa-mid';
}

// Create New KPI Set
function createNewKPISet() {
    const name = document.getElementById('newKPISetName').value.trim();
    const position = document.getElementById('newKPISetPosition').value;

    if (!name) {
        alert('Please enter KPI Set name');
        return;
    }

    const template = positionTemplates[position] || positionTemplates['custom'];

    // Create new KPI Set with default perspectives (empty sub-KPIs)
    const newKPISet = {
        id: `kpi-set-${Date.now()}`,
        name: name,
        position: position,
        positionName: template.name,
        kpiWeight: template.kpiWeight,
        competencyWeight: template.competencyWeight,
        assignedTo: [], // Will be assigned later through assign modal
        perspectives: JSON.parse(JSON.stringify(defaultPerspectives)), // Deep copy
        expanded: false
    };

    kpiSets.push(newKPISet);

    // Close modal
    document.getElementById('createKPISetModal').style.display = 'none';

    // Re-render
    renderKPISets();
    saveAllKPISets();

    console.log('✓ Created new KPI Set:', name);
}

// Render All KPI Sets
function renderKPISets() {
    const container = document.getElementById('kpiSetsList');
    if (!container) return;

    container.innerHTML = '';

    if (kpiSets.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">No KPI Sets yet. Click "Create New KPI Set" to get started.</div>';
        return;
    }

    kpiSets.forEach((kpiSet, index) => {
        const card = document.createElement('div');
        card.className = 'kpi-set-card';
        card.style.cssText = 'background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;';

        const totalScore = calculateKPISetScore(kpiSet);
        const avgAchievement = calculateKPISetAchievement(kpiSet);

        const kpiScore = calculateKPISetScore(kpiSet);
        const competencyScore = calculateCompetencyScore();
        const weightedScore = (kpiScore * kpiSet.kpiWeight / 100) + (competencyScore * kpiSet.competencyWeight / 100);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                <div style="flex: 1;">
                    <div style="display: flex; gap: 12px; align-items: baseline; margin-bottom: 8px;">
                        <h3 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0;">${kpiSet.name}</h3>
                        <span style="font-size: 13px; padding: 4px 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; font-weight: 600;">${kpiSet.positionName}</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 8px;">
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <div class="assigned-avatars" id="avatars-${kpiSet.id}">
                                <!-- Avatars will be rendered here -->
                            </div>
                            <button class="btn-assign" onclick="openAssignModal('${kpiSet.id}')" title="Assign to roles/users">
                                <span style="font-size: 18px;">+</span>
                            </button>
                        </div>
                        <span style="font-size: 12px; color: #64748b;">
                            📊 KPI: <strong style="color: #3b82f6;">${kpiScore.toFixed(1)}</strong> × ${kpiSet.kpiWeight}% = <strong>${(kpiScore * kpiSet.kpiWeight / 100).toFixed(1)}</strong>
                        </span>
                        <span style="font-size: 12px; color: #64748b;">
                            ⭐ Competency: <strong style="color: #8b5cf6;">${competencyScore.toFixed(1)}</strong> × ${kpiSet.competencyWeight}% = <strong>${(competencyScore * kpiSet.competencyWeight / 100).toFixed(1)}</strong>
                        </span>
                    </div>
                    <div style="font-size: 14px; color: #1e293b;">
                        🎯 <strong>Overall Score: ${weightedScore.toFixed(1)}/100</strong>
                        <span style="margin-left: 12px; font-size: 12px; color: #64748b;">Achievement: <strong style="color: ${avgAchievement >= 80 ? '#10b981' : avgAchievement >= 60 ? '#f59e0b' : '#ef4444'};">${avgAchievement.toFixed(0)}%</strong></span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary" onclick="toggleExpandKPISet('${kpiSet.id}')" style="padding: 8px 16px; font-size: 13px;">
                        ${kpiSet.expanded ? '▲ Collapse' : '▼ Expand'}
                    </button>
                    <button class="icon-btn" onclick="deleteKPISet('${kpiSet.id}')" title="Delete" style="color: #ef4444;">
                        🗑️
                    </button>
                </div>
            </div>

            <div id="kpiset-content-${kpiSet.id}" style="display: ${kpiSet.expanded ? 'block' : 'none'};">
                <div class="perspectives-grid" id="perspectives-${kpiSet.id}">
                    <!-- Perspectives will be rendered here -->
                </div>
            </div>
        `;

        container.appendChild(card);

        // Render assigned avatars
        renderAssignedAvatars(kpiSet);

        // Render perspectives if expanded
        if (kpiSet.expanded) {
            renderPerspectives(kpiSet);
        }
    });

    updateSummaryCards();
}

// Render Perspectives for a KPI Set
function renderPerspectives(kpiSet) {
    const grid = document.getElementById(`perspectives-${kpiSet.id}`);
    if (!grid) return;

    grid.innerHTML = '';

    kpiSet.perspectives.forEach(perspective => {
        const container = document.createElement('div');
        container.className = `perspective-container ${perspective.id}`;

        const perspectiveScore = calculatePerspectiveScore(perspective, kpiSet);
        const achievementPercent = calculatePerspectiveAchievement(perspective);

        container.innerHTML = `
            <div class="perspective-header-row">
                <div class="perspective-title-group">
                    <span class="perspective-icon">${perspective.icon}</span>
                    <div class="perspective-title">
                        <h3>${perspective.name}</h3>
                        <div class="perspective-subtitle">${perspective.description}</div>
                    </div>
                </div>
                <div class="perspective-weight-badge">${perspective.weight}%</div>
                <div class="perspective-score">
                    <div class="perspective-score-label">Score</div>
                    <div class="perspective-score-value">${perspectiveScore.toFixed(1)}</div>
                </div>
            </div>

            <div class="sub-kpis-list" id="subkpis-${kpiSet.id}-${perspective.id}">
                <!-- Sub KPIs will be rendered here -->
            </div>

            <button class="add-kpi-btn" onclick="openAddKPIModal('${kpiSet.id}', '${perspective.id}')">
                <span>+</span> Add KPI
            </button>

            <div class="perspective-progress">
                <div class="progress-header">
                    <span class="progress-label">Overall Achievement</span>
                    <span class="progress-percentage">${achievementPercent.toFixed(0)}%</span>
                </div>
                <div class="progress-bar-outer">
                    <div class="progress-bar-inner" style="width: ${Math.min(achievementPercent, 100)}%; background: ${achievementPercent >= 80 ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : achievementPercent >= 60 ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'}"></div>
                </div>
            </div>
        `;

        grid.appendChild(container);

        // Render sub KPIs
        renderSubKPIs(perspective, kpiSet);
    });
}

// Toggle Expand/Collapse KPI Set
function toggleExpandKPISet(kpiSetId) {
    const kpiSet = kpiSets.find(s => s.id === kpiSetId);
    if (!kpiSet) return;

    kpiSet.expanded = !kpiSet.expanded;
    renderKPISets();
}

// Delete KPI Set
function deleteKPISet(kpiSetId) {
    if (!confirm('Are you sure you want to delete this KPI Set?')) return;

    kpiSets = kpiSets.filter(s => s.id !== kpiSetId);
    renderKPISets();
    saveAllKPISets();

    console.log('✓ Deleted KPI Set');
}

// Render Assigned Avatars
function renderAssignedAvatars(kpiSet) {
    const container = document.getElementById(`avatars-${kpiSet.id}`);
    if (!container) return;

    container.innerHTML = '';

    if (!kpiSet.assignedTo || kpiSet.assignedTo.length === 0) {
        container.innerHTML = '<span style="font-size: 12px; color: #94a3b8;">Not assigned</span>';
        return;
    }

    kpiSet.assignedTo.forEach(assignee => {
        const avatar = createAvatar(assignee);
        container.appendChild(avatar);
    });
}

// Create Avatar Element
function createAvatar(assignee) {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.title = getAssigneeName(assignee);

    // Check if it's a role or user
    if (assignee.startsWith('role:')) {
        const roleName = assignee.replace('role:', '');
        avatar.innerHTML = roleName.charAt(0).toUpperCase();
        avatar.style.background = getRoleColor(roleName);
    } else if (assignee.startsWith('user:')) {
        const userId = assignee.replace('user:', '');
        const user = usersCache.find(u => u.id == userId);
        if (user) {
            avatar.innerHTML = user.name.charAt(0).toUpperCase();
            avatar.style.background = getUserColor(user.name);
            avatar.title = `${user.name} (${user.email})`;
        }
    }

    // Add remove button on hover
    const removeBtn = document.createElement('span');
    removeBtn.className = 'avatar-remove';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeAssignment(kpiSet.id, assignee);
    };
    avatar.appendChild(removeBtn);

    return avatar;
}

// Get Assignee Name
function getAssigneeName(assignee) {
    if (assignee.startsWith('role:')) {
        return assignee.replace('role:', '').charAt(0).toUpperCase() + assignee.replace('role:', '').slice(1);
    } else if (assignee.startsWith('user:')) {
        const userId = assignee.replace('user:', '');
        const user = usersCache.find(u => u.id == userId);
        return user ? user.name : 'User';
    }
    return assignee;
}

// Get Role Color
function getRoleColor(roleName) {
    const colors = {
        'admin': '#ef4444',
        'manager': '#8b5cf6',
        'member': '#3b82f6',
        'developer': '#10b981',
        'designer': '#f59e0b',
        'qa': '#ec4899',
        'team-lead': '#6366f1'
    };
    return colors[roleName] || '#64748b';
}

// Get User Color (based on name hash)
function getUserColor(name) {
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// Open Assign Modal
let currentAssignKPISet = null;
function openAssignModal(kpiSetId) {
    const kpiSet = kpiSets.find(s => s.id === kpiSetId);
    if (!kpiSet) return;

    currentAssignKPISet = kpiSet;

    const modal = document.getElementById('assignModal');
    modal.style.display = 'flex';

    // Render checkboxes
    renderAssignOptions(kpiSet);
}

// Render Assign Options
function renderAssignOptions(kpiSet) {
    const container = document.getElementById('assignOptionsContainer');
    if (!container) return;

    container.innerHTML = '';

    // Roles section
    const rolesSection = document.createElement('div');
    rolesSection.innerHTML = '<h4 style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">Roles</h4>';

    const roles = ['admin', 'member', 'manager', 'team-lead', 'developer', 'designer', 'qa'];
    roles.forEach(role => {
        const roleValue = `role:${role}`;
        const isChecked = kpiSet.assignedTo.includes(roleValue);

        const checkbox = document.createElement('label');
        checkbox.className = 'assign-checkbox';
        checkbox.innerHTML = `
            <input type="checkbox" value="${roleValue}" ${isChecked ? 'checked' : ''}>
            <span>${role.charAt(0).toUpperCase() + role.slice(1)}</span>
        `;
        rolesSection.appendChild(checkbox);
    });

    container.appendChild(rolesSection);

    // Users section
    if (usersCache.length > 0) {
        const usersSection = document.createElement('div');
        usersSection.style.marginTop = '20px';
        usersSection.innerHTML = '<h4 style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">Users</h4>';

        usersCache.forEach(user => {
            const userValue = `user:${user.id}`;
            const isChecked = kpiSet.assignedTo.includes(userValue);

            const checkbox = document.createElement('label');
            checkbox.className = 'assign-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" value="${userValue}" ${isChecked ? 'checked' : ''}>
                <span>${user.name} <small style="color: #94a3b8;">(${user.email})</small></span>
            `;
            usersSection.appendChild(checkbox);
        });

        container.appendChild(usersSection);
    }
}

// Save Assignments from Modal
function saveAssignments() {
    if (!currentAssignKPISet) return;

    const checkboxes = document.querySelectorAll('#assignOptionsContainer input[type="checkbox"]:checked');
    const newAssignments = Array.from(checkboxes).map(cb => cb.value);

    currentAssignKPISet.assignedTo = newAssignments;

    // Close modal
    document.getElementById('assignModal').style.display = 'none';

    // Re-render
    renderKPISets();
    saveAllKPISets();

    console.log('✓ Updated assignments for', currentAssignKPISet.name);
}

// Remove Assignment
function removeAssignment(kpiSetId, assignee) {
    const kpiSet = kpiSets.find(s => s.id === kpiSetId);
    if (!kpiSet) return;

    kpiSet.assignedTo = kpiSet.assignedTo.filter(a => a !== assignee);

    renderKPISets();
    saveAllKPISets();

    console.log('✓ Removed', assignee, 'from', kpiSet.name);
}

// Calculate KPI Set Score (sum of all perspectives)
function calculateKPISetScore(kpiSet) {
    let totalScore = 0;
    kpiSet.perspectives.forEach(perspective => {
        totalScore += calculatePerspectiveScore(perspective, kpiSet);
    });
    return totalScore;
}

// Calculate KPI Set Achievement (average of all perspectives)
function calculateKPISetAchievement(kpiSet) {
    if (kpiSet.perspectives.length === 0) return 0;

    let totalAchievement = 0;
    kpiSet.perspectives.forEach(perspective => {
        totalAchievement += calculatePerspectiveAchievement(perspective);
    });

    return totalAchievement / kpiSet.perspectives.length;
}

// Calculate Competency Score (from competencyData)
function calculateCompetencyScore() {
    if (competencyData.length === 0) return 0;

    const ratingScores = {
        'Role Model': 100,
        'Guide': 75,
        'Improvement': 50
    };

    let totalScore = 0;
    competencyData.forEach(comp => {
        totalScore += ratingScores[comp.rating] || 50;
    });

    return totalScore / competencyData.length;
}

// Render Sub KPIs for a perspective
function renderSubKPIs(perspective, kpiSet) {
    const container = document.getElementById(`subkpis-${kpiSet.id}-${perspective.id}`);
    if (!container) return;

    container.innerHTML = '';

    const totalWeight = perspective.subKPIs.reduce((sum, kpi) => sum + kpi.weight, 0);
    const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

    perspective.subKPIs.forEach((kpi, index) => {
        const score = calculateSubKPIScore(kpi, perspective);

        const item = document.createElement('div');
        item.className = 'sub-kpi-item';

        item.innerHTML = `
            <div class="sub-kpi-info">
                <h4>${kpi.name}</h4>
                <p>${kpi.description}</p>
            </div>

            <div class="sub-kpi-weight">
                <div class="sub-kpi-weight-label">Weight</div>
                <div class="sub-kpi-weight-value">${kpi.weight}%</div>
            </div>

            <div class="sub-kpi-target">
                <span class="sub-kpi-label">Target</span>
                <div class="sub-kpi-value">${kpi.target}%</div>
            </div>

            <div class="sub-kpi-actual">
                <span class="sub-kpi-label">Actual</span>
                <input
                    type="number"
                    min="0"
                    max="100"
                    value="${kpi.actual || ''}"
                    placeholder="0"
                    onchange="updateSubKPIActual('${kpiSet.id}', '${perspective.id}', '${kpi.id}', this.value)"
                >
            </div>

            <div class="sub-kpi-score">
                <span class="sub-kpi-label">Score</span>
                <div class="sub-kpi-score-value">${score.toFixed(1)}</div>
            </div>

            <div class="sub-kpi-actions">
                <button class="icon-btn" onclick="deleteSubKPI('${kpiSet.id}', '${perspective.id}', '${kpi.id}')" title="Delete">
                    🗑️
                </button>
            </div>
        `;

        container.appendChild(item);
    });

    // Show warning if weights don't add up to 100%
    if (!isWeightValid && perspective.subKPIs.length > 0) {
        const warning = document.createElement('div');
        warning.style.cssText = 'padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; margin-top: 12px; font-size: 13px; color: #92400e;';
        warning.textContent = `⚠️ Warning: Sub-KPI weights total ${totalWeight.toFixed(1)}%. Should be 100%.`;
        container.appendChild(warning);
    }
}

// Open Add KPI Modal
function openAddKPIModal(kpiSetId, perspectiveId) {
    const kpiSet = kpiSets.find(s => s.id === kpiSetId);
    if (!kpiSet) return;

    currentKPISet = kpiSet;
    currentPerspective = kpiSet.perspectives.find(p => p.id === perspectiveId);
    if (!currentPerspective) return;

    const modal = document.getElementById('addKPIModal');
    modal.style.display = 'flex';

    // Clear form
    document.getElementById('newKPIName').value = '';
    document.getElementById('newKPIDescription').value = '';
    document.getElementById('newKPIWeight').value = '25';
    document.getElementById('newKPITarget').value = '90';
}

// Add New KPI
function addNewKPI() {
    if (!currentPerspective || !currentKPISet) return;

    const name = document.getElementById('newKPIName').value.trim();
    const description = document.getElementById('newKPIDescription').value.trim();
    const weight = parseFloat(document.getElementById('newKPIWeight').value) || 0;
    const target = parseFloat(document.getElementById('newKPITarget').value) || 90;

    if (!name) {
        alert('Please enter KPI name');
        return;
    }

    if (weight <= 0 || weight > 100) {
        alert('Weight must be between 0 and 100');
        return;
    }

    // Generate unique ID
    const id = `${currentPerspective.id}-${Date.now()}`;

    // Add new sub KPI
    currentPerspective.subKPIs.push({
        id: id,
        name: name,
        description: description,
        weight: weight,
        target: target,
        actual: 0
    });

    // Close modal
    document.getElementById('addKPIModal').style.display = 'none';

    // Re-render
    renderKPISets();
    saveAllKPISets();
}

// Delete Sub KPI
function deleteSubKPI(kpiSetId, perspectiveId, kpiId) {
    const kpiSet = kpiSets.find(s => s.id === kpiSetId);
    if (!kpiSet) return;

    const perspective = kpiSet.perspectives.find(p => p.id === perspectiveId);
    if (!perspective) return;

    if (!confirm('Are you sure you want to delete this KPI?')) return;

    // Remove sub KPI
    perspective.subKPIs = perspective.subKPIs.filter(kpi => kpi.id !== kpiId);

    // Re-render
    renderKPISets();
    saveAllKPISets();
}

// Update Sub KPI Actual Value
function updateSubKPIActual(kpiSetId, perspectiveId, kpiId, value) {
    const kpiSet = kpiSets.find(s => s.id === kpiSetId);
    if (!kpiSet) return;

    const perspective = kpiSet.perspectives.find(p => p.id === perspectiveId);
    if (!perspective) return;

    const kpi = perspective.subKPIs.find(k => k.id === kpiId);
    if (!kpi) return;

    kpi.actual = parseFloat(value) || 0;

    renderKPISets();
    saveAllKPISets();
}

// Calculate Sub KPI Score
function calculateSubKPIScore(kpi, perspective) {
    // Score = (actual * weight * perspective.weight) / 10000
    return (kpi.actual * kpi.weight * perspective.weight) / 10000;
}

// Calculate Perspective Score
function calculatePerspectiveScore(perspective, kpiSet) {
    let totalScore = 0;
    perspective.subKPIs.forEach(kpi => {
        totalScore += calculateSubKPIScore(kpi, perspective);
    });
    return totalScore;
}

// Calculate Perspective Achievement %
function calculatePerspectiveAchievement(perspective) {
    if (perspective.subKPIs.length === 0) return 0;

    let totalWeightedAchievement = 0;
    let totalWeight = 0;

    perspective.subKPIs.forEach(kpi => {
        if (kpi.target > 0) {
            const achievement = (kpi.actual / kpi.target) * 100;
            totalWeightedAchievement += achievement * kpi.weight;
            totalWeight += kpi.weight;
        }
    });

    return totalWeight > 0 ? totalWeightedAchievement / totalWeight : 0;
}

// Update Summary Cards
function updateSummaryCards() {
    let totalWeightedScore = 0;
    let totalKPIScore = 0;
    let totalCompetencyScore = 0;
    let totalAchievement = 0;
    let kpiSetCount = 0;

    const competencyScore = calculateCompetencyScore();

    kpiSets.forEach(kpiSet => {
        const kpiScore = calculateKPISetScore(kpiSet);
        const achievement = calculateKPISetAchievement(kpiSet);
        const weightedScore = (kpiScore * kpiSet.kpiWeight / 100) + (competencyScore * kpiSet.competencyWeight / 100);

        totalWeightedScore += weightedScore;
        totalKPIScore += kpiScore;
        totalCompetencyScore += competencyScore;
        totalAchievement += achievement;
        kpiSetCount++;
    });

    const avgWeightedScore = kpiSetCount > 0 ? totalWeightedScore / kpiSetCount : 0;
    const avgKPIScore = kpiSetCount > 0 ? totalKPIScore / kpiSetCount : 0;
    const avgAchievement = kpiSetCount > 0 ? totalAchievement / kpiSetCount : 0;

    // Update summary cards
    const kpiScoreElement = document.getElementById('kpiScore');
    if (kpiScoreElement) {
        kpiScoreElement.textContent = avgKPIScore.toFixed(1);
    }

    const competencyScoreElement = document.getElementById('competencyScore');
    if (competencyScoreElement) {
        competencyScoreElement.textContent = competencyScore.toFixed(1);
    }

    const overallScoreElement = document.getElementById('overallScore');
    if (overallScoreElement) {
        overallScoreElement.textContent = avgWeightedScore.toFixed(1);
    }

    const achievementElement = document.getElementById('achievementRate');
    if (achievementElement) {
        achievementElement.textContent = avgAchievement.toFixed(1) + '%';
    }
}

// Load Competency Data
function loadCompetencyData() {
    const competencyGrid = document.getElementById('competencyGrid');
    if (!competencyGrid) return;

    competencyGrid.innerHTML = '';

    competencyData.forEach(comp => {
        const card = document.createElement('div');
        card.className = 'competency-card';

        let borderColor = '#3b82f6';
        if (comp.rating === 'Role Model') {
            borderColor = '#10b981';
        } else if (comp.rating === 'Improvement') {
            borderColor = '#f59e0b';
        }
        card.style.borderLeftColor = borderColor;

        const ratingClass = comp.rating.toLowerCase().replace(' ', '-');

        card.innerHTML = `
            <div class="competency-header">
                <div>
                    <div class="competency-name">${comp.name}</div>
                    <div class="competency-meaning">${comp.meaning}</div>
                </div>
                <span class="rating-badge ${ratingClass}">${comp.rating}</span>
            </div>
            <div class="competency-details">
                <div class="detail-box">
                    <h4>✓ Succeed</h4>
                    <p>${comp.succeed}</p>
                </div>
                <div class="detail-box">
                    <h4>△ Improvement</h4>
                    <p>${comp.improvement}</p>
                </div>
                <div class="detail-box">
                    <h4>→ Recommendation</h4>
                    <p>${comp.recommendation}</p>
                </div>
            </div>
        `;

        competencyGrid.appendChild(card);
    });

    updateCompetencyScore();
}

// Update Competency Score
function updateCompetencyScore() {
    const ratings = competencyData.map(c => c.rating);
    const roleModelCount = ratings.filter(r => r === 'Role Model').length;
    const guideCount = ratings.filter(r => r === 'Guide').length;

    let averageRating = 'Guide';
    if (roleModelCount > guideCount) {
        averageRating = 'Role Model';
    } else if (guideCount === 0 && roleModelCount === 0) {
        averageRating = 'Improvement';
    }

    const competencyScoreElement = document.getElementById('competencyScore');
    if (competencyScoreElement) {
        competencyScoreElement.textContent = averageRating;
    }
}

// Render Summary Charts
function renderSummaryCharts() {
    renderKPIBreakdown();
    renderCompetencyChart();
    renderRecommendations();
}

// Render KPI Breakdown
function renderKPIBreakdown() {
    const container = document.getElementById('kpiBreakdown');
    if (!container) return;

    let html = '<div style="display: flex; flex-direction: column; gap: 16px;">';

    kpiSets.forEach(kpiSet => {
        const score = calculateKPISetScore(kpiSet);
        const achievement = calculateKPISetAchievement(kpiSet);

        let statusColor = '#10b981';
        if (achievement < 80) statusColor = '#f59e0b';
        if (achievement < 60) statusColor = '#ef4444';

        html += `
            <div style="padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${statusColor};">
                <div style="margin-bottom: 12px;">
                    <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 4px;">${kpiSet.name}</div>
                    <div style="font-size: 12px; color: #64748b;">
                        ${kpiSet.assignedTo ? `Assigned to: ${kpiSet.assignedTo}` : 'Not assigned'}
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600; font-size: 14px;">Total Score</span>
                    <span style="font-weight: 700; color: ${statusColor};">${score.toFixed(1)} / 100</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="flex: 1; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                        <div style="height: 100%; background: ${statusColor}; width: ${Math.min(score, 100)}%;"></div>
                    </div>
                    <span style="font-size: 13px; color: #64748b; min-width: 50px; font-weight: 600;">${achievement.toFixed(0)}%</span>
                </div>
            </div>
        `;
    });

    if (kpiSets.length === 0) {
        html += '<div style="text-align: center; padding: 40px; color: #94a3b8;">No KPI Sets available</div>';
    }

    html += '</div>';
    container.innerHTML = html;
}

// Render Competency Chart
function renderCompetencyChart() {
    const container = document.getElementById('competencyChart');
    if (!container) return;

    const ratings = competencyData.map(c => c.rating);
    const roleModelCount = ratings.filter(r => r === 'Role Model').length;
    const guideCount = ratings.filter(r => r === 'Guide').length;
    const improvementCount = ratings.filter(r => r === 'Improvement').length;
    const total = competencyData.length;

    let html = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="padding: 12px; background: #d1fae5; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: #065f46;">Role Model</span>
                    <span style="font-weight: 700; color: #065f46;">${roleModelCount} / ${total}</span>
                </div>
            </div>
            <div style="padding: 12px; background: #dbeafe; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: #1e40af;">Guide</span>
                    <span style="font-weight: 700; color: #1e40af;">${guideCount} / ${total}</span>
                </div>
            </div>
            <div style="padding: 12px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: #92400e;">Improvement</span>
                    <span style="font-weight: 700; color: #92400e;">${improvementCount} / ${total}</span>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Render Recommendations
function renderRecommendations() {
    const container = document.getElementById('recommendations');
    if (!container) return;

    let recommendations = [];

    kpiSets.forEach(kpiSet => {
        kpiSet.perspectives.forEach(perspective => {
            const achievement = calculatePerspectiveAchievement(perspective);
            if (achievement < 80) {
                recommendations.push({
                    category: perspective.name,
                    message: `<strong>${kpiSet.name}</strong>: Focus on improving ${perspective.icon} ${perspective.name} - current achievement is ${achievement.toFixed(0)}%`
                });
            }

            // Check individual sub-KPIs
            perspective.subKPIs.forEach(kpi => {
                if (kpi.target > 0 && kpi.actual > 0) {
                    const kpiAchievement = (kpi.actual / kpi.target) * 100;
                    if (kpiAchievement < 70) {
                        recommendations.push({
                            category: kpi.name,
                            message: `<strong>${kpi.name}</strong> (${kpiSet.name}) needs attention - only ${kpiAchievement.toFixed(0)}% of target`
                        });
                    }
                }
            });
        });
    });

    competencyData.forEach(comp => {
        if (comp.improvement !== '-' && comp.improvement) {
            recommendations.push({
                category: comp.name,
                message: `<strong>${comp.name}</strong>: ${comp.recommendation}`
            });
        }
    });

    if (recommendations.length === 0) {
        container.innerHTML = '<p style="color: #64748b;">Great job! All KPIs are on track. Keep up the excellent work!</p>';
        return;
    }

    let html = '';
    recommendations.forEach(rec => {
        html += `
            <div class="recommendation-item">
                ${rec.message}
            </div>
        `;
    });

    container.innerHTML = html;
}

// Load Users from API
let usersCache = [];
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/api/users`);
        if (!response.ok) return;

        usersCache = await response.json();

        // Populate template
        const template = document.getElementById('userRoleOptionsTemplate');
        if (!template) return;

        const userGroup = template.querySelector('.user-options-group');
        if (!userGroup) return;

        userGroup.innerHTML = '';
        usersCache.forEach(user => {
            const option = document.createElement('option');
            option.value = `user:${user.id}`;
            option.textContent = `${user.name} (${user.email})`;
            userGroup.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Populate Role/User Dropdown
function populateRoleUserDropdown(elementOrId) {
    const element = typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;

    if (!element) return;

    const template = document.getElementById('userRoleOptionsTemplate');
    if (!template) return;

    // Clone template content
    const clonedContent = template.cloneNode(true);
    const optgroups = clonedContent.querySelectorAll('optgroup');

    // Clear existing options except first one (placeholder)
    while (element.options.length > 1) {
        element.remove(1);
    }

    // Add all options
    optgroups.forEach(optgroup => {
        const newOptgroup = document.createElement('optgroup');
        newOptgroup.label = optgroup.label;

        optgroup.querySelectorAll('option').forEach(option => {
            newOptgroup.appendChild(option.cloneNode(true));
        });

        element.appendChild(newOptgroup);
    });
}

// Load All KPI Sets from API
async function loadAllKPISets() {
    try {
        const response = await fetch(`${API_BASE}/api/kpi/sets`);
        if (!response.ok) {
            console.log('No existing KPI sets found');
            return;
        }

        const data = await response.json();

        if (data.kpi_sets && Array.isArray(data.kpi_sets)) {
            kpiSets = data.kpi_sets;
            renderKPISets();
            console.log(`✓ Loaded ${kpiSets.length} KPI Sets`);
        }
    } catch (error) {
        console.error('Error loading KPI sets:', error);
    }
}

// Auto-save KPI Sets
let saveTimeout;
function autoSaveKPISets() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveAllKPISets();
    }, 1000);
}

// Save All KPI Sets to API
async function saveAllKPISets() {
    try {
        const payload = {
            kpi_sets: kpiSets,
            competency_data: competencyData
        };

        const response = await fetch(`${API_BASE}/api/kpi/sets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('✓ KPI Sets saved');
        } else {
            console.error('Failed to save KPI Sets');
        }
    } catch (error) {
        console.error('Error saving KPI Sets:', error);
    }
}

// Handle File Upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            if (workbook.SheetNames.includes('KPI')) {
                const kpiSheet = workbook.Sheets['KPI'];
                const kpiRows = XLSX.utils.sheet_to_json(kpiSheet, { header: 1 });

                // Parse KPI data
                // TODO: Implement Excel parsing logic

                alert('✓ Excel data loaded successfully!');
            } else {
                alert('⚠️ Excel file must contain a "KPI" sheet');
            }
        } catch (error) {
            console.error('Error parsing Excel:', error);
            alert('❌ Error reading Excel file: ' + error.message);
        }
    };

    reader.readAsArrayBuffer(file);
}

// Export Report
function exportReport() {
    const wb = XLSX.utils.book_new();

    // KPI Sets Sheet
    const kpiData_export = [
        ['KPI Set', 'Assigned To', 'Perspective', 'Weight %', 'KPI Name', 'Sub Weight %', 'Target', 'Actual', 'Score']
    ];

    kpiSets.forEach(kpiSet => {
        kpiSet.perspectives.forEach(perspective => {
            perspective.subKPIs.forEach(kpi => {
                const score = calculateSubKPIScore(kpi, perspective);
                kpiData_export.push([
                    kpiSet.name,
                    kpiSet.assignedTo || 'Not assigned',
                    perspective.name,
                    perspective.weight,
                    kpi.name,
                    kpi.weight,
                    kpi.target,
                    kpi.actual || '',
                    score.toFixed(1)
                ]);
            });
        });
    });

    const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData_export);
    XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPI Sets');

    // Summary Sheet
    const summaryData = [
        ['KPI Set', 'Assigned To', 'Total Score', 'Achievement %']
    ];

    kpiSets.forEach(kpiSet => {
        const score = calculateKPISetScore(kpiSet);
        const achievement = calculateKPISetAchievement(kpiSet);
        summaryData.push([
            kpiSet.name,
            kpiSet.assignedTo || 'Not assigned',
            score.toFixed(1),
            achievement.toFixed(1)
        ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Competency Sheet
    const compData_export = [
        ['Competency', 'Meaning', 'Mid-Year Rating', 'Succeed', 'Improvement', 'Recommendation'],
        ...competencyData.map(comp => [
            comp.name,
            comp.meaning,
            comp.rating,
            comp.succeed,
            comp.improvement,
            comp.recommendation
        ])
    ];
    const compSheet = XLSX.utils.aoa_to_sheet(compData_export);
    XLSX.utils.book_append_sheet(wb, compSheet, 'Competency');

    // Export
    XLSX.writeFile(wb, 'KPI_Report_' + new Date().toISOString().split('T')[0] + '.xlsx');
}
