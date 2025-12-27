# Planning Tool - Deployment Guide

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- Docker installed
- Docker Compose installed

### Quick Start

1. **Clone and navigate to project:**
```bash
cd planning-tool
```

2. **Start all services:**
```bash
./start-all.sh
```

3. **Access the application:**
- Frontend: http://localhost
- Backend API: http://localhost:8002
- API Docs: http://localhost:8002/docs

### Manual Docker Commands

**Build and start:**
```bash
docker-compose up --build -d
```

**View logs:**
```bash
docker-compose logs -f
```

**Stop services:**
```bash
docker-compose down
```

**Stop and remove volumes:**
```bash
docker-compose down -v
```

## 🌊 DigitalOcean App Platform Deployment

### Option 1: Using Docker (Recommended)

1. **Push to GitHub:**
```bash
git add .
git commit -m "Add Docker configuration"
git push
```

2. **Create App in DigitalOcean:**
- Go to DigitalOcean → Apps
- Create App → From GitHub Repository
- Select repository and branch

3. **Configure Components:**

**Frontend Component:**
- Type: Web Service
- Source: `planning-tool-react/`
- Dockerfile: `planning-tool-react/Dockerfile`
- HTTP Port: 80

**Backend Component:**
- Type: Web Service  
- Source: `backend/`
- Dockerfile: `backend/Dockerfile`
- HTTP Port: 8002

**Database:**
- Add PostgreSQL Database
- Set DATABASE_URL in backend environment variables

### Option 2: Using Buildpacks

**Frontend:**
- Build Command: `npm ci && npm run build`
- Output Directory: `dist`
- HTTP Port: 5173

**Backend:**
- Build Command: `pip install -r requirements.txt`
- Run Command: `uvicorn main:app --host 0.0.0.0 --port 8002`
- HTTP Port: 8002

## 🔧 Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

## 📦 Project Structure

```
planning-tool/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
├── planning-tool-react/
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── docker-compose.yml
├── start-all.sh
└── .env.example
```

## 🐛 Troubleshooting

### Port already in use:
```bash
# Stop all containers
docker-compose down

# Or kill specific port
lsof -ti:8002 | xargs kill -9
```

### Database connection issues:
```bash
# Reset database
docker-compose down -v
docker-compose up -d
```

### View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```
