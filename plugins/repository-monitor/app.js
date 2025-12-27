// Global variables
let rawData = null;
let filteredData = null;
let charts = {};
let slideCharts = {};
let currentSlide = 1;
const totalSlides = 11;

// Gantt Chart filter state
let ganttFilters = {
    owner: [],
    priority: []
};
let ganttFilterOpen = null; // Track which filter dropdown is open

// Chart colors
const chartColors = {
    purple: '#667eea',
    pink: '#764ba2',
    blue: '#3498db',
    green: '#2ecc71',
    orange: '#f39c12',
    red: '#e74c3c',
    gray: '#95a5a6',
    yellow: '#f1c40f',
    white: '#ffffff'
};

const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                boxWidth: 15,
                padding: 10,
                font: { size: 13 }
            }
        }
    }
};

const slideOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                color: 'white',
                font: { size: 12 }
            }
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupUpload();
    setupKeyboardNavigation();
});

// ==================== File Upload ====================
function setupUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });
}

function handleFile(file) {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
        alert('กรุณาอัพโหลดไฟล์ Excel (.xlsx หรือ .xls)');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const matrixSheet = workbook.SheetNames.find(name => name.toLowerCase() === 'matrix');
            if (!matrixSheet) {
                alert('ไม่พบ Sheet ชื่อ "Matrix" ในไฟล์');
                return;
            }

            const worksheet = workbook.Sheets[matrixSheet];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            rawData = jsonData;
            filteredData = [...jsonData];

            setupFilters();
            applyFilters();

            // Hide upload section after successful upload
            document.getElementById('uploadSection').style.display = 'none';

            // Update header with file info
            const headerContent = document.querySelector('.header-content');
            const fileInfo = document.createElement('div');
            fileInfo.style.marginTop = '10px';
            fileInfo.style.fontSize = '0.9em';
            fileInfo.style.color = '#2ecc71';
            fileInfo.innerHTML = `✅ ${file.name} - ${rawData.length} projects loaded`;
            headerContent.appendChild(fileInfo);

            // Show all sections (except filter - will be toggled by button)
            document.getElementById('modeSwitch').classList.add('active');
            document.getElementById('statsGrid').classList.add('active');
            document.getElementById('chartsGrid').classList.add('active');

        } catch (error) {
            console.error('Error reading file:', error);
            alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// ==================== Filters ====================
function setupFilters() {
    // Priority filters
    const priorities = [...new Set(rawData.map(row => row['Priority'] || 'No Priority'))];
    const priorityFilters = document.getElementById('priorityFilters');
    priorityFilters.innerHTML = '';
    priorityFilters.className = 'filter-badges';
    priorities.forEach(priority => {
        const count = rawData.filter(row => (row['Priority'] || 'No Priority') === priority).length;
        const badge = document.createElement('div');
        badge.className = 'filter-badge active';
        badge.dataset.value = priority;
        badge.dataset.type = 'priority';
        badge.innerHTML = `
            <span class="badge-label">${priority}</span>
            <span class="badge-count">${count}</span>
        `;
        badge.addEventListener('click', () => toggleBadge(badge));
        priorityFilters.appendChild(badge);
    });

    // Owner filters
    const owners = [...new Set(rawData.map(row => row['Owner'] || 'Unassigned'))];
    const ownerFilters = document.getElementById('ownerFilters');
    ownerFilters.innerHTML = '';
    ownerFilters.className = 'filter-badges';
    owners.forEach(owner => {
        const count = rawData.filter(row => (row['Owner'] || 'Unassigned') === owner).length;
        const badge = document.createElement('div');
        const isUnassigned = owner === 'Unassigned';
        badge.className = isUnassigned ? 'filter-badge' : 'filter-badge active';
        badge.dataset.value = owner;
        badge.dataset.type = 'owner';
        badge.innerHTML = `
            <span class="badge-label">${owner}</span>
            <span class="badge-count">${count}</span>
        `;
        badge.addEventListener('click', () => toggleBadge(badge));
        ownerFilters.appendChild(badge);
    });

    // Code status filters
    const codeStatuses = [...new Set(rawData.map(row => row['PushCode'] || 'Unknown'))];
    const codeFilters = document.getElementById('codeFilters');
    codeFilters.innerHTML = '';
    codeFilters.className = 'filter-badges';
    codeStatuses.forEach(status => {
        const count = rawData.filter(row => (row['PushCode'] || 'Unknown') === status).length;
        const badge = document.createElement('div');
        badge.className = 'filter-badge active';
        badge.dataset.value = status;
        badge.dataset.type = 'code';
        badge.innerHTML = `
            <span class="badge-label">${status}</span>
            <span class="badge-count">${count}</span>
        `;
        badge.addEventListener('click', () => toggleBadge(badge));
        codeFilters.appendChild(badge);
    });

    // Pipeline filters
    const pipelineStatuses = [...new Set(rawData.map(row => row['Has Gitlap Pipeline'] || 'Unknown'))];
    const pipelineFilters = document.getElementById('pipelineFilters');
    pipelineFilters.innerHTML = '';
    pipelineFilters.className = 'filter-badges';
    pipelineStatuses.forEach(status => {
        const count = rawData.filter(row => (row['Has Gitlap Pipeline'] || 'Unknown') === status).length;
        const badge = document.createElement('div');
        badge.className = 'filter-badge active';
        badge.dataset.value = status;
        badge.dataset.type = 'pipeline';
        badge.innerHTML = `
            <span class="badge-label">${status}</span>
            <span class="badge-count">${count}</span>
        `;
        badge.addEventListener('click', () => toggleBadge(badge));
        pipelineFilters.appendChild(badge);
    });
}

function toggleBadge(badge) {
    badge.classList.toggle('active');
}

function resetFilters() {
    document.querySelectorAll('.filter-badge').forEach(badge => {
        if (badge.dataset.value === 'Unassigned') {
            badge.classList.remove('active');
        } else {
            badge.classList.add('active');
        }
    });
}

function toggleFilterSection() {
    const filterSection = document.getElementById('filterSection');
    filterSection.classList.toggle('active');
}

function applyFilters() {
    const selectedPriorities = Array.from(document.querySelectorAll('#priorityFilters .filter-badge.active')).map(badge => badge.dataset.value);
    const selectedOwners = Array.from(document.querySelectorAll('#ownerFilters .filter-badge.active')).map(badge => badge.dataset.value);
    const selectedCodeStatuses = Array.from(document.querySelectorAll('#codeFilters .filter-badge.active')).map(badge => badge.dataset.value);
    const selectedPipelines = Array.from(document.querySelectorAll('#pipelineFilters .filter-badge.active')).map(badge => badge.dataset.value);

    filteredData = rawData.filter(row => {
        const priority = row['Priority'] || 'No Priority';
        const owner = row['Owner'] || 'Unassigned';
        const code = row['PushCode'] || 'Unknown';
        const pipeline = row['Has Gitlap Pipeline'] || 'Unknown';

        return selectedPriorities.includes(priority) &&
               selectedOwners.includes(owner) &&
               selectedCodeStatuses.includes(code) &&
               selectedPipelines.includes(pipeline);
    });

    // Reset gantt filters when main filters change
    ganttFilters.owner = [];
    ganttFilters.priority = [];
    ganttFilterOpen = null;

    renderDashboard();
    renderGanttChart();

    // Close filter section after applying
    document.getElementById('filterSection').classList.remove('active');
}

// ==================== Calculate Metrics ====================
function calculateMetrics(data) {
    const total = data.length;

    const priority = {};
    data.forEach(row => {
        const p = row['Priority'] || 'No Priority';
        priority[p] = (priority[p] || 0) + 1;
    });

    const owner = {};
    data.forEach(row => {
        const o = row['Owner'] || 'Unassigned';
        owner[o] = (owner[o] || 0) + 1;
    });

    const sortedOwners = Object.entries(owner)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    const pushcode = {};
    data.forEach(row => {
        const p = row['PushCode'] || 'Unknown';
        pushcode[p] = (pushcode[p] || 0) + 1;
    });

    const pipeline = {};
    data.forEach(row => {
        const p = row['Has Gitlap Pipeline'] || 'Unknown';
        pipeline[p] = (pipeline[p] || 0) + 1;
    });

    const grafana = {};
    data.forEach(row => {
        const g = row['Grafana'] || 'Unknown';
        grafana[g] = (grafana[g] || 0) + 1;
    });

    const readable = {};

    // Debug: Check first row to see column names
    if (data.length > 0) {
        console.log('All column names:', Object.keys(data[0]));

        // Try different possible column names
        const possibleNames = ['ReadAble', 'Readable', 'Document Status', 'Documentation', 'Doc Status'];
        possibleNames.forEach(name => {
            if (data[0][name] !== undefined) {
                console.log(`Found column "${name}" with value:`, data[0][name]);
            }
        });
    }

    data.forEach(row => {
        // Try multiple possible column names
        let r = row['ReadAble'] || row['Readable'] || row['Document Status'] || row['Documentation'] || 'Unknown';
        readable[r] = (readable[r] || 0) + 1;
    });

    // Debug: log what values we found
    console.log('Documentation values found:', readable);

    const appTypes = {
        'Web': data.filter(row => row['Web']).length,
        'Mobile': data.filter(row => row['Mobile']).length,
        'POS': data.filter(row => row['Pos']).length,
        'API': data.filter(row => row['API']).length,
        'Support Tools & POC': data.filter(row => row['Etc']).length
    };

    const subproject = {};
    data.forEach(row => {
        const s = row['Sub Project'] || 'No Category';
        subproject[s] = (subproject[s] || 0) + 1;
    });

    const sortedSubprojects = Object.entries(subproject)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    const p1Data = data.filter(row => row['Priority'] === 'P1');
    const totalP1 = p1Data.length;
    const p1WithCode = p1Data.filter(row => row['PushCode'] === 'Yes').length;
    const p1WithGrafana = p1Data.filter(row => row['Grafana'] === 'Yes').length;
    const unassigned = data.filter(row => !row['Owner']).length;
    const withPipeline = data.filter(row => row['Has Gitlap Pipeline'] === 'Yes').length;

    const p1NoCode = p1Data.filter(row => row['PushCode'] === 'No').map(row => ({
        project: row['Project'] || 'Unknown',
        owner: row['Owner'] || 'Unassigned'
    }));

    // Projects without pipeline (excluding Support Tools & POC)
    const projectsNoPipeline = data.filter(row => {
        const appType = row['Etc'];
        const hasPipeline = row['Has Gitlap Pipeline'] === 'Yes';
        // If not Support Tools/POC and doesn't have pipeline
        return !appType && !hasPipeline;
    }).map(row => ({
        project: row['Project'] || 'Unknown',
        owner: row['Owner'] || 'Unassigned',
        priority: row['Priority'] || 'No Priority'
    }));

    // Projects with pipeline but no Grafana
    const pipelineNoGrafana = data.filter(row => {
        const hasPipeline = row['Has Gitlap Pipeline'] === 'Yes';
        const hasGrafana = row['Grafana'] === 'Yes';
        return hasPipeline && !hasGrafana;
    }).map(row => ({
        project: row['Project'] || 'Unknown',
        owner: row['Owner'] || 'Unassigned',
        priority: row['Priority'] || 'No Priority'
    }));

    return {
        total_projects: total,
        total_p1: totalP1,
        p1_with_code: p1WithCode,
        p1_with_grafana: p1WithGrafana,
        unassigned: unassigned,
        with_pipeline: withPipeline,
        priority: priority,
        owner: sortedOwners,
        pushcode: pushcode,
        pipeline: pipeline,
        grafana: grafana,
        readable: readable,
        app_types: appTypes,
        subproject: sortedSubprojects,
        p1_no_code: p1NoCode,
        projects_no_pipeline: projectsNoPipeline,
        pipeline_no_grafana: pipelineNoGrafana
    };
}

// ==================== Render Dashboard ====================
function renderDashboard() {
    const data = calculateMetrics(filteredData);
    updateStats(data);
    updateCharts(data);
    updateAlerts(data);
    updateRecommendations(data);

    // Also prepare slide data
    prepareSlideData(data);
}

function updateStats(data) {
    document.getElementById('totalProjects').textContent = data.total_projects;
    document.getElementById('totalP1').textContent = data.total_p1;
    document.getElementById('p1WithCode').textContent = data.p1_with_code;
    document.getElementById('p1WithGrafana').textContent = data.p1_with_grafana;
    document.getElementById('unassigned').textContent = data.unassigned;

    const codePercentage = data.total_p1 > 0 ? (data.p1_with_code / data.total_p1 * 100).toFixed(0) : 0;
    const grafanaPercentage = data.total_p1 > 0 ? (data.p1_with_grafana / data.total_p1 * 100).toFixed(0) : 0;

    document.getElementById('codeProgress').style.width = codePercentage + '%';
    document.getElementById('codeProgress').textContent = codePercentage + '%';
    document.getElementById('grafanaProgress').style.width = grafanaPercentage + '%';
    document.getElementById('grafanaProgress').textContent = grafanaPercentage + '%';
}

function updateCharts(data) {
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });

    const priorityLabels = Object.keys(data.priority);
    charts.priority = new Chart(document.getElementById('priorityChart'), {
        type: 'doughnut',
        data: {
            labels: priorityLabels,
            datasets: [{
                data: Object.values(data.priority),
                backgroundColor: [chartColors.gray, chartColors.orange, chartColors.red, chartColors.yellow, chartColors.blue]
            }]
        },
        options: {
            ...defaultOptions,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = priorityLabels[index];
                    const projects = filteredData
                        .filter(row => (row['Priority'] || 'No Priority') === label)
                        .map(row => ({
                            name: row['Project'] || 'Unknown',
                            owner: row['Owner'] || 'Unassigned',
                            priority: row['Priority'],
                            status: null
                        }))
                        .sort((a, b) => a.owner.localeCompare(b.owner));
                    showProjectModal(`Priority: ${label}`, projects);
                }
            },
            plugins: {
                ...defaultOptions.plugins,
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    display: true,
                    color: 'white',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: (value, context) => {
                        return value;
                    }
                }
            }
        },
        plugins: [{
            id: 'datalabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element, index) => {
                        const data = dataset.data[index];
                        const { x, y } = element.tooltipPosition();

                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(data, x, y);
                    });
                });
            }
        }]
    });

    charts.owner = new Chart(document.getElementById('ownerChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(data.owner),
            datasets: [{
                label: 'Projects',
                data: Object.values(data.owner),
                backgroundColor: chartColors.purple
            }]
        },
        options: {
            ...defaultOptions,
            indexAxis: 'y',
            plugins: {
                ...defaultOptions.plugins,
                legend: {
                    display: false
                }
            }
        },
        plugins: [{
            id: 'barLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const data = dataset.data[index];
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(data, bar.x - 5, bar.y);
                    });
                });
            }
        }]
    });

    // Sort to put Yes first, then No, then Unknown
    const sortedPushcode = ['Yes', 'No', 'Unknown'].filter(key => data.pushcode[key] !== undefined);
    const pushcodeLabels = sortedPushcode;
    const pushcodeData = sortedPushcode.map(key => data.pushcode[key]);
    const pushcodeColors = pushcodeLabels.map(label => {
        if (label === 'Yes') return chartColors.green;
        if (label === 'No') return chartColors.red;
        return chartColors.gray;
    });

    charts.pushcode = new Chart(document.getElementById('pushcodeChart'), {
        type: 'pie',
        data: {
            labels: pushcodeLabels,
            datasets: [{
                data: pushcodeData,
                backgroundColor: pushcodeColors
            }]
        },
        options: {
            ...defaultOptions,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = pushcodeLabels[index];
                    const projects = filteredData
                        .filter(row => (row['PushCode'] || 'Unknown') === label)
                        .map(row => ({
                            name: row['Project'] || 'Unknown',
                            owner: row['Owner'] || 'Unassigned',
                            priority: row['Priority'] || 'No Priority',
                            status: `Code: ${label}`
                        }))
                        .sort((a, b) => {
                            // Sort by priority first
                            const priorityOrder = { 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4, 'No Priority': 999 };
                            const aPriority = priorityOrder[a.priority] || 100;
                            const bPriority = priorityOrder[b.priority] || 100;
                            if (aPriority !== bPriority) {
                                return aPriority - bPriority;
                            }
                            // Then sort by owner
                            return a.owner.localeCompare(b.owner);
                        });
                    showProjectModal(`Code Availability: ${label}`, projects);
                }
            }
        },
        plugins: [{
            id: 'pieLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element, index) => {
                        const data = dataset.data[index];
                        const { x, y } = element.tooltipPosition();
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(data, x, y);
                    });
                });
            }
        }]
    });

    const sortedPipeline = ['Yes', 'No', 'Unknown'].filter(key => data.pipeline[key] !== undefined);
    const pipelineLabels = sortedPipeline;
    const pipelineData = sortedPipeline.map(key => data.pipeline[key]);
    const pipelineColors = pipelineLabels.map(label => {
        if (label === 'Yes') return chartColors.green;
        if (label === 'No') return chartColors.red;
        return chartColors.gray;
    });

    charts.pipeline = new Chart(document.getElementById('pipelineChart'), {
        type: 'pie',
        data: {
            labels: pipelineLabels,
            datasets: [{
                data: pipelineData,
                backgroundColor: pipelineColors
            }]
        },
        options: {
            ...defaultOptions,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = pipelineLabels[index];
                    const projects = filteredData
                        .filter(row => (row['Has Gitlap Pipeline'] || 'Unknown') === label)
                        .map(row => ({
                            name: row['Project'] || 'Unknown',
                            owner: row['Owner'] || 'Unassigned',
                            priority: row['Priority'] || 'No Priority',
                            status: `Pipeline: ${label}`
                        }))
                        .sort((a, b) => {
                            // Sort by priority first
                            const priorityOrder = { 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4, 'No Priority': 999 };
                            const aPriority = priorityOrder[a.priority] || 100;
                            const bPriority = priorityOrder[b.priority] || 100;
                            if (aPriority !== bPriority) {
                                return aPriority - bPriority;
                            }
                            // Then sort by owner
                            return a.owner.localeCompare(b.owner);
                        });
                    showProjectModal(`GitLab Pipeline: ${label}`, projects);
                }
            }
        },
        plugins: [{
            id: 'pieLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element, index) => {
                        const data = dataset.data[index];
                        const { x, y } = element.tooltipPosition();
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(data, x, y);
                    });
                });
            }
        }]
    });

    const sortedGrafana = ['Yes', 'No', 'Unknown'].filter(key => data.grafana[key] !== undefined);
    const grafanaLabels = sortedGrafana;
    const grafanaData = sortedGrafana.map(key => data.grafana[key]);
    const grafanaColors = grafanaLabels.map(label => {
        if (label === 'Yes') return chartColors.green;
        if (label === 'No') return chartColors.red;
        return chartColors.gray;
    });

    charts.grafana = new Chart(document.getElementById('grafanaChart'), {
        type: 'pie',
        data: {
            labels: grafanaLabels,
            datasets: [{
                data: grafanaData,
                backgroundColor: grafanaColors
            }]
        },
        options: {
            ...defaultOptions,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = grafanaLabels[index];
                    const projects = filteredData
                        .filter(row => (row['Grafana'] || 'Unknown') === label)
                        .map(row => ({
                            name: row['Project'] || 'Unknown',
                            owner: row['Owner'] || 'Unassigned',
                            priority: row['Priority'] || 'No Priority',
                            status: `Grafana: ${label}`
                        }))
                        .sort((a, b) => {
                            // Sort by priority first
                            const priorityOrder = { 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4, 'No Priority': 999 };
                            const aPriority = priorityOrder[a.priority] || 100;
                            const bPriority = priorityOrder[b.priority] || 100;
                            if (aPriority !== bPriority) {
                                return aPriority - bPriority;
                            }
                            // Then sort by owner
                            return a.owner.localeCompare(b.owner);
                        });
                    showProjectModal(`Grafana Monitoring: ${label}`, projects);
                }
            }
        },
        plugins: [{
            id: 'pieLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element, index) => {
                        const data = dataset.data[index];
                        const { x, y } = element.tooltipPosition();
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(data, x, y);
                    });
                });
            }
        }]
    });

    const appTypesLabels = Object.keys(data.app_types);
    charts.appTypes = new Chart(document.getElementById('appTypesChart'), {
        type: 'bar',
        data: {
            labels: appTypesLabels,
            datasets: [{
                label: 'Projects',
                data: Object.values(data.app_types),
                backgroundColor: [chartColors.blue, chartColors.purple, chartColors.orange, chartColors.green, chartColors.gray]
            }]
        },
        options: {
            ...defaultOptions,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = appTypesLabels[index];
                    const projects = filteredData
                        .filter(row => {
                            if (label === 'Web') return row['Web'];
                            if (label === 'Mobile') return row['Mobile'];
                            if (label === 'POS') return row['Pos'];
                            if (label === 'API') return row['API'];
                            if (label === 'Support Tools & POC') return row['Etc'];
                            return false;
                        })
                        .map(row => ({
                            name: row['Project'] || 'Unknown',
                            owner: row['Owner'] || 'Unassigned',
                            priority: row['Priority'] || 'No Priority',
                            status: `Type: ${label}`
                        }))
                        .sort((a, b) => {
                            // Sort by priority first
                            const priorityOrder = { 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4, 'No Priority': 999 };
                            const aPriority = priorityOrder[a.priority] || 100;
                            const bPriority = priorityOrder[b.priority] || 100;
                            if (aPriority !== bPriority) {
                                return aPriority - bPriority;
                            }
                            // Then sort by owner
                            return a.owner.localeCompare(b.owner);
                        });
                    showProjectModal(`Application Type: ${label}`, projects);
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        },
        plugins: [{
            id: 'barLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const data = dataset.data[index];
                        if (data > 0) {
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 12px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                            ctx.fillText(data, bar.x, bar.y - 5);
                        }
                    });
                });
            }
        }]
    });

    // Sort readable to put Created first (green), then others
    const readableOrder = ['Created', 'Understand', 'NotCreated', 'NotClear', 'Unknown'];
    const sortedReadable = readableOrder.filter(key => data.readable[key] !== undefined);
    const readableLabels = sortedReadable;
    const readableData = sortedReadable.map(key => data.readable[key]);
    const readableColors = readableLabels.map(label => {
        if (label === 'Created') return chartColors.green;
        if (label === 'Understand') return chartColors.green;
        if (label === 'NotCreated') return chartColors.red;
        if (label === 'NotClear') return chartColors.orange;
        return chartColors.gray;
    });

    charts.readable = new Chart(document.getElementById('readableChart'), {
        type: 'doughnut',
        data: {
            labels: readableLabels,
            datasets: [{
                data: readableData,
                backgroundColor: readableColors
            }]
        },
        options: {
            ...defaultOptions,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = readableLabels[index];
                    const projects = filteredData
                        .filter(row => (row['ReadAble'] || 'Unknown') === label)
                        .map(row => ({
                            name: row['Project'] || 'Unknown',
                            owner: row['Owner'] || 'Unassigned',
                            priority: row['Priority'] || 'No Priority',
                            status: `Documentation: ${label}`
                        }))
                        .sort((a, b) => {
                            // Sort by priority first
                            const priorityOrder = { 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4, 'No Priority': 999 };
                            const aPriority = priorityOrder[a.priority] || 100;
                            const bPriority = priorityOrder[b.priority] || 100;
                            if (aPriority !== bPriority) {
                                return aPriority - bPriority;
                            }
                            // Then sort by owner
                            return a.owner.localeCompare(b.owner);
                        });
                    showProjectModal(`Documentation Status: ${label}`, projects);
                }
            }
        },
        plugins: [{
            id: 'doughnutLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element, index) => {
                        const data = dataset.data[index];
                        const { x, y } = element.tooltipPosition();
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(data, x, y);
                    });
                });
            }
        }]
    });

    charts.subproject = new Chart(document.getElementById('subprojectChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(data.subproject),
            datasets: [{
                label: 'Projects',
                data: Object.values(data.subproject),
                backgroundColor: chartColors.pink
            }]
        },
        options: {
            ...defaultOptions,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            }
        },
        plugins: [{
            id: 'barLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const data = dataset.data[index];
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(data, bar.x - 5, bar.y);
                    });
                });
            }
        }]
    });
}

