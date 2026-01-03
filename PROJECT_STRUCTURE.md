# Planning Tool - Project Structure

## Overview

Planning Tool is a microservices-based application for project management, team collaboration, and productivity tracking.

## Directory Structure

```
PT/
├── backend/                    # Backend API service (FastAPI + PostgreSQL)
├── planning-tool-react/        # Frontend web application (React + Vite)
├── services/                   # Additional microservices
│   └── virtual-office/         # Virtual Office multiplayer game
├── plugins/                    # Plugin ecosystem
│   ├── HR/                     # HR management plugin
│   ├── KPI/                    # KPI tracking plugin
│   ├── ai-assistant/           # AI assistant plugin
│   ├── browser-tabs/           # Browser tabs plugin
│   ├── diagram-editor/         # Diagram editor plugin
│   └── ...                     # Other plugins
├── plugin-sdk/                 # Plugin development SDK
│   ├── template/               # Plugin template
│   ├── docs/                   # SDK documentation
│   └── validate-plugin.js      # Plugin validator
├── chrome-extensions/          # Chrome extensions
│   ├── ai-training-data-collector/
│   └── planning-tool-tab-manager/
├── docs/                       # Project documentation
├── archive/                    # Archived projects
│   └── android-app/            # Android app (archived)
├── docker-compose.yml          # Docker orchestration
├── .env.example                # Environment variables template
├── .env.development            # Development environment
├── .env.production             # Production environment
└── .gitignore                  # Git ignore rules
```

## Service Architecture

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

## Core Components

### Backend (`/backend`)

FastAPI-based REST API server.

**Key Files:**
- `main.py` - Main application entry point
- `auth.py` - Authentication logic
- `requirements.txt` - Python dependencies

**Features:**
- RESTful API endpoints
- Database models (SQLAlchemy)
- Authentication & authorization
- Plugin management

### Frontend (`/planning-tool-react`)

React web application with Vite build tool.

**Technology Stack:**
- React 18
- Vite
- TypeScript
- TailwindCSS (or similar)

**Features:**
- Task management
- Team collaboration
- Dashboard & analytics
- Plugin integration

### Virtual Office (`/services/virtual-office`)

Real-time multiplayer virtual office environment.

**Technology Stack:**
- Express.js
- Socket.io
- MongoDB
- HTML5 Canvas

**Features:**
- Multiplayer game environment
- Real-time collaboration
- Chat system
- Bookmark management

### Plugins (`/plugins`)

Modular plugin system for extending functionality.

**Plugin Structure:**
```
plugin-name/
├── plugin.json      # Metadata & configuration
├── index.html       # Main UI
├── style.css        # Styles
└── script.js        # Logic
```

**Available Plugins:**
- **HR** - Human resources management
- **KPI** - Key performance indicators
- **AI Assistant** - AI-powered assistance
- **Browser Tabs** - Tab management
- **Diagram Editor** - Visual diagram creation
- **Test Automation Dashboard** - Testing metrics
- **Performance Testing Lessons** - Performance guides
- **Repository Monitor** - Git repository tracking
- **Training** - Training materials

### Plugin SDK (`/plugin-sdk`)

Tools and documentation for plugin development.

