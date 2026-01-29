from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.models import (
    EmailTemplate, EmailHistory, ScheduledEmail, Notification,
    EmailSettings, AutomationTemplate, User, Role, Quotation, Invoice
)
from app.schemas.email import (
    EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateOut,
    EmailHistoryOut, PaginatedEmailHistoryResponse,
    ScheduledEmailCreate, ScheduledEmailUpdate, ScheduledEmailOut, PaginatedScheduledEmailsResponse,
    NotificationOut, NotificationUpdate, PaginatedNotificationsResponse,
    EmailSettingsCreate, EmailSettingsUpdate, EmailSettingsOut,
    SendEmailRequest, SendEmailResponse, NotificationBase,
    AutomationTemplateOut, SaveAutomationTemplatesRequest, AutomationTemplatesResponse
)
from app.schemas import UserOut
from app.api.auth import get_current_user
from app.services.email_service import EmailService
from app.services.email_scheduler import EmailScheduler
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/emails", tags=["emails"])

# RBAC dependency for admin/superadmin access
def require_admin_or_superadmin(current_user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role or role.name not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return current_user


# ==================== EMAIL TEMPLATES ====================

@router.get("/templates", response_model=List[EmailTemplateOut])
def list_email_templates(
    template_type: Optional[str] = Query(default=None),
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """List all email templates"""
    query = db.query(EmailTemplate)

    if template_type:
        query = query.filter(EmailTemplate.template_type == template_type)

    templates = query.order_by(EmailTemplate.created_at.desc()).all()
    return templates


@router.get("/templates/{template_id}", response_model=EmailTemplateOut)
def get_email_template(
    template_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Get a specific email template"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
    return template


@router.post("/templates", response_model=EmailTemplateOut)
def create_email_template(
    template_in: EmailTemplateCreate,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Create a new email template"""
    template = EmailTemplate(
        **template_in.model_dump(),
        created_by=current_user.id
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.put("/templates/{template_id}", response_model=EmailTemplateOut)
def update_email_template(
    template_id: int,
    template_in: EmailTemplateUpdate,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Update an email template"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")

    update_data = template_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(template, field, value)

    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}")
def delete_email_template(
    template_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Delete an email template"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")

    db.delete(template)
    db.commit()
    return {"message": "Email template deleted successfully"}


# ==================== SEND EMAIL ====================

@router.post("/send", response_model=SendEmailResponse)
def send_email(
    email_request: SendEmailRequest,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Send an email immediately"""
    success, error_message, email_history_id = EmailService.send_document_email(
        db=db,
        user_id=current_user.id,
        email_request=email_request
    )

    if success:
        # Create notification
        NotificationService.create_email_sent_notification(
            db=db,
            user_id=current_user.id,
            recipient_email=email_request.recipient_email,
            email_history_id=email_history_id
        )

        return SendEmailResponse(
            success=True,
            message="Email sent successfully",
            email_history_id=email_history_id
        )
    else:
        # Create failure notification
        NotificationService.create_email_failed_notification(
            db=db,
            user_id=current_user.id,
            recipient_email=email_request.recipient_email,
            error_message=error_message
        )

        return SendEmailResponse(
            success=False,
            message=error_message,
            email_history_id=email_history_id
        )


# ==================== EMAIL HISTORY ====================

@router.get("/history", response_model=PaginatedEmailHistoryResponse)
def list_email_history(
    page: int = Query(default=0, ge=0),
    per_page: int = Query(default=10, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    quotation_id: Optional[int] = Query(default=None),
    invoice_id: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None),
    document_type: Optional[str] = Query(default=None),
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """List email history with pagination and filters"""
    query = db.query(EmailHistory)

    if status:
        query = query.filter(EmailHistory.status == status)

    if quotation_id:
        query = query.filter(EmailHistory.quotation_id == quotation_id)

    if invoice_id:
        query = query.filter(EmailHistory.invoice_id == invoice_id)

    if search:
        # Search by recipient email or subject
        query = query.filter(
            (EmailHistory.recipient_email.ilike(f"%{search}%")) |
            (EmailHistory.subject.ilike(f"%{search}%"))
        )

    if document_type:
        query = query.filter(EmailHistory.document_type == document_type)

    total = query.count()
    emails = query.order_by(EmailHistory.sent_at.desc()).offset(page * per_page).limit(per_page).all()

    return PaginatedEmailHistoryResponse(
        emails=emails,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/history/{email_id}", response_model=EmailHistoryOut)
def get_email_history(
    email_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Get a specific email from history"""
    email = db.query(EmailHistory).filter(EmailHistory.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email


# ==================== SCHEDULED EMAILS ====================

@router.get("/scheduled", response_model=PaginatedScheduledEmailsResponse)
def list_scheduled_emails(
    page: int = Query(default=0, ge=0),
    per_page: int = Query(default=10, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    trigger_type: Optional[str] = Query(default=None),
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """List scheduled emails with pagination and filters"""
    query = db.query(ScheduledEmail)

    if status:
        query = query.filter(ScheduledEmail.status == status)

    if trigger_type:
        query = query.filter(ScheduledEmail.trigger_type == trigger_type)

    total = query.count()
    scheduled_emails = query.order_by(ScheduledEmail.scheduled_time.desc()).offset(page * per_page).limit(per_page).all()

    return PaginatedScheduledEmailsResponse(
        scheduled_emails=scheduled_emails,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/scheduled/{scheduled_email_id}", response_model=ScheduledEmailOut)
def get_scheduled_email(
    scheduled_email_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Get a specific scheduled email"""
    scheduled_email = db.query(ScheduledEmail).filter(ScheduledEmail.id == scheduled_email_id).first()
    if not scheduled_email:
        raise HTTPException(status_code=404, detail="Scheduled email not found")
    return scheduled_email


@router.post("/scheduled", response_model=ScheduledEmailOut)
def create_scheduled_email(
    scheduled_email_in: ScheduledEmailCreate,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Schedule an email for later sending"""
    # Use mode='json' to automatically convert datetime to ISO strings
    data = scheduled_email_in.model_dump(mode='json')

    scheduled_email = ScheduledEmail(
        **data,
        created_by=current_user.id
    )
    db.add(scheduled_email)
    db.commit()
    db.refresh(scheduled_email)

    # Create notification
    NotificationService.create_email_scheduled_notification(
        db=db,
        user_id=current_user.id,
        recipient_email=scheduled_email.recipient_email,
        scheduled_time=scheduled_email.scheduled_time,
        scheduled_email_id=scheduled_email.id
    )

    return scheduled_email


@router.put("/scheduled/{scheduled_email_id}", response_model=ScheduledEmailOut)
def update_scheduled_email(
    scheduled_email_id: int,
    scheduled_email_in: ScheduledEmailUpdate,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Update a scheduled email"""
    scheduled_email = db.query(ScheduledEmail).filter(ScheduledEmail.id == scheduled_email_id).first()
    if not scheduled_email:
        raise HTTPException(status_code=404, detail="Scheduled email not found")

    # Use mode='json' to automatically convert datetime to ISO strings
    update_data = scheduled_email_in.model_dump(exclude_unset=True, mode='json')

    for field, value in update_data.items():
        setattr(scheduled_email, field, value)

    db.commit()
    db.refresh(scheduled_email)
    return scheduled_email


@router.delete("/scheduled/{scheduled_email_id}")
def cancel_scheduled_email(
    scheduled_email_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Cancel a scheduled email"""
    scheduled_email = db.query(ScheduledEmail).filter(ScheduledEmail.id == scheduled_email_id).first()
    if not scheduled_email:
        raise HTTPException(status_code=404, detail="Scheduled email not found")

    scheduled_email.status = 'cancelled'
    db.commit()
    return {"message": "Scheduled email cancelled successfully"}


# ==================== NOTIFICATIONS ====================

@router.get("/notifications", response_model=PaginatedNotificationsResponse)
def list_notifications(
    page: int = Query(default=0, ge=0),
    per_page: int = Query(default=10, ge=1, le=100),
    is_read: Optional[bool] = Query(default=None),
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List notifications for current user"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)

    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()

    # Sort: unread first (is_read=False), then by newest (created_at DESC)
    notifications = query.order_by(Notification.is_read.asc(), Notification.created_at.desc()).offset(page * per_page).limit(per_page).all()

    return PaginatedNotificationsResponse(
        notifications=notifications,
        total=total,
        page=page,
        per_page=per_page,
        unread_count=unread_count
    )


@router.get("/notifications/unread-count")
def get_unread_notifications_count(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    count = NotificationService.get_unread_count(db, current_user.id)
    return {"unread_count": count}


@router.put("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_as_read(
    notification_id: int,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    notification = NotificationService.mark_as_read(db, notification_id, current_user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification


@router.put("/notifications/mark-all-read")
def mark_all_notifications_as_read(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    count = NotificationService.mark_all_as_read(db, current_user.id)
    return {"message": f"Marked {count} notifications as read"}


@router.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""
    success = NotificationService.delete_notification(db, notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted successfully"}


# ==================== EMAIL SETTINGS ====================

@router.get("/settings", response_model=EmailSettingsOut)
def get_email_settings(
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Get email settings for current user or organization"""
    settings = EmailService.get_email_settings(db, current_user.id)
    if not settings:
        raise HTTPException(status_code=404, detail="Email settings not configured")
    return settings


@router.post("/settings", response_model=EmailSettingsOut)
def create_email_settings(
    settings_in: EmailSettingsCreate,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Create email settings"""
    # Check if settings already exist for this user
    existing = db.query(EmailSettings).filter(
        EmailSettings.user_id == settings_in.user_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email settings already exist for this user")

    settings = EmailSettings(**settings_in.model_dump())
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


@router.put("/settings/{settings_id}", response_model=EmailSettingsOut)
def update_email_settings(
    settings_id: int,
    settings_in: EmailSettingsUpdate,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Update email settings"""
    settings = db.query(EmailSettings).filter(EmailSettings.id == settings_id).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Email settings not found")

    update_data = settings_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings


@router.delete("/settings/{settings_id}")
def delete_email_settings(
    settings_id: int,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Delete email settings"""
    settings = db.query(EmailSettings).filter(EmailSettings.id == settings_id).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Email settings not found")

    db.delete(settings)
    db.commit()
    return {"message": "Email settings deleted successfully"}


# ==================== UTILITY ENDPOINTS ====================

@router.post("/process-scheduled")
def process_scheduled_emails_endpoint(
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Manually trigger processing of scheduled emails (for testing)"""
    count = EmailScheduler.process_scheduled_emails(db)
    return {"message": f"Processed {count} scheduled emails"}


@router.post("/check-deadline-reminders")
def check_deadline_reminders_endpoint(
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Manually trigger deadline reminder check (for testing)"""
    count = EmailScheduler.check_deadline_reminders(db)
    return {"message": f"Created {count} deadline reminders"}


# Automation Templates
@router.get("/automation-templates", response_model=AutomationTemplatesResponse)
def get_automation_templates(
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Get all automation templates"""
    templates = db.query(AutomationTemplate).all()
    return {"templates": templates}


@router.post("/automation-templates", response_model=AutomationTemplatesResponse)
def save_automation_templates(
    request: SaveAutomationTemplatesRequest,
    current_user: UserOut = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    """Save or update automation templates"""
    saved_templates = []

    for template_data in request.templates:
        trigger_event = template_data.get('trigger_event')

        # Check if template already exists
        existing_template = db.query(AutomationTemplate).filter(
            AutomationTemplate.trigger_event == trigger_event
        ).first()

        if existing_template:
            # Update existing template
            existing_template.trigger_type = template_data.get('trigger_type', existing_template.trigger_type)
            existing_template.subject = template_data.get('subject', existing_template.subject)
            existing_template.body = template_data.get('body', existing_template.body)
            existing_template.is_enabled = template_data.get('is_enabled', existing_template.is_enabled)
            saved_templates.append(existing_template)
        else:
            # Create new template
            new_template = AutomationTemplate(
                trigger_type=template_data['trigger_type'],
                trigger_event=trigger_event,
                subject=template_data['subject'],
                body=template_data['body'],
                is_enabled=template_data.get('is_enabled', True)
            )
            db.add(new_template)
            saved_templates.append(new_template)

    db.commit()

    # Refresh all templates to get updated values
    for template in saved_templates:
        db.refresh(template)

    return {"templates": saved_templates}
