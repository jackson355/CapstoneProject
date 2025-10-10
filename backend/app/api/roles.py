from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db

from app.models import Role, ActivityLog
from app.schemas.role import RoleCreate, RoleUpdate, RoleOut
from app.api.auth import get_current_user
from app.schemas.user import UserOut

def require_admin_or_superadmin(current_user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not user_role or user_role.name not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return current_user

router = APIRouter(prefix="/roles", tags=["roles"])

@router.post("/", response_model=RoleOut, dependencies=[Depends(require_admin_or_superadmin)])
def create_role(role: RoleCreate, db: Session = Depends(get_db), current_user: UserOut = Depends(get_current_user)):
    db_role = db.query(Role).filter(Role.name == role.name).first()
    if db_role:
        raise HTTPException(status_code=400, detail="Role already exists")
    new_role = Role(name=role.name)
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    # log create
    db.add(ActivityLog(
        action="role.create",
        actor_user_id=current_user.id,
        target_type="role",
        target_id=new_role.id,
        message=f"Role {new_role.name} created",
        log_metadata=None,
    ))
    db.commit()
    return new_role

@router.get("/", response_model=List[RoleOut], dependencies=[Depends(require_admin_or_superadmin)])
def read_roles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    roles = db.query(Role).offset(skip).limit(limit).all()
    return roles

@router.get("/{role_id}", response_model=RoleOut, dependencies=[Depends(require_admin_or_superadmin)])
def read_role(role_id: int, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role

@router.put("/{role_id}", response_model=RoleOut, dependencies=[Depends(require_admin_or_superadmin)])
def update_role(role_id: int, role_update: RoleUpdate, db: Session = Depends(get_db), current_user: UserOut = Depends(get_current_user)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    role.name = role_update.name
    db.commit()
    db.refresh(role)
    # log update
    db.add(ActivityLog(
        action="role.update",
        actor_user_id=current_user.id,
        target_type="role",
        target_id=role.id,
        message=f"Role {role.name} updated",
        log_metadata=None,
    ))
    db.commit()
    return role

@router.delete("/{role_id}", dependencies=[Depends(require_admin_or_superadmin)])
def delete_role(role_id: int, db: Session = Depends(get_db), current_user: UserOut = Depends(get_current_user)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    db.delete(role)
    db.commit()
    # log delete
    db.add(ActivityLog(
        action="role.delete",
        actor_user_id=current_user.id,
        target_type="role",
        target_id=role_id,
        message=f"Role {role.name} deleted",
        log_metadata=None,
    ))
    db.commit()
    return {"detail": "Role deleted"}
