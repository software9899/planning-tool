# Local Development Guide

Quick guide for running Planning Tool + Virtual Office locally on your machine.

## Table of Contents
- [Quick Start](#quick-start)
- [Option 1: Docker (Recommended)](#option-1-docker-recommended)
- [Option 2: Native Development](#option-2-native-development)
- [Database Access](#database-access)
- [Hot Reload](#hot-reload)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

**Fastest way to get started:**

```bash
# 1. Clone repository
git clone <your-repo-url>
cd planning-tool

# 2. Copy environment file
cp .env.development .env

# 3. Start all services with Docker
docker compose -f docker-compose.dev.yml up -d

# 4. Access applications
# - Frontend: http://localhost:3001
# - Backend API: http://localhost:8002
# - Backend Docs: http://localhost:8002/docs
# - Virtual Office: http://localhost:3000
```

That's it! 🎉

---

## Option 1: Docker (Recommended)

### Prerequisites

- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- Git
- 8GB RAM minimum
- 20GB free disk space

### Start All Services

```bash
# Start everything
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop everything
docker compose -f docker-compose.dev.yml down
```

### Services Running

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3001 | http://localhost:3001 |
| Backend API | 8002 | http://localhost:8002 |
| API Docs | 8002 | http://localhost:8002/docs |
| Virtual Office | 3000 | http://localhost:3000 |
| PostgreSQL | 5432 | localhost:5432 |
| MongoDB | 27017 | localhost:27017 |

### Default Credentials

**Admin User:**
- Email: `admin@planningtool.com`
- Password: `admin123`

**Database:**
- PostgreSQL: `postgres` / `postgres123`
- MongoDB: No authentication

### Useful Commands

```bash
# Restart a specific service
docker compose -f docker-compose.dev.yml restart backend

# View service logs
docker compose -f docker-compose.dev.yml logs -f backend

# Rebuild after code changes
docker compose -f docker-compose.dev.yml up -d --build

# Reset database (CAUTION: deletes all data)
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d

# Execute command in container
docker exec -it planning-tool-backend-dev bash
```

---

## Option 2: Native Development

Run services directly on your machine (without Docker).

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15
- MongoDB 6
- npm or yarn

### 1. Setup PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt install postgresql-15
sudo systemctl start postgresql

# Create database
psql -U postgres
CREATE DATABASE planning_tool;
\q
```

Run initialization script:

```bash
psql -U postgres -d planning_tool -f backend/init-db.sql
```

### 2. Setup MongoDB

```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0

# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
```

### 3. Setup Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp ../.env.development .env

# Run migrations (if using Alembic)
alembic upgrade head

# Start backend server
uvicorn main:app --reload --port 8002
```

Backend will run at: http://localhost:8002

### 4. Setup Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run at: http://localhost:3001

### 5. Setup Virtual Office (Node.js)

```bash
cd services/virtual-office

# Install dependencies
npm install

# Copy environment file
cp ../../.env.development .env

# Start server
npm run dev
```

Virtual Office will run at: http://localhost:3000

---

## Database Access

### PostgreSQL

**Using psql:**

```bash
# Docker
docker exec -it planning-tool-db-dev psql -U postgres -d planning_tool

# Native
psql -U postgres -d planning_tool
```

**Using GUI:**
- [pgAdmin](https://www.pgadmin.org/)
- [DBeaver](https://dbeaver.io/)
- [TablePlus](https://tableplus.com/)

Connection details:
- Host: `localhost`
- Port: `5432`
- Database: `planning_tool`
- Username: `postgres`
- Password: `postgres123`

### MongoDB

**Using mongosh:**

```bash
# Docker
docker exec -it virtual-office-db-dev mongosh virtual_office

# Native
mongosh virtual_office
```

**Using GUI:**
- [MongoDB Compass](https://www.mongodb.com/products/compass)
- [Studio 3T](https://studio3t.com/)

Connection string: `mongodb://localhost:27017/virtual-office`

---

## Hot Reload

### Backend (Python)

Docker setup already includes `--reload` flag. Code changes will auto-reload.

**Native development:**
```bash
uvicorn main:app --reload --port 8002
```

### Frontend (React)

Vite automatically hot-reloads on file changes.

**If hot reload not working:**
```bash
# Clear cache and restart
cd frontend
rm -rf node_modules/.vite
npm run dev
```

### Virtual Office (Node.js)

Uses `nodemon` for auto-reload.

**Native development:**
```bash
npm run dev  # Uses nodemon
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8002  # Replace with your port

# Kill process
kill -9 <PID>

# Or use different port
uvicorn main:app --port 8003
```

### Database Connection Errors

**PostgreSQL:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres
# or
brew services list | grep postgresql

# Check connection
psql -U postgres -d planning_tool -c "SELECT 1"
```

**MongoDB:**
```bash
# Check if MongoDB is running
docker ps | grep mongo
# or
brew services list | grep mongodb

# Check connection
mongosh --eval "db.adminCommand('ping')"
```

### Frontend Build Errors

```bash
cd frontend

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

### Backend Import Errors

```bash
cd backend

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check Python version (must be 3.11+)
python --version
```

### Docker Issues

```bash
# Restart Docker Desktop
# (via GUI or: killall Docker)

# Reset Docker Compose
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d

# Clean Docker system
docker system prune -a
```

### Virtual Office WebSocket Issues

1. Check MongoDB is running
2. Check backend is running on port 8002
3. Clear browser cache
4. Check browser console for errors

---

## Development Workflow

### Daily Workflow

```bash
# Morning - Start services
docker compose -f docker-compose.dev.yml up -d

# Work on code (auto-reloads)
# ...

# Evening - Stop services
docker compose -f docker-compose.dev.yml down
```

### Working on Backend

```bash
# Make code changes in backend/

# View logs
docker compose -f docker-compose.dev.yml logs -f backend

# Test API
curl http://localhost:8002/health
```

### Working on Frontend

```bash
# Make code changes in frontend/

# View logs
docker compose -f docker-compose.dev.yml logs -f frontend

# Test in browser
open http://localhost:3001
```

### Database Migrations

**Create new migration:**
```bash
docker exec -it planning-tool-backend-dev alembic revision -m "add new column"
```

**Apply migrations:**
```bash
docker exec -it planning-tool-backend-dev alembic upgrade head
```

**Rollback migration:**
```bash
docker exec -it planning-tool-backend-dev alembic downgrade -1
```

---

## Testing

### Run Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Run Frontend Tests

```bash
cd frontend
npm run test
```

---

## Environment Variables

Edit `.env` file in project root:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/planning_tool
MONGODB_URI=mongodb://localhost:27017/virtual-office

# Backend
JWT_SECRET=dev-secret-key
PLUGINS_DIR=/app/plugins

# Virtual Office
BACKEND_URL=http://localhost:8002
NODE_ENV=development
```

**Important:** Never commit real secrets to `.env` file!

---

## Next Steps

- Read [Plugin Development Guide](../plugin-sdk/docs/PLUGIN_SDK_GUIDE.md)
- Explore [API Documentation](http://localhost:8002/docs)
- Check [Project Structure](../PROJECT_STRUCTURE.md)
- Review [Contributing Guidelines](../CONTRIBUTING.md)

---

## Getting Help

- Check [Troubleshooting](#troubleshooting) section above
- Review Docker logs: `docker compose -f docker-compose.dev.yml logs`
- Search [GitHub Issues](https://github.com/YOUR_USERNAME/planning-tool/issues)
- Ask in team chat/Slack

Happy coding! 🚀