**Contents:**
- **template/** - Starter plugin template
- **docs/** - SDK documentation
  - `PLUGIN_SDK_GUIDE.md` - Development guide
  - `API_CONTRACT.md` - API specifications
- **validate-plugin.js** - Plugin validation tool

**Usage:**
```bash
# Create new plugin from template
cp -r plugin-sdk/template plugins/my-plugin

# Validate plugin
node plugin-sdk/validate-plugin.js plugins/my-plugin
```

### Chrome Extensions (`/chrome-extensions`)

Browser extensions for enhanced functionality.

**Extensions:**
- **ai-training-data-collector** - Collects training data for AI
- **planning-tool-tab-manager** - Manages browser tabs and bookmarks

## Configuration

### Environment Files

- **`.env.example`** - Template with all available variables
- **`.env.development`** - Development configuration
- **`.env.production`** - Production configuration

**Usage:**
```bash
# Development
cp .env.development .env

# Production
cp .env.production .env
# Then update secrets!
```

### Docker Compose

Services are orchestrated using Docker Compose:

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Database Schema

### PostgreSQL (Main Database)

Stores:
- Users & authentication
- Tasks & projects
- Teams & members
- Bookmarks
- Plugin data
- System settings

### MongoDB (Virtual Office)

Stores:
- Player positions
- Game state
- Chat messages
- Real-time events

## API Endpoints

### Backend API (Port 8002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookmarks` | Get all bookmarks |
| POST | `/api/bookmarks` | Create bookmark |
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/plugins` | Get all plugins |

See `/plugin-sdk/docs/API_CONTRACT.md` for full API documentation.

### Virtual Office API (Port 3000)

WebSocket-based real-time API for multiplayer features.

## Development Workflow

### Setup

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd PT
   ```

2. **Configure environment**
   ```bash
   cp .env.development .env
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Access applications**
   - Frontend: http://localhost
   - Backend API: http://localhost:8002
   - Virtual Office: http://localhost:3000

### Creating a Plugin

1. **Copy template**
   ```bash
   cp -r plugin-sdk/template plugins/my-plugin
   ```

2. **Update plugin.json**
   ```json
   {
     "id": "my-plugin",
     "name": "My Plugin",
     "version": "1.0.0"
   }
   ```

3. **Develop plugin**
   - Edit `index.html`, `style.css`, `script.js`
   - Use Plugin SDK for API calls

4. **Validate plugin**
   ```bash
   node plugin-sdk/validate-plugin.js plugins/my-plugin
   ```

5. **Test plugin**
   - Access via frontend plugin menu

## Deployment

### Development
```bash
docker-compose up -d
```

### Production

1. **Update environment**
   ```bash
   cp .env.production .env
   # Edit .env and change all secrets!
   ```

2. **Build and deploy**
   ```bash
   docker-compose -f docker-compose.yml up -d --build
   ```

3. **Setup SSL** (recommended)
   - Configure nginx with SSL certificates
   - Update CORS_ORIGINS in .env

## Monitoring

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f virtual-office
```

### Health Checks

- Database health checks configured in docker-compose.yml
- Services wait for dependencies before starting

## Troubleshooting

### Common Issues

**Backend not starting:**
- Check database connection
- Verify environment variables
- Check logs: `docker-compose logs backend`

**Frontend build errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version

**Plugin not loading:**
- Validate plugin.json
- Check plugin.json syntax
- Run validator: `node plugin-sdk/validate-plugin.js`

**CORS errors:**
- Update CORS_ORIGINS in .env
- Restart backend service

## Best Practices

### Code Organization

- Keep services independent
- Use environment variables for configuration
- Follow plugin SDK guidelines
- Document API changes

### Security

- Never commit .env files
- Use strong secrets in production
- Keep dependencies updated
- Validate user input

### Performance

- Use Docker volumes for development
- Enable caching where appropriate
- Optimize database queries
- Monitor resource usage

## Contributing

1. Follow existing code style
2. Write tests for new features
3. Update documentation
4. Validate plugins before submitting

## Resources

- **Plugin SDK Guide:** `/plugin-sdk/docs/PLUGIN_SDK_GUIDE.md`
- **API Contract:** `/plugin-sdk/docs/API_CONTRACT.md`
- **Docker Guide:** `/docs/DOCKER_GUIDE.md`
- **Setup Guide:** `/docs/SETUP_GUIDE.md`

## Version History

- **2.0.0** (2025-01-03) - Restructured project, added Plugin SDK, environment management
- **1.0.0** - Initial release

## License

[Your License Here]

## Support

For issues or questions, please create an issue in the repository.
