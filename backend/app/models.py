from sqlalchemy import Column, Integer, String, Table, ForeignKey, DateTime, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db.session import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(66), nullable=False)

    email = Column(String(50), unique=True, index=True, nullable=False)
    password = Column(String(128), nullable=False)

    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    role = relationship('Role', back_populates='users')

class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)

    users = relationship('User', back_populates='role')

class Client(Base):
    __tablename__ = 'clients'

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(100), nullable=False)
    uen = Column(String(50), nullable=True)  # New field for UEN
    industry = Column(String(100), nullable=True)  # New field for Industry
    contacts = Column(JSON, nullable=False)  # JSON array of contact objects
    address = Column(String(200), nullable=True)
    postal_code = Column(String(10), nullable=True)

class ActivityLog(Base):
    __tablename__ = 'activity_logs'

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., "user.create", "auth.login_success"
    actor_user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)  # who performed the action
    target_type = Column(String(50), nullable=True, index=True)  # e.g., "user", "role"
    target_id = Column(Integer, nullable=True)  # id of the target entity
    message = Column(String(500), nullable=True)  # human-readable message
    log_metadata = Column(JSON, nullable=True)  # additional structured data
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationship to User (actor)
    actor = relationship('User', foreign_keys=[actor_user_id])

    # Composite index for efficient queries
    __table_args__ = (
        # Index for queries by date range + action
        {'extend_existing': True}
    )

class Template(Base):
    __tablename__ = 'templates'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    template_type = Column(String(50), nullable=False, index=True)  # 'quotation' or 'invoice'
    content = Column(JSON, nullable=False)  # Updated: stores file metadata and optional HTML
    variables = Column(JSON, nullable=True)  # Template variables/placeholders
    is_ai_enhanced = Column(Boolean, default=False)  # Whether AI processing was applied
    status = Column(String(20), default='unsaved')  # 'saved', 'unsaved', 'draft'

    # New fields for DOCX storage
    file_path = Column(String(500), nullable=True)  # Path to DOCX file
    file_name = Column(String(255), nullable=True)  # Original filename
    file_size = Column(Integer, nullable=True)  # File size in bytes
    mime_type = Column(String(100), nullable=True)  # MIME type

    created_by = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = relationship('User', foreign_keys=[created_by])

    # Composite index for efficient queries
    __table_args__ = (
        {'extend_existing': True}
    )

class Quotation(Base):
    __tablename__ = 'quotations'

    id = Column(Integer, primary_key=True, index=True)
    quotation_number = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "Q-2025-0001"

    # Client relationship
    client_id = Column(Integer, ForeignKey('clients.id'), nullable=False, index=True)
    selected_contact = Column(JSON, nullable=False)  # Store selected contact info from client

    # Template relationship
    template_id = Column(Integer, ForeignKey('templates.id'), nullable=False, index=True)

    # User's company information (JSON field for flexibility)
    my_company_info = Column(JSON, nullable=True)  # Stores company data like name, email, phone, address, website

    # Quotation document
    file_path = Column(String(500), nullable=True)  # Path to filled quotation DOCX
    file_name = Column(String(255), nullable=True)  # Original filename
    file_size = Column(Integer, nullable=True)  # File size in bytes

    # Due date
    due_date = Column(DateTime(timezone=True), nullable=True)  # When payment is due

    # Status tracking
    status = Column(String(50), default='pending', index=True)  # 'pending', 'accepted', or 'rejected'

    # Placeholder tracking
    unfilled_placeholders = Column(JSON, nullable=True)  # List of placeholders that haven't been filled

    # Metadata
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    client = relationship('Client', foreign_keys=[client_id])
    template = relationship('Template', foreign_keys=[template_id])
    creator = relationship('User', foreign_keys=[created_by])

    # Composite index for efficient queries
    __table_args__ = (
        {'extend_existing': True}
    )

