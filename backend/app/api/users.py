from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, get_db
from app.models import User, Role, ActivityLog
from app.schemas import UserCreate, UserUpdate, UserOut
from app.schemas.role import RoleOut
from passlib.context import CryptContext
from app.api.auth import get_current_user
from typing import List, Optional
from pydantic import BaseModel

class PaginatedUsersResponse(BaseModel):
    users: List[UserOut]
    total: int
    page: int
    per_page: int

def require_admin_or_superadmin(current_user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role or role.name not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return current_user

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=PaginatedUsersResponse)
def list_users(
    page: int = Query(default=0, ge=0),
    per_page: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None, description="Search by name or email"),
    role_id: Optional[int] = Query(default=None),  # NEW
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get current user's role to determine access
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    current_role = db.query(Role).filter(Role.id == user.role_id).first()
    if not current_role:
        raise HTTPException(status_code=403, detail="Role not found")
    
    # Check permissions and apply role-based filtering
    query = db.query(User)
    
    if current_role.name == "superadmin":
        # Superadmin can see all users except themselves
        query = query.filter(User.id != current_user.id)
    elif current_role.name == "admin":
        # Admin can only see users with "user" role, exclude themselves
        user_role = db.query(Role).filter(Role.name == "user").first()
        if user_role:
            query = query.filter(User.role_id == user_role.id).filter(User.id != current_user.id)
        else:
            # If no "user" role exists, return empty
            return PaginatedUsersResponse(users=[], total=0, page=page, per_page=per_page)
    else:
        # Regular users have no access
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    if search:
        term = f"%{search}%"
        query = query.filter((User.name.ilike(term)) | (User.email.ilike(term)))

    if role_id is not None:  # NEW
        query = query.filter(User.role_id == role_id)

    total = query.count()
    users = query.offset(page * per_page).limit(per_page).all()
    return PaginatedUsersResponse(users=users, total=total, page=page, per_page=per_page)

@router.post("/", response_model=UserOut, dependencies=[Depends(require_admin_or_superadmin)])
def create_user(user_in: UserCreate, db: Session = Depends(get_db), current_user: UserOut = Depends(get_current_user)):
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    user_data = user_in.dict()
    user_data["password"] = get_password_hash(user_data["password"])
    user = User(**user_data)
    db.add(user)
    db.commit()
    db.refresh(user)
    # log create
    db.add(ActivityLog(
        action="user.create",
        actor_user_id=current_user.id,
        target_type="user",
        target_id=user.id,
        message=f"User {user.name} created",
        log_metadata=None,
    ))
    db.commit()
    return user

@router.get("/{user_id}", response_model=UserOut, dependencies=[Depends(require_admin_or_superadmin)])
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserOut, dependencies=[Depends(require_admin_or_superadmin)])
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db), current_user: UserOut = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Check if email is being updated and if it already exists for another user
    if user_in.email is not None and user_in.email != user.email:
        existing_user = db.query(User).filter(User.email == user_in.email, User.id != user_id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")
    update_data = user_in.dict(exclude_unset=True, exclude={"role_id", "password"})
    for key, value in update_data.items():
        setattr(user, key, value)
    if user_in.password is not None:
        user.password = get_password_hash(user_in.password)
    if user_in.role_id is not None:
        role = db.query(Role).filter(Role.id == user_in.role_id).first()
        if not role:
            raise HTTPException(status_code=400, detail="Role not found")
        user.role_id = role.id
    db.commit()
    db.refresh(user)
    db.add(ActivityLog(
        action="user.update",
        actor_user_id=current_user.id,
        target_type="user",
        target_id=user.id,
        message=f"User {user.name} updated",
        log_metadata=None,
    ))
    db.commit()
    return user

@router.delete("/{user_id}", dependencies=[Depends(require_admin_or_superadmin)])
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: UserOut = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    deleted_user_id = user.id
    deleted_user_name = user.name
    db.delete(user)
    db.commit()
    # log delete
    db.add(ActivityLog(
        action="user.delete",
        actor_user_id=current_user.id,
        target_type="user",
        target_id=deleted_user_id,
        message=f"User {deleted_user_name} deleted",
        log_metadata=None,
    ))
    db.commit()
    return {"detail": "User deleted"}