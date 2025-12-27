// Performance Testing Lessons App

// State
let lessons = [];
let currentLesson = null;
let editingLessonId = null;
let throughputChart = null;
let systemDiagramCtx = null;

// DOM Elements
const lessonsGrid = document.getElementById('lessonsGrid');
const emptyState = document.getElementById('emptyState');
const lessonModal = document.getElementById('lessonModal');
const viewLessonModal = document.getElementById('viewLessonModal');
const workshopModal = document.getElementById('workshopModal');
const lessonForm = document.getElementById('lessonForm');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadLessons();
    attachEventListeners();
    initializeWorkshop();
});

// Event Listeners
function attachEventListeners() {
    // Create lesson buttons
    document.getElementById('createLessonBtn').addEventListener('click', () => openCreateModal());
    document.getElementById('createFirstLessonBtn').addEventListener('click', () => openCreateModal());

    // Modal controls
    document.getElementById('closeModalBtn').addEventListener('click', () => closeModal());
    document.getElementById('closeViewModalBtn').addEventListener('click', () => closeViewModal());
    document.getElementById('cancelBtn').addEventListener('click', () => closeModal());
    document.getElementById('closeWorkshopBtn').addEventListener('click', () => closeWorkshopModal());

    // Workshop button
    document.getElementById('startWorkshopBtn').addEventListener('click', () => openWorkshopModal());

    // Form submit
    lessonForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveLesson();
    });

    // Search and filter
    searchInput.addEventListener('input', () => filterLessons());
    categoryFilter.addEventListener('change', () => filterLessons());

    // Edit lesson from view modal
    document.getElementById('editLessonBtn').addEventListener('click', () => {
        closeViewModal();
        openEditModal(currentLesson);
    });

    // Workshop tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Workshop controls
    document.getElementById('resetDiagramBtn').addEventListener('click', () => drawSystemDiagram());
    document.querySelectorAll('.select-strategy').forEach(btn => {
        btn.addEventListener('click', () => selectStrategy(btn.dataset.type));
    });

    // Metrics sliders
    ['responseTime', 'throughput', 'errorRate', 'concurrentUsers'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => updateMetrics(id, e.target.value));
        }
    });
}

// Initialize Workshop
function initializeWorkshop() {
    // Initialize system diagram
    const diagramCanvas = document.getElementById('systemDiagram');
    if (diagramCanvas) {
        systemDiagramCtx = diagramCanvas.getContext('2d');
        drawSystemDiagram();
    }

    // Initialize bottleneck analysis
    analyzeBottlenecks();
}

// Workshop Modal
function openWorkshopModal() {
    workshopModal.style.display = 'flex';
    setTimeout(() => {
        drawSystemDiagram();
        initializeThroughputChart();
        analyzeBottlenecks();
    }, 100);
}

function closeWorkshopModal() {
    workshopModal.style.display = 'none';
}

// Tab Switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Refresh content based on tab
    if (tabName === 'diagram') {
        drawSystemDiagram();
    } else if (tabName === 'throughput') {
        initializeThroughputChart();
    } else if (tabName === 'bottleneck') {
        analyzeBottlenecks();
    }
}

// System Diagram
function drawSystemDiagram() {
    if (!systemDiagramCtx) return;

    const canvas = document.getElementById('systemDiagram');
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;

    const ctx = systemDiagramCtx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw components
    const components = [
        { x: 50, y: 180, width: 100, height: 60, label: 'User', color: '#667eea' },
        { x: 200, y: 180, width: 120, height: 60, label: 'Load\nBalancer', color: '#10b981' },
        { x: 370, y: 100, width: 120, height: 60, label: 'App Server 1', color: '#f59e0b' },
        { x: 370, y: 220, width: 120, height: 60, label: 'App Server 2', color: '#f59e0b' },
        { x: 540, y: 180, width: 120, height: 60, label: 'Database', color: '#ef4444' },
        { x: 710, y: 180, width: 100, height: 60, label: 'Cache', color: '#8b5cf6' }
    ];

    // Draw arrows
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // User to LB
    drawArrow(ctx, 150, 210, 200, 210);
    // LB to App Servers
    drawArrow(ctx, 320, 195, 370, 130);
    drawArrow(ctx, 320, 225, 370, 250);
    // App Servers to DB
    drawArrow(ctx, 490, 130, 540, 195);
    drawArrow(ctx, 490, 250, 540, 225);
    // DB to Cache
    drawArrow(ctx, 660, 210, 710, 210);

    // Draw components
    components.forEach(comp => {
        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        // Box
        ctx.fillStyle = comp.color;
        ctx.fillRect(comp.x, comp.y, comp.width, comp.height);

        ctx.shadowColor = 'transparent';

        // Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);

        // Text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = comp.label.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, comp.x + comp.width / 2, comp.y + comp.height / 2 + (i - lines.length / 2 + 0.5) * 16);
        });
    });
}

