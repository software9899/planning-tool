// Data Storage
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let taskTypes = JSON.parse(localStorage.getItem('taskTypes')) || ['Feature', 'Bug', 'Research', 'Documentation'];
let priorities = JSON.parse(localStorage.getItem('priorities')) || ['High', 'Medium', 'Low'];
let priorityMapping = JSON.parse(localStorage.getItem('priorityMapping')) || {
    'Feature': 'High',
    'Bug': 'High',
    'Research': 'Medium',
    'Documentation': 'Low'
};
let checklistTemplates = JSON.parse(localStorage.getItem('checklistTemplates')) || {
    'Feature': ['Design Ready', 'API Specification', 'Database Schema', 'Deadline Confirmed'],
    'Bug': ['Bug Reproduced', 'Root Cause Identified', 'Fix Tested', 'Deadline Set'],
    'Research': ['Scope Defined', 'Resources Available', 'Timeline Set', 'Stakeholders Informed'],
    'Documentation': ['Content Outline', 'References Gathered', 'Review Process Set', 'Deadline Confirmed']
};

// Column management
let columns = JSON.parse(localStorage.getItem('columns')) || [
    { id: 'todo', name: 'To Do', position: 0 },
    { id: 'inProgress', name: 'In Progress', position: 1 },
    { id: 'done', name: 'Done', position: 2 }
];

let currentTaskId = null;
let actionType = null;
let actionParentId = null;
let draggedTaskId = null;
let pendingMoveTaskId = null;
let pendingMoveStatus = null;
let confirmCallback = null;
let currentActiveTab = 'current';
let currentBacklogFilter = 'all';
let showBlocked = true; // Always show blocked cards on top

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Planning Tool initializing...');

    // Detect which page we're on
    const isBacklogPage = document.getElementById('backlogNeedDetails') !== null;
    if (isBacklogPage) {
        currentActiveTab = 'backlog';
        console.log('📍 Detected backlog page');
    }

    // Initialize in correct order
    initializeSelects();
    console.log('✅ Selects initialized');

    initializeTabs();
    console.log('✅ Tabs initialized');

    initializeBacklogFilters();
    console.log('✅ Backlog filters initialized');

    attachEventListeners();
    console.log('✅ Event listeners attached');

    populateMemberDropdowns();
    console.log('✅ Member dropdowns populated');

    renderAllTasks();
    console.log('✅ Tasks rendered');

    setupDragAndDrop();
    console.log('✅ Drag and drop setup complete');

    // Check if we should show daily burndown chart
    checkAndShowDailyBurndown();

    console.log('🎉 Initialization complete!');
});

// Tab Management
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            switchTab(targetTab);
        });
    });
}

function switchTab(tabName) {
    currentActiveTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'backlog') {
        document.getElementById('backlogTab').classList.add('active');
    } else {
        document.getElementById('currentTab').classList.add('active');
    }
    
    renderAllTasks();
}

// Backlog Filters
function initializeBacklogFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const showBlockedCheckbox = document.getElementById('showBlockedCheckbox');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentBacklogFilter = btn.dataset.size;
            renderAllTasks();
        });
    });
    
    // Only add listener if checkbox exists
    if (showBlockedCheckbox) {
        showBlockedCheckbox.addEventListener('change', (e) => {
            showBlocked = e.target.checked;
            renderAllTasks();
        });
    }
}

// Custom Alert
function showAlert(title, message) {
    console.log('⚠️ Alert:', title, message);
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('customAlertModal').style.display = 'block';
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').style.display = 'none';
}

// Custom Confirm
function showConfirm(title, message, callback) {
    console.log('❓ Confirm:', title, message);
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    document.getElementById('customConfirmModal').style.display = 'block';
}

function closeCustomConfirm(result) {
    document.getElementById('customConfirmModal').style.display = 'none';
    if (confirmCallback) {
        confirmCallback(result);
        confirmCallback = null;
    }
}

// Initialize Select Options
function initializeSelects() {
    // Only populate taskType (removed taskPriority from create modal)
    const selects = ['taskType', 'actionTaskType', 'actionTaskPriority'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`⚠️ Select element not found: ${selectId}`);
            return;
        }

        select.innerHTML = '';

        if (selectId.includes('Type')) {
            taskTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                select.appendChild(option);
            });
        } else {
            priorities.forEach(priority => {
                const option = document.createElement('option');
                option.value = priority;
                option.textContent = priority;
                select.appendChild(option);
            });
        }
    });
}

// Populate Member Dropdowns
function populateMemberDropdowns() {
    // Get members from localStorage or use defaults
    let members = JSON.parse(localStorage.getItem('members')) || [];

    // If no members exist, create default members
    if (members.length === 0) {
        members = [
            {
                id: 1,
                name: 'John Doe',
                email: 'john@example.com',
                role: 'Developer',
                status: 'active',
                teams: []
            },
            {
                id: 2,
                name: 'Jane Smith',
                email: 'jane@example.com',
                role: 'Designer',
                status: 'active',
                teams: []
            },
            {
                id: 3,
                name: 'Bob Wilson',
                email: 'bob@example.com',
                role: 'QA',
                status: 'active',
                teams: []
            }
        ];
        localStorage.setItem('members', JSON.stringify(members));
        console.log('✅ Created default members');
    }

    // Get current user and add to members list if not already there
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
        try {
            const currentUser = JSON.parse(currentUserData);
            // Check if current user is already in members list
            const existingMember = members.find(m => m.name === currentUser.name);
            if (!existingMember) {
                // Add current user to members list
                members.push({
                    id: Date.now(),
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role || 'member',
                    status: 'active',
                    teams: [],
                    color: '#667eea' // Default color for current user
                });
                // Save updated members list to localStorage
                localStorage.setItem('members', JSON.stringify(members));
                console.log('✅ Added current user to members:', currentUser.name);
            }
        } catch (e) {
            console.error('❌ Error adding current user to members:', e);
        }
    }

    const dropdowns = ['assigneeInput', 'editAssignee'];

    dropdowns.forEach(dropdownId => {
        const select = document.getElementById(dropdownId);
        if (!select) return;

        // Save current value
        const currentValue = select.value;

        // Clear and rebuild
        select.innerHTML = '';

        // Add placeholder
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select Member --';
        select.appendChild(placeholder);

        // Add active members
        members.filter(m => m.status === 'active').forEach(member => {
            const option = document.createElement('option');
            option.value = member.name;
            option.textContent = `${member.name} (${member.role})`;
            select.appendChild(option);
        });

        // Restore previous value if it still exists
        if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        }
    });

    console.log(`📋 Populated ${dropdowns.length} assignee dropdowns with ${members.filter(m => m.status === 'active').length} active members`);
}

// Update Priority when Type changes (not needed anymore since priority is auto-set)
function updatePriorityFromMapping() {
    // Priority is now automatically set based on type in createTask()
    // This function is kept for compatibility but does nothing
}

// Event Listeners
function attachEventListeners() {
    console.log('📎 Attaching event listeners...');
    
    // Create Task Modal
    const createTaskBtn = document.getElementById('createTaskFloatingBtn');
    if (createTaskBtn) {
        createTaskBtn.addEventListener('click', openCreateTaskModal);
        console.log('✅ Create task button attached');
    }
    
    const closeCreate = document.querySelector('.close-create');
    if (closeCreate) {
        closeCreate.addEventListener('click', closeCreateTaskModal);
    }
    
    // Settings
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettings);
        console.log('✅ Settings button attached');
    }
    
    const closeSettings = document.querySelector('.close-settings');
    if (closeSettings) {
        closeSettings.addEventListener('click', closeSettings);
    }
    
    // Reorder
    const reorderBtn = document.getElementById('reorderColumnsBtn');
    if (reorderBtn) {
        reorderBtn.addEventListener('click', toggleReorderMode);
        console.log('✅ Reorder button attached');
    }
    
    const closeReorder = document.querySelector('.close-reorder');
    if (closeReorder) {
        closeReorder.addEventListener('click', closeReorderModal);
    }
    
    // Add Column
    const addColumnBtn = document.getElementById('addColumnBtn');
    if (addColumnBtn) {
        addColumnBtn.addEventListener('click', openAddColumnModal);
        console.log('✅ Add column button attached');
    }
    
    const closeAddColumn = document.querySelector('.close-add-column');
    if (closeAddColumn) {
        closeAddColumn.addEventListener('click', closeAddColumnModal);
    }
    
    // Modals
    const closeModal = document.querySelector('.close');
    if (closeModal) {
        closeModal.addEventListener('click', closeTaskModal);
    }
    
    const closeAction = document.querySelector('.close-action');
    if (closeAction) {
        closeAction.addEventListener('click', closeActionModal);
    }
    
    const closeAssignee = document.querySelector('.close-assignee');
    if (closeAssignee) {
        closeAssignee.addEventListener('click', () => closeAssigneeModal(false));
    }
    
    const closeActual = document.querySelector('.close-actual');
    if (closeActual) {
        closeActual.addEventListener('click', () => closeActualPointsModal(false));
    }
    
    const actionCreateBtn = document.getElementById('actionCreateBtn');
    if (actionCreateBtn) {
        actionCreateBtn.addEventListener('click', createActionTask);
    }
    
    // Task Type Change
    const taskType = document.getElementById('taskType');
    if (taskType) {
        taskType.addEventListener('change', () => {
            updatePriorityFromMapping();
        });
    }
    
    const actionTaskType = document.getElementById('actionTaskType');
    if (actionTaskType) {
        actionTaskType.addEventListener('change', updateActionChecklist);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Close expanded card when clicking outside
    document.addEventListener('click', (e) => {
        // Check if clicked outside of any task card
        if (!e.target.closest('.task-card') && currentTaskId !== null) {
            currentTaskId = null;
            renderAllTasks();
        }
    });

    console.log('✅ All event listeners attached');
}

// Open/Close Create Task Modal
function openCreateTaskModal(isBacklog = false) {
    console.log('➕ Opening create task modal...');
    document.getElementById('createTaskModal').style.display = 'block';
    goToStep1();
}

function closeCreateTaskModal() {
    document.getElementById('createTaskModal').style.display = 'none';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskSize').value = '';
}

// Multi-Step Navigation
function goToStep1() {
    document.getElementById('step1').classList.add('active');
    document.getElementById('step2').classList.remove('active');
    
    document.getElementById('progressStep1').classList.add('active');
    document.getElementById('progressStep2').classList.remove('active');
    document.getElementById('progressStep2').classList.remove('completed');
}

function goToStep2() {
    const title = document.getElementById('taskTitle').value.trim();
    
    if (!title) {
        showAlert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่ชื่อ Task');
        return;
    }
    
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.add('active');
    
    document.getElementById('progressStep1').classList.remove('active');
    document.getElementById('progressStep1').classList.add('completed');
    document.getElementById('progressStep2').classList.add('active');
    
    updateChecklistForStep2();
}

function updateChecklistForStep2() {
    const type = document.getElementById('taskType').value;
    const container = document.getElementById('readinessChecklist');
    const checklistContainer = document.getElementById('readinessChecklistContainer');
    const noChecklistMessage = document.getElementById('noChecklistMessage');
    
    const template = checklistTemplates[type] || [];
    
    if (template.length === 0) {
        container.innerHTML = '';
        noChecklistMessage.style.display = 'block';
        checklistContainer.querySelector('h4').style.display = 'none';
        checklistContainer.querySelector('.checklist-note').style.display = 'none';
    } else {
        noChecklistMessage.style.display = 'none';
        checklistContainer.querySelector('h4').style.display = 'block';
        checklistContainer.querySelector('.checklist-note').style.display = 'block';
        
        container.innerHTML = '';
        
        template.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'checklist-item';
            itemDiv.innerHTML = `
                <input type="checkbox" id="check-${index}" data-item="${item}">
                <label for="check-${index}">${item}</label>
            `;
            container.appendChild(itemDiv);
            
            const checkbox = itemDiv.querySelector('input');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    itemDiv.classList.add('checked');
                } else {
                    itemDiv.classList.remove('checked');
                }
            });
        });
    }
}

// Setup Drag and Drop
function setupDragAndDrop() {
    setTimeout(() => {
        const dropZones = document.querySelectorAll('.drop-zone');
        console.log(`🎯 Setting up drag & drop for ${dropZones.length} zones`);
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('drop', handleDrop);
            zone.addEventListener('dragleave', handleDragLeave);
        });
    }, 100);
}

