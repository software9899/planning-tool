// HR Plugin Script
console.log('👥 HR Plugin initializing...');

// Navigate to different pages
function navigateTo(path) {
    window.location.href = path;
}

// Load statistics
async function loadStats() {
    try {
        // Load members
        const membersResponse = await fetch('http://localhost:8002/api/users');
        const members = await membersResponse.json();
        document.getElementById('totalMembers').textContent = members.length;

        // Load teams from localStorage
        const teams = JSON.parse(localStorage.getItem('teams')) || [];
        document.getElementById('totalTeams').textContent = teams.length;

        // Load roles from localStorage
        const roles = JSON.parse(localStorage.getItem('roles')) || [];
        document.getElementById('totalRoles').textContent = roles.length;

        // Calculate average skill level (placeholder)
        document.getElementById('avgSkillLevel').textContent = '75%';

        // Load recent activity
        loadRecentActivity();
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Load recent activity
function loadRecentActivity() {
    const activityList = document.getElementById('activityList');

    // Get recent activities from localStorage
    const recentActivities = JSON.parse(localStorage.getItem('hr_activities')) || [];

    if (recentActivities.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">📝</div>
                <div class="activity-content">
                    <div class="activity-title">No recent activity</div>
                    <div class="activity-time">Start managing your team!</div>
                </div>
            </div>
        `;
        return;
    }

    activityList.innerHTML = recentActivities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

// Add activity log
function addActivity(icon, title) {
    const activities = JSON.parse(localStorage.getItem('hr_activities')) || [];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    activities.unshift({
        icon,
        title,
        time: timeStr,
        timestamp: now.getTime()
    });

    // Keep only last 10 activities
    if (activities.length > 10) {
        activities.pop();
    }

    localStorage.setItem('hr_activities', JSON.stringify(activities));
}

// Export for use in other modules
window.hrPlugin = {
    addActivity,
    loadStats
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    console.log('✅ HR Plugin ready!');
});
