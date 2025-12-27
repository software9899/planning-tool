# Extension Icons

## Current Status
ตอนนี้ยังไม่มีไอคอน PNG สามารถใช้ SVG หรือสร้าง PNG icons ได้

## วิธีสร้างไอคอน

### Option 1: ใช้ Online Tool
1. ไปที่ https://www.favicon-generator.org/
2. Upload `icon.svg` หรือรูปที่ต้องการ
3. Download icons ขนาด 16x16, 48x48, 128x128
4. เปลี่ยนชื่อเป็น `icon16.png`, `icon48.png`, `icon128.png`

### Option 2: ใช้ ImageMagick (Command Line)
```bash
# Install ImageMagick
brew install imagemagick  # macOS
# or
sudo apt install imagemagick  # Linux

# Convert SVG to PNG
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

### Option 3: ใช้ Photoshop/Figma
1. เปิด `icon.svg`
2. Export เป็น PNG ขนาด 16x16, 48x48, 128x128
3. Save ในโฟลเดอร์นี้

## ไอคอนที่ต้องการ
- `icon16.png` - 16x16 pixels (ใช้ใน extension toolbar)
- `icon48.png` - 48x48 pixels (ใช้ใน extension management page)
- `icon128.png` - 128x128 pixels (ใช้ใน Chrome Web Store)

## Temporary Solution
Extension จะยังใช้งานได้แม้ไม่มีไอคอน แต่จะแสดงไอคอนเริ่มต้นของ Chrome แทน