function drawArrow(ctx, x1, y1, x2, y2) {
    const headlen = 10;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = '#cbd5e0';
    ctx.fill();
}

// Throughput Chart
function initializeThroughputChart() {
    const ctx = document.getElementById('throughputChart');
    if (!ctx) return;

    if (throughputChart) {
        throughputChart.destroy();
    }

    const labels = Array.from({length: 10}, (_, i) => `${i * 10}s`);
    const responseTimeData = Array.from({length: 10}, () => 300 + Math.random() * 400);
    const throughputData = Array.from({length: 10}, () => 80 + Math.random() * 40);

    throughputChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Response Time (ms)',
                data: responseTimeData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                yAxisID: 'y',
                tension: 0.4
            }, {
                label: 'Throughput (req/s)',
                data: throughputData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                yAxisID: 'y1',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Response Time (ms)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Throughput (req/s)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                },
            }
        }
    });
}

// Update Metrics
function updateMetrics(metricId, value) {
    const valueSpan = document.getElementById(`${metricId}Value`);
    if (metricId === 'responseTime') {
        valueSpan.textContent = `${value} ms`;
    } else if (metricId === 'throughput') {
        valueSpan.textContent = `${value} req/s`;
    } else if (metricId === 'errorRate') {
        valueSpan.textContent = `${value}%`;
    } else if (metricId === 'concurrentUsers') {
        valueSpan.textContent = value;
    }

    // Update chart if exists
    if (throughputChart && (metricId === 'responseTime' || metricId === 'throughput')) {
        updateThroughputChart(metricId, parseFloat(value));
    }
}

function updateThroughputChart(metricId, baseValue) {
    if (!throughputChart) return;

    const datasetIndex = metricId === 'responseTime' ? 0 : 1;
    const variation = metricId === 'responseTime' ? 200 : 20;

    throughputChart.data.datasets[datasetIndex].data = Array.from({length: 10}, () =>
        baseValue + (Math.random() - 0.5) * variation
    );
    throughputChart.update();
}

// Bottleneck Analysis
function analyzeBottlenecks() {
    const results = document.getElementById('bottleneckResults');
    if (!results) return;

    const analysis = `
        <div class="analysis-item warning">
            <h5>⚠️ Primary Bottleneck: Application Server</h5>
            <p><strong>Issue:</strong> CPU utilization at 85%, causing response time degradation</p>
            <p><strong>Impact:</strong> Average response time increased from 200ms to 450ms</p>
            <p><strong>Recommendation:</strong></p>
            <ul>
                <li>Scale horizontally - Add more application server instances</li>
                <li>Optimize code - Profile and fix CPU-intensive operations</li>
                <li>Implement caching - Reduce redundant computations</li>
            </ul>
        </div>
        <div class="analysis-item info">
            <h5>ℹ️ Secondary Concern: Database Latency</h5>
            <p><strong>Issue:</strong> Database queries averaging 120ms</p>
            <p><strong>Recommendation:</strong></p>
            <ul>
                <li>Add database indexes on frequently queried columns</li>
                <li>Implement connection pooling</li>
                <li>Consider read replicas for read-heavy workloads</li>
            </ul>
        </div>
        <div class="analysis-item success">
            <h5>✓ Healthy: Load Balancer & Cache</h5>
            <p>Both components operating within normal parameters</p>
        </div>
    `;

    results.innerHTML = analysis;
}

