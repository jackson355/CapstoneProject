from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models import Quotation, Invoice, Client, Partner, EmailHistory, User, Role
from app.api.auth import get_current_user
from app.schemas.user import UserOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/statistics")
def get_dashboard_statistics(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get dashboard statistics including counts, status breakdowns, and recent data.
    """

    # Get total counts
    total_quotations = db.query(Quotation).count()
    total_invoices = db.query(Invoice).count()
    total_clients = db.query(Client).count()
    total_partners = db.query(Partner).count()

    # Get quotation status breakdown
    quotation_status_counts = db.query(
        Quotation.status,
        func.count(Quotation.id).label('count')
    ).group_by(Quotation.status).all()

    quotation_by_status = {status: count for status, count in quotation_status_counts}

    # Get invoice status breakdown
    invoice_status_counts = db.query(
        Invoice.status,
        func.count(Invoice.id).label('count')
    ).group_by(Invoice.status).all()

    invoice_by_status = {status: count for status, count in invoice_status_counts}

    # Note: Invoice and Quotation models don't store total_amount
    # They only store document metadata
    total_revenue = 0.0
    pending_quotations_value = 0.0

    # Get recent quotations (last 5)
    recent_quotations = db.query(Quotation).order_by(
        Quotation.created_at.desc()
    ).limit(5).all()

    # Get recent invoices (last 5)
    recent_invoices = db.query(Invoice).order_by(
        Invoice.created_at.desc()
    ).limit(5).all()

    # Get recent emails (last 5)
    recent_emails = db.query(EmailHistory).order_by(
        EmailHistory.sent_at.desc()
    ).limit(5).all()

    # Format recent quotations
    formatted_quotations = []
    for q in recent_quotations:
        client = db.query(Client).filter(Client.id == q.client_id).first()
        formatted_quotations.append({
            'id': q.id,
            'quotation_number': q.quotation_number,
            'client_name': client.company_name if client else 'Unknown',
            'status': q.status,
            'created_at': q.created_at.isoformat() if q.created_at else None,
            'due_date': q.due_date.isoformat() if q.due_date else None,
        })

    # Format recent invoices
    formatted_invoices = []
    for inv in recent_invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        formatted_invoices.append({
            'id': inv.id,
            'invoice_number': inv.invoice_number,
            'client_name': client.company_name if client else 'Unknown',
            'status': inv.status,
            'created_at': inv.created_at.isoformat() if inv.created_at else None,
            'due_date': inv.due_date.isoformat() if inv.due_date else None,
        })

    # Format recent emails
    formatted_emails = []
    for email in recent_emails:
        formatted_emails.append({
            'id': email.id,
            'recipient_email': email.recipient_email,
            'subject': email.subject,
            'status': email.status,
            'sent_at': email.sent_at.isoformat() if email.sent_at else None,
        })

    # Get monthly quotations/invoices trend (last 6 months)
    six_months_ago = datetime.now() - timedelta(days=180)

    monthly_quotations = db.query(
        func.to_char(Quotation.created_at, 'YYYY-MM').label('month'),
        func.count(Quotation.id).label('count')
    ).filter(
        Quotation.created_at >= six_months_ago
    ).group_by('month').order_by('month').all()

    monthly_invoices = db.query(
        func.to_char(Invoice.created_at, 'YYYY-MM').label('month'),
        func.count(Invoice.id).label('count')
    ).filter(
        Invoice.created_at >= six_months_ago
    ).group_by('month').order_by('month').all()

    return {
        'counts': {
            'total_quotations': total_quotations,
            'total_invoices': total_invoices,
            'total_clients': total_clients,
            'total_partners': total_partners,
            'total_revenue': float(total_revenue),
            'pending_quotations_value': float(pending_quotations_value),
        },
        'quotation_by_status': quotation_by_status,
        'invoice_by_status': invoice_by_status,
        'recent_quotations': formatted_quotations,
        'recent_invoices': formatted_invoices,
        'recent_emails': formatted_emails,
        'monthly_trends': {
            'quotations': [{'month': month, 'count': count} for month, count in monthly_quotations],
            'invoices': [{'month': month, 'count': count} for month, count in monthly_invoices],
        }
    }