function handleDragOver(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    if (e.target === this) {
        this.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    const targetStatus = this.dataset.status;
    const task = tasks.find(t => t.id === draggedTaskId);
    
    if (!task) return;
    
    // Check checklist for backlogReady, todo, and inProgress
    if (targetStatus === 'backlogReady' || targetStatus === 'todo' || targetStatus === 'inProgress') {
        const isChecklistComplete = isTaskChecklistComplete(task);
        
        if (!isChecklistComplete) {
            let targetName = 'Ready to Implement';
            if (targetStatus === 'todo' || targetStatus === 'inProgress') {
                targetName = getColumnName(targetStatus);
            }
            showAlert('⚠️ ไม่สามารถย้าย Task ได้', `ไม่สามารถย้าย Task ไปยัง "${targetName}" ได้\n\nต้องเช็ค Readiness Checklist ให้ครบทุกข้อก่อน`);
            renderAllTasks();
            return;
        }
    }
    
    // Check if moving from backlog/backlogReady/todo to other status
    if (task.status === 'backlog' || task.status === 'backlogReady' || task.status === 'todo') {
        if (targetStatus !== 'backlog' && targetStatus !== 'backlogReady' && targetStatus !== 'todo') {
            // Need assignee and estimate hours
            if (!task.assignee || !task.estimateHours) {
                pendingMoveTaskId = draggedTaskId;
                pendingMoveStatus = targetStatus;
                openAssigneeModal();
                return;
            }
        }
    }
    
    // Check if task has blocked or waiting subtasks
    const hasBlockedSubtasks = task.subtasks && task.subtasks.some(s => s.blocked || s.status === 'Blocked' || s.waiting);
    if (hasBlockedSubtasks) {
        const blockedNames = task.subtasks
            .filter(s => s.blocked || s.status === 'Blocked' || s.waiting)
            .map(s => s.title)
            .join(', ');
        showAlert('⚠️ ไม่สามารถย้าย Task ได้', `Task นี้มี Subtask ที่ Blocked หรือ Waiting อยู่:\n\n${blockedNames}\n\nกรุณาแก้ไข Subtask ที่ Blocked/Waiting ให้เสร็จก่อน`);
        renderAllTasks();
        return;
    }

    // Check if moving to done
    if (targetStatus === 'done') {
        if (!task.actualPoints) {
            pendingMoveTaskId = draggedTaskId;
            pendingMoveStatus = targetStatus;
            openActualPointsModal(task.estimatePoints || 0);
            return;
        }
    }

    task.status = targetStatus;
    saveTasks();
    renderAllTasks();
}

// Assignee Modal
function openAssigneeModal() {
    // Refresh member dropdown
    populateMemberDropdowns();

    const task = tasks.find(t => t.id === pendingMoveTaskId);

    // Get current user from localStorage
    const currentUserData = localStorage.getItem('currentUser');
    let defaultAssignee = '';
    if (currentUserData) {
        try {
            const currentUser = JSON.parse(currentUserData);
            defaultAssignee = currentUser.name || '';
            console.log('✅ Current user:', currentUser.name);
        } catch (e) {
            console.error('❌ Error parsing current user:', e);
        }
    } else {
        console.warn('⚠️ No current user in localStorage');
    }

    if (task) {
        // Use current user as default if task doesn't have assignee yet
        const assigneeValue = task.assignee || defaultAssignee;
        console.log('📝 Setting assignee to:', assigneeValue);
        document.getElementById('assigneeInput').value = assigneeValue;
        document.getElementById('estimateInput').value = task.estimateHours || '';
    }
    document.getElementById('assigneeModal').style.display = 'block';

    // Auto-focus on estimate input field
    setTimeout(() => {
        document.getElementById('estimateInput').focus();
        document.getElementById('estimateInput').select();
    }, 100);
}

function closeAssigneeModal(confirmed) {
    if (!confirmed) {
        pendingMoveTaskId = null;
        pendingMoveStatus = null;
    }
    document.getElementById('assigneeModal').style.display = 'none';
}

function confirmAssignee() {
    const assignee = document.getElementById('assigneeInput').value.trim();
    const estimate = parseFloat(document.getElementById('estimateInput').value);

    if (!assignee || !estimate || estimate <= 0) {
        showAlert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่ Assignee และ Estimate Hours');
        return;
    }

    const task = tasks.find(t => t.id === pendingMoveTaskId);
    if (task) {
        task.assignee = assignee;
        task.estimateHours = estimate;
        task.status = pendingMoveStatus;
        saveTasks();
        renderAllTasks();
    }

    closeAssigneeModal(true);
}

// Actual Points Modal
function openActualPointsModal(estimatePoints) {
    document.getElementById('actualPointsInput').value = estimatePoints || '';
    document.getElementById('actualPointsModal').style.display = 'block';
}

function closeActualPointsModal(confirmed) {
    if (!confirmed) {
        pendingMoveTaskId = null;
        pendingMoveStatus = null;
    }
    document.getElementById('actualPointsModal').style.display = 'none';
}

function confirmActualPoints() {
    const actual = parseFloat(document.getElementById('actualPointsInput').value);
    
    if (!actual || actual <= 0) {
        showAlert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่ Actual Points');
        return;
    }
    
    const task = tasks.find(t => t.id === pendingMoveTaskId);
    if (task) {
        task.actualPoints = actual;
        task.status = pendingMoveStatus;
        saveTasks();
        renderAllTasks();
    }
    
    closeActualPointsModal(true);
}

// Check if task checklist is complete
function isTaskChecklistComplete(task) {
    if (!task.checklist || Object.keys(task.checklist).length === 0) {
        return true;
    }
    
    const total = Object.keys(task.checklist).length;
    const checked = Object.values(task.checklist).filter(v => v).length;
    
    return checked === total;
}

function updateActionChecklist() {
    // Skip checklist for dependencies/subtasks
}

// Get Checklist Status
function getChecklistStatus() {
    const checkboxes = document.querySelectorAll('#readinessChecklist input[type="checkbox"]');
    const checklist = {};
    
    checkboxes.forEach(cb => {
        checklist[cb.dataset.item] = cb.checked;
    });
    
    return checklist;
}

// Create Task
function createTask() {
    console.log('➕ Creating new task...');

    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDesc').value.trim();
    const type = document.getElementById('taskType').value;

    // Set default priority based on type mapping
    const priority = priorityMapping[type] || priorities[0];

    // No size field anymore (set to empty string)
    const size = '';
    
    if (!title) {
        showAlert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่ชื่อ Task');
        return;
    }
    
    const checklist = getChecklistStatus();
    const checklistItems = Object.keys(checklist);
    const checkedCount = Object.values(checklist).filter(v => v).length;
    const isComplete = checklistItems.length === 0 || checkedCount === checklistItems.length;

    let status = 'backlog';

    if (isComplete) {
        // Find "To Do" column (or first column if "To Do" doesn't exist)
        const toDoColumn = columns.find(c => c.name === 'To Do' || c.id === 'To Do');
        status = toDoColumn ? toDoColumn.id : (columns[0] ? columns[0].id : 'To Do');
    } else {
        showAlert('⚠️ Readiness Checklist ยังไม่ครบ', 'Task จะถูกสร้างที่ "Need More Details"\n\nเมื่อเช็คครบแล้วจึงสามารถย้ายไป "Ready to Implement" หรือ To Do ได้');
    }
    
    // Get current user
    const currentUserData = localStorage.getItem('currentUser');
    let createdBy = 'Unknown';
    if (currentUserData) {
        try {
            const currentUser = JSON.parse(currentUserData);
            createdBy = currentUser.name || 'Unknown';
        } catch (e) {
            console.error('❌ Error parsing current user:', e);
        }
    }

    const task = {
        id: Date.now(),
        title,
        description,
        type,
        priority,
        size,
        status: status,
        dependencies: [],
        subtasks: [], // Array of {id, title, description, priority, assignee, points, eta, completed, createdAt}
        checklist: checklist,
        assignee: null,
        estimatePoints: null,
        actualPoints: null,
        estimateHours: 0, // Estimate hours for the task
        blocked: false, // Is task blocked?
        createdBy: createdBy, // Who created this task
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasks();
    renderAllTasks();
    closeCreateTaskModal();
    
    console.log('✅ Task created:', task.title);
}

// Render All Tasks
function renderAllTasks() {
    console.log('🎨 Rendering tasks for tab:', currentActiveTab);
    if (currentActiveTab === 'backlog') {
        renderBacklogTasks();
    } else {
        renderCurrentColumns();
    }
}

function renderBacklogTasks() {
    const needDetailsContainer = document.getElementById('backlogNeedDetails');
    const readyContainer = document.getElementById('backlogReady');
    
    let backlogTasks = tasks.filter(t => t.status === 'backlog' || t.status === 'backlogReady');
    
    // Filter by size
    if (currentBacklogFilter !== 'all') {
        backlogTasks = backlogTasks.filter(t => t.size === currentBacklogFilter);
    }
    
    // Split tasks into two groups based on STATUS (not checklist completion)
    const needDetailsTasks = backlogTasks.filter(t => t.status === 'backlog');
    const readyTasks = backlogTasks.filter(t => t.status === 'backlogReady');
    
    // Clear both containers
    if (needDetailsContainer) needDetailsContainer.innerHTML = '';
    if (readyContainer) readyContainer.innerHTML = '';
    
    // Render Need Details tasks
    if (needDetailsContainer) {
        needDetailsTasks.forEach(task => {
            const taskCard = createTaskCard(task);
            needDetailsContainer.appendChild(taskCard);
        });
    }
    
    // Render Ready tasks
    if (readyContainer) {
        readyTasks.forEach(task => {
            const taskCard = createTaskCard(task);
            readyContainer.appendChild(taskCard);
        });
    }
    
    console.log(`📦 Rendered ${needDetailsTasks.length} tasks needing details, ${readyTasks.length} ready tasks`);
}

function renderCurrentColumns() {
    const container = document.getElementById('currentColumns');
    if (!container) {
        console.error('❌ currentColumns container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    // Sort columns by position
    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
    
    sortedColumns.forEach(column => {
        const columnEl = createColumnElement(column);
        container.appendChild(columnEl);
    });
    
    console.log(`📋 Rendered ${sortedColumns.length} columns`);
    
    // Re-setup drag and drop
    setupDragAndDrop();
}

function createColumnElement(column) {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'column drop-zone';
    columnDiv.dataset.status = column.id;
    
    const header = document.createElement('h2');
    header.textContent = column.name;
    columnDiv.appendChild(header);
    
    const tasksList = document.createElement('div');
    tasksList.className = 'tasks-list';
    tasksList.id = column.id;

    // Filter tasks by column status
    let columnTasks = tasks.filter(t => t.status === column.id);

    // Always sort blocked/waiting tasks to top
    columnTasks.sort((a, b) => {
        const aBlocked = a.blocked || (a.subtasks && a.subtasks.some(s => s.blocked || s.status === 'Blocked' || s.waiting));
        const bBlocked = b.blocked || (b.subtasks && b.subtasks.some(s => s.blocked || s.status === 'Blocked' || s.waiting));

        if (aBlocked && !bBlocked) return -1; // a comes first
        if (!aBlocked && bBlocked) return 1;  // b comes first
        return 0; // keep original order
    });

    // If "To Do" column has no tasks, show placeholder card
    if ((column.name === 'To Do' || column.id === 'To Do') && columnTasks.length === 0) {
        const placeholderCard = document.createElement('div');
        placeholderCard.className = 'task-card placeholder-card';
        placeholderCard.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #94a3b8; cursor: pointer;">
                <div style="font-size: 48px; margin-bottom: 10px;">➕</div>
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 5px;">เพิ่ม Task ใหม่</div>
                <div style="font-size: 13px;">คลิกที่นี่เพื่อสร้าง Task</div>
            </div>
        `;
        placeholderCard.onclick = () => {
            openCreateTaskModal();
        };
        tasksList.appendChild(placeholderCard);
    } else {
        columnTasks.forEach(task => {
            const taskCard = createTaskCard(task);
            tasksList.appendChild(taskCard);
        });
    }

    columnDiv.appendChild(tasksList);

    return columnDiv;
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.id = task.id;
    card.dataset.taskId = task.id;
    card.draggable = true;

    const isExpanded = currentTaskId === task.id;
    if (isExpanded) {
        card.classList.add('expanded');
    }

    // Check if task or any subtask is blocked or waiting
    const isBlocked = task.blocked || (task.subtasks && task.subtasks.some(s => s.blocked || s.status === 'Blocked' || s.waiting));
    if (isBlocked) {
        card.classList.add('blocked');
    }

    if (!isTaskChecklistComplete(task)) {
        card.classList.add('checklist-incomplete');
    }
    
    card.addEventListener('dragstart', (e) => {
        draggedTaskId = task.id;
        card.classList.add('dragging');
    });
    
    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedTaskId = null;
    });
    
    // Task Header
    const header = document.createElement('div');
    header.className = 'task-header';

    // Left section - Title and Description
    const titleSection = document.createElement('div');
    titleSection.className = 'task-title-section';

    // Title row with type badge
    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const typeBadge = document.createElement('span');
    typeBadge.className = 'badge badge-type';
    typeBadge.textContent = task.type;
    typeBadge.style.flexShrink = '0';
    titleRow.appendChild(typeBadge);

    const title = document.createElement('div');
    title.className = 'task-title-editable';
    title.textContent = task.title;
    title.style.flex = '1';
    title.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        editTaskTitle(task.id, title);
    });
    titleRow.appendChild(title);

    titleSection.appendChild(titleRow);

    const desc = document.createElement('div');
    desc.className = task.description ? 'task-description-editable' : 'task-description-editable empty';
    desc.textContent = task.description || 'Double-click to add description';
    desc.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        editTaskDescription(task.id, desc);
    });
    titleSection.appendChild(desc);

    header.appendChild(titleSection);

    // Right section - Only Assignee avatar
    const metaSection = document.createElement('div');
    metaSection.className = 'task-meta-section';

    // Assignee avatars (circular) - Support multiple assignees with overlapping effect
    const assignees = getTaskAssignees(task);
    const avatarsWrapper = document.createElement('div');
    avatarsWrapper.style.cssText = `
        display: flex;
        align-items: center;
        margin-top: 8px;
        position: relative;
    `;

    const members = getMembers();
    const maxVisible = 3;
    const visibleAssignees = assignees.slice(0, maxVisible);
    const remainingCount = assignees.length - maxVisible;

    visibleAssignees.forEach((assigneeName, index) => {
        const initials = assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const color = getMemberColor(assigneeName);

        const avatarWrapper = document.createElement('div');
        avatarWrapper.className = 'assignee-avatar-wrapper';
        avatarWrapper.style.cssText = `
            position: relative;
            margin-left: ${index > 0 ? '-8px' : '0'};
            z-index: ${maxVisible - index};
        `;

        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'task-assignee-avatar';
        avatarContainer.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 11px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            cursor: pointer;
        `;
        avatarContainer.textContent = initials;
        avatarContainer.title = assigneeName;

        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-assignee-btn';
        removeBtn.style.cssText = `
            display: none;
            position: absolute;
            top: -4px;
            right: -4px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ef4444;
            color: white;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            z-index: 100;
        `;
        removeBtn.textContent = '×';
        removeBtn.title = `Remove ${assigneeName}`;
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            removeAssignee(task.id, assigneeName);
        };

        avatarWrapper.onmouseover = () => {
            removeBtn.style.display = 'flex';
        };
        avatarWrapper.onmouseout = () => {
            removeBtn.style.display = 'none';
        };

        avatarWrapper.appendChild(avatarContainer);
        avatarWrapper.appendChild(removeBtn);
        avatarsWrapper.appendChild(avatarWrapper);
    });

    if (remainingCount > 0) {
        const moreAvatar = document.createElement('div');
        moreAvatar.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #e5e7eb;
            color: #374151;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 11px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-left: -8px;
            position: relative;
            z-index: 0;
        `;
        moreAvatar.textContent = `+${remainingCount}`;
        moreAvatar.title = `${remainingCount} more assignee${remainingCount > 1 ? 's' : ''}`;
        avatarsWrapper.appendChild(moreAvatar);
    }

    // Always show + button to add assignees
    const addButton = document.createElement('div');
    addButton.className = 'assignee-add-btn';
    addButton.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #f3f4f6;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 600;
        border: 2px dashed #d1d5db;
        margin-left: ${assignees.length > 0 ? '-8px' : '0'};
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        z-index: 0;
    `;
    addButton.textContent = '+';
    addButton.title = 'Add assignee';
    addButton.onmouseover = () => {
        addButton.style.background = '#e5e7eb';
        addButton.style.borderColor = '#9ca3af';
    };
    addButton.onmouseout = () => {
        addButton.style.background = '#f3f4f6';
        addButton.style.borderColor = '#d1d5db';
    };
    addButton.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        openAssigneesModal(task.id);
    };
    avatarsWrapper.appendChild(addButton);

    metaSection.appendChild(avatarsWrapper);

    header.appendChild(metaSection);
    
    card.appendChild(header);

    // Subtasks Summary (show only when NOT expanded)
    if (!isExpanded && task.subtasks && task.subtasks.length > 0) {
        const completedCount = task.subtasks.filter(s => s.completed).length;
        const totalCount = task.subtasks.length;
        const progressPercent = (completedCount / totalCount) * 100;
        const blockedOrWaitingSubtasks = task.subtasks.filter(s => s.blocked || s.status === 'Blocked' || s.waiting);

        const subtaskSummary = document.createElement('div');
        subtaskSummary.className = 'subtask-summary';

        const summaryText = document.createElement('div');
        summaryText.className = 'subtask-summary-text';

        // Show blocked/waiting subtask names if any, otherwise show count
        if (blockedOrWaitingSubtasks.length > 0) {
            if (blockedOrWaitingSubtasks.length === 1) {
                // Single blocked task - show inline
                summaryText.textContent = `🚫 ${blockedOrWaitingSubtasks[0].title}`;
            } else {
                // Multiple blocked tasks - show each on new line
                summaryText.innerHTML = blockedOrWaitingSubtasks
                    .map(s => `<div style="margin: 2px 0;">🚫 ${s.title}</div>`)
                    .join('');
            }
            summaryText.style.color = '#ef4444';
            summaryText.style.fontWeight = '600';
        } else {
            summaryText.textContent = `📋 ${completedCount}/${totalCount} subtasks`;
        }

        const progressBar = document.createElement('div');
        progressBar.className = 'subtask-progress-bar';
        const progressFill = document.createElement('div');
        progressFill.className = 'subtask-progress-fill';
        progressFill.style.width = `${progressPercent}%`;
        progressBar.appendChild(progressFill);

        subtaskSummary.appendChild(summaryText);
        subtaskSummary.appendChild(progressBar);
        card.appendChild(subtaskSummary);
    }

    // Dependencies
    if (task.dependencies.length > 0) {
        const depsDiv = document.createElement('div');
        depsDiv.className = 'dependencies-list';
        const depsTitle = document.createElement('h4');
        depsTitle.textContent = '⛓️ Dependencies:';
        depsDiv.appendChild(depsTitle);
        
        task.dependencies.forEach(depId => {
            const depTask = tasks.find(t => t.id === depId);
            if (depTask) {
                const depItem = document.createElement('div');
                depItem.className = 'dep-item';
                depItem.textContent = `→ ${depTask.title}`;
                depsDiv.appendChild(depItem);
            }
        });
        
        card.appendChild(depsDiv);
    }
    
    // Subtasks - Always show section when expanded
    if (isExpanded) {
        const subsDiv = document.createElement('div');
        subsDiv.className = 'subtasks-list';
        subsDiv.id = `subtasks-${task.id}`;

        const subsHeader = document.createElement('div');
        subsHeader.className = 'subtasks-header';

        const completedCount = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;
        const totalCount = task.subtasks ? task.subtasks.length : 0;

        const subsTitle = document.createElement('h4');
        subsTitle.textContent = `📋 Subtasks${totalCount > 0 ? ` (${completedCount}/${totalCount})` : ''}`;
        subsHeader.appendChild(subsTitle);

        if (totalCount > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'subtask-progress-bar';
            const progressFill = document.createElement('div');
            progressFill.className = 'subtask-progress-fill';
            progressFill.style.width = `${(completedCount / totalCount) * 100}%`;
            progressBar.appendChild(progressFill);
            subsHeader.appendChild(progressBar);
        }

        subsDiv.appendChild(subsHeader);

        // Render existing subtasks
        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach(subtask => {
                const subItem = document.createElement('div');
                subItem.className = 'subtask-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = subtask.completed;
                checkbox.className = 'subtask-checkbox';
                checkbox.onclick = (e) => {
                    e.stopPropagation();
                    toggleSubtask(task.id, subtask.id);
                };

                const subTitle = document.createElement('span');
                subTitle.className = subtask.completed ? 'subtask-title completed' : 'subtask-title';
                subTitle.textContent = subtask.title;

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'subtask-delete-btn';
                deleteBtn.textContent = '✕';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteSubtask(task.id, subtask.id);
                };

                subItem.appendChild(checkbox);
                subItem.appendChild(subTitle);
                subItem.appendChild(deleteBtn);
                subsDiv.appendChild(subItem);
            });
        }

        // Add inline input for new subtask
        const addSubtaskDiv = document.createElement('div');
        addSubtaskDiv.className = 'add-subtask-inline';

        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.className = 'add-subtask-input';
        addInput.placeholder = '+ Add subtask (press Enter)';
        addInput.onclick = (e) => e.stopPropagation();
        addInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.stopPropagation();
                addSubtaskInline(task.id, addInput);
            }
        };

        addSubtaskDiv.appendChild(addInput);
        subsDiv.appendChild(addSubtaskDiv);

        card.appendChild(subsDiv);
    }
    
    // Action Buttons - Removed blocked toggle and dependency button
    
    // Click to expand/collapse
    card.addEventListener('click', (e) => {
        // Don't navigate if clicking on interactive elements
        if (!e.target.classList.contains('action-btn') &&
            !e.target.classList.contains('task-title-editable') &&
            !e.target.classList.contains('task-description-editable') &&
            !e.target.classList.contains('task-checklist-expand') &&
            !e.target.closest('.task-checklist-expand') &&
            !e.target.closest('.subtasks-list') &&
            !e.target.closest('.dependencies-list') &&
            e.target.tagName !== 'BUTTON' &&
            e.target.tagName !== 'INPUT' &&
            e.target.tagName !== 'TEXTAREA') {
            // Navigate to detail page (clean URL)
            window.location.href = `/task-detail?id=${task.id}`;
        }
    });
    
    // Right click to open detail
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openTaskDetail(task.id);
    });
    
    return card;
}

