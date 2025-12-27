# 📋 Planning Tool - Task Management System

Modern task management tool with beautiful UI, theme system, and comprehensive dashboard.

## 📁 โครงสร้างโปรเจค

```
planning-tool/
├── assets/               # ไฟล์ทรัพยากร
│   ├── css/             # ไฟล์ CSS
│   │   ├── styles.css   # Main stylesheet
│   │   └── theme.css    # Theme system
│   └── js/              # ไฟล์ JavaScript
│       ├── app.js       # Core application logic
│       ├── sidebar.js   # Sidebar functionality
│       └── theme.js     # Theme switcher
│
├── docs/                # เอกสารทั้งหมด
│   ├── README.md        # คู่มือหลัก
│   ├── README_THEME.md  # คู่มือ Theme System
│   ├── SETUP_GUIDE.md   # วิธีติดตั้ง
│   ├── MENU_STRUCTURE.md # โครงสร้างเมนู
│   ├── COMPLETE_SUMMARY.md # สรุปโปรเจค
│   └── ...              # เอกสารอื่นๆ
│
├── backup/              # ไฟล์สำรอง
│   ├── index_v2.html
│   ├── page-template.html
│   └── ...
│
├── index.html           # หน้าหลัก - Tasks Board
├── backlog.html         # หน้า Backlog Management
├── dashboard.html       # หน้า Dashboard
├── dashboard_automated.html  # หน้า Auto Dashboard
├── dashboard_test_cases.html # หน้า Test Cases
├── user_management.html # หน้าจัดการผู้ใช้ (Admin)
├── settings.html        # หน้าตั้งค่า
├── login.html           # หน้า Login
└── sidebar.html         # Sidebar Component
```

## 🚀 เริ่มต้นใช้งาน

### วิธีที่ 1: รันด้วย Docker (แนะนำ) 🐳

1. **Build และรัน Docker Container**
   ```bash
   cd planning-tool
   docker-compose up -d
   ```

2. **เปิดเบราว์เซอร์**
   - เปิด: http://localhost:3000
   - แอปจะทำงานในพื้นหลัง

3. **จัดการ Container**
   ```bash
   # ดู logs
   docker-compose logs -f

   # หยุด container
   docker-compose down

   # รัน container ใหม่
   docker-compose up -d --build
   ```

### วิธีที่ 2: รันด้วย Node.js

1. **ติดตั้ง dependencies**
   ```bash
   cd planning-tool
   npm install
   ```

2. **รัน server**
   ```bash
   npm start
   ```

3. **เปิดเบราว์เซอร์**
   - เปิด: http://localhost:3000

### วิธีที่ 3: เปิดโดยตรง (สำหรับ Development)

1. **เปิดในเบราว์เซอร์**
   - เปิดไฟล์ `index.html` ในเบราว์เซอร์
   - หรือใช้ Live Server

2. **Login** (ถ้ามี)
   - เปิด `login.html` เพื่อ login
   - Default: admin/password

## 📋 หน้าทั้งหมด

### Main Pages
- **📋 Tasks Board** (`index.html`) - จัดการ tasks แบบ Kanban board
- **📦 Backlog** (`backlog.html`) - จัดการ backlog และ prioritize tasks

### Dashboards
- **📊 Dashboard** (`dashboard.html`) - แสดงสถิติและ charts
- **🔄 Auto Dashboard** (`dashboard_automated.html`) - Dashboard แบบ real-time
- **🧪 Test Cases** (`dashboard_test_cases.html`) - ติดตาม test cases

### Management
- **👥 User Management** (`user_management.html`) - จัดการผู้ใช้ (Admin only)
- **⚙️ Settings** (`settings.html`) - ตั้งค่าระบบ

## 🎨 Theme System

มี 7 themes ให้เลือก:
1. 💜 Purple Dream (Default)
2. 💙 Blue Ocean
3. 💚 Green Forest
4. 💗 Pink Sunset
5. 🧡 Orange Fire
6. 🌙 Dark Mode
7. ☀️ Light Minimal

**วิธีเปลี่ยน Theme:**
- คลิกปุ่ม **🎨 Theme** ที่ header
- หรือคลิก "Change Theme" ใน sidebar
- Theme จะบันทึกอัตโนมัติใน localStorage

## ✨ Features

### Sidebar
- ✅ หุบ/ขยายได้ (Toggle button)
- ✅ บันทึกสถานะอัตโนมัติ
- ✅ แสดง user profile
- ✅ Active state สำหรับหน้าปัจจุบัน
- ✅ Admin-only menu items