function updateAlerts(data) {
    // No longer needed - alerts are hidden
}

function updateRecommendations(data) {
    // No longer needed - recommendations are hidden
}

// Modal functions
function closeModal() {
    document.getElementById('projectModal').classList.remove('active');
}

function showProjectModal(title, projects) {
    const modal = document.getElementById('projectModal');
    const modalTitle = document.getElementById('modalTitle');
    const projectCount = document.getElementById('projectCount');
    const projectTableBody = document.getElementById('projectTableBody');
    const projectTable = document.getElementById('projectTable');
    const modalContent = modal.querySelector('.modal-content');

    modalTitle.textContent = title;
    projectCount.textContent = `Total: ${projects.length} project${projects.length !== 1 ? 's' : ''}`;
    projectTableBody.innerHTML = '';

    // Check if we need to show status column
    const hasStatus = projects.length > 0 && projects[0].status !== null;

    // Update table header
    const tableHead = projectTable.querySelector('thead tr');
    if (hasStatus) {
        tableHead.innerHTML = `
            <th>#</th>
            <th>Project Name</th>
            <th>Owner</th>
            <th>Priority</th>
            <th>Status</th>
        `;
    } else {
        tableHead.innerHTML = `
            <th>#</th>
            <th>Project Name</th>
            <th>Owner</th>
            <th>Priority</th>
        `;
    }

    if (projects.length === 0) {
        const colspan = hasStatus ? 5 : 4;
        projectTableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; padding: 30px; color: #999;">ไม่มีโปรเจกต์</td></tr>`;
    } else {
        projects.forEach((project, index) => {
            const tr = document.createElement('tr');
            const priority = project.priority || 'No Priority';
            const priorityClass = priority.startsWith('P') ? `priority-${priority}` : '';

            if (hasStatus) {
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="project-name">${project.name}</td>
                    <td>${project.owner || 'Unassigned'}</td>
                    <td><span class="priority-badge ${priorityClass}">${priority}</span></td>
                    <td>${project.status}</td>
                `;
            } else {
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="project-name">${project.name}</td>
                    <td>${project.owner || 'Unassigned'}</td>
                    <td><span class="priority-badge ${priorityClass}">${priority}</span></td>
                `;
            }
            projectTableBody.appendChild(tr);
        });
    }

    modal.classList.add('active');

    // Reset scroll to top after modal is shown
    setTimeout(() => {
        const tableWrapper = modal.querySelector('.table-wrapper');
        if (tableWrapper) {
            tableWrapper.scrollTop = 0;
        }
    }, 0);
}