class Invoice(Base):
    __tablename__ = 'invoices'

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "INV-2025-0001"

    # Quotation relationship - REQUIRED (invoice created from paid quotation)
    quotation_id = Column(Integer, ForeignKey('quotations.id'), nullable=False, index=True)

    # Client relationship (copied from quotation for convenience)
    client_id = Column(Integer, ForeignKey('clients.id'), nullable=False, index=True)
    selected_contact = Column(JSON, nullable=False)  # Store selected contact info from quotation

    # Template relationship
    template_id = Column(Integer, ForeignKey('templates.id'), nullable=False, index=True)

    # User's company information (JSON field for flexibility)
    my_company_info = Column(JSON, nullable=True)  # Stores company data like name, email, phone, address, website

    # Invoice document
    file_path = Column(String(500), nullable=True)  # Path to filled invoice DOCX
    file_name = Column(String(255), nullable=True)  # Original filename
    file_size = Column(Integer, nullable=True)  # File size in bytes

    # Due date
    due_date = Column(DateTime(timezone=True), nullable=True)  # When payment is due

    # Status tracking
    status = Column(String(50), default='unpaid', index=True)  # 'unpaid' or 'paid'

    # Placeholder tracking
    unfilled_placeholders = Column(JSON, nullable=True)  # List of placeholders that haven't been filled

    # Metadata
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    quotation = relationship('Quotation', foreign_keys=[quotation_id])
    client = relationship('Client', foreign_keys=[client_id])
    template = relationship('Template', foreign_keys=[template_id])
    creator = relationship('User', foreign_keys=[created_by])

    # Composite index for efficient queries
    __table_args__ = (
        {'extend_existing': True}
    )

class EmailTemplate(Base):
    __tablename__ = 'email_templates'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)  # HTML email body
    template_type = Column(String(50), nullable=False, index=True)  # 'quotation' or 'invoice' or 'general'
    variables = Column(JSON, nullable=True)  # Available variables for template
    is_default = Column(Boolean, default=False)  # Is this the default template

    created_by = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = relationship('User', foreign_keys=[created_by])

    __table_args__ = (
        {'extend_existing': True}
    )

class EmailHistory(Base):
    __tablename__ = 'email_history'

    id = Column(Integer, primary_key=True, index=True)

    # Email details
    recipient_email = Column(String(255), nullable=False, index=True)
    recipient_name = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)  # HTML email body

    # Related documents (with SET NULL on delete)
    quotation_id = Column(Integer, ForeignKey('quotations.id', ondelete='SET NULL'), nullable=True, index=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id', ondelete='SET NULL'), nullable=True, index=True)

    # Document snapshot (preserved even if document deleted)
    document_number = Column(String(100), nullable=True, index=True)  # Q-2025-0001 or INV-2025-0001
    document_type = Column(String(20), nullable=True)  # 'quotation' or 'invoice'

    # Email template used
    email_template_id = Column(Integer, ForeignKey('email_templates.id'), nullable=True)

    # Status tracking
    status = Column(String(50), default='sent', index=True)  # 'sent', 'failed', 'pending'
    error_message = Column(Text, nullable=True)  # Error message if failed

    # Attachments
    attachments = Column(JSON, nullable=True)  # List of attached file paths

    # Metadata
    sent_by = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    quotation = relationship('Quotation', foreign_keys=[quotation_id])
    invoice = relationship('Invoice', foreign_keys=[invoice_id])
    email_template = relationship('EmailTemplate', foreign_keys=[email_template_id])
    sender = relationship('User', foreign_keys=[sent_by])

    __table_args__ = (
        {'extend_existing': True}
    )

class ScheduledEmail(Base):
    __tablename__ = 'scheduled_emails'

    id = Column(Integer, primary_key=True, index=True)

    # Email details
    recipient_email = Column(String(255), nullable=False, index=True)
    recipient_name = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)  # HTML email body

    # Related documents (with SET NULL on delete)
    quotation_id = Column(Integer, ForeignKey('quotations.id', ondelete='SET NULL'), nullable=True, index=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id', ondelete='SET NULL'), nullable=True, index=True)

    # Document snapshot (preserved even if document deleted)
    document_number = Column(String(100), nullable=True, index=True)  # Q-2025-0001 or INV-2025-0001
    document_type = Column(String(20), nullable=True)  # 'quotation' or 'invoice'

    # Email template used
    email_template_id = Column(Integer, ForeignKey('email_templates.id'), nullable=True)

    # Scheduling details
    scheduled_time = Column(DateTime(timezone=True), nullable=False, index=True)  # When to send
    is_recurring = Column(Boolean, default=False)  # Is this a recurring email
    recurrence_pattern = Column(JSON, nullable=True)  # {'frequency': 'daily/weekly/monthly', 'interval': 1, 'end_date': '2025-12-31'}

    # Trigger type
    trigger_type = Column(String(50), nullable=True, index=True)  # 'manual', 'deadline', 'status_change', 'reminder'
    trigger_config = Column(JSON, nullable=True)  # Additional trigger configuration

    # Status tracking
    status = Column(String(50), default='pending', index=True)  # 'pending', 'sent', 'cancelled', 'failed'
    last_sent_at = Column(DateTime(timezone=True), nullable=True)  # For recurring emails
    next_send_at = Column(DateTime(timezone=True), nullable=True)  # For recurring emails
    error_message = Column(Text, nullable=True)

    # Attachments
    attachments = Column(JSON, nullable=True)  # List of file paths to attach

    # Metadata
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    quotation = relationship('Quotation', foreign_keys=[quotation_id])
    invoice = relationship('Invoice', foreign_keys=[invoice_id])
    email_template = relationship('EmailTemplate', foreign_keys=[email_template_id])
    creator = relationship('User', foreign_keys=[created_by])

    __table_args__ = (
        {'extend_existing': True}
    )

class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True, index=True)

    # Notification content
    title = Column(String(200), nullable=False)
    message = Column(String(500), nullable=False)
    notification_type = Column(String(50), nullable=False, index=True)  # 'email_sent', 'email_failed', 'email_scheduled'

    # Related entities
    related_type = Column(String(50), nullable=True)  # 'email_history', 'scheduled_email', 'quotation', 'invoice'
    related_id = Column(Integer, nullable=True)

    # Additional data
    notification_metadata = Column(JSON, nullable=True)

    # User assignment
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)

    # Status
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    user = relationship('User', foreign_keys=[user_id])

    __table_args__ = (
        {'extend_existing': True}
    )

