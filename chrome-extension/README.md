# Planning Tool - Tab Manager Chrome Extension

Chrome Extension สำหรับดึงข้อมูล browser tabs และเชื่อมต่อกับ Planning Tool React App

## 📁 โครงสร้าง

```
chrome-extension/
├── manifest.json       # Extension configuration
├── background.js       # Service worker (ดึงข้อมูล tabs)
├── content.js          # Content script (สื่อสารกับ React app)
├── popup.html          # Popup UI
├── popup.js            # Popup logic
├── icons/              # Extension icons
└── README.md           # Documentation
```

## 🚀 วิธีติดตั้ง

### 1. เปิด Chrome Extensions

1. เปิด Chrome browser
2. ไปที่ `chrome://extensions/`
3. เปิด **Developer mode** (สวิตช์มุมบนขวา)

### 2. โหลด Extension

1. คลิก **Load unpacked**
2. เลือกโฟลเดอร์: `/Users/testtorial/Documents/MCP/planning-tool/chrome-extension/`
3. คลิก **Select**

### 3. ตรวจสอบ

- Extension จะปรากฏในรายการ Extensions
- จะเห็นไอคอน 📋 ในแถบ Extension (ถ้าไม่เห็น ให้ปักหมุดไว้)

## ✨ ฟีเจอร์

### Extension Popup
- แสดง statistics: Total Tabs, Windows, Pinned Tabs
- ปุ่มเปิด Planning Tool โดยตรง
- ปุ่ม Refresh Stats

### React App Integration
- ดึงรายการ tabs ทั้งหมดจาก browser
- แสดง favicon, title, URL
- เพิ่ม bookmark จาก browser tabs
- แยก tabs ตาม windows

## 🔧 การทำงาน

### 1. Background Service Worker (background.js)
- ใช้ `chrome.tabs` API เพื่อดึงข้อมูล tabs
- รับคำสั่งจาก content script:
  - `getTabs` - ดึงรายการ tabs ทั้งหมด
  - `focusTab` - เปิดไปที่ tab ที่เลือก
  - `closeTab` - ปิด tab
- ส่ง notifications เมื่อมีการเปลี่ยนแปลง tabs

### 2. Content Script (content.js)
- Inject เข้าไปใน `http://localhost:5173/*`
- สื่อสารระหว่าง React app และ background script
- ใช้ `postMessage` API

### 3. การสื่อสาร

**React App → Content Script → Background:**
```javascript
window.postMessage({
  type: 'TAB_MANAGER_REQUEST',
  action: 'getTabs'
}, '*');
```

**Background → Content Script → React App:**
```javascript
window.postMessage({
  type: 'TAB_MANAGER_RESPONSE',
  action: 'getTabs',
  data: { tabs: [...] }
}, '*');
```

## 🧪 ทดสอบ

1. เปิด Planning Tool: http://localhost:5173/bookmarks
2. กด F12 เปิด DevTools → Console
3. ดูข้อความ:
   - `🔌 Planning Tool - Content Script injected`
   - `📋 Planning Tool - Tab Manager Extension loaded`
4. กดปุ่ม "Refresh Tabs" ในหน้า Bookmarks
5. ควรเห็น browser tabs ทั้งหมดแสดงออกมา

## 🐛 Debug

### ตรวจสอบ Background Script
1. ไปที่ `chrome://extensions/`
2. หา "Planning Tool - Tab Manager"
3. คลิก **service worker** → เปิด DevTools
4. ดู console logs

### ตรวจสอบ Content Script
1. เปิด http://localhost:5173/bookmarks
2. กด F12 → Console
3. ดู console logs

### ปัญหาที่พบบ่อย

**Extension ไม่ทำงาน:**
- ตรวจสอบว่าเปิด Developer mode แล้ว
- Reload extension ใน `chrome://extensions/`
- Refresh หน้า React app

**ไม่เห็น tabs:**
- ตรวจสอบ console ว่ามี error หรือไม่
- ตรวจสอบว่า content script inject สำเร็จ
- ลอง reload extension และ refresh หน้าใหม่

## 📝 Permissions

- `tabs` - อ่านข้อมูล tabs
- `activeTab` - เข้าถึง active tab
- `scripting` - Inject content script
- `host_permissions` - เข้าถึง localhost

## 🔄 Update Extension

หลังจากแก้ไขโค้ด:
1. ไปที่ `chrome://extensions/`
2. คลิกปุ่ม 🔄 (Reload) ที่ extension
3. Refresh หน้า React app

## 📦 Build for Production

สำหรับ production ให้แก้ไข `manifest.json`:
```json
"host_permissions": [
  "https://your-domain.com/*"
],
"content_scripts": [
  {
    "matches": ["https://your-domain.com/*"],
    ...
  }
]
```

## 📄 License

MIT