// Close modal when clicking outside or pressing ESC
window.addEventListener('load', function() {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }

    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            const modal = document.getElementById('projectModal');
            if (modal && modal.classList.contains('active')) {
                closeModal();
            }
        }
    });
});

// ==================== Presentation Mode ====================
function enterPresentationMode() {
    if (!filteredData) {
        alert('กรุณาอัพโหลดไฟล์และกรองข้อมูลก่อน');
        return;
    }

    document.body.classList.add('presentation-mode');
    currentSlide = 1;
    showSlide(1);
    updateSlideIndicators();
    updateNavigation();
    updateProgressBar();

    // Render slide charts and update stats
    const data = calculateMetrics(filteredData);
    renderSlideCharts(data);
    updateSlideStats(data);
    updateSlideInsights(data);
    updateSlideAlerts(data);
}

function updateSlideStats(data) {
    document.getElementById('totalProjectsSlide').textContent = data.total_projects;
    document.getElementById('totalP1Slide').textContent = data.total_p1;
    document.getElementById('p1WithCodeSlide').textContent = data.p1_with_code;
    document.getElementById('p1WithGrafanaSlide').textContent = data.p1_with_grafana;
    document.getElementById('unassignedSlide').textContent = data.unassigned;
    document.getElementById('withPipelineSlide').textContent = data.with_pipeline;
}

function updateSlideInsights(data) {
    const keyInsightsSlide = document.getElementById('keyInsightsSlide');
    if (!keyInsightsSlide) return;

    keyInsightsSlide.innerHTML = '';

    const insights = [
        `มีโปรเจกต์ทั้งหมด ${data.total_projects} โปรเจกต์ โดย ${data.total_p1} โปรเจกต์เป็น P1 (Priority สูงสุด)`,
        `${data.p1_with_code} โปรเจกต์ P1 มี Code แล้ว (${((data.p1_with_code/data.total_p1)*100).toFixed(1)}%)`,
        `${data.p1_with_grafana} โปรเจกต์ P1 มี Grafana Dashboard (${((data.p1_with_grafana/data.total_p1)*100).toFixed(1)}%)`,
        `${data.unassigned} โปรเจกต์ยังไม่มีผู้รับผิดชอบที่ชัดเจน`,
        `${data.with_pipeline} โปรเจกต์มี GitLab Pipeline ที่ทำงานอยู่`
    ];

    insights.forEach((insight, index) => {
        const div = document.createElement('div');
        div.className = 'insight-item';
        div.innerHTML = `<span class="insight-number">${index + 1}</span>${insight}`;
        keyInsightsSlide.appendChild(div);
    });
}

