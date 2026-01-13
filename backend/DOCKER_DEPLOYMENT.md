# Docker Deployment Guide

Complete guide for deploying Planning Tool Backend using Docker.

---

## 🚀 Quick Start (Production)

### 1. Prerequisites

- Docker and Docker Compose installed
- Access to production server (68.183.227.173)
- Database credentials

### 2. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

**Example .env:**
```env
DATABASE_URL=postgresql://postgres:your_password@68.183.227.173:5432/planning_tool
PLUGINS_DIR=/app/plugins
LOG_LEVEL=info
```

### 3. Deploy

```bash
# Run deployment script (recommended)
./deploy.sh

# Or manually:
# 1. Run migration
docker-compose -f docker-compose.prod.yml --profile migration run --rm migration

# 2. Start backend
docker-compose -f docker-compose.prod.yml up -d backend
```

---

## 📦 Local Development with Docker

### Start Everything (Backend + PostgreSQL)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

This will start:
- PostgreSQL on port 5432
- Backend API on port 8002

### Access Services

- Backend API: http://localhost:8002
- PostgreSQL: localhost:5432

---

## 🔧 Migration

### Run Migration Only

```bash
# Production
docker-compose -f docker-compose.prod.yml --profile migration run --rm migration

# Local
docker-compose run --rm -e DATABASE_URL="postgresql://postgres:postgres123@postgres:5432/planning_tool" migration
```

### Manual Migration via Docker

```bash
# Build migration image
docker build -f Dockerfile.migration -t planning-tool-migration .

# Run migration
docker run --rm \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  planning-tool-migration
```

---

## 📊 Docker Commands

### View Logs

```bash
# All logs
docker-compose -f docker-compose.prod.yml logs

# Follow logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Container Management

```bash
# Check status
docker-compose -f docker-compose.prod.yml ps

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend

# Stop all
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes
docker-compose -f docker-compose.prod.yml down -v
```

### Shell Access

```bash
# Access backend container
docker-compose -f docker-compose.prod.yml exec backend bash

# Access PostgreSQL (local dev)
docker-compose exec postgres psql -U postgres -d planning_tool
```

### Health Check

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' planning-tool-backend-prod

# Manual health check
curl http://localhost:8002
```

---

## 🔨 Build Commands

### Build Images

```bash
# Build backend
docker-compose -f docker-compose.prod.yml build backend

# Build without cache
docker-compose -f docker-compose.prod.yml build --no-cache backend

# Build migration
docker-compose -f docker-compose.prod.yml build migration
```

### Push to Registry (Optional)

```bash
# Tag image
docker tag planning-tool-backend your-registry.com/planning-tool-backend:latest

# Push to registry
docker push your-registry.com/planning-tool-backend:latest
```

---

## 🐛 Troubleshooting

### Backend Won't Start

1. **Check logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs backend
   ```

2. **Check database connection:**
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend python -c "
   import os
   from sqlalchemy import create_engine
   engine = create_engine(os.getenv('DATABASE_URL'))
   print('✅ Database connected!' if engine.connect() else '❌ Connection failed')
   "
   ```

3. **Check environment variables:**
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend env | grep DATABASE
   ```

### Migration Failed

1. **Check migration logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml --profile migration run migration
   ```

2. **Manual migration via psql:**
   ```bash
   docker run --rm -it postgres:15-alpine psql postgresql://user:pass@host:5432/db
   ```

3. **Rollback (if needed):**
   ```sql
   DROP TABLE bookmarks;
   ALTER TABLE bookmarks_backup_tags RENAME TO bookmarks;
   ```

### Port Already in Use

```bash
# Find process using port 8002
lsof -i :8002

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.prod.yml:
ports:
  - "8003:8002"  # Host:Container
```

### Database Connection Refused

1. **Check if database is accessible:**
   ```bash
   docker run --rm postgres:15-alpine psql postgresql://user:pass@host:5432/db -c "SELECT 1"
   ```

2. **Check firewall rules on database server**

3. **Verify DATABASE_URL format:**
   ```
   postgresql://username:password@host:port/database
   ```

---

## 📁 File Structure

```
backend/
├── Dockerfile                    # Backend Docker image
├── Dockerfile.migration          # Migration Docker image
├── docker-compose.yml           # Local development
├── docker-compose.prod.yml      # Production deployment
├── deploy.sh                    # Automated deployment script
├── .env.example                 # Environment template
├── .env                         # Your environment (git-ignored)
├── migrate_bookmarks_tags.py    # Migration script
├── main.py                      # FastAPI application
└── requirements.txt             # Python dependencies
```

---

## 🔐 Security Best Practices

1. **Never commit .env file** - Add to .gitignore
2. **Use strong database passwords**
3. **Limit database access** - Use firewall rules
4. **Keep images updated** - Rebuild regularly
5. **Use secrets management** - For production, consider Docker Secrets or Vault

---

## 🔄 Update Workflow

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Run deployment:**
   ```bash
   ./deploy.sh
   ```

3. **Verify:**
   ```bash
   curl http://localhost:8002
   docker-compose -f docker-compose.prod.yml logs --tail=50 backend
   ```

---

## 📞 Support

If you encounter issues:

1. Check logs: `docker-compose -f docker-compose.prod.yml logs backend`
2. Check health: `docker inspect planning-tool-backend-prod`
3. Test database: `docker-compose -f docker-compose.prod.yml exec backend python -c "import psycopg2; ..."`
4. Review this guide for troubleshooting steps

---

## 🎯 Production Checklist

Before deploying to production:

- [ ] Database backup created
- [ ] .env file configured with production credentials
- [ ] Firewall rules allow backend container to access database
- [ ] Port 8002 is available (or changed in docker-compose.prod.yml)
- [ ] Migration script tested
- [ ] Rollback plan prepared

---

## 📈 Monitoring

### Container Stats

```bash
# Real-time stats
docker stats planning-tool-backend-prod

# Resource usage
docker-compose -f docker-compose.prod.yml ps
```

### Application Logs

```bash
# Follow logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Save logs to file
docker-compose -f docker-compose.prod.yml logs backend > backend.log
```

### Health Endpoint

```bash
# Check health
curl http://localhost:8002

# Continuous monitoring
watch -n 5 'curl -s http://localhost:8002 && echo "✅ OK" || echo "❌ FAIL"'
```
