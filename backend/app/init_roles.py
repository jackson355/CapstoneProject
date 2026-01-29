from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models import Role

def create_default_roles():
    """Create default roles: user, admin, superadmin (id will be auto-assigned)
    Ensures roles exist by unique name without enforcing specific IDs.
    """
    db: Session = SessionLocal()
    try:
        roles_to_create = [
            {"name": "superadmin"},
            {"name": "admin"}, 
            {"name": "user"}
        ]
        
        for role_data in roles_to_create:
            existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not existing_role:
                new_role = Role(name=role_data["name"])
                db.add(new_role)
                print(f"Created role: {role_data['name']}")
        
        db.commit()
        print("Default roles created successfully.")
        
        # Print current roles for verification
        all_roles = db.query(Role).all()
        print("Current roles:")
        for role in all_roles:
            print(f"  ID: {role.id}, Name: {role.name}")
            
    except Exception as e:
        print("Error creating default roles:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_default_roles()