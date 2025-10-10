from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List

class ContactInfo(BaseModel):
    name: str
    phone: Optional[str] = None
    email: EmailStr

class ClientBase(BaseModel):
    company_name: str
    uen: Optional[str] = None
    industry: Optional[str] = None
    contacts: List[ContactInfo]
    address: Optional[str] = None
    postal_code: Optional[str] = None

class ClientCreate(BaseModel):
    company_name: str
    uen: Optional[str] = None
    industry: Optional[str] = None
    contacts: List[ContactInfo]
    address: Optional[str] = None
    postal_code: Optional[str] = None

class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    uen: Optional[str] = None
    industry: Optional[str] = None
    contacts: Optional[List[ContactInfo]] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None

class ClientOut(BaseModel):
    id: int
    company_name: str
    uen: Optional[str]
    industry: Optional[str]
    contacts: List[ContactInfo]
    address: Optional[str]
    postal_code: Optional[str]

    model_config = ConfigDict(from_attributes=True)