// Strategy Selection
function selectStrategy(type) {
    const recommendation = document.getElementById('strategyRecommendation');
    if (!recommendation) return;

    const strategies = {
        load: {
            title: 'Load Testing Strategy',
            scenario: 'Testing normal operating conditions with expected user load',
            steps: [
                'Define baseline: 500 concurrent users over 30 minutes',
                'Ramp-up period: 5 minutes to reach target load',
                'Sustained load: Maintain for 20 minutes',
                'Ramp-down: 5 minutes gradual decrease',
                'Monitor: Response time, throughput, error rate'
            ],
            metrics: [
                'Average response time < 500ms',
                'Throughput > 100 req/s',
                'Error rate < 1%',
                'CPU < 70%',
                'Memory < 80%'
            ]
        },
        stress: {
            title: 'Stress Testing Strategy',
            scenario: 'Finding system breaking point and recovery capability',
            steps: [
                'Start with baseline load',
                'Incrementally increase load by 20% every 5 minutes',
                'Continue until system shows degradation',
                'Identify maximum capacity',
                'Test recovery after load reduction'
            ],
            metrics: [
                'Maximum sustainable load',
                'Error rate threshold',
                'Recovery time after stress',
                'Resource exhaustion point'
            ]
        },
        spike: {
            title: 'Spike Testing Strategy',
            scenario: 'Testing sudden traffic surges (e.g., flash sales, viral content)',
            steps: [
                'Baseline: 100 concurrent users',
                'Spike: Instantly jump to 2000 users',
                'Sustain spike for 2 minutes',
                'Drop back to baseline',
                'Observe auto-scaling and recovery'
            ],
            metrics: [
                'Spike response time',
                'Auto-scaling trigger time',
                'Error rate during spike',
                'Recovery to normal state'
            ]
        },
        endurance: {
            title: 'Endurance Testing Strategy',
            scenario: 'Testing system stability over extended period',
            steps: [
                'Sustained load: 70% of max capacity',
                'Duration: 8-24 hours',
                'Monitor for memory leaks',
                'Check database connection pool',
                'Verify no performance degradation over time'
            ],
            metrics: [
                'Memory usage trend',
                'Response time stability',
                'Database connections',
                'Disk I/O patterns',
                'Log file growth'
            ]
        }
    };

    const strategy = strategies[type];
    const html = `
        <div class="recommendation-box">
            <h3>${strategy.title}</h3>
            <div class="scenario">
                <h4>📋 Scenario</h4>
                <p>${strategy.scenario}</p>
            </div>
            <div class="steps">
                <h4>📝 Test Steps</h4>
                <ol>
                    ${strategy.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            <div class="success-metrics">
                <h4>✓ Success Criteria</h4>
                <ul>
                    ${strategy.metrics.map(metric => `<li>${metric}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;

    recommendation.innerHTML = html;

    // Highlight selected card
    document.querySelectorAll('.strategy-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-strategy="${type}"]`).classList.add('selected');
}

// Load lessons from localStorage
function loadLessons() {
    const stored = localStorage.getItem('performanceTestingLessons');
    lessons = stored ? JSON.parse(stored) : getDefaultLessons();
    saveLessons();
    renderLessons();
}

// Save lessons to localStorage
function saveLessons() {
    localStorage.setItem('performanceTestingLessons', JSON.stringify(lessons));
}

// Render lessons
function renderLessons() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categoryFilter.value;

    let filtered = lessons.filter(lesson => {
        const matchesSearch = lesson.title.toLowerCase().includes(searchTerm) ||
                            lesson.description.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || lesson.category === category;
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        lessonsGrid.style.display = 'none';
        emptyState.style.display = 'flex';
    } else {
        lessonsGrid.style.display = 'grid';
        emptyState.style.display = 'none';
        lessonsGrid.innerHTML = filtered.map(lesson => createLessonCard(lesson)).join('');

        // Attach click handlers
        filtered.forEach(lesson => {
            const card = document.getElementById(`lesson-${lesson.id}`);
            card.addEventListener('click', () => viewLesson(lesson));

            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteLesson(lesson.id);
            });
        });
    }
}

// Create lesson card HTML
function createLessonCard(lesson) {
    const difficultyColors = {
        beginner: '#10b981',
        intermediate: '#f59e0b',
        advanced: '#ef4444'
    };

    const categoryIcons = {
        'load-testing': '📊',
        'stress-testing': '💪',
        'spike-testing': '⚡',
        'endurance-testing': '⏱️',
        'scalability-testing': '📈'
    };

    return `
        <div class="lesson-card" id="lesson-${lesson.id}">
            <div class="lesson-card-header">
                <span class="lesson-icon">${categoryIcons[lesson.category] || '📚'}</span>
                <button class="delete-btn">🗑️</button>
            </div>
            <h3 class="lesson-title">${lesson.title}</h3>
            <p class="lesson-description">${lesson.description}</p>
            <div class="lesson-meta">
                <span class="difficulty-badge" style="background: ${difficultyColors[lesson.difficulty]}">
                    ${lesson.difficulty}
                </span>
                ${lesson.duration ? `<span class="duration">⏱️ ${lesson.duration} min</span>` : ''}
            </div>
            <div class="lesson-category">${formatCategory(lesson.category)}</div>
        </div>
    `;
}

