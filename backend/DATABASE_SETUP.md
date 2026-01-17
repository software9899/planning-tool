# Database Setup Guide

## Docker Setup (Recommended)

Database is automatically initialized when running with Docker Compose.

### Start with Docker

```bash
# Development
docker compose -f docker-compose.dev.yml up -d

# Production
docker compose -f docker-compose.prod.yml up -d
```

The `init-db.sql` script runs automatically on first startup and creates:
- All tables
- Sample users with passwords
- Sample teams and tasks
- Default settings

### Login Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | admin |
| toffee2@example.com | password123 | developer |
| natchapon@example.com | password123 | developer |
| test1@example.com | password123 | qa |
| test2@example.com | password123 | designer |

## Local Development (Without Docker)

### 1. Create Database

```bash
psql -U postgres -c "CREATE DATABASE planning_tool;"
```

### 2. Run Init Script

```bash
psql -U postgres -d planning_tool -f init-db.sql
```

### 3. Start Backend

```bash
python main.py
```

## Reset Database

### Docker

```bash
# Stop containers and remove volume
docker compose -f docker-compose.prod.yml down
docker volume rm planning-tool-postgres-data

# Start fresh
docker compose -f docker-compose.prod.yml up -d
```

### Local

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS planning_tool;"
psql -U postgres -c "CREATE DATABASE planning_tool;"
psql -U postgres -d planning_tool -f init-db.sql
```

## Database Schema Updates

### Adding New Columns

```python
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:postgres123@localhost:5432/planning_tool')

with engine.connect() as conn:
    conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field VARCHAR(255)'))
    conn.commit()
```

## Troubleshooting

### Can't connect to PostgreSQL

- Check if container is running: `docker ps`
- Check logs: `docker logs planning-tool-db`
- Default connection: `postgresql://postgres:postgres123@localhost:5432/planning_tool`

### Different password for PostgreSQL

Set environment variable:
```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/planning_tool"
```
