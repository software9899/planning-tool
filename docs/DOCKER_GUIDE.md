# 🐳 Docker Setup Guide - Planning Tool

คู่มือการใช้งาน Docker สำหรับ Planning Tool

## 📋 สิ่งที่ต้องมี (Prerequisites)

- Docker Desktop (สำหรับ macOS/Windows)
- Docker Engine (สำหรับ Linux)
- Docker Compose

### ตรวจสอบว่าติดตั้ง Docker แล้ว
```bash
docker --version
docker-compose --version
```

## 🚀 Quick Start

### 1. Build และรัน Container
```bash
cd planning-tool
docker-compose up -d
```

### 2. เปิดในเบราว์เซอร์
เปิด: **http://localhost:3000**

### 3. ดู Logs
```bash
docker-compose logs -f
```

### 4. หยุด Container
```bash
docker-compose down
```

## 📚 คำสั่ง Docker ทั้งหมด

### การจัดการ Container

```bash
# รัน container (แบบ detached mode)
docker-compose up -d

# รัน container และดู logs
docker-compose up

# หยุด container
docker-compose down

# หยุด และลบ volumes
docker-compose down -v

# Restart container
docker-compose restart

# Rebuild image และรัน
docker-compose up -d --build
```

### ดู Logs

```bash
# ดู logs ทั้งหมด
docker-compose logs

# ดู logs แบบ real-time
docker-compose logs -f

# ดู logs 100 บรรทัดสุดท้าย
docker-compose logs --tail=100

# ดู logs ของ service เฉพาะ
docker-compose logs -f planning-tool
```

### ตรวจสอบสถานะ

```bash
# ดูสถานะ containers
docker-compose ps

# ดูรายละเอียด container
docker inspect planning-tool-app

# เช็ค port mapping
docker-compose port planning-tool 3000
```

### เข้าไปใน Container

```bash
# เข้า shell ของ container
docker-compose exec planning-tool sh

# รันคำสั่งใน container
docker-compose exec planning-tool npm --version
docker-compose exec planning-tool ls -la
```

## 🛠️ โครงสร้างไฟล์ Docker

### Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**อธิบาย:**
- ใช้ Node.js 20 Alpine (เบามาก ~40MB)
- Copy package.json ก่อนเพื่อใช้ประโยชน์จาก Docker cache
- Install dependencies
- Copy โค้ดทั้งหมด
- Expose port 3000
- รันคำสั่ง `npm start`

### docker-compose.yml
```yaml
services:
  planning-tool:
    build: .
    container_name: planning-tool-app
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
    volumes:
      - ./:/app
      - /app/node_modules
    restart: unless-stopped
    command: npm start
```

**อธิบาย:**
- `build: .` - Build จาก Dockerfile ในโฟลเดอร์เดียวกัน
- `ports` - Map port 3000 จาก container ไปยัง host
- `volumes` - Mount โฟลเดอร์เพื่อ hot reload (dev mode)
- `restart` - Restart อัตโนมัติถ้า container หยุด

### .dockerignore
```
node_modules
npm-debug.log
.git
.gitignore
.DS_Store
*.md
.env
.vscode
backup
docs
```

**อธิบาย:**
- ไฟล์ที่ไม่ต้องการ copy เข้า Docker image
- ช่วยให้ build เร็วขึ้นและ image เล็กลง

## 🔧 Configuration

### เปลี่ยน Port

#### วิธีที่ 1: แก้ docker-compose.yml
```yaml
ports:
  - "8080:3000"  # เปลี่ยนจาก 3000 เป็น 8080
```

#### วิธีที่ 2: ใช้ Environment Variable
```yaml
environment:
  - PORT=8080
ports:
  - "8080:8080"
```

### เพิ่ม Environment Variables

แก้ไข `docker-compose.yml`:
```yaml
environment:
  - PORT=3000
  - NODE_ENV=production
  - DB_HOST=localhost
  - API_KEY=your-api-key
```

## 🐛 Troubleshooting

### ปัญหา: Port 3000 ถูกใช้งานอยู่แล้ว

**อาการ:** 
```
Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use
```

