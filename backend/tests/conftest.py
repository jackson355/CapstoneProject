"""
Test configuration and fixtures for pytest.
This file sets up the test database and provides common fixtures.
"""

import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient
from typing import Generator

from app.db.session import Base, get_db
from app.main import app
from app.models import User, Role, Client, Template, Quotation
from app.api.auth import hash_password

# Use in-memory SQLite for testing - completely isolated from production DB
TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """
    Create a fresh database for each test.
    After the test completes, all data is rolled back.
    """
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create a new session for the test
    db_session = TestingSessionLocal()

    try:
        yield db_session
    finally:
        # Rollback any changes and close the session
        db_session.rollback()
        db_session.close()

        # Drop all tables to ensure clean state for next test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """
    Create a test client with database dependency override.
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_roles(db: Session) -> dict:
    """Create test roles in the database."""
    superadmin_role = Role(id=2, name="superadmin")
    admin_role = Role(id=1, name="admin")
    user_role = Role(id=3, name="user")

    db.add(superadmin_role)
    db.add(admin_role)
    db.add(user_role)
    db.commit()

    return {
        "superadmin": superadmin_role,
        "admin": admin_role,
        "user": user_role
    }


@pytest.fixture(scope="function")
def test_user(db: Session, test_roles: dict) -> User:
    """Create a test admin user."""
    user = User(
        name="Test Admin",
        email="admin@test.com",
        password=hash_password("testpassword123"),
        role_id=test_roles["admin"].id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_superadmin(db: Session, test_roles: dict) -> User:
    """Create a test superadmin user."""
    user = User(
        name="Test Superadmin",
        email="superadmin@test.com",
        password=hash_password("superpassword123"),
        role_id=test_roles["superadmin"].id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_regular_user(db: Session, test_roles: dict) -> User:
    """Create a test regular user (non-admin)."""
    user = User(
        name="Test User",
        email="user@test.com",
        password=hash_password("userpassword123"),
        role_id=test_roles["user"].id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def auth_headers(client: TestClient, test_user: User) -> dict:
    """Get authentication headers for test admin user."""
    response = client.post(
        "/auth/token",
        data={"username": "admin@test.com", "password": "testpassword123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def superadmin_headers(client: TestClient, test_superadmin: User) -> dict:
    """Get authentication headers for test superadmin user."""
    response = client.post(
        "/auth/token",
        data={"username": "superadmin@test.com", "password": "superpassword123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def test_client_data(db: Session) -> Client:
    """Create a test client in the database."""
    client_obj = Client(
        company_name="Test Company Ltd",
        uen="202012345A",
        industry="Technology",
        address="123 Test Street, Test Building",
        postal_code="123456",
        contacts=[
            {
                "name": "John Doe",
                "email": "john@testcompany.com",
                "phone": "+65 9123 4567"
            },
            {
                "name": "Jane Smith",
                "email": "jane@testcompany.com",
                "phone": "+65 9234 5678"
            }
        ]
    )
    db.add(client_obj)
    db.commit()
    db.refresh(client_obj)
    return client_obj


@pytest.fixture(scope="function")
def test_template(db: Session, test_user: User) -> Template:
    """Create a test quotation template."""
    template = Template(
        name="Test Quotation Template",
        description="A test template for quotations",
        template_type="quotation",
        content={"html": "<p>Test template content</p>"},
        variables=["client_company_name", "contact_name", "contact_email"],
        is_ai_enhanced=False,
        status="saved",
        file_path="uploads/templates/test_template.docx",
        file_name="test_template.docx",
        file_size=1024,
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        created_by=test_user.id
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template
