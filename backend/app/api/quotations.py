from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
from pathlib import Path

from app.db.session import get_db
from app.models import Quotation, Client, Template, User, Role, ActivityLog, Invoice
from app.schemas import QuotationCreate, QuotationUpdate, QuotationOut, QuotationListItem, PaginatedQuotationsResponse, UserOut
from app.api.auth import get_current_user
from app.services.file_storage import file_storage
from app.services.quotation_filler import quotation_filler
from app.services.email_scheduler import EmailScheduler

router = APIRouter(prefix="/quotations", tags=["quotations"])

# RBAC dependency for admin/superadmin access
def require_admin_or_superadmin(current_user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role or role.name not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return current_user


def generate_quotation_number(db: Session) -> str:
    """Generate a unique quotation number like Q-2025-0001"""
    current_year = datetime.now().year
    prefix = f"Q-{current_year}-"

    # Find the latest quotation number for this year
    latest = db.query(Quotation).filter(
        Quotation.quotation_number.like(f"{prefix}%")
    ).order_by(Quotation.quotation_number.desc()).first()

    if latest:
        # Extract the number part and increment
        last_number = int(latest.quotation_number.split('-')[-1])
        new_number = last_number + 1
    else:
        new_number = 1

    return f"{prefix}{new_number:04d}"


@router.get("/", response_model=PaginatedQuotationsResponse)
def list_quotations(
    page: int = Query(default=0, ge=0),
    per_page: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None, description="Search by quotation number or client name"),
    status: Optional[str] = Query(default=None),
    client_id: Optional[int] = Query(default=None),
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """List all quotations with pagination and filters"""
    query = db.query(Quotation)

    if search:
        term = f"%{search}%"
        # Join with Client to search by company name
        query = query.join(Client).filter(
            (Quotation.quotation_number.ilike(term)) |
            (Client.company_name.ilike(term))
        )

    if status:
        query = query.filter(Quotation.status == status)

    if client_id:
        query = query.filter(Quotation.client_id == client_id)

    total = query.count()
    quotations = query.order_by(Quotation.created_at.desc()).offset(page * per_page).limit(per_page).all()

    return PaginatedQuotationsResponse(
        quotations=quotations,
        total=total,
        page=page,
        per_page=per_page
    )


@router.post("/", response_model=QuotationOut)
def create_quotation(
    quotation_in: QuotationCreate,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """
    Create a new quotation by selecting a client, contact, and template.
    Automatically fills the template with client data.
    """
    # Verify client exists
    client = db.query(Client).filter(Client.id == quotation_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Verify template exists
    template = db.query(Template).filter(Template.id == quotation_in.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Verify template is a quotation template
    if template.template_type != 'quotation':
        raise HTTPException(status_code=400, detail="Selected template is not a quotation template")

    # Verify template has a file
    if not template.file_path or not file_storage.file_exists(template.id):
        raise HTTPException(status_code=400, detail="Template file not found")

    # Generate quotation number
    quotation_number = generate_quotation_number(db)

    # Create quotation record
    quotation_data = quotation_in.dict()
    quotation_data['quotation_number'] = quotation_number
    quotation_data['created_by'] = current_user.id
    quotation_data['selected_contact'] = quotation_in.selected_contact.dict()

    # Handle company info
    if quotation_in.my_company_info:
        quotation_data['my_company_info'] = quotation_in.my_company_info.dict()

    quotation = Quotation(**quotation_data)
    db.add(quotation)
    db.commit()
    db.refresh(quotation)

    try:
        # Get template content
        template_content = file_storage.get_docx_content(template.id)

        # Prepare client data for placeholder filling
        client_data = {
            'company_name': client.company_name,
            'uen': client.uen,
            'industry': client.industry,
            'address': client.address,
            'postal_code': client.postal_code
        }

        contact_data = quotation_in.selected_contact.dict()

        # Prepare company data
        company_data = {}
        if quotation_in.my_company_info:
            company_data = quotation_in.my_company_info.dict()

        # Fill template with client data
        filled_content, unfilled_placeholders = quotation_filler.fill_template_with_client_data(
            template_content,
            client_data,
            contact_data,
            company_data
        )

        # Save filled quotation
        quotation_dir = Path("uploads/quotations")
        quotation_dir.mkdir(parents=True, exist_ok=True)

        file_path = quotation_dir / f"quotation_{quotation.id}.docx"
        with open(file_path, 'wb') as f:
            f.write(filled_content)

        # Update quotation with file info
        quotation.file_path = str(file_path)
        quotation.file_name = f"{quotation_number}_{client.company_name}.docx"
        quotation.file_size = len(filled_content)
        quotation.unfilled_placeholders = unfilled_placeholders

        db.commit()
        db.refresh(quotation)

        # Log activity
        db.add(ActivityLog(
            action="quotation.create",
            actor_user_id=current_user.id,
            target_type="quotation",
            target_id=quotation.id,
            message=f"Quotation {quotation_number} created for {client.company_name}",
            log_metadata={"client_id": client.id, "template_id": template.id}
        ))
        db.commit()

        return quotation

    except Exception as e:
        # Clean up quotation record if file creation failed
        db.delete(quotation)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to create quotation: {str(e)}")


@router.get("/{quotation_id}", response_model=QuotationOut)
def get_quotation(
    quotation_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Get a specific quotation by ID"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation


@router.put("/{quotation_id}", response_model=QuotationOut)
def update_quotation(
    quotation_id: int,
    quotation_in: QuotationUpdate,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Update a quotation"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    # Track old status for status change email trigger
    old_status = quotation.status

    update_data = quotation_in.dict(exclude_unset=True)

    # Extract send_notification_email flag (don't set it on quotation model)
    send_notification_email = update_data.pop('send_notification_email', True)

    # Handle selected_contact conversion
    if 'selected_contact' in update_data and update_data['selected_contact']:
        update_data['selected_contact'] = update_data['selected_contact'].dict()

    # Handle my_company_info conversion
    if 'my_company_info' in update_data and update_data['my_company_info']:
        update_data['my_company_info'] = update_data['my_company_info'].dict()

    for key, value in update_data.items():
        setattr(quotation, key, value)

    db.commit()
    db.refresh(quotation)

    # Trigger status change email if status changed AND user wants notification
    new_status = quotation.status
    if send_notification_email and old_status != new_status and new_status in ['accepted', 'rejected']:
        try:
            EmailScheduler.create_status_change_email(
                db=db,
                user_id=current_user.id,
                quotation_id=quotation.id,
                old_status=old_status,
                new_status=new_status
            )
        except Exception as e:
            # Log error but don't fail the update
            print(f"Failed to create status change email: {str(e)}")

    # Log activity
    db.add(ActivityLog(
        action="quotation.update",
        actor_user_id=current_user.id,
        target_type="quotation",
        target_id=quotation.id,
        message=f"Quotation {quotation.quotation_number} updated",
        log_metadata=None
    ))
    db.commit()

    return quotation


@router.delete("/{quotation_id}")
def delete_quotation(
    quotation_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Delete a quotation"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    # Check if quotation is being used by any invoices
    invoices_using_quotation = db.query(Invoice).filter(Invoice.quotation_id == quotation_id).all()

    # If quotation is in use, prevent deletion
    if invoices_using_quotation:
        error_details = {
            "message": "Cannot delete quotation because it is currently being used by invoices",
            "quotation_number": quotation.quotation_number,
            "usage": {
                "invoices": [
                    {
                        "id": inv.id,
                        "invoice_number": inv.invoice_number,
                        "created_at": inv.created_at.isoformat()
                    }
                    for inv in invoices_using_quotation
                ]
            }
        }
        raise HTTPException(status_code=400, detail=error_details)

    quotation_number = quotation.quotation_number

    # Delete the file if it exists
    if quotation.file_path and os.path.exists(quotation.file_path):
        try:
            os.remove(quotation.file_path)
        except Exception as e:
            print(f"Warning: Could not delete quotation file: {str(e)}")

    db.delete(quotation)
    db.commit()

    # Log activity
    db.add(ActivityLog(
        action="quotation.delete",
        actor_user_id=current_user.id,
        target_type="quotation",
        target_id=quotation_id,
        message=f"Quotation {quotation_number} deleted",
        log_metadata=None
    ))
    db.commit()

    return {"detail": "Quotation deleted"}


# OnlyOffice Integration Endpoints

@router.api_route("/document/{quotation_id}", methods=["GET", "HEAD"])
def get_quotation_document(
    quotation_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Serve quotation DOCX file for OnlyOffice editor"""
    print(f"[DEBUG] OnlyOffice Quotation Document Request - ID: {quotation_id}, Method: {request.method}")

    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    if not quotation.file_path or not os.path.exists(quotation.file_path):
        raise HTTPException(status_code=404, detail="Quotation file not found")

    return FileResponse(
        path=quotation.file_path,
        filename=quotation.file_name,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


@router.post("/save/{quotation_id}")
async def save_quotation_callback(
    quotation_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """OnlyOffice callback endpoint for saving edited quotations"""
    print(f"[INFO] OnlyOffice save callback for quotation {quotation_id}")

    try:
        body = await request.json()
        print(f"[DEBUG] OnlyOffice callback data: {body}")

        status = body.get("status")

        if status == 2:  # Ready for saving
            download_url = body.get("url")
            if not download_url:
                return {"error": 1, "message": "No download URL provided"}

            quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
            if not quotation:
                return {"error": 1, "message": "Quotation not found"}

            # Download the saved document
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(download_url) as response:
                    if response.status == 200:
                        file_content = await response.read()

                        # Save the updated document
                        with open(quotation.file_path, 'wb') as f:
                            f.write(file_content)

                        quotation.file_size = len(file_content)
                        quotation.updated_at = datetime.utcnow()

                        db.commit()

                        print(f"[SUCCESS] Successfully saved quotation {quotation_id}")
                        return {"error": 0}
                    else:
                        return {"error": 1, "message": f"Failed to download document: {response.status}"}

        elif status == 1:  # Still editing
            return {"error": 0}
        elif status == 4:  # Closed without changes
            return {"error": 0}
        else:
            return {"error": 0}

    except Exception as e:
        print(f"[ERROR] Error in save callback: {e}")
        import traceback
        traceback.print_exc()
        return {"error": 1, "message": str(e)}


@router.get("/onlyoffice-config/{quotation_id}")
def get_onlyoffice_config(
    quotation_id: int,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get OnlyOffice configuration for a specific quotation"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    config = {
        "document": {
            "fileType": "docx",
            "key": f"{quotation_id}_{int(datetime.utcnow().timestamp())}",
            "title": quotation.file_name or f"{quotation.quotation_number}.docx",
            "url": f"http://host.docker.internal:8000/quotations/document/{quotation_id}",
            "permissions": {
                "edit": True,
                "download": True,
                "print": True,
                "review": True,
                "comment": True
            }
        },
        "documentType": "word",
        "editorConfig": {
            "callbackUrl": f"http://host.docker.internal:8000/quotations/save/{quotation_id}",
            "mode": "edit",
            "lang": "en",
            "user": {
                "id": str(current_user.id),
                "name": current_user.name,
                "group": "editors"
            },
            "customization": {
                "autosave": True,
                "forcesave": True
            }
        },
        "height": "100%",
        "width": "100%"
    }

    return config


@router.get("/{quotation_id}/check-placeholders")
def check_unfilled_placeholders(
    quotation_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Check if quotation has any unfilled placeholders"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    return {
        "quotation_id": quotation_id,
        "quotation_number": quotation.quotation_number,
        "unfilled_placeholders": quotation.unfilled_placeholders or [],
        "has_unfilled": bool(quotation.unfilled_placeholders)
    }
