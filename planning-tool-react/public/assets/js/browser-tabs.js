// Browser Tabs Management
// This script communicates with Chrome Extension to fetch current browser tabs

let currentTabs = [];
let extensionReady = false;

// Listen for extension ready message
window.addEventListener('message', function(event) {
    if (event.data.type === 'TAB_MANAGER_READY') {
        console.log('✅ Extension is ready');
        extensionReady = true;
    }

    if (event.data.type === 'TAB_MANAGER_RESPONSE') {
        handleExtensionResponse(event.data);
    }
});

// Handle response from extension
function handleExtensionResponse(data) {
    console.log('📨 Received response:', data);

    if (data.error) {
        console.error('❌ Extension error:', data.error);
        handleExtensionError();
        return;
    }

    if (data.action === 'getTabs' && data.data && data.data.tabs) {
        console.log('✅ Got tabs from extension:', data.data.tabs.length);
        currentTabs = data.data.tabs;
        renderTabs(currentTabs);
        updateStats(currentTabs);
    } else if (data.action === 'closeTab') {
        console.log('✅ Tab closed');
        // Reload tabs after closing
        setTimeout(() => loadBrowserTabs(), 500);
    } else {
        console.warn('⚠️ Unknown response format:', data);
    }
}

// Load browser tabs from Chrome Extension
async function loadBrowserTabs() {
    const tabsGrid = document.getElementById('tabsGrid');
    const errorMessage = document.getElementById('errorMessage');
    const totalTabsEl = document.getElementById('totalTabs');
    const currentWindowTabsEl = document.getElementById('currentWindowTabs');

    // Show loading state
    tabsGrid.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⏳</div>
            <div class="empty-state-text">กำลังโหลดข้อมูล...</div>
            <div class="empty-state-hint">กรุณารอสักครู่</div>
        </div>
    `;
    errorMessage.style.display = 'none';

    // Wait a bit for extension to be ready
    setTimeout(() => {
        console.log('📤 Sending getTabs request...');
        // Send message to content script via postMessage
        window.postMessage({
            type: 'TAB_MANAGER_REQUEST',
            action: 'getTabs'
        }, '*');

        // Set timeout in case extension doesn't respond
        setTimeout(() => {
            if (currentTabs.length === 0) {
                console.error('⏱️ Timeout: No response from extension');
                handleExtensionError();
            }
        }, 3000);
    }, 100);
}

// Handle extension not available error
function handleExtensionError() {
    const tabsGrid = document.getElementById('tabsGrid');
    const errorMessage = document.getElementById('errorMessage');

    errorMessage.innerHTML = `
        <strong>⚠️ ไม่สามารถเชื่อมต่อกับ Chrome Extension</strong><br>
        กรุณาตรวจสอบว่าได้ติดตั้ง "Planning Tool - Tab Manager" Extension และเปิดใช้งานแล้ว<br>
        <small>หรือเปิดหน้านี้ผ่าน Extension Popup แทน</small>
    `;
    errorMessage.style.display = 'block';

    tabsGrid.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">❌</div>
            <div class="empty-state-text">ไม่สามารถโหลดข้อมูลแท็บได้</div>
            <div class="empty-state-hint">ตรวจสอบ Chrome Extension และลองอีกครั้ง</div>
        </div>
    `;
}

// Render tabs list
function renderTabs(tabs) {
    const tabsGrid = document.getElementById('tabsGrid');

    if (!tabs || tabs.length === 0) {
        tabsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔖</div>
                <div class="empty-state-text">ไม่มีแท็บที่เปิดอยู่</div>
                <div class="empty-state-hint">เปิดแท็บใหม่ใน Chrome Browser แล้วกด Refresh</div>
            </div>
        `;
        return;
    }

    tabsGrid.innerHTML = tabs.map(tab => createTabCard(tab)).join('');
}

// Create tab card HTML
function createTabCard(tab) {
    const defaultIcon = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22%3E%3Ctext y=%2220%22 font-size=%2220%22%3E🌐%3C/text%3E%3C/svg%3E';

    // Use favicon if available, otherwise use default icon
    const favicon = tab.favIconUrl || defaultIcon;
    const title = tab.title || 'Untitled';
    const url = tab.url || '';
    const tabId = tab.id || '';

    return `
        <div class="tab-card" data-tab-id="${tabId}">
            <div class="tab-favicon">
                <img src="${escapeHtml(favicon)}" alt="favicon" onerror="this.src='${defaultIcon}'; this.onerror=null;">
            </div>
            <div class="tab-info">
                <div class="tab-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
                <div class="tab-url" title="${escapeHtml(url)}">${escapeHtml(url)}</div>
            </div>
            <div class="tab-actions">
                <button class="tab-action-btn" onclick="focusTab(${tabId})" title="เปิดแท็บนี้">
                    👁️ View
                </button>
                <button class="tab-action-btn" onclick="copyTabUrl('${escapeHtml(url)}')" title="คัดลอก URL">
                    📋 Copy
                </button>
                <button class="tab-action-btn danger" onclick="closeTab(${tabId})" title="ปิดแท็บนี้">
                    ❌ Close
                </button>
            </div>
        </div>
    `;
}

// Update statistics
function updateStats(tabs) {
    const totalTabsEl = document.getElementById('totalTabs');
    const currentWindowTabsEl = document.getElementById('currentWindowTabs');

    totalTabsEl.textContent = tabs.length;
    currentWindowTabsEl.textContent = tabs.length;
}

// Focus on a specific tab
function focusTab(tabId) {
    // Send message to content script
    window.postMessage({
        type: 'TAB_MANAGER_REQUEST',
        action: 'focusTab',
        tabId: tabId
    }, '*');

    alert('✅ กำลังเปิดแท็บ...');
}

// Copy tab URL to clipboard
function copyTabUrl(url) {
    navigator.clipboard.writeText(url).then(function() {
        alert('✅ คัดลอก URL แล้ว!\n' + url);
    }).catch(function(err) {
        console.error('Failed to copy:', err);
        alert('❌ ไม่สามารถคัดลอก URL ได้');
    });
}

// Close a specific tab
function closeTab(tabId) {
    if (!confirm('คุณต้องการปิดแท็บนี้หรือไม่?')) {
        return;
    }

    // Send message to content script
    window.postMessage({
        type: 'TAB_MANAGER_REQUEST',
        action: 'closeTab',
        tabId: tabId
    }, '*');

    alert('✅ กำลังปิดแท็บ...');

    // Reload tabs list after a short delay
    setTimeout(() => loadBrowserTabs(), 1000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Auto-load tabs on page load
document.addEventListener('DOMContentLoaded', function() {
    // Try to load tabs after a short delay
    setTimeout(() => loadBrowserTabs(), 300);
});

// Listen for messages from extension (if running inside extension context)
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'tabsUpdated') {
            loadBrowserTabs();
        }
    });
}
