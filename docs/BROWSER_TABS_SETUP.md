# Browser Tabs Feature - Setup Guide

คู่มือการติดตั้งและใช้งานฟีเจอร์ Browser Tabs ใน Planning Tool

## 📋 Overview

ฟีเจอร์นี้ช่วยให้คุณสามารถ:
- ดูรายการแท็บทั้งหมดที่เปิดอยู่ใน Chrome Browser
- เปิดแท็บที่ต้องการได้อย่างรวดเร็ว
- คัดลอก URL ของแท็บ
- ปิดแท็บที่ไม่ต้องการ

## 🔧 การติดตั้ง Chrome Extension

### ขั้นตอนที่ 1: Load Extension

1. เปิด Google Chrome
2. ไปที่ `chrome://extensions/`
3. เปิด **Developer Mode** (สวิตช์ที่มุมขวาบน)
4. คลิก **"Load unpacked"**
5. เลือกโฟลเดอร์ `tab-manager-extension` ในโปรเจกต์นี้

### ขั้นตอนที่ 2: ตรวจสอบการติดตั้ง

1. คุณควรเห็น Extension ชื่อ **"Planning Tool - Tab Manager"** ในรายการ
2. ตรวจสอบว่า Extension เปิดใช้งานอยู่ (สวิตช์เป็นสีน้ำเงิน)
3. คลิกไอคอน Extension ที่ toolbar เพื่อ Pin ไว้ (ถ้าต้องการ)

### ขั้นตอนที่ 3: Reload Extension (ถ้ามีการอัปเดต)

หากคุณทำการแก้ไขโค้ดของ Extension:
1. ไปที่ `chrome://extensions/`
2. คลิกปุ่ม **Reload** (🔄) ที่การ์ด Extension
3. Refresh หน้าเว็บที่ต้องการใช้งาน

## 🚀 การใช้งาน

### วิธีที่ 1: ผ่าน Web Application

1. เปิด Planning Tool Web Application
2. คลิกเมนู **"Browser Tabs"** (🔖) ใน Left Sidebar
3. คลิกปุ่ม **"Refresh Tabs"** เพื่อโหลดรายการแท็บ
4. คุณจะเห็น:
   - 📊 จำนวนแท็บทั้งหมด
   - 📋 รายการแท็บพร้อม favicon, title, และ URL
   - ปุ่ม Action สำหรับแต่ละแท็บ

### การใช้งานปุ่ม Action

- **👁️ View** - เปิดและโฟกัสที่แท็บนั้น
- **📋 Copy** - คัดลอก URL ไปยัง Clipboard
- **❌ Close** - ปิดแท็บ (จะมีการยืนยันก่อน)

### วิธีที่ 2: ผ่าน Extension Popup

1. คลิกที่ไอคอน Extension ใน Chrome Toolbar
2. ใช้งาน Popup UI ที่มีฟีเจอร์:
   - ดูแท็บปัจจุบัน
   - บันทึกแท็บเป็น Bookmark
   - จัดการ Bookmarks ที่บันทึกไว้

## 🛠️ โครงสร้างไฟล์

```
tab-manager-extension/
├── manifest.json           # การตั้งค่า Extension
├── background.js          # Service Worker (จัดการ tabs API)
├── content-script.js      # Script ที่ inject เข้าหน้าเว็บ
├── extension_popup.html   # UI ของ Extension Popup
└── extension_popup.js     # Logic ของ Extension Popup

planning-tool/
├── bookmarks.html                    # หน้าแสดงรายการแท็บ
├── assets/js/browser-tabs.js        # Logic สำหรับดึงข้อมูลแท็บ
└── sidebar.html                      # Sidebar ที่มีเมนู Browser Tabs
```

## 🔄 วิธีการทำงาน

### Architecture

```
Web Page (bookmarks.html)
    ↓ postMessage
Content Script (content-script.js)
    ↓ chrome.runtime.sendMessage
Background Script (background.js)
    ↓ chrome.tabs API
Chrome Browser Tabs
```

### การสื่อสาร

1. **Web Page → Content Script**
   - ใช้ `window.postMessage()` ส่งคำขอ
   - Type: `TAB_MANAGER_REQUEST`
   - Actions: `getTabs`, `focusTab`, `closeTab`

