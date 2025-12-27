# 🚀 Planning Tool - Start Options

Planning Tool รองรับ 2 วิธีการ start:

## 📌 Option 1: Development Mode (Python Simple Server)
**เหมาะสำหรับ:** Development, Quick Testing, Simple Usage

### Start:
```bash
./start-dev.sh
```

### Services:
- **Frontend**: http://localhost:3000 (Python HTTP Server)
- **Backend API**: http://localhost:8002 (Docker - FastAPI)
- **PostgreSQL**: localhost:5432 (Docker)
- **Ollama AI**: localhost:11434 (Native)

### Ports:
- 3000 - Frontend (Python)
- 8002 - Backend API (Docker)
- 5432 - PostgreSQL (Docker)
- 11434 - Ollama AI

### Stop:
```bash
./stop-dev.sh
```

---

## 📌 Option 2: Production Mode (Full Docker)
**เหมาะสำหรับ:** Production, Complete Isolation, Deployment

### Start:
```bash
./start-prod.sh
```

### Services:
- **Frontend**: http://localhost:3001 (Docker - Nginx)
- **Backend API**: http://localhost:8002 (Docker - FastAPI)
- **PostgreSQL**: localhost:5432 (Docker)
- **Ollama AI**: localhost:11434 (Native)

### Ports:
- 3001 - Frontend (Nginx)
- 8002 - Backend API (Docker)
- 5432 - PostgreSQL (Docker)
- 11434 - Ollama AI

### Stop:
```bash
./stop-prod.sh
```

---

## 🔄 Switch Between Modes

### From Dev → Prod:
```bash
./stop-dev.sh
./start-prod.sh
```

### From Prod → Dev:
```bash
./stop-prod.sh
./start-dev.sh
```

---

## 📊 Check Status

```bash
./check-status.sh
```

---

## 🆚 Comparison

| Feature | Dev Mode | Prod Mode |
|---------|----------|-----------|
| Frontend Port | 3000 | 3001 |
| Backend Port | 8002 | 8002 |
| Database Port | 5432 | 5432 |
| Frontend Tech | Python HTTP | Nginx |
| Startup Speed | ⚡ Fast | 🐢 Slower |
| Resource Usage | 💚 Low | 💛 Medium |
| Isolation | 🔓 Partial | 🔒 Full |
| Hot Reload | ✅ Yes | ❌ No |
| Best For | Development | Production |

---

## 💡 Tips

1. **Never run both modes at the same time** - Ports will conflict
2. **Dev mode is faster** for development and testing
3. **Prod mode is better** for deployment and demos
4. **Database is shared** between both modes (same Docker container)
5. **Ollama AI is shared** between both modes (native installation)

---

## 🔧 Troubleshooting

### Port already in use:
```bash
# Check what's using ports
lsof -i :3000
lsof -i :3001
lsof -i :8002

# Kill specific port
kill -9 $(lsof -ti:3000)
```

### Clean everything:
```bash
./stop-dev.sh
./stop-prod.sh
docker-compose down -v  # ⚠️ This deletes database data!
```