function updateSlideAlerts(data) {
    const alertListSlide = document.getElementById('alertListSlide');
    if (!alertListSlide) return;

    alertListSlide.innerHTML = '';

    // Projects without pipeline (excluding Support Tools & POC)
    if (data.projects_no_pipeline && data.projects_no_pipeline.length > 0) {
        const alertBox = document.createElement('div');
        alertBox.className = 'alert-box';
        const projectList = data.projects_no_pipeline.slice(0, 8).map(p =>
            `<li class="alert-detail-item">${p.project} (${p.owner} - ${p.priority})</li>`
        ).join('');
        alertBox.innerHTML = `
            <div class="alert-title">⚠️ Projects without Pipeline (${data.projects_no_pipeline.length})</div>
            <div class="alert-text">โปรเจกต์ที่ไม่ใช่ Support Tools/POC ควรมี Pipeline</div>
            <ul class="alert-detail-list">${projectList}</ul>
        `;
        alertListSlide.appendChild(alertBox);
    }

    // Projects with pipeline but no Grafana
    if (data.pipeline_no_grafana && data.pipeline_no_grafana.length > 0) {
        const alertBox = document.createElement('div');
        alertBox.className = 'alert-box';
        const projectList = data.pipeline_no_grafana.slice(0, 8).map(p =>
            `<li class="alert-detail-item">${p.project} (${p.owner} - ${p.priority})</li>`
        ).join('');
        alertBox.innerHTML = `
            <div class="alert-title">📊 Projects without Grafana (${data.pipeline_no_grafana.length})</div>
            <div class="alert-text">โปรเจกต์ที่มี Pipeline แล้วควรมี Grafana Dashboard</div>
            <ul class="alert-detail-list">${projectList}</ul>
        `;
        alertListSlide.appendChild(alertBox);
    }

    // P1 projects without code
    if (data.p1_no_code && data.p1_no_code.length > 0) {
        const alertBox = document.createElement('div');
        alertBox.className = 'alert-box';
        const projectList = data.p1_no_code.slice(0, 8).map(p =>
            `<li class="alert-detail-item">${p.project} (${p.owner})</li>`
        ).join('');
        alertBox.innerHTML = `
            <div class="alert-title">💻 P1 Projects without Code (${data.p1_no_code.length})</div>
            <div class="alert-text">โปรเจกต์ P1 ที่ยังไม่มี Code</div>
            <ul class="alert-detail-list">${projectList}</ul>
        `;
        alertListSlide.appendChild(alertBox);
    }

    if (alertListSlide.children.length === 0) {
        alertListSlide.innerHTML = '<div class="alert-box" style="border-left-color: #2ecc71; background: rgba(46, 204, 113, 0.2);"><div class="alert-title">✅ ไม่มีประเด็นที่ต้องเร่งแก้ไข</div></div>';
    }
}

function exitPresentationMode() {
    document.body.classList.remove('presentation-mode');
    currentSlide = 1;
}

async function downloadPDF() {
    if (!filteredData) {
        alert('กรุณาอัพโหลดไฟล์และกรองข้อมูลก่อน');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4'); // landscape, millimeters, A4
        const data = calculateMetrics(filteredData);

        // Define colors
        const primaryColor = [102, 126, 234]; // #667eea
        const whiteColor = [255, 255, 255];
        const darkColor = [79, 93, 117]; // #4F5D75

        let pageNumber = 1;

        // Helper function to add page
        const addNewPage = () => {
            if (pageNumber > 1) {
                pdf.addPage();
            }
            pageNumber++;
        };

        // Page 1: Title Page
        pdf.setFillColor(...primaryColor);
        pdf.rect(0, 0, 297, 210, 'F');
        pdf.setTextColor(...whiteColor);
        pdf.setFontSize(44);
        pdf.setFont(undefined, 'bold');
        pdf.text('KT Automated Plan', 148.5, 80, { align: 'center' });
        pdf.setFontSize(28);
        pdf.setFont(undefined, 'normal');
        pdf.text('Executive Dashboard & Insights', 148.5, 100, { align: 'center' });
        pdf.setFontSize(18);
        pdf.text('Knowledge Transfer Project Portfolio Analysis', 148.5, 115, { align: 'center' });

        // Page 2: Overview Stats
        addNewPage();
        pdf.setFillColor(...primaryColor);
        pdf.rect(0, 0, 297, 210, 'F');
        pdf.setTextColor(...whiteColor);
        pdf.setFontSize(32);
        pdf.setFont(undefined, 'bold');
        pdf.text('ภาพรวมโครงการ', 20, 30);

        const stats = [
            ['📁 Total Projects', data.total_projects],
            ['🎯 P1 Projects', data.total_p1],
            ['💻 P1 with Code', data.p1_with_code],
            ['📈 P1 with Monitoring', data.p1_with_grafana],
            ['⚠️ Unassigned', data.unassigned],
            ['🔧 With Pipeline', data.with_pipeline]
        ];

        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        stats.forEach((stat, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const x = 30 + col * 90;
            const y = 60 + row * 60;

            pdf.text(stat[0], x, y);
            pdf.setFontSize(40);
            pdf.text(stat[1].toString(), x + 20, y + 25);
            pdf.setFontSize(16);
        });

        // Page 3: Top Project Owners
        addNewPage();
        pdf.setFillColor(...primaryColor);
        pdf.rect(0, 0, 297, 210, 'F');
        pdf.setTextColor(...whiteColor);
        pdf.setFontSize(32);
        pdf.setFont(undefined, 'bold');
        pdf.text('Top Project Owners', 20, 30);
        pdf.setFontSize(18);
        pdf.setFont(undefined, 'normal');
        pdf.text('การกระจายทีมงานและผู้รับผิดชอบ', 20, 45);

        const ownerEntries = Object.entries(data.owner).slice(0, 10);
        pdf.setFontSize(12);
        let yPos = 60;
        ownerEntries.forEach(([owner, count], i) => {
            pdf.text(`${i + 1}. ${owner}`, 30, yPos);
            pdf.text(count.toString(), 250, yPos, { align: 'right' });
            yPos += 10;
        });

        // Page 4: Key Insights
        addNewPage();
        pdf.setFillColor(...primaryColor);
        pdf.rect(0, 0, 297, 210, 'F');
        pdf.setTextColor(...whiteColor);
        pdf.setFontSize(32);
        pdf.setFont(undefined, 'bold');
        pdf.text('Key Insights', 20, 30);
        pdf.setFontSize(18);
        pdf.setFont(undefined, 'normal');
        pdf.text('ข้อมูลเชิงลึกที่สำคัญ', 20, 45);

        const insights = [
            `มีโปรเจกต์ทั้งหมด ${data.total_projects} โปรเจกต์ โดย ${data.total_p1} โปรเจกต์เป็น P1`,
            `${data.p1_with_code} โปรเจกต์ P1 มี Code แล้ว (${((data.p1_with_code/data.total_p1)*100).toFixed(1)}%)`,
            `${data.p1_with_grafana} โปรเจกต์ P1 มี Grafana Dashboard (${((data.p1_with_grafana/data.total_p1)*100).toFixed(1)}%)`,
            `${data.unassigned} โปรเจกต์ยังไม่มีผู้รับผิดชอบที่ชัดเจน`,
            `${data.with_pipeline} โปรเจกต์มี GitLab Pipeline ที่ทำงานอยู่`
        ];

        pdf.setFontSize(14);
        yPos = 65;
        insights.forEach((insight, i) => {
            pdf.text(`${i + 1}. ${insight}`, 30, yPos);
            yPos += 15;
        });

        // Page 5: Critical Issues
        addNewPage();
        pdf.setFillColor(...primaryColor);
        pdf.rect(0, 0, 297, 210, 'F');
        pdf.setTextColor(...whiteColor);
        pdf.setFontSize(32);
        pdf.setFont(undefined, 'bold');
        pdf.text('⚠️ Critical Issues', 20, 30);
        pdf.setFontSize(18);
        pdf.setFont(undefined, 'normal');
        pdf.text('ประเด็นที่ต้องให้ความสำคัญเร่งด่วน', 20, 45);

        pdf.setFontSize(14);
        yPos = 65;
        if (data.projects_no_pipeline && data.projects_no_pipeline.length > 0) {
            pdf.setFont(undefined, 'bold');
            pdf.text(`Projects without Pipeline: ${data.projects_no_pipeline.length}`, 30, yPos);
            yPos += 12;
        }
        if (data.pipeline_no_grafana && data.pipeline_no_grafana.length > 0) {
            pdf.setFont(undefined, 'bold');
            pdf.text(`Projects without Grafana: ${data.pipeline_no_grafana.length}`, 30, yPos);
            yPos += 12;
        }
        if (data.p1_no_code && data.p1_no_code.length > 0) {
            pdf.setFont(undefined, 'bold');
            pdf.text(`P1 Projects without Code: ${data.p1_no_code.length}`, 30, yPos);
        }

        // Page 6: Thank You
        addNewPage();
        pdf.setFillColor(...primaryColor);
        pdf.rect(0, 0, 297, 210, 'F');
        pdf.setTextColor(...whiteColor);
        pdf.setFontSize(60);
        pdf.text('🙏', 148.5, 80, { align: 'center' });
        pdf.setFontSize(44);
        pdf.setFont(undefined, 'bold');
        pdf.text('Thank You', 148.5, 110, { align: 'center' });
        pdf.setFontSize(24);
        pdf.setFont(undefined, 'normal');
        pdf.text('Questions & Discussion', 148.5, 130, { align: 'center' });

        // Save PDF
        pdf.save('KT_Automated_Plan_Report.pdf');
        alert('PDF ดาวน์โหลดสำเร็จ!');
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('เกิดข้อผิดพลาดในการสร้าง PDF: ' + error.message);
    }
}

