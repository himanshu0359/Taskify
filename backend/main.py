import hmac
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pwdlib import PasswordHash
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker


def load_local_environment():
    """Load simple KEY=VALUE entries from backend/.env without overriding the OS."""
    env_file = Path(__file__).with_name(".env")
    if not env_file.exists():
        return

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip().strip("\"'")
        if name:
            os.environ.setdefault(name, value)


load_local_environment()

DATABASE_URL = "sqlite:///./taskify.db"
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
password_hash = PasswordHash.recommended()

app = FastAPI(title="Taskify API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://localhost",
        "capacitor://localhost",
    ],
    allow_origin_regex=(
        r"https?://(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|"
        r"172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    tasks = relationship(
        "Task", back_populates="owner", cascade="all, delete-orphan"
    )


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    status = Column(String, nullable=False, default="To Do")
    priority = Column(String, nullable=False, default="Medium")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    owner = relationship("User", back_populates="tasks")


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_admin(x_admin_key: Optional[str] = Header(default=None)):
    admin_key = os.getenv("TASKIFY_ADMIN_KEY")
    if not admin_key or not x_admin_key or not hmac.compare_digest(x_admin_key, admin_key):
        raise HTTPException(status_code=403, detail="Admin access denied")


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TaskRequest(BaseModel):
    user_id: int
    title: str
    status: str = "To Do"
    priority: str = "Medium"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None


def task_record(task, include_owner=False):
    record = {
        "id": task.id,
        "user_id": task.user_id,
        "title": task.title,
        "status": task.status,
        "priority": task.priority,
        "created_at": task.created_at.isoformat() if task.created_at else None,
    }
    if include_owner:
        record["user_name"] = task.owner.name
        record["user_email"] = task.owner.email
    return record


@app.get("/")
def home():
    return {"message": "Taskify Python Backend is running"}


@app.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    name = data.name.strip()
    email = str(data.email).strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if len(data.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters",
        )
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed_secret = password_hash.hash(getattr(data, "password"))
    user = User(
        name=name,
        email=email,
        **{"password": hashed_secret},
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "message": "Account created successfully",
        "user": {"id": user.id, "name": user.name, "email": user.email},
    }


@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not password_hash.verify(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "message": "Login successful",
        "user": {"id": user.id, "name": user.name, "email": user.email},
    }


@app.post("/tasks", status_code=201)
def create_task(data: TaskRequest, db: Session = Depends(get_db)):
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Task title is required")
    if data.status not in {"To Do", "In Progress", "Completed"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    if data.priority not in {"High", "Medium", "Low"}:
        raise HTTPException(status_code=400, detail="Invalid priority")
    if not db.query(User).filter(User.id == data.user_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    task = Task(
        user_id=data.user_id,
        title=title,
        status=data.status,
        priority=data.priority,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"message": "Task created", "task": task_record(task)}


@app.get("/tasks/{user_id}")
def get_user_tasks(user_id: int, db: Session = Depends(get_db)):
    return [
        task_record(task)
        for task in db.query(Task).filter(Task.user_id == user_id).order_by(Task.id).all()
    ]


@app.patch("/tasks/{task_id}")
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    updates = data.model_dump(exclude_unset=True)
    if "title" in updates:
        title = (updates["title"] or "").strip()
        if not title:
            raise HTTPException(status_code=400, detail="Task title is required")
        task.title = title
    if "status" in updates:
        if updates["status"] not in {"To Do", "In Progress", "Completed"}:
            raise HTTPException(status_code=400, detail="Invalid status")
        task.status = updates["status"]
    if "priority" in updates:
        if updates["priority"] not in {"High", "Medium", "Low"}:
            raise HTTPException(status_code=400, detail="Invalid priority")
        task.priority = updates["priority"]
    db.commit()
    db.refresh(task)
    return {"message": "Task updated", "task": task_record(task)}


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}


@app.get("/admin/users")
def admin_users(
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    users = db.query(User).order_by(User.id).all()
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "total_tasks": len(user.tasks),
        }
        for user in users
    ]


@app.get("/admin/tasks")
def admin_tasks(
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    tasks = db.query(Task).order_by(Task.id.desc()).all()
    return [task_record(task, include_owner=True) for task in tasks]


@app.get("/admin/stats")
def admin_stats(
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.status == "Completed").count()
    return {
        "total_users": db.query(User).count(),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": total_tasks - completed_tasks,
    }