// Create Checklist Expand Element
function createChecklistExpand(task) {
    const expandDiv = document.createElement('div');
    expandDiv.className = 'task-checklist-expand';
    
    const total = Object.keys(task.checklist).length;
    const checked = Object.values(task.checklist).filter(v => v).length;
    const isComplete = checked === total;
    
    const header = document.createElement('div');
    header.className = 'task-checklist-expand-header';
    header.innerHTML = `
        <span>📋 Checklist: ${checked}/${total} ${isComplete ? '✅' : '⚠️'}</span>
        <span>▼</span>
    `;
    expandDiv.appendChild(header);
    
    const content = document.createElement('div');
    content.className = 'task-checklist-expand-content';
    
    Object.entries(task.checklist).forEach(([item, isChecked]) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `task-checklist-expand-item ${isChecked ? 'checked' : ''}`;
        itemDiv.textContent = `${isChecked ? '✅' : '❌'} ${item}`;
        content.appendChild(itemDiv);
    });
    
    expandDiv.appendChild(content);
    
    expandDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        content.classList.toggle('expanded');
        const arrow = header.querySelector('span:last-child');
        arrow.textContent = content.classList.contains('expanded') ? '▲' : '▼';
    });
    
    return expandDiv;
}

// Edit Task Title
function editTaskTitle(taskId, element) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const currentTitle = task.title;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.style.width = '100%';
    input.style.font = 'inherit';
    input.style.padding = '2px 4px';
    input.style.border = '2px solid #667eea';
    input.style.borderRadius = '3px';
    
    element.replaceWith(input);
    input.focus();
    input.select();
    
    const saveEdit = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
            task.title = newTitle;
            saveTasks();
        }
        renderAllTasks();
    };
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            renderAllTasks();
        }
    });
}

// Edit Task Description
function editTaskDescription(taskId, element) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const currentDesc = task.description || '';
    const textarea = document.createElement('textarea');
    textarea.value = currentDesc;
    textarea.style.width = '100%';
    textarea.style.font = 'inherit';
    textarea.style.padding = '2px 4px';
    textarea.style.border = '2px solid #667eea';
    textarea.style.borderRadius = '3px';
    textarea.style.minHeight = '60px';
    textarea.style.resize = 'vertical';
    
    element.replaceWith(textarea);
    textarea.focus();
    
    const saveEdit = () => {
        const newDesc = textarea.value.trim();
        task.description = newDesc;
        saveTasks();
        renderAllTasks();
    };
    
    textarea.addEventListener('blur', saveEdit);
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            renderAllTasks();
        }
    });
}