async function downloadPowerPoint() {
    if (!filteredData) {
        alert('กรุณาอัพโหลดไฟล์และกรองข้อมูลก่อน');
        return;
    }

    try {
        const pptx = new PptxGenJS();
        const data = calculateMetrics(filteredData);

        // Slide 1: Title
        let slide = pptx.addSlide();
        slide.background = { fill: '667eea' };
        slide.addText('KT Automated Plan', {
            x: 1, y: 2, w: 8, h: 1.5,
            fontSize: 44, bold: true, color: 'FFFFFF', align: 'center'
        });
        slide.addText('Executive Dashboard & Insights', {
            x: 1, y: 3.5, w: 8, h: 0.8,
            fontSize: 28, color: 'FFFFFF', align: 'center'
        });
        slide.addText('Knowledge Transfer Project Portfolio Analysis', {
            x: 1, y: 4.5, w: 8, h: 0.5,
            fontSize: 18, color: 'FFFFFF', align: 'center'
        });

        // Slide 2: Overview Stats
        slide = pptx.addSlide();
        slide.background = { fill: '667eea' };
        slide.addText('ภาพรวมโครงการ', {
            x: 0.5, y: 0.5, w: 9, h: 0.6,
            fontSize: 32, bold: true, color: 'FFFFFF'
        });

        const stats = [
            ['📁 Total Projects', data.total_projects],
            ['🎯 P1 Projects', data.total_p1],
            ['💻 P1 with Code', data.p1_with_code],
            ['📈 P1 with Monitoring', data.p1_with_grafana],
            ['⚠️ Unassigned', data.unassigned],
            ['🔧 With Pipeline', data.with_pipeline]
        ];

        stats.forEach((stat, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            slide.addText(stat[0], {
                x: 0.5 + col * 3.3, y: 1.5 + row * 2, w: 3, h: 0.5,
                fontSize: 16, color: 'FFFFFF', bold: true
            });
            slide.addText(stat[1].toString(), {
                x: 0.5 + col * 3.3, y: 2 + row * 2, w: 3, h: 1,
                fontSize: 40, color: 'FFFFFF', bold: true, align: 'center'
            });
        });

        // Slide 3: Top Project Owners
        slide = pptx.addSlide();
        slide.background = { fill: '667eea' };
        slide.addText('Top Project Owners', {
            x: 0.5, y: 0.5, w: 9, h: 0.6,
            fontSize: 32, bold: true, color: 'FFFFFF'
        });
        slide.addText('การกระจายทีมงานและผู้รับผิดชอบ', {
            x: 0.5, y: 1, w: 9, h: 0.4,
            fontSize: 18, color: 'FFFFFF'
        });

        // Add owners chart as bar chart
        const ownerEntries = Object.entries(data.owner).slice(0, 10);
        const ownerChartData = [{
            name: 'Projects',
            labels: ownerEntries.map(([owner]) => owner),
            values: ownerEntries.map(([, count]) => count)
        }];
        slide.addChart(pptx.ChartType.bar, ownerChartData, {
            x: 0.5, y: 1.8, w: 9, h: 4,
            barDir: 'bar',
            chartColors: ['764ba2'],
            showValue: true,
            showTitle: false,
            valAxisLabelColor: 'FFFFFF',
            catAxisLabelColor: 'FFFFFF',
            showLegend: false
        });

        // Slide 4: Sub-Project Categories
        slide = pptx.addSlide();
        slide.background = { fill: '667eea' };
        slide.addText('Top Sub-Project Categories', {
            x: 0.5, y: 0.5, w: 9, h: 0.6,
            fontSize: 32, bold: true, color: 'FFFFFF'
        });
        slide.addText('หมวดหมู่และการจัดกลุ่มโครงการ', {
            x: 0.5, y: 1, w: 9, h: 0.4,
            fontSize: 18, color: 'FFFFFF'
        });

        const subprojectEntries = Object.entries(data.subproject).slice(0, 10);
        const subprojectChartData = [{
            name: 'Projects',
            labels: subprojectEntries.map(([cat]) => cat),
            values: subprojectEntries.map(([, count]) => count)
        }];
        slide.addChart(pptx.ChartType.bar, subprojectChartData, {
            x: 0.5, y: 1.8, w: 9, h: 4,
            barDir: 'bar',
            chartColors: ['667eea'],
            showValue: true,
            showTitle: false,
            valAxisLabelColor: 'FFFFFF',
            catAxisLabelColor: 'FFFFFF',
            showLegend: false
        });

        // Slide 5: Priority & Application Types
        slide = pptx.addSlide();
        slide.background = { fill: '667eea' };
        slide.addText('Priority & Application Types', {
            x: 0.5, y: 0.5, w: 9, h: 0.6,
            fontSize: 32, bold: true, color: 'FFFFFF'
        });

        // Priority Chart (Doughnut)
        const priorityEntries = Object.entries(data.priority);
        const priorityChartData = [{
            name: 'Priority',
            labels: priorityEntries.map(([p]) => p),
            values: priorityEntries.map(([, count]) => count)
        }];
        slide.addChart(pptx.ChartType.doughnut, priorityChartData, {
            x: 0.5, y: 1.5, w: 4.5, h: 4,
            chartColors: ['95a5a6', 'f39c12', 'e74c3c', 'f1c40f', '3498db'],
            showValue: true,
            showTitle: false,
            legendPos: 'b',
            legendColor: 'FFFFFF',
            dataLabelColor: 'FFFFFF'
        });

        // Application Types Chart (Bar)
        const appTypeEntries = Object.entries(data.app_types);
        const appTypeChartData = [{
            name: 'Count',
            labels: appTypeEntries.map(([type]) => type),
            values: appTypeEntries.map(([, count]) => count)
        }];
        slide.addChart(pptx.ChartType.bar, appTypeChartData, {
            x: 5.5, y: 1.5, w: 4, h: 4,
            barDir: 'bar',
            chartColors: ['3498db', '667eea', 'f39c12', '2ecc71', '95a5a6'],
            showValue: true,
            showTitle: false,
            valAxisLabelColor: 'FFFFFF',
            catAxisLabelColor: 'FFFFFF',
            showLegend: false
        });

        // Slide 6: Technical Readiness
        slide = pptx.addSlide();
        slide.background = { fill: '667eea' };
        slide.addText('Technical Readiness', {
            x: 0.5, y: 0.5, w: 9, h: 0.6,
            fontSize: 32, bold: true, color: 'FFFFFF'
        });
        slide.addText('สถานะความพร้อมด้านเทคนิค', {
            x: 0.5, y: 1, w: 9, h: 0.4,
            fontSize: 18, color: 'FFFFFF'
        });

        // Code Availability (Pie Chart with sorted colors)
        const sortedPushcode = ['Yes', 'No', 'Unknown'].filter(key => data.pushcode[key] !== undefined);
        const codeColors = sortedPushcode.map(status => {
            if (status === 'Yes') return '2ecc71';
            if (status === 'No') return 'e74c3c';
            return '95a5a6';
        });
        const codeChartData = [{
            name: 'Code',
            labels: sortedPushcode,
            values: sortedPushcode.map(status => data.pushcode[status])
        }];
        slide.addChart(pptx.ChartType.pie, codeChartData, {
            x: 0.5, y: 1.8, w: 4.5, h: 3.8,
            chartColors: codeColors,
            showValue: true,
            showTitle: false,
            legendPos: 'b',
            legendColor: 'FFFFFF',
            dataLabelColor: 'FFFFFF'
        });

        // Pipeline Status (Pie Chart with sorted colors)
        const sortedPipeline = ['Yes', 'No', 'Unknown'].filter(key => data.pipeline[key] !== undefined);
        const pipelineColors = sortedPipeline.map(status => {
            if (status === 'Yes') return '2ecc71';
            if (status === 'No') return 'e74c3c';
            return '95a5a6';
        });
        const pipelineChartData = [{
            name: 'Pipeline',
            labels: sortedPipeline,
            values: sortedPipeline.map(status => data.pipeline[status])
        }];
        slide.addChart(pptx.ChartType.pie, pipelineChartData, {
            x: 5.5, y: 1.8, w: 4, h: 3.8,
            chartColors: pipelineColors,
            showValue: true,
            showTitle: false,
            legendPos: 'b',
            legendColor: 'FFFFFF',
            dataLabelColor: 'FFFFFF'
        });

        // Slide 7: Monitoring & Documentation
        slide = pptx.addSlide();
        slide.background = { fill: '667eea' };
        slide.addText('Monitoring & Documentation', {
            x: 0.5, y: 0.5, w: 9, h: 0.6,
            fontSize: 32, bold: true, color: 'FFFFFF'
        });
        slide.addText('การติดตามและเอกสารประกอบ', {
            x: 0.5, y: 1, w: 9, h: 0.4,
            fontSize: 18, color: 'FFFFFF'
        });

        // Grafana Monitoring (Pie Chart with sorted colors)
        const sortedGrafana = ['Yes', 'No', 'Unknown'].filter(key => data.grafana[key] !== undefined);
        const grafanaColors = sortedGrafana.map(status => {
            if (status === 'Yes') return '2ecc71';
            if (status === 'No') return 'e74c3c';
            return '95a5a6';
        });
        const grafanaChartData = [{
            name: 'Grafana',
            labels: sortedGrafana,
            values: sortedGrafana.map(status => data.grafana[status])
        }];
        slide.addChart(pptx.ChartType.pie, grafanaChartData, {
            x: 0.5, y: 1.8, w: 4.5, h: 3.8,
            chartColors: grafanaColors,
            showValue: true,
            showTitle: false,
            legendPos: 'b',
            legendColor: 'FFFFFF',
            dataLabelColor: 'FFFFFF'
        });

        // Documentation Status (Doughnut Chart with sorted colors)
        const readableOrder = ['Created', 'Understand', 'NotCreated', 'NotClear', 'Unknown'];
        const sortedReadable = readableOrder.filter(key => data.readable[key] !== undefined);
        const docColors = sortedReadable.map(status => {
            if (status === 'Created') return '2ecc71';
            if (status === 'Understand') return '2ecc71';
            if (status === 'NotCreated') return 'e74c3c';
            if (status === 'NotClear') return 'f39c12';
            return '95a5a6';
        });
        const docChartData = [{
            name: 'Documentation',
            labels: sortedReadable,
            values: sortedReadable.map(status => data.readable[status])
        }];
        slide.addChart(pptx.ChartType.doughnut, docChartData, {
            x: 5.5, y: 1.8, w: 4, h: 3.8,
            chartColors: docColors,
            showValue: true,
            showTitle: false,
            legendPos: 'b',
            legendColor: 'FFFFFF',
            dataLabelColor: 'FFFFFF'
        });

        // Slide 8: Key Insights
        slide = pptx.addSlide();
        slide.background = { fill: '667eea' };
        slide.addText('Key Insights', {
            x: 0.5, y: 0.5, w: 9, h: 0.6,
            fontSize: 32, bold: true, color: 'FFFFFF'
        });
        slide.addText('ข้อมูลเชิงลึกที่สำคัญ', {
            x: 0.5, y: 1, w: 9, h: 0.4,
            fontSize: 18, color: 'FFFFFF'
        });

        const insights = [
            `มีโปรเจกต์ทั้งหมด ${data.total_projects} โปรเจกต์ โดย ${data.total_p1} โปรเจกต์เป็น P1`,
            `${data.p1_with_code} โปรเจกต์ P1 มี Code แล้ว (${((data.p1_with_code/data.total_p1)*100).toFixed(1)}%)`,
            `${data.p1_with_grafana} โปรเจกต์ P1 มี Grafana Dashboard (${((data.p1_with_grafana/data.total_p1)*100).toFixed(1)}%)`,
            `${data.unassigned} โปรเจกต์ยังไม่มีผู้รับผิดชอบที่ชัดเจน`,
            `${data.with_pipeline} โปรเจกต์มี GitLab Pipeline ที่ทำงานอยู่`
        ];

        insights.forEach((insight, i) => {
            slide.addText(`${i + 1}. ${insight}`, {
                x: 0.8, y: 2 + i * 0.7, w: 8.5, h: 0.6,
                fontSize: 16, color: 'FFFFFF', bullet: false
            });
        });

        // Slide 9: Project Quality Criteria
        slide = pptx.addSlide();
        slide.background = { fill: '667eea' };
        slide.addText('📋 Project Quality Criteria', {
            x: 0.5, y: 0.5, w: 9, h: 0.6,
            fontSize: 32, bold: true, color: 'FFFFFF'
        });
        slide.addText('มาตรฐานและข้อกำหนดสำหรับโครงการ', {
            x: 0.5, y: 1, w: 9, h: 0.4,
            fontSize: 18, color: 'FFFFFF'
        });

        const criteria = [
            'โปรเจกต์ที่ไม่ใช่ Support Tools หรือ POC ควรจะมี Pipeline ที่ทำงานอยู่',
            'โปรเจกต์ที่มี Pipeline แล้ว ควรจะมี Grafana Dashboard สำหรับ Monitoring',
            'โปรเจกต์ P1 (High Priority) ทั้งหมดต้องมี: Code ที่ Push แล้ว, GitLab Pipeline, Documentation ที่ชัดเจน',
            'ทุกโปรเจกต์ควรมี Owner ที่รับผิดชอบชัดเจน และมี Documentation สำหรับ Knowledge Transfer'
        ];

        criteria.forEach((crit, i) => {
            slide.addText(`${i + 1}. ${crit}`, {
                x: 0.8, y: 2 + i * 0.9, w: 8.5, h: 0.8,
                fontSize: 14, color: 'FFFFFF', bullet: false, valign: 'top'
            });
        });

        // Slide 10: Critical Issues
        slide = pptx.addSlide();
        slide.background = { fill: '667eea' };
        slide.addText('⚠️ Critical Issues', {
            x: 0.5, y: 0.5, w: 9, h: 0.6,
            fontSize: 32, bold: true, color: 'FFFFFF'
        });
        slide.addText('ประเด็นที่ต้องให้ความสำคัญเร่งด่วน', {
            x: 0.5, y: 1, w: 9, h: 0.4,
            fontSize: 18, color: 'FFFFFF'
        });

        let yPos = 2;
        if (data.projects_no_pipeline && data.projects_no_pipeline.length > 0) {
            slide.addText(`Projects without Pipeline: ${data.projects_no_pipeline.length}`, {
                x: 0.8, y: yPos, w: 8.5, h: 0.5,
                fontSize: 16, color: 'FFFFFF', bold: true
            });
            yPos += 0.6;
        }
        if (data.pipeline_no_grafana && data.pipeline_no_grafana.length > 0) {
            slide.addText(`Projects without Grafana: ${data.pipeline_no_grafana.length}`, {
                x: 0.8, y: yPos, w: 8.5, h: 0.5,
                fontSize: 16, color: 'FFFFFF', bold: true
            });
            yPos += 0.6;
        }
        if (data.p1_no_code && data.p1_no_code.length > 0) {
            slide.addText(`P1 Projects without Code: ${data.p1_no_code.length}`, {
                x: 0.8, y: yPos, w: 8.5, h: 0.5,
                fontSize: 16, color: 'FFFFFF', bold: true
            });
        }

        // Slide 11: Thank You
        slide = pptx.addSlide();
        slide.background = { fill: '667eea' };
        slide.addText('🙏', {
            x: 1, y: 1.5, w: 8, h: 1,
            fontSize: 80, color: 'FFFFFF', align: 'center'
        });
        slide.addText('Thank You', {
            x: 1, y: 3, w: 8, h: 0.8,
            fontSize: 44, bold: true, color: 'FFFFFF', align: 'center'
        });
        slide.addText('Questions & Discussion', {
            x: 1, y: 4, w: 8, h: 0.5,
            fontSize: 24, color: 'FFFFFF', align: 'center'
        });

        // Export
        await pptx.writeFile({ fileName: 'KT_Automated_Plan_Presentation.pptx' });
        alert('PowerPoint ดาวน์โหลดสำเร็จ! (11 slides)');
    } catch (error) {
        console.error('Error generating PowerPoint:', error);
        alert('เกิดข้อผิดพลาดในการสร้าง PowerPoint: ' + error.message);
    }
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        if (!document.body.classList.contains('presentation-mode')) return;

        // Arrow Right, Space, Page Down
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
            e.preventDefault();
            nextSlide();
        }
        // Arrow Left, Page Up
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            previousSlide();
        }
        // Escape, Q
        else if (e.key === 'Escape' || e.key === 'q' || e.key === 'Q') {
            e.preventDefault();
            exitPresentationMode();
        }
        // Home - go to first slide
        else if (e.key === 'Home') {
            e.preventDefault();
            showSlide(1);
        }
        // End - go to last slide
        else if (e.key === 'End') {
            e.preventDefault();
            showSlide(totalSlides);
        }
    });
}

