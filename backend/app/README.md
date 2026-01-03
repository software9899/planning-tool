# Backend Application - Modular Structure

## Overview

This directory contains the refactored modular backend application structure.

## Directory Structure

```
app/
├── models/          # SQLAlchemy database models
│   ├── user.py
│   ├── task.py
│   ├── bookmark.py
│   ├── team.py
│   └── other.py
├── schemas/         # Pydantic validation schemas
│   ├── task.py
│   ├── user.py
│   └── bookmark.py
├── routes/          # API route handlers
│   └── bookmarks.py
├── services/        # Business logic (to be added)
└── utils/           # Utility functions
    ├── database.py
    └── email.py
```

## Migration Status

### ✅ Completed
- Database models extracted and organized
- Pydantic schemas extracted for main entities
- Utility functions (database, email) extracted
- Example routes created (bookmarks)
- Testing infrastructure added

### 🔄 In Progress
- Route extraction (see below for guidance)
- Service layer creation

### 📝 To Do
- Extract remaining routes from `main_legacy.py`
- Create service layer for business logic
- Add more comprehensive tests
- Update main.py to use only modular imports

## How to Continue Refactoring

### Step 1: Extract Routes

For each endpoint group in `main_legacy.py`:

1. Create a new file in `app/routes/` (e.g., `tasks.py`)
2. Create APIRouter with appropriate prefix:
   ```python
   router = APIRouter(prefix="/api/tasks", tags=["tasks"])
   ```
3. Move related endpoints to the router
4. Import models and schemas from `app.models` and `app.schemas`
5. Add router to `app/routes/__init__.py`
6. Include router in main application

**Example Pattern:**

```python
# app/routes/tasks.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models import Task
from app.schemas import TaskCreate, TaskResponse
from app.utils.database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

@router.get("", response_model=list[TaskResponse])
def get_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()
```

### Step 2: Add to Main Application

```python
# main.py
from app.routes import bookmarks_router, tasks_router

app.include_router(bookmarks_router)
app.include_router(tasks_router)
```

### Step 3: Test

```python
# tests/test_tasks.py
def test_get_tasks(client):
    response = client.get("/api/tasks")
    assert response.status_code == 200
```

## Current State

- **main_legacy.py**: Original monolithic file (1,797 lines) - still in use
- **main.py**: Will be updated to use modular structure
- **app/**: Modular structure ready for migration

## Benefits of Modular Structure

1. **Maintainability**: Easier to find and update code
2. **Testability**: Each module can be tested independently
3. **Scalability**: Easy to add new features
4. **Team Collaboration**: Multiple developers can work on different modules
5. **Code Reusability**: Models and schemas can be imported anywhere

## Migration Priority

1. **High Priority**: Authentication, Tasks, Users routes
2. **Medium Priority**: Teams, Leaves, Settings routes
3. **Low Priority**: Less frequently used routes

## Notes

- Keep `main_legacy.py` as reference during migration
- Test each migrated route thoroughly
- Update API documentation as routes are migrated
- Consider creating service layer for complex business logic

## Questions?

Check the example in `app/routes/bookmarks.py` for the recommended pattern.
