# 📁 Folder Structure - Planning Tool

## โครงสร้างโปรเจคใหม่ (อัปเดต 2025-11-13)

```
planning-tool/
│
├── 📁 assets/                    # ไฟล์ทรัพยากรทั้งหมด
│   ├── 📁 css/                   # Stylesheets
│   │   ├── theme.css            # Theme system & CSS Variables
│   │   └── styles.css           # Main stylesheet
│   │
│   └── 📁 js/                    # JavaScript files
│       ├── app.js               # Core application logic
│       ├── sidebar.js           # Sidebar toggle & user info
│       └── theme.js             # Theme switcher
│
├── 📁 docs/                      # เอกสารทั้งหมด
│   ├── README_OLD.md            # README เดิม
│   ├── README_THEME.md          # คู่มือ Theme System
│   ├── README_LAYOUT.md         # คู่มือ Layout
│   ├── SETUP_GUIDE.md           # วิธีติดตั้งและใช้งาน
│   ├── MENU_STRUCTURE.md        # โครงสร้างเมนู
│   ├── SIDEBAR_MENU.txt         # Sidebar menu (ASCII art)
│   ├── COMPLETE_SUMMARY.md      # สรุปโปรเจคทั้งหมด
│   ├── AUTOMATED_DASHBOARD_README.md  # คู่มือ Auto Dashboard
│   ├── TEST_CASES_DASHBOARD_README.md # คู่มือ Test Cases
│   └── FOLDER_STRUCTURE.md      # ไฟล์นี้
│
├── 📁 backup/                    # ไฟล์สำรอง/เก่า
│   ├── index_v2.html            # Tasks Board V2 (เลิกใช้)
│   ├── page-template.html       # Template เดิม
│   ├── app_backup.js            # app.js backup
│   └── apply-theme-to-all.sh    # Shell script สำหรับ apply theme
│
├── 📄 index.html                 # หน้าหลัก - Tasks Board
├── 📄 backlog.html               # Backlog Management
├── 📄 dashboard.html             # Dashboard (Static)
├── 📄 dashboard_automated.html   # Auto-refresh Dashboard
├── 📄 dashboard_test_cases.html  # Test Cases Dashboard
├── 📄 user_management.html       # User Management (Admin only)
├── 📄 settings.html              # Settings & Configuration
├── 📄 login.html                 # Login Page
├── 📄 sidebar.html               # Sidebar Component
│
├── 📄 README.md                  # คู่มือหลักของโปรเจค
└── 📄 .gitignore                 # Git ignore rules
```

## 📊 สถิติไฟล์

### HTML Pages (9 files)
- **Main Pages**: 2 (index.html, backlog.html)
- **Dashboards**: 3 (dashboard.html, dashboard_automated.html, dashboard_test_cases.html)
- **Management**: 2 (user_management.html, settings.html)
- **Other**: 2 (login.html, sidebar.html)

### Assets
- **CSS**: 2 files (theme.css, styles.css)
- **JavaScript**: 3 files (app.js, sidebar.js, theme.js)

### Documentation
- **9 documentation files** ใน `docs/`

### Backup
- **4 backup files** ใน `backup/`

## 🔄 การเปลี่ยนแปลงจากโครงสร้างเดิม

### ก่อนการจัดระเบียบ
```
planning-tool/
├── *.html (ทุกไฟล์ใน root)
├── *.css (ใน root)
├── *.js (ใน root)
├── *.md (ใน root)
├── *.txt (ใน root)
└── *.sh (ใน root)
```
❌ ปัญหา: ไฟล์กระจัด กระจาย หายาก ไม่เป็นระเบียบ

### หลังการจัดระเบียบ
```
planning-tool/
├── assets/        # CSS + JS
├── docs/          # Documentation
├── backup/        # Old files
├── *.html         # HTML pages only
└── README.md      # Main docs
```
✅ ข้อดี: เป็นระเบียบ หาง่าย บำรุงรักษาง่าย

## 📝 หลักการจัดโครงสร้าง

### 1. **Separation of Concerns**
- HTML files อยู่ใน root เพื่อง่ายต่อการเข้าถึง
- Assets (CSS/JS) อยู่ใน `assets/` แยกตามประเภท
- Documentation อยู่ใน `docs/` ไม่รกไดเรกทอรีหลัก

### 2. **Easy Navigation**
- ชื่อ folder ชัดเจน บอกเนื้อหาได้ทันที
- ไฟล์ HTML อยู่ root level เปิดง่าย
- Documentation รวมอยู่ที่เดียว

