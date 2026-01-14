# Planning Tool Production Deployment Guide

Complete guide for deploying Planning Tool + Virtual Office on Digital Ocean.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Initial Setup](#initial-setup)
- [Deployment](#deployment)
- [Backup & Restore](#backup--restore)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Rollback](#rollback)
- [SSL Certificate Management](#ssl-certificate-management)
- [Maintenance](#maintenance)

---

## Architecture Overview

### Services

The application consists of 8 Docker containers:

```
[Internet]
    ↓
[Nginx :80/443] ← SSL Termination & Reverse Proxy
    ├─→ [Frontend :3001]         React SPA served by Nginx
    ├─→ [Backend :8002]           FastAPI application
    └─→ [Virtual Office :3000]    Node.js + Socket.io
         ↓
    [PostgreSQL :5432]  [MongoDB :27017]  [TURN :3478/5349]
```

**Services:**
1. **nginx** - Reverse proxy with SSL termination
2. **certbot** - Automatic SSL certificate renewal
3. **postgres** - Planning Tool database
4. **mongodb** - Virtual Office database
5. **backend** - FastAPI Python application
6. **frontend** - React frontend (static build)
7. **virtual-office** - Node.js multiplayer game server
8. **coturn** - WebRTC TURN server for voice/video

### Ports

- **80** - HTTP (redirects to HTTPS)
- **443** - HTTPS (all traffic)
- **3478/5349** - TURN server (WebRTC)

All internal services communicate via Docker network and are not exposed directly to the internet.

---

## Initial Setup

### Prerequisites

- Digital Ocean Droplet (2 vCPUs, 4GB RAM minimum)
- Ubuntu 22.04 LTS
- Domain name with DNS pointing to server IP
- SSH access to server

### 1. Server Setup

SSH into your Digital Ocean droplet:

```bash
ssh root@your-droplet-ip
```

Update system and install Docker:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

Configure firewall:

```bash
# Allow SSH, HTTP, HTTPS, TURN
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw enable

# Verify
ufw status
```

### 2. Clone Repository

```bash
# Create application directory
mkdir -p /root/planning-tool
cd /root/planning-tool

# Clone repository
git clone https://github.com/YOUR_USERNAME/planning-tool.git .
```

### 3. Configure DNS

In your domain registrar (Namecheap, Cloudflare, etc.):

- Add A record: `yourdomain.com` → `your-droplet-ip`
- Add CNAME: `www.yourdomain.com` → `yourdomain.com`

Verify DNS propagation:

```bash
dig +short yourdomain.com
```

### 4. Run Deployment

```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Check prerequisites (Docker, disk space, DNS)
2. Prompt for configuration (domain, SSL email, passwords)
3. Generate `.env` file
4. Obtain SSL certificate
5. Build Docker images
6. Start all services
7. Run database migrations
8. Verify deployment

**First deployment takes 5-10 minutes.**

---

## Deployment

### One-Command Deployment

For initial deployment or updates:

```bash
./deploy.sh
```

For automated deployment (CI/CD):

```bash
./deploy.sh --auto
```

### Manual Deployment Steps

If you need to deploy manually:

```bash
# 1. Pull latest code
git pull origin main

# 2. Load environment variables
source .env

# 3. Build images
docker compose -f docker-compose.prod.yml build

# 4. Stop services
docker compose -f docker-compose.prod.yml down

# 5. Start services
docker compose -f docker-compose.prod.yml up -d

# 6. Run migrations
docker exec planning-tool-backend alembic upgrade head

# 7. Verify
docker compose -f docker-compose.prod.yml ps
curl https://yourdomain.com/health
```

### CI/CD Deployment (GitHub Actions)

Automatic deployment on `git push`:

1. **Setup GitHub Secrets:**
   - `DO_SSH_KEY` - Private SSH key for server access
   - `DO_HOST` - Server IP address
   - `DOMAIN` - Your domain name

2. **Deploy:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

GitHub Actions will automatically deploy to production.

---

## Backup & Restore

### Automated Daily Backups

Setup automated backups (runs daily at 2 AM):

```bash
# Add to crontab
crontab -e

# Add this line:
0 2 * * * /root/planning-tool/scripts/backup.sh >> /var/log/backup.log 2>&1
```

Backups are stored in `/root/planning-tool/backups/` and retained for 7 days.

### Manual Backup

Run backup manually:

```bash
./scripts/backup.sh
```

### Restore from Backup

List available backups:

```bash
ls -lh backups/
```

Restore PostgreSQL:

```bash
./scripts/restore.sh postgres 20260114_020000
```

Restore MongoDB:

```bash
./scripts/restore.sh mongodb 20260114_020000
```

**Warning:** Restore will overwrite current database.

### Backup to DigitalOcean Spaces

For offsite backups, configure DigitalOcean Spaces in `.env`:

```env
DO_SPACES_KEY=your_spaces_key
DO_SPACES_SECRET=your_spaces_secret
DO_SPACES_BUCKET=planning-tool-backups
```

Backups will automatically upload to Spaces after creation.

---

## Monitoring

### Health Monitoring

Setup automated health checks (runs every 5 minutes):

```bash
# Add to crontab
crontab -e

# Add this line:
*/5 * * * * /root/planning-tool/scripts/health-check.sh >> /var/log/health-check.log 2>&1
```

Health check monitors:
- Container status
- HTTP/HTTPS endpoints
- Backend API health
- Disk space (warns at 80%, alerts at 90%)
- Memory usage (warns at 80%, alerts at 90%)

Unhealthy services are automatically restarted.

### View Logs

**All services:**
```bash
docker compose -f docker-compose.prod.yml logs -f
```

**Specific service:**
```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

**Backend application logs:**
```bash
docker exec planning-tool-backend tail -f /app/logs/app.log
```

**Nginx access logs:**
```bash
docker exec planning-tool-nginx tail -f /var/log/nginx/access.log
```

### Service Status

Check all services:

```bash
docker compose -f docker-compose.prod.yml ps
```

Check specific service health:

```bash
docker inspect planning-tool-backend | grep -A 10 Health
```

### System Resources

**Disk usage:**
```bash
df -h
du -sh /var/lib/docker
```

**Memory usage:**
```bash
free -h
docker stats --no-stream
```

---

## Troubleshooting

### Common Issues

#### 1. SSL Certificate Fails

**Symptom:** certbot fails to obtain certificate

**Solution:**
- Verify DNS is pointing to server: `dig +short yourdomain.com`
- Ensure port 80 is open: `ufw status`
- Check domain is accessible: `curl http://yourdomain.com`
- Wait 5-10 minutes for DNS propagation

#### 2. Database Connection Errors

**Symptom:** Backend logs show connection refused

**Solution:**
```bash
# Check PostgreSQL is running
docker ps | grep planning-tool-db

# Check PostgreSQL logs
docker logs planning-tool-db

# Restart database
docker compose -f docker-compose.prod.yml restart postgres

# Verify connection
docker exec planning-tool-db pg_isready -U planningtool
```

#### 3. Frontend Not Loading

**Symptom:** Blank page or 502 error

**Solution:**
```bash
# Check frontend container
docker logs planning-tool-frontend

# Rebuild frontend
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

#### 4. Virtual Office WebSocket Issues

**Symptom:** Cannot connect to multiplayer game

**Solution:**
```bash
# Check virtual office logs
docker logs virtual-office-server

# Verify MongoDB connection
docker exec virtual-office-db mongosh --eval "db.adminCommand('ping')"

# Restart virtual office
docker compose -f docker-compose.prod.yml restart virtual-office
```

#### 5. Out of Disk Space

**Symptom:** Docker build fails, containers crash

**Solution:**
```bash
# Clean up Docker resources
docker system prune -a --volumes

# Remove old images
docker image prune -a

# Remove old logs
find /var/lib/docker/containers -name "*.log" -type f -delete
```

### Debug Mode

Enable verbose logging:

```bash
# In .env file
LOG_LEVEL=debug

# Restart services
docker compose -f docker-compose.prod.yml restart
```

---

## Rollback

### Quick Rollback

If deployment fails, rollback to previous version:

```bash
# 1. Stop new containers
docker compose -f docker-compose.prod.yml down

# 2. Restore database from backup
./scripts/restore.sh postgres <previous-backup-date>

# 3. Revert code
git log  # Find previous commit hash
git reset --hard <previous-commit-hash>

# 4. Redeploy
./deploy.sh --auto
```

### Rollback Specific Service

Rollback only backend:

```bash
# Revert backend code
cd backend
git checkout HEAD~1 -- .

# Rebuild and restart
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml restart backend
```

---

## SSL Certificate Management

### Certificate Auto-Renewal

Certbot automatically renews certificates every 12 hours (via certbot container).

### Manual Renewal

Force certificate renewal:

```bash
docker compose -f docker-compose.prod.yml stop nginx

docker run -it --rm \
  -p 80:80 \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot renew --force-renewal

docker compose -f docker-compose.prod.yml start nginx
```

### Check Certificate Expiry

```bash
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certificates
```

### Add New Domain

Add domain to certificate:

```bash
docker compose -f docker-compose.prod.yml stop nginx

docker run -it --rm \
  -p 80:80 \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --standalone \
  --email admin@yourdomain.com \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d new.yourdomain.com

docker compose -f docker-compose.prod.yml start nginx
```

---

## Maintenance

### Weekly Tasks

- [ ] Check backup logs: `tail -100 /var/log/backup.log`
- [ ] Verify SSL expiry: `docker run --rm -v "$(pwd)/certbot/conf:/etc/letsencrypt" certbot/certbot certificates`
- [ ] Review error logs: `docker compose -f docker-compose.prod.yml logs --tail=100 | grep -i error`

### Monthly Tasks

- [ ] Update Docker images: `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`
- [ ] Test restore procedure: `./scripts/restore.sh postgres <backup-date>`
- [ ] Review disk usage: `df -h && du -sh /var/lib/docker`
- [ ] Check for security updates: `apt update && apt list --upgradable`

### Quarterly Tasks

- [ ] Update Ubuntu packages: `apt update && apt upgrade -y`
- [ ] Review and optimize Nginx config
- [ ] Update Node.js/Python dependencies (in development, then deploy)
- [ ] Review and clean up old backups

### Database Migrations

When schema changes are needed:

```bash
# Create migration
docker exec planning-tool-backend alembic revision -m "description"

# Edit migration file in backend/alembic/versions/

# Apply migration
docker exec planning-tool-backend alembic upgrade head

# Rollback if needed
docker exec planning-tool-backend alembic downgrade -1
```

---

## Additional Resources

- [GitHub Repository](https://github.com/YOUR_USERNAME/planning-tool)
- [Digital Ocean Documentation](https://docs.digitalocean.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

For support, open an issue on GitHub or contact your system administrator.
