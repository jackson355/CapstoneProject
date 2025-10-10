from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.db.session import engine, SessionLocal
from app.models import User, Role
from app.init_roles import create_default_roles

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def create_superadmin():
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
        superadmin = db.query(User).filter(User.email == "admin@gmail.com").first()
        if superadmin:
            print("Superadmin already exists.")
            return

        # Create superadmin
        user = User(
            name="admin",
            email="admin@gmail.com",
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

if __name__ == "__main__":
    create_superadmin()
