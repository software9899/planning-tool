# 📋 Planning Tool - Menu Structure

## Sidebar Menu - ทุกหน้าที่มีในระบบ

### 📌 Main (หน้าหลัก)
```
📋 Tasks Board          → index.html
📋 Tasks Board V2       → index_v2.html
📦 Backlog              → backlog.html
```

### 📊 Dashboards (แดชบอร์ด)
```
📊 Dashboard            → dashboard.html
🔄 Auto Dashboard       → dashboard_automated.html
🧪 Test Cases           → dashboard_test_cases.html
```

### 👥 Management (จัดการระบบ)
```
👥 User Management      → user_management.html (Admin only)
⚙️ Settings             → settings.html
```

### 🔧 Development (สำหรับพัฒนา)
```
📄 Page Template        → page-template.html
```

### 🎨 Appearance (รูปแบบ)
```
🎨 Change Theme         → เปิด Theme Switcher Dropdown
```

---

## 📄 รายละเอียดแต่ละหน้า

### 1. **index.html** - Tasks Board (Main)
- หน้าหลักสำหรับจัดการ Tasks
- มี Columns: Backlog, To Do, In Progress, Done
- สามารถ Drag & Drop tasks
- สร้าง/แก้ไข/ลบ tasks
- ✅ มี Sidebar + Theme System

### 2. **index_v2.html** - Tasks Board V2
- เวอร์ชันทดลอง/ทางเลือก
- (ถ้ามี) ฟีเจอร์พิเศษหรือ UI ใหม่
- ⚠️ อาจยังไม่มี Sidebar + Theme System

### 3. **backlog.html** - Backlog Management
- จัดการ Backlog tasks
- กรองตาม Size (S, M, L, XL)
- แสดงเฉพาะ tasks ที่ยังไม่พร้อม
- Assign to To Do เมื่อพร้อม
- ✅ มี Sidebar + Theme System

### 4. **dashboard.html** - Dashboard (Static)
- แสดงสถิติ tasks
- Charts: Burndown, Stack Bar, Pie Charts
- แสดงข้อมูลแบบ static (ไม่ auto-refresh)
- ✅ มี Sidebar + Theme System

### 5. **dashboard_automated.html** - Automated Dashboard
- แสดงสถิติแบบ real-time
- Auto-refresh ทุก 5 วินาที
- Smart Alerts สำหรับ tasks ที่ต้องดูแล
- Export PDF/CSV
- ✅ มี Sidebar + Theme System

### 6. **dashboard_test_cases.html** - Test Cases Dashboard
- ติดตาม Test Cases
- แสดง Automation Progress
- Mock Data สำหรับทดสอบ
- Load/Clear Mock Data
- ✅ มี Sidebar + Theme System

### 7. **user_management.html** - User Management (Admin)
- จัดการผู้ใช้ระบบ
- เพิ่ม/แก้ไข/ลบ users
- กำหนด Roles (Admin, Manager, Member)
- จัดการ Permissions
- ⚠️ แสดงเฉพาะ Admin เท่านั้น
- ✅ มี Sidebar + Theme System

### 8. **settings.html** - Settings
- ตั้งค่า Task Types
- ตั้งค่า Priorities
- จัดการ Checklist Templates
- Priority Mapping
- ✅ มี Sidebar + Theme System

### 9. **page-template.html** - Page Template
- Template สำหรับสร้างหน้าใหม่
- มี Sidebar + Header + Theme System ครบ
- ใช้เป็นแม่แบบในการพัฒนา
- ✅ มี Sidebar + Theme System

### 10. **login.html** - Login Page
- หน้า Login/Authentication
- ⚠️ ไม่มี Sidebar (เพราะเป็นหน้า Login)
- อาจต้องอัปเดตให้ใช้ Theme System

---

## 🔐 การแสดงเมนูตาม Role

### Member (สมาชิกทั่วไป)
```
✅ Tasks Board
✅ Tasks Board V2
✅ Backlog
✅ Dashboard
✅ Auto Dashboard
✅ Test Cases
❌ User Management (ซ่อน)
✅ Settings
✅ Page Template
✅ Change Theme
```

### Admin (ผู้ดูแลระบบ)
```
✅ Tasks Board
✅ Tasks Board V2
✅ Backlog
✅ Dashboard
✅ Auto Dashboard
✅ Test Cases
✅ User Management (แสดง)
✅ Settings
✅ Page Template
✅ Change Theme
```

---

## 🎨 Theme System

### Available Themes
1. 💜 Purple Dream (Default)
2. 💙 Blue Ocean
3. 💚 Green Forest
4. 💗 Pink Sunset
5. 🧡 Orange Fire
6. 🌙 Dark Mode
7. ☀️ Light Minimal

### วิธีเปลี่ยน Theme
1. คลิกปุ่ม "Theme" ที่ Header
2. เลือก Theme ที่ต้องการ
3. Theme จะเปลี่ยนทันทีและบันทึกอัตโนมัติ
4. ทุกหน้าใช้ Theme เดียวกัน

---

## 📱 Responsive Design

### Desktop (> 1024px)
- Sidebar แสดงเต็มรูปแบบ
- Width: 260px
- แสดงทุกเมนู

### Tablet (768px - 1024px)
- Sidebar แสดงแบบย่อได้
- Icon + Text

### Mobile (< 768px)
- Sidebar อาจซ่อนและแสดงเป็น Hamburger Menu
- (ต้องเพิ่ม JavaScript สำหรับ toggle)

---

## 🚀 Quick Navigation

### จากหน้าไหนก็ได้ไปหน้าอื่น:
1. **Sidebar** - คลิกเมนูด้านซ้าย
2. **Header Links** - บางหน้ามีลิงก์เพิ่มเติม
3. **Theme Switcher** - เปลี่ยน Theme จากทุกหน้า

### ไปหน้าหลัก:
- คลิก "📋 Planning Tool" ที่ Sidebar Header
- หรือคลิก "Tasks Board" ใน Main Section

---

## 🔄 การพัฒนาต่อ

### หน้าที่ควรสร้างเพิ่ม:
- 📈 Velocity Report
- 🔥 Burndown Chart (Real-time)
- 📄 Sprint Summary
- 👥 Team Members
- 📅 Calendar
- 🔧 Preferences

### วิธีสร้างหน้าใหม่:
1. Copy `page-template.html`
2. เปลี่ยนชื่อไฟล์
3. แก้ Title และเนื้อหา
4. เพิ่มลิงก์ใน `sidebar.html`
5. เพิ่ม `data-page` attribute ให้ตรงกับชื่อไฟล์

---

สร้างโดย: Claude Code Assistant 🤖
อัปเดตล่าสุด: 2025-11-13
