# API Integration Guide

## 📋 Overview

The Planning Tool now supports **PostgreSQL database** with automatic fallback to localStorage!

### Features

✅ **Smart Fallback System**
- Automatically detects if API is available
- Falls back to localStorage if API is down
- No code changes needed in your app

✅ **Migration Tool**
- Easy-to-use web interface
- Migrate all localStorage data to PostgreSQL
- Automatic backup before migration

✅ **RESTful API**
- Full CRUD operations for tasks
- FastAPI backend with automatic docs
- PostgreSQL database with proper schema

## 🚀 Quick Start

### 1. Start the Services

**Development Mode** (Python server + Docker backend):
```bash
./start-dev.sh
```
Access: http://localhost:3000

**Production Mode** (Full Docker):
```bash
./start-prod.sh
```
Access: http://localhost:3001

### 2. Check Status

```bash
./check-status.sh
```

This will show you:
- Python HTTP Server status (port 3000)
- Docker containers status
- All port usage
- Access URLs

### 3. Migrate Your Data

1. Open the migration tool:
   - Dev: http://localhost:3000/migrate-to-api.html
   - Prod: http://localhost:3001/migrate-to-api.html

2. Click "Check Status" to verify API connection

3. Click "Start Migration" to transfer your tasks

4. Done! Your localStorage data is now in PostgreSQL

## 📁 New Files

### 1. `assets/js/api-service.js`

Main API service layer with three components:

#### `ApiService` - Direct API calls
```javascript
// Health check
const isHealthy = await ApiService.checkHealth();

// Get tasks
const tasks = await ApiService.getTasks();
const todoTasks = await ApiService.getTasks('todo');

// Create task
const newTask = await ApiService.createTask({
    title: 'My Task',
    description: 'Description',
    status: 'todo',
    priority: 'high'
});

// Update task
const updated = await ApiService.updateTask(taskId, {
    title: 'Updated Title',
    status: 'in-progress'
});

// Delete task
await ApiService.deleteTask(taskId);

// Migrate data
const result = await ApiService.migrateLocalStorageToAPI();
console.log(`Migrated ${result.migrated} tasks`);
```

#### `DataManager` - Smart layer with automatic fallback
```javascript
// Initialize (checks API availability)
await DataManager.init();

// All operations automatically use API or localStorage
const tasks = await DataManager.getTasks();
const task = await DataManager.saveTask(taskData);
await DataManager.deleteTask(taskId);

// Check which mode is active
if (DataManager.useAPI) {
    console.log('Using PostgreSQL');
} else {
    console.log('Using localStorage');
}
```

### 2. `migrate-to-api.html`

Web-based migration tool with features:
- API health check
- Shows localStorage vs database task counts
- Progress bar during migration
- Detailed logs
- Automatic backup of localStorage

### 3. Updated Files

- **`index.html`** - Added `api-service.js` script
- **`sidebar.html`** - Added "Migrate to API" menu item
- **`POSTGRESQL_SETUP.md`** - Updated with migration instructions
- **`API_INTEGRATION.md`** - This file

## 🔧 How It Works

### Automatic Fallback

```javascript
// DataManager checks API health on initialization
await DataManager.init();

// Then every operation uses the best available option:

// If API is available:
GET http://localhost:8002/api/tasks → PostgreSQL

// If API is not available:
localStorage.getItem('tasks') → Browser storage
```

### API Configuration

The API URL is automatically detected:

```javascript
// Development mode (port 3000)
API: http://localhost:8002/api

// Production mode (port 3001)
API: /api (proxied through Nginx to backend:8002)
```

## 📊 Database Schema

Tasks are stored with this structure:

```javascript
{
    id: 1,                                    // Auto-increment
    title: "Task Title",                      // Required
    description: "Task description",          // Optional
    status: "todo",                           // todo, in-progress, done
    priority: "high",                         // high, medium, low
    assigned_to: null,                        // User ID
    team_id: null,                            // Team ID
    due_date: "2025-12-31",                   // ISO date
    tags: ["feature", "urgent"],              // Array
    estimate_hours: 5.0,                      // Decimal
    created_at: "2025-11-16T03:00:00",       // Auto
    updated_at: "2025-11-16T03:00:00"        // Auto
}
```

## 🧪 Testing

### Test API Directly

```bash
# Health check
curl http://localhost:8002/health

# Get all tasks
curl http://localhost:8002/api/tasks

# Create a task
curl -X POST http://localhost:8002/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "description": "Testing API",
    "status": "todo",
    "priority": "high"
  }'

# Update a task
curl -X PUT http://localhost:8002/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# Delete a task
curl -X DELETE http://localhost:8002/api/tasks/1
```

### Test in Browser Console

```javascript
// Check if API is available
await DataManager.init();
console.log('Using API:', DataManager.useAPI);

// Create a task
const task = await DataManager.saveTask({
    title: 'Browser Test',
    status: 'todo',
    priority: 'medium'
});
console.log('Created:', task);

// Get all tasks
const tasks = await DataManager.getTasks();
console.log('All tasks:', tasks);
```

## 🔍 Debugging

### Check API Status

```bash
# Check if backend is running
docker-compose ps backend

# View backend logs
docker-compose logs -f backend

# Check database
docker exec -it planning-tool-db psql -U planningtool -d planning_tool_db -c "SELECT COUNT(*) FROM tasks;"
```

### Browser Console

Open DevTools and check:

```javascript
// Should log "✅ API is available" or "⚠️ API is not available"
await DataManager.init();

// Check localStorage
console.log('localStorage tasks:', JSON.parse(localStorage.getItem('tasks') || '[]').length);

// Check API
const apiTasks = await ApiService.getTasks();
console.log('API tasks:', apiTasks.length);
```

## 🎯 Next Steps for Full Integration

Currently, the API service is loaded but `app.js` still uses localStorage directly. To fully integrate:

### Option 1: Gradual Migration (Recommended)

Keep both systems running:
1. New features use `DataManager`
2. Old code continues using localStorage
3. Migrate functions one by one

### Option 2: Full Replacement

Replace all localStorage calls in `app.js`:

```javascript
// Before:
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// After:
let tasks = await DataManager.getTasks();

// Before:
localStorage.setItem('tasks', JSON.stringify(tasks));

// After:
await Promise.all(tasks.map(task => DataManager.saveTask(task)));
```

### Option 3: Keep Fallback Forever

Don't change `app.js` at all. Just use the migration tool to move data, then:
- API mode: Data stays in PostgreSQL
- localStorage mode: Data stays in browser
- Users can switch between modes easily

## 📚 API Documentation

Full interactive API documentation available at:
- Dev: http://localhost:8002/docs
- Prod: http://localhost:3001/api/docs

## 🔒 Security Notes

⚠️ **Current Setup is for Development Only**

For production, you need to:
1. Change database password in `docker-compose.yml`
2. Add authentication to API endpoints
3. Add CORS restrictions
4. Use HTTPS
5. Add rate limiting
6. Validate all inputs
7. Add proper error handling

## ✅ What's Ready

- ✅ PostgreSQL database with schema
- ✅ FastAPI backend with CRUD operations
- ✅ API service layer with fallback
- ✅ Migration tool
- ✅ Documentation
- ✅ Dual-mode setup (dev/prod)
- ✅ Health checks
- ✅ Docker configuration

## ⏳ What's Pending

- ⏳ Update app.js to use DataManager
- ⏳ Add authentication
- ⏳ Add file upload support
- ⏳ Add WebSocket for real-time updates
- ⏳ Add user management integration
- ⏳ Add team management integration

---

**Ready to use!** The API infrastructure is complete. You can start using the migration tool immediately, or keep using localStorage - it's your choice!
