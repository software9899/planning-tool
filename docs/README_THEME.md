# 🎨 Planning Tool - Theme System

ระบบ Theme ที่สามารถเปลี่ยนสีและรูปแบบของแอปพลิเคชันได้ทั้งหมด โดยจะมีผลกับทุกหน้าพร้อมกัน

## 📋 ไฟล์ที่เกี่ยวข้อง

1. **theme.css** - ไฟล์ CSS Variables และ Theme Presets
2. **theme.js** - JavaScript สำหรับสลับ Theme และบันทึกการตั้งค่า
3. **styles.css** - ไฟล์ CSS หลักที่ใช้ CSS Variables จาก theme.css
4. **sidebar.html** - Sidebar Component พร้อมเมนูที่ครบถ้วน

## 🎨 Theme ที่มีให้เลือก

| Theme | Icon | สี | คำอธิบาย |
|-------|------|-----|---------|
| **Purple Dream** | 💜 | Purple to Violet | Theme เริ่มต้น (Default) |
| **Blue Ocean** | 💙 | Blue to Cyan | สีน้ำเงินสดใส |
| **Green Forest** | 💚 | Green to Emerald | สีเขียวธรรมชาติ |
| **Pink Sunset** | 💗 | Pink to Red | สีชมพูอบอุ่น |
| **Orange Fire** | 🧡 | Orange to Yellow | สีส้มสดใส |
| **Dark Mode** | 🌙 | Dark Gray | โหมดมืดสำหรับใช้งานกลางคืน |
| **Light Minimal** | ☀️ | Light Gray | โหมดสว่างมินิมอล |

## 🚀 วิธีการใช้งาน

### 1. การเปลี่ยน Theme

**ผ่าน UI:**
- คลิกที่ปุ่ม "Theme" ที่ Header
- เลือก Theme ที่ต้องการ
- Theme จะเปลี่ยนทันทีและบันทึกใน localStorage

**ผ่าน JavaScript:**
```javascript
// เปลี่ยน Theme
changeTheme('blue');  // purple, blue, green, pink, orange, dark, light

// เช็ค Theme ปัจจุบัน
const currentTheme = localStorage.getItem('appTheme');
console.log(currentTheme); // เช่น 'purple'
```

### 2. การเพิ่ม Theme System เข้าไปในหน้าใหม่

**ขั้นตอนที่ 1: เพิ่ม CSS**
```html
<head>
    <!-- IMPORTANT: theme.css ต้องมาก่อน styles.css เสมอ -->
    <link rel="stylesheet" href="theme.css">
    <link rel="stylesheet" href="styles.css">
</head>
```

**ขั้นตอนที่ 2: เพิ่ม HTML Structure**
```html
<body>
    <div class="app-layout">
        <!-- Sidebar -->
        <div id="sidebarContainer"></div>

        <!-- Main Content -->
        <div class="main-content">
            <header>
                <h1>📋 หัวข้อหน้า</h1>
                <div class="header-buttons">
                    <!-- Theme Switcher -->
                    <div id="themeSwitcherContainer"></div>

                    <!-- ปุ่มอื่นๆ -->
                    <button class="settings-btn">⚙️ Settings</button>
                </div>
            </header>

            <div class="content-area">
                <!-- เนื้อหาของหน้า -->
            </div>
        </div>
    </div>
</body>
```

**ขั้นตอนที่ 3: เพิ่ม JavaScript**
```html
    <!-- โหลด theme.js ก่อน -->
    <script src="theme.js"></script>
    <script src="app.js"></script>

    <!-- โหลด Sidebar และ Theme Switcher -->
    <script>
        // โหลด sidebar HTML
        fetch('sidebar.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('sidebarContainer').innerHTML = html;
            })
            .catch(error => console.error('Error loading sidebar:', error));

        // โหลด theme switcher
        document.addEventListener('DOMContentLoaded', function() {
            const container = document.getElementById('themeSwitcherContainer');
            if (container && typeof createThemeSwitcher === 'function') {
                container.innerHTML = createThemeSwitcher();
            }
        });
    </script>
</body>
```

### 3. การใช้ CSS Variables

**ตัวแปรหลักที่สามารถใช้ได้:**

