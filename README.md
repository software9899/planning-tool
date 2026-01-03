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

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd PT
   ```

2. **Configure environment**
   ```bash
   cp .env.development .env
   # Edit .env with your configuration
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Access applications**
   - Frontend: http://localhost
   - Backend API: http://localhost:8002
   - Virtual Office: http://localhost:3000
   - API Docs: http://localhost:8002/docs

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

### Development

```bash
docker-compose up -d
```

### Production

1. **Update environment variables**
   ```bash
   cp .env.production .env
   # Edit .env and update all secrets!
   ```

2. **Build and deploy**
   ```bash
   docker-compose up -d --build
   ```

3. **Setup SSL** (recommended)
   ```bash
   bash scripts/setup-https.sh
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

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

- [Project Structure](PROJECT_STRUCTURE.md) - Detailed project structure
- [Plugin SDK Guide](plugin-sdk/docs/PLUGIN_SDK_GUIDE.md) - Plugin development
- [API Contract](plugin-sdk/docs/API_CONTRACT.md) - API specifications
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [Docker Guide](docs/DOCKER_GUIDE.md) - Docker setup

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
