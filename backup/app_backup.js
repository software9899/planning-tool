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
    { id: 'todo', name: 'To Do', fixed: true, position: 0 },
    { id: 'inProgress', name: 'In Progress', fixed: false, position: 1 },
    { id: 'done', name: 'Done', fixed: true, position: 2 }
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
let showBlocked = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeSelects();
    initializeTabs();
    initializeBacklogFilters();
    renderAllTasks();
    attachEventListeners();
    setupDragAndDrop();
    loadSettingsData();
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
    
    showBlockedCheckbox.addEventListener('change', (e) => {
        showBlocked = e.target.checked;
        renderAllTasks();
    });
}

// Custom Alert
function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('customAlertModal').style.display = 'block';
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').style.display = 'none';
}

// Custom Confirm
function showConfirm(title, message, callback) {
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
    const selects = ['taskType', 'taskPriority', 'actionTaskType', 'actionTaskPriority'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
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
    
    updatePriorityFromMapping();
}

// Update Priority when Type changes
function updatePriorityFromMapping() {
    const typeSelect = document.getElementById('taskType');
    const prioritySelect = document.getElementById('taskPriority');
    
    if (typeSelect && prioritySelect) {
        const selectedType = typeSelect.value;
        const mappedPriority = priorityMapping[selectedType] || priorities[0];
        prioritySelect.value = mappedPriority;
    }
}

// Event Listeners
function attachEventListeners() {
    // Create Task Modal
    document.getElementById('createTaskFloatingBtn').addEventListener('click', openCreateTaskModal);
    document.querySelector('.close-create').addEventListener('click', closeCreateTaskModal);
    
    // Settings
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.querySelector('.close-settings').addEventListener('click', closeSettings);
    
    // Reorder
    document.getElementById('reorderColumnsBtn').addEventListener('click', openReorderModal);
    document.querySelector('.close-reorder').addEventListener('click', closeReorderModal);
    
    // Add Column
    document.getElementById('addColumnBtn').addEventListener('click', openAddColumnModal);
    document.querySelector('.close-add-column').addEventListener('click', closeAddColumnModal);
    
    // Modals
    document.querySelector('.close').addEventListener('click', closeTaskModal);
    document.querySelector('.close-action').addEventListener('click', closeActionModal);
    document.querySelector('.close-assignee').addEventListener('click', () => closeAssigneeModal(false));
    document.querySelector('.close-actual').addEventListener('click', () => closeActualPointsModal(false));
    document.getElementById('actionCreateBtn').addEventListener('click', createActionTask);
    
    // Task Type Change
    document.getElementById('taskType').addEventListener('change', () => {
        updatePriorityFromMapping();
    });
    document.getElementById('actionTaskType').addEventListener('change', updateActionChecklist);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Open/Close Create Task Modal
function openCreateTaskModal(isBacklog = false) {
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
            // Need assignee and estimate
            if (!task.assignee || !task.estimatePoints) {
                pendingMoveTaskId = draggedTaskId;
                pendingMoveStatus = targetStatus;
                openAssigneeModal();
                return;
            }
        }
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
    const task = tasks.find(t => t.id === pendingMoveTaskId);
    if (task) {
        document.getElementById('assigneeInput').value = task.assignee || '';
        document.getElementById('estimateInput').value = task.estimatePoints || '';
    }
    document.getElementById('assigneeModal').style.display = 'block';
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
        showAlert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่ Assignee และ Estimate Points');
        return;
    }
    
    const task = tasks.find(t => t.id === pendingMoveTaskId);
    if (task) {
        task.assignee = assignee;
        task.estimatePoints = estimate;
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
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDesc').value.trim();
    const type = document.getElementById('taskType').value;
    const priority = document.getElementById('taskPriority').value;
    const size = document.getElementById('taskSize').value;
    
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
        status = 'backlogReady';
    } else {
        showAlert('⚠️ Readiness Checklist ยังไม่ครบ', 'Task จะถูกสร้างที่ "Need More Details"\n\nเมื่อเช็คครบแล้วจึงสามารถย้ายไป "Ready to Implement" หรือ To Do ได้');
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
        subtasks: [],
        checklist: checklist,
        assignee: null,
        estimatePoints: null,
        actualPoints: null,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasks();
    renderAllTasks();
    closeCreateTaskModal();
}

// Render All Tasks
function renderAllTasks() {
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
    
    // Split tasks into two groups based on checklist completion
    const needDetailsTasks = [];
    const readyTasks = [];
    
    backlogTasks.forEach(task => {
        const isComplete = isTaskChecklistComplete(task);
        
        if (isComplete) {
            readyTasks.push(task);
        } else {
            needDetailsTasks.push(task);
        }
    });
    
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
}

function renderCurrentColumns() {
    const container = document.getElementById('currentColumns');
    container.innerHTML = '';
    
    // Sort columns by position
    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
    
    sortedColumns.forEach(column => {
        const columnEl = createColumnElement(column);
        container.appendChild(columnEl);
    });
    
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
    
    const columnTasks = tasks.filter(t => t.status === column.id);
    columnTasks.forEach(task => {
        const taskCard = createTaskCard(task);
        tasksList.appendChild(taskCard);
    });
    
    columnDiv.appendChild(tasksList);
    
    return columnDiv;
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.id = task.id;
    card.draggable = true;
    
    const isExpanded = currentTaskId === task.id;
    if (isExpanded) {
        card.classList.add('expanded');
    }
    
    if (!isTaskChecklistComplete(task)) {
        card.classList.add('checklist-incomplete');
        if (!showBlocked && task.status === 'backlog') {
            card.classList.add('blocked');
        }
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
    
    const title = document.createElement('div');
    title.className = 'task-title-editable';
    title.textContent = task.title;
    title.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        editTaskTitle(task.id, title);
    });
    titleSection.appendChild(title);
    
    const desc = document.createElement('div');
    desc.className = task.description ? 'task-description-editable' : 'task-description-editable empty';
    desc.textContent = task.description || 'Double-click to add description';
    desc.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        editTaskDescription(task.id, desc);
    });
    titleSection.appendChild(desc);
    
    header.appendChild(titleSection);
    
    // Right section - Type, Priority, Assignee, Points
    const metaSection = document.createElement('div');
    metaSection.className = 'task-meta-section';
    
    const badges = document.createElement('div');
    badges.className = 'task-badges';
    
    const typeBadge = document.createElement('span');
    typeBadge.className = 'badge badge-type';
    typeBadge.textContent = task.type;
    badges.appendChild(typeBadge);
    
    const priorityBadge = document.createElement('span');
    priorityBadge.className = `badge badge-priority ${task.priority.toLowerCase()}`;
    priorityBadge.textContent = task.priority;
    badges.appendChild(priorityBadge);
    
    if (task.size) {
        const sizeBadge = document.createElement('span');
        sizeBadge.className = 'badge badge-size';
        sizeBadge.textContent = task.size;
        badges.appendChild(sizeBadge);
    }
    
    metaSection.appendChild(badges);
    
    // Meta info
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    
    if (task.assignee) {
        const assignee = document.createElement('span');
        assignee.className = 'task-assignee';
        assignee.textContent = `👤 ${task.assignee}`;
        meta.appendChild(assignee);
    }
    
    if (task.estimatePoints) {
        const points = document.createElement('span');
        points.className = 'task-points';
        points.textContent = `📊 ${task.estimatePoints}${task.actualPoints ? ` / ${task.actualPoints}` : ''}`;
        meta.appendChild(points);
    }
    
    metaSection.appendChild(meta);
    header.appendChild(metaSection);
    
    card.appendChild(header);
    
    // Checklist Expand
    if (task.checklist && Object.keys(task.checklist).length > 0) {
        const checklistExpand = createChecklistExpand(task);
        card.appendChild(checklistExpand);
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
    
    // Subtasks
    if (task.subtasks.length > 0) {
        const subsDiv = document.createElement('div');
        subsDiv.className = 'subtasks-list';
        const subsTitle = document.createElement('h4');
        subsTitle.textContent = '📋 Subtasks:';
        subsDiv.appendChild(subsTitle);
        
        task.subtasks.forEach(subId => {
            const subTask = tasks.find(t => t.id === subId);
            if (subTask) {
                const subItem = document.createElement('div');
                subItem.className = 'subtask-item';
                subItem.textContent = `↳ ${subTask.title}`;
                subsDiv.appendChild(subItem);
            }
        });
        
        card.appendChild(subsDiv);
    }
    
    // Action Buttons
    if (isExpanded) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';
        
        const depBtn = document.createElement('button');
        depBtn.className = 'action-btn';
        depBtn.innerHTML = '⛓️ + Dependency';
        depBtn.onclick = (e) => {
            e.stopPropagation();
            openActionModal('dependency', task.id);
        };
        actionsDiv.appendChild(depBtn);
        
        const subtaskBtn = document.createElement('button');
        subtaskBtn.className = 'action-btn';
        subtaskBtn.innerHTML = '📋 + Subtask';
        subtaskBtn.onclick = (e) => {
            e.stopPropagation();
            openActionModal('subtask', task.id);
        };
        actionsDiv.appendChild(subtaskBtn);
        
        card.appendChild(actionsDiv);
    }
    
    // Click to expand/collapse
    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('action-btn') && 
            !e.target.classList.contains('task-title-editable') &&
            !e.target.classList.contains('task-description-editable') &&
            !e.target.classList.contains('task-checklist-expand') &&
            !e.target.closest('.task-checklist-expand') &&
            e.target.tagName !== 'BUTTON') {
            if (currentTaskId === task.id) {
                currentTaskId = null;
            } else {
                currentTaskId = task.id;
            }
            renderAllTasks();
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
    actionType = type;
    actionParentId = parentId;
    
    const modal = document.getElementById('actionModal');
    const title = document.getElementById('actionTitle');
    
    title.textContent = type === 'dependency' ? '⛓️ สร้าง Dependency Task' : '📋 สร้าง Subtask';
    
    document.getElementById('actionTaskTitle').value = '';
    document.getElementById('actionTaskDesc').value = '';
    
    modal.style.display = 'block';
}