```css
/* Primary Colors */
var(--primary-gradient-start)   /* สีเริ่มต้นของ gradient */
var(--primary-gradient-end)     /* สีปลายของ gradient */
var(--primary-color)            /* สีหลักของ theme */
var(--primary-hover)            /* สีเมื่อ hover */

/* Secondary Colors */
var(--secondary-gradient-start) /* สีเริ่มต้นของปุ่มรอง */
var(--secondary-gradient-end)   /* สีปลายของปุ่มรอง */

/* Sidebar */
var(--sidebar-bg-start)         /* สีพื้นหลัง sidebar เริ่มต้น */
var(--sidebar-bg-end)           /* สีพื้นหลัง sidebar ปลาย */
var(--sidebar-text)             /* สีข้อความใน sidebar */
var(--sidebar-text-hover)       /* สีข้อความเมื่อ hover */
var(--sidebar-border)           /* สีเส้นขอบใน sidebar */
var(--sidebar-active-bg)        /* สีพื้นหลังของเมนูที่ active */
var(--sidebar-active-border)    /* สีเส้นขอบของเมนูที่ active */

/* Header */
var(--header-bg)                /* สีพื้นหลัง header */
var(--header-text)              /* สีข้อความใน header */
var(--header-border)            /* สีเส้นขอบ header */
var(--header-shadow)            /* สีเงาของ header */

/* Background */
var(--body-bg)                  /* สีพื้นหลังของ body */
var(--card-bg)                  /* สีพื้นหลังของ card */

/* Text */
var(--text-primary)             /* สีข้อความหลัก */
var(--text-secondary)           /* สีข้อความรอง */
var(--text-muted)               /* สีข้อความที่เบาลง */

/* Borders */
var(--border-light)             /* สีขอบแบบเบา */
var(--border-medium)            /* สีขอบแบบกลาง */
var(--border-dark)              /* สีขอบแบบเข้ม */
```

**ตัวอย่างการใช้งาน:**
```css
.my-button {
    background: linear-gradient(135deg,
        var(--primary-gradient-start) 0%,
        var(--primary-gradient-end) 100%);
    color: white;
}

.my-card {
    background: var(--card-bg);
    border: 1px solid var(--border-light);
    color: var(--text-primary);
}
```

## 🎯 การสร้าง Theme ใหม่

**เพิ่ม Theme ใน theme.css:**
```css
/* My Custom Theme */
body[data-theme="custom"] {
    --primary-gradient-start: #your-color-1;
    --primary-gradient-end: #your-color-2;
    --primary-color: #your-color-1;
    --primary-hover: #your-hover-color;
    --sidebar-bg-start: #sidebar-color-1;
    --sidebar-bg-end: #sidebar-color-2;
    --sidebar-active-border: #your-color-1;
}
```

**เพิ่ม Theme ใน theme.js:**
```javascript
const themes = [
    // ... existing themes
    {
        id: 'custom',
        name: 'My Custom Theme',
        icon: '🌟',
        colors: 'linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%)'
    }
];
```

## 📱 Responsive Design

Theme system รองรับการใช้งานบนหน้าจอทุกขนาด:
- **Desktop**: แสดง sidebar เต็มรูปแบบ
- **Tablet**: แสดง sidebar แบบย่อได้
- **Mobile**: Sidebar เปลี่ยนเป็น hamburger menu

## 🔄 การทำงานของระบบ

1. **การโหลดหน้า**: `theme.js` จะโหลด theme ที่บันทึกไว้จาก localStorage
2. **การเปลี่ยน Theme**: เมื่อผู้ใช้เลือก theme ใหม่
   - เปลี่ยน attribute `data-theme` ของ `<body>`
   - บันทึกลง localStorage
   - CSS Variables จะถูก update ทันที
3. **การย้ายหน้า**: Theme จะยังคงเหมือนเดิมเพราะบันทึกไว้ใน localStorage

## 🛠️ Sidebar Menu

Sidebar มีเมนูที่จำลองมาให้แล้ว:

### Main
- 📋 Tasks Board
- 📦 Backlog

### Analytics
- 📊 Dashboard
- 🔄 Auto Dashboard
- 🧪 Test Cases

### Reports
- 📈 Velocity Report
- 🔥 Burndown Chart
- 📄 Sprint Summary

### Team
- 👥 Team Members
- 📅 Calendar
- 🔐 User Management (Admin only)

### Settings
- ⚙️ App Settings
- 🎨 Themes
- 🔧 Preferences

## 📝 หมายเหตุ

- **localStorage**: Theme จะถูกบันทึกใน `localStorage.getItem('appTheme')`
- **Default Theme**: ถ้าไม่มี theme ที่บันทึกไว้ จะใช้ 'purple' เป็นค่าเริ่มต้น
- **Cross-page**: Theme จะเหมือนกันทุกหน้า เพราะใช้ localStorage ร่วมกัน
- **Performance**: ใช้ CSS Variables ทำให้การเปลี่ยน theme รวดเร็วและไม่ต้องโหลดหน้าใหม่

## 🎉 ตัวอย่างหน้าที่ติดตั้งแล้ว

- ✅ index.html
- ✅ backlog.html
- ⏳ dashboard.html (ต้องเพิ่มเอง)
- ⏳ dashboard_automated.html (ต้องเพิ่มเอง)
- ⏳ dashboard_test_cases.html (ต้องเพิ่มเอง)

## 📦 Template สำหรับหน้าใหม่

ดูไฟล์ `page-template.html` เป็นตัวอย่างโครงสร้างหน้าที่มี theme system ครบถ้วน

---

สร้างโดย: Claude Code Assistant 🤖
วันที่: 2025-11-13
