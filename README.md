# Planning Tool

A full-stack planning and project management tool built with React, FastAPI, and PostgreSQL.

## 🚀 Quick Start for New Team Members

### Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 14+

### 1. Clone Repository

```bash
git clone <repository-url>
cd planning-tool
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE planning_tool;"

# Seed initial data
python seed_data.py

# Start backend server
python main.py
```

Backend will run on: **http://localhost:8002**

### 3. Frontend Setup

```bash
cd planning-tool-react

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on: **http://localhost:5173**

### 4. Login

After seeding, use these credentials:

- **Admin**: `admin@example.com` / `admin123`
- **Developer**: `toffee2@example.com` / `password123`

## 📝 Database Seeding

The `seed_data.py` script creates:
- 5 sample users (admin, developers, QA, designer)
- 5 sample tasks
- Proper relationships

**Re-run seeding:**
```bash
cd backend
python seed_data.py
```

It safely skips existing data.

## 🔧 Common Issues

**"No data after git pull"**
```bash
# Re-run seed script
cd backend
source venv/bin/activate
python seed_data.py
```

**"Database doesn't exist"**
```bash
psql -U postgres -c "CREATE DATABASE planning_tool;"
python seed_data.py
```

For more details, see [backend/DATABASE_SETUP.md](backend/DATABASE_SETUP.md)
