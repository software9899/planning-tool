# Docker Deployment - Quick Reference

## 🚀 Production Deployment (3 Steps)

### On Production Server (68.183.227.173)

1. **Upload files to server:**
   ```bash
   scp -r backend/ user@68.183.227.173:~/planning-tool/
   ```

2. **SSH and run quickstart:**
   ```bash
   ssh user@68.183.227.173
   cd ~/planning-tool/backend
   ./production-quickstart.sh
   ```

3. **Done!** Backend running on http://68.183.227.173:8002

---

## 📋 Manual Deployment

If you prefer manual steps:

```bash
# 1. Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://user:password@host:5432/planning_tool
PLUGINS_DIR=/app/plugins
LOG_LEVEL=info
EOF

# 2. Run migration
docker-compose -f docker-compose.prod.yml --profile migration run --rm migration

# 3. Start backend
docker-compose -f docker-compose.prod.yml up -d backend

# 4. Check status
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## 🔧 Common Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart
docker-compose -f docker-compose.prod.yml restart backend

# Stop
docker-compose -f docker-compose.prod.yml down

# Update & redeploy
git pull
./deploy.sh
```

---

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `production-quickstart.sh` | One-command setup for production |
| `deploy.sh` | Full deployment with migration |
| `docker-compose.prod.yml` | Production configuration |
| `docker-compose.yml` | Local development |
| `Dockerfile` | Backend image |
| `Dockerfile.migration` | Migration image |
| `.env.example` | Environment template |
| `DOCKER_DEPLOYMENT.md` | Complete documentation |

---

## ⚡ Quick Test

```bash
# Test backend
curl http://68.183.227.173:8002

# Test bookmark creation
curl -X POST http://68.183.227.173:8002/api/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "url": "https://example.com",
    "tags": ["test"]
  }'
```

---

## 🆘 Troubleshooting

**Backend won't start:**
```bash
docker-compose -f docker-compose.prod.yml logs backend
```

**Database connection error:**
```bash
docker-compose -f docker-compose.prod.yml exec backend env | grep DATABASE
```

**Port already in use:**
```bash
lsof -i :8002
# Kill process or change port in docker-compose.prod.yml
```

---

## 📖 Full Documentation

See `DOCKER_DEPLOYMENT.md` for complete guide with troubleshooting, monitoring, and advanced usage.
