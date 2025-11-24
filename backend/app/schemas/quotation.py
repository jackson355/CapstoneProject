from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ContactInfo(BaseModel):
    name: str
    phone: Optional[str] = None
    email: str

class CompanyInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None

class QuotationBase(BaseModel):
    client_id: int
    selected_contact: ContactInfo
    template_id: int
    status: str = "pending"

class QuotationCreate(BaseModel):
    client_id: int
    selected_contact: ContactInfo
    template_id: int
    my_company_info: Optional[CompanyInfo] = None
    due_date: Optional[datetime] = None

class QuotationUpdate(BaseModel):
    client_id: Optional[int] = None
    selected_contact: Optional[ContactInfo] = None
    template_id: Optional[int] = None
    status: Optional[str] = None
    my_company_info: Optional[CompanyInfo] = None
    due_date: Optional[datetime] = None
    unfilled_placeholders: Optional[List[str]] = None
    send_notification_email: Optional[bool] = True  # Whether to send status change email

class QuotationOut(BaseModel):
    id: int
    quotation_number: str
    client_id: int
    selected_contact: ContactInfo
    template_id: int
    my_company_info: Optional[Dict[str, Any]] = None
    due_date: Optional[datetime] = None
    file_path: Optional[str]
    file_name: Optional[str]
    file_size: Optional[int]
    status: str
    unfilled_placeholders: Optional[List[str]]
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ClientInfo(BaseModel):
    id: int
    company_name: str

    model_config = ConfigDict(from_attributes=True)

class QuotationListItem(BaseModel):
    id: int
    quotation_number: str
    client_id: int
    client: ClientInfo
    selected_contact: ContactInfo
    template_id: int
    status: str
    my_company_info: Optional[Dict[str, Any]] = None
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedQuotationsResponse(BaseModel):
    quotations: List[QuotationListItem]
    total: int
    page: int
    per_page: int
