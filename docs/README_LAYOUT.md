# Planning Tool - New Layout Guide

## ✨ อัพเดทใหม่

เพิ่ม **Professional Sidebar Navigation** และปรับปรุง **Header Design**

---

## 📁 ไฟล์ที่สร้างใหม่

1. **sidebar.html** - Sidebar component (โหลดด้วย JavaScript)
2. **sidebar.js** - Script สำหรับโหลด sidebar
3. **README_LAYOUT.md** - คู่มือนี้

---

## 🎨 การใช้งาน Layout ใหม่

### หน้าที่อัพเดทแล้ว:
- ✅ **index.html** (Current Tasks)

### หน้าที่ต้องอัพเดท:
- ⏳ backlog.html
- ⏳ dashboard.html
- ⏳ dashboard_automated.html
- ⏳ dashboard_test_cases.html
- ⏳ user_management.html

---

## 🔧 วิธีอัพเดทหน้าอื่นๆ

### ขั้นตอนที่ 1: แก้ไข HTML Structure

**เดิม:**
```html
<body>
    <header>
        ...
    </header>

    <div class="content">
        ...
    </div>
</body>
```

**ใหม่:**
```html
<body>
    <div class="app-layout">
        <div class="main-content">
            <header>
                <h1>📋 หัวข้อหน้า</h1>
                <div class="header-buttons">
                    <!-- ปุ่มต่างๆ (ไม่ต้องมี dashboard dropdown แล้ว) -->

                    <!-- Profile Dropdown (คัดลอกจาก index.html) -->
                    <div class="profile-dropdown">
                        ...
                    </div>
                </div>
            </header>

            <div class="content-area">
                <!-- เนื้อหาหน้าเดิม -->
            </div>
        </div>
    </div>

    <script src="sidebar.js"></script>
</body>
```

### ขั้นตอนที่ 2: เพิ่ม Script

เพิ่ม **ก่อน `</body>`**:
```html
<script src="sidebar.js"></script>
```

### ขั้นตอนที่ 3: ลบ Dashboard Dropdown

**ลบออก** (เพราะมี sidebar แล้ว):
```html
<div class="dashboard-dropdown">
    <button class="dashboard-btn dropdown-toggle">📊 Dashboard ▼</button>
    ...
</div>
```

---

## 🎯 Sidebar Features

### เมนูที่มี:
- 📋 **Tasks** - หน้า Current Tasks
- 📦 **Backlog** - หน้า Backlog Management
- 📊 **Dashboard (Static)** - Static Dashboard
- 🔄 **Automated Dashboard** - Real-time Dashboard
- 🧪 **Test Cases** - Test Cases Dashboard
- 👥 **User Management** (Admin เท่านั้น)
- ⚙️ **Settings**

### Auto-Highlight:
- Sidebar จะ highlight เมนูที่ active อัตโนมัติ
- แสดงข้อมูล User ปัจจุบัน (avatar, name, role)
- แสดง/ซ่อนเมนู Admin ตาม role

---

## 🎨 สีและ Design

### Sidebar:
- Background: Dark gradient (#2d3748 → #1a202c)
- Active Menu: Purple gradient highlight
- Width: 260px (fixed)

### Header:
- Background: White
- Shadow: Subtle (0 2px 8px rgba(0,0,0,0.05))
- Position: Sticky top
- Border: Bottom border (#e2e8f0)

### Content Area:
- Background: #f0f2f5 (Light gray)
- Padding: 30px
- Scroll: Auto

---

## 📱 Responsive (ยังไม่ได้ทำ)

ในอนาคตจะเพิ่ม:
- Mobile menu toggle
- Sidebar collapse on small screens
- Responsive grid layouts

---

## 🔐 User System Integration

Sidebar และ Profile dropdown อ่านข้อมูล user จาก `localStorage`:
```javascript
{
    name: "User Name",
    email: "user@example.com",
    role: "admin|manager|member",
    avatar: "U"
}
```

---

## ⚡ Quick Copy Template

```html
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title - Planning Tool</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="app-layout">
        <div class="main-content">
            <header>
                <h1>📋 Page Title</h1>
                <div class="header-buttons">
                    <!-- Your buttons here -->

                    <!-- Copy profile dropdown from index.html -->
                </div>
            </header>

            <div class="content-area">
                <!-- Your page content here -->
            </div>
        </div>
    </div>

    <script src="app.js"></script>
    <script src="sidebar.js"></script>

    <!-- Copy profile scripts from index.html -->
</body>
</html>
```

---

## 📝 สรุป

✨ **เพิ่ม Sidebar** - Professional left navigation
🎨 **ปรับ Header** - Clean and modern design
📱 **Layout Structure** - Flexible and maintainable
🔐 **User Integration** - Role-based menu display

**หน้า index.html พร้อมใช้งานแล้ว!**
หน้าอื่นๆ ต้องอัพเดทตาม template ข้างบน
