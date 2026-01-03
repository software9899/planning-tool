/* ==========================================
   THEME SWITCHER SYSTEM
   ========================================== */

// Available themes with their display names and color previews
const themes = [
    {
        id: 'purple',
        name: 'Purple Dream',
        icon: '💜',
        colors: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
        id: 'blue',
        name: 'Blue Ocean',
        icon: '💙',
        colors: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
        id: 'green',
        name: 'Green Forest',
        icon: '💚',
        colors: 'linear-gradient(135deg, #43e97b 0%, #38d46a 100%)'
    },
    {
        id: 'pink',
        name: 'Pink Sunset',
        icon: '💗',
        colors: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
        id: 'orange',
        name: 'Orange Fire',
        icon: '🧡',
        colors: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    },
    {
        id: 'dark',
        name: 'Dark Mode',
        icon: '🌙',
        colors: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
    },
    {
        id: 'light',
        name: 'Light Minimal',
        icon: '☀️',
        colors: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
    }
];

// Initialize theme system
function initTheme() {
    // Load saved theme or use default
    const savedTheme = localStorage.getItem('appTheme') || 'purple';
    applyTheme(savedTheme);
}

// Apply theme to body
function applyTheme(themeId) {
    document.body.setAttribute('data-theme', themeId);
    localStorage.setItem('appTheme', themeId);

    // Update active state in dropdown if it exists
    updateThemeDropdown(themeId);
}

// Update theme dropdown active state
function updateThemeDropdown(activeThemeId) {
    const options = document.querySelectorAll('.theme-option');
    options.forEach(option => {
        if (option.dataset.theme === activeThemeId) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// Create theme switcher button and dropdown
function createThemeSwitcher() {
    const currentTheme = localStorage.getItem('appTheme') || 'purple';
    const currentThemeData = themes.find(t => t.id === currentTheme);

    return `
        <div class="theme-switcher">
            <button class="theme-btn dropdown-toggle" id="themeSwitcherBtn">
                ${currentThemeData.icon} Theme
            </button>
            <div class="theme-dropdown" id="themeDropdown">
                ${themes.map(theme => `
                    <div class="theme-option ${theme.id === currentTheme ? 'active' : ''}"
                         data-theme="${theme.id}"
                         onclick="changeTheme('${theme.id}')">
                        <div class="theme-color-preview" style="background: ${theme.colors};"></div>
                        <span>${theme.icon} ${theme.name}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Change theme
function changeTheme(themeId) {
    applyTheme(themeId);

    // Update button icon
    const themeData = themes.find(t => t.id === themeId);
    const btn = document.getElementById('themeSwitcherBtn');
    if (btn) {
        btn.innerHTML = `${themeData.icon} Theme`;
    }

    // Close dropdown
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Toggle theme dropdown
function toggleThemeDropdown(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const themeSwitcher = document.querySelector('.theme-switcher');
    const dropdown = document.getElementById('themeDropdown');

    if (dropdown && !themeSwitcher?.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', function() {
    initTheme();

    // Setup theme button click handler
    const themeBtn = document.getElementById('themeSwitcherBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleThemeDropdown);
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initTheme, applyTheme, changeTheme, themes, createThemeSwitcher };
}
