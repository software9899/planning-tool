# 🤖 AI Training Data Collector - Chrome Extension

Chrome extension ที่ช่วยจับข้อมูล input fields และ dropdowns จากเว็บไซต์ เพื่อใช้ในการ train AI

## 📁 Folder Structure

```
chrome-extension-ai-trainer/
├── manifest.json                          # Extension configuration
├── src/
│   ├── background/
│   │   └── service-worker.js             # Background service worker
│   ├── content/
│   │   └── capture-fields.js             # Content script (จับข้อมูลจากหน้าเว็บ)
│   ├── popup/
│   │   ├── popup.html                    # Popup UI
│   │   ├── popup.css                     # Popup styles
│   │   └── popup.js                      # Popup logic
│   ├── pages/
│   │   └── training/
│   │       ├── training.html             # Training data viewer page
│   │       ├── training.css              # Training page styles
│   │       └── training.js               # Training page logic
│   └── assets/
│       ├── icons/                        # Extension icons
│       ├── css/                          # Shared CSS
│       └── js/                           # Shared JS
├── dist/                                  # Build output (optional)
└── README.md                             # Documentation
```

## ✨ Features

### 🎯 Auto-Capture
- **อัตโนมัติ**: จับข้อมูล input fields/dropdowns ทุกครั้งที่เปลี่ยนหน้า
- **SPA Support**: รองรับ Single Page Applications
- **Smart Detection**: จับทั้ง `<input>`, `<select>`, `<textarea>`

### 📊 Training Data Page
- **Left Sidebar Menu**: เมนู 3 หัวข้อ
  - 📊 Training Data - ดูข้อมูลที่จับได้
  - 💾 Export Data - Export เป็น JSON/CSV
  - ⚙️ Settings - ตั้งค่า
- **Data Table**: แสดงข้อมูลทั้งหมดในรูปแบบตาราง
- **Search & Filter**: ค้นหาและกรองข้อมูล
- **Detail View**: ดูรายละเอียดแต่ละ record

### 💾 Export Options
- **JSON**: สำหรับใช้กับ AI models
- **CSV**: สำหรับวิเคราะห์ใน spreadsheet

## 🚀 Installation

### 1. Developer Mode
1. เปิด Chrome → **chrome://extensions/**
2. เปิด **Developer mode** (มุมขวาบน)
3. คลิก **Load unpacked**
4. เลือก folder `chrome-extension-ai-trainer/`

### 2. จากไฟล์ .zip (Production)
1. Build extension เป็น .zip
2. ลากไฟล์ .zip ไปที่ **chrome://extensions/**

## 📖 How to Use

### 1. Auto-Capture (อัตโนมัติ)
- เปิดเว็บไซต์ใดก็ได้
- Extension จะจับข้อมูล input fields อัตโนมัติ
- ข้อมูลจะถูกบันทึกใน Chrome Storage

### 2. Manual Capture (กดเอง)
1. คลิกที่ Extension icon
2. คลิก **📸 Capture Current Page**
3. ข้อมูลจะถูกบันทึกทันที

### 3. ดู Training Data
1. คลิกที่ Extension icon
2. คลิก **📊 View Training Data**
3. จะเปิดหน้าใหม่แสดงข้อมูลทั้งหมด

### 4. Export Data
1. ไปที่หน้า Training Data
2. เลือก **💾 Export** tab ใน sidebar
3. เลือก format (JSON หรือ CSV)
4. คลิก Download

## 🛠️ Development

### File Structure Explained

#### `manifest.json`
- กำหนดค่าพื้นฐานของ extension
- Permissions, content scripts, background worker

#### `src/content/capture-fields.js`
- **Content Script** - รันบนทุกหน้าเว็บ
- จับ input fields, selects, textareas
- ส่งข้อมูลไปยัง background worker

#### `src/background/service-worker.js`
- **Background Worker** - รันตลอดเวลา
- จัดการ storage
- รับ/ส่งข้อความระหว่าง content script และ popup

#### `src/popup/`
- **Popup UI** - แสดงเมื่อคลิกที่ extension icon
- แสดง stats
- ปุ่มควบคุมต่างๆ

#### `src/pages/training/`
- **Full Page UI** - หน้าแสดงข้อมูลแบบเต็ม
- Sidebar navigation
- Data table with search/filter
- Export functionality

## 📊 Data Structure

```json
{
  "timestamp": "2025-01-18T10:30:00.000Z",
  "url": "https://example.com/form",
  "pageTitle": "Contact Form",
  "fields": {
    "inputs": [
      {
        "type": "input",
        "inputType": "text",
        "id": "name",
        "name": "fullname",
        "placeholder": "Enter your name",
        "value": "John Doe",
        "label": "Full Name",
        "required": true
      }
    ],
    "selects": [
      {
        "type": "select",
        "id": "country",
        "name": "country",
        "label": "Country",
        "options": [...],
        "selectedValue": "TH",
        "selectedText": "Thailand"
      }
    ],
    "textareas": [...]
  },
  "totalFields": 15
}
```

## 🎨 Customization

### เปลี่ยนสี Theme
แก้ไขไฟล์ `src/pages/training/training.css`:
```css
background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
```

### ปรับ Auto-Capture Delay
แก้ไขใน `src/content/capture-fields.js`:
```javascript
setTimeout(() => {
  capturePageFields();
}, 1000); // เปลี่ยนจาก 1000ms ตามต้องการ
```

## 🔒 Privacy & Security

- ข้อมูลเก็บใน **Chrome Local Storage** เท่านั้น
- **ไม่ส่งข้อมูลออกนอก** browser
- สามารถปิด capture values ได้ใน Settings

## 📝 License

MIT License - ใช้ได้ตามสะดวก

---

สร้างด้วย ❤️ สำหรับ AI Training