### 3. **Scalability**
- เพิ่มหน้าใหม่: เพิ่มไฟล์ `.html` ใน root
- เพิ่ม styles: เพิ่มใน `assets/css/`
- เพิ่มฟีเจอร์: เพิ่มใน `assets/js/`

### 4. **Maintainability**
- Backup files แยกออกมา ไม่รก
- Documentation อยู่รวมกัน อ่านง่าย
- Path ชัดเจน แก้ไขง่าย

## 🛠️ การใช้งานหลังจากจัดโครงสร้าง

### เปิดหน้าเว็บ
```bash
# เปิดหน้าหลัก
open index.html

# หรือใช้ Live Server
# คลิกขวา index.html > Open with Live Server
```

### แก้ไข CSS
```bash
# แก้ไข main styles
open assets/css/styles.css

# แก้ไข themes
open assets/css/theme.css
```

### แก้ไข JavaScript
```bash
# แก้ไข app logic
open assets/js/app.js

# แก้ไข sidebar
open assets/js/sidebar.js

# แก้ไข theme switcher
open assets/js/theme.js
```

### อ่านเอกสาร
```bash
# เปิด docs folder
open docs/

# อ่าน theme guide
open docs/README_THEME.md
```

## 🔗 การอ้างอิง Path

### ใน HTML Files
```html
<!-- CSS -->
<link rel="stylesheet" href="assets/css/theme.css">
<link rel="stylesheet" href="assets/css/styles.css">

<!-- JavaScript -->
<script src="assets/js/theme.js"></script>
<script src="assets/js/sidebar.js"></script>
<script src="assets/js/app.js"></script>
```

### ใน CSS Files
```css
/* ใช้ relative path จาก assets/css/ */
/* ถ้าต้องการใช้ images ให้ใส่ใน assets/images/ */
background-image: url('../images/bg.jpg');
```

### ใน JavaScript Files
```javascript
// ใช้ relative path จาก assets/js/
// ถ้าต้อง fetch files
fetch('../../data/tasks.json')
```

## 📦 การ Deploy

### Local Development
1. เปิด `index.html` ในเบราว์เซอร์โดยตรง
2. หรือใช้ Live Server extension

### Web Server
1. Upload ทั้ง folder `planning-tool/`
2. Set `index.html` เป็นหน้าแรก
3. ตรวจสอบ path ยังคงถูกต้อง

### Build Process (Optional)
```bash
# ถ้าต้องการ minify/optimize
# ใช้ build tools เช่น:
# - npm/webpack
# - gulp
# - parcel
```

## 🎯 Best Practices

### เพิ่มไฟล์ใหม่
- ✅ HTML pages → root directory
- ✅ CSS files → `assets/css/`
- ✅ JavaScript → `assets/js/`
- ✅ Images → `assets/images/` (สร้างถ้าต้องการ)
- ✅ Documentation → `docs/`
- ✅ Old files → `backup/`

### การตั้งชื่อไฟล์
- ✅ ใช้ lowercase
- ✅ ใช้ underscore หรือ dash
- ✅ ชื่อสื่อความหมาย
- ❌ ไม่ใช้ space
- ❌ ไม่ใช้อักขระพิเศษ

### การจัดกลุ่ม
- ✅ จัดกลุ่มตาม function/purpose
- ✅ แยก production และ backup
- ✅ แยก code และ documentation
- ❌ ไม่ผสม assets หลายประเภทใน folder เดียว

## 🔍 การค้นหาไฟล์

### หา HTML Pages
```bash
ls *.html
# Output: *.html files in root
```

### หา CSS
```bash
ls assets/css/
# Output: theme.css, styles.css
```

### หา JavaScript
```bash
ls assets/js/
# Output: app.js, sidebar.js, theme.js
```

### หา Documentation
```bash
ls docs/
# Output: all .md files
```

## 📈 Next Steps

### เพิ่มฟีเจอร์ในอนาคต
1. สร้าง `assets/images/` สำหรับรูปภาพ
2. สร้าง `assets/fonts/` สำหรับ custom fonts
3. สร้าง `data/` สำหรับ mock data
4. สร้าง `tests/` สำหรับ unit tests
5. เพิ่ม build process สำหรับ optimization

### การปรับปรุง
- [ ] เพิ่ม source maps สำหรับ debugging
- [ ] เพิ่ม CSS/JS minification
- [ ] เพิ่ม image optimization
- [ ] เพิ่ม automated testing
- [ ] เพิ่ม CI/CD pipeline

---

**สร้างโดย:** Claude Code Assistant 🤖
**วันที่:** 2025-11-13
**เวอร์ชัน:** 2.0
**สถานะ:** ✅ Complete & Production Ready
