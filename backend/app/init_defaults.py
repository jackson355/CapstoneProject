"""
Initialize default data for the application.
Creates: roles, superadmin user, email settings, and automation templates.
"""
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.db.session import engine, SessionLocal
from app.models import User, Role, EmailSettings, AutomationTemplate
from app.init_roles import create_default_roles

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def create_superadmin():
    """Create superadmin user if not exists."""
    # First, ensure all default roles exist
    print("Ensuring default roles exist...")
    create_default_roles()

    db: Session = SessionLocal()
    try:
        # Get the superadmin role (should exist after create_default_roles)
        superadmin_role = db.query(Role).filter(Role.name == "superadmin").first()
        if not superadmin_role:
            raise Exception("Superadmin role not found after role initialization")

        # Check if superadmin exists
        superadmin = db.query(User).filter(User.email == "superadmin@gmail.com").first()
        if superadmin:
            print("Superadmin already exists.")
            return

        # Create superadmin
        user = User(
            name="superadmin",
            email="superadmin@gmail.com",
            password=get_password_hash("P@ssw0rd")
        )
        user.role = superadmin_role
        db.add(user)
        db.commit()
        print("Superadmin created successfully.")
    except Exception as e:
        print("Error creating superadmin:", e)
        db.rollback()
    finally:
        db.close()

def create_default_email_settings():
    """Create default email settings if not exists."""
    db: Session = SessionLocal()
    try:
        # Check if email settings already exist
        existing_settings = db.query(EmailSettings).first()
        if existing_settings:
            print("Email settings already exist.")
            return

        # Create default email settings
        email_settings = EmailSettings(
            provider='smtp',
            smtp_server=None,
            smtp_port=None,
            smtp_username=None,
            smtp_password=None,
            use_tls=True,
            use_ssl=False,
            sendgrid_api_key=None,
            from_email='email',
            from_name=None,
            reply_to=None,
            email_signature=None,
            user_id=None,  # Organization-wide settings
            is_active=True
        )
        db.add(email_settings)
        db.commit()
        print("Default email settings created successfully.")
    except Exception as e:
        print("Error creating email settings:", e)
        db.rollback()
    finally:
        db.close()

def create_default_automation_templates():
    """Create default automation templates if not exists."""
    db: Session = SessionLocal()
    try:
        # Define default templates
        default_templates = [
            {
                'trigger_type': 'status_change',
                'trigger_event': 'quotation_accepted',
                'subject': 'Quotation {{quotation_number}} Accepted',
                'body': '<p>Dear {{contact_name}},</p><p>Thanks for accepting our quotation {{quotation_number}}.</p><p>We will process your order and keep you updated on the progress.</p><p>If you have any questions, please don\'t hesitate to contact us.</p>',
                'is_enabled': True
            },
            {
                'trigger_type': 'status_change',
                'trigger_event': 'quotation_rejected',
                'subject': 'Quotation {{quotation_number}} Status Update',
                'body': '<p>Dear {{contact_name}},</p><p>We received your response regarding quotation {{quotation_number}}.</p><p>We appreciate you taking the time to review our proposal. If you would like to discuss alternative options or have any feedback, please let us know.</p>',
                'is_enabled': True
            },
            {
                'trigger_type': 'status_change',
                'trigger_event': 'invoice_paid',
                'subject': 'Payment Received - Invoice {{invoice_number}}',
                'body': '<p>Dear {{contact_name}},</p><p>Thank you for your payment on invoice {{invoice_number}}.</p><p>We have received your payment and your invoice has been marked as paid.</p><p>If you have any questions, please contact us.</p>',
                'is_enabled': True
            },
            {
                'trigger_type': 'deadline',
                'trigger_event': 'quotation_deadline',
                'subject': 'Reminder: Quotation {{quotation_number}} Expires Soon',
                'body': '<p>Dear {{contact_name}},</p><p>This is a friendly reminder that quotation {{quotation_number}} will expire on {{due_date}}.</p><p>If you would like to proceed with this quotation, please let us know before the expiry date.</p>',
                'is_enabled': True
            },
            {
                'trigger_type': 'deadline',
                'trigger_event': 'invoice_deadline',
                'subject': 'Payment Reminder - Invoice {{invoice_number}} Due Soon',
                'body': '<p>Dear {{contact_name}},</p><p>This is a friendly reminder that invoice {{invoice_number}} is due on {{due_date}}.</p><p>If you have already made the payment, please disregard this message.</p>',
                'is_enabled': True
            }
        ]

        created_count = 0
        for template_data in default_templates:
            # Check if template already exists
            existing = db.query(AutomationTemplate).filter(
                AutomationTemplate.trigger_event == template_data['trigger_event']
            ).first()

            if not existing:
                template = AutomationTemplate(**template_data)
                db.add(template)
                created_count += 1

        if created_count > 0:
            db.commit()
            print(f"Created {created_count} default automation templates.")
        else:
            print("All automation templates already exist.")
    except Exception as e:
        print("Error creating automation templates:", e)
        db.rollback()
    finally:
        db.close()

def init_all():
    """Initialize all default data."""
    print("=" * 50)
    print("Initializing default data...")
    print("=" * 50)

    create_superadmin()
    create_default_email_settings()
    create_default_automation_templates()

    print("=" * 50)
    print("Initialization complete!")
    print("=" * 50)

if __name__ == "__main__":
    init_all()
