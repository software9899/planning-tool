# PostgreSQL Setup Guide - Planning Tool

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Port 3000, 5432, 8002 available

### Start Everything

```bash
# Start all services (Database + Backend + Frontend)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8002
- **API Docs**: http://localhost:8002/docs
- **PostgreSQL**: localhost:5432

## 📊 Database Connection

**Connection Details:**
- Host: localhost
- Port: 5432
- Database: planning_tool_db
- Username: planningtool
- Password: planningtool123

**Connection String:**
```
postgresql://planningtool:planningtool123@localhost:5432/planning_tool_db
```

## 🔧 Development

### Backend Development (without Docker)

1. Install Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Start PostgreSQL only:
```bash
docker-compose up -d db
```

3. Run backend locally:
```bash
cd backend
python main.py
```

### Database Management

**Connect to PostgreSQL:**
```bash
docker exec -it planning-tool-db psql -U planningtool -d planning_tool_db
```

**View tables:**
```sql
\dt
```

**View tasks:**
```sql
SELECT * FROM tasks;
```

**Reset database:**
```bash
docker-compose down -v  # This will delete all data!
docker-compose up -d
```

## 📝 API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/{id}` - Get specific task
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Users
- `GET /api/users` - Get all users
- `GET /api/users/{id}` - Get specific user

### Example API Call

```bash
# Get all tasks
curl http://localhost:8002/api/tasks

# Create a new task
curl -X POST http://localhost:8002/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Task",
    "description": "Task description",
    "status": "todo",
    "priority": "high"
  }'
```

## 🗄️ Database Schema

### Tables
- **users** - User accounts and profiles
- **teams** - Team organization
- **tasks** - Main tasks table
- **comments** - Task comments
- **attachments** - File attachments
- **activity_log** - Audit trail

### Default Data
- Admin user: admin@planningtool.com (password: admin123)
- Sample users: john@example.com, jane@example.com
- Sample teams: Development, Design

## 🛠️ Troubleshooting

### Port already in use
```bash
# Stop conflicting services
lsof -ti:3000 | xargs kill -9
lsof -ti:5432 | xargs kill -9
lsof -ti:8002 | xargs kill -9
```

### Database connection failed
```bash
# Check if database is healthy
docker-compose logs db

# Restart database
docker-compose restart db
```

### Frontend can't connect to backend
```bash
# Check backend logs
docker-compose logs backend

# Check if backend is running
curl http://localhost:8002/health
```

## 📦 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Rebuild after code changes
docker-compose up -d --build

# Remove everything including volumes
docker-compose down -v

# Check running containers
docker-compose ps
```

## 🔄 Migration from localStorage

The application now supports **automatic fallback** between PostgreSQL API and localStorage!

### How It Works

- **API Available**: Uses PostgreSQL database
- **API Not Available**: Falls back to localStorage automatically
- **Smart Detection**: Checks health on every page load

### Migration Tool

To migrate existing localStorage data to PostgreSQL:

1. Make sure backend is running: `./start-dev.sh` or `./start-prod.sh`
2. Open http://localhost:3000/migrate-to-api.html (dev) or http://localhost:3001/migrate-to-api.html (prod)
3. Click "Check Status" to verify API connection
4. Click "Start Migration" to transfer all tasks
5. Your localStorage data will be backed up automatically

**Note:** Migration adds tasks to the database. It won't delete existing tasks.

### Using the API Service

The frontend includes `api-service.js` which provides:

```javascript
// Initialize (auto-detects API availability)
await DataManager.init();

// Get all tasks (uses API if available, localStorage otherwise)
const tasks = await DataManager.getTasks();

// Save a task (create or update)
const task = await DataManager.saveTask({
    title: 'My Task',
    description: 'Task description',
    status: 'todo',
    priority: 'high'
});

// Delete a task
await DataManager.deleteTask(taskId);

// Manual migration
await DataManager.migrate();
```

## 🎯 Next Steps

1. ✅ Backend API is ready
2. ✅ API Service layer with automatic fallback
3. ✅ Migration tool created
4. ⏳ Update app.js to use DataManager
5. ⏳ Add authentication
6. ⏳ Add file upload for attachments
7. ⏳ Add real-time updates with WebSockets

---

**Note:** This is a development setup. For production, change passwords and add proper security measures.
