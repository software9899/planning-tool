# 🚀 Deploy บน DigitalOcean Droplet

## ขั้นตอนที่ 1: สร้าง Droplet

1. ไปที่: https://cloud.digitalocean.com/droplets
2. Click **Create Droplet**
3. เลือก:
   - **Region**: Singapore
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic $6/month (1GB RAM)
   - **Authentication**: SSH Key (แนะนำ)
4. Click **Create Droplet**

---

## ขั้นตอนที่ 2: เข้า SSH

```bash
ssh root@YOUR_DROPLET_IP
```

---

## ขั้นตอนที่ 3: ติดตั้ง Docker (บน Droplet)

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Install Git
apt install git -y

# Verify installation
docker --version
docker-compose --version
```

---

## ขั้นตอนที่ 4: Deploy Application

```bash
# Create directory
mkdir -p /var/www/planning-tool
cd /var/www/planning-tool

# Clone repository (แทน YOUR_USERNAME และ YOUR_REPO)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# หรือถ้าใช้ private repo:
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git .

# Start application
chmod +x start-all.sh
./start-all.sh
```

---

## ขั้นตอนที่ 5: เปิด Firewall

```bash
# Allow HTTP (port 80)
ufw allow 80/tcp

# Allow HTTPS (port 443) - สำหรับอนาคต
ufw allow 443/tcp

# Allow SSH (port 22)
ufw allow 22/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

---

## ขั้นตอนที่ 6: เข้าใช้งาน

เปิด Browser:
```
http://YOUR_DROPLET_IP
```

Backend API:
```
http://YOUR_DROPLET_IP:8002
http://YOUR_DROPLET_IP:8002/docs
```

---

## ขั้นตอนที่ 7: ตั้งค่า Domain (Optional)

### A. ซื้อ Domain หรือใช้ของเก่า

### B. ตั้งค่า DNS

ที่ DNS Provider (เช่น Cloudflare, Namecheap):

**A Record:**
```
Type: A
Name: @
Value: YOUR_DROPLET_IP
TTL: Auto
```

**A Record (www):**
```
Type: A
Name: www
Value: YOUR_DROPLET_IP
TTL: Auto
```

### C. ติดตั้ง SSL (Let's Encrypt)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Install Nginx
apt install nginx -y

# Create Nginx config
cat > /etc/nginx/sites-available/planning-tool << 'NGINX_EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF

# Enable site
ln -s /etc/nginx/sites-available/planning-tool /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## การจัดการ

### ดู Logs
```bash
cd /var/www/planning-tool
docker-compose logs -f
```

### Restart Services
```bash
docker-compose restart
```

### Stop Services
```bash
docker-compose down
```

### Update Application
```bash
cd /var/www/planning-tool
git pull
docker-compose down
docker-compose up --build -d
```

### Backup Database
```bash
# Backup
docker exec planning-tool-db pg_dump -U postgres planning_tool > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20231227.sql | docker exec -i planning-tool-db psql -U postgres planning_tool
```

---

## Monitor & Maintenance

### Check Disk Space
```bash
df -h
```

### Check Memory
```bash
free -m
```

### Check Docker Status
```bash
docker ps
docker stats
```

### Auto-restart on Reboot
```bash
# Docker containers already have restart: unless-stopped
# They will auto-restart on Droplet reboot
```

---

## Troubleshooting

### Port already in use
```bash
# Kill process on port 80
lsof -ti:80 | xargs kill -9

# Kill process on port 8002
lsof -ti:8002 | xargs kill -9
```

### Cannot connect to database
```bash
# Restart database
docker-compose restart db

# Check database logs
docker-compose logs db
```

### Out of memory
```bash
# Clean Docker
docker system prune -a
```

---

## ราคารวม

- **Droplet**: $6/เดือน
- **Domain** (optional): ~$10-15/ปี (~$1/เดือน)
- **SSL**: ฟรี (Let's Encrypt)

**รวม**: ~$6-7/เดือน 🎉