function closeActionModal() {
    document.getElementById('actionModal').style.display = 'none';
    actionType = null;
    actionParentId = null;
}

// Create Action Task
function createActionTask() {
    const title = document.getElementById('actionTaskTitle').value.trim();
    const description = document.getElementById('actionTaskDesc').value.trim();
    const type = document.getElementById('actionTaskType').value;
    const priority = document.getElementById('actionTaskPriority').value;
    
    if (!title) {
        showAlert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่ชื่อ Task');
        return;
    }
    
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
    
    const parentTask = tasks.find(t => t.id === actionParentId);
    if (parentTask) {
        if (actionType === 'dependency') {
            parentTask.dependencies.push(newTask.id);
        } else if (actionType === 'subtask') {
            parentTask.subtasks.push(newTask.id);
        }
    }
    
    saveTasks();
    renderAllTasks();
    closeActionModal();
}

// Column Management
function openAddColumnModal() {
    document.getElementById('newColumnName').value = '';
    document.getElementById('addColumnModal').style.display = 'block';
}

function closeAddColumnModal() {
    document.getElementById('addColumnModal').style.display = 'none';
}

function confirmAddColumn() {
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
        fixed: false,
        position: columns.length - 1 // Insert before Done
    };
    
    // Update positions
    columns.forEach(col => {
        if (!col.fixed && col.position >= newColumn.position) {
            col.position++;
        }
    });
    
    columns.push(newColumn);
    saveColumns();
    renderAllTasks();
    closeAddColumnModal();
}