### Tasks Board
- ✅ Drag & Drop tasks
- ✅ สร้าง/แก้ไข/ลบ tasks
- ✅ Checklist ในแต่ละ task
- ✅ กรองตาม Type, Priority
- ✅ Reorder columns

### Dashboard
- ✅ Burndown Chart
- ✅ Stack Bar Chart
- ✅ Pie Charts
- ✅ Statistics
- ✅ Export PDF/CSV

### User Management
- ✅ CRUD operations
- ✅ Role-based access (Admin, Manager, Member)
- ✅ User statistics

## 🛠️ การพัฒนา

### เพิ่มหน้าใหม่
1. สร้างไฟล์ HTML ใหม่ใน root
2. เพิ่มเมนูใน `sidebar.html`
3. ใช้โครงสร้างเดียวกับหน้าอื่นๆ:
   ```html
   <!DOCTYPE html>
   <html lang="th">
   <head>
       <link rel="stylesheet" href="assets/css/theme.css">
       <link rel="stylesheet" href="assets/css/styles.css">
   </head>
   <body>
       <div class="app-layout">
           <!-- Sidebar -->
           <!-- Content -->
       </div>
       <script src="assets/js/theme.js"></script>
       <script src="assets/js/sidebar.js"></script>
   </body>
   </html>
   ```

### แก้ไข CSS
- แก้ไข `assets/css/styles.css` สำหรับ styles ทั่วไป
- แก้ไข `assets/css/theme.css` สำหรับ CSS Variables และ themes

### แก้ไข JavaScript
- `assets/js/app.js` - Logic หลักของ application
- `assets/js/sidebar.js` - Sidebar toggle และ user info
- `assets/js/theme.js` - Theme switching logic

## 📚 เอกสารเพิ่มเติม

อ่านเอกสารใน folder `docs/`:
- `README_THEME.md` - คู่มือ Theme System แบบละเอียด
- `SETUP_GUIDE.md` - วิธีติดตั้งและใช้งาน
- `MENU_STRUCTURE.md` - โครงสร้างเมนูทั้งหมด
- `COMPLETE_SUMMARY.md` - สรุปโปรเจคทั้งหมด

## 🐳 Docker Commands

### สำหรับการใช้งานทั่วไป
```bash
# รัน container
docker-compose up -d

# ดู logs
docker-compose logs -f

# หยุด container
docker-compose down

# Rebuild และรัน
docker-compose up -d --build

# ดูสถานะ container
docker-compose ps

# เข้าไปใน container
docker-compose exec planning-tool sh
```

### การ Debug
```bash
# ดู logs แบบ real-time
docker-compose logs -f planning-tool

# เช็ค port ที่ใช้งาน
docker-compose port planning-tool 3000

# Restart container
docker-compose restart planning-tool
```

## 🐛 Troubleshooting

### หน้าไม่โหลด styles
- ตรวจสอบ path: `assets/css/theme.css` และ `assets/css/styles.css`
- ล้าง cache (Ctrl+Shift+R)

### JavaScript ไม่ทำงาน
- ตรวจสอบ path: `assets/js/`
- เปิด Console (F12) ดู error

### Theme ไม่เปลี่ยน
- ตรวจสอบ `theme.css` โหลดก่อน `styles.css`
- ล้าง localStorage

### Docker ไม่สามารถรันได้
- ตรวจสอบว่า Docker Desktop กำลังทำงานอยู่
- ตรวจสอบว่า port 3000 ไม่ได้ถูกใช้งานโดยโปรแกรมอื่น
  ```bash
  # macOS/Linux
  lsof -i :3000

  # Windows
  netstat -ano | findstr :3000
  ```
- Rebuild image ใหม่: `docker-compose up -d --build`

## 👥 Role-Based Access

### Member
- เห็นเมนูทั้งหมด **ยกเว้น** User Management
- ใช้งานได้ทุกฟีเจอร์ที่เปิดให้

### Admin
- เห็นเมนูทั้งหมด **รวมถึง** User Management
- มีสิทธิ์จัดการผู้ใช้และระบบ

## 📱 Responsive Design

- ✅ Desktop (> 1024px) - Sidebar เต็มรูปแบบ
- ✅ Tablet (768-1024px) - Sidebar ปรับขนาด
- ⚠️ Mobile (< 768px) - อาจต้องเพิ่ม hamburger menu

## 📄 License

MIT License

## 🤝 Contributing

ยินดีรับ Pull Requests สำหรับ:
- Bug fixes
- Feature improvements
- Documentation updates
- UI/UX enhancements

---

**สร้างโดย:** Claude Code Assistant 🤖
**เวอร์ชัน:** 2.0
**อัปเดตล่าสุด:** 2025-11-13
**สถานะ:** ✅ Production Ready