// Format category name
function formatCategory(category) {
    return category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Open create modal
function openCreateModal() {
    editingLessonId = null;
    document.getElementById('modalTitle').textContent = 'Create New Lesson';
    lessonForm.reset();
    lessonModal.style.display = 'flex';
}

// Open edit modal
function openEditModal(lesson) {
    editingLessonId = lesson.id;
    document.getElementById('modalTitle').textContent = 'Edit Lesson';

    document.getElementById('lessonTitle').value = lesson.title;
    document.getElementById('lessonCategory').value = lesson.category;
    document.getElementById('lessonDifficulty').value = lesson.difficulty;
    document.getElementById('lessonDuration').value = lesson.duration || '';
    document.getElementById('lessonDescription').value = lesson.description;
    document.getElementById('lessonObjectives').value = lesson.objectives.join('\n');
    document.getElementById('lessonContent').value = lesson.content;
    document.getElementById('lessonExercises').value = lesson.exercises || '';

    lessonModal.style.display = 'flex';
}

// Close modal
function closeModal() {
    lessonModal.style.display = 'none';
    editingLessonId = null;
}

// Close view modal
function closeViewModal() {
    viewLessonModal.style.display = 'none';
    currentLesson = null;
}

// Save lesson
function saveLesson() {
    const lesson = {
        id: editingLessonId || Date.now(),
        title: document.getElementById('lessonTitle').value,
        category: document.getElementById('lessonCategory').value,
        difficulty: document.getElementById('lessonDifficulty').value,
        duration: parseInt(document.getElementById('lessonDuration').value) || null,
        description: document.getElementById('lessonDescription').value,
        objectives: document.getElementById('lessonObjectives').value.split('\n').filter(o => o.trim()),
        content: document.getElementById('lessonContent').value,
        exercises: document.getElementById('lessonExercises').value,
        createdAt: editingLessonId ? lessons.find(l => l.id === editingLessonId).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editingLessonId) {
        const index = lessons.findIndex(l => l.id === editingLessonId);
        lessons[index] = lesson;
    } else {
        lessons.unshift(lesson);
    }

    saveLessons();
    renderLessons();
    closeModal();
}

// Delete lesson
function deleteLesson(id) {
    if (confirm('Are you sure you want to delete this lesson?')) {
        lessons = lessons.filter(l => l.id !== id);
        saveLessons();
        renderLessons();
    }
}

// View lesson
function viewLesson(lesson) {
    currentLesson = lesson;
    document.getElementById('viewLessonTitle').textContent = lesson.title;

    const content = `
        <div class="lesson-meta-section">
            <span class="meta-badge">${formatCategory(lesson.category)}</span>
            <span class="meta-badge">${lesson.difficulty}</span>
            ${lesson.duration ? `<span class="meta-badge">⏱️ ${lesson.duration} minutes</span>` : ''}
        </div>

        <div class="lesson-section">
            <h3>📝 Description</h3>
            <p>${lesson.description}</p>
        </div>

        ${lesson.objectives.length > 0 ? `
            <div class="lesson-section">
                <h3>🎯 Learning Objectives</h3>
                <ul class="objectives-list">
                    ${lesson.objectives.map(obj => `<li>${obj}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        <div class="lesson-section">
            <h3>📚 Lesson Content</h3>
            <div class="lesson-content-text">${formatContent(lesson.content)}</div>
        </div>

        ${lesson.exercises ? `
            <div class="lesson-section">
                <h3>💻 Hands-on Exercises</h3>
                <div class="exercises-content">${formatContent(lesson.exercises)}</div>
            </div>
        ` : ''}

        <div class="lesson-footer">
            <small>Created: ${new Date(lesson.createdAt).toLocaleDateString()}</small>
            <small>Last Updated: ${new Date(lesson.updatedAt).toLocaleDateString()}</small>
        </div>
    `;

    document.getElementById('viewLessonContent').innerHTML = content;
    viewLessonModal.style.display = 'flex';
}

// Format content
function formatContent(text) {
    return text
        .split('\n')
        .map(line => {
            if (line.startsWith('# ')) {
                return `<h2>${line.substring(2)}</h2>`;
            } else if (line.startsWith('## ')) {
                return `<h3>${line.substring(3)}</h3>`;
            } else if (line.startsWith('- ')) {
                return `<li>${line.substring(2)}</li>`;
            } else if (line.trim() === '') {
                return '<br>';
            }
            return `<p>${line}</p>`;
        })
        .join('');
}

// Filter lessons
function filterLessons() {
    renderLessons();
}

// Get default lessons
function getDefaultLessons() {
    return [
        {
            id: 1,
            title: 'Introduction to Load Testing',
            category: 'load-testing',
            difficulty: 'beginner',
            duration: 45,
            description: 'Learn the fundamentals of load testing and why it\'s crucial for modern applications',
            objectives: [
                'Understand what load testing is and why it matters',
                'Learn key performance metrics',
                'Identify when to perform load testing'
            ],
            content: `# Introduction to Load Testing

Load testing is a type of performance testing that determines how a system behaves under expected load conditions.

## Why Load Testing Matters

- Identifies performance bottlenecks before production
- Ensures application can handle expected user traffic
- Validates system scalability
- Helps plan infrastructure requirements

## Key Metrics

- Response Time
- Throughput
- Error Rate
- Resource Utilization`,
            exercises: '1. Research common load testing tools\n2. Identify performance requirements for a sample application\n3. Create a simple load test plan',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
}