function showSlide(n) {
    const slides = document.querySelectorAll('.slide');
    slides.forEach(slide => slide.classList.remove('active'));

    if (n > totalSlides) n = totalSlides;
    if (n < 1) n = 1;

    currentSlide = n;
    slides[n - 1].classList.add('active');

    updateNavigation();
    updateProgressBar();
    updateSlideIndicators();
}

function nextSlide() {
    if (currentSlide < totalSlides) {
        showSlide(currentSlide + 1);
    }
}

function previousSlide() {
    if (currentSlide > 1) {
        showSlide(currentSlide - 1);
    }
}

function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = currentSlide === 1;
    nextBtn.disabled = currentSlide === totalSlides;
}

function updateProgressBar() {
    const progress = (currentSlide / totalSlides) * 100;
    document.getElementById('progressBarSlide').style.width = progress + '%';
}

function updateSlideIndicators() {
    const indicator = document.getElementById('slideIndicator');
    indicator.innerHTML = '';

    for (let i = 1; i <= totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = 'indicator-dot';
        if (i === currentSlide) {
            dot.classList.add('active');
        }
        dot.onclick = () => showSlide(i);
        indicator.appendChild(dot);
    }
}

function prepareSlideData(data) {
    // Update slide stats
    document.getElementById('totalProjectsSlide').textContent = data.total_projects;
    document.getElementById('totalP1Slide').textContent = data.total_p1;
    document.getElementById('p1WithCodeSlide').textContent = data.p1_with_code;
    document.getElementById('p1WithGrafanaSlide').textContent = data.p1_with_grafana;
    document.getElementById('unassignedSlide').textContent = data.unassigned;
    document.getElementById('withPipelineSlide').textContent = data.with_pipeline;

    // Prepare insights
    const codePercentage = data.total_p1 > 0 ? (data.p1_with_code / data.total_p1 * 100).toFixed(0) : 0;
    const grafanaPercentage = data.total_p1 > 0 ? (data.p1_with_grafana / data.total_p1 * 100).toFixed(0) : 0;
    const unassignedPercentage = data.total_projects > 0 ? (data.unassigned / data.total_projects * 100).toFixed(0) : 0;

    document.getElementById('keyInsightsSlide').innerHTML = `
        <div class="insight-item">
            <span class="insight-number">1</span>
            <strong>${codePercentage}%</strong> ของโปรเจกต์ P1 มี Code พร้อมใช้งาน (${data.p1_with_code}/${data.total_p1})
        </div>
        <div class="insight-item">
            <span class="insight-number">2</span>
            เพียง <strong>${grafanaPercentage}%</strong> ของโปรเจกต์ P1 มี Monitoring ผ่าน Grafana (${data.p1_with_grafana}/${data.total_p1})
        </div>
        <div class="insight-item">
            <span class="insight-number">3</span>
            <strong>${unassignedPercentage}%</strong> ของโปรเจกต์ยังไม่มีผู้รับผิดชอบ (${data.unassigned}/${data.total_projects})
        </div>
        <div class="insight-item">
            <span class="insight-number">4</span>
            มีโปรเจกต์ที่มี Pipeline แล้ว <strong>${data.with_pipeline}</strong> โครงการ
        </div>
    `;

    // Prepare alerts
    const alertListSlide = document.getElementById('alertListSlide');
    alertListSlide.innerHTML = '';

    let hasIssues = false;

    // P1 without code
    if (data.p1_no_code.length > 0) {
        hasIssues = true;
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-box';
        const projectList = data.p1_no_code.slice(0, 8).map(p =>
            `<div class="alert-detail-item">• ${p.project} <span style="opacity: 0.7;">(${p.owner})</span></div>`
        ).join('');
        alertDiv.innerHTML = `
            <div class="alert-title">🚨 P1 Projects ยังไม่มี Code</div>
            <div class="alert-text">พบ ${data.p1_no_code.length} โปรเจกต์ที่มีความสำคัญสูงแต่ยังไม่มี Code</div>
            <div class="alert-detail-list">${projectList}${data.p1_no_code.length > 8 ? '<div class="alert-detail-item">• และอีก ' + (data.p1_no_code.length - 8) + ' โปรเจกต์...</div>' : ''}</div>
        `;
        alertListSlide.appendChild(alertDiv);
    }

    // Projects without pipeline (excluding Support Tools/POC)
    if (data.projects_no_pipeline && data.projects_no_pipeline.length > 0) {
        hasIssues = true;
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-box';
        const projectList = data.projects_no_pipeline.slice(0, 8).map(p =>
            `<div class="alert-detail-item">• ${p.project} <span style="opacity: 0.7;">[${p.priority}]</span></div>`
        ).join('');
        alertDiv.innerHTML = `
            <div class="alert-title">🔧 โปรเจกต์ไม่มี Pipeline</div>
            <div class="alert-text">พบ ${data.projects_no_pipeline.length} โปรเจกต์ที่ไม่ใช่ Support Tools/POC แต่ยังไม่มี CI/CD Pipeline</div>
            <div class="alert-detail-list">${projectList}${data.projects_no_pipeline.length > 8 ? '<div class="alert-detail-item">• และอีก ' + (data.projects_no_pipeline.length - 8) + ' โปรเจกต์...</div>' : ''}</div>
        `;
        alertListSlide.appendChild(alertDiv);
    }

    // Projects with pipeline but no Grafana
    if (data.pipeline_no_grafana && data.pipeline_no_grafana.length > 0) {
        hasIssues = true;
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-box';
        const projectList = data.pipeline_no_grafana.slice(0, 8).map(p =>
            `<div class="alert-detail-item">• ${p.project} <span style="opacity: 0.7;">[${p.priority}]</span></div>`
        ).join('');
        alertDiv.innerHTML = `
            <div class="alert-title">📊 มี Pipeline แต่ไม่มี Grafana</div>
            <div class="alert-text">พบ ${data.pipeline_no_grafana.length} โปรเจกต์ที่มี Pipeline แล้วแต่ยังไม่มี Grafana Dashboard สำหรับ Monitoring</div>
            <div class="alert-detail-list">${projectList}${data.pipeline_no_grafana.length > 8 ? '<div class="alert-detail-item">• และอีก ' + (data.pipeline_no_grafana.length - 8) + ' โปรเจกต์...</div>' : ''}</div>
        `;
        alertListSlide.appendChild(alertDiv);
    }

    // Unassigned projects
    if (data.unassigned > 0) {
        hasIssues = true;
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-box';
        alertDiv.innerHTML = `
            <div class="alert-title">⚠️ โปรเจกต์ไม่มีผู้รับผิดชอบ</div>
            <div class="alert-text">มี ${data.unassigned} โปรเจกต์ (${(data.unassigned/data.total_projects*100).toFixed(0)}%) ที่ยังไม่ได้มอบหมาย Owner ทำให้ไม่มีผู้ดูแลและรับผิดชอบ</div>
        `;
        alertListSlide.appendChild(alertDiv);
    }

    if (!hasIssues) {
        alertListSlide.innerHTML = `
            <div class="alert-box" style="background: rgba(46, 204, 113, 0.2); border-left-color: #2ecc71;">
                <div class="alert-title">✅ ไม่มีปัญหาเร่งด่วน</div>
                <div class="alert-text">โปรเจกต์ทั้งหมดผ่าน Quality Criteria</div>
            </div>
        `;
    }

}

