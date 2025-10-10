from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class TemplateVariableInfo(BaseModel):
    name: str
    description: Optional[str] = None
    default_value: Optional[str] = None
    type: str = "text"  # text, number, date, email, etc.

class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    template_type: str  # 'quotation' or 'invoice'
    content: Dict[str, Any]  # Rich text content as JSON
    variables: Optional[List[TemplateVariableInfo]] = None
    is_ai_enhanced: bool = False
    status: str = "unsaved"  # 'saved', 'unsaved', 'draft'

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template_type: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    variables: Optional[List[TemplateVariableInfo]] = None
    is_ai_enhanced: Optional[bool] = None
    status: Optional[str] = None

class TemplateOut(TemplateBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TemplateListItem(BaseModel):
    id: int
    name: str
    description: Optional[str]
    template_type: str
    content: Optional[Dict[str, Any]]  # Include content for editing
    status: str
    is_ai_enhanced: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedTemplatesResponse(BaseModel):
    templates: List[TemplateListItem]
    total: int
    page: int
    per_page: int