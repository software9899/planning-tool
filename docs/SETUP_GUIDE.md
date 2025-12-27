# 🚀 Planning Tool - Setup Guide

คู่มือการตั้งค่าและการนำ Theme System ไปใช้กับหน้าใหม่

## ✅ หน้าที่พร้อมใช้งาน

หน้าเหล่านี้ได้รับการอัปเดตให้มี **Sidebar**, **Header**, และ **Theme System** แล้ว:

- ✅ **index.html** - Tasks Board (หน้าหลัก)
- ✅ **backlog.html** - Backlog Management
- ✅ **dashboard.html** - Dashboard (Static)
- ⏳ **dashboard_automated.html** - Automated Dashboard (รอการปรับปรุง)
- ⏳ **dashboard_test_cases.html** - Test Cases Dashboard (รอการปรับปรุง)
- ⏳ **user_management.html** - User Management (รอการปรับปรุง)
- ⏳ **settings.html** - Settings Page (รอการปรับปรุง)

## 🎯 การเพิ่ม Theme System เข้าไปในหน้าที่เหลือ

### ขั้นตอนที่ 1: เพิ่ม CSS Links ใน `<head>`

```html
<head>
    <!-- ... meta tags ... -->

    <!-- เพิ่มสองบรรทัดนี้ก่อน CSS อื่นๆ -->
    <link rel="stylesheet" href="theme.css">
    <link rel="stylesheet" href="styles.css">

    <!-- ... scripts อื่นๆ ... -->
</head>
```

### ขั้นตอนที่ 2: แก้ไขโครงสร้าง HTML ใน `<body>`

**จากโครงสร้างเดิม:**
```html
<body>
    <header>...</header>
    <div class="content">...</div>
</body>
```

**เปลี่ยนเป็น:**
```html
<body>
    <div class="app-layout">
        <!-- Sidebar Container -->
        <div id="sidebarContainer"></div>

        <!-- Main Content Area -->
        <div class="main-content">
            <header>
                <h1>📋 ชื่อหน้า</h1>
                <div class="header-buttons">
                    <!-- Theme Switcher -->
                    <div id="themeSwitcherContainer"></div>

                    <!-- ปุ่มอื่นๆ -->
                    <button class="settings-btn">⚙️ Settings</button>
                </div>
            </header>

            <!-- Content Area -->
            <div class="content-area">
                <!-- เนื้อหาของหน้า -->
            </div>
        </div>
    </div>
</body>
```

### ขั้นตอนที่ 3: เพิ่ม Scripts ก่อน `</body>`

```html
    <!-- เพิ่มก่อน </body> -->
    <script src="theme.js"></script>

    <!-- Load Sidebar and Theme Switcher -->
    <script>
        // Load sidebar HTML
        fetch('sidebar.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('sidebarContainer').innerHTML = html;
            })
            .catch(error => console.error('Error loading sidebar:', error));

        // Load theme switcher
        document.addEventListener('DOMContentLoaded', function() {
            const container = document.getElementById('themeSwitcherContainer');
            if (container && typeof createThemeSwitcher === 'function') {
                container.innerHTML = createThemeSwitcher();
            }
        });
    </script>

    <!-- Scripts อื่นๆของหน้า -->
</body>
</html>
```

### ขั้นตอนที่ 4: แก้ไข CSS Styles (ถ้าจำเป็น)

แทนที่สีแบบ hard-code ด้วย CSS Variables:

```css
/* เดิม */
background: white;
color: #333;

/* เปลี่ยนเป็น */
background: var(--card-bg);
color: var(--text-primary);
```

**ตัวแปรที่ใช้บ่อย:**
- `var(--card-bg)` - พื้นหลัง card
- `var(--text-primary)` - ข้อความหลัก
- `var(--text-secondary)` - ข้อความรอง
- `var(--border-light)` - เส้นขอบ
- `var(--primary-color)` - สีหลักของ theme

ดู CSS Variables ทั้งหมดได้ที่ `README_THEME.md`

## 📝 ตัวอย่างการแปลงหน้า

### ตัวอย่าง: dashboard_automated.html

