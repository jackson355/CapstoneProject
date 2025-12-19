from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

class PartnerBase(BaseModel):
    company_name: str
    contact_person_name: str
    phone_number: Optional[str] = None
    email_address: Optional[EmailStr] = None

class PartnerCreate(PartnerBase):
    pass

class PartnerUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person_name: Optional[str] = None
    phone_number: Optional[str] = None
    email_address: Optional[EmailStr] = None

class PartnerOut(BaseModel):
    id: int
    company_name: str
    contact_person_name: str
    phone_number: Optional[str]
    email_address: Optional[str]
    contract_file_name: Optional[str]
    contract_file_size: Optional[int]
    contract_mime_type: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
