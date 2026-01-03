# 🏢 Virtual Office - Multiplayer Workspace

โปรเจค Virtual Office แบบเรียลไทม์ที่คล้ายกับ Gather.town สร้างด้วย HTML5 Canvas และ Socket.io

## ✨ ฟีเจอร์

- 🎮 **Character Movement** - เดินได้ด้วยคีย์ WASD หรือลูกศร
- 💬 **Global Chat** - แชทกับทุกคนในห้องเดียวกัน
- 👥 **Proximity Chat** - แชทเฉพาะคนที่อยู่ใกล้กัน (ระยะ 200 pixels)
- 🚪 **Multiple Rooms** - มีหลายห้องให้เลือกเดินไปมาได้
- 🎨 **Real-time Multiplayer** - เห็นผู้เล่นคนอื่นๆ เคลื่อนไหวแบบเรียลไทม์
- 💾 **MongoDB Integration** - เก็บข้อมูลผู้ใช้และข้อความแชท

## 🛠️ เทคโนโลยีที่ใช้

- **Frontend**: HTML5 Canvas, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.io
- **Database**: MongoDB
- **Styling**: CSS3

## 📋 การติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
cd virtual-office
npm install
```

### 2. ติดตั้ง MongoDB

**สำหรับ macOS (ใช้ Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**สำหรับ Ubuntu/Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**สำหรับ Windows:**
ดาวน์โหลดจาก [MongoDB Download Center](https://www.mongodb.com/try/download/community)

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` จาก `.env.example`:

```bash
cp .env.example .env
```

แก้ไข `.env` ตามต้องการ:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/virtual-office
NODE_ENV=development
```

### 4. เริ่มใช้งาน

```bash
npm start
```

หรือสำหรับ development mode (auto-reload):
```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่: **http://localhost:3000**

## 🎮 วิธีใช้งาน

1. **เข้าสู่ระบบ**
   - ใส่ชื่อของคุณ (อย่างน้อย 3 ตัวอักษร)
   - เลือกห้องที่ต้องการเข้า
   - กดปุ่ม "เข้าร่วม"

2. **การเดิน**
   - ใช้คีย์ **W A S D** หรือ **ลูกศร** เพื่อเดิน
   - ตัวละครของคุณจะมีกรอบสีทอง

3. **การแชท**
   - **Global Chat**: ทุกคนในห้องเห็นได้
   - **Proximity Chat**: เฉพาะคนในระยะ 200 pixels เห็นได้
   - กด **Enter** เพื่อโฟกัสที่ช่องแชท
   - พิมพ์ข้อความและกด **Enter** เพื่อส่ง

4. **การเปลี่ยนห้อง**
   - กดปุ่ม "เปลี่ยนห้อง" ที่ด้านบน
   - เลือกห้องที่ต้องการย้ายไป

## 🏗️ โครงสร้างโปรเจค

```
virtual-office/
├── server/
│   ├── index.js          # Express server + Socket.io
│   └── database.js       # MongoDB connection
├── models/
│   └── User.js           # User & Message schemas
├── public/
│   ├── index.html        # Main HTML
│   ├── style.css         # Styling
│   └── game.js           # Game logic & Canvas rendering
├── package.json
├── .env.example
└── README.md
```

## 🔧 การปรับแต่ง

### เพิ่มห้องใหม่

แก้ไขในไฟล์ `server/index.js`:

```javascript
const defaultRooms = ['lobby', 'meeting-room', 'lounge', 'your-new-room'];
```

### ปรับความเร็วตัวละคร

แก้ไขในไฟล์ `public/game.js`:

```javascript
this.speed = 3; // เพิ่มเลขเพื่อให้เดินเร็วขึ้น
```

### ปรับระยะ Proximity Chat

แก้ไขในไฟล์ `server/index.js`:

```javascript
const proximityRange = 200; // เพิ่มเลขเพื่อขยายระยะ
```

## 🌐 การ Deploy

### Deploy บน Heroku

1. สร้างบัญชี [Heroku](https://heroku.com)
2. ติดตั้ง Heroku CLI
3. สร้าง app:

```bash
heroku create your-app-name
```

4. เพิ่ม MongoDB addon:

```bash
heroku addons:create mongodb:sandbox
```

5. Deploy:

```bash
git push heroku main
```

### Deploy บน Railway/Render

1. สร้างบัญชีที่ [Railway](https://railway.app) หรือ [Render](https://render.com)
2. เชื่อมต่อ GitHub repository
3. เพิ่ม MongoDB database
4. ตั้งค่า environment variables
5. Deploy

## 🐛 แก้ไขปัญหา

### MongoDB ไม่สามารถเชื่อมต่อได้

```bash
# ตรวจสอบว่า MongoDB กำลังรันอยู่
brew services list  # macOS
sudo systemctl status mongodb  # Linux

# เริ่ม MongoDB ใหม่
brew services restart mongodb-community  # macOS
sudo systemctl restart mongodb  # Linux
```

### Port 3000 ถูกใช้งานแล้ว

แก้ไขใน `.env`:
```env
PORT=3001
```

## 📝 To-Do / ฟีเจอร์ในอนาคต

- [ ] Video/Audio chat
- [ ] Private messages
- [ ] Emotes/Reactions
- [ ] Custom avatars
- [ ] Screen sharing
- [ ] Game rooms (mini-games)
- [ ] Admin controls
- [ ] User profiles
- [ ] Friend system

## 📄 License

MIT License - ใช้งานได้อย่างอิสระ

## 🤝 Contributing

Pull requests ยินดีต้อนรับ! สำหรับการเปลี่ยนแปลงใหญ่ กรุณาเปิด issue ก่อนเพื่อหารือ

---

สร้างด้วย ❤️ โดยใช้ Node.js, Socket.io และ HTML5 Canvas
