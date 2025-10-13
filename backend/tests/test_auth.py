"""
Authentication API Tests

Tests for authentication endpoints including:
- User login
- Token generation
- Password change
- Protected endpoint access
- Role-based access control
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User, ActivityLog
from app.api.auth import hash_password, verify_password


class TestAuthentication:
    """Test authentication endpoints"""

    def test_login_success(self, client: TestClient, test_user: User, db: Session):
        """Test successful login with valid credentials"""
        response = client.post(
            "/auth/token",
            data={
                "username": "admin@test.com",
                "password": "testpassword123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0

        # Verify activity log was created
        log = db.query(ActivityLog).filter(
            ActivityLog.action == "auth.login_success",
            ActivityLog.actor_user_id == test_user.id
        ).first()
        assert log is not None
        assert log.message == "User logged in"

    def test_login_invalid_email(self, client: TestClient, test_user: User):
        """Test login with invalid email"""
        response = client.post(
            "/auth/token",
            data={
                "username": "nonexistent@test.com",
                "password": "testpassword123"
            }
        )

        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

    def test_login_invalid_password(self, client: TestClient, test_user: User):
        """Test login with invalid password"""
        response = client.post(
            "/auth/token",
            data={
                "username": "admin@test.com",
                "password": "wrongpassword"
            }
        )

        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

    def test_get_current_user(self, client: TestClient, auth_headers: dict):
        """Test retrieving current authenticated user"""
        response = client.get("/auth/users/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@test.com"
        assert data["name"] == "Test Admin"
        assert "password" not in data  # Password should not be exposed

    def test_get_current_user_without_token(self, client: TestClient):
        """Test accessing protected endpoint without authentication"""
        response = client.get("/auth/users/me")

        assert response.status_code == 401

    def test_get_current_user_invalid_token(self, client: TestClient):
        """Test accessing protected endpoint with invalid token"""
        response = client.get(
            "/auth/users/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )

        assert response.status_code == 400
        assert "Invalid authentication credentials" in response.json()["detail"]

    def test_change_password_success(self, client: TestClient, auth_headers: dict, db: Session, test_user: User):
        """Test successful password change"""
        response = client.post(
            "/auth/change-password",
            headers=auth_headers,
            json={
                "current_password": "testpassword123",
                "new_password": "newpassword456"
            }
        )

        assert response.status_code == 200
        assert "Password updated successfully" in response.json()["detail"]

        # Verify password was actually changed in database
        db.refresh(test_user)
        assert verify_password("newpassword456", test_user.password)

        # Verify activity log was created
        log = db.query(ActivityLog).filter(
            ActivityLog.action == "auth.password_change_success",
            ActivityLog.actor_user_id == test_user.id
        ).first()
        assert log is not None

    def test_change_password_wrong_current(self, client: TestClient, auth_headers: dict, db: Session):
        """Test password change with incorrect current password"""
        response = client.post(
            "/auth/change-password",
            headers=auth_headers,
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword456"
            }
        )

        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]

        # Verify failure activity log was created
        log = db.query(ActivityLog).filter(
            ActivityLog.action == "auth.password_change_failure"
        ).first()
        assert log is not None

    def test_change_password_without_auth(self, client: TestClient):
        """Test password change without authentication"""
        response = client.post(
            "/auth/change-password",
            json={
                "current_password": "testpassword123",
                "new_password": "newpassword456"
            }
        )

        assert response.status_code == 401


class TestPasswordHashing:
    """Test password hashing utility functions"""

    def test_hash_password(self):
        """Test password hashing"""
        password = "mysecretpassword"
        hashed = hash_password(password)

        assert hashed != password
        assert len(hashed) > 0
        assert hashed.startswith("$2b$")  # bcrypt hash format

    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "mysecretpassword"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "mysecretpassword"
        hashed = hash_password(password)

        assert verify_password("wrongpassword", hashed) is False

    def test_hash_same_password_different_hashes(self):
        """Test that same password produces different hashes (salt)"""
        password = "mysecretpassword"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2  # Different hashes due to salt
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestRoleBasedAccess:
    """Test role-based access control"""

    def test_admin_access_quotations(self, client: TestClient, auth_headers: dict):
        """Test admin can access quotations endpoint"""
        response = client.get("/quotations/", headers=auth_headers)

        # Should return 200 (success) not 403 (forbidden)
        assert response.status_code == 200

    def test_superadmin_access_quotations(self, client: TestClient, superadmin_headers: dict):
        """Test superadmin can access quotations endpoint"""
        response = client.get("/quotations/", headers=superadmin_headers)

        assert response.status_code == 200

    def test_regular_user_cannot_access_quotations(self, client: TestClient, test_regular_user: User):
        """Test regular user cannot access admin-only quotations endpoint"""
        # Login as regular user
        login_response = client.post(
            "/auth/token",
            data={
                "username": "user@test.com",
                "password": "userpassword123"
            }
        )
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Try to access quotations
        response = client.get("/quotations/", headers=headers)

        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]

    def test_unauthenticated_cannot_access_quotations(self, client: TestClient):
        """Test unauthenticated user cannot access protected endpoint"""
        response = client.get("/quotations/")

        assert response.status_code == 401
