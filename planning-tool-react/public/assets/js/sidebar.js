// Sidebar Toggle Functionality
function initSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (!sidebar || !sidebarToggle) return;

    // Load collapsed state from localStorage
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
    }

    // Toggle sidebar on button click
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        const collapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', collapsed);
    });
}

// Initialize sidebar user info
function initSidebarUserInfo() {
    const currentUserData = localStorage.getItem('currentUser');
    if (!currentUserData) return;

    const user = JSON.parse(currentUserData);
    const avatar = user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();

    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserRole = document.getElementById('sidebarUserRole');

    if (sidebarAvatar) sidebarAvatar.textContent = avatar;
    if (sidebarUserName) sidebarUserName.textContent = user.name || 'User';
    if (sidebarUserRole) sidebarUserRole.textContent = user.role || 'Member';

    // Show admin-only items
    if (user.role === 'admin') {
        const adminItems = document.querySelectorAll('.admin-only');
        adminItems.forEach(item => {
            item.style.display = 'flex';
        });
    }
}

// Set active menu item based on current page
function setActiveMenuItem() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    const menuItems = document.querySelectorAll('.menu-item[data-page]');

    menuItems.forEach(item => {
        const itemPage = item.getAttribute('data-page');
        if (itemPage === currentPage) {
            item.classList.add('active');
        }
    });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initSidebarToggle();
    initSidebarUserInfo();
    setActiveMenuItem();
});
