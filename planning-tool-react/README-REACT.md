# 📋 Planning Tool - React Version

Modern SPA (Single Page Application) built with React + TypeScript + Vite, similar to Jira and ClickUp.

## 🚀 Quick Start

### Development Mode
```bash
npm install
npm run dev
```
Access: http://localhost:5173

### Production Mode (Docker)
```bash
docker-compose up -d --build
```
Access: http://localhost:3001

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL 15
- **Container**: Docker + Nginx

### Project Structure
```
planning-tool-react/
├── src/
│   ├── components/       # React components (Sidebar, etc.)
│   ├── pages/           # Page components (TasksBoard, Dashboard, etc.)
│   ├── layouts/         # Layout components (MainLayout)
│   ├── services/        # API service layer
│   ├── types/           # TypeScript type definitions
│   ├── hooks/           # Custom React hooks
│   ├── App.tsx          # Main app with routing
│   └── main.tsx         # Entry point
├── public/
│   └── assets/          # CSS, images from original project
├── Dockerfile           # Production build
├── docker-compose.yml   # Full stack deployment
├── vite.config.ts       # Vite configuration
└── nginx.conf           # Production Nginx config
```

## ✨ Features

### Implemented
- ✅ **React SPA Architecture** - Single page with client-side routing
- ✅ **TypeScript** - Full type safety
- ✅ **Tasks Board** - Kanban view with task cards
- ✅ **Task Detail** - Full-page task details
- ✅ **Sidebar Navigation** - Persistent navigation
- ✅ **API Integration** - Connects to FastAPI backend
- ✅ **PostgreSQL Support** - Full database integration
- ✅ **localStorage Fallback** - Works without backend
- ✅ **Clean URLs** - No .html extensions (/, /dashboard, etc.)
- ✅ **Docker Production** - Full containerized deployment

### To Be Implemented
- ⏳ Backlog page with full functionality
- ⏳ Dashboard pages with charts
- ⏳ Timeline view for tasks
- ⏳ Drag and drop for Kanban
- ⏳ Theme switcher
- ⏳ User management
- ⏳ AI agent integration
- ⏳ Real-time updates (WebSocket)

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### API Configuration

The app automatically detects the environment:
- **Development (Vite)**: Proxies `/api` to `http://localhost:8002`
- **Production (Docker)**: Proxies `/api` through Nginx to backend container

### Adding New Pages

1. Create page component in `src/pages/`:
```tsx
export default function MyPage() {
  return <div>My Page</div>;
}
```

2. Add route in `src/App.tsx`:
```tsx
<Route path="my-page" element={<MyPage />} />
```

3. Add link in `src/components/Sidebar.tsx`:
```tsx
<Link to="/my-page" className="menu-item">
  <span>My Page</span>
</Link>
```

## 🐳 Docker Deployment

### Services
- **postgres** - PostgreSQL database (port 5432)
- **backend** - FastAPI backend (port 8002)
- **frontend** - React + Nginx (port 3001)

### Commands
```bash
# Start all services
docker-compose up -d --build

# View logs
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build --force-recreate
```

## 🌐 URLs

### Development
- Frontend: http://localhost:5173
- Backend: http://localhost:8002
- Database: localhost:5432

### Production (Docker)
- Frontend: http://localhost:3001
- Backend: http://localhost:8002 (internal)
- Database: localhost:5432

## 📊 Comparison: Multi-HTML vs React SPA

| Feature | Multi-HTML (Old) | React SPA (New) |
|---------|------------------|-----------------|
| Architecture | 15 HTML files | 1 HTML + Components |
| Routing | Browser navigation | Client-side routing |
| URLs | /dashboard.html | /dashboard |
| State | localStorage | React state + API |
| Code Reuse | Copy/paste | Components |
| Build | None | Vite bundler |
| Industry Standard | ❌ | ✅ (Like Jira/ClickUp) |

## 🔍 Key Differences from Original

### Routing
```javascript
// Old: Multi-HTML
window.location.href = 'dashboard.html';

// New: React Router
navigate('/dashboard');
```

### Components
```javascript
// Old: Copy sidebar HTML to each page
<div id="sidebar-container"></div>
<script src="load-sidebar.js"></script>

// New: Reusable component
<Sidebar />
```

### API Calls
```javascript
// Old: Global window object
window.DataManager.getTasks();

// New: ES6 modules
import { DataManager } from './services/api';
await DataManager.getTasks();
```

## 🚦 Migration Notes

### Original Project Location
The original multi-HTML project is in: `/Users/testtorial/Documents/MCP/planning-tool/`

### This React Version
Located in: `/Users/testtorial/Documents/MCP/planning-tool/planning-tool-react/`

### Shared Resources
- Backend API (`../backend/`)
- Database schema (`../backend/init.sql`)
- CSS files (`public/assets/css/`)

## 📝 Next Steps

1. ✅ Basic React SPA setup complete
2. ⏳ Implement full Kanban drag-and-drop
3. ⏳ Migrate all dashboard pages
4. ⏳ Add real-time updates
5. ⏳ Implement theme system
6. ⏳ Add unit tests
7. ⏳ Add E2E tests

## 🤝 Contributing

This is a migration from traditional multi-HTML to modern React SPA architecture.

---

**Version**: 1.0.0 (React Migration)
**Built With**: React + TypeScript + Vite
**Last Updated**: 2025-11-16