class EmailSettings(Base):
    __tablename__ = 'email_settings'

    id = Column(Integer, primary_key=True, index=True)

    # Provider type: 'smtp' or 'sendgrid'
    provider = Column(String(50), nullable=False, default='smtp')

    # SMTP Configuration (used when provider='smtp')
    smtp_server = Column(String(255), nullable=True)
    smtp_port = Column(Integer, nullable=True)
    smtp_username = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)  # Should be encrypted
    use_tls = Column(Boolean, default=True)
    use_ssl = Column(Boolean, default=False)

    # SendGrid Configuration (used when provider='sendgrid')
    sendgrid_api_key = Column(String(500), nullable=True)  # Should be encrypted

    # Email defaults (used for both providers)
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(255), nullable=True)
    reply_to = Column(String(255), nullable=True)

    # Signature
    email_signature = Column(Text, nullable=True)  # HTML signature

    # User/Organization
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)  # NULL = organization-wide settings
    is_active = Column(Boolean, default=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship('User', foreign_keys=[user_id])

    __table_args__ = (
        {'extend_existing': True}
    )

class AutomationTemplate(Base):
    __tablename__ = 'automation_templates'

    id = Column(Integer, primary_key=True, index=True)

    # Trigger configuration
    trigger_type = Column(String(50), nullable=False, index=True)  # 'status_change' or 'deadline'
    trigger_event = Column(String(100), nullable=False, unique=True, index=True)  # e.g., 'quotation_accepted', 'quotation_deadline'

    # Email content
    subject = Column(String(500), nullable=False)  # With template variables like {{quotation_number}}
    body = Column(Text, nullable=False)  # HTML email body with template variables

    # Status
    is_enabled = Column(Boolean, default=True, nullable=False)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        {'extend_existing': True}
    )

class CompanySettings(Base):
    __tablename__ = 'company_settings'

    id = Column(Integer, primary_key=True, index=True)

    # Company information (used globally for all quotations/invoices)
    company_name = Column(String(200), nullable=True)
    company_email = Column(String(100), nullable=True)
    company_phone = Column(String(50), nullable=True)
    company_address = Column(String(500), nullable=True)
    company_website = Column(String(200), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        {'extend_existing': True}
    )