**ส่วน HEAD:**
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Automated Dashboard - Planning Tool</title>

    <!-- เพิ่ม theme system -->
    <link rel="stylesheet" href="theme.css">
    <link rel="stylesheet" href="styles.css">

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- ... scripts อื่นๆ ... -->
</head>
```

**ส่วน BODY:**
```html
<body>
    <div class="app-layout">
        <div id="sidebarContainer"></div>

        <div class="main-content">
            <header>
                <h1>🔄 Automated Dashboard</h1>
                <div class="header-buttons">
                    <div id="themeSwitcherContainer"></div>
                    <button onclick="exportPDF()" class="settings-btn">📥 Export PDF</button>
                </div>
            </header>

            <div class="content-area">
                <!-- Dashboard content -->
            </div>
        </div>
    </div>

    <script src="theme.js"></script>
    <script>
        // Load sidebar and theme switcher
        // ... (ใช้ script จากข้างบน)
    </script>
</body>
```

## 🔗 การเชื่อมโยงหน้า

Sidebar มีเมนูเชื่อมโยงไปยังหน้าต่างๆ อยู่แล้ว:

```html
<!-- ใน sidebar.html -->
<a href="index.html" class="menu-item">📋 Tasks Board</a>
<a href="backlog.html" class="menu-item">📦 Backlog</a>
<a href="dashboard.html" class="menu-item">📊 Dashboard</a>
<a href="dashboard_automated.html" class="menu-item">🔄 Auto Dashboard</a>
<a href="dashboard_test_cases.html" class="menu-item">🧪 Test Cases</a>
<a href="user_management.html" class="menu-item">🔐 User Management</a>
```

## 🎨 การปรับแต่ง Sidebar

แก้ไขไฟล์ `sidebar.html` เพื่อ:
- เพิ่ม/ลดเมนู
- เปลี่ยนไอคอน
- จัดกลุ่มเมนูใหม่

ตัวอย่าง:
```html
<div class="menu-section">
    <div class="menu-section-title">ชื่อกลุ่ม</div>
    <a href="page.html" class="menu-item" data-page="page">
        <span class="menu-icon">🔥</span>
        <span>ชื่อเมนู</span>
    </a>
</div>
```

## 🚨 ปัญหาที่พบบ่อย

### 1. Theme ไม่เปลี่ยน
**สาเหตุ:** `theme.css` ไม่ถูกโหลด หรือโหลดหลัง `styles.css`

**วิธีแก้:** ตรวจสอบลำดับใน `<head>`:
```html
<link rel="stylesheet" href="theme.css">     <!-- ต้องมาก่อน -->
<link rel="stylesheet" href="styles.css">
```

### 2. Sidebar ไม่แสดง
**สาเหตุ:** JavaScript โหลด sidebar ไม่สำเร็จ

**วิธีแก้:**
1. ตรวจสอบว่ามี `<div id="sidebarContainer"></div>`
2. ตรวจสอบ Console (F12) หา error
3. ตรวจสอบว่าไฟล์ `sidebar.html` อยู่ใน folder เดียวกัน

### 3. Theme Switcher ไม่ทำงาน
**สาเหตุ:** `theme.js` ไม่ถูกโหลด หรือโหลดก่อน DOM พร้อม

**วิธีแก้:**
1. ตรวจสอบว่ามี `<script src="theme.js"></script>`
2. ตรวจสอบ `createThemeSwitcher()` function ถูกเรียก

### 4. Layout พัง
**สาเหตุ:** โครงสร้าง HTML ไม่ถูกต้อง

**วิธีแก้:** ดูตัวอย่างจาก `page-template.html` หรือ `index.html`

## 📚 เอกสารเพิ่มเติม

- **README_THEME.md** - คู่มือ Theme System แบบละเอียด
- **page-template.html** - Template สำหรับหน้าใหม่
- **theme.css** - CSS Variables และ Theme Presets
- **theme.js** - Theme Switcher Logic

## ✨ Next Steps

1. อัปเดตหน้าที่เหลือทั้ง 4 หน้า:
   - dashboard_automated.html
   - dashboard_test_cases.html
   - user_management.html
   - settings.html

2. ทดสอบ Theme Switcher ในทุกหน้า

3. ตรวจสอบ Responsive Design บนอุปกรณ์ต่างๆ

4. (Optional) สร้าง Theme ใหม่ใน `theme.css`

---

💡 **คำแนะนำ:** ใช้ `page-template.html` เป็นจุดเริ่มต้นสำหรับหน้าใหม่
จะทำให้ไม่ต้องเขียน boilerplate code ซ้ำ!

สร้างโดย: Claude Code Assistant 🤖