function renderSlideCharts(data) {
    // Destroy existing slide charts
    Object.values(slideCharts).forEach(chart => {
        if (chart) chart.destroy();
    });

    // Prepare sorted data for charts
    const sortedPushcode = ['Yes', 'No', 'Unknown'].filter(key => data.pushcode[key] !== undefined);
    const pushcodeLabels = sortedPushcode;
    const pushcodeData = sortedPushcode.map(key => data.pushcode[key]);
    const pushcodeColors = pushcodeLabels.map(label => {
        if (label === 'Yes') return chartColors.green;
        if (label === 'No') return chartColors.red;
        return chartColors.gray;
    });

    const sortedPipeline = ['Yes', 'No', 'Unknown'].filter(key => data.pipeline[key] !== undefined);
    const pipelineLabels = sortedPipeline;
    const pipelineData = sortedPipeline.map(key => data.pipeline[key]);
    const pipelineColors = pipelineLabels.map(label => {
        if (label === 'Yes') return chartColors.green;
        if (label === 'No') return chartColors.red;
        return chartColors.gray;
    });

    const sortedGrafana = ['Yes', 'No', 'Unknown'].filter(key => data.grafana[key] !== undefined);
    const grafanaLabels = sortedGrafana;
    const grafanaData = sortedGrafana.map(key => data.grafana[key]);
    const grafanaColors = grafanaLabels.map(label => {
        if (label === 'Yes') return chartColors.green;
        if (label === 'No') return chartColors.red;
        return chartColors.gray;
    });

    const readableOrder = ['Created', 'Understand', 'NotCreated', 'NotClear', 'Unknown'];
    const sortedReadable = readableOrder.filter(key => data.readable[key] !== undefined);
    const readableLabels = sortedReadable;
    const readableData = sortedReadable.map(key => data.readable[key]);
    const readableColors = readableLabels.map(label => {
        if (label === 'Created') return chartColors.green;
        if (label === 'Understand') return chartColors.green;
        if (label === 'NotCreated') return chartColors.red;
        if (label === 'NotClear') return chartColors.orange;
        return chartColors.gray;
    });

    slideCharts.owner = new Chart(document.getElementById('ownerChartSlide'), {
        type: 'bar',
        data: {
            labels: Object.keys(data.owner),
            datasets: [{
                label: 'Projects',
                data: Object.values(data.owner),
                backgroundColor: chartColors.purple
            }]
        },
        options: {
            ...slideOptions,
            indexAxis: 'y',
            scales: {
                x: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: 'white' }, grid: { display: false } }
            },
            plugins: {
                ...slideOptions.plugins,
                legend: {
                    display: false
                }
            }
        },
        plugins: [{
            id: 'barLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const data = dataset.data[index];
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(data, bar.x - 10, bar.y);
                    });
                });
            }
        }]
    });

    const piePlugin = {
        id: 'pieLabels',
        afterDatasetsDraw: function(chart) {
            const ctx = chart.ctx;
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((element, index) => {
                    const data = dataset.data[index];
                    const { x, y } = element.tooltipPosition();
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(data, x, y);
                });
            });
        }
    };

    slideCharts.pushcode = new Chart(document.getElementById('pushcodeChartSlide'), {
        type: 'pie',
        data: {
            labels: pushcodeLabels,
            datasets: [{
                data: pushcodeData,
                backgroundColor: pushcodeColors
            }]
        },
        options: slideOptions,
        plugins: [piePlugin]
    });

    slideCharts.pipeline = new Chart(document.getElementById('pipelineChartSlide'), {
        type: 'pie',
        data: {
            labels: pipelineLabels,
            datasets: [{
                data: pipelineData,
                backgroundColor: pipelineColors
            }]
        },
        options: slideOptions,
        plugins: [piePlugin]
    });

    slideCharts.grafana = new Chart(document.getElementById('grafanaChartSlide'), {
        type: 'pie',
        data: {
            labels: grafanaLabels,
            datasets: [{
                data: grafanaData,
                backgroundColor: grafanaColors
            }]
        },
        options: slideOptions,
        plugins: [piePlugin]
    });

    slideCharts.readable = new Chart(document.getElementById('readableChartSlide'), {
        type: 'doughnut',
        data: {
            labels: readableLabels,
            datasets: [{
                data: readableData,
                backgroundColor: readableColors
            }]
        },
        options: slideOptions,
        plugins: [piePlugin]
    });

    slideCharts.appTypes = new Chart(document.getElementById('appTypesChartSlide'), {
        type: 'bar',
        data: {
            labels: Object.keys(data.app_types),
            datasets: [{
                label: 'Projects',
                data: Object.values(data.app_types),
                backgroundColor: [chartColors.blue, chartColors.purple, chartColors.orange, chartColors.green, chartColors.gray]
            }]
        },
        options: {
            ...slideOptions,
            scales: {
                x: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            },
            plugins: { legend: { display: false } }
        },
        plugins: [{
            id: 'barLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const data = dataset.data[index];
                        if (data > 0) {
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 14px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                            ctx.fillText(data, bar.x, bar.y - 5);
                        }
                    });
                });
            }
        }]
    });

    slideCharts.subproject = new Chart(document.getElementById('subprojectChartSlide'), {
        type: 'bar',
        data: {
            labels: Object.keys(data.subproject),
            datasets: [{
                label: 'Projects',
                data: Object.values(data.subproject),
                backgroundColor: chartColors.pink
            }]
        },
        options: {
            ...slideOptions,
            indexAxis: 'y',
            scales: {
                x: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: 'white' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        },
        plugins: [{
            id: 'barLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const data = dataset.data[index];
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(data, bar.x - 10, bar.y);
                    });
                });
            }
        }]
    });

    // Create duplicate subproject chart for Slide 6
    slideCharts.subproject2 = new Chart(document.getElementById('subprojectChartSlide2'), {
        type: 'bar',
        data: {
            labels: Object.keys(data.subproject),
            datasets: [{
                label: 'Projects',
                data: Object.values(data.subproject),
                backgroundColor: chartColors.pink
            }]
        },
        options: {
            ...slideOptions,
            indexAxis: 'y',
            scales: {
                x: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { ticks: { color: 'white' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        },
        plugins: [{
            id: 'barLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const data = dataset.data[index];
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(data, bar.x - 10, bar.y);
                    });
                });
            }
        }]
    });
}