// Open Task Detail Modal
function openTaskDetail(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const modal = document.getElementById('taskModal');
    const content = document.getElementById('taskDetailContent');
    
    const isChecklistComplete = isTaskChecklistComplete(task);
    
    let checklistHTML = '';
    if (task.checklist && Object.keys(task.checklist).length > 0) {
        const items = Object.entries(task.checklist);
        const checked = items.filter(([_, v]) => v).length;
        checklistHTML = `
            <div style="margin-top: 15px; padding: 15px; background: ${isChecklistComplete ? '#e8f5e9' : '#ffebee'}; border-radius: 5px;">
                <h4 style="color: ${isChecklistComplete ? '#2e7d32' : '#c62828'}; margin-bottom: 10px;">
                    📋 Readiness Checklist (${checked}/${items.length}) ${isChecklistComplete ? '✅' : '⚠️'}
                </h4>
                ${items.map(([item, isChecked]) => `
                    <div style="padding: 5px 0; color: ${isChecked ? '#2e7d32' : '#c62828'};">
                        ${isChecked ? '✅' : '❌'} ${item}
                    </div>
                `).join('')}
                ${!isChecklistComplete ? '<p style="margin-top: 10px; color: #c62828; font-size: 12px;">⚠️ ต้องเช็คครบก่อนย้ายไป To Do/In Progress</p>' : ''}
            </div>
        `;
    }
    
    const canMoveToTodoOrProgress = isChecklistComplete;
    
    // Status buttons
    let statusButtonsHTML = '<div class="status-buttons">';
    statusButtonsHTML += `<button class="status-btn backlog" onclick="changeTaskStatus(${task.id}, 'backlog')">⚠️ Need Details</button>`;
    statusButtonsHTML += `<button class="status-btn backlog" onclick="changeTaskStatus(${task.id}, 'backlogReady')" ${!canMoveToTodoOrProgress ? 'disabled' : ''}>
        ✅ Ready ${!canMoveToTodoOrProgress ? '🔒' : ''}
    </button>`;
    
    columns.forEach(column => {
        const disabled = (column.id === 'todo' || column.id === 'inProgress') && !canMoveToTodoOrProgress;
        statusButtonsHTML += `<button class="status-btn ${column.id}" onclick="changeTaskStatus(${task.id}, '${column.id}')" ${disabled ? 'disabled' : ''}>
            ${column.name} ${disabled ? '🔒' : ''}
        </button>`;
    });
    
    statusButtonsHTML += '</div>';
    
    content.innerHTML = `
        <h2>${task.title}</h2>
        <div class="task-badges">
            <span class="badge badge-type">${task.type}</span>
            <span class="badge badge-priority ${task.priority.toLowerCase()}">${task.priority}</span>
            ${task.size ? `<span class="badge badge-size">${task.size}</span>` : ''}
        </div>
        ${task.assignee ? `<p style="margin-top: 10px;"><strong>Assignee:</strong> ${task.assignee}</p>` : ''}
        ${task.estimatePoints ? `<p><strong>Estimate:</strong> ${task.estimatePoints} points</p>` : ''}
        ${task.actualPoints ? `<p><strong>Actual:</strong> ${task.actualPoints} points</p>` : ''}
        ${task.description ? `<p style="margin-top: 15px; color: #666;">${task.description}</p>` : ''}
        ${checklistHTML}
        ${statusButtonsHTML}
        
        <button class="btn-primary delete-btn" onclick="deleteTask(${task.id})">
            🗑️ ลบ Task
        </button>
    `;
    
    modal.style.display = 'block';
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

// Change Task Status
function changeTaskStatus(taskId, newStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if ((newStatus === 'backlogReady' || newStatus === 'todo' || newStatus === 'inProgress') && !isTaskChecklistComplete(task)) {
        let statusName = newStatus === 'backlogReady' ? 'Ready to Implement' : getColumnName(newStatus);
        showAlert('⚠️ ไม่สามารถย้าย Task ได้', `ไม่สามารถย้าย Task ไปยัง "${statusName}" ได้\n\nต้องเช็ค Readiness Checklist ให้ครบทุกข้อก่อน`);
        return;
    }
    
    task.status = newStatus;
    saveTasks();
    renderAllTasks();
    closeTaskModal();
}

// Delete Task
function deleteTask(taskId) {
    showConfirm('🗑️ ยืนยันการลบ', 'คุณแน่ใจหรือไม่ที่จะลบ Task นี้?', (confirmed) => {
        if (confirmed) {
            tasks.forEach(task => {
                task.dependencies = task.dependencies.filter(id => id !== taskId);
                task.subtasks = task.subtasks.filter(id => id !== taskId);
            });
            
            tasks = tasks.filter(t => t.id !== taskId);
            
            saveTasks();
            renderAllTasks();
            closeTaskModal();
        }
    });
}

// Open Action Modal
function openActionModal(type, parentId) {
    // Only allow dependency modal, not subtask
    if (type === 'subtask') {
        console.log('⚠️ Subtask modal disabled - use inline input instead');
        return;
    }

    actionType = type;
    actionParentId = parentId;

    const modal = document.getElementById('actionModal');
    const title = document.getElementById('actionTitle');

    title.textContent = '⛓️ สร้าง Dependency Task';

    document.getElementById('actionTaskTitle').value = '';
    document.getElementById('actionTaskDesc').value = '';

    modal.style.display = 'block';
}

function closeActionModal() {
    document.getElementById('actionModal').style.display = 'none';
    actionType = null;
    actionParentId = null;
}

// Create Action Task (Dependencies only now)
function createActionTask() {
    const title = document.getElementById('actionTaskTitle').value.trim();
    const description = document.getElementById('actionTaskDesc').value.trim();
    const type = document.getElementById('actionTaskType').value;
    const priority = document.getElementById('actionTaskPriority').value;

    if (!title) {
        showAlert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่ชื่อ Task');
        return;
    }

    const parentTask = tasks.find(t => t.id === actionParentId);
    if (!parentTask) return;

    // Only create dependencies now (subtasks use inline input)
    if (actionType === 'dependency') {
        const newTask = {
            id: Date.now(),
            title,
            description,
            type,
            priority,
            size: '',
            status: 'backlog',
            dependencies: [],
            subtasks: [],
            checklist: {},
            assignee: null,
            estimatePoints: null,
            actualPoints: null,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        parentTask.dependencies.push(newTask.id);

        console.log('✅ Dependency created:', title);

        saveTasks();
        renderAllTasks();
        closeActionModal();
    }
}

// Toggle Subtask
function toggleSubtask(taskId, subtaskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (subtask) {
        subtask.completed = !subtask.completed;
        saveTasks();
        renderAllTasks();

        // Also update table view if active
        if (isTableView) {
            renderTasksTable();
        }

        console.log(`✅ Subtask ${subtask.completed ? 'completed' : 'uncompleted'}:`, subtask.title);
    }
}

// Delete Subtask
function deleteSubtask(taskId, subtaskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return;

    if (confirm(`Delete subtask "${subtask.title}"?`)) {
        task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
        saveTasks();
        renderAllTasks();

        // Always update table view to recalculate due dates from remaining subtasks
        if (isTableView) {
            renderTasksTable();
        }

        console.log('🗑️ Subtask deleted, table will recalculate due dates from remaining subtasks');

        console.log('🗑️ Subtask deleted:', subtask.title);
    }
}

// Add Subtask Inline (ClickUp style)
function addSubtaskInline(taskId, inputElement) {
    const title = inputElement.value.trim();

    if (!title) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.subtasks) {
        task.subtasks = [];
    }

    const newSubtask = {
        id: Date.now(),
        title,
        description: '',
        assignee: '',
        points: 0,
        startDate: '',
        endDate: '',
        estimateHours: 0,
        completed: false,
        waiting: false, // Waiting state (like blocked)
        createdAt: new Date().toISOString()
    };

    task.subtasks.push(newSubtask);
    saveTasks();

    // Clear input
    inputElement.value = '';

    // Re-render only this task to keep it expanded
    renderAllTasks();

    // Also update table view if active
    if (isTableView) {
        renderTasksTable();
    }

    console.log('✅ Subtask added inline:', title);
}

// Track expanded row in table
let expandedTableTaskId = null;

// Toggle subtask expansion in table view
function toggleSubtasksInTable(taskId, event) {
    if (event) event.stopPropagation();

    // Toggle expansion
    if (expandedTableTaskId === taskId) {
        expandedTableTaskId = null;
    } else {
        expandedTableTaskId = taskId;
    }

    renderTasksTable();
}

// Create subtask expansion row for table
function createSubtaskExpansionRow(task) {
    const tr = document.createElement('tr');
    tr.className = 'subtask-expansion-row';

    const td = document.createElement('td');
    td.colSpan = 8;
    td.style.padding = '15px 20px';
    td.style.background = '#f9fafb';
    td.style.borderTop = 'none';

    const container = document.createElement('div');
    container.className = 'table-subtasks-container';

    // Add header row for subtasks
    const headerRow = document.createElement('div');
    headerRow.className = 'subtask-header-row';
    headerRow.style.display = 'grid';
    headerRow.style.gridTemplateColumns = '80px 1fr 120px 100px 100px 70px 80px 40px';
    headerRow.style.gap = '10px';
    headerRow.style.padding = '6px 10px';
    headerRow.style.background = '#f3f4f6';
    headerRow.style.borderRadius = '6px';
    headerRow.style.marginBottom = '6px';
    headerRow.style.fontWeight = '600';
    headerRow.style.fontSize = '11px';
    headerRow.style.color = '#6b7280';
    headerRow.style.textTransform = 'uppercase';
    headerRow.innerHTML = `
        <div>Status</div>
        <div>Title</div>
        <div>Assignee</div>
        <div>Start Date</div>
        <div>End Date</div>
        <div>Points</div>
        <div>Hours</div>
        <div></div>
    `;
    container.appendChild(headerRow);

    // Render existing subtasks as mini table rows
    if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach((subtask, index) => {
            const subRow = document.createElement('div');
            subRow.className = 'subtask-row';
            subRow.style.display = 'grid';
            subRow.style.gridTemplateColumns = '80px 1fr 120px 100px 100px 70px 80px 40px';
            subRow.style.gap = '10px';
            subRow.style.alignItems = 'center';
            subRow.style.padding = '6px 10px';
            subRow.style.background = 'white';
            subRow.style.borderRadius = '6px';
            subRow.style.marginBottom = '4px';

            // 3-State Status Buttons
            const statusButtons = document.createElement('div');
            statusButtons.style.display = 'flex';
            statusButtons.style.gap = '4px';

            // Determine current state
            const currentState = subtask.waiting ? 'waiting' : (subtask.completed ? 'done' : 'notStarted');

            // Done Button
            const doneBtn = document.createElement('button');
            doneBtn.textContent = '✓';
            doneBtn.title = 'Done';
            doneBtn.style.padding = '4px 8px';
            doneBtn.style.border = '2px solid ' + (currentState === 'done' ? '#10b981' : 'transparent');
            doneBtn.style.borderRadius = '4px';
            doneBtn.style.background = currentState === 'done' ? '#d1fae5' : '#f3f4f6';
            doneBtn.style.cursor = 'pointer';
            doneBtn.style.fontSize = '14px';
            doneBtn.style.boxSizing = 'border-box';
            doneBtn.style.minWidth = '32px';
            doneBtn.onclick = (e) => {
                e.stopPropagation();

                // Update data
                subtask.completed = true;
                subtask.waiting = false;
                subtask.blocked = false; // Clear blocked flag when marking as done
                if (subtask.status === 'Blocked') {
                    subtask.status = 'Done'; // Change status from Blocked to Done
                }
                saveTasks();

                // Update UI immediately
                doneBtn.style.border = '2px solid #10b981';
                doneBtn.style.background = '#d1fae5';
                waitingBtn.style.border = '2px solid transparent';
                waitingBtn.style.background = '#f3f4f6';

                // Update progress bar and kanban board without full re-render
                updateTaskProgress(task.id);

                // Re-render kanban to update blocked status
                renderAllTasks();
            };

            // Waiting Button
            const waitingBtn = document.createElement('button');
            waitingBtn.textContent = '⏸';
            waitingBtn.title = 'Waiting';
            waitingBtn.style.padding = '4px 8px';
            waitingBtn.style.border = '2px solid ' + (currentState === 'waiting' ? '#f59e0b' : 'transparent');
            waitingBtn.style.borderRadius = '4px';
            waitingBtn.style.background = currentState === 'waiting' ? '#fef3c7' : '#f3f4f6';
            waitingBtn.style.cursor = 'pointer';
            waitingBtn.style.fontSize = '14px';
            waitingBtn.style.boxSizing = 'border-box';
            waitingBtn.style.minWidth = '32px';
            waitingBtn.onclick = (e) => {
                e.stopPropagation();

                // Update data
                subtask.waiting = true;
                subtask.completed = false;
                subtask.blocked = false; // Clear blocked flag when marking as waiting
                if (subtask.status === 'Blocked') {
                    subtask.status = 'In Progress'; // Change status from Blocked to In Progress
                }
                saveTasks();

                // Update UI immediately
                waitingBtn.style.border = '2px solid #f59e0b';
                waitingBtn.style.background = '#fef3c7';
                doneBtn.style.border = '2px solid transparent';
                doneBtn.style.background = '#f3f4f6';

                // Update progress bar and kanban board without full re-render
                updateTaskProgress(task.id);

                // Re-render kanban to update blocked status
                renderAllTasks();
            };

            statusButtons.appendChild(doneBtn);
            statusButtons.appendChild(waitingBtn);

            // Title (editable)
            const titleDiv = document.createElement('div');
            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.value = subtask.title;
            titleInput.className = subtask.completed ? 'subtask-title-input completed' : 'subtask-title-input';
            titleInput.style.width = '100%';
            titleInput.style.border = 'none';
            titleInput.style.background = 'transparent';
            titleInput.style.fontSize = '13px';
            titleInput.onchange = () => updateSubtaskField(task.id, subtask.id, 'title', titleInput.value);
            titleInput.onclick = (e) => e.stopPropagation();
            titleDiv.appendChild(titleInput);

            // Status
            const statusSelect = document.createElement('select');
            statusSelect.style.fontSize = '12px';
            statusSelect.style.padding = '4px';
            statusSelect.innerHTML = `
                <option value="">-</option>
                <option value="To Do" ${subtask.status === 'To Do' ? 'selected' : ''}>To Do</option>
                <option value="In Progress" ${subtask.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Done" ${subtask.status === 'Done' ? 'selected' : ''}>Done</option>
                <option value="Blocked" ${subtask.status === 'Blocked' ? 'selected' : ''}>🚫 Blocked</option>
            `;
            statusSelect.onchange = () => {
                updateSubtaskField(task.id, subtask.id, 'status', statusSelect.value);
                // Auto-set blocked flag if status is Blocked
                if (statusSelect.value === 'Blocked') {
                    updateSubtaskField(task.id, subtask.id, 'blocked', true);
                } else if (subtask.blocked && statusSelect.value !== 'Blocked') {
                    updateSubtaskField(task.id, subtask.id, 'blocked', false);
                }
            };
            statusSelect.onclick = (e) => e.stopPropagation();

            // Priority
            const prioritySelect = document.createElement('select');
            prioritySelect.style.fontSize = '12px';
            prioritySelect.style.padding = '4px';
            prioritySelect.innerHTML = `
                <option value="">-</option>
                <option value="High" ${subtask.priority === 'High' ? 'selected' : ''}>High</option>
                <option value="Medium" ${subtask.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                <option value="Low" ${subtask.priority === 'Low' ? 'selected' : ''}>Low</option>
            `;
            prioritySelect.onchange = () => updateSubtaskField(task.id, subtask.id, 'priority', prioritySelect.value);
            prioritySelect.onclick = (e) => e.stopPropagation();

            // Assignee
            const assigneeSelect = document.createElement('select');
            assigneeSelect.style.fontSize = '12px';
            assigneeSelect.style.padding = '4px';
            const members = getMembers();
            assigneeSelect.innerHTML = `
                <option value="">-</option>
                ${members.map(m => `<option value="${m.name}" ${subtask.assignee === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}
            `;
            assigneeSelect.onchange = () => updateSubtaskField(task.id, subtask.id, 'assignee', assigneeSelect.value);
            assigneeSelect.onclick = (e) => e.stopPropagation();

            // Start Date
            const startDateInput = document.createElement('input');
            startDateInput.type = 'date';
            startDateInput.value = subtask.startDate || '';
            startDateInput.style.fontSize = '12px';
            startDateInput.style.padding = '4px';
            startDateInput.style.width = '100%';
            startDateInput.onchange = () => updateSubtaskField(task.id, subtask.id, 'startDate', startDateInput.value);
            startDateInput.onclick = (e) => e.stopPropagation();

            // End Date
            const endDateInput = document.createElement('input');
            endDateInput.type = 'date';
            endDateInput.value = subtask.endDate || '';
            endDateInput.style.fontSize = '12px';
            endDateInput.style.padding = '4px';
            endDateInput.style.width = '100%';
            endDateInput.onchange = () => updateSubtaskField(task.id, subtask.id, 'endDate', endDateInput.value);
            endDateInput.onclick = (e) => e.stopPropagation();

            // Points
            const pointsInput = document.createElement('input');
            pointsInput.type = 'number';
            pointsInput.min = '0';
            pointsInput.value = subtask.points || '';
            pointsInput.placeholder = '0';
            pointsInput.style.width = '50px';
            pointsInput.style.fontSize = '12px';
            pointsInput.style.padding = '4px';
            pointsInput.onchange = () => updateSubtaskField(task.id, subtask.id, 'points', pointsInput.value);
            pointsInput.onclick = (e) => e.stopPropagation();

            // Estimate Hours
            const estimateHoursInput = document.createElement('input');
            estimateHoursInput.type = 'number';
            estimateHoursInput.min = '0';
            estimateHoursInput.step = '0.5';
            estimateHoursInput.value = subtask.estimateHours || '';
            estimateHoursInput.placeholder = '0';
            estimateHoursInput.style.width = '70px';
            estimateHoursInput.style.fontSize = '12px';
            estimateHoursInput.style.padding = '4px';
            estimateHoursInput.onchange = () => updateSubtaskField(task.id, subtask.id, 'estimateHours', estimateHoursInput.value);
            estimateHoursInput.onclick = (e) => e.stopPropagation();

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'subtask-delete-btn';
            deleteBtn.textContent = '✕';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteSubtaskFromTable(task.id, subtask.id);
            };

            subRow.appendChild(statusButtons);
            subRow.appendChild(titleDiv);
            subRow.appendChild(assigneeSelect);
            subRow.appendChild(startDateInput);
            subRow.appendChild(endDateInput);
            subRow.appendChild(pointsInput);
            subRow.appendChild(estimateHoursInput);
            subRow.appendChild(deleteBtn);

            container.appendChild(subRow);
        });
    }

    // Add input for new subtask
    const addDiv = document.createElement('div');
    addDiv.style.marginTop = '10px';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'add-subtask-input';
    input.placeholder = '+ Add subtask (press Enter)';
    input.style.width = '30%';
    input.onclick = (e) => e.stopPropagation();
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
            addSubtaskInTable(task.id, input);
        }
    };

    addDiv.appendChild(input);
    container.appendChild(addDiv);

    td.appendChild(container);
    tr.appendChild(td);

    return tr;
}

// Update task progress bar and summary without full re-render
function updateTaskProgress(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const completedCount = task.subtasks.filter(s => s.completed).length;
    const totalCount = task.subtasks.length;
    const progressPercent = (completedCount / totalCount) * 100;

    // Update subtask summary in table view
    const tableRow = document.querySelector(`tr[data-task-id="${taskId}"]`);
    if (tableRow) {
        const subtaskCell = tableRow.querySelector('.table-subtasks-cell');
        if (subtaskCell) {
            const summaryCount = subtaskCell.querySelector('.table-subtasks-count');
            if (summaryCount) {
                summaryCount.textContent = `${completedCount}/${totalCount}`;
            }

            // Update remaining hours
            const totalEstimateHours = task.subtasks.reduce((sum, s) => sum + (parseFloat(s.estimateHours) || 0), 0);
            const completedHours = task.subtasks.filter(s => s.completed).reduce((sum, s) => sum + (parseFloat(s.estimateHours) || 0), 0);
            const remainingHours = totalEstimateHours - completedHours;
            const remainingText = subtaskCell.querySelector('.table-subtasks-summary span:last-child');
            if (remainingText) {
                remainingText.textContent = `${remainingHours.toFixed(1)}h remaining`;
            }
        }
    }

    // Update progress bar in kanban board
    const taskCard = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
    if (taskCard) {
        const summaryText = taskCard.querySelector('.subtask-summary-text');
        const progressFill = taskCard.querySelector('.subtask-progress-fill');

        // Check if there are any blocked or waiting subtasks
        const blockedOrWaitingSubtasks = task.subtasks.filter(s => s.blocked || s.status === 'Blocked' || s.waiting);

        if (summaryText) {
            if (blockedOrWaitingSubtasks.length > 0) {
                summaryText.textContent = `🚫 ${blockedOrWaitingSubtasks.map(s => s.title).join(', ')}`;
                summaryText.style.color = '#ef4444';
                summaryText.style.fontWeight = '600';
            } else {
                summaryText.textContent = `📋 ${completedCount}/${totalCount} subtasks`;
                summaryText.style.color = ''; // Reset color
                summaryText.style.fontWeight = ''; // Reset font weight
            }
        }

        if (progressFill) {
            progressFill.style.width = `${progressPercent}%`;
        }

        // Update expanded subtasks section if exists
        const subtasksTitle = taskCard.querySelector('.subtasks-header h4');
        if (subtasksTitle) {
            subtasksTitle.textContent = `📋 Subtasks${totalCount > 0 ? ` (${completedCount}/${totalCount})` : ''}`;
        }

        const expandedProgressFill = taskCard.querySelector('.subtasks-header .subtask-progress-fill');
        if (expandedProgressFill) {
            expandedProgressFill.style.width = `${progressPercent}%`;
        }
    }
}

// Update subtask field
function updateSubtaskField(taskId, subtaskId, field, value) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return;

    if (field === 'points') {
        subtask[field] = parseInt(value) || 0;
    } else if (field === 'estimateHours') {
        subtask[field] = parseFloat(value) || 0;
    } else if (field === 'blocked') {
        subtask[field] = value === true || value === 'true';
    } else {
        subtask[field] = value;
    }

    saveTasks();

    // For completed/waiting changes from buttons, don't re-render (buttons handle UI update themselves)
    // Only re-render for other field changes
    if (field === 'completed' || field === 'waiting') {
        // Don't re-render, updateTaskProgress will be called from button click
        console.log(`✅ Updated subtask ${field}:`, value);
        return;
    }

    // Re-render table to update remaining hours, blocked status, or due date from subtasks
    if (isTableView && (field === 'estimateHours' || field === 'status' || field === 'blocked' || field === 'endDate')) {
        renderTasksTable();
    }

    // Re-render all tasks if blocked status changed (to update card colors)
    if (field === 'blocked' || field === 'status') {
        renderAllTasks();
    }

    console.log(`✅ Updated subtask ${field}:`, value);
}

// Add subtask from table input
function addSubtaskInTable(taskId, inputElement) {
    const title = inputElement.value.trim();

    if (!title) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.subtasks) {
        task.subtasks = [];
    }

    const newSubtask = {
        id: Date.now(),
        title,
        description: '',
        assignee: '',
        points: 0,
        startDate: '',
        endDate: '',
        estimateHours: 0,
        completed: false,
        waiting: false, // Waiting state (like blocked)
        createdAt: new Date().toISOString()
    };

    task.subtasks.push(newSubtask);
    saveTasks();

    // Re-render table to show new subtask
    renderTasksTable();

    // Focus the input again after re-render
    setTimeout(() => {
        const newInput = document.querySelector('.table-subtasks-container input');
        if (newInput) newInput.focus();
    }, 100);

    console.log('✅ Subtask added in table:', title);
}

// Delete subtask from table view
function deleteSubtaskFromTable(taskId, subtaskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const subtask = task.subtasks.find(s => s.id === subtaskId);
    if (!subtask) return;

    if (confirm(`Delete subtask "${subtask.title}"?`)) {
        task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
        saveTasks();

        // Re-render table to recalculate due dates from remaining subtasks
        renderTasksTable();

        console.log('🗑️ Subtask deleted from table, recalculating due dates from remaining subtasks');
    }
}

// Column Management
function openAddColumnModal() {
    console.log('➕ Opening add column modal...');
    document.getElementById('newColumnName').value = '';
    document.getElementById('addColumnModal').style.display = 'block';
}

function closeAddColumnModal() {
    document.getElementById('addColumnModal').style.display = 'none';
}

function confirmAddColumn() {
    console.log('➕ Confirming new column...');
    const name = document.getElementById('newColumnName').value.trim();
    
    if (!name) {
        showAlert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่ชื่อ Column');
        return;
    }
    
    // Check duplicate
    if (columns.find(c => c.name.toLowerCase() === name.toLowerCase())) {
        showAlert('⚠️ ข้อมูลซ้ำ', 'Column นี้มีอยู่แล้ว');
        return;
    }
    
    const newColumn = {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name: name,
        position: columns.length - 1 // Insert before Done
    };

    // Update positions
    columns.forEach(col => {
        if (col.position >= newColumn.position) {
            col.position++;
        }
    });
    
    columns.push(newColumn);
    saveColumns();
    renderAllTasks();
    closeAddColumnModal();
    
    console.log('✅ Column added:', name);
}

let isReorderMode = false;
let originalColumnPositions = [];

function toggleReorderMode() {
    const container = document.getElementById('currentColumns');
    const reorderActions = document.getElementById('reorderActions');
    const reorderBtn = document.getElementById('reorderColumnsBtn');

    if (!container) return;

    isReorderMode = !isReorderMode;

    if (isReorderMode) {
        // Enter reorder mode
        originalColumnPositions = columns.map(c => ({ id: c.id, position: c.position }));
        container.classList.add('reorder-mode');
        reorderActions.classList.add('active');
        reorderBtn.textContent = '↕️ กำลังเรียง...';
        reorderBtn.style.background = '#f59e0b';
        setupColumnDragAndDrop();
    } else {
        // Exit reorder mode
        container.classList.remove('reorder-mode');
        reorderActions.classList.remove('active');
        reorderBtn.textContent = '↕️ Reorder';
        reorderBtn.style.background = '';
        removeColumnDragAndDrop();
    }
}

function setupColumnDragAndDrop() {
    const container = document.getElementById('currentColumns');
    const columnElements = container.querySelectorAll('.column');

    columnElements.forEach(columnEl => {
        const columnId = columnEl.dataset.status;
        const column = columns.find(c => c.id === columnId);

        if (!column) {
            return;
        }

        columnEl.draggable = true;

        columnEl.addEventListener('dragstart', handleColumnDragStart);
        columnEl.addEventListener('dragend', handleColumnDragEnd);
        columnEl.addEventListener('dragover', handleColumnDragOver);
        columnEl.addEventListener('drop', handleColumnDrop);
        columnEl.addEventListener('dragleave', handleColumnDragLeave);
    });
}

function removeColumnDragAndDrop() {
    const container = document.getElementById('currentColumns');
    const columnElements = container.querySelectorAll('.column');

    columnElements.forEach(columnEl => {
        columnEl.draggable = false;
        columnEl.removeEventListener('dragstart', handleColumnDragStart);
        columnEl.removeEventListener('dragend', handleColumnDragEnd);
        columnEl.removeEventListener('dragover', handleColumnDragOver);
        columnEl.removeEventListener('drop', handleColumnDrop);
        columnEl.removeEventListener('dragleave', handleColumnDragLeave);
    });
}

let draggedColumnId = null;

function handleColumnDragStart(e) {
    draggedColumnId = e.target.dataset.status;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleColumnDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedColumnId = null;

    // Remove all drag-over-column classes
    const allColumns = document.querySelectorAll('.column');
    allColumns.forEach(col => col.classList.remove('drag-over-column'));
}

function handleColumnDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const targetColumnId = e.currentTarget.dataset.status;
    const targetColumn = columns.find(c => c.id === targetColumnId);

    if (!targetColumn || targetColumnId === draggedColumnId) {
        return;
    }

    e.currentTarget.classList.add('drag-over-column');
}

function handleColumnDragLeave(e) {
    e.currentTarget.classList.remove('drag-over-column');
}

function handleColumnDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over-column');

    const targetColumnId = e.currentTarget.dataset.status;

    if (!draggedColumnId || draggedColumnId === targetColumnId) {
        return;
    }

    const draggedColumn = columns.find(c => c.id === draggedColumnId);
    const targetColumn = columns.find(c => c.id === targetColumnId);

    if (!draggedColumn || !targetColumn) {
        return;
    }

    // Swap positions
    const tempPosition = draggedColumn.position;
    draggedColumn.position = targetColumn.position;
    targetColumn.position = tempPosition;

    // Re-render columns
    renderCurrentColumns();
    setupColumnDragAndDrop();
}

function saveColumnOrder() {
    saveColumns();
    showAlert('✅ บันทึกสำเร็จ', 'ลำดับ Columns ถูกบันทึกแล้ว');
    toggleReorderMode();
}

function cancelReorder() {
    // Restore original positions
    originalColumnPositions.forEach(orig => {
        const column = columns.find(c => c.id === orig.id);
        if (column) {
            column.position = orig.position;
        }
    });

    renderCurrentColumns();
    toggleReorderMode();
}

function openReorderModal() {
    // Keep this for backward compatibility but redirect to new mode
    toggleReorderMode();
}

function closeReorderModal() {
    // Keep for backward compatibility
    if (isReorderMode) {
        cancelReorder();
    }
}

function confirmReorder() {
    // Keep for backward compatibility
    if (isReorderMode) {
        saveColumnOrder();
    }
}

function deleteColumn(columnId) {
    showConfirm('🗑️ ยืนยันการลบ', 'คุณแน่ใจหรือไม่ที่จะลบ Column นี้?\n\nTasks ใน Column นี้จะถูกย้ายไป Backlog', (confirmed) => {
        if (confirmed) {
            // Move tasks to backlog
            tasks.forEach(task => {
                if (task.status === columnId) {
                    task.status = 'backlog';
                }
            });
            
            // Remove column
            columns = columns.filter(c => c.id !== columnId);
            
            // Update positions
            columns.sort((a, b) => a.position - b.position);
            columns.forEach((col, index) => {
                col.position = index;
            });
            
            saveColumns();
            saveTasks();
            openReorderModal(); // Refresh the modal
        }
    });
}

function getColumnName(columnId) {
    const column = columns.find(c => c.id === columnId);
    return column ? column.name : columnId;
}

// Settings Functions
function openSettings() {
    console.log('⚙️ Opening settings...');
    document.getElementById('settingsModal').style.display = 'block';
    loadSettingsData();
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function loadSettingsData() {
    renderTypes();
    renderPriorities();
    renderPriorityMapping();
    renderChecklistTemplates();
}

function renderTypes() {
    const container = document.getElementById('typesList');
    if (!container) return;
    
    container.innerHTML = '';

    if (taskTypes.length === 0) {
        container.innerHTML = '<div style="color: #999; font-style: italic;">ยังไม่มีชนิด Task</div>';
        return;
    }

    taskTypes.forEach((type, index) => {
        const tag = document.createElement('div');
        tag.className = 'item-tag';
        tag.innerHTML = `
            <span>${type}</span>
            <button class="remove-btn" onclick="removeType(${index})">×</button>
        `;
        container.appendChild(tag);
    });
}

function renderPriorities() {
    const container = document.getElementById('prioritiesList');
    if (!container) return;
    
    container.innerHTML = '';

    if (priorities.length === 0) {
        container.innerHTML = '<div style="color: #999; font-style: italic;">ยังไม่มี Priority</div>';
        return;
    }

    priorities.forEach((priority, index) => {
        const tag = document.createElement('div');
        tag.className = 'item-tag';
        tag.innerHTML = `
            <span>${priority}</span>
            <button class="remove-btn" onclick="removePriority(${index})">×</button>
        `;
        container.appendChild(tag);
    });
}

function renderPriorityMapping() {
    const container = document.getElementById('priorityMappingContainer');
    if (!container) return;
    
    container.innerHTML = '';

    taskTypes.forEach(type => {
        const mappingDiv = document.createElement('div');
        mappingDiv.className = 'mapping-item';
        
        const label = document.createElement('div');
        label.className = 'mapping-label';
        label.textContent = `${type} →`;
        
        const select = document.createElement('select');
        select.id = `mapping-${type}`;
        
        priorities.forEach(priority => {
            const option = document.createElement('option');
            option.value = priority;
            option.textContent = priority;
            if (priorityMapping[type] === priority) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        select.addEventListener('change', () => {
            priorityMapping[type] = select.value;
        });
        
        mappingDiv.appendChild(label);
        mappingDiv.appendChild(select);
        container.appendChild(mappingDiv);
    });
}

function renderChecklistTemplates() {
    const container = document.getElementById('checklistTemplatesContainer');
    if (!container) return;
    
    container.innerHTML = '';

    taskTypes.forEach(type => {
        const template = checklistTemplates[type] || [];
        
        const templateDiv = document.createElement('div');
        templateDiv.className = 'checklist-template';
        
        let itemsHTML = '';
        if (template.length === 0) {
            itemsHTML = '<div style="color: #999; font-style: italic; padding: 10px 0;">ยังไม่มี Checklist</div>';
        } else {
            itemsHTML = '<div class="checklist-items-list">';
            template.forEach((item, index) => {
                itemsHTML += `
                    <div class="checklist-item-tag">
                        <span>✓ ${item}</span>
                        <button class="remove-btn" onclick="removeChecklistItem('${type}', ${index})">×</button>
                    </div>
                `;
            });
            itemsHTML += '</div>';
        }
        
        templateDiv.innerHTML = `
            <h4>📌 ${type}</h4>
            ${itemsHTML}
            <div class="add-form">
                <input type="text" id="newChecklistItem-${type}" placeholder="เพิ่มรายการ Checklist ใหม่..." />
                <button class="add-btn" onclick="addChecklistItem('${type}')">+ เพิ่ม</button>
            </div>
        `;
        
        container.appendChild(templateDiv);
    });
}

function addType() {
    const input = document.getElementById('newType');
    const value = input.value.trim();

    if (!value) {
        showAlert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่ชื่อชนิด Task');
        return;
    }

    if (taskTypes.includes(value)) {
        showAlert('⚠️ ข้อมูลซ้ำ', 'ชนิด Task นี้มีอยู่แล้ว');
        return;
    }

    taskTypes.push(value);
    if (!checklistTemplates[value]) {
        checklistTemplates[value] = [];
    }
    if (!priorityMapping[value]) {
        priorityMapping[value] = priorities[0] || 'High';
    }
    input.value = '';
    loadSettingsData();
}

function addPriority() {
    const input = document.getElementById('newPriority');
    const value = input.value.trim();

    if (!value) {
        showAlert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่ชื่อ Priority');
        return;
    }

    if (priorities.includes(value)) {
        showAlert('⚠️ ข้อมูลซ้ำ', 'Priority นี้มีอยู่แล้ว');
        return;
    }

    priorities.push(value);
    input.value = '';
    loadSettingsData();
}

function removeType(index) {
    showConfirm('🗑️ ยืนยันการลบ', 'คุณแน่ใจหรือไม่ที่จะลบชนิด Task นี้?', (confirmed) => {
        if (confirmed) {
            const type = taskTypes[index];
            taskTypes.splice(index, 1);
            delete checklistTemplates[type];
            delete priorityMapping[type];
            loadSettingsData();
        }
    });
}

function removePriority(index) {
    showConfirm('🗑️ ยืนยันการลบ', 'คุณแน่ใจหรือไม่ที่จะลบ Priority นี้?', (confirmed) => {
        if (confirmed) {
            priorities.splice(index, 1);
            loadSettingsData();
        }
    });
}

function addChecklistItem(type) {
    const input = document.getElementById(`newChecklistItem-${type}`);
    const value = input.value.trim();

    if (!value) {
        showAlert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่รายการ Checklist');
        return;
    }

    if (!checklistTemplates[type]) {
        checklistTemplates[type] = [];
    }

    if (checklistTemplates[type].includes(value)) {
        showAlert('⚠️ ข้อมูลซ้ำ', 'รายการนี้มีอยู่แล้ว');
        return;
    }

    checklistTemplates[type].push(value);
    input.value = '';
    renderChecklistTemplates();
}

function removeChecklistItem(type, index) {
    showConfirm('🗑️ ยืนยันการลบ', 'คุณแน่ใจหรือไม่ที่จะลบรายการนี้?', (confirmed) => {
        if (confirmed) {
            checklistTemplates[type].splice(index, 1);
            renderChecklistTemplates();
        }
    });
}

function saveSettings() {
    localStorage.setItem('taskTypes', JSON.stringify(taskTypes));
    localStorage.setItem('priorities', JSON.stringify(priorities));
    localStorage.setItem('priorityMapping', JSON.stringify(priorityMapping));
    localStorage.setItem('checklistTemplates', JSON.stringify(checklistTemplates));
    
    initializeSelects();
    
    showAlert('✅ บันทึกสำเร็จ', 'การตั้งค่าถูกบันทึกเรียบร้อยแล้ว');
    
    setTimeout(() => {
        closeSettings();
    }, 1500);
}

// Save to LocalStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    console.log('💾 Tasks saved:', tasks.length);
}

function saveColumns() {
    localStorage.setItem('columns', JSON.stringify(columns));
    console.log('💾 Columns saved:', columns.length);
}

// Edit Backlog Task Functions
function closeEditBacklogModal() {
    document.getElementById('editBacklogModal').style.display = 'none';
}

function saveBacklogTaskDetails() {
    const taskId = parseInt(document.getElementById('editBacklogTaskId').value);
    const assignee = document.getElementById('editAssignee').value.trim();
    const eta = document.getElementById('editETA').value;
    
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        if (assignee) task.assignee = assignee;
        if (eta) task.eta = eta;
        saveTasks();
        renderAllTasks();
    }
    
    closeEditBacklogModal();
}

// View Management
let currentView = localStorage.getItem('viewMode') || 'kanban';
let isTableView = currentView === 'table';
let currentTableFilter = 'all'; // Filter for table view tabs

// Render Table View Tabs
function renderTableViewTabs() {
    const tabsContainer = document.getElementById('tableViewTabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = '';
    tabsContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

    // Left side: tabs
    const tabsWrapper = document.createElement('div');
    tabsWrapper.style.cssText = 'display: flex; gap: 5px;';

    // Create "All" tab
    const allTab = document.createElement('button');
    allTab.className = `table-view-tab ${currentTableFilter === 'all' ? 'active' : ''}`;
    allTab.textContent = 'All';
    allTab.onclick = () => setTableFilter('all');
    tabsWrapper.appendChild(allTab);

    // Create tabs for each column
    columns.forEach(column => {
        const tab = document.createElement('button');
        tab.className = `table-view-tab ${currentTableFilter === column.id ? 'active' : ''}`;
        tab.textContent = column.name;
        tab.onclick = () => setTableFilter(column.id);
        tabsWrapper.appendChild(tab);
    });

    tabsContainer.appendChild(tabsWrapper);

    // Right side: "Assigned to Me" button
    const assignedToMeBtn = document.createElement('button');
    assignedToMeBtn.className = 'table-view-tab';
    assignedToMeBtn.innerHTML = '👤 Assigned to Me';
    assignedToMeBtn.onclick = () => setTableFilter('assignedToMe');

    // Style based on active state
    if (currentTableFilter === 'assignedToMe') {
        assignedToMeBtn.style.cssText = 'background: #10b981; color: white; border-color: #10b981;';
        assignedToMeBtn.classList.add('active');
    } else {
        assignedToMeBtn.style.cssText = 'background: white; color: #10b981; border: 2px solid #10b981; font-weight: 600;';
    }

    // Hover effect
    assignedToMeBtn.onmouseover = () => {
        if (currentTableFilter !== 'assignedToMe') {
            assignedToMeBtn.style.background = '#f0fdf4';
        }
    };
    assignedToMeBtn.onmouseout = () => {
        if (currentTableFilter !== 'assignedToMe') {
            assignedToMeBtn.style.background = 'white';
        }
    };

    tabsContainer.appendChild(assignedToMeBtn);
}

// Set Table Filter
function setTableFilter(filter) {
    currentTableFilter = filter;
    renderTableViewTabs();
    renderTasksTable();
}

// Toggle Task Blocked Status
function toggleTaskBlocked(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.blocked = !task.blocked;
    saveTasks();
    renderAllTasks();

    if (isTableView) {
        renderTasksTable();
    }

    console.log(`✅ Task ${task.blocked ? 'blocked' : 'unblocked'}:`, task.title);
}

function changeView(viewType) {
    currentView = viewType;
    isTableView = viewType === 'table';
    localStorage.setItem('viewMode', viewType);

    const cardView = document.getElementById('currentColumns');
    const tableView = document.getElementById('tableViewContainer');
    const timelineView = document.getElementById('timelineViewContainer');
    const dropdown = document.getElementById('viewDropdown');

    // Get column management buttons
    const addColumnBtn = document.getElementById('addColumnBtn');
    const reorderColumnsBtn = document.getElementById('reorderColumnsBtn');

    if (dropdown) {
        dropdown.value = viewType;
    }

    // Hide all views first
    cardView.style.display = 'none';
    tableView.style.display = 'none';
    if (timelineView) {
        timelineView.style.display = 'none';
    }

    if (viewType === 'table') {
        // Switch to table view
        tableView.style.display = 'block';
        renderTableViewTabs();
        renderTasksTable();

        // Hide column management buttons
        if (addColumnBtn) addColumnBtn.style.display = 'none';
        if (reorderColumnsBtn) reorderColumnsBtn.style.display = 'none';
    } else if (viewType === 'timeline') {
        // Switch to timeline view
        if (timelineView) {
            timelineView.style.display = 'block';
            renderTimelineView();
        }

        // Hide column management buttons
        if (addColumnBtn) addColumnBtn.style.display = 'none';
        if (reorderColumnsBtn) reorderColumnsBtn.style.display = 'none';
    } else {
        // Switch to kanban board view (default)
        cardView.style.display = 'flex';
        renderAllTasks();

        // Show column management buttons
        if (addColumnBtn) addColumnBtn.style.display = 'inline-block';
        if (reorderColumnsBtn) reorderColumnsBtn.style.display = 'inline-block';
    }
}

// Legacy function for backward compatibility
function toggleView() {
    changeView(isTableView ? 'kanban' : 'table');
}

// Helper function to get assignees as array
function getTaskAssignees(task) {
    if (!task.assignee) return [];
    // Support both old format (string) and new format (array)
    if (Array.isArray(task.assignee)) {
        return task.assignee;
    }
    // Convert old string format to array
    return task.assignee ? [task.assignee] : [];
}

// Helper function to get or assign color to member
function getMemberColor(memberName) {
    const members = getMembers();
    let member = members.find(m => m.name === memberName);

    if (!member) {
        // Member not found, return default color
        return '#6b7280';
    }

    // If member doesn't have color, assign one
    if (!member.color) {
        const colors = [
            '#667eea', '#f56565', '#ed8936', '#ecc94b', '#48bb78',
            '#38b2ac', '#4299e1', '#9f7aea', '#ed64a6', '#f687b3'
        ];

        // Use member name to consistently pick a color
        const colorIndex = memberName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        member.color = colors[colorIndex];

        // Save updated members
        localStorage.setItem('members', JSON.stringify(members));
        console.log(`✅ Assigned color ${member.color} to ${memberName}`);
    }

    return member.color;
}

// Render assignee avatars in table view
function renderAssigneeAvatars(task) {
    const assignees = getTaskAssignees(task);
    const members = getMembers();

    let html = '<div style="display: flex; align-items: center; position: relative;">';

    const maxVisible = 3;
    const visibleAssignees = assignees.slice(0, maxVisible);
    const remainingCount = assignees.length - maxVisible;

    // Render avatars with overlapping effect
    visibleAssignees.forEach((assigneeName, index) => {
        const initials = assigneeName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const color = getMemberColor(assigneeName);

        html += `
            <div class="assignee-avatar-wrapper" style="
                position: relative;
                margin-left: ${index > 0 ? '-8px' : '0'};
                z-index: ${maxVisible - index};
            " onmouseover="this.querySelector('.remove-assignee-btn').style.display='flex'"
               onmouseout="this.querySelector('.remove-assignee-btn').style.display='none'">
                <div class="assignee-avatar" style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: ${color};
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 600;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    cursor: pointer;
                " title="${assigneeName}">
                    ${initials}
                </div>
                <div class="remove-assignee-btn" style="
                    display: none;
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #ef4444;
                    color: white;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    z-index: 100;
                " onclick="event.stopPropagation(); removeAssignee(${task.id}, '${assigneeName.replace(/'/g, "\\'")}');"
                   title="Remove ${assigneeName}">
                    ×
                </div>
            </div>
        `;
    });

    // Show +X if there are more assignees
    if (remainingCount > 0) {
        html += `
            <div class="assignee-avatar-more" style="
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #e5e7eb;
                color: #374151;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 600;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                margin-left: -8px;
                position: relative;
                z-index: 0;
            " title="${remainingCount} more">
                +${remainingCount}
            </div>
        `;
    }

    // Always show + button to add more assignees
    html += `
        <div class="assignee-add-btn" style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #f3f4f6;
            color: #6b7280;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 600;
            border: 2px dashed #d1d5db;
            margin-left: ${assignees.length > 0 ? '-8px' : '0'};
            transition: all 0.2s;
            position: relative;
            z-index: 0;
            cursor: pointer;
        " title="Add assignee"
        onmouseover="this.style.background='#e5e7eb'; this.style.borderColor='#9ca3af';"
        onmouseout="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db';">
            +
        </div>
    `;

    html += '</div>';
    return html;
}

// Remove assignee from task
function removeAssignee(taskId, assigneeName) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const assignees = getTaskAssignees(task);

    // Check if task is "In Progress" and this is the last assignee
    if (task.status === 'inProgress' && assignees.length === 1) {
        alert('Cannot remove the last assignee from an "In Progress" task.\n\nTasks in progress must have at least one assignee.');
        return;
    }

    // Confirm before removing
    if (!confirm(`Remove "${assigneeName}" from this task?`)) {
        return;
    }

    // Remove the assignee
    task.assignee = assignees.filter(name => name !== assigneeName);

    saveTasks();

    // Re-render views
    if (isTableView) {
        renderTasksTable();
    }
    renderAllTasks();

    console.log('✅ Removed assignee:', assigneeName);
}

// Open assignees selection modal
function openAssigneesModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById('assigneesModal');
    if (!modal) {
        console.error('Assignees modal not found');
        return;
    }

    // Store current task ID
    window.currentAssigneeTaskId = taskId;

    // Render assignees checkboxes
    const members = getMembers();
    const currentAssignees = getTaskAssignees(task);

    const container = document.getElementById('assigneesCheckboxContainer');
    container.innerHTML = members.map(member => {
        const isChecked = currentAssignees.includes(member.name);
        const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const color = getMemberColor(member.name);

        return `
            <label class="assignee-checkbox-item" style="
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.2s;
            " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'">
                <input type="checkbox"
                    value="${member.name}"
                    ${isChecked ? 'checked' : ''}
                    style="cursor: pointer; width: 18px; height: 18px;">
                <div class="assignee-avatar" style="
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: ${color};
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    font-weight: 600;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ">
                    ${initials}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1f2937;">${member.name}</div>
                    <div style="font-size: 12px; color: #6b7280;">${member.role || 'Member'}</div>
                </div>
            </label>
        `;
    }).join('');

    modal.style.display = 'block';
}

// Assign task to current user
function assignToMe() {
    const taskId = window.currentAssigneeTaskId;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Get current user
    const currentUserData = localStorage.getItem('currentUser');
    if (!currentUserData) {
        alert('No current user found. Please set up your profile first.');
        return;
    }

    const currentUser = JSON.parse(currentUserData);
    const assignees = getTaskAssignees(task);

    // Check if current user is already assigned
    if (assignees.includes(currentUser.name)) {
        alert('You are already assigned to this task.');
        return;
    }

    // Add current user to assignees
    if (Array.isArray(task.assignee)) {
        task.assignee.push(currentUser.name);
    } else {
        task.assignee = assignees.concat(currentUser.name);
    }

    saveTasks();

    // Close modal
    const modal = document.getElementById('assigneesModal');
    if (modal) {
        modal.style.display = 'none';
    }
    window.currentAssigneeTaskId = null;

    // Re-render views
    if (isTableView) {
        renderTasksTable();
    }
    renderAllTasks();

    console.log('✅ Assigned to me:', currentUser.name);
}

// Close assignees modal
function closeAssigneesModal(save) {
    const modal = document.getElementById('assigneesModal');
    if (!modal) return;

    if (save) {
        const taskId = window.currentAssigneeTaskId;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Get all checked assignees
        const checkboxes = document.querySelectorAll('#assigneesCheckboxContainer input[type="checkbox"]:checked');
        const selectedAssignees = Array.from(checkboxes).map(cb => cb.value);

        // Check if task is "In Progress" and no assignees selected
        if (task.status === 'inProgress' && selectedAssignees.length === 0) {
            alert('Cannot remove all assignees from an "In Progress" task.\n\nTasks in progress must have at least one assignee.');
            return;
        }

        // Update task assignees (store as array)
        task.assignee = selectedAssignees;

        saveTasks();

        // Re-render table view
        if (isTableView) {
            renderTasksTable();
        }

        // Re-render kanban view
        renderAllTasks();

        console.log('✅ Updated assignees:', selectedAssignees);
    }

    modal.style.display = 'none';
    window.currentAssigneeTaskId = null;
}

function renderTasksTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    console.log('📊 Rendering table view...');
    console.log('Total tasks:', tasks.length);

    // Get all current tasks - match kanban board logic
    // Only include tasks that have status matching one of the columns
    const validStatuses = columns.map(c => c.id);
    let currentTasks = tasks.filter(t => validStatuses.includes(t.status));

    // Filter by table tab selection
    if (currentTableFilter === 'assignedToMe') {
        // Filter tasks assigned to current user
        const currentUserData = localStorage.getItem('currentUser');
        if (currentUserData) {
            const currentUser = JSON.parse(currentUserData);
            currentTasks = currentTasks.filter(t => {
                const assignees = getTaskAssignees(t);
                return assignees.includes(currentUser.name);
            });
        } else {
            // No current user, show no tasks
            currentTasks = [];
        }
    } else if (currentTableFilter !== 'all') {
        currentTasks = currentTasks.filter(t => t.status === currentTableFilter);
    }

    console.log('Current tasks for table:', currentTasks.length);
    console.log('Valid statuses:', validStatuses);

    if (currentTasks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: #9ca3af;">
                    No tasks found. Click "➕ Add New Task" to create one.
                </td>
            </tr>
        `;
        return;
    }

    currentTasks.forEach((task, index) => {
        const row = createTableRow(task, index + 1);
        tableBody.appendChild(row);

        // Add subtask expansion row if this task is expanded
        if (expandedTableTaskId === task.id) {
            const subtaskRow = createSubtaskExpansionRow(task);
            tableBody.appendChild(subtaskRow);
        }
    });

    console.log('✅ Table rendered with', currentTasks.length, 'tasks');
}

function createTableRow(task, rowNumber) {
    try {
        const tr = document.createElement('tr');
        tr.dataset.taskId = task.id;

        // Get column name safely
        const column = columns.find(c => c.id === task.status);
        const columnName = column ? column.name : task.status;

        // Get members safely
        const members = getMembers();

        // Build column options
        const columnOptions = columns.map(col => `
            <option value="${col.id}" ${task.status === col.id ? 'selected' : ''}>
                ${col.name}
            </option>
        `).join('');

        // Build priority options
        const priorityOptions = priorities.map(p => `
            <option value="${p}" ${task.priority === p ? 'selected' : ''}>${p}</option>
        `).join('');

        // Build assignee options
        const assigneeOptions = members.map(m => `
            <option value="${m.name}" ${task.assignee === m.name ? 'selected' : ''}>${m.name}</option>
        `).join('');

        // Build subtasks cell content with remaining hours
        const subtasksCount = task.subtasks ? task.subtasks.length : 0;
        const subtasksCompleted = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;

        // Calculate total estimate hours from subtasks
        const totalEstimateHours = task.subtasks ? task.subtasks.reduce((sum, s) => sum + (parseFloat(s.estimateHours) || 0), 0) : 0;
        const completedHours = task.subtasks ? task.subtasks.filter(s => s.completed).reduce((sum, s) => sum + (parseFloat(s.estimateHours) || 0), 0) : 0;
        const remainingHours = totalEstimateHours - completedHours;

        const isExpanded = expandedTableTaskId === task.id;

        // Check if all subtasks are completed but status is still "In Progress"
        const allSubtasksCompleted = subtasksCount > 0 && subtasksCompleted === subtasksCount;
        const needsStatusChange = allSubtasksCompleted && (task.status === 'In Progress' || task.status === 'inProgress');

        const expandIcon = isExpanded ? '▼' : '▶';
        const subtasksHTML = subtasksCount > 0 ? `
            <div class="table-subtasks-summary" style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #6b7280; font-size: 12px;">${expandIcon}</span>
                <span class="table-subtasks-count">${subtasksCompleted}/${subtasksCount}</span>
                <span style="color: #6b7280; font-size: 12px;">
                    ${remainingHours.toFixed(1)}h remaining
                </span>
            </div>
        ` : `
            <span style="color: #9ca3af; font-size: 12px;">No subtasks</span>
        `;

        // Get latest due date from subtasks if task doesn't have one
        let displayDueDate = task.eta || '';
        let isFromSubtask = false;

        console.log(`DEBUG Task "${task.title}":`, {
            hasEta: !!task.eta,
            eta: task.eta,
            hasSubtasks: !!task.subtasks,
            subtaskCount: task.subtasks?.length || 0,
            subtasksWithEndDate: task.subtasks?.filter(s => s.endDate).length || 0
        });

        if (!task.eta && task.subtasks && task.subtasks.length > 0) {
            const subtasksWithDates = task.subtasks.filter(s => s.endDate);

            console.log(`Task "${task.title}" - Checking subtasks:`, subtasksWithDates.map(s => ({ title: s.title, endDate: s.endDate })));

            if (subtasksWithDates.length > 0) {
                // Find the latest (furthest) date from today
                const subtaskDates = subtasksWithDates.map(s => ({
                    date: new Date(s.endDate),
                    endDate: s.endDate
                }));

                // Sort descending to get the furthest date (latest)
                subtaskDates.sort((a, b) => b.date.getTime() - a.date.getTime());

                console.log(`✅ Task "${task.title}" - Latest subtask date:`, subtaskDates[0].endDate, 'from', subtasksWithDates.length, 'subtasks');

                displayDueDate = subtaskDates[0].endDate;
                isFromSubtask = true;
            }
        }

        // Calculate font size based on estimate hours (min 14px, max 24px)
        const estimateHours = parseFloat(task.estimateHours) || 0;
        const fontSize = Math.min(24, Math.max(14, 14 + estimateHours));

        // Date cell styling
        const dateStyle = !task.eta && !isFromSubtask
            ? 'background-color: #fee2e2; border-color: #ef4444;'
            : isFromSubtask
            ? 'background-color: #fef3c7; border-color: #fbbf24; color: #92400e; font-style: italic;'
            : '';

        tr.innerHTML = `
            <td class="table-row-number">${rowNumber}</td>
            <td class="table-task-name-cell" onclick="openTaskDetailsFromTable(${task.id})" style="cursor: pointer;" title="Click to view details">
                <div class="table-task-name" style="color: #667eea; font-weight: 600; text-decoration: underline;">${task.title || 'Untitled'}</div>
            </td>
            <td class="table-subtasks-cell" onclick="toggleSubtasksInTable(${task.id}, event)" style="cursor: pointer;" title="Click to manage subtasks">
                ${subtasksHTML}
            </td>
            <td>
                <div class="table-assignees-container" onclick="openAssigneesModal(${task.id})" style="cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 4px;" title="Click to manage assignees">
                    ${renderAssigneeAvatars(task)}
                </div>
            </td>
            <td class="editable" data-field="eta" style="${isFromSubtask ? 'position: relative;' : ''}">
                <input type="date" value="${displayDueDate}"
                    style="${dateStyle}"
                    title="${isFromSubtask ? 'Latest subtask due date (click to set task due date)' : ''}"
                    onchange="updateTaskField(${task.id}, 'eta', this.value)">
                ${isFromSubtask ? `<div style="font-size: 9px; color: #92400e; position: absolute; bottom: 2px; left: 5px; pointer-events: none;">From subtask</div>` : ''}
            </td>
            <td class="editable" data-field="estimateHours">
                <input type="number" min="0" step="0.5" value="${task.estimateHours || ''}"
                    placeholder="0"
                    style="width: 70px; text-align: center; font-size: ${fontSize}px; font-weight: 600;"
                    onchange="updateTaskField(${task.id}, 'estimateHours', this.value)">
            </td>
            <td>
                <select class="table-column-select ${needsStatusChange ? 'status-warning' : ''}" onchange="updateTaskField(${task.id}, 'status', this.value)">
                    ${columnOptions}
                </select>
            </td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn" onclick="openTaskDetailsFromTable(${task.id})" title="View Details">
                        👁️
                    </button>
                    <button class="table-action-btn delete" onclick="deleteTaskFromTable(${task.id})" title="Delete">
                        🗑️
                    </button>
                </div>
            </td>
        `;

        return tr;
    } catch (error) {
        console.error('Error creating table row for task:', task, error);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="10" style="color: red;">Error rendering task: ${task.title || task.name || 'Unknown'}</td>`;
        return tr;
    }
}

function updateTaskField(taskId, field, value) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Update the field
    if (field === 'points') {
        task[field] = parseInt(value) || 0;
    } else if (field === 'estimateHours') {
        task[field] = parseFloat(value) || 0;
    } else {
        task[field] = value;
    }

    saveTasks();

    // Show success feedback
    console.log(`✅ Updated ${field} for task "${task.title || task.name}"`);

    // Re-render table view for realtime updates
    if (isTableView) {
        renderTasksTable();
    }

    // If status changed, re-render kanban view too
    if (field === 'status') {
        renderAllTasks();
    }
}

function getMembers() {
    try {
        // Avoid infinite recursion by checking if we're calling from members.js
        const membersData = JSON.parse(localStorage.getItem('members')) || [];

        // If no members in localStorage, create default ones
        if (membersData.length === 0) {
            const defaultMembers = [
                { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Developer', status: 'active', teams: [] },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Designer', status: 'active', teams: [] },
                { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'QA', status: 'active', teams: [] }
            ];
            localStorage.setItem('members', JSON.stringify(defaultMembers));
            return defaultMembers;
        }

        return membersData;
    } catch (error) {
        console.error('Error getting members:', error);
        return [];
    }
}

function openTaskDetailsFromTable(taskId) {
    // Navigate to detail page instead of showing modal (clean URL)
    window.location.href = `/task-detail?id=${taskId}`;
    return;

    // Old modal code (removed)
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📋 Task Details</h2>

            <div style="margin: 20px 0;">
                <h3 style="margin-bottom: 10px;">${task.title || task.name || 'Untitled'}</h3>
                <p style="color: #666; margin-bottom: 20px;">${task.description || 'No description'}</p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <strong>Type:</strong> ${task.type || 'N/A'}
                    </div>
                    <div>
                        <strong>Priority:</strong> ${task.priority || 'N/A'}
                    </div>
                    <div>
                        <strong>Status:</strong> ${columns.find(c => c.id === task.status)?.name || task.status}
                    </div>
                    <div>
                        <strong>Assignee:</strong> ${task.assignee || 'Unassigned'}
                    </div>
                    <div>
                        <strong>Points:</strong> ${task.points || 0}
                    </div>
                    <div>
                        <strong>Due Date:</strong> ${task.eta || 'Not set'}
                    </div>
                </div>

                ${task.checklist && task.checklist.length > 0 ? `
                    <div style="margin-top: 20px;">
                        <strong>Readiness Checklist:</strong>
                        <ul style="margin-top: 10px; padding-left: 20px;">
                            ${task.checklist.map(item => `
                                <li style="margin: 5px 0;">
                                    ${item.completed ? '✅' : '⬜'} ${item.text}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>

            <div class="confirm-buttons">
                <button class="btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function deleteTaskFromTable(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const taskName = task.title || task.name || 'Untitled';
    if (confirm(`Are you sure you want to delete "${taskName}"?`)) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks();
        renderTasksTable();
        console.log(`🗑️ Task deleted: ${taskName}`);
    }
}

function makeEditable(cell, taskId, field) {
    // Don't make editable if already editing
    if (cell.querySelector('input')) return;

    const currentValue = cell.textContent.trim();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.style.width = '100%';
    input.style.padding = '6px 8px';
    input.style.border = '2px solid #667eea';
    input.style.borderRadius = '4px';
    input.style.fontSize = '14px';
    input.style.fontWeight = '600';

    // Replace content with input
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    // Save on blur or enter
    const saveEdit = () => {
        const newValue = input.value.trim();
        if (newValue && newValue !== currentValue) {
            updateTaskField(taskId, field, newValue);
        }
        renderTasksTable();
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        }
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            renderTasksTable();
        }
    });
}

// Initialize view on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedViewMode = localStorage.getItem('viewMode') || 'kanban';

    // Set initial view after a brief delay to ensure DOM is ready
    setTimeout(() => {
        const dropdown = document.getElementById('viewDropdown');
        if (dropdown) {
            dropdown.value = savedViewMode;
            changeView(savedViewMode);
        }
    }, 100);
});

// Make functions globally accessible
window.changeTaskStatus = changeTaskStatus;
window.deleteTask = deleteTask;
window.closeEditBacklogModal = closeEditBacklogModal;
window.saveBacklogTaskDetails = saveBacklogTaskDetails;
window.openCreateTaskModal = openCreateTaskModal;
window.addType = addType;
window.addPriority = addPriority;
window.removeType = removeType;
window.removePriority = removePriority;
window.addChecklistItem = addChecklistItem;
window.removeChecklistItem = removeChecklistItem;
window.saveSettings = saveSettings;
window.closeCustomAlert = closeCustomAlert;
window.closeCustomConfirm = closeCustomConfirm;
window.goToStep1 = goToStep1;
window.goToStep2 = goToStep2;
window.createTask = createTask;
window.closeCreateTaskModal = closeCreateTaskModal;
window.closeAddColumnModal = closeAddColumnModal;
window.confirmAddColumn = confirmAddColumn;
window.closeReorderModal = closeReorderModal;
window.confirmReorder = confirmReorder;
window.closeAssigneeModal = closeAssigneeModal;
window.confirmAssignee = confirmAssignee;
window.closeActualPointsModal = closeActualPointsModal;
window.confirmActualPoints = confirmActualPoints;
window.toggleView = toggleView;
window.updateTaskField = updateTaskField;
window.openTaskDetailsFromTable = openTaskDetailsFromTable;
window.deleteTaskFromTable = deleteTaskFromTable;
window.makeEditable = makeEditable;
window.toggleSubtask = toggleSubtask;
window.deleteSubtask = deleteSubtask;
window.addSubtaskInline = addSubtaskInline;
window.toggleSubtasksInTable = toggleSubtasksInTable;
window.addSubtaskInTable = addSubtaskInTable;
window.deleteSubtaskFromTable = deleteSubtaskFromTable;
window.updateSubtaskField = updateSubtaskField;

// Daily Burndown Chart Functions
let burndownChart = null;

function checkAndShowDailyBurndown() {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('lastBurndownShown');

    if (lastShown !== today) {
        // Show burndown chart
        setTimeout(() => {
            showDailyBurndown();
            localStorage.setItem('lastBurndownShown', today);
        }, 1000);
    }
}

function showDailyBurndown() {
    // Calculate burndown data
    const burndownData = calculateBurndownData();

    // Render chart
    renderBurndownChart(burndownData);

    // Show summary
    renderBurndownSummary(burndownData);

    // Show modal
    document.getElementById('dailyBurndownModal').style.display = 'block';
}

function closeDailyBurndown() {
    document.getElementById('dailyBurndownModal').style.display = 'none';
    if (burndownChart) {
        burndownChart.destroy();
        burndownChart = null;
    }
}

function calculateBurndownData() {
    // Get all tasks in valid columns (not backlog)
    const validStatuses = columns.map(c => c.id);
    const activeTasks = tasks.filter(t => validStatuses.includes(t.status));

    // Get current week (Monday to Sunday)
    const now = new Date();
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // If Sunday, go back 6 days, else go to Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Initialize week data (Mon-Sun)
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekData = weekDays.map((day, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        return {
            day,
            date: date.toISOString().split('T')[0],
            totalHours: 0,
            completedHours: 0,
            remainingHours: 0
        };
    });

    // Calculate total hours for the week
    let totalHours = 0;
    let completedHours = 0;
    let totalTasks = activeTasks.length;
    let completedTasks = 0;

    activeTasks.forEach(task => {
        // Add task's own estimate hours (from dragging to In Progress)
        const taskHours = parseFloat(task.estimateHours) || 0;
        totalHours += taskHours;

        // Add subtask estimate hours
        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach(subtask => {
                const hours = parseFloat(subtask.estimateHours) || 0;
                totalHours += hours;
                if (subtask.completed) {
                    completedHours += hours;
                }
            });
        }

        // Check if task is in Done column
        const doneColumn = columns.find(c => c.name === 'Done' || c.id === 'done');
        if (doneColumn && task.status === doneColumn.id) {
            completedTasks++;
            // If task is done, count its hours as completed too
            completedHours += taskHours;
        }
    });

    // Calculate ideal burndown (linear decrease from total to 0)
    const idealBurndownPerDay = totalHours / 7;
    weekData.forEach((dayData, index) => {
        dayData.totalHours = totalHours;
        dayData.idealRemaining = totalHours - (idealBurndownPerDay * (index + 1));
        dayData.idealRemaining = Math.max(0, dayData.idealRemaining);
    });

    // For actual data, show remaining hours up to today
    const todayIndex = weekData.findIndex(d => d.date === now.toISOString().split('T')[0]);
    const remainingHours = totalHours - completedHours;

    weekData.forEach((dayData, index) => {
        if (index <= todayIndex) {
            // For past and today: show actual remaining
            dayData.actualRemaining = remainingHours;
        } else {
            // For future days: no data yet
            dayData.actualRemaining = null;
        }
    });

    const remainingTasks = totalTasks - completedTasks;

    return {
        totalHours,
        completedHours,
        remainingHours,
        totalTasks,
        completedTasks,
        remainingTasks,
        completionPercentage: totalHours > 0 ? (completedHours / totalHours * 100).toFixed(1) : 0,
        weekData,
        weekStart: monday.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }),
        weekEnd: sunday.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
    };
}

function renderBurndownChart(data) {
    const ctx = document.getElementById('burndownChart').getContext('2d');

    if (burndownChart) {
        burndownChart.destroy();
    }

    // Prepare data for line chart
    const labels = data.weekData.map(d => d.day);
    const idealData = data.weekData.map(d => d.idealRemaining);
    const actualData = data.weekData.map(d => d.actualRemaining);

    burndownChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ideal Burndown',
                    data: idealData,
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.1,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgba(102, 126, 234, 1)'
                },
                {
                    label: 'Actual Remaining',
                    data: actualData,
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    tension: 0.1,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgba(239, 68, 68, 1)',
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        },
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: `Weekly Burndown Chart (${data.weekStart} - ${data.weekEnd})`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.raw === null) return 'No data yet';
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + 'h';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Remaining Hours',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(0) + 'h';
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Day of Week',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                }
            }
        }
    });
}

function renderBurndownSummary(data) {
    const summaryDiv = document.getElementById('burndownSummary');
    summaryDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <strong style="color: #667eea;">📋 Total Tasks:</strong> ${data.totalTasks}<br>
                <strong style="color: #10b981;">✅ Completed:</strong> ${data.completedTasks}<br>
                <strong style="color: #ef4444;">⏳ Remaining:</strong> ${data.remainingTasks}
            </div>
            <div>
                <strong style="color: #667eea;">⏱️ Total Hours:</strong> ${data.totalHours.toFixed(1)}h<br>
                <strong style="color: #10b981;">✅ Completed:</strong> ${data.completedHours.toFixed(1)}h<br>
                <strong style="color: #ef4444;">⏳ Remaining:</strong> ${data.remainingHours.toFixed(1)}h
            </div>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
            <strong style="color: #4a5568;">Progress: ${data.completionPercentage}%</strong>
            <div style="margin-top: 8px; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${data.completionPercentage}%; background: linear-gradient(90deg, #667eea 0%, #10b981 100%); transition: width 0.3s;"></div>
            </div>
        </div>
    `;
}

window.closeDailyBurndown = closeDailyBurndown;
window.showDailyBurndown = showDailyBurndown;

// Timeline/Gantt Chart Functions
let timelineZoomLevel = 1; // 1 = day view, 7 = week view, 30 = month view
let timelineStartDate = null;

function renderTimelineView() {
    const container = document.getElementById('timelineContent');

    // Get all tasks with dates
    const validStatuses = columns.map(c => c.id);
    let timelineTasks = tasks.filter(t => validStatuses.includes(t.status));

    // Filter tasks that have subtasks with dates or have estimate hours
    timelineTasks = timelineTasks.filter(t => {
        if (t.subtasks && t.subtasks.length > 0) {
            return t.subtasks.some(s => s.endDate);
        }
        return t.estimateHours && t.estimateHours > 0;
    });

    if (timelineTasks.length === 0) {
        container.innerHTML = `
            <div class="timeline-empty-state">
                <h4>No tasks with dates</h4>
                <p>Add subtasks with ETA dates or estimate hours to tasks to see them in the timeline view.</p>
            </div>
        `;
        return;
    }

    // Calculate date range
    const { startDate, endDate, days } = calculateDateRange(timelineTasks);
    timelineStartDate = startDate;

    // Build timeline HTML
    container.innerHTML = `
        <div class="timeline-grid">
            <div class="timeline-tasks-list">
                <div class="timeline-task-row" style="height: 50px; font-weight: bold; background: #e2e8f0;">
                    <div class="timeline-task-title">Task</div>
                </div>
                ${timelineTasks.map(task => renderTimelineTaskRow(task)).join('')}
            </div>
            <div class="timeline-chart">
                <div class="timeline-header-dates">
                    ${days.map(day => renderDateHeader(day)).join('')}
                </div>
                <div class="timeline-bars-container">
                    ${timelineTasks.map(task => renderTimelineBar(task, startDate, days.length)).join('')}
                    ${renderTodayLine(startDate, days.length)}
                </div>
            </div>
        </div>
    `;
}

function calculateDateRange(tasks) {
    let minDate = null;
    let maxDate = null;

    tasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach(subtask => {
                if (subtask.eta) {
                    const date = new Date(subtask.eta);
                    if (!minDate || date < minDate) minDate = date;
                    if (!maxDate || date > maxDate) maxDate = date;
                }
            });
        }
    });

    // If no dates found, use today +/- 30 days
    if (!minDate) {
        minDate = new Date();
        minDate.setDate(minDate.getDate() - 15);
    }
    if (!maxDate) {
        maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 15);
    }

    // Add padding
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - 7);

    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + 7);

    // Generate days array
    const days = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return { startDate, endDate, days };
}

