import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List, Dict, Any
from pathlib import Path
from jinja2 import Template
from sqlalchemy.orm import Session
from datetime import datetime
import base64

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition

from ..models import EmailSettings, EmailHistory, Quotation, Invoice, Client, EmailTemplate
from ..schemas.email import SendEmailRequest

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails with SMTP integration and template rendering"""

    @staticmethod
    def get_email_settings(db: Session, user_id: Optional[int] = None) -> Optional[EmailSettings]:
        """
        Get email settings for a user or organization-wide settings
        Priority: User-specific > Organization-wide
        """
        if user_id:
            # Try to get user-specific settings first
            settings = db.query(EmailSettings).filter(
                EmailSettings.user_id == user_id,
                EmailSettings.is_active == True
            ).first()
            if settings:
                return settings

        # Fall back to organization-wide settings (user_id is NULL)
        settings = db.query(EmailSettings).filter(
            EmailSettings.user_id == None,
            EmailSettings.is_active == True
        ).first()

        return settings

    @staticmethod
    def render_template(template_text: str, variables: Dict[str, Any]) -> str:
        """
        Render email template with variables using Jinja2
        Supports {{variable_name}} syntax
        """
        try:
            template = Template(template_text)
            rendered = template.render(**variables)
            return rendered
        except Exception as e:
            logger.error(f"Error rendering template: {str(e)}")
            return template_text

    @staticmethod
    def get_document_variables(
        db: Session,
        quotation_id: Optional[int] = None,
        invoice_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Extract variables from quotation or invoice for email template rendering
        """
        variables = {
            "current_date": datetime.now().strftime("%d/%m/%Y")
        }

        if quotation_id:
            quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
            if quotation:
                # Get client info
                client = db.query(Client).filter(Client.id == quotation.client_id).first()
                if client:
                    variables.update({
                        "client_company_name": client.company_name,
                        "client_uen": client.uen or "",
                        "client_industry": client.industry or "",
                        "client_address": client.address or "",
                        "client_postal_code": client.postal_code or "",
                    })

                # Get contact info
                if quotation.selected_contact:
                    contact = quotation.selected_contact
                    if isinstance(contact, dict):
                        variables.update({
                            "contact_name": contact.get("name", ""),
                            "client_name": contact.get("name", ""),  # Alias
                            "contact_email": contact.get("email", ""),
                            "client_email": contact.get("email", ""),  # Alias
                            "contact_phone": contact.get("phone", ""),
                            "client_phone": contact.get("phone", ""),  # Alias
                        })

                # Get company info
                if quotation.my_company_info:
                    company_info = quotation.my_company_info
                    if isinstance(company_info, dict):
                        variables.update({
                            "my_company_name": company_info.get("name", ""),
                            "my_company_email": company_info.get("email", ""),
                            "my_company_phone": company_info.get("phone", ""),
                            "my_company_address": company_info.get("address", ""),
                            "my_company_website": company_info.get("website", ""),
                        })

                # Quotation specific
                variables.update({
                    "quotation_number": quotation.quotation_number,
                    "quotation_date": quotation.created_at.strftime("%d/%m/%Y"),
                    "quotation_status": quotation.status,
                    "due_date": quotation.due_date.strftime("%d/%m/%Y") if quotation.due_date else "",
                })

        elif invoice_id:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            if invoice:
                # Get client info
                client = db.query(Client).filter(Client.id == invoice.client_id).first()
                if client:
                    variables.update({
                        "client_company_name": client.company_name,
                        "client_uen": client.uen or "",
                        "client_industry": client.industry or "",
                        "client_address": client.address or "",
                        "client_postal_code": client.postal_code or "",
                    })

                # Get contact info
                if invoice.selected_contact:
                    contact = invoice.selected_contact
                    if isinstance(contact, dict):
                        variables.update({
                            "contact_name": contact.get("name", ""),
                            "client_name": contact.get("name", ""),  # Alias
                            "contact_email": contact.get("email", ""),
                            "client_email": contact.get("email", ""),  # Alias
                            "contact_phone": contact.get("phone", ""),
                            "client_phone": contact.get("phone", ""),  # Alias
                        })

                # Get company info
                if invoice.my_company_info:
                    company_info = invoice.my_company_info
                    if isinstance(company_info, dict):
                        variables.update({
                            "my_company_name": company_info.get("name", ""),
                            "my_company_email": company_info.get("email", ""),
                            "my_company_phone": company_info.get("phone", ""),
                            "my_company_address": company_info.get("address", ""),
                            "my_company_website": company_info.get("website", ""),
                        })

                # Invoice specific
                variables.update({
                    "invoice_number": invoice.invoice_number,
                    "invoice_date": invoice.created_at.strftime("%d/%m/%Y"),
                    "invoice_status": invoice.status,
                    "due_date": invoice.due_date.strftime("%d/%m/%Y") if invoice.due_date else "",
                })

        return variables

    @staticmethod
    def send_email_sendgrid(
        settings: EmailSettings,
        recipient_email: str,
        subject: str,
        body: str,
        recipient_name: Optional[str] = None,
        attachments: Optional[List[str]] = None,
        signature: Optional[str] = None
    ) -> tuple[bool, Optional[str]]:
        """
        Send email using SendGrid API with optional attachments
        Returns: (success: bool, error_message: Optional[str])
        """
        try:
            # Add signature if provided or use settings signature
            email_body = body
            if signature or settings.email_signature:
                sig = signature or settings.email_signature
                email_body = f"{body}\n\n{sig}"

            # Create mail object
            from_email_str = f"{settings.from_name} <{settings.from_email}>" if settings.from_name else settings.from_email
            message = Mail(
                from_email=from_email_str,
                to_emails=recipient_email,
                subject=subject,
                html_content=email_body
            )

            # Add reply-to if configured
            if settings.reply_to:
                message.reply_to = settings.reply_to

            # Attach files if provided
            if attachments:
                for file_path in attachments:
                    if Path(file_path).exists():
                        with open(file_path, 'rb') as f:
                            file_data = f.read()
                            encoded_file = base64.b64encode(file_data).decode()

                            attached_file = Attachment(
                                FileContent(encoded_file),
                                FileName(Path(file_path).name),
                                FileType('application/octet-stream'),
                                Disposition('attachment')
                            )
                            message.attachment = attached_file

            # Send email via SendGrid
            sg = SendGridAPIClient(settings.sendgrid_api_key)
            response = sg.send(message)

            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully via SendGrid to {recipient_email}")
                return True, None
            else:
                error_msg = f"SendGrid API returned status code {response.status_code}"
                logger.error(error_msg)
                return False, error_msg

        except Exception as e:
            error_msg = f"Failed to send email via SendGrid: {str(e)}"
            logger.error(error_msg)
            return False, error_msg

    @staticmethod
    def send_email_smtp(
        settings: EmailSettings,
        recipient_email: str,
        subject: str,
        body: str,
        recipient_name: Optional[str] = None,
        attachments: Optional[List[str]] = None,
        signature: Optional[str] = None
    ) -> tuple[bool, Optional[str]]:
        """
        Send email using SMTP with optional attachments
        Returns: (success: bool, error_message: Optional[str])
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{settings.from_name} <{settings.from_email}>" if settings.from_name else settings.from_email
            msg['To'] = recipient_email
            msg['Subject'] = subject

            if settings.reply_to:
                msg['Reply-To'] = settings.reply_to

            # Add signature if provided or use settings signature
            email_body = body
            if signature or settings.email_signature:
                sig = signature or settings.email_signature
                email_body = f"{body}\n\n{sig}"

            # Attach HTML body
            html_part = MIMEText(email_body, 'html')
            msg.attach(html_part)

            # Attach files if provided
            if attachments:
                for file_path in attachments:
                    if Path(file_path).exists():
                        with open(file_path, 'rb') as f:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(f.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename={Path(file_path).name}'
                            )
                            msg.attach(part)

            # Connect to SMTP server and send
            if settings.use_ssl:
                server = smtplib.SMTP_SSL(settings.smtp_server, settings.smtp_port)
            else:
                server = smtplib.SMTP(settings.smtp_server, settings.smtp_port)
                if settings.use_tls:
                    server.starttls()

            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
            server.quit()

            logger.info(f"Email sent successfully to {recipient_email}")
            return True, None

        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP Authentication failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
        except smtplib.SMTPException as e:
            error_msg = f"SMTP error occurred: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
        except Exception as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(error_msg)
            return False, error_msg

    @staticmethod
    def send_email(
        settings: EmailSettings,
        recipient_email: str,
        subject: str,
        body: str,
        recipient_name: Optional[str] = None,
        attachments: Optional[List[str]] = None,
        signature: Optional[str] = None
    ) -> tuple[bool, Optional[str]]:
        """
        Send email using configured provider (SMTP or SendGrid)
        Routes to appropriate sending method based on settings.provider
        Returns: (success: bool, error_message: Optional[str])
        """
        if settings.provider == 'sendgrid':
            return EmailService.send_email_sendgrid(
                settings=settings,
                recipient_email=recipient_email,
                subject=subject,
                body=body,
                recipient_name=recipient_name,
                attachments=attachments,
                signature=signature
            )
        else:  # Default to SMTP
            return EmailService.send_email_smtp(
                settings=settings,
                recipient_email=recipient_email,
                subject=subject,
                body=body,
                recipient_name=recipient_name,
                attachments=attachments,
                signature=signature
            )

    @staticmethod
    def send_document_email(
        db: Session,
        user_id: int,
        email_request: SendEmailRequest
    ) -> tuple[bool, Optional[str], Optional[int]]:
        """
        Send email related to quotation or invoice
        Returns: (success: bool, error_message: Optional[str], email_history_id: Optional[int])
        """
        # Get email settings
        settings = EmailService.get_email_settings(db, user_id)
        if not settings:
            return False, "Email settings not configured", None

        # Get document variables for template rendering
        variables = EmailService.get_document_variables(
            db,
            quotation_id=email_request.quotation_id,
            invoice_id=email_request.invoice_id
        )

        # Render subject and body with variables
        rendered_subject = EmailService.render_template(email_request.subject, variables)
        rendered_body = EmailService.render_template(email_request.body, variables)

        # Get attachments
        attachments = []
        if email_request.attach_document:
            if email_request.quotation_id:
                quotation = db.query(Quotation).filter(Quotation.id == email_request.quotation_id).first()
                if quotation and quotation.file_path and Path(quotation.file_path).exists():
                    attachments.append(quotation.file_path)
            elif email_request.invoice_id:
                invoice = db.query(Invoice).filter(Invoice.id == email_request.invoice_id).first()
                if invoice and invoice.file_path and Path(invoice.file_path).exists():
                    attachments.append(invoice.file_path)

        # Send email
        success, error_message = EmailService.send_email(
            settings=settings,
            recipient_email=email_request.recipient_email,
            subject=rendered_subject,
            body=rendered_body,
            recipient_name=email_request.recipient_name,
            attachments=attachments if attachments else None
        )

        # Get document number and type for snapshot
        document_number = None
        document_type = None

        if email_request.quotation_id:
            quotation = db.query(Quotation).filter(Quotation.id == email_request.quotation_id).first()
            if quotation:
                document_number = quotation.quotation_number
                document_type = 'quotation'
        elif email_request.invoice_id:
            invoice = db.query(Invoice).filter(Invoice.id == email_request.invoice_id).first()
            if invoice:
                document_number = invoice.invoice_number
                document_type = 'invoice'

        # Create email history record
        email_history = EmailHistory(
            recipient_email=email_request.recipient_email,
            recipient_name=email_request.recipient_name,
            subject=rendered_subject,
            body=rendered_body,
            quotation_id=email_request.quotation_id,
            invoice_id=email_request.invoice_id,
            document_number=document_number,
            document_type=document_type,
            email_template_id=email_request.email_template_id,
            status='sent' if success else 'failed',
            error_message=error_message,
            attachments=attachments if attachments else None,
            sent_by=user_id
        )
        db.add(email_history)
        db.commit()
        db.refresh(email_history)

        return success, error_message, email_history.id

    @staticmethod
    def get_default_template(
        db: Session,
        template_type: str
    ) -> Optional[EmailTemplate]:
        """Get default email template for quotation or invoice"""
        template = db.query(EmailTemplate).filter(
            EmailTemplate.template_type == template_type,
            EmailTemplate.is_default == True
        ).first()
        return template
