from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
from pathlib import Path

from app.db.session import get_db
from app.models import Invoice, Quotation, Client, Template, User, Role, ActivityLog
from app.schemas import InvoiceCreate, InvoiceUpdate, InvoiceOut, InvoiceListItem, PaginatedInvoicesResponse, UserOut
from app.api.auth import get_current_user
from app.services.file_storage import file_storage
from app.services.quotation_filler import quotation_filler  # Reuse the same filler service
from app.services.email_scheduler import EmailScheduler

router = APIRouter(prefix="/invoices", tags=["invoices"])

# RBAC dependency for admin/superadmin access
def require_admin_or_superadmin(current_user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role or role.name not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return current_user


def generate_invoice_number(db: Session) -> str:
    """Generate a unique invoice number like INV-2025-0001"""
    current_year = datetime.now().year
    prefix = f"INV-{current_year}-"

    # Find the latest invoice number for this year
    latest = db.query(Invoice).filter(
        Invoice.invoice_number.like(f"{prefix}%")
    ).order_by(Invoice.invoice_number.desc()).first()

    if latest:
        # Extract the number part and increment
        last_number = int(latest.invoice_number.split('-')[-1])
        new_number = last_number + 1
    else:
        new_number = 1

    return f"{prefix}{new_number:04d}"


@router.get("/", response_model=PaginatedInvoicesResponse)
def list_invoices(
    page: int = Query(default=0, ge=0),
    per_page: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None, description="Search by invoice number or client name"),
    status: Optional[str] = Query(default=None),
    client_id: Optional[int] = Query(default=None),
    quotation_id: Optional[int] = Query(default=None),
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """List all invoices with pagination and filters"""
    query = db.query(Invoice)

    if search:
        term = f"%{search}%"
        # Join with Client to search by company name
        query = query.join(Client).filter(
            (Invoice.invoice_number.ilike(term)) |
            (Client.company_name.ilike(term))
        )

    if status:
        query = query.filter(Invoice.status == status)

    if client_id:
        query = query.filter(Invoice.client_id == client_id)

    if quotation_id:
        query = query.filter(Invoice.quotation_id == quotation_id)

    total = query.count()
    invoices = query.order_by(Invoice.created_at.desc()).offset(page * per_page).limit(per_page).all()

    return PaginatedInvoicesResponse(
        invoices=invoices,
        total=total,
        page=page,
        per_page=per_page
    )


@router.post("/", response_model=InvoiceOut)
def create_invoice(
    invoice_in: InvoiceCreate,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """
    Create a new invoice from an ACCEPTED quotation.
    The quotation must have status='accepted' to create an invoice.
    """
    # Verify quotation exists and is accepted
    quotation = db.query(Quotation).filter(Quotation.id == invoice_in.quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    # Check if quotation is accepted
    if quotation.status != 'accepted':
        raise HTTPException(
            status_code=400,
            detail=f"Cannot create invoice from quotation with status '{quotation.status}'. Only 'accepted' quotations can be converted to invoices."
        )

    # Get client from quotation
    client = db.query(Client).filter(Client.id == quotation.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Verify template exists
    template = db.query(Template).filter(Template.id == invoice_in.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Verify template is an invoice template
    if template.template_type != 'invoice':
        raise HTTPException(status_code=400, detail="Selected template is not an invoice template")

    # Verify template has a file
    if not template.file_path or not file_storage.file_exists(template.id):
        raise HTTPException(status_code=400, detail="Template file not found")

    # Generate invoice number
    invoice_number = generate_invoice_number(db)

    # Create invoice record - copy data from quotation
    invoice_data = {
        'invoice_number': invoice_number,
        'quotation_id': quotation.id,
        'client_id': quotation.client_id,
        'selected_contact': quotation.selected_contact,
        'template_id': invoice_in.template_id,
        'created_by': current_user.id,
        'status': 'unpaid'  # New invoices start as unpaid (payment tracking)
    }

    # Handle company info - use from invoice_in if provided, otherwise copy from quotation
    if invoice_in.my_company_info:
        invoice_data['my_company_info'] = invoice_in.my_company_info.dict()
    elif quotation.my_company_info:
        invoice_data['my_company_info'] = quotation.my_company_info

    # Handle due date - use from invoice_in if provided, otherwise copy from quotation
    if invoice_in.due_date:
        invoice_data['due_date'] = invoice_in.due_date
    elif quotation.due_date:
        invoice_data['due_date'] = quotation.due_date

    invoice = Invoice(**invoice_data)
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

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

        # Parse selected_contact - handle both dict and JSON
        if isinstance(invoice.selected_contact, dict):
            contact_data = invoice.selected_contact
        else:
            import json
            contact_data = json.loads(invoice.selected_contact) if isinstance(invoice.selected_contact, str) else invoice.selected_contact

        # Prepare company data
        company_data = {}
        if invoice.my_company_info:
            if isinstance(invoice.my_company_info, dict):
                company_data = invoice.my_company_info
            else:
                import json
                company_data = json.loads(invoice.my_company_info) if isinstance(invoice.my_company_info, str) else invoice.my_company_info

        # Fill template with client data (reuse quotation filler service)
        filled_content, unfilled_placeholders = quotation_filler.fill_template_with_client_data(
            template_content,
            client_data,
            contact_data,
            company_data
        )

        # Save filled invoice
        invoice_dir = Path("uploads/invoices")
        invoice_dir.mkdir(parents=True, exist_ok=True)

        file_path = invoice_dir / f"invoice_{invoice.id}.docx"
        with open(file_path, 'wb') as f:
            f.write(filled_content)

        # Update invoice with file info
        invoice.file_path = str(file_path)
        invoice.file_name = f"{invoice_number}_{client.company_name}.docx"
        invoice.file_size = len(filled_content)
        invoice.unfilled_placeholders = unfilled_placeholders

        db.commit()
        db.refresh(invoice)

        # Log activity
        db.add(ActivityLog(
            action="invoice.create",
            actor_user_id=current_user.id,
            target_type="invoice",
            target_id=invoice.id,
            message=f"Invoice {invoice_number} created from Quotation {quotation.quotation_number} for {client.company_name}",
            log_metadata={"quotation_id": quotation.id, "client_id": client.id, "template_id": template.id}
        ))
        db.commit()

        return invoice

    except Exception as e:
        # Clean up invoice record if file creation failed
        db.delete(invoice)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to create invoice: {str(e)}")


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Get a specific invoice by ID"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: int,
    invoice_in: InvoiceUpdate,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Update an invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Track old status for status change email trigger
    old_status = invoice.status

    update_data = invoice_in.dict(exclude_unset=True)

    # Extract send_notification_email flag (don't set it on invoice model)
    send_notification_email = update_data.pop('send_notification_email', True)

    # Handle my_company_info conversion
    if 'my_company_info' in update_data and update_data['my_company_info']:
        update_data['my_company_info'] = update_data['my_company_info'].dict()

    for key, value in update_data.items():
        setattr(invoice, key, value)

    db.commit()
    db.refresh(invoice)

    # Trigger status change email if status changed to 'paid' AND user wants notification
    new_status = invoice.status
    if send_notification_email and old_status != new_status and new_status == 'paid':
        try:
            EmailScheduler.create_status_change_email(
                db=db,
                user_id=current_user.id,
                invoice_id=invoice.id,
                old_status=old_status,
                new_status=new_status
            )
        except Exception as e:
            # Log error but don't fail the update
            print(f"Failed to create status change email: {str(e)}")

    # Log activity
    db.add(ActivityLog(
        action="invoice.update",
        actor_user_id=current_user.id,
        target_type="invoice",
        target_id=invoice.id,
        message=f"Invoice {invoice.invoice_number} updated",
        log_metadata=None
    ))
    db.commit()

    return invoice


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Delete an invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice_number = invoice.invoice_number

    # Delete the file if it exists
    if invoice.file_path and os.path.exists(invoice.file_path):
        try:
            os.remove(invoice.file_path)
        except Exception as e:
            print(f"Warning: Could not delete invoice file: {str(e)}")

    db.delete(invoice)
    db.commit()

    # Log activity
    db.add(ActivityLog(
        action="invoice.delete",
        actor_user_id=current_user.id,
        target_type="invoice",
        target_id=invoice_id,
        message=f"Invoice {invoice_number} deleted",
        log_metadata=None
    ))
    db.commit()

    return {"detail": "Invoice deleted"}


# OnlyOffice Integration Endpoints

@router.api_route("/document/{invoice_id}", methods=["GET", "HEAD"])
def get_invoice_document(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Serve invoice DOCX file for OnlyOffice editor"""
    print(f"[DEBUG] OnlyOffice Invoice Document Request - ID: {invoice_id}, Method: {request.method}")

    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if not invoice.file_path or not os.path.exists(invoice.file_path):
        raise HTTPException(status_code=404, detail="Invoice file not found")

    return FileResponse(
        path=invoice.file_path,
        filename=invoice.file_name,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


@router.post("/save/{invoice_id}")
async def save_invoice_callback(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """OnlyOffice callback endpoint for saving edited invoices"""
    print(f"[INFO] OnlyOffice save callback for invoice {invoice_id}")

    try:
        body = await request.json()
        print(f"[DEBUG] OnlyOffice callback data: {body}")

        status = body.get("status")

        if status == 2:  # Ready for saving
            download_url = body.get("url")
            if not download_url:
                return {"error": 1, "message": "No download URL provided"}

            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            if not invoice:
                return {"error": 1, "message": "Invoice not found"}

            # Download the saved document
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(download_url) as response:
                    if response.status == 200:
                        file_content = await response.read()

                        # Save the updated document
                        with open(invoice.file_path, 'wb') as f:
                            f.write(file_content)

                        invoice.file_size = len(file_content)
                        invoice.updated_at = datetime.utcnow()

                        db.commit()

                        print(f"[SUCCESS] Successfully saved invoice {invoice_id}")
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


@router.get("/onlyoffice-config/{invoice_id}")
def get_onlyoffice_config(
    invoice_id: int,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get OnlyOffice configuration for a specific invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    config = {
        "document": {
            "fileType": "docx",
            "key": f"{invoice_id}_{int(datetime.utcnow().timestamp())}",
            "title": invoice.file_name or f"{invoice.invoice_number}.docx",
            "url": f"http://host.docker.internal:8000/invoices/document/{invoice_id}",
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
            "callbackUrl": f"http://host.docker.internal:8000/invoices/save/{invoice_id}",
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


@router.get("/{invoice_id}/check-placeholders")
def check_unfilled_placeholders(
    invoice_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Check if invoice has any unfilled placeholders"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "invoice_id": invoice_id,
        "invoice_number": invoice.invoice_number,
        "unfilled_placeholders": invoice.unfilled_placeholders or [],
        "has_unfilled": bool(invoice.unfilled_placeholders)
    }