**วิธีแก้:**
```bash
# macOS/Linux - หาว่า process ไหนใช้ port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# หรือเปลี่ยน port ใน docker-compose.yml
ports:
  - "8080:3000"
```

**Windows:**
```cmd
# หา process
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

### ปัญหา: Docker build ช้า

**วิธีแก้:**
```bash
# ล้าง cache และ rebuild
docker-compose build --no-cache

# ลบ unused images/containers
docker system prune -a
```

### ปัญหา: Container หยุดทำงานทันที

**วิธีแก้:**
```bash
# ดู logs เพื่อหาสาเหตุ
docker-compose logs planning-tool

# ตรวจสอบว่า package.json มี start script
cat package.json

# เช็คว่า node_modules ติดตั้งครบ
docker-compose exec planning-tool ls -la node_modules
```

### ปัญหา: File changes ไม่อัปเดต

**วิธีแก้:**
```bash
# Restart container
docker-compose restart

# หรือ rebuild
docker-compose up -d --build

# สำหรับ hot reload ให้ใช้ nodemon
# แก้ package.json:
# "start": "nodemon index.js"
```

### ปัญหา: Permission denied

**วิธีแก้:**
```bash
# macOS/Linux - เปลี่ยน ownership
sudo chown -R $(whoami) .

# หรือรัน docker ด้วย sudo
sudo docker-compose up -d
```

## 🚀 Production Deployment

### 1. Build Production Image

```bash
# Build และ tag image
docker build -t planning-tool:1.0.0 .

# หรือใช้ docker-compose
docker-compose build
```

### 2. Push to Registry

```bash
# Tag สำหรับ Docker Hub
docker tag planning-tool:1.0.0 username/planning-tool:1.0.0

# Push
docker push username/planning-tool:1.0.0
```

### 3. Deploy บน Server

```bash
# Pull image
docker pull username/planning-tool:1.0.0

# Run container
docker run -d \
  --name planning-tool \
  -p 3000:3000 \
  -e NODE_ENV=production \
  --restart unless-stopped \
  username/planning-tool:1.0.0
```

### 4. ใช้ docker-compose บน Production

สร้างไฟล์ `docker-compose.prod.yml`:
```yaml
services:
  planning-tool:
    image: username/planning-tool:1.0.0
    container_name: planning-tool-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

Run:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoring

### ดูการใช้ Resources

```bash
# ดู CPU, Memory, Network usage
docker stats planning-tool-app

# ดูแบบไม่ stream
docker stats --no-stream planning-tool-app
```

### Health Check

เพิ่มใน Dockerfile:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

## 🔐 Security Best Practices

1. **ใช้ Non-root User**
```dockerfile
# เพิ่มใน Dockerfile
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs
```

2. **ใช้ Multi-stage Build** (ถ้าต้องการลด image size)
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

3. **ไม่เก็บ Secrets ใน Image**
- ใช้ Environment Variables
- ใช้ Docker Secrets (Swarm)
- ใช้ .env files (ไม่ commit)

## 📝 Tips & Tricks

### Auto Restart Container on Reboot

```yaml
restart: unless-stopped  # หรือ always
```

### Cleanup Commands

```bash
# ลบ stopped containers
docker container prune

# ลบ unused images
docker image prune

# ลบทุกอย่างที่ไม่ใช้
docker system prune -a --volumes
```

### View Container Details

```bash
# ดู environment variables
docker-compose exec planning-tool env

# ดู network settings
docker network inspect planning-tool_default

# ดู volumes
docker volume ls
```

## 🆘 ขอความช่วยเหลือ

หากมีปัญหาเพิ่มเติม:
1. ตรวจสอบ logs: `docker-compose logs -f`
2. ตรวจสอบสถานะ: `docker-compose ps`
3. Rebuild: `docker-compose up -d --build`
4. ลบและสร้างใหม่: `docker-compose down && docker-compose up -d`

---

**สร้างโดย:** Claude Code Assistant 🤖
**เวอร์ชัน:** 1.0.0
**อัปเดตล่าสุด:** 2025-11-13
