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
    status = Column(String(50), default='unpaid', index=True)  # 'unpaid' or 'paid'

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