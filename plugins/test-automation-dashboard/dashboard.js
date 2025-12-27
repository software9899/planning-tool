class TestAutomationDashboard {
    constructor() {
        this.data = this.loadData();
        this.teams = [];
        this.currentTeam = 'all';
        this.chart = null;

        this.initializeElements();
        this.attachEventListeners();
        this.loadTeams();
    }

    initializeElements() {
        // Summary cards
        this.manualCountEl = document.getElementById('manualCount');
        this.automatableCountEl = document.getElementById('automatableCount');
        this.automatedCountEl = document.getElementById('automatedCount');

        // Data modal elements
        this.modal = document.getElementById('addDataModal');
        this.addDataBtn = document.getElementById('addDataBtn');
        this.closeModalBtn = document.getElementById('closeModal');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.saveDataBtn = document.getElementById('saveDataBtn');

        // Team modal elements
        this.teamModal = document.getElementById('addTeamModal');
        this.addTeamBtn = document.getElementById('addTeamBtn');
        this.closeTeamModalBtn = document.getElementById('closeTeamModal');
        this.cancelTeamBtn = document.getElementById('cancelTeamBtn');
        this.saveTeamBtn = document.getElementById('saveTeamBtn');
        this.teamNameInput = document.getElementById('teamName');
        this.teamIconInput = document.getElementById('teamIcon');

        // Form inputs
        this.teamSelect = document.getElementById('dataTeam');
        this.dateInput = document.getElementById('dataDate');
        this.manualCasesInput = document.getElementById('manualCases');
        this.automatableCasesInput = document.getElementById('automatableCases');
        this.automatedCasesInput = document.getElementById('automatedCases');

        // Chart canvas
        this.chartCanvas = document.getElementById('progressChart');

        // Data table
        this.dataTableBody = document.getElementById('dataTableBody');
        this.fixDataBtn = document.getElementById('fixDataBtn');
        this.clearDataBtn = document.getElementById('clearDataBtn');

        // Tabs
        this.teamTabsContainer = document.getElementById('teamTabs');

        // Set default date to today
        this.dateInput.valueAsDate = new Date();
    }

    attachEventListeners() {
        // Data modal
        this.addDataBtn.addEventListener('click', () => this.openModal());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.saveDataBtn.addEventListener('click', () => this.saveData());
        if (this.fixDataBtn) {
            this.fixDataBtn.addEventListener('click', () => this.fixCumulativeData());
        }
        this.clearDataBtn.addEventListener('click', () => this.clearAllData());

        // Team modal
        this.addTeamBtn.addEventListener('click', () => this.openTeamModal());
        this.closeTeamModalBtn.addEventListener('click', () => this.closeTeamModal());
        this.cancelTeamBtn.addEventListener('click', () => this.closeTeamModal());
        this.saveTeamBtn.addEventListener('click', () => this.saveTeam());

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
            if (e.target === this.teamModal) {
                this.closeTeamModal();
            }
        });

        // Reload teams when window gains focus (to sync deletions from other pages)
        // But only if modal is not open to avoid resetting the form
        window.addEventListener('focus', () => {
            if (this.modal.style.display !== 'flex') {
                this.loadTeams();
            }
        });

        // Reload teams periodically (every 5 seconds) to catch external changes
        // But only if modal is not open to avoid resetting the form
        setInterval(() => {
            if (this.modal.style.display !== 'flex') {
                this.loadTeams();
            }
        }, 5000);
    }

    async loadTeams() {
        try {
            // Fetch teams from API
            const response = await fetch('http://localhost:8002/api/teams');
            if (!response.ok) throw new Error('Failed to fetch teams');

            const newTeams = await response.json();

            // Check if teams actually changed (compare by stringifying)
            const teamsChanged = JSON.stringify(this.teams) !== JSON.stringify(newTeams);

            this.teams = newTeams;

            if (teamsChanged) {
                // Only re-render if teams changed
                this.renderTeamTabs();
                this.populateTeamSelect();
                this.updateView();
            } else {
                // Just update the team select dropdown without re-rendering everything
                this.populateTeamSelect();
            }
        } catch (error) {
            console.error('Error loading teams:', error);
            this.teams = [];
            this.updateView();
        }
    }

    openTeamModal() {
        this.teamModal.style.display = 'flex';
    }

    closeTeamModal() {
        this.teamModal.style.display = 'none';
        this.teamNameInput.value = '';
        this.teamIconInput.value = '';
    }

    async saveTeam() {
        const name = this.teamNameInput.value.trim();
        if (!name) {
            alert('Please enter a project name');
            return;
        }

        const icon = this.teamIconInput.value.trim() || '📁';

        try {
            const response = await fetch('http://localhost:8002/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, icon })
            });

            if (!response.ok) throw new Error('Failed to create team');

            await this.loadTeams();
            this.closeTeamModal();
        } catch (error) {
            console.error('Error creating team:', error);
            alert('Failed to create team');
        }
    }

    renderTeamTabs() {
        this.teamTabsContainer.innerHTML = this.teams.map(team => `
            <button class="tab-btn" data-team="${team.id}">
                ${team.icon || '📁'} ${team.name}
            </button>
        `).join('');

        // Attach click handlers to all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTeam(btn.dataset.team);
            });
        });
    }

    populateTeamSelect() {
        // Save current selection before rebuilding
        const currentValue = this.teamSelect.value;

        this.teamSelect.innerHTML = '<option value="">-- Select Project --</option>' +
            this.teams.map(team => `
                <option value="${team.id}">${team.name}</option>
            `).join('');

        // Restore previous selection if it still exists (compare as strings)
        if (currentValue && this.teams.some(t => String(t.id) === currentValue)) {
            this.teamSelect.value = currentValue;
        }
    }

    switchTeam(teamId) {
        this.currentTeam = teamId;

        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.team === teamId);
        });

        this.updateView();
    }

    updateView() {
        this.updateSummaryCards();
        this.renderChart();
        this.renderDataTable();
    }

    getFilteredData() {
        if (this.currentTeam === 'all') {
            return this.data;
        }
        return this.data.filter(d => d.teamId === this.currentTeam);
    }

    loadData() {
        const stored = localStorage.getItem('test_automation_data');
        return stored ? JSON.parse(stored) : [];
    }

    saveToStorage() {
        localStorage.setItem('test_automation_data', JSON.stringify(this.data));
    }

    openModal() {
        // Pre-select current team if not "all"
        if (this.currentTeam !== 'all') {
            this.teamSelect.value = this.currentTeam;
            // Pre-fill with previous values for cumulative data
            this.prefillPreviousValues(this.currentTeam);
        }
        this.modal.style.display = 'flex';

        // Add event listener to team select to update pre-filled values
        this.teamSelect.addEventListener('change', () => {
            if (this.teamSelect.value) {
                this.prefillPreviousValues(this.teamSelect.value);
            }
        });
    }

    prefillPreviousValues(teamId) {
        // Get latest data point for this team
        const teamData = this.data
            .filter(d => d.teamId === teamId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Always start with empty values for incremental input
        this.manualCasesInput.value = '';
        this.manualCasesInput.setAttribute('min', '0');
        this.automatableCasesInput.value = '';
        this.automatableCasesInput.setAttribute('min', '0');
        this.automatedCasesInput.value = '';
        this.automatedCasesInput.setAttribute('min', '0');

        // Show previous cumulative totals as placeholder hints
        if (teamData.length > 0) {
            const latest = teamData[0];
            this.manualCasesInput.setAttribute('placeholder', `Current total: ${latest.manual}`);
            this.automatableCasesInput.setAttribute('placeholder', `Current total: ${latest.automatable}`);
            this.automatedCasesInput.setAttribute('placeholder', `Current total: ${latest.automated}`);
        } else {
            this.manualCasesInput.setAttribute('placeholder', 'e.g., 50');
            this.automatableCasesInput.setAttribute('placeholder', 'e.g., 30');
            this.automatedCasesInput.setAttribute('placeholder', 'e.g., 20');
        }
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.clearForm();
    }

    clearForm() {
        this.teamSelect.value = '';
        this.dateInput.valueAsDate = new Date();
        this.manualCasesInput.value = '';
        this.automatableCasesInput.value = '';
        this.automatedCasesInput.value = '';
    }

    saveData() {
        // Validate required fields (only team and date are required)
        if (!this.teamSelect.value || !this.dateInput.value) {
            alert('Please select Project/Team and Date');
            return;
        }

        // Get incremental values entered by user (default to 0 if empty)
        const manualIncrement = this.manualCasesInput.value ? parseInt(this.manualCasesInput.value) : 0;
        const automatableIncrement = this.automatableCasesInput.value ? parseInt(this.automatableCasesInput.value) : 0;
        const automatedIncrement = this.automatedCasesInput.value ? parseInt(this.automatedCasesInput.value) : 0;

        // Validate: incremental values should be non-negative
        if (manualIncrement < 0 || automatableIncrement < 0 || automatedIncrement < 0) {
            alert('⚠️ Please enter non-negative values (0 or greater).');
            return;
        }

        // At least one value should be entered
        if (manualIncrement === 0 && automatableIncrement === 0 && automatedIncrement === 0) {
            alert('⚠️ Please enter at least one non-zero value for Manual, Automatable, or Automated cases.');
            return;
        }

        // Get data for the same team, sorted by date
        const teamData = this.data
            .filter(d => d.teamId === this.teamSelect.value)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Find the previous data point (most recent before the new date)
        let previousDataPoint = null;
        for (let i = teamData.length - 1; i >= 0; i--) {
            if (new Date(teamData[i].date) < new Date(this.dateInput.value)) {
                previousDataPoint = teamData[i];
                break;
            }
        }

        // Calculate cumulative totals by adding increment to previous total
        let cumulativeManual = 0;
        let cumulativeAutomatable = 0;
        let cumulativeAutomated = 0;

        if (previousDataPoint) {
            cumulativeManual = previousDataPoint.manual + manualIncrement;
            cumulativeAutomatable = previousDataPoint.automatable + automatableIncrement;
            cumulativeAutomated = previousDataPoint.automated + automatedIncrement;
        } else {
            // No previous data - cumulative is the same as increment
            cumulativeManual = manualIncrement;
            cumulativeAutomatable = automatableIncrement;
            cumulativeAutomated = automatedIncrement;
        }

        // Create new data point with cumulative totals
        const newDataPoint = {
            id: Date.now(),
            teamId: this.teamSelect.value,
            date: this.dateInput.value,
            manual: cumulativeManual,
            automatable: cumulativeAutomatable,
            automated: cumulativeAutomated
        };

        // The deltas to propagate to future dates
        const manualDelta = manualIncrement;
        const automatableDelta = automatableIncrement;
        const automatedDelta = automatedIncrement;

        // Add the new data point
        this.data.push(newDataPoint);

        // Apply delta to all subsequent data points for the same team
        this.data = this.data.map(d => {
            if (d.teamId === newDataPoint.teamId && new Date(d.date) > new Date(newDataPoint.date)) {
                return {
                    ...d,
                    manual: d.manual + manualDelta,
                    automatable: d.automatable + automatableDelta,
                    automated: d.automated + automatedDelta
                };
            }
            return d;
        });

        // Sort all data by date
        this.data.sort((a, b) => new Date(a.date) - new Date(b.date));

        this.saveToStorage();
        this.updateView();
        this.closeModal();
    }

    deleteDataPoint(id) {
        if (confirm('Are you sure you want to delete this data point?')) {
            this.data = this.data.filter(d => d.id !== id);
            this.saveToStorage();
            this.updateView();
        }
    }

    fixCumulativeData() {
        if (!confirm('🔧 Fix Cumulative Data\n\nThis will ensure all values never decrease over time (cumulative).\n\nFor each team, if a later date has lower values than an earlier date, it will be adjusted to match the earlier value.\n\nThis action cannot be undone. Continue?')) {
            return;
        }

        // Group data by team
        const teamGroups = {};
        this.data.forEach(d => {
            if (!teamGroups[d.teamId]) {
                teamGroups[d.teamId] = [];
            }
            teamGroups[d.teamId].push(d);
        });

        // Fix each team's data
        Object.keys(teamGroups).forEach(teamId => {
            // Sort by date
            teamGroups[teamId].sort((a, b) => new Date(a.date) - new Date(b.date));

            // Ensure cumulative (values never decrease)
            for (let i = 1; i < teamGroups[teamId].length; i++) {
                const current = teamGroups[teamId][i];
                const previous = teamGroups[teamId][i - 1];

                // Fix values if they decreased
                if (current.manual < previous.manual) {
                    current.manual = previous.manual;
                }
                if (current.automatable < previous.automatable) {
                    current.automatable = previous.automatable;
                }
                if (current.automated < previous.automated) {
                    current.automated = previous.automated;
                }
            }
        });

        // Rebuild data array with fixed values
        this.data = [];
        Object.values(teamGroups).forEach(teamData => {
            this.data.push(...teamData);
        });

        // Save and update
        this.saveToStorage();
        this.updateView();

        alert('✅ Data fixed successfully!\n\nAll values are now cumulative (never decrease).');
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this.data = [];
            this.saveToStorage();
            this.updateView();
        }
    }

    updateSummaryCards() {
        const filteredData = this.getFilteredData();

        if (filteredData.length === 0) {
            this.manualCountEl.textContent = '0';
            this.automatableCountEl.textContent = '0';
            this.automatedCountEl.textContent = '0';
            return;
        }

        if (this.currentTeam === 'all') {
            // For "All Projects", sum up the latest values from each team
            const teamLatestValues = {};

            // Get latest data point for each team
            this.data.forEach(dataPoint => {
                const teamId = dataPoint.teamId;
                if (!teamLatestValues[teamId] || new Date(dataPoint.date) > new Date(teamLatestValues[teamId].date)) {
                    teamLatestValues[teamId] = dataPoint;
                }
            });

            // Sum up all teams' latest values
            let totalManual = 0;
            let totalAutomatable = 0;
            let totalAutomated = 0;

            Object.values(teamLatestValues).forEach(dataPoint => {
                totalManual += dataPoint.manual;
                totalAutomatable += dataPoint.automatable;
                totalAutomated += dataPoint.automated;
            });

            this.manualCountEl.textContent = totalManual;
            this.automatableCountEl.textContent = totalAutomatable;
            this.automatedCountEl.textContent = totalAutomated;
        } else {
            // For specific team, show latest data point
            const latest = filteredData[filteredData.length - 1];
            this.manualCountEl.textContent = latest.manual;
            this.automatableCountEl.textContent = latest.automatable;
            this.automatedCountEl.textContent = latest.automated;
        }
    }

    renderChart() {
        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = this.chartCanvas.getContext('2d');
        const filteredData = this.getFilteredData();

        // Prepare data
        const labels = filteredData.map(d => this.formatDate(d.date));
        const manualData = filteredData.map(d => d.manual);
        const automatableData = filteredData.map(d => d.automatable);
        const automatedData = filteredData.map(d => d.automated);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Manual Cases',
                        data: manualData,
                        backgroundColor: 'rgba(251, 191, 36, 0.3)',
                        borderColor: 'rgba(251, 191, 36, 1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Automatable Cases',
                        data: automatableData,
                        backgroundColor: 'rgba(59, 130, 246, 0.3)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Automated Cases',
                        data: automatedData,
                        backgroundColor: 'rgba(34, 197, 94, 0.3)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12,
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} cases`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return value;
                            }
                        }
                    }
                }
            }
        });
    }

    renderDataTable() {
        const filteredData = this.getFilteredData();

        if (filteredData.length === 0) {
            this.dataTableBody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="6">No data yet. Click "+ Add Data Point" to get started!</td>
                </tr>
            `;
            return;
        }

        this.dataTableBody.innerHTML = filteredData.map((d, index) => {
            const team = this.teams.find(t => String(t.id) === String(d.teamId));
            const teamName = team ? team.name : 'Unknown';

            // Calculate incremental values (delta from previous data point for same team)
            let manualIncrement = d.manual;
            let automatableIncrement = d.automatable;
            let automatedIncrement = d.automated;

            // Find previous data point for the same team
            const teamData = filteredData
                .filter(item => item.teamId === d.teamId)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            const currentIndex = teamData.findIndex(item => item.id === d.id);
            if (currentIndex > 0) {
                const previous = teamData[currentIndex - 1];
                manualIncrement = d.manual - previous.manual;
                automatableIncrement = d.automatable - previous.automatable;
                automatedIncrement = d.automated - previous.automated;
            }

            // Format increments with + sign for positive values
            const formatIncrement = (val) => val > 0 ? `+${val}` : val;

            return `
                <tr>
                    <td>${this.formatDate(d.date)}</td>
                    <td><span style="display: inline-block; padding: 4px 8px; background: rgba(102, 126, 234, 0.1); border-radius: 4px; font-size: 12px; font-weight: 600;">${teamName}</span></td>
                    <td><span style="color: ${manualIncrement > 0 ? '#10b981' : manualIncrement < 0 ? '#ef4444' : '#6b7280'};">${formatIncrement(manualIncrement)}</span></td>
                    <td><span style="color: ${automatableIncrement > 0 ? '#10b981' : automatableIncrement < 0 ? '#ef4444' : '#6b7280'};">${formatIncrement(automatableIncrement)}</span></td>
                    <td><span style="color: ${automatedIncrement > 0 ? '#10b981' : automatedIncrement < 0 ? '#ef4444' : '#6b7280'};">${formatIncrement(automatedIncrement)}</span></td>
                    <td>
                        <button class="btn-icon btn-delete" onclick="dashboard.deleteDataPoint(${d.id})" title="Delete">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
}

// Initialize dashboard when DOM is ready
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new TestAutomationDashboard();
});
