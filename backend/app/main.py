from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth import auth_router
from app.api import users
from app.api import roles
from app.api import clients
from app.api import partners
from app.api import templates
from app.api import quotations
from app.api import invoices
from app.api import emails
from app.api import company_settings
from app.api import dashboard
from app.db.session import get_db
from app.models import ActivityLog
from sqlalchemy.orm import Session
from app.background_jobs import start_background_jobs, shutdown_background_jobs

app = FastAPI()

# Startup and shutdown events for background jobs
@app.on_event("startup")
def on_startup():
    """Start background jobs when the app starts"""
    start_background_jobs()

@app.on_event("shutdown")
def on_shutdown():
    """Shutdown background jobs when the app stops"""
    shutdown_background_jobs()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js frontend
        "http://localhost:8080",  # OnlyOffice Document Server
        "*"  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # Expose Content-Disposition for file downloads
)

# Include authentication router
app.include_router(auth_router, prefix="/auth")

app.include_router(users.router)
app.include_router(roles.router)
app.include_router(clients.router)
app.include_router(partners.router)
app.include_router(templates.router)
app.include_router(quotations.router)
app.include_router(invoices.router)
app.include_router(emails.router)
app.include_router(company_settings.router, prefix="/company-settings", tags=["company-settings"])
app.include_router(dashboard.router)

@app.get("/")
def read_root():
    return {"message": "Hello World"}

# Simple read-only Activity Logs endpoint for admins/superadmins (v1)
from fastapi import Depends, HTTPException, Query
from typing import Optional, List
from app.api.auth import get_current_user
from app.schemas.user import UserOut
from app.models import User, Role

@app.get("/activity-logs")
def get_activity_logs(
    page: int = Query(default=0, ge=0),
    per_page: int = Query(default=10, ge=1, le=100),
    action: Optional[str] = Query(default=None),
    actor_user_id: Optional[int] = Query(default=None),
    target_type: Optional[str] = Query(default=None),
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # RBAC: only admin/superadmin
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role or role.name not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = db.query(ActivityLog)
    if action:
        query = query.filter(ActivityLog.action == action)
    if actor_user_id is not None:
        query = query.filter(ActivityLog.actor_user_id == actor_user_id)
    if target_type:
        query = query.filter(ActivityLog.target_type == target_type)

    total = query.count()
    logs = query.order_by(ActivityLog.created_at.desc()).offset(page * per_page).limit(per_page).all()

    # Return as raw dicts for now (could add Pydantic schema later)
    return {
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "actor_user_id": log.actor_user_id,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "message": log.message,
                "metadata": log.log_metadata,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }