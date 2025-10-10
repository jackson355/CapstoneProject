from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import json
from sqlalchemy import cast, Text

from app.db.session import get_db
from app.models import Client, User, Role, ActivityLog
from app.schemas import ClientCreate, ClientUpdate, ClientOut, UserOut
from app.api.auth import get_current_user

class PaginatedClientsResponse(BaseModel):
    clients: List[ClientOut]
    total: int
    page: int
    per_page: int

router = APIRouter(prefix="/clients", tags=["clients"]) 

# Reuse RBAC dependency like in users.py
def require_admin_or_superadmin(current_user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role or role.name not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return current_user

@router.get("/", response_model=PaginatedClientsResponse, dependencies=[Depends(require_admin_or_superadmin)])
def list_clients(
    page: int = Query(default=0, ge=0),
    per_page: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None, description="Search by company, UEN, industry, or contact info"),
    industry: Optional[str] = Query(default=None),  # NEW
    db: Session = Depends(get_db)
):
    query = db.query(Client)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (Client.company_name.ilike(term)) |
            (Client.uen.ilike(term)) |
            (Client.industry.ilike(term)) |
            (cast(Client.contacts, Text).ilike(term))  # cast JSON -> text for LIKE/ILIKE
        )
    if industry:  # NEW
        query = query.filter(Client.industry == industry)
    total = query.count()
    clients = query.offset(page * per_page).limit(per_page).all()
    return PaginatedClientsResponse(clients=clients, total=total, page=page, per_page=per_page)

@router.post("/", response_model=ClientOut, dependencies=[Depends(require_admin_or_superadmin)])
def create_client(client_in: ClientCreate, db: Session = Depends(get_db), current_user: UserOut = Depends(get_current_user)):
    # Check if any contact email already exists
    for contact in client_in.contacts:
        existing_client = db.query(Client).filter(
            cast(Client.contacts, Text).ilike(f'%"{contact.email}"%')  # cast JSON -> text for email lookup
        ).first()
        if existing_client:
            raise HTTPException(status_code=400, detail=f"Email {contact.email} already exists")

    # Convert contacts to dict for JSON storage
    contacts_dict = [contact.dict() for contact in client_in.contacts]
    client_data = client_in.dict()
    client_data['contacts'] = contacts_dict
    
    client = Client(**client_data)
    db.add(client)
    db.commit()
    db.refresh(client)
    
    # log create
    db.add(ActivityLog(
        action="client.create",
        actor_user_id=current_user.id,
        target_type="client",
        target_id=client.id,
        message=f"Client {client.company_name} created",
        log_metadata=None,
    ))
    db.commit()
    return client

@router.get("/{client_id}", response_model=ClientOut, dependencies=[Depends(require_admin_or_superadmin)])
def read_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.put("/{client_id}", response_model=ClientOut, dependencies=[Depends(require_admin_or_superadmin)])
def update_client(client_id: int, client_in: ClientUpdate, db: Session = Depends(get_db), current_user: UserOut = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if any updated contact email already exists in another client
    if client_in.contacts:
        for contact in client_in.contacts:
            existing_client = db.query(Client).filter(
                cast(Client.contacts, Text).ilike(f'%"{contact.email}"%'),
                Client.id != client_id
            ).first()
            if existing_client:
                raise HTTPException(status_code=400, detail=f"Email {contact.email} already exists")
    
    update_data = client_in.dict(exclude_unset=True)
    if 'contacts' in update_data:
        update_data['contacts'] = [contact.dict() for contact in client_in.contacts]
    
    for k, v in update_data.items():
        setattr(client, k, v)
    db.commit()
    db.refresh(client)
    
    db.add(ActivityLog(
        action="client.update",
        actor_user_id=current_user.id,
        target_type="client",
        target_id=client.id,
        message=f"Client {client.company_name} updated",
        log_metadata=None,
    ))
    db.commit()
    return client

@router.delete("/{client_id}", dependencies=[Depends(require_admin_or_superadmin)])
def delete_client(client_id: int, db: Session = Depends(get_db), current_user: UserOut = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    cid = client.id
    cname = client.company_name
    db.delete(client)
    db.commit()
    # log delete
    db.add(ActivityLog(
        action="client.delete",
        actor_user_id=current_user.id,
        target_type="client",
        target_id=cid,
        message=f"Client {cname} deleted",
        log_metadata=None,
    ))
    db.commit()
    return {"detail": "Client deleted"}