function renderDateHeader(date) {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayOfMonth = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isToday = date.toDateString() === new Date().toDateString();

    return `
        <div class="timeline-date-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}">
            <div>${dayOfWeek}</div>
            <div style="font-size: 14px; font-weight: 700;">${dayOfMonth}</div>
            <div style="font-size: 10px; color: #9ca3af;">${month}</div>
        </div>
    `;
}

function renderTimelineTaskRow(task) {
    const isBlocked = task.subtasks && task.subtasks.some(s => s.blocked || s.status === 'Blocked' || s.waiting);
    return `
        <div class="timeline-task-row">
            <div class="timeline-task-info">
                <div class="timeline-task-title">${task.title}</div>
                <div class="timeline-task-meta">
                    ${task.assignee ? '👤 ' + task.assignee : ''}
                    ${isBlocked ? '🚫 Blocked' : ''}
                </div>
            </div>
        </div>
    `;
}

function renderTimelineBar(task, startDate, totalDays) {
    const dayWidth = 100 / totalDays;
    const bars = [];

    if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
            if (subtask.eta) {
                const etaDate = new Date(subtask.eta);
                const daysFromStart = Math.floor((etaDate - startDate) / (1000 * 60 * 60 * 24));
                const estimateHours = parseFloat(subtask.estimateHours) || 4;
                const estimateDays = Math.ceil(estimateHours / 8);
                const startDay = Math.max(0, daysFromStart - estimateDays + 1);
                const barWidth = estimateDays * dayWidth;
                const leftPosition = startDay * dayWidth;

                const isBlocked = subtask.blocked || subtask.status === 'Blocked' || subtask.waiting;
                const statusClass = subtask.completed ? 'status-done' :
                                   isBlocked ? 'blocked' :
                                   task.status ? `status-${task.status}` : 'status-todo';

                bars.push(`
                    <div class="timeline-bar ${statusClass}"
                         style="left: ${leftPosition}%; width: ${barWidth}%;"
                         title="${subtask.title} (${estimateHours}h)">
                        <span class="timeline-bar-text">${subtask.title}</span>
                    </div>
                `);
            }
        });
    }

    return `
        <div class="timeline-bar-row">
            ${Array(totalDays).fill(0).map((_, i) => {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isToday = date.toDateString() === new Date().toDateString();
                return `<div class="timeline-day-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}"></div>`;
            }).join('')}
            ${bars.join('')}
        </div>
    `;
}