function openReorderModal() {
    const modal = document.getElementById('reorderModal');
    const list = document.getElementById('reorderList');
    
    list.innerHTML = '';
    
    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
    
    sortedColumns.forEach((column, index) => {
        const item = document.createElement('div');
        item.className = 'reorder-item';
        item.dataset.columnId = column.id;
        item.draggable = !column.fixed;
        
        if (column.fixed) {
            item.classList.add('fixed');
        }
        
        const content = document.createElement('div');
        content.className = 'reorder-item-content';
        content.innerHTML = `<span>☰</span><span>${column.name}</span>${column.fixed ? '<span style="font-size: 11px; color: #999;">(Fixed)</span>' : ''}`;
        item.appendChild(content);
        
        if (!column.fixed && column.id !== 'todo' && column.id !== 'done') {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'reorder-item-delete';
            deleteBtn.textContent = '🗑️';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteColumn(column.id);
            };
            item.appendChild(deleteBtn);
        }
        
        if (!column.fixed) {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', column.id);
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingItem = list.querySelector('.dragging');
                if (draggingItem && draggingItem !== item && !item.classList.contains('fixed')) {
                    const rect = item.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    if (e.clientY < midpoint) {
                        item.parentNode.insertBefore(draggingItem, item);
                    } else {
                        item.parentNode.insertBefore(draggingItem, item.nextSibling);
                    }
                }
            });
        }
        
        list.appendChild(item);
    });
    
    modal.style.display = 'block';
}

function closeReorderModal() {
    document.getElementById('reorderModal').style.display = 'none';
}

function confirmReorder() {
    const list = document.getElementById('reorderList');
    const items = Array.from(list.querySelectorAll('.reorder-item'));
    
    items.forEach((item, index) => {
        const columnId = item.dataset.columnId;
        const column = columns.find(c => c.id === columnId);
        if (column && !column.fixed) {
            column.position = index;
        }
    });
    
    saveColumns();
    renderAllTasks();
    closeReorderModal();
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
}

function saveColumns() {
    localStorage.setItem('columns', JSON.stringify(columns));
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