from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

from pydantic import EmailStr

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role_id: int 

class UserUpdate(BaseModel):
    name: str
    email: EmailStr
    password: Optional[str] = None
    role_id: Optional[int] = None 

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role_id: int

    model_config = ConfigDict(from_attributes=True)
