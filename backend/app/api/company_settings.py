from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..db.session import get_db
from ..models import CompanySettings
from ..schemas.company import CompanySettingsUpdate, CompanySettingsOut
from ..schemas.user import UserOut
from .auth import get_current_user

router = APIRouter()


# Admin/Superadmin check
def require_admin_or_superadmin(current_user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    """Require that the current user is an admin (role_id=1) or superadmin (role_id=2)"""
    if current_user.role_id not in [1, 2]:
        raise HTTPException(status_code=403, detail="Admin or superadmin access required")
    return current_user


@router.get("/", response_model=CompanySettingsOut)
def get_company_settings(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    """Get company settings (available to all authenticated users)"""
    # Get the first (and only) row
    settings = db.query(CompanySettings).first()

    if not settings:
        # Create default settings if none exist
        settings = CompanySettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.put("/", response_model=CompanySettingsOut)
def update_company_settings(
    settings_update: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(require_admin_or_superadmin)
):
    """Update company settings (admin/superadmin only)"""
    # Get the first (and only) row
    settings = db.query(CompanySettings).first()

    if not settings:
        # Create if doesn't exist
        settings = CompanySettings()
        db.add(settings)

    # Update fields
    update_data = settings_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)

    return settings