function renderTodayLine(startDate, totalDays) {
    const today = new Date();
    const daysFromStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    if (daysFromStart >= 0 && daysFromStart < totalDays) {
        const dayWidth = 100 / totalDays;
        const leftPosition = daysFromStart * dayWidth;
        return `<div class="timeline-today-line" style="left: ${leftPosition}%;"></div>`;
    }
    return '';
}

function zoomTimeline(direction) {
    // Future enhancement: implement zoom functionality
    showAlert('Coming Soon', 'Zoom functionality will be available in the next update!');
}

function todayTimeline() {
    // Scroll to today's position
    renderTimelineView();
    // Could add smooth scroll to today's position here
}

window.zoomTimeline = zoomTimeline;
window.todayTimeline = todayTimeline;

// ==================== BOOKMARK FUNCTIONALITY ====================

// Data structure for bookmarks
let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
let currentBookmarkTab = 'add';

function openBookmarkMenu() {
    const modal = document.getElementById('bookmarkModal');
    if (!modal) return;

    modal.style.display = 'block';
    currentBookmarkTab = 'add';
    switchBookmarkTab('add');
    renderOpenTabsCheckboxes();
    renderSavedBookmarks();

    console.log('🔖 Bookmark menu opened');
}

function closeBookmarkMenu() {
    const modal = document.getElementById('bookmarkModal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.getElementById('bookmarkName').value = '';
    console.log('🔖 Bookmark menu closed');
}

function switchBookmarkTab(tab) {
    currentBookmarkTab = tab;

    // Update tab buttons
    document.getElementById('addBookmarkTab').classList.toggle('active', tab === 'add');
    document.getElementById('manageBookmarkTab').classList.toggle('active', tab === 'manage');

    // Update section visibility
    document.getElementById('addBookmarkSection').style.display = tab === 'add' ? 'block' : 'none';
    document.getElementById('manageBookmarkSection').style.display = tab === 'manage' ? 'block' : 'none';

    console.log('📑 Switched to tab:', tab);
}

function renderOpenTabsCheckboxes() {
    const container = document.getElementById('tabsToBookmarkContainer');
    if (!container) return;

    container.innerHTML = '';

    // Define available tabs - in a real app, you'd detect actual open tabs
    // For this planning tool, we'll use the main sections
    const availableTabs = [
        { id: 'current', name: '📋 Current Tasks', url: 'index.html' },
        { id: 'dashboard', name: '📊 Dashboard', url: 'dashboard.html' },
        { id: 'chart', name: '📈 Chart', url: 'chart.html' },
        { id: 'userManagement', name: '👥 User Management', url: 'user_management.html' }
    ];

    availableTabs.forEach(tab => {
        const item = document.createElement('div');
        item.className = 'bookmark-checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `tab-${tab.id}`;
        checkbox.value = tab.id;
        checkbox.dataset.tabName = tab.name;
        checkbox.dataset.tabUrl = tab.url;

        const label = document.createElement('label');
        label.htmlFor = `tab-${tab.id}`;
        label.textContent = tab.name;

        item.appendChild(checkbox);
        item.appendChild(label);
        container.appendChild(item);
    });

    console.log('✅ Rendered', availableTabs.length, 'tabs for bookmarking');
}

function saveBookmark() {
    const bookmarkNameInput = document.getElementById('bookmarkName');
    const bookmarkName = bookmarkNameInput.value.trim();

    if (!bookmarkName) {
        alert('Please enter a bookmark name');
        return;
    }

    // Get selected tabs
    const checkboxes = document.querySelectorAll('#tabsToBookmarkContainer input[type="checkbox"]:checked');

    if (checkboxes.length === 0) {
        alert('Please select at least one tab to bookmark');
        return;
    }

    const selectedTabs = Array.from(checkboxes).map(cb => ({
        id: cb.value,
        name: cb.dataset.tabName,
        url: cb.dataset.tabUrl
    }));

    // Create bookmark object
    const bookmark = {
        id: Date.now(),
        name: bookmarkName,
        tabs: selectedTabs,
        createdAt: new Date().toISOString()
    };

    // Add to bookmarks array
    bookmarks.push(bookmark);
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));

    console.log('💾 Saved bookmark:', bookmark);

    // Show success message
    showAlert('✅ Saved!', `Bookmark "${bookmarkName}" has been saved with ${selectedTabs.length} tab(s).`);

    // Clear form and switch to manage tab
    bookmarkNameInput.value = '';
    checkboxes.forEach(cb => cb.checked = false);
    switchBookmarkTab('manage');
    renderSavedBookmarks();
}

