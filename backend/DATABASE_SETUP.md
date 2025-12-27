# Database Setup Guide

## Prerequisites

- PostgreSQL installed and running
- Python virtual environment activated

## Initial Setup (For New Team Members)

### 1. Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE planning_tool;

# Exit PostgreSQL
\q
```

### 2. Install Dependencies

```bash
# Activate virtual environment
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Run Seed Data Script

```bash
# This will create tables and populate initial data
python seed_data.py
```

### 4. Start the Backend

```bash
python main.py
```

### 5. Login Credentials

After seeding, you can login with:

- **Admin Account**
  - Email: `admin@example.com`
  - Password: `admin123`

- **Developer Account**
  - Email: `toffee2@example.com`
  - Password: `password123`

- **Another Developer**
  - Email: `natchapon@example.com`
  - Password: `password123`

## Database Schema Updates

### Adding New Columns (Manual Method)

If you add new columns to models (like `position` or `line_manager`):

1. Create a migration script:

```python
# Example: add_new_field.py
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:postgres123@localhost:5432/planning_tool')

with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field VARCHAR(255)'))
        conn.commit()
        print('✅ Column added successfully!')
    except Exception as e:
        print(f'❌ Error: {e}')
        conn.rollback()
```

2. Run the script:

```bash
python add_new_field.py
```

## Reset Database

If you need to start fresh:

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS planning_tool;"
psql -U postgres -c "CREATE DATABASE planning_tool;"

# Run seed script again
python seed_data.py
```

## Troubleshooting

### Can't connect to PostgreSQL

- Check if PostgreSQL is running: `brew services list` (Mac) or `systemctl status postgresql` (Linux)
- Verify connection string in `.env` or code
- Default connection: `postgresql://postgres:postgres123@localhost:5432/planning_tool`

### "Table already exists" error

The seed script checks for existing data and skips if found. To force reset, use the "Reset Database" steps above.

### Different password for PostgreSQL

Update `DATABASE_URL` in:
1. `main.py`
2. `seed_data.py`
3. Any migration scripts

Or use environment variable:
```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/planning_tool"
```

## Future: Using Alembic Migrations

For better database version control, we can set up Alembic:

```bash
# Initialize Alembic
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Add new field"

# Apply migration
alembic upgrade head
```

This is recommended for production but optional for development.
