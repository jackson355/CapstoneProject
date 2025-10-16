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

class InvoiceBase(BaseModel):
    quotation_id: int
    client_id: int
    selected_contact: ContactInfo
    template_id: int
    status: str = "unpaid"

class InvoiceCreate(BaseModel):
    quotation_id: int
    template_id: int
    my_company_info: Optional[CompanyInfo] = None
    due_date: Optional[datetime] = None

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    my_company_info: Optional[CompanyInfo] = None
    due_date: Optional[datetime] = None
    unfilled_placeholders: Optional[List[str]] = None

class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    quotation_id: int
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

class InvoiceListItem(BaseModel):
    id: int
    invoice_number: str
    quotation_id: int
    client_id: int
    selected_contact: ContactInfo
    template_id: int
    status: str
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedInvoicesResponse(BaseModel):
    invoices: List[InvoiceListItem]
    total: int
    page: int
    per_page: int