2. **Content Script → Background Script**
   - ใช้ `chrome.runtime.sendMessage()` ส่งต่อคำขอ
   - Background Script เรียกใช้ Chrome Tabs API

3. **Response Path**
   - Background Script → Content Script (ผ่าน sendResponse)
   - Content Script → Web Page (ผ่าน postMessage)

## ⚠️ Troubleshooting

### ปัญหา: ข้อความ "ไม่สามารถเชื่อมต่อกับ Chrome Extension"

**สาเหตุ:**
- Extension ยังไม่ได้ติดตั้ง
- Extension ถูกปิดใช้งาน
- Content Script ไม่ได้โหลด

**วิธีแก้:**
1. ตรวจสอบว่า Extension ติดตั้งและเปิดใช้งานแล้ว
2. เปิด Console (F12) แล้วดู:
   - ข้อความ `🔌 Tab Manager content script loaded`
   - ข้อความ `✅ Extension is ready`
3. ถ้าไม่เห็น ให้ Reload Extension และ Refresh หน้าเว็บ

### ปัญหา: Content Script ไม่ทำงาน

**วิธีแก้:**
1. ตรวจสอบ `manifest.json`:
   ```json
   "content_scripts": [
     {
       "matches": ["<all_urls>"],
       "js": ["content-script.js"],
       "run_at": "document_start"
     }
   ]
   ```
2. Reload Extension ที่ `chrome://extensions/`
3. Refresh หน้าเว็บที่ต้องการใช้งาน

### ปัญหา: ไม่แสดงรายการแท็บ

**วิธีแก้:**
1. เปิด Console (F12) ดูว่ามี Error อะไร
2. ตรวจสอบว่า Permission `tabs` อยู่ใน manifest.json
3. ลองกดปุ่ม "Refresh Tabs" อีกครั้ง

### ปัญหา: ปุ่ม Focus/Close ไม่ทำงาน

**วิธีแก้:**
1. ตรวจสอบว่า Background Script ได้รับ message
2. ดู Console ของ Background Script:
   - ไปที่ `chrome://extensions/`
   - คลิก "Service Worker" หรือ "Inspect views"
3. ตรวจสอบว่ามี Permission `tabs` อยู่ใน manifest.json

## 📝 Development Notes

### การแก้ไข Extension

1. แก้ไขไฟล์ใน `tab-manager-extension/`
2. ไปที่ `chrome://extensions/`
3. คลิก Reload Extension (🔄)
4. Refresh หน้าเว็บที่ใช้งาน

### การแก้ไข Web Application

1. แก้ไขไฟล์:
   - `bookmarks.html`
   - `assets/js/browser-tabs.js`
2. Refresh หน้าเว็บใน Browser

### การ Debug

**Web Page Console:**
```javascript
// ดู Extension Ready Status
console.log(extensionReady);

// ดูรายการแท็บที่โหลดมา
console.log(currentTabs);

// ส่งคำขอ Manual
window.postMessage({ type: 'TAB_MANAGER_REQUEST', action: 'getTabs' }, '*');
```

**Background Script Console:**
```javascript
// ดูแท็บทั้งหมด
chrome.tabs.query({}, (tabs) => console.log(tabs));

// ดู Active Tab
chrome.tabs.query({active: true}, (tabs) => console.log(tabs[0]));
```

## 🔐 Security

- Content Script ใช้ `event.source === window` เพื่อป้องกัน messages จากแหล่งอื่น
- ใช้ `escapeHtml()` เพื่อป้องกัน XSS attacks
- Extension ขอ Permission เฉพาะที่จำเป็น: `tabs`, `storage`, `bookmarks`

## 📚 References

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [Tabs API](https://developer.chrome.com/docs/extensions/reference/tabs/)

## 🎯 Future Enhancements

- [ ] เพิ่มการค้นหาแท็บ
- [ ] Filter แท็บตาม Domain
- [ ] Group แท็บตาม Category
- [ ] Export รายการแท็บเป็น JSON/CSV
- [ ] Sync กับ Cloud Storage
- [ ] Dark Mode สำหรับ Extension Popup

## 📞 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ:
1. ตรวจสอบ Console logs (F12)
2. ดูเอกสารนี้อีกครั้ง
3. ตรวจสอบ Chrome Extension Documentation

---

**Version:** 1.0.0
**Last Updated:** 2025-11-15
