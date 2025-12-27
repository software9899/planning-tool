/**
 * Load Sidebar Component
 * Dynamically loads sidebar.html into all pages
 */

(function() {
    'use strict';

    async function loadSidebar() {
        try {
            const response = await fetch('sidebar.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            const container = document.getElementById('sidebar-container');

            if (container) {
                container.innerHTML = html;
                console.log('✅ Sidebar loaded successfully');

                // Dispatch event to notify that sidebar is loaded
                window.dispatchEvent(new Event('sidebarLoaded'));

                // Initialize sidebar toggle if the function exists
                if (typeof initSidebarToggle === 'function') {
                    initSidebarToggle();
                }
            } else {
                console.error('❌ Sidebar container not found');
            }
        } catch (error) {
            console.error('❌ Failed to load sidebar:', error);
        }
    }

    // Load sidebar when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSidebar);
    } else {
        loadSidebar();
    }
})();
