from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# Email Template Schemas
class EmailTemplateBase(BaseModel):
    name: str
    subject: str
    body: str
    template_type: str  # 'quotation', 'invoice', 'general'
    variables: Optional[List[str]] = None
    is_default: bool = False

class EmailTemplateCreate(EmailTemplateBase):
    pass

class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    template_type: Optional[str] = None
    variables: Optional[List[str]] = None
    is_default: Optional[bool] = None

class EmailTemplateOut(BaseModel):
    id: int
    name: str
    subject: str
    body: str
    template_type: str
    variables: Optional[List[str]] = None
    is_default: bool
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Email History Schemas
class EmailHistoryBase(BaseModel):
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    subject: str
    body: str
    quotation_id: Optional[int] = None
    invoice_id: Optional[int] = None
    email_template_id: Optional[int] = None
    attachments: Optional[List[str]] = None

class EmailHistoryCreate(EmailHistoryBase):
    pass

class EmailHistoryOut(BaseModel):
    id: int
    recipient_email: str
    recipient_name: Optional[str] = None
    subject: str
    body: str
    quotation_id: Optional[int] = None
    invoice_id: Optional[int] = None
    document_number: Optional[str] = None
    document_type: Optional[str] = None
    email_template_id: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    attachments: Optional[List[str]] = None
    sent_by: int
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedEmailHistoryResponse(BaseModel):
    emails: List[EmailHistoryOut]
    total: int
    page: int
    per_page: int

# Scheduled Email Schemas
class RecurrencePattern(BaseModel):
    frequency: str  # 'daily', 'weekly', 'monthly'
    interval: int = 1
    end_date: Optional[datetime] = None

class TriggerConfig(BaseModel):
    days_before: Optional[int] = None  # For deadline reminders
    status: Optional[str] = None  # For status change triggers

class ScheduledEmailBase(BaseModel):
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    subject: str
    body: str
    quotation_id: Optional[int] = None
    invoice_id: Optional[int] = None
    email_template_id: Optional[int] = None
    scheduled_time: datetime
    is_recurring: bool = False
    recurrence_pattern: Optional[RecurrencePattern] = None
    trigger_type: Optional[str] = None  # 'manual', 'deadline', 'status_change', 'reminder'
    trigger_config: Optional[TriggerConfig] = None
    attachments: Optional[List[str]] = None
    attach_document: bool = False  # Whether to attach the quotation/invoice DOCX

class ScheduledEmailCreate(ScheduledEmailBase):
    pass

class ScheduledEmailUpdate(BaseModel):
    recipient_email: Optional[EmailStr] = None
    recipient_name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[RecurrencePattern] = None
    status: Optional[str] = None
    attachments: Optional[List[str]] = None
    attach_document: Optional[bool] = None

class ScheduledEmailOut(BaseModel):
    id: int
    recipient_email: str
    recipient_name: Optional[str] = None
    subject: str
    body: str
    quotation_id: Optional[int] = None
    invoice_id: Optional[int] = None
    document_number: Optional[str] = None
    document_type: Optional[str] = None
    email_template_id: Optional[int] = None
    scheduled_time: datetime
    is_recurring: bool
    recurrence_pattern: Optional[Dict[str, Any]] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[Dict[str, Any]] = None
    status: str
    last_sent_at: Optional[datetime] = None
    next_send_at: Optional[datetime] = None
    error_message: Optional[str] = None
    attachments: Optional[List[str]] = None
    attach_document: bool = False
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedScheduledEmailsResponse(BaseModel):
    scheduled_emails: List[ScheduledEmailOut]
    total: int
    page: int
    per_page: int

# Notification Schemas
class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: str  # 'email_sent', 'email_failed', 'email_scheduled'
    related_type: Optional[str] = None
    related_id: Optional[int] = None
    notification_metadata: Optional[Dict[str, Any]] = None

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    related_type: Optional[str] = None
    related_id: Optional[int] = None
    notification_metadata: Optional[Dict[str, Any]] = None
    user_id: int
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationUpdate(BaseModel):
    is_read: bool = True

class PaginatedNotificationsResponse(BaseModel):
    notifications: List[NotificationOut]
    total: int
    page: int
    per_page: int
    unread_count: int

# Email Settings Schemas
class EmailSettingsBase(BaseModel):
    provider: str = 'smtp'  # 'smtp' or 'sendgrid'
    # SMTP fields (required when provider='smtp')
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    use_tls: bool = True
    use_ssl: bool = False
    # SendGrid fields (required when provider='sendgrid')
    sendgrid_api_key: Optional[str] = None
    # Common fields (required for all providers)
    from_email: EmailStr
    from_name: Optional[str] = None
    reply_to: Optional[EmailStr] = None
    email_signature: Optional[str] = None
    is_active: bool = True

class EmailSettingsCreate(EmailSettingsBase):
    user_id: Optional[int] = None

class EmailSettingsUpdate(BaseModel):
    provider: Optional[str] = None
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    use_tls: Optional[bool] = None
    use_ssl: Optional[bool] = None
    sendgrid_api_key: Optional[str] = None
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = None
    reply_to: Optional[EmailStr] = None
    email_signature: Optional[str] = None
    is_active: Optional[bool] = None

class EmailSettingsOut(BaseModel):
    id: int
    provider: str
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    # Note: smtp_password and sendgrid_api_key are excluded for security
    use_tls: bool
    use_ssl: bool
    from_email: str
    from_name: Optional[str] = None
    reply_to: Optional[str] = None
    email_signature: Optional[str] = None
    user_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Send Email Schemas
class SendEmailRequest(BaseModel):
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    subject: str
    body: str
    quotation_id: Optional[int] = None
    invoice_id: Optional[int] = None
    email_template_id: Optional[int] = None
    attach_document: bool = False  # Whether to attach the quotation/invoice DOCX

class SendEmailResponse(BaseModel):
    success: bool
    message: str
    email_history_id: Optional[int] = None

# Automation Template Schemas
class AutomationTemplateBase(BaseModel):
    trigger_type: str  # 'status_change' or 'deadline'
    trigger_event: str  # 'quotation_accepted', 'quotation_rejected', 'invoice_paid', 'quotation_deadline', 'invoice_deadline'
    subject: str
    body: str
    is_enabled: bool = True

class AutomationTemplateCreate(AutomationTemplateBase):
    pass

class AutomationTemplateUpdate(BaseModel):
    trigger_type: Optional[str] = None
    trigger_event: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    is_enabled: Optional[bool] = None

class AutomationTemplateOut(BaseModel):
    id: int
    trigger_type: str
    trigger_event: str
    subject: str
    body: str
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SaveAutomationTemplatesRequest(BaseModel):
    templates: List[Dict[str, Any]]

class AutomationTemplatesResponse(BaseModel):
    templates: List[AutomationTemplateOut]
