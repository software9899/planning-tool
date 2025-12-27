"""
Planning Tool Backend API
FastAPI + PostgreSQL
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Text, TIMESTAMP, ARRAY, DateTime, Numeric, Float, text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Import authentication utilities
from auth import UserRegister, UserLogin, Token, get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres123@localhost:5432/planning_tool")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

def send_email(to_email: str, subject: str, body: str):
    """Send email using SMTP"""
    try:
        # For development: just print the email content
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            print(f"\n{'='*50}")
            print(f"📧 EMAIL (Development Mode)")
            print(f"{'='*50}")
            print(f"To: {to_email}")
            print(f"Subject: {subject}")
            print(f"\n{body}")
            print(f"{'='*50}\n")
            return True

        # Production: send actual email
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False

# Database Models
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="todo")
    priority = Column(String(50), default="medium")
    assigned_to = Column(Integer)
    team_id = Column(Integer)
    due_date = Column(DateTime)
    created_by = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    tags = Column(ARRAY(Text))
    estimate_hours = Column(Numeric(10, 2))
    readiness_checklist = Column(JSONB)
    size = Column(String(10))

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255))
    role = Column(String(50), default="member")
    position = Column(String(255), nullable=True)
    line_manager = Column(Integer, nullable=True)
    status = Column(String(50), default="active")
    avatar_url = Column(Text)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    computer = Column(String(255), nullable=True)
    mobile = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=True)
    birthday = Column(String(50), nullable=True)
    disc_type = Column(String(10), nullable=True)
    personality_type = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class DraftHeadcount(Base):
    __tablename__ = "draft_headcount"

    id = Column(Integer, primary_key=True, index=True)
    position_title = Column(String(255), nullable=False)
    department = Column(String(255))
    line_manager = Column(Integer, ForeignKey("users.id"))
    required_skills = Column(Text)
    description = Column(Text)
    status = Column(String(50), default="open")
    recruiting_status = Column(String(50), default="open")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    icon = Column(String(10), nullable=True)
    description = Column(Text, nullable=True)
    lead_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Unique constraint to prevent duplicate memberships
    __table_args__ = (
        UniqueConstraint('team_id', 'user_id', name='unique_team_member'),
    )

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_name = Column(String(255), nullable=False)
    leave_type = Column(String(50), nullable=False)  # annual, sick, personal, unpaid
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    days = Column(Float, nullable=False)
    half_day_type = Column(String(20), nullable=True)  # null/full_day, morning, afternoon
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="pending")  # pending, approved, rejected
    requested_date = Column(DateTime, default=datetime.utcnow)
    reviewed_by = Column(String(255), nullable=True)
    reviewed_date = Column(DateTime, nullable=True)
    dates = Column(ARRAY(Text), nullable=True)  # Array of all leave dates (ISO format strings)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    user_name = Column(String(255), nullable=False)
    annual_total = Column(Integer, default=15)
    annual_used = Column(Integer, default=0)
    sick_total = Column(Integer, default=10)
    sick_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Diagram(Base):
    __tablename__ = "diagrams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    diagram_data = Column(Text, nullable=False)  # JSON string containing shapes, connections, etc.
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create all tables
Base.metadata.create_all(bind=engine)

# Pydantic Models (Request/Response)
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    assigned_to: Optional[int] = None
    team_id: Optional[int] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = []
    estimate_hours: Optional[float] = None
    readiness_checklist: Optional[List[dict]] = Field(None, alias='readinessChecklist')
    size: Optional[str] = None

    class Config:
        populate_by_name = True

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None
    team_id: Optional[int] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    estimate_hours: Optional[float] = None
    readiness_checklist: Optional[List[dict]] = Field(None, alias='readinessChecklist')
    size: Optional[str] = None

    class Config:
        populate_by_name = True

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    assigned_to: Optional[int]
    team_id: Optional[int]
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    tags: Optional[List[str]]
    estimate_hours: Optional[float]
    readiness_checklist: Optional[List[dict]] = Field(None, alias='readinessChecklist')
    size: Optional[str]

    class Config:
        from_attributes = True
        populate_by_name = True

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    position: Optional[str] = None
    line_manager: Optional[int] = None
    status: str = "active"
    avatar_url: Optional[str]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    computer: Optional[str] = None
    mobile: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[str] = None
    disc_type: Optional[str] = None
    personality_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class SettingCreate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None

class SettingResponse(BaseModel):
    id: int
    key: str
    value: str
    description: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True

class TeamCreate(BaseModel):
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[int] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[int] = None

class TeamResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str]
    description: Optional[str]
    lead_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DraftHeadcountCreate(BaseModel):
    position_title: str
    department: Optional[str] = None
    line_manager: Optional[int] = None
    required_skills: Optional[str] = None
    description: Optional[str] = None
    status: str = "open"
    recruiting_status: str = "open"

class DraftHeadcountUpdate(BaseModel):
    position_title: Optional[str] = None
    department: Optional[str] = None
    line_manager: Optional[int] = None
    required_skills: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    recruiting_status: Optional[str] = None

class DraftHeadcountResponse(BaseModel):
    id: int
    position_title: str
    department: Optional[str]
    line_manager: Optional[int]
    required_skills: Optional[str]
    description: Optional[str]
    status: str
    recruiting_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Leave Management Pydantic Models
class LeaveRequestCreate(BaseModel):
    user_id: int
    user_name: str
    leave_type: str  # annual, sick, personal, unpaid
    start_date: datetime
    end_date: datetime
    days: float
    half_day_type: Optional[str] = None  # null/full_day, morning, afternoon
    reason: str
    status: str = "pending"
    requested_date: datetime
    dates: Optional[List[str]] = None  # List of all leave dates (ISO format strings)

class LeaveRequestUpdate(BaseModel):
    status: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_date: Optional[datetime] = None
    half_day_type: Optional[str] = None
    days: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    dates: Optional[List[str]] = None

class LeaveRequestResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    leave_type: str
    start_date: datetime
    end_date: datetime
    days: float
    half_day_type: Optional[str]
    reason: str
    status: str
    requested_date: datetime
    reviewed_by: Optional[str]
    reviewed_date: Optional[datetime]
    dates: Optional[List[str]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LeaveBalanceResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    annual_total: int
    annual_used: int
    annual_remaining: int
    sick_total: int
    sick_used: int
    sick_remaining: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DiagramCreate(BaseModel):
    name: str
    description: Optional[str] = None
    diagram_data: str
    created_by: Optional[int] = None

class DiagramUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    diagram_data: Optional[str] = None

class DiagramResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    diagram_data: str
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# FastAPI App
app = FastAPI(
    title="Planning Tool API",
    description="Backend API for Planning Tool with PostgreSQL",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API Endpoints
@app.get("/")
def read_root():
    return {
        "service": "Planning Tool API",
        "version": "1.0.0",
        "status": "running",
        "database": "PostgreSQL"
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Tasks CRUD
@app.get("/api/tasks", response_model=List[TaskResponse])
def get_tasks(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all tasks with optional filtering"""
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    tasks = query.offset(skip).limit(limit).all()
    return tasks