// ==================== Gantt Chart ====================
function renderGanttChart() {
    if (!filteredData) return;

    const ganttChart = document.getElementById("ganttChart");
    if (!ganttChart) return;

    // Find projects that need work
    // Include: 1) All P1 (must check Pipeline & Dashboard)
    //          2) Any project missing code, pipeline, grafana, or documentation
    const incompleteProjects = filteredData.filter(row => {
        const priority = row["Priority"] || "No Priority";
        const code = row["PushCode"] || "Unknown";
        const pipeline = row["Has Gitlap Pipeline"] || "Unknown";
        const grafana = row["Has Grafana Dashboard"] || "Unknown";
        const doc = row["ReadAble"] || "Unknown";

        // All P1 must be checked for Pipeline and Dashboard
        if (priority === "P1") {
            return true;
        }

        // Other priorities: only if missing something
        return code === "No" || pipeline === "No" || grafana === "No" ||
               doc === "NotCreated" || doc === "NotClear" || doc === "Unknown";
    });

    if (incompleteProjects.length === 0) {
        ganttChart.innerHTML = "<div style=\"padding: 40px; text-align: center; color: #2ecc71; font-size: 1.2em;\">🎉 ยินดีด้วย! ทุกโปรเจกต์ครบตามเกณฑ์คุณภาพแล้ว</div>";
        return;
    }

    // Sort by priority, code, gitlab pipeline, document, grafana
    const priorityOrder = { "P1": 1, "P2": 2, "P3": 3, "P4": 4, "No Priority": 999 };
    incompleteProjects.sort((a, b) => {
        // 1. Priority
        const aPriority = priorityOrder[a["Priority"]] || 100;
        const bPriority = priorityOrder[b["Priority"]] || 100;
        if (aPriority !== bPriority) return aPriority - bPriority;

        // 2. Code (No first)
        const aCode = a["PushCode"] || "Unknown";
        const bCode = b["PushCode"] || "Unknown";
        const aCodeScore = aCode === "No" ? 0 : aCode === "Unknown" ? 1 : 2;
        const bCodeScore = bCode === "No" ? 0 : bCode === "Unknown" ? 1 : 2;
        if (aCodeScore !== bCodeScore) return aCodeScore - bCodeScore;

        // 3. GitLab Pipeline (No first)
        const aPipeline = a["Has Gitlap Pipeline"] || "Unknown";
        const bPipeline = b["Has Gitlap Pipeline"] || "Unknown";
        const aPipelineScore = aPipeline === "No" ? 0 : aPipeline === "Unknown" ? 1 : 2;
        const bPipelineScore = bPipeline === "No" ? 0 : bPipeline === "Unknown" ? 1 : 2;
        if (aPipelineScore !== bPipelineScore) return aPipelineScore - bPipelineScore;

        // 4. Documentation (NotCreated, NotClear first)
        const aDoc = a["ReadAble"] || "Unknown";
        const bDoc = b["ReadAble"] || "Unknown";
        const aDocScore = (aDoc === "NotCreated" || aDoc === "NotClear") ? 0 : aDoc === "Unknown" ? 1 : 2;
        const bDocScore = (bDoc === "NotCreated" || bDoc === "NotClear") ? 0 : bDoc === "Unknown" ? 1 : 2;
        if (aDocScore !== bDocScore) return aDocScore - bDocScore;

        // 5. Grafana (No first)
        const aGrafana = a["Has Grafana Dashboard"] || "Unknown";
        const bGrafana = b["Has Grafana Dashboard"] || "Unknown";
        const aGrafanaScore = aGrafana === "No" ? 0 : aGrafana === "Unknown" ? 1 : 2;
        const bGrafanaScore = bGrafana === "No" ? 0 : bGrafana === "Unknown" ? 1 : 2;
        return aGrafanaScore - bGrafanaScore;
    });

    // Calculate timeline (assume 12 weeks total, start from today)
    const totalWeeks = 12;

    // Get unique values for filters
    const allOwners = [...new Set(incompleteProjects.map(row => row['Owner'] || 'Unassigned'))].sort();
    const allPriorities = [...new Set(incompleteProjects.map(row => row['Priority'] || 'No Priority'))].sort((a, b) => {
        const order = { "P1": 1, "P2": 2, "P3": 3, "P4": 4, "No Priority": 5 };
        return (order[a] || 99) - (order[b] || 99);
    });

    // Initialize filters if empty (select all by default)
    if (ganttFilters.owner.length === 0) {
        ganttFilters.owner = [...allOwners];
    }
    if (ganttFilters.priority.length === 0) {
        ganttFilters.priority = [...allPriorities];
    }

    // Apply filters
    let projectsToShow = incompleteProjects.filter(row => {
        const owner = row['Owner'] || 'Unassigned';
        const priority = row['Priority'] || 'No Priority';
        return ganttFilters.owner.includes(owner) && ganttFilters.priority.includes(priority);
    });

    // Store filter data globally for popup
    window.ganttFilterData = {
        owner: allOwners,
        priority: allPriorities
    };

    // Count active filters
    const ownerFilterCount = ganttFilters.owner.length < allOwners.length ? ` (${ganttFilters.owner.length})` : '';
    const priorityFilterCount = ganttFilters.priority.length < allPriorities.length ? ` (${ganttFilters.priority.length})` : '';

    let html = `
        <div class="gantt-header">
            <div>Task / Project</div>
            <div class="filterable" onclick="openGanttFilterPopup('owner')">
                Assignee${ownerFilterCount} ▼
            </div>
            <div class="filterable" onclick="openGanttFilterPopup('priority')">
                Priority${priorityFilterCount} ▼
            </div>
            <div></div>
            <div>To Do List</div>
        </div>
    `;

    projectsToShow.forEach((project) => {
        const projectName = project["Project"] || "Unknown";
        const owner = project["Owner"] || "Unassigned";
        const priority = project["Priority"] || "No Priority";
        const code = project["PushCode"] || "Unknown";
        const pipeline = project["Has Gitlap Pipeline"] || "Unknown";
        const grafana = project["Has Grafana Dashboard"] || "Unknown";
        const doc = project["ReadAble"] || "Unknown";

        // Determine what needs to be done in sequence
        const tasks = [];
        const hasCode = code === "Yes";
        const hasDoc = doc === "Created" || doc === "Understand";
        const hasPipeline = pipeline === "Yes";
        const hasGrafana = grafana === "Yes";

        // Step 1: Code Available (required first)
        if (!hasCode) {
            tasks.push({ name: "Code", duration: 1, color: "#3498db" });
        }

        // Step 2: Documentation (separate Create and Update)
        if (doc === "NotCreated") {
            tasks.push({ name: "Create Doc", duration: 1, color: "#9b59b6" });
        } else if (doc === "NotClear") {
            tasks.push({ name: "Update Doc", duration: 1, color: "#8e44ad" });
        } else if (!hasDoc) {
            tasks.push({ name: "Doc", duration: 1, color: "#9b59b6" });
        }

        // Step 3: GitLab Pipeline (requires code, P1 must have)
        if (!hasPipeline) {
            tasks.push({ name: "Pipeline", duration: 1, color: "#f39c12" });
        }

        // Step 4: Grafana Dashboard (requires pipeline, P1 must have)
        if (!hasGrafana) {
            tasks.push({ name: "Dashboard", duration: 1, color: "#2ecc71" });
        }

        // For P1: Show even if complete
        if (tasks.length === 0 && priority === "P1") {
            // P1 is complete, show as verified
            html += `
                <div class="gantt-row">
                    <div class="gantt-task-name">${projectName}</div>
                    <div class="gantt-owner">${owner}</div>
                    <div><span class="priority-badge-gantt priority-P1">${priority}</span></div>
                    <div></div>
                    <div class="gantt-timeline">
                        <div class="gantt-bar" style="left: 0%; width: 100px; background: #2ecc71; opacity: 0.3;">
                            ✓ Complete
                        </div>
                    </div>
                </div>
            `;
            return;
        } else if (tasks.length === 0) {
            return;
        }

        // Calculate start week based on priority
        let baseStartWeek = 0;
        if (priority === "P1") {
            baseStartWeek = 0;
        } else if (priority === "P2") {
            baseStartWeek = 2;
        } else {
            baseStartWeek = 4;
        }

        // Build task list with sequence
        const taskSequence = [];
        let currentWeek = baseStartWeek;

        tasks.forEach(task => {
            taskSequence.push({
                name: task.name,
                start: currentWeek,
                end: currentWeek + task.duration,
                color: task.color
            });
            currentWeek += task.duration;
        });

        const priorityClass = priority.startsWith("P") ? `priority-${priority}` : "";

        // Create timeline with fixed width bars (100px each)
        let timelineBars = "";
        taskSequence.forEach((task, index) => {
            const leftPx = index * 110; // 100px bar + 10px gap
            timelineBars += `
                <div class="gantt-bar" style="left: ${leftPx}px; width: 100px; background: ${task.color};" title="${task.name}: W${task.start + 1}-W${task.end}">
                    ${task.name}
                </div>
            `;
        });

        html += `
            <div class="gantt-row">
                <div class="gantt-task-name">${projectName}</div>
                <div class="gantt-owner">${owner}</div>
                <div><span class="priority-badge-gantt ${priorityClass}">${priority}</span></div>
                <div></div>
                <div class="gantt-timeline">
                    ${timelineBars}
                </div>
            </div>
        `;
    });

    ganttChart.innerHTML = html;
}

// Open Gantt filter popup
function openGanttFilterPopup(filterType) {
    ganttFilterOpen = filterType;

    const popup = document.getElementById('ganttFilterPopup');
    const overlay = document.getElementById('ganttFilterOverlay');
    const title = document.getElementById('ganttFilterTitle');
    const content = document.getElementById('ganttFilterContent');

    // Set title
    title.textContent = filterType === 'owner' ? 'Filter by Assignee' : 'Filter by Priority';

    // Build filter options
    const filterData = window.ganttFilterData[filterType] || [];
    let optionsHtml = filterData.map(value => `
        <label class="filter-option">
            <input type="checkbox" value="${value}" ${ganttFilters[filterType].includes(value) ? 'checked' : ''}
                onchange="toggleGanttFilter('${filterType}', '${value.replace(/'/g, "\\'")}')">
            <span>${value}</span>
        </label>
    `).join('');

    content.innerHTML = optionsHtml;

    // Show popup
    popup.classList.add('active');
    overlay.classList.add('active');
}

// Close Gantt filter popup
function closeGanttFilterPopup() {
    const popup = document.getElementById('ganttFilterPopup');
    const overlay = document.getElementById('ganttFilterOverlay');

    popup.classList.remove('active');
    overlay.classList.remove('active');
    ganttFilterOpen = null;

    // Re-render to update counts
    if (filteredData) {
        renderGanttChart();
    }
}

// Toggle individual filter checkbox - realtime update
function toggleGanttFilter(filterType, value) {
    const index = ganttFilters[filterType].indexOf(value);
    if (index > -1) {
        ganttFilters[filterType].splice(index, 1);
    } else {
        ganttFilters[filterType].push(value);
    }

    // Save current scroll position of popup
    const popupContent = document.getElementById('ganttFilterContent');
    const scrollTop = popupContent ? popupContent.scrollTop : 0;

    // Re-render Gantt Chart immediately (realtime)
    renderGanttChart();

    // Re-open popup and restore scroll position
    openGanttFilterPopup(filterType);
    const newPopupContent = document.getElementById('ganttFilterContent');
    if (newPopupContent) {
        newPopupContent.scrollTop = scrollTop;
    }
}
