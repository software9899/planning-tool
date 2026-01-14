# Planning Tool

> A comprehensive project management and collaboration platform with plugin ecosystem.

[![Backend Tests](https://github.com/yourusername/planning-tool/workflows/Backend%20Tests/badge.svg)](https://github.com/yourusername/planning-tool/actions)
[![Frontend Tests](https://github.com/yourusername/planning-tool/workflows/Frontend%20Tests/badge.svg)](https://github.com/yourusername/planning-tool/actions)
[![Docker Build](https://github.com/yourusername/planning-tool/workflows/Docker%20Build/badge.svg)](https://github.com/yourusername/planning-tool/actions)

## Overview

Planning Tool is a modern, microservices-based platform for project management, team collaboration, and productivity tracking. It features a flexible plugin system, real-time collaboration through Virtual Office, and comprehensive task management.

### Key Features

- ⚡ **Microservices Architecture** - Scalable and maintainable
- 🔌 **Plugin Ecosystem** - Extend functionality with custom plugins
- 🎮 **Virtual Office** - Real-time multiplayer collaboration
- 📊 **Task Management** - Comprehensive project tracking
- 🔐 **Authentication** - Secure user management
- 🐳 **Docker Support** - Easy deployment
- 🧪 **Testing** - Unit and integration tests
- 📝 **TypeScript** - Type-safe frontend development

## Quick Start

### Prerequisites

- Docker & Docker Compose (for Docker setup)
- Node.js 18+ (for native development)
- Python 3.11+ (for native development)

### Local Development (Docker - Recommended)

**Super Quick Start:**

```bash
# Clone and start everything in 3 commands
git clone <your-repo-url>
cd planning-tool
./start-local.sh
```

**Access your applications:**
- 🌐 Frontend: http://localhost:3001
- 📡 Backend API: http://localhost:8002
- 📚 API Docs: http://localhost:8002/docs
- 🎮 Virtual Office: http://localhost:3000

**Default admin login:**
- Email: `admin@planningtool.com`
- Password: `admin123`

**Stop services:**
```bash
./stop-local.sh           # Stop (keep data)
./stop-local.sh --clean   # Stop and delete data
```

**See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for detailed local setup guide.**

### Native Development (Without Docker)

For running services directly on your machine:

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8002

# Frontend
cd frontend && npm install
npm run dev

# Virtual Office
cd services/virtual-office && npm install
npm run dev
```

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for complete native setup.

## Project Structure

```
PT/
├── backend/              # FastAPI backend service
│   ├── app/              # Application code (modular structure)
│   ├── tests/            # Backend tests
│   └── requirements.txt  # Python dependencies
├── frontend/             # React frontend application
│   ├── src/              # Source code
│   ├── tests/            # Frontend tests
│   └── package.json      # Node dependencies
├── services/             # Additional microservices
│   └── virtual-office/   # Real-time collaboration service
├── plugins/              # Plugin ecosystem
│   ├── HR/               # HR management plugin
│   ├── KPI/              # KPI tracking plugin
│   └── ...               # More plugins
├── plugin-sdk/           # Plugin development SDK
│   ├── template/         # Plugin template
│   ├── docs/             # SDK documentation
│   └── validate-plugin.js # Plugin validator
├── chrome-extensions/    # Browser extensions
├── scripts/              # Utility scripts
├── configs/              # Configuration files
├── screenshots/          # Project screenshots
├── docs/                 # Documentation
└── .github/              # CI/CD workflows
```

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed documentation.

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Virtual Office Development

```bash
cd services/virtual-office
npm install
npm run dev
```

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

### Validate Plugins

```bash
node plugin-sdk/validate-plugin.js plugins/plugin-name
```

## Creating a Plugin

1. **Copy the template**
   ```bash
   cp -r plugin-sdk/template plugins/my-plugin
   ```

2. **Update plugin.json**
   ```json
   {
     "id": "my-plugin",
     "name": "My Plugin",
     "version": "1.0.0",
     "description": "Description of my plugin",
     "main": "index.html"
   }
   ```

3. **Develop your plugin**
   - Edit `index.html`, `style.css`, `script.js`
   - Use PluginSDK for API calls

4. **Validate your plugin**
   ```bash
   node plugin-sdk/validate-plugin.js plugins/my-plugin
   ```

See [Plugin SDK Guide](plugin-sdk/docs/PLUGIN_SDK_GUIDE.md) for detailed instructions.

## API Documentation

### Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookmarks` | Get all bookmarks |
| POST | `/api/bookmarks` | Create bookmark |
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/plugins` | Get all plugins |

See [API Contract](plugin-sdk/docs/API_CONTRACT.md) for complete API documentation.

## Deployment

### Local Development

```bash
# Start all services with Docker Compose
docker compose up -d

# Access applications
# - Frontend: http://localhost:3001
# - Backend API: http://localhost:8002
# - Virtual Office: http://localhost:3000
```

### Production Deployment

**One-command deployment to Digital Ocean:**

```bash
# Clone repository on your server
git clone <your-repo-url>
cd planning-tool

# Run deployment script (handles everything automatically)
./deploy.sh
```

The deployment script will:
- ✅ Check prerequisites (Docker, DNS, disk space)
- ✅ Generate secure configuration (.env)
- ✅ Obtain SSL certificates (Let's Encrypt)
- ✅ Build and start all 8 Docker services
- ✅ Initialize databases with migrations
- ✅ Verify deployment health

**Production Architecture:**
- Single Docker Compose file for all services
- Nginx reverse proxy with automatic SSL
- PostgreSQL + MongoDB databases
- Automated backups and health monitoring
- CI/CD with GitHub Actions

**See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete production deployment guide.**

### CI/CD (GitHub Actions)

Automatic deployment on `git push`:

1. Configure GitHub Secrets (DO_SSH_KEY, DO_HOST, DOMAIN)
2. Push to main branch: `git push origin main`
3. GitHub Actions automatically deploys to production

See [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

## Configuration

### Environment Variables

Key environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `CORS_ORIGINS` - Allowed CORS origins

See [.env.example](.env.example) for all available variables.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Follow existing code style
- Write tests for new features
- Update documentation
- Run linters before committing

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client Layer                       │
├─────────────┬──────────────┬────────────────────────┤
│  Frontend   │ Virtual Office│  Chrome Extensions    │
│  (Port 80)  │  (Port 3000) │                        │
└──────┬──────┴──────┬───────┴────────────────────────┘
       │             │
       └─────────────┴─────────────┐
                                   │
                     ┌─────────────▼──────────────┐
                     │     Backend API            │
                     │     (Port 8002)            │
                     └──────┬────────────┬────────┘
                            │            │
                   ┌────────▼─────┐   ┌─▼────────┐
                   │  PostgreSQL  │   │ MongoDB  │
                   │  (Port 5432) │   │ (27017)  │
                   └──────────────┘   └──────────┘
```

## Tech Stack

### Backend
- FastAPI
- PostgreSQL
- SQLAlchemy
- Pydantic
- JWT Authentication

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS

### Virtual Office
- Express.js
- Socket.io
- MongoDB
- HTML5 Canvas

### DevOps
- Docker & Docker Compose
- GitHub Actions
- Nginx

## Troubleshooting

### Common Issues

**Backend won't start**
```bash
# Check database connection
docker-compose logs db

# Restart backend
docker-compose restart backend
```

**Frontend build errors**
```bash
# Clear node_modules
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Plugin not loading**
```bash
# Validate plugin
node plugin-sdk/validate-plugin.js plugins/your-plugin
```

See [docs/](docs/) for more troubleshooting guides.

## Documentation

### Getting Started

- [💻 Local Development](docs/LOCAL_DEVELOPMENT.md) - Run locally with Docker or native
- [🚀 Production Deployment](docs/DEPLOYMENT.md) - Deploy to Digital Ocean

### Development Guides

- [📁 Project Structure](PROJECT_STRUCTURE.md) - Detailed project structure
- [🔌 Plugin SDK Guide](plugin-sdk/docs/PLUGIN_SDK_GUIDE.md) - Plugin development
- [📡 API Contract](plugin-sdk/docs/API_CONTRACT.md) - API specifications

### Operations

- [🗄️ Database Migrations](backend/alembic/README) - Alembic migration guide
- [💾 Backup & Restore](scripts/) - Backup and restore scripts
- [❤️ Health Monitoring](scripts/health-check.sh) - Automated health checks

## License

[Your License Here]

## Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation in `docs/`
- Review [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

## Changelog

### Version 2.0.0 (2025-01-03)
- ✨ Restructured project with modular architecture
- 🔌 Added Plugin SDK with validation
- 📦 Renamed frontend directory (planning-tool-react → frontend)
- 🗂️ Organized root files into folders
- 🧪 Added comprehensive testing structure
- 🚀 Setup CI/CD pipelines (GitHub Actions)
- 📝 Added comprehensive documentation
- 🔐 Environment management (.env files)
- 🏗️ Separated services from plugins

### Version 1.0.0
- Initial release

---

Made with ❤️ by the Planning Tool Team
