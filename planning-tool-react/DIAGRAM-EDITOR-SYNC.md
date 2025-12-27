# Diagram Editor Sync

## การใช้งาน

ไฟล์ System Flow Diagram Editor ใช้ข้อมูลจาก folder หลัก `/Users/testtorial/Documents/MCP/planning-tool/diagram-editor`

### เมื่อแก้ไขไฟล์ใน /planning-tool/diagram-editor

หลังจากแก้ไข `index.html`, `script.js`, หรือ `style.css` ใน folder `/planning-tool/diagram-editor` ให้รัน:

```bash
cd /Users/testtorial/Documents/MCP/planning-tool/planning-tool-react
./sync-diagram-editor.sh
```

Script นี้จะ:
1. ✅ Copy `script.js` → `public/diagram-editor.js`
2. ✅ Copy และ process `style.css` → `src/css/diagram-editor.css`
   - เพิ่ม scope `.system-flow-page` เพื่อป้องกัน CSS conflict
   - เปลี่ยนสี theme ให้ตรงกับแอพ (purple #667eea, green #10b981)

### ไฟล์ที่ใช้งาน

**Source (แก้ไขที่นี่):**
- `/Users/testtorial/Documents/MCP/planning-tool/diagram-editor/script.js`
- `/Users/testtorial/Documents/MCP/planning-tool/diagram-editor/style.css`
- `/Users/testtorial/Documents/MCP/planning-tool/diagram-editor/index.html` (อ้างอิงเท่านั้น)

**Target (Auto-generated):**
- `public/diagram-editor.js`
- `src/css/diagram-editor.css`
- `src/pages/SystemFlow.tsx` (แก้ด้วยตนเองถ้าต้องการเปลี่ยน HTML structure)

### หมายเหตุ

- ไฟล์ `SystemFlow.tsx` ใช้ HTML structure เดียวกับ `index.html` แต่เป็น React component
- หากมีการเพิ่ม HTML elements ใหม่ใน `index.html` ต้องอัพเดท `SystemFlow.tsx` ด้วยตนเอง
- CSS จะถูก scope อัตโนมัติเพื่อไม่ให้กระทบ style ของหน้าอื่นๆ

## Features ที่มีใน Diagram Editor

### เครื่องมือหลัก
- ✅ Select, Rectangle, Circle, Diamond, Text
- ✅ Database, Cloud, User shapes
- ✅ Connection lines with arrows
- ✅ Zoom & Pan
- ✅ Stroke color, Fill color, Stroke width

### ฟีเจอร์ขั้นสูง
- ✅ Save/Load JSON files
- ✅ Browse folder & Recent files
- ✅ Import/Export Mermaid format
- ✅ Export PNG
- ✅ Detailed view (drill-down)
- ✅ Impact Analysis
- ✅ As-Is / To-Be comparison
- ✅ Context menu (right-click)
- ✅ Breadcrumb navigation
- ✅ Connection notes & labels
- ✅ Arrow styles (start/end)
- ✅ Context boxes (inbound/outbound)

### Keyboard Shortcuts
- `V` - Select tool
- `R` - Rectangle
- `C` - Circle
- `D` - Diamond
- `T` - Text
- `Delete` - Delete selected
- `Ctrl/Cmd + S` - Save
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Y` - Redo
