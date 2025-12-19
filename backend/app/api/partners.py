from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import os
import shutil
from pathlib import Path

from app.db.session import get_db
from app.models import Partner, User, Role, ActivityLog, Client
from app.schemas import PartnerOut, UserOut
from app.api.auth import get_current_user

class PaginatedPartnersResponse(BaseModel):
    partners: List[PartnerOut]
    total: int
    page: int
    per_page: int

router = APIRouter(prefix="/partners", tags=["partners"])

# Upload directory for partner contracts
UPLOAD_DIR = Path("uploads/partner_contracts")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Reuse RBAC dependency
def require_admin_or_superadmin(current_user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role or role.name not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return current_user

@router.get("/", response_model=PaginatedPartnersResponse, dependencies=[Depends(require_admin_or_superadmin)])
def list_partners(
    page: int = Query(default=0, ge=0),
    per_page: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None, description="Search by company name, contact person, email, or phone"),
    db: Session = Depends(get_db)
):
    query = db.query(Partner)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (Partner.company_name.ilike(term)) |
            (Partner.contact_person_name.ilike(term)) |
            (Partner.email_address.ilike(term)) |
            (Partner.phone_number.ilike(term))
        )
    total = query.count()
    partners = query.offset(page * per_page).limit(per_page).all()
    return PaginatedPartnersResponse(partners=partners, total=total, page=page, per_page=per_page)

@router.post("/", response_model=PartnerOut, dependencies=[Depends(require_admin_or_superadmin)])
async def create_partner(
    company_name: str = Form(...),
    contact_person_name: str = Form(...),
    phone_number: Optional[str] = Form(None),
    email_address: Optional[str] = Form(None),
    contract_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    # Check if email already exists
    if email_address:
        existing = db.query(Partner).filter(Partner.email_address == email_address).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Email {email_address} already exists")

    partner_data = {
        "company_name": company_name,
        "contact_person_name": contact_person_name,
        "phone_number": phone_number,
        "email_address": email_address,
    }

    # Handle file upload
    if contract_file:
        # Validate file type
        allowed_types = ["application/pdf", "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
        if contract_file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only PDF and Word documents are allowed")

        # Generate unique filename
        file_ext = os.path.splitext(contract_file.filename)[1]
        file_name = f"partner_{company_name.replace(' ', '_')}_{contract_file.filename}"
        file_path = UPLOAD_DIR / file_name

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(contract_file.file, buffer)

        partner_data.update({
            "contract_file_path": str(file_path.absolute()),
            "contract_file_name": contract_file.filename,
            "contract_file_size": os.path.getsize(file_path),
            "contract_mime_type": contract_file.content_type
        })

    partner = Partner(**partner_data)
    db.add(partner)
    db.commit()
    db.refresh(partner)

    # Log activity
    db.add(ActivityLog(
        action="partner.create",
        actor_user_id=current_user.id,
        target_type="partner",
        target_id=partner.id,
        message=f"Partner {partner.company_name} created",
        log_metadata=None,
    ))
    db.commit()
    return partner

@router.get("/{partner_id}", response_model=PartnerOut, dependencies=[Depends(require_admin_or_superadmin)])
def read_partner(partner_id: int, db: Session = Depends(get_db)):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner

@router.put("/{partner_id}", response_model=PartnerOut, dependencies=[Depends(require_admin_or_superadmin)])
async def update_partner(
    partner_id: int,
    company_name: Optional[str] = Form(None),
    contact_person_name: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    email_address: Optional[str] = Form(None),
    contract_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user)
):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Check if email already exists in another partner
    if email_address and email_address != partner.email_address:
        existing = db.query(Partner).filter(
            Partner.email_address == email_address,
            Partner.id != partner_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Email {email_address} already exists")

    # Update basic fields
    if company_name is not None:
        partner.company_name = company_name
    if contact_person_name is not None:
        partner.contact_person_name = contact_person_name
    if phone_number is not None:
        partner.phone_number = phone_number
    if email_address is not None:
        partner.email_address = email_address

    # Handle file upload (replace old file)
    if contract_file:
        # Validate file type
        allowed_types = ["application/pdf", "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
        if contract_file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only PDF and Word documents are allowed")

        # Delete old file if exists
        if partner.contract_file_path and os.path.exists(partner.contract_file_path):
            os.remove(partner.contract_file_path)

        # Save new file
        file_ext = os.path.splitext(contract_file.filename)[1]
        file_name = f"partner_{partner.company_name.replace(' ', '_')}_{contract_file.filename}"
        file_path = UPLOAD_DIR / file_name

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(contract_file.file, buffer)

        partner.contract_file_path = str(file_path.absolute())
        partner.contract_file_name = contract_file.filename
        partner.contract_file_size = os.path.getsize(file_path)
        partner.contract_mime_type = contract_file.content_type

    db.commit()
    db.refresh(partner)

    # Log activity
    db.add(ActivityLog(
        action="partner.update",
        actor_user_id=current_user.id,
        target_type="partner",
        target_id=partner.id,
        message=f"Partner {partner.company_name} updated",
        log_metadata=None,
    ))
    db.commit()
    return partner

@router.delete("/{partner_id}", dependencies=[Depends(require_admin_or_superadmin)])
def delete_partner(partner_id: int, db: Session = Depends(get_db), current_user: UserOut = Depends(get_current_user)):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Check if any clients are assigned to this partner
    clients_count = db.query(Client).filter(Client.partner_id == partner_id).count()
    if clients_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete partner. There are {clients_count} client(s) assigned to this partner. Please remove the partner assignment from all clients before deleting."
        )

    pid = partner.id
    pname = partner.company_name

    # Delete contract file if exists
    if partner.contract_file_path and os.path.exists(partner.contract_file_path):
        os.remove(partner.contract_file_path)

    db.delete(partner)
    db.commit()

    # Log activity
    db.add(ActivityLog(
        action="partner.delete",
        actor_user_id=current_user.id,
        target_type="partner",
        target_id=pid,
        message=f"Partner {pname} deleted",
        log_metadata=None,
    ))
    db.commit()
    return {"detail": "Partner deleted"}

@router.get("/{partner_id}/contract", dependencies=[Depends(require_admin_or_superadmin)])
def download_contract(partner_id: int, db: Session = Depends(get_db)):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    if not partner.contract_file_path or not os.path.exists(partner.contract_file_path):
        raise HTTPException(status_code=404, detail="Contract file not found")

    response = FileResponse(
        path=partner.contract_file_path,
        filename=partner.contract_file_name,
        media_type=partner.contract_mime_type
    )
    # Explicitly set Content-Disposition header to force download
    response.headers["Content-Disposition"] = f'attachment; filename="{partner.contract_file_name}"'
    return response