@app.get("/api/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a specific task by ID"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.post("/api/tasks", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    db_task = Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)):
    """Update an existing task"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    
    db_task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task"""
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted successfully"}

# Users endpoints
@app.get("/api/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    """Get all users"""
    users = db.query(User).all()
    return users

@app.get("/api/members", response_model=List[UserResponse])
def get_members(db: Session = Depends(get_db)):
    """Get all members (alias for /api/users, used by Leave Management)"""
    users = db.query(User).all()
    return users

@app.post("/api/users", response_model=UserResponse)
def create_user(user_data: dict, db: Session = Depends(get_db)):
    """Create a new user (for vacancies and org chart)"""
    # Create new user without password requirement
    db_user = User(
        name=user_data.get('name', 'Vacancy'),
        email=user_data.get('email', f'vacancy-{datetime.utcnow().timestamp()}@temp.com'),
        role=user_data.get('role', 'Position Open'),
        position=user_data.get('position', 'Open Position'),
        line_manager=user_data.get('line_manager'),
        status=user_data.get('status', 'inactive'),
        password_hash=None  # No password for vacancies
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a specific user"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_data: dict, db: Session = Depends(get_db)):
    """Update a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Update allowed fields
    if 'name' in user_data:
        user.name = user_data['name']
    if 'email' in user_data:
        # Check if email already exists for another user
        existing = db.query(User).filter(User.email == user_data['email'], User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = user_data['email']
    if 'role' in user_data:
        user.role = user_data['role']
    if 'position' in user_data:
        user.position = user_data['position']
    if 'line_manager' in user_data:
        user.line_manager = user_data['line_manager']
    if 'status' in user_data:
        user.status = user_data['status']
    if 'start_date' in user_data:
        user.start_date = user_data['start_date']
    if 'end_date' in user_data:
        user.end_date = user_data['end_date']
    if 'computer' in user_data:
        user.computer = user_data['computer']
    if 'mobile' in user_data:
        user.mobile = user_data['mobile']
    if 'phone' in user_data:
        user.phone = user_data['phone']
    if 'birthday' in user_data:
        user.birthday = user_data['birthday']
    if 'disc_type' in user_data:
        user.disc_type = user_data['disc_type']
    if 'personality_type' in user_data:
        user.personality_type = user_data['personality_type']
    if 'password' in user_data and user_data['password']:
        user.password_hash = get_password_hash(user_data['password'])

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

# Authentication endpoints
@app.post("/api/auth/register", response_model=UserResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user with hashed password
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role,
        position=user_data.position,
        line_manager=user_data.line_manager
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/auth/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    # Find user by email
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "name": user.name, "role": user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send password reset email"""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists or not (security best practice)
        return {"message": "If the email exists, a password reset link has been sent"}

    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour

    # Delete old tokens for this user
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()

    # Save new token
    db_token = PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()

    # Send email
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    email_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>รีเซ็ตรหัสผ่าน - Planning Tool</h2>
            <p>สวัสดีค่ะ {user.name},</p>
            <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ</p>
            <p>กรุณาคลิกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่าน:</p>
            <p><a href="{reset_link}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">รีเซ็ตรหัสผ่าน</a></p>
            <p>หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:</p>
            <p style="color: #667eea;">{reset_link}</p>
            <p><strong>ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง</strong></p>
            <p>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้</p>
            <br>
            <p>ขอบคุณค่ะ,<br>Planning Tool Team</p>
        </body>
    </html>
    """

    send_email(user.email, "รีเซ็ตรหัสผ่าน - Planning Tool", email_body)

    return {"message": "If the email exists, a password reset link has been sent"}

@app.post("/api/auth/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token"""
    # Find token
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == request.token
    ).first()

    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Check if token expired
    if datetime.utcnow() > token_record.expires_at:
        db.delete(token_record)
        db.commit()
        raise HTTPException(status_code=400, detail="Reset token has expired")

    # Find user
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update password
    user.password_hash = get_password_hash(request.new_password)
    user.updated_at = datetime.utcnow()

    # Delete used token
    db.delete(token_record)
    db.commit()

    return {"message": "Password has been reset successfully"}

# Settings Endpoints
@app.get("/api/settings", response_model=List[SettingResponse])
def get_all_settings(db: Session = Depends(get_db)):
    """Get all settings"""
    settings = db.query(Setting).all()
    return settings

@app.get("/api/settings/{key}", response_model=SettingResponse)
def get_setting(key: str, db: Session = Depends(get_db)):
    """Get a specific setting by key"""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting

@app.post("/api/settings", response_model=SettingResponse)
def create_setting(setting: SettingCreate, db: Session = Depends(get_db)):
    """Create a new setting"""
    # Check if setting with this key already exists
    existing = db.query(Setting).filter(Setting.key == setting.key).first()
    if existing:
        raise HTTPException(status_code=400, detail="Setting with this key already exists")

    db_setting = Setting(
        key=setting.key,
        value=setting.value,
        description=setting.description
    )
    db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting

@app.put("/api/settings/{key}", response_model=SettingResponse)
def update_setting(key: str, setting: SettingUpdate, db: Session = Depends(get_db)):
    """Update an existing setting"""
    db_setting = db.query(Setting).filter(Setting.key == key).first()
    if db_setting is None:
        # Create new setting if it doesn't exist
        db_setting = Setting(key=key, value=setting.value, description=setting.description)
        db.add(db_setting)
    else:
        db_setting.value = setting.value
        if setting.description is not None:
            db_setting.description = setting.description
        db_setting.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(db_setting)
    return db_setting

@app.delete("/api/settings/{key}")
def delete_setting(key: str, db: Session = Depends(get_db)):
    """Delete a setting"""
    db_setting = db.query(Setting).filter(Setting.key == key).first()
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")

    db.delete(db_setting)
    db.commit()
    return {"message": "Setting deleted successfully"}

# ========================================
# Teams Endpoints
# ========================================

@app.get("/api/teams", response_model=List[TeamResponse])
def get_all_teams(db: Session = Depends(get_db)):
    """Get all teams"""
    teams = db.query(Team).all()
    return teams

@app.get("/api/teams/{team_id}", response_model=TeamResponse)
def get_team(team_id: int, db: Session = Depends(get_db)):
    """Get a specific team by ID"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@app.post("/api/teams", response_model=TeamResponse)
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    """Create a new team"""
    db_team = Team(
        name=team.name,
        icon=team.icon,
        description=team.description,
        lead_id=team.lead_id
    )
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

@app.put("/api/teams/{team_id}", response_model=TeamResponse)
def update_team(team_id: int, team: TeamUpdate, db: Session = Depends(get_db)):
    """Update an existing team"""
    db_team = db.query(Team).filter(Team.id == team_id).first()
    if db_team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    # Use exclude_unset to only update fields that were explicitly provided
    update_data = team.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_team, field, value)

    db_team.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_team)
    return db_team

@app.delete("/api/teams/{team_id}")
def delete_team(team_id: int, db: Session = Depends(get_db)):
    """Delete a team"""
    db_team = db.query(Team).filter(Team.id == team_id).first()
    if db_team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    db.delete(db_team)
    db.commit()
    return {"message": "Team deleted successfully"}

# ========================================
# Team Members Endpoints
# ========================================

@app.get("/api/teams/{team_id}/members")
def get_team_members(team_id: int, db: Session = Depends(get_db)):
    """Get all members of a team"""
    # Verify team exists
    team = db.query(Team).filter(Team.id == team_id).first()
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    # Get team members
    members = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
    member_ids = [m.user_id for m in members]

    # Get user details
    users = db.query(User).filter(User.id.in_(member_ids)).all() if member_ids else []
    return users

@app.post("/api/teams/{team_id}/members/{user_id}")
def add_team_member(team_id: int, user_id: int, db: Session = Depends(get_db)):
    """Add a member to a team"""
    # Verify team exists
    team = db.query(Team).filter(Team.id == team_id).first()
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a member
    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()

    if existing:
        return {"message": "User is already a member of this team"}

    # Add member
    team_member = TeamMember(team_id=team_id, user_id=user_id)
    db.add(team_member)
    db.commit()
    db.refresh(team_member)

    return {"message": "Member added successfully", "team_member_id": team_member.id}

@app.delete("/api/teams/{team_id}/members/{user_id}")
def remove_team_member(team_id: int, user_id: int, db: Session = Depends(get_db)):
    """Remove a member from a team"""
    team_member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()

    if team_member is None:
        raise HTTPException(status_code=404, detail="Team member not found")

    db.delete(team_member)
    db.commit()
    return {"message": "Member removed successfully"}

@app.put("/api/teams/{team_id}/members")
def update_team_members(team_id: int, member_ids: List[int], db: Session = Depends(get_db)):
    """Update all members of a team (replace existing with new list)"""
    # Verify team exists
    team = db.query(Team).filter(Team.id == team_id).first()
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    # Remove all existing members
    db.query(TeamMember).filter(TeamMember.team_id == team_id).delete()

    # Add new members
    for user_id in member_ids:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            team_member = TeamMember(team_id=team_id, user_id=user_id)
            db.add(team_member)

    db.commit()
    return {"message": f"Team members updated successfully. {len(member_ids)} members added."}

# ========================================
# KPI Data Storage Endpoints
# ========================================

class KPIDataSave(BaseModel):
    role_or_user: str  # "role:admin" or "user:123"
    kpi_data: dict
    competency_data: Optional[list] = []

class KPIDataResponse(BaseModel):
    id: int
    role_or_user: str
    kpi_data: dict
    competency_data: Optional[list]
    updated_at: datetime

class KPISetsSave(BaseModel):
    kpi_sets: list
    competency_data: Optional[list] = []

@app.get("/api/kpi/data/{role_or_user}")
def get_kpi_data(role_or_user: str, db: Session = Depends(get_db)):
    """Get KPI data for a specific role or user"""
    # For now, return from settings table
    key = f"kpi_data_{role_or_user}"
    setting = db.query(Setting).filter(Setting.key == key).first()

    if not setting:
        # Return default data
        return {
            "role_or_user": role_or_user,
            "kpi_data": {},
            "competency_data": []
        }

    import json
    try:
        data = json.loads(setting.value)
        return {
            "role_or_user": role_or_user,
            "kpi_data": data.get("kpi_data", {}),
            "competency_data": data.get("competency_data", []),
            "updated_at": setting.updated_at
        }
    except:
        return {
            "role_or_user": role_or_user,
            "kpi_data": {},
            "competency_data": []
        }

@app.post("/api/kpi/data")
def save_kpi_data(data: KPIDataSave, db: Session = Depends(get_db)):
    """Save KPI data for a specific role or user"""
    import json

    key = f"kpi_data_{data.role_or_user}"
    value = json.dumps({
        "kpi_data": data.kpi_data,
        "competency_data": data.competency_data
    })

    # Check if exists
    setting = db.query(Setting).filter(Setting.key == key).first()

    if setting:
        setting.value = value
        setting.updated_at = datetime.utcnow()
    else:
        setting = Setting(
            key=key,
            value=value,
            description=f"KPI data for {data.role_or_user}"
        )
        db.add(setting)

    db.commit()
    db.refresh(setting)

    return {
        "message": "KPI data saved successfully",
        "role_or_user": data.role_or_user
    }

@app.get("/api/kpi/sets")
def get_kpi_sets(db: Session = Depends(get_db)):
    """Get all KPI Sets"""
    import json

    key = "kpi_sets_all"
    setting = db.query(Setting).filter(Setting.key == key).first()

    if not setting:
        # Return default empty data
        return {
            "kpi_sets": [],
            "competency_data": []
        }

    try:
        data = json.loads(setting.value)
        return {
            "kpi_sets": data.get("kpi_sets", []),
            "competency_data": data.get("competency_data", []),
            "updated_at": setting.updated_at
        }
    except:
        return {
            "kpi_sets": [],
            "competency_data": []
        }

@app.post("/api/kpi/sets")
def save_kpi_sets(data: KPISetsSave, db: Session = Depends(get_db)):
    """Save all KPI Sets"""
    import json

    key = "kpi_sets_all"
    value = json.dumps({
        "kpi_sets": data.kpi_sets,
        "competency_data": data.competency_data
    })

    # Check if exists
    setting = db.query(Setting).filter(Setting.key == key).first()

    if setting:
        setting.value = value
        setting.updated_at = datetime.utcnow()
    else:
        setting = Setting(
            key=key,
            value=value,
            description="All KPI Sets data"
        )
        db.add(setting)

    db.commit()
    db.refresh(setting)

    return {
        "message": "KPI Sets saved successfully",
        "count": len(data.kpi_sets)
    }

# ========================================
# Plugin Management
# ========================================

import json
from pathlib import Path
from fastapi.responses import FileResponse, JSONResponse

# Get plugins directory - works both locally and in Docker
# In Docker: plugins are mounted at /plugins
# Locally: plugins are at ../plugins relative to backend directory
if Path("/plugins").exists():
    PLUGINS_DIR = Path("/plugins")
else:
    PLUGINS_DIR = Path(__file__).parent.parent / "plugins"

@app.get("/api/plugins")
def get_plugins():
    """Get all available plugins"""
    plugins = []

    if not PLUGINS_DIR.exists():
        return JSONResponse(content=[], status_code=200)

    for plugin_dir in PLUGINS_DIR.iterdir():
        if not plugin_dir.is_dir():
            continue

        plugin_json = plugin_dir / "plugin.json"
        if not plugin_json.exists():
            continue

        try:
            with open(plugin_json, 'r') as f:
                plugin_data = json.load(f)
                plugins.append(plugin_data)
        except Exception as e:
            print(f"Error loading plugin {plugin_dir.name}: {e}")
            continue

    return JSONResponse(content=plugins, status_code=200)

@app.get("/api/plugins/{plugin_id}/script")
@app.get("/api/plugins/{plugin_id}/script.js")
def get_plugin_script(plugin_id: str):
    """Serve plugin JavaScript file"""
    plugin_dir = PLUGINS_DIR / plugin_id

    if not plugin_dir.exists():
        raise HTTPException(status_code=404, detail="Plugin not found")

    plugin_json = plugin_dir / "plugin.json"
    if not plugin_json.exists():
        raise HTTPException(status_code=404, detail="Plugin configuration not found")

    try:
        with open(plugin_json, 'r') as f:
            plugin_data = json.load(f)
            script_file = plugin_dir / plugin_data['files']['script']

            if not script_file.exists():
                raise HTTPException(status_code=404, detail="Plugin script not found")

            return FileResponse(script_file, media_type="application/javascript")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/plugins/{plugin_id}/style")
@app.get("/api/plugins/{plugin_id}/style.css")
def get_plugin_style(plugin_id: str):
    """Serve plugin CSS file"""
    plugin_dir = PLUGINS_DIR / plugin_id

    if not plugin_dir.exists():
        raise HTTPException(status_code=404, detail="Plugin not found")

    plugin_json = plugin_dir / "plugin.json"
    if not plugin_json.exists():
        raise HTTPException(status_code=404, detail="Plugin configuration not found")

    try:
        with open(plugin_json, 'r') as f:
            plugin_data = json.load(f)
            style_file = plugin_dir / plugin_data['files']['style']

            if not style_file.exists():
                raise HTTPException(status_code=404, detail="Plugin style not found")

            return FileResponse(style_file, media_type="text/css")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/plugins/{plugin_id}/html")
def get_plugin_html(plugin_id: str):
    """Serve plugin HTML file"""
    plugin_dir = PLUGINS_DIR / plugin_id

    if not plugin_dir.exists():
        raise HTTPException(status_code=404, detail="Plugin not found")

    plugin_json = plugin_dir / "plugin.json"
    if not plugin_json.exists():
        raise HTTPException(status_code=404, detail="Plugin configuration not found")

    try:
        with open(plugin_json, 'r') as f:
            plugin_data = json.load(f)

            # Check if plugin has an HTML file specified
            if 'html' in plugin_data['files']:
                html_file = plugin_dir / plugin_data['files']['html']
            else:
                html_file = plugin_dir / 'index.html'

            if not html_file.exists():
                raise HTTPException(status_code=404, detail="Plugin HTML not found")

            return FileResponse(html_file, media_type="text/html")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/plugins/{plugin_id}/{file_path:path}")
def get_plugin_file(plugin_id: str, file_path: str):
    """Serve any file from plugin directory (for files referenced in HTML)"""
    plugin_dir = PLUGINS_DIR / plugin_id

    if not plugin_dir.exists():
        raise HTTPException(status_code=404, detail="Plugin not found")

    # Security: prevent path traversal attacks
    requested_file = plugin_dir / file_path
    try:
        # Resolve to absolute path and check it's within plugin directory
        requested_file = requested_file.resolve()
        plugin_dir = plugin_dir.resolve()

        if not str(requested_file).startswith(str(plugin_dir)):
            raise HTTPException(status_code=403, detail="Access denied")

        if not requested_file.exists():
            raise HTTPException(status_code=404, detail="File not found")

        if not requested_file.is_file():
            raise HTTPException(status_code=404, detail="Not a file")

        # Determine media type based on extension
        media_types = {
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.html': 'text/html',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.txt': 'text/plain'
        }

        ext = requested_file.suffix.lower()
        media_type = media_types.get(ext, 'application/octet-stream')

        return FileResponse(requested_file, media_type=media_type)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/plugins/unconfigured")
def get_unconfigured_plugins():
    """Get all plugin folders that don't have plugin.json"""
    unconfigured = []

    if not PLUGINS_DIR.exists():
        return JSONResponse(content=[], status_code=200)

    for plugin_dir in PLUGINS_DIR.iterdir():
        if not plugin_dir.is_dir():
            continue

        plugin_json = plugin_dir / "plugin.json"
        if plugin_json.exists():
            continue

        # This folder doesn't have plugin.json - it's unconfigured
        # Check what files exist in this folder
        files = []
        for file in plugin_dir.iterdir():
            if file.is_file():
                files.append(file.name)

        unconfigured.append({
            "folder_name": plugin_dir.name,
            "path": str(plugin_dir),
            "files": files
        })

    return JSONResponse(content=unconfigured, status_code=200)

@app.post("/api/plugins/configure")
def configure_plugin(config: dict):
    """Create plugin.json file for an unconfigured plugin"""
    try:
        folder_name = config.get("folder_name")
        if not folder_name:
            raise HTTPException(status_code=400, detail="folder_name is required")

        plugin_dir = PLUGINS_DIR / folder_name
        if not plugin_dir.exists():
            raise HTTPException(status_code=404, detail="Plugin folder not found")

        plugin_json = plugin_dir / "plugin.json"
        if plugin_json.exists():
            raise HTTPException(status_code=400, detail="Plugin is already configured")

        # Create plugin.json with provided configuration
        plugin_config = {
            "id": config.get("id", folder_name),
            "name": config.get("name", folder_name),
            "version": config.get("version", "1.0.0"),
            "description": config.get("description", ""),
            "icon": config.get("icon", "🔌"),
            "route": config.get("route", f"/plugin/{folder_name}"),
            "sidebarLabel": config.get("sidebarLabel", config.get("name", folder_name)),
            "author": config.get("author", ""),
            "enabled": config.get("enabled", False),
            "files": {
                "html": config.get("html_file", "index.html"),
                "script": config.get("script_file", "script.js"),
                "style": config.get("style_file", "style.css")
            }
        }

        # Add optional hidden field if provided
        if "hidden" in config:
            plugin_config["hidden"] = config["hidden"]

        # Save plugin.json
        with open(plugin_json, 'w') as f:
            json.dump(plugin_config, f, indent=2)

        return JSONResponse(content={
            "message": "Plugin configured successfully",
            "config": plugin_config
        }, status_code=200)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# Draft Headcount Endpoints
# ========================================

@app.get("/api/draft-headcount", response_model=List[DraftHeadcountResponse])
def get_draft_headcount(db: Session = Depends(get_db)):
    """Get all draft headcount entries"""
    entries = db.query(DraftHeadcount).all()
    return entries

@app.get("/api/draft-headcount/{entry_id}", response_model=DraftHeadcountResponse)
def get_draft_headcount_entry(entry_id: int, db: Session = Depends(get_db)):
    """Get a specific draft headcount entry"""
    entry = db.query(DraftHeadcount).filter(DraftHeadcount.id == entry_id).first()
    if entry is None:
        raise HTTPException(status_code=404, detail="Draft headcount entry not found")
    return entry

@app.post("/api/draft-headcount", response_model=DraftHeadcountResponse)
def create_draft_headcount(entry: DraftHeadcountCreate, db: Session = Depends(get_db)):
    """Create a new draft headcount entry"""
    db_entry = DraftHeadcount(**entry.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.put("/api/draft-headcount/{entry_id}", response_model=DraftHeadcountResponse)
def update_draft_headcount(entry_id: int, entry: DraftHeadcountUpdate, db: Session = Depends(get_db)):
    """Update a draft headcount entry"""
    db_entry = db.query(DraftHeadcount).filter(DraftHeadcount.id == entry_id).first()
    if db_entry is None:
        raise HTTPException(status_code=404, detail="Draft headcount entry not found")

    update_data = entry.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_entry, key, value)

    db_entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.delete("/api/draft-headcount/{entry_id}")
def delete_draft_headcount(entry_id: int, db: Session = Depends(get_db)):
    """Delete a draft headcount entry"""
    db_entry = db.query(DraftHeadcount).filter(DraftHeadcount.id == entry_id).first()
    if db_entry is None:
        raise HTTPException(status_code=404, detail="Draft headcount entry not found")

    db.delete(db_entry)
    db.commit()
    return {"message": "Draft headcount entry deleted successfully"}

# ========================================
# Leave Management Endpoints
# ========================================

@app.get("/api/leave-requests", response_model=List[LeaveRequestResponse])
def get_leave_requests(db: Session = Depends(get_db)):
    """Get all leave requests"""
    requests = db.query(LeaveRequest).order_by(LeaveRequest.requested_date.desc()).all()
    return requests

@app.get("/api/leave-requests/{request_id}", response_model=LeaveRequestResponse)
def get_leave_request(request_id: int, db: Session = Depends(get_db)):
    """Get a specific leave request"""
    request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if request is None:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return request

@app.post("/api/leave-requests", response_model=LeaveRequestResponse)
def create_leave_request(request: LeaveRequestCreate, db: Session = Depends(get_db)):
    """Create a new leave request"""
    db_request = LeaveRequest(**request.dict())
    db.add(db_request)
    db.commit()
    db.refresh(db_request)

    # Update or create leave balance
    balance = db.query(LeaveBalance).filter(LeaveBalance.user_id == request.user_id).first()
    if not balance:
        # Create new balance entry
        balance = LeaveBalance(
            user_id=request.user_id,
            user_name=request.user_name,
            annual_total=15,
            annual_used=0,
            sick_total=10,
            sick_used=0
        )
        db.add(balance)
        db.commit()

    return db_request

@app.put("/api/leave-requests/{request_id}", response_model=LeaveRequestResponse)
def update_leave_request(request_id: int, request: LeaveRequestUpdate, db: Session = Depends(get_db)):
    """Update a leave request (approve/reject)"""
    db_request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if db_request is None:
        raise HTTPException(status_code=404, detail="Leave request not found")

    update_data = request.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_request, key, value)

    db_request.updated_at = datetime.utcnow()

    # If approved, update leave balance
    if update_data.get('status') == 'approved':
        balance = db.query(LeaveBalance).filter(LeaveBalance.user_id == db_request.user_id).first()
        if balance:
            if db_request.leave_type == 'annual':
                balance.annual_used += db_request.days
            elif db_request.leave_type == 'sick':
                balance.sick_used += db_request.days
            balance.updated_at = datetime.utcnow()

    # If rejected or cancelled from approved, restore leave balance
    elif db_request.status == 'approved' and update_data.get('status') in ['rejected', 'cancelled']:
        balance = db.query(LeaveBalance).filter(LeaveBalance.user_id == db_request.user_id).first()
        if balance:
            if db_request.leave_type == 'annual':
                balance.annual_used = max(0, balance.annual_used - db_request.days)
            elif db_request.leave_type == 'sick':
                balance.sick_used = max(0, balance.sick_used - db_request.days)
            balance.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(db_request)
    return db_request

@app.delete("/api/leave-requests/{request_id}")
def delete_leave_request(request_id: int, db: Session = Depends(get_db)):
    """Delete a leave request"""
    db_request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if db_request is None:
        raise HTTPException(status_code=404, detail="Leave request not found")

    # If it was approved, restore the leave balance
    if db_request.status == 'approved':
        balance = db.query(LeaveBalance).filter(LeaveBalance.user_id == db_request.user_id).first()
        if balance:
            if db_request.leave_type == 'annual':
                balance.annual_used = max(0, balance.annual_used - db_request.days)
            elif db_request.leave_type == 'sick':
                balance.sick_used = max(0, balance.sick_used - db_request.days)
            balance.updated_at = datetime.utcnow()

    db.delete(db_request)
    db.commit()
    return {"message": "Leave request deleted successfully"}

@app.get("/api/leave-balances")
def get_leave_balances(db: Session = Depends(get_db)):
    """Get all leave balances with calculated remaining days"""
    balances = db.query(LeaveBalance).all()

    result = []
    for balance in balances:
        result.append({
            "id": balance.id,
            "user_id": balance.user_id,
            "user_name": balance.user_name,
            "annual_total": balance.annual_total,
            "annual_used": balance.annual_used,
            "annual_remaining": balance.annual_total - balance.annual_used,
            "sick_total": balance.sick_total,
            "sick_used": balance.sick_used,
            "sick_remaining": balance.sick_total - balance.sick_used,
            "created_at": balance.created_at,
            "updated_at": balance.updated_at
        })

    return result

@app.get("/api/leave-balances/{user_id}")
def get_leave_balance(user_id: int, db: Session = Depends(get_db)):
    """Get leave balance for a specific user"""
    balance = db.query(LeaveBalance).filter(LeaveBalance.user_id == user_id).first()
    if balance is None:
        raise HTTPException(status_code=404, detail="Leave balance not found")

    return {
        "id": balance.id,
        "user_id": balance.user_id,
        "user_name": balance.user_name,
        "annual_total": balance.annual_total,
        "annual_used": balance.annual_used,
        "annual_remaining": balance.annual_total - balance.annual_used,
        "sick_total": balance.sick_total,
        "sick_used": balance.sick_used,
        "sick_remaining": balance.sick_total - balance.sick_used,
        "created_at": balance.created_at,
        "updated_at": balance.updated_at
    }

# ===== Diagram Endpoints =====

@app.get("/api/diagrams", response_model=List[DiagramResponse])
def get_diagrams(db: Session = Depends(get_db)):
    """Get all diagrams"""
    diagrams = db.query(Diagram).order_by(Diagram.updated_at.desc()).all()
    return diagrams

@app.get("/api/diagrams/{diagram_id}", response_model=DiagramResponse)
def get_diagram(diagram_id: int, db: Session = Depends(get_db)):
    """Get a specific diagram by ID"""
    diagram = db.query(Diagram).filter(Diagram.id == diagram_id).first()
    if diagram is None:
        raise HTTPException(status_code=404, detail="Diagram not found")
    return diagram

@app.post("/api/diagrams", response_model=DiagramResponse)
def create_diagram(diagram: DiagramCreate, db: Session = Depends(get_db)):
    """Create a new diagram"""
    db_diagram = Diagram(
        name=diagram.name,
        description=diagram.description,
        diagram_data=diagram.diagram_data,
        created_by=diagram.created_by
    )
    db.add(db_diagram)
    db.commit()
    db.refresh(db_diagram)
    return db_diagram

@app.put("/api/diagrams/{diagram_id}", response_model=DiagramResponse)
def update_diagram(diagram_id: int, diagram: DiagramUpdate, db: Session = Depends(get_db)):
    """Update an existing diagram"""
    db_diagram = db.query(Diagram).filter(Diagram.id == diagram_id).first()
    if db_diagram is None:
        raise HTTPException(status_code=404, detail="Diagram not found")

    if diagram.name is not None:
        db_diagram.name = diagram.name
    if diagram.description is not None:
        db_diagram.description = diagram.description
    if diagram.diagram_data is not None:
        db_diagram.diagram_data = diagram.diagram_data

    db_diagram.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_diagram)
    return db_diagram

@app.delete("/api/diagrams/{diagram_id}")
def delete_diagram(diagram_id: int, db: Session = Depends(get_db)):
    """Delete a diagram"""
    db_diagram = db.query(Diagram).filter(Diagram.id == diagram_id).first()
    if db_diagram is None:
        raise HTTPException(status_code=404, detail="Diagram not found")

    db.delete(db_diagram)
    db.commit()
    return {"message": "Diagram deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
