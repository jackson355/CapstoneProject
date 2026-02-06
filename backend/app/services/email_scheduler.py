import logging
from datetime import datetime, timedelta
from typing import List, Optional
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models import ScheduledEmail, EmailHistory, Quotation, Invoice, AutomationTemplate
from .email_service import EmailService
from .notification_service import NotificationService

logger = logging.getLogger(__name__)


class EmailScheduler:
    """Service for managing scheduled and recurring emails"""

    @staticmethod
    def process_scheduled_emails(db: Session) -> int:
        """
        Process all pending scheduled emails that are due to be sent
        Returns: Number of emails processed
        """
        now = datetime.now()

        # Get all pending scheduled emails that are due
        scheduled_emails = db.query(ScheduledEmail).filter(
            ScheduledEmail.status == 'pending',
            or_(
                ScheduledEmail.scheduled_time <= now,
                ScheduledEmail.next_send_at <= now
            )
        ).all()

        processed_count = 0

        for scheduled_email in scheduled_emails:
            try:
                # Get email settings for the user
                settings = EmailService.get_email_settings(db, scheduled_email.created_by)
                if not settings:
                    scheduled_email.status = 'failed'
                    scheduled_email.error_message = "Email settings not configured"
                    db.commit()

                    # Create failure notification
                    NotificationService.create_notification(
                        db=db,
                        user_id=scheduled_email.created_by,
                        title="Scheduled Email Failed",
                        message=f"Email to {scheduled_email.recipient_email} failed: Settings not configured",
                        notification_type="email_failed",
                        related_type="scheduled_email",
                        related_id=scheduled_email.id
                    )
                    continue

                # Get document variables for template rendering
                variables = EmailService.get_document_variables(
                    db,
                    quotation_id=scheduled_email.quotation_id,
                    invoice_id=scheduled_email.invoice_id
                )

                # Render subject and body with variables
                rendered_subject = EmailService.render_template(scheduled_email.subject, variables)
                rendered_body = EmailService.render_template(scheduled_email.body, variables)

                # Get attachments
                attachments = []
                if scheduled_email.attachments:
                    attachments = list(scheduled_email.attachments)

                # Handle attach_document flag - automatically attach document file
                if scheduled_email.attach_document:
                    if scheduled_email.quotation_id:
                        quotation = db.query(Quotation).filter(Quotation.id == scheduled_email.quotation_id).first()
                        if quotation and quotation.file_path and Path(quotation.file_path).exists():
                            attachments.append(quotation.file_path)
                    elif scheduled_email.invoice_id:
                        invoice = db.query(Invoice).filter(Invoice.id == scheduled_email.invoice_id).first()
                        if invoice and invoice.file_path and Path(invoice.file_path).exists():
                            attachments.append(invoice.file_path)

                # Send email
                success, error_message = EmailService.send_email(
                    settings=settings,
                    recipient_email=scheduled_email.recipient_email,
                    subject=rendered_subject,
                    body=rendered_body,
                    recipient_name=scheduled_email.recipient_name,
                    attachments=attachments if attachments else None
                )

                # Create email history record with document snapshot
                email_history = EmailHistory(
                    recipient_email=scheduled_email.recipient_email,
                    recipient_name=scheduled_email.recipient_name,
                    subject=rendered_subject,
                    body=rendered_body,
                    quotation_id=scheduled_email.quotation_id,
                    invoice_id=scheduled_email.invoice_id,
                    document_number=scheduled_email.document_number,
                    document_type=scheduled_email.document_type,
                    email_template_id=scheduled_email.email_template_id,
                    status='sent' if success else 'failed',
                    error_message=error_message,
                    attachments=attachments if attachments else None,
                    sent_by=scheduled_email.created_by
                )
                db.add(email_history)

                # Update scheduled email status
                if success:
                    scheduled_email.last_sent_at = now

                    # Handle recurring emails
                    if scheduled_email.is_recurring and scheduled_email.recurrence_pattern:
                        next_send = EmailScheduler._calculate_next_send(
                            scheduled_email.scheduled_time if not scheduled_email.next_send_at else scheduled_email.next_send_at,
                            scheduled_email.recurrence_pattern
                        )

                        # Check if recurring should end
                        end_date = scheduled_email.recurrence_pattern.get('end_date')
                        if end_date:
                            if isinstance(end_date, str):
                                end_date = datetime.fromisoformat(end_date)
                            if next_send > end_date:
                                scheduled_email.status = 'sent'
                                scheduled_email.next_send_at = None
                            else:
                                scheduled_email.next_send_at = next_send
                        else:
                            scheduled_email.next_send_at = next_send
                    else:
                        scheduled_email.status = 'sent'

                    # Create success notification
                    NotificationService.create_notification(
                        db=db,
                        user_id=scheduled_email.created_by,
                        title="Email Sent",
                        message=f"Scheduled email sent to {scheduled_email.recipient_email}",
                        notification_type="email_sent",
                        related_type="email_history",
                        related_id=email_history.id
                    )
                else:
                    scheduled_email.status = 'failed'
                    scheduled_email.error_message = error_message

                    # Create failure notification
                    NotificationService.create_notification(
                        db=db,
                        user_id=scheduled_email.created_by,
                        title="Scheduled Email Failed",
                        message=f"Email to {scheduled_email.recipient_email} failed: {error_message}",
                        notification_type="email_failed",
                        related_type="scheduled_email",
                        related_id=scheduled_email.id
                    )

                db.commit()
                processed_count += 1

            except Exception as e:
                logger.error(f"Error processing scheduled email {scheduled_email.id}: {str(e)}")
                scheduled_email.status = 'failed'
                scheduled_email.error_message = str(e)
                db.commit()

        return processed_count

    @staticmethod
    def _calculate_next_send(current_time: datetime, recurrence_pattern: dict) -> datetime:
        """Calculate next send time based on recurrence pattern"""
        frequency = recurrence_pattern.get('frequency', 'daily')
        interval = recurrence_pattern.get('interval', 1)

        if frequency == 'daily':
            return current_time + timedelta(days=interval)
        elif frequency == 'weekly':
            return current_time + timedelta(weeks=interval)
        elif frequency == 'monthly':
            # Approximate month as 30 days
            return current_time + timedelta(days=30 * interval)
        else:
            return current_time + timedelta(days=interval)

    @staticmethod
    def check_deadline_reminders(db: Session) -> int:
        """
        Check for quotations and invoices with approaching deadlines
        and create scheduled emails if configured
        Returns: Number of reminders created
        """
        now = datetime.now()
        reminders_created = 0

        # Check for quotations with approaching due dates
        quotations = db.query(Quotation).filter(
            Quotation.status == 'pending',
            Quotation.due_date != None,
            Quotation.due_date > now,
            Quotation.due_date <= now + timedelta(days=7)  # Due within 7 days
        ).all()

        for quotation in quotations:
            # Check if reminder already exists
            existing_reminder = db.query(ScheduledEmail).filter(
                ScheduledEmail.quotation_id == quotation.id,
                ScheduledEmail.trigger_type == 'deadline',
                ScheduledEmail.status.in_(['pending', 'sent'])
            ).first()

            if not existing_reminder:
                # Get contact email
                contact_email = None
                if quotation.selected_contact:
                    contact = quotation.selected_contact
                    if isinstance(contact, dict):
                        contact_email = contact.get('email')

                if contact_email:
                    # Get automation template from database
                    template = db.query(AutomationTemplate).filter(
                        AutomationTemplate.trigger_event == 'quotation_deadline',
                        AutomationTemplate.is_enabled == True
                    ).first()

                    if template:
                        # Create deadline reminder using configured template
                        scheduled_email = ScheduledEmail(
                            recipient_email=contact_email,
                            recipient_name=contact.get('name') if isinstance(quotation.selected_contact, dict) else None,
                            subject=template.subject,
                            body=template.body,
                            quotation_id=quotation.id,
                            document_number=quotation.quotation_number,
                            document_type='quotation',
                            scheduled_time=now + timedelta(hours=1),  # Send in 1 hour
                            trigger_type='deadline',
                            trigger_config={'days_before': 7},
                            created_by=quotation.created_by
                        )
                        db.add(scheduled_email)
                        reminders_created += 1

        # Check for invoices with approaching due dates
        invoices = db.query(Invoice).filter(
            Invoice.status == 'unpaid',
            Invoice.due_date != None,
            Invoice.due_date > now,
            Invoice.due_date <= now + timedelta(days=7)  # Due within 7 days
        ).all()

        for invoice in invoices:
            # Check if reminder already exists
            existing_reminder = db.query(ScheduledEmail).filter(
                ScheduledEmail.invoice_id == invoice.id,
                ScheduledEmail.trigger_type == 'deadline',
                ScheduledEmail.status.in_(['pending', 'sent'])
            ).first()

            if not existing_reminder:
                # Get contact email
                contact_email = None
                if invoice.selected_contact:
                    contact = invoice.selected_contact
                    if isinstance(contact, dict):
                        contact_email = contact.get('email')

                if contact_email:
                    # Get automation template from database
                    template = db.query(AutomationTemplate).filter(
                        AutomationTemplate.trigger_event == 'invoice_deadline',
                        AutomationTemplate.is_enabled == True
                    ).first()

                    if template:
                        # Create deadline reminder using configured template
                        scheduled_email = ScheduledEmail(
                            recipient_email=contact_email,
                            recipient_name=contact.get('name') if isinstance(invoice.selected_contact, dict) else None,
                            subject=template.subject,
                            body=template.body,
                            invoice_id=invoice.id,
                            document_number=invoice.invoice_number,
                            document_type='invoice',
                            scheduled_time=now + timedelta(hours=1),  # Send in 1 hour
                            trigger_type='deadline',
                            trigger_config={'days_before': 7},
                            created_by=invoice.created_by
                        )
                        db.add(scheduled_email)
                        reminders_created += 1

        if reminders_created > 0:
            db.commit()

        return reminders_created

    @staticmethod
    def create_status_change_email(
        db: Session,
        user_id: int,
        quotation_id: Optional[int] = None,
        invoice_id: Optional[int] = None,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None
    ) -> Optional[int]:
        """
        Create scheduled email when document status changes
        Returns: scheduled_email_id or None
        """
        now = datetime.now()

        if quotation_id:
            quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
            if not quotation:
                return None

            # Get contact email
            contact_email = None
            contact_name = None
            if quotation.selected_contact:
                contact = quotation.selected_contact
                if isinstance(contact, dict):
                    contact_email = contact.get('email')
                    contact_name = contact.get('name')

            if not contact_email:
                return None

            # Get automation template from database
            trigger_event = None
            if new_status == 'accepted':
                trigger_event = 'quotation_accepted'
            elif new_status == 'rejected':
                trigger_event = 'quotation_rejected'
            else:
                return None

            # Fetch template from database
            template = db.query(AutomationTemplate).filter(
                AutomationTemplate.trigger_event == trigger_event,
                AutomationTemplate.is_enabled == True
            ).first()

            if not template:
                # No template configured or template is disabled
                return None

            subject = template.subject
            body = template.body

            scheduled_email = ScheduledEmail(
                recipient_email=contact_email,
                recipient_name=contact_name,
                subject=subject,
                body=body,
                quotation_id=quotation_id,
                document_number=quotation.quotation_number,
                document_type='quotation',
                scheduled_time=now + timedelta(minutes=5),  # Send in 5 minutes
                trigger_type='status_change',
                trigger_config={'old_status': old_status, 'new_status': new_status},
                created_by=user_id
            )
            db.add(scheduled_email)
            db.commit()
            db.refresh(scheduled_email)
            return scheduled_email.id

        elif invoice_id:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            if not invoice:
                return None

            # Get contact email
            contact_email = None
            contact_name = None
            if invoice.selected_contact:
                contact = invoice.selected_contact
                if isinstance(contact, dict):
                    contact_email = contact.get('email')
                    contact_name = contact.get('name')

            if not contact_email:
                return None

            # Get automation template from database
            trigger_event = None
            if new_status == 'paid':
                trigger_event = 'invoice_paid'
            else:
                return None

            # Fetch template from database
            template = db.query(AutomationTemplate).filter(
                AutomationTemplate.trigger_event == trigger_event,
                AutomationTemplate.is_enabled == True
            ).first()

            if not template:
                # No template configured or template is disabled
                return None

            subject = template.subject
            body = template.body

            scheduled_email = ScheduledEmail(
                recipient_email=contact_email,
                recipient_name=contact_name,
                subject=subject,
                body=body,
                invoice_id=invoice_id,
                document_number=invoice.invoice_number,
                document_type='invoice',
                scheduled_time=now + timedelta(minutes=5),  # Send in 5 minutes
                trigger_type='status_change',
                trigger_config={'old_status': old_status, 'new_status': new_status},
                created_by=user_id
            )
            db.add(scheduled_email)
            db.commit()
            db.refresh(scheduled_email)
            return scheduled_email.id

        return None