function renderSavedBookmarks() {
    const container = document.getElementById('savedBookmarksContainer');
    if (!container) return;

    container.innerHTML = '';

    if (bookmarks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #9ca3af;">
                <p style="font-size: 16px; margin-bottom: 8px;">📌 No bookmarks yet</p>
                <p style="font-size: 14px;">Create a bookmark to save your favorite tab combinations!</p>
            </div>
        `;
        return;
    }

    // Sort by most recent first
    const sortedBookmarks = [...bookmarks].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    sortedBookmarks.forEach(bookmark => {
        const item = document.createElement('div');
        item.className = 'saved-bookmark-item';

        const header = document.createElement('div');
        header.className = 'saved-bookmark-header';

        const name = document.createElement('div');
        name.className = 'saved-bookmark-name';
        name.textContent = `🔖 ${bookmark.name}`;

        const actions = document.createElement('div');
        actions.className = 'saved-bookmark-actions';

        const openBtn = document.createElement('button');
        openBtn.className = 'bookmark-open-btn';
        openBtn.textContent = '📂 Open';
        openBtn.onclick = () => openBookmark(bookmark.id);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'bookmark-delete-btn';
        deleteBtn.textContent = '🗑️ Delete';
        deleteBtn.onclick = () => deleteBookmark(bookmark.id);

        actions.appendChild(openBtn);
        actions.appendChild(deleteBtn);

        header.appendChild(name);
        header.appendChild(actions);

        const tabsList = document.createElement('div');
        tabsList.className = 'saved-bookmark-tabs';
        tabsList.innerHTML = bookmark.tabs.map(tab =>
            `<span>${tab.name}</span>`
        ).join('');

        item.appendChild(header);
        item.appendChild(tabsList);
        container.appendChild(item);
    });

    console.log('✅ Rendered', bookmarks.length, 'saved bookmarks');
}

function openBookmark(bookmarkId) {
    const bookmark = bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    console.log('📂 Opening bookmark:', bookmark.name);

    // Open each tab in the bookmark
    bookmark.tabs.forEach((tab, index) => {
        if (index === 0) {
            // First tab replaces current page
            window.location.href = tab.url;
        } else {
            // Other tabs open in new windows/tabs
            window.open(tab.url, '_blank');
        }
    });

    closeBookmarkMenu();
}

function deleteBookmark(bookmarkId) {
    const bookmark = bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    if (!confirm(`Are you sure you want to delete the bookmark "${bookmark.name}"?`)) {
        return;
    }

    // Remove from array
    bookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));

    console.log('🗑️ Deleted bookmark:', bookmark.name);

    // Re-render
    renderSavedBookmarks();

    showAlert('✅ Deleted', `Bookmark "${bookmark.name}" has been deleted.`);
}

// Export to window for onclick handlers
window.openBookmarkMenu = openBookmarkMenu;
window.closeBookmarkMenu = closeBookmarkMenu;
window.switchBookmarkTab = switchBookmarkTab;
window.saveBookmark = saveBookmark;
window.openBookmark = openBookmark;
window.deleteBookmark = deleteBookmark;

console.log('📝 app.js loaded successfully!');