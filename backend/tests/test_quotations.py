"""
Quotation Management API Tests

Tests for quotation endpoints including:
- Create quotation with auto-filled template
- List quotations with pagination and filters
- Update quotation (status, due date)
- Delete quotation
- Quotation number generation
- Placeholder tracking
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import io

from app.models import Quotation, ActivityLog


class TestQuotationCreation:
    """Test quotation creation functionality"""

    @patch('app.services.file_storage.file_storage.file_exists')
    @patch('app.services.file_storage.file_storage.get_docx_content')
    @patch('app.services.quotation_filler.quotation_filler.fill_template_with_client_data')
    def test_create_quotation_success(
        self,
        mock_fill_template,
        mock_get_docx,
        mock_file_exists,
        client: TestClient,
        auth_headers: dict,
        test_client_data,
        test_template,
        db: Session
    ):
        """Test successful quotation creation with auto-filled template"""
        # Mock file storage and template filling
        mock_file_exists.return_value = True
        mock_get_docx.return_value = b"mock docx content"
        mock_fill_template.return_value = (b"filled docx content", ["unfilled_placeholder_1"])

        quotation_data = {
            "client_id": test_client_data.id,
            "selected_contact": {
                "name": "John Doe",
                "email": "john@testcompany.com",
                "phone": "+65 9123 4567"
            },
            "template_id": test_template.id,
            "my_company_info": {
                "name": "My Company Ltd",
                "email": "info@mycompany.com",
                "phone": "+65 6123 4567",
                "address": "456 Business Road",
                "website": "www.mycompany.com"
            },
            "due_date": (datetime.now() + timedelta(days=30)).isoformat()
        }

        response = client.post(
            "/quotations/",
            headers=auth_headers,
            json=quotation_data
        )

        assert response.status_code == 200
        data = response.json()

        # Verify quotation number format: Q{YYYY}{MM}{NNN}{suffix}
        current_year = datetime.now().year
        current_month = datetime.now().month
        expected_prefix = f"Q{current_year}{current_month:02d}"
        assert data["quotation_number"].startswith(expected_prefix)
        assert len(data["quotation_number"]) >= 10  # Q + YYYY + MM + NNN minimum

        # Verify data
        assert data["client_id"] == test_client_data.id
        assert data["template_id"] == test_template.id
        assert data["status"] == "pending"
        assert data["selected_contact"]["name"] == "John Doe"
        assert data["my_company_info"]["name"] == "My Company Ltd"

        # Verify file was created
        assert data["file_path"] is not None
        assert data["file_name"] is not None
        assert data["file_size"] > 0

        # Verify unfilled placeholders were tracked
        assert data["unfilled_placeholders"] == ["unfilled_placeholder_1"]

        # Verify activity log was created
        log = db.query(ActivityLog).filter(
            ActivityLog.action == "quotation.create"
        ).first()
        assert log is not None
        assert "created for Test Company Ltd" in log.message

    def test_create_quotation_client_not_found(
        self,
        client: TestClient,
        auth_headers: dict,
        test_template
    ):
        """Test quotation creation with non-existent client"""
        quotation_data = {
            "client_id": 99999,  # Non-existent
            "selected_contact": {
                "name": "John Doe",
                "email": "john@test.com"
            },
            "template_id": test_template.id
        }

        response = client.post(
            "/quotations/",
            headers=auth_headers,
            json=quotation_data
        )

        assert response.status_code == 404
        assert "Client not found" in response.json()["detail"]

    def test_create_quotation_template_not_found(
        self,
        client: TestClient,
        auth_headers: dict,
        test_client_data
    ):
        """Test quotation creation with non-existent template"""
        quotation_data = {
            "client_id": test_client_data.id,
            "selected_contact": {
                "name": "John Doe",
                "email": "john@test.com"
            },
            "template_id": 99999  # Non-existent
        }

        response = client.post(
            "/quotations/",
            headers=auth_headers,
            json=quotation_data
        )

        assert response.status_code == 404
        assert "Template not found" in response.json()["detail"]

    @patch('app.services.file_storage.file_storage.file_exists')
    def test_create_quotation_wrong_template_type(
        self,
        mock_file_exists,
        client: TestClient,
        auth_headers: dict,
        test_client_data,
        test_template,
        db: Session
    ):
        """Test quotation creation with non-quotation template"""
        # Change template type to invoice
        test_template.template_type = "invoice"
        db.commit()

        mock_file_exists.return_value = True

        quotation_data = {
            "client_id": test_client_data.id,
            "selected_contact": {
                "name": "John Doe",
                "email": "john@test.com"
            },
            "template_id": test_template.id
        }

        response = client.post(
            "/quotations/",
            headers=auth_headers,
            json=quotation_data
        )

        assert response.status_code == 400
        assert "not a quotation template" in response.json()["detail"]

    def test_create_quotation_without_auth(
        self,
        client: TestClient,
        test_client_data,
        test_template
    ):
        """Test quotation creation without authentication"""
        quotation_data = {
            "client_id": test_client_data.id,
            "selected_contact": {
                "name": "John Doe",
                "email": "john@test.com"
            },
            "template_id": test_template.id
        }

        response = client.post("/quotations/", json=quotation_data)

        assert response.status_code == 401


class TestQuotationNumberGeneration:
    """Test quotation number auto-generation"""

    @patch('app.services.file_storage.file_storage.file_exists')
    @patch('app.services.file_storage.file_storage.get_docx_content')
    @patch('app.services.quotation_filler.quotation_filler.fill_template_with_client_data')
    def test_quotation_number_increments(
        self,
        mock_fill_template,
        mock_get_docx,
        mock_file_exists,
        client: TestClient,
        auth_headers: dict,
        test_client_data,
        test_template,
        db: Session
    ):
        """Test quotation numbers increment correctly"""
        # Mock dependencies
        mock_file_exists.return_value = True
        mock_get_docx.return_value = b"mock docx content"
        mock_fill_template.return_value = (b"filled docx content", [])

        quotation_data = {
            "client_id": test_client_data.id,
            "selected_contact": {
                "name": "John Doe",
                "email": "john@test.com"
            },
            "template_id": test_template.id
        }

        # Create first quotation
        response1 = client.post("/quotations/", headers=auth_headers, json=quotation_data)
        assert response1.status_code == 200
        quotation1_number = response1.json()["quotation_number"]

        # Create second quotation
        response2 = client.post("/quotations/", headers=auth_headers, json=quotation_data)
        assert response2.status_code == 200
        quotation2_number = response2.json()["quotation_number"]

        # Extract 3-digit running number from new format Q{YYYY}{MM}{NNN}...
        # Running number sits at characters 7-9 (after Q + YYYY + MM)
        num1 = int(quotation1_number[7:10])
        num2 = int(quotation2_number[7:10])
        assert num2 == num1 + 1


class TestQuotationListing:
    """Test quotation listing and filtering"""

    @patch('app.services.file_storage.file_storage.file_exists')
    @patch('app.services.file_storage.file_storage.get_docx_content')
    @patch('app.services.quotation_filler.quotation_filler.fill_template_with_client_data')
    def test_list_quotations(
        self,
        mock_fill_template,
        mock_get_docx,
        mock_file_exists,
        client: TestClient,
        auth_headers: dict,
        test_client_data,
        test_template
    ):
        """Test listing quotations with pagination"""
        # Mock dependencies
        mock_file_exists.return_value = True
        mock_get_docx.return_value = b"mock docx content"
        mock_fill_template.return_value = (b"filled docx content", [])

        # Create test quotations
        for i in range(3):
            quotation_data = {
                "client_id": test_client_data.id,
                "selected_contact": {
                    "name": f"Contact {i}",
                    "email": f"contact{i}@test.com"
                },
                "template_id": test_template.id
            }
            client.post("/quotations/", headers=auth_headers, json=quotation_data)

        # List quotations
        response = client.get("/quotations/?page=0&per_page=10", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["quotations"]) == 3
        assert data["page"] == 0
        assert data["per_page"] == 10

    @patch('app.services.file_storage.file_storage.file_exists')
    @patch('app.services.file_storage.file_storage.get_docx_content')
    @patch('app.services.quotation_filler.quotation_filler.fill_template_with_client_data')
    def test_filter_quotations_by_status(
        self,
        mock_fill_template,
        mock_get_docx,
        mock_file_exists,
        client: TestClient,
        auth_headers: dict,
        test_client_data,
        test_template,
        db: Session
    ):
        """Test filtering quotations by status"""
        # Mock dependencies
        mock_file_exists.return_value = True
        mock_get_docx.return_value = b"mock docx content"
        mock_fill_template.return_value = (b"filled docx content", [])

        # Create quotations with different statuses
        quotation_data = {
            "client_id": test_client_data.id,
            "selected_contact": {
                "name": "Contact 1",
                "email": "contact1@test.com"
            },
            "template_id": test_template.id
        }

        # Create pending quotation
        response1 = client.post("/quotations/", headers=auth_headers, json=quotation_data)
        quotation1_id = response1.json()["id"]

        # Create another and mark as accepted
        response2 = client.post("/quotations/", headers=auth_headers, json=quotation_data)
        quotation2_id = response2.json()["id"]
        client.put(
            f"/quotations/{quotation2_id}",
            headers=auth_headers,
            json={"status": "accepted"}
        )

        # Filter by pending
        response = client.get("/quotations/?status=pending", headers=auth_headers)
        assert response.status_code == 200
        pending_quotations = response.json()["quotations"]
        assert len(pending_quotations) == 1
        assert pending_quotations[0]["status"] == "pending"

        # Filter by accepted
        response = client.get("/quotations/?status=accepted", headers=auth_headers)
        assert response.status_code == 200
        accepted_quotations = response.json()["quotations"]
        assert len(accepted_quotations) == 1
        assert accepted_quotations[0]["status"] == "accepted"

    @patch('app.services.file_storage.file_storage.file_exists')
    @patch('app.services.file_storage.file_storage.get_docx_content')
    @patch('app.services.quotation_filler.quotation_filler.fill_template_with_client_data')
    def test_search_quotations(
        self,
        mock_fill_template,
        mock_get_docx,
        mock_file_exists,
        client: TestClient,
        auth_headers: dict,
        test_client_data,
        test_template
    ):
        """Test searching quotations by quotation number or client name"""
        # Mock dependencies
        mock_file_exists.return_value = True
        mock_get_docx.return_value = b"mock docx content"
        mock_fill_template.return_value = (b"filled docx content", [])

        # Create quotation
        quotation_data = {
            "client_id": test_client_data.id,
            "selected_contact": {
                "name": "Contact 1",
                "email": "contact1@test.com"
            },
            "template_id": test_template.id
        }
        create_response = client.post("/quotations/", headers=auth_headers, json=quotation_data)
        quotation_number = create_response.json()["quotation_number"]

        # Search by quotation number
        response = client.get(
            f"/quotations/?search={quotation_number}",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["total"] >= 1

        # Search by client name
        response = client.get(
            "/quotations/?search=Test Company",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["total"] >= 1


class TestQuotationUpdate:
    """Test quotation update functionality"""

    @patch('app.services.file_storage.file_storage.file_exists')
    @patch('app.services.file_storage.file_storage.get_docx_content')
    @patch('app.services.quotation_filler.quotation_filler.fill_template_with_client_data')
    def test_update_quotation_status(
        self,
        mock_fill_template,
        mock_get_docx,
        mock_file_exists,
        client: TestClient,
        auth_headers: dict,
        test_client_data,
        test_template,
        db: Session
    ):
        """Test updating quotation status"""
        # Mock dependencies
        mock_file_exists.return_value = True
        mock_get_docx.return_value = b"mock docx content"
        mock_fill_template.return_value = (b"filled docx content", [])

        # Create quotation
        quotation_data = {
            "client_id": test_client_data.id,
            "selected_contact": {
                "name": "John Doe",
                "email": "john@test.com"
            },
            "template_id": test_template.id
        }
        create_response = client.post("/quotations/", headers=auth_headers, json=quotation_data)
        quotation_id = create_response.json()["id"]

        # Update status to accepted
        response = client.put(
            f"/quotations/{quotation_id}",
            headers=auth_headers,
            json={"status": "accepted"}
        )

        assert response.status_code == 200
        assert response.json()["status"] == "accepted"

        # Verify activity log
        log = db.query(ActivityLog).filter(
            ActivityLog.action == "quotation.update",
            ActivityLog.target_id == quotation_id
        ).first()
        assert log is not None

    @patch('app.services.file_storage.file_storage.file_exists')
    @patch('app.services.file_storage.file_storage.get_docx_content')
    @patch('app.services.quotation_filler.quotation_filler.fill_template_with_client_data')
    def test_update_quotation_due_date(
        self,
        mock_fill_template,
        mock_get_docx,
        mock_file_exists,
        client: TestClient,
        auth_headers: dict,
        test_client_data,
        test_template
    ):
        """Test updating quotation due date"""
        # Mock dependencies
        mock_file_exists.return_value = True
        mock_get_docx.return_value = b"mock docx content"
        mock_fill_template.return_value = (b"filled docx content", [])

        # Create quotation
        quotation_data = {
            "client_id": test_client_data.id,
            "selected_contact": {
                "name": "John Doe",
                "email": "john@test.com"
            },
            "template_id": test_template.id
        }
        create_response = client.post("/quotations/", headers=auth_headers, json=quotation_data)
        quotation_id = create_response.json()["id"]

        # Update due date
        new_due_date = (datetime.now() + timedelta(days=60)).isoformat()
        response = client.put(
            f"/quotations/{quotation_id}",
            headers=auth_headers,
            json={"due_date": new_due_date}
        )

        assert response.status_code == 200
        assert response.json()["due_date"] is not None

    def test_update_quotation_not_found(self, client: TestClient, auth_headers: dict):
        """Test updating non-existent quotation"""
        response = client.put(
            "/quotations/99999",
            headers=auth_headers,
            json={"status": "accepted"}
        )

        assert response.status_code == 404
        assert "Quotation not found" in response.json()["detail"]


class TestQuotationDeletion:
    """Test quotation deletion"""

    @patch('app.services.file_storage.file_storage.file_exists')
    @patch('app.services.file_storage.file_storage.get_docx_content')
    @patch('app.services.quotation_filler.quotation_filler.fill_template_with_client_data')
    def test_delete_quotation(
        self,
        mock_fill_template,
        mock_get_docx,
        mock_file_exists,
        client: TestClient,
        auth_headers: dict,
        test_client_data,
        test_template,
        db: Session
    ):
        """Test deleting a quotation"""
        # Mock dependencies
        mock_file_exists.return_value = True
        mock_get_docx.return_value = b"mock docx content"
        mock_fill_template.return_value = (b"filled docx content", [])

        # Create quotation
        quotation_data = {
            "client_id": test_client_data.id,
            "selected_contact": {
                "name": "John Doe",
                "email": "john@test.com"
            },
            "template_id": test_template.id
        }
        create_response = client.post("/quotations/", headers=auth_headers, json=quotation_data)
        quotation_id = create_response.json()["id"]
        quotation_number = create_response.json()["quotation_number"]

        # Delete quotation
        response = client.delete(f"/quotations/{quotation_id}", headers=auth_headers)

        assert response.status_code == 200
        assert "deleted" in response.json()["detail"]

        # Verify quotation is deleted
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        assert quotation is None

        # Verify activity log
        log = db.query(ActivityLog).filter(
            ActivityLog.action == "quotation.delete",
            ActivityLog.target_id == quotation_id
        ).first()
        assert log is not None
        assert quotation_number in log.message

    def test_delete_quotation_not_found(self, client: TestClient, auth_headers: dict):
        """Test deleting non-existent quotation"""
        response = client.delete("/quotations/99999", headers=auth_headers)

        assert response.status_code == 404
        assert "Quotation not found" in response.json()["detail"]


class TestQuotationRetrieval:
    """Test retrieving single quotation"""

    @patch('app.services.file_storage.file_storage.file_exists')
    @patch('app.services.file_storage.file_storage.get_docx_content')
    @patch('app.services.quotation_filler.quotation_filler.fill_template_with_client_data')
    def test_get_quotation_by_id(
        self,
        mock_fill_template,
        mock_get_docx,
        mock_file_exists,
        client: TestClient,
        auth_headers: dict,
        test_client_data,
        test_template
    ):
        """Test retrieving a specific quotation by ID"""
        # Mock dependencies
        mock_file_exists.return_value = True
        mock_get_docx.return_value = b"mock docx content"
        mock_fill_template.return_value = (b"filled docx content", [])

        # Create quotation
        quotation_data = {
            "client_id": test_client_data.id,
            "selected_contact": {
                "name": "John Doe",
                "email": "john@test.com"
            },
            "template_id": test_template.id
        }
        create_response = client.post("/quotations/", headers=auth_headers, json=quotation_data)
        quotation_id = create_response.json()["id"]

        # Get quotation
        response = client.get(f"/quotations/{quotation_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == quotation_id
        assert data["client_id"] == test_client_data.id

    def test_get_quotation_not_found(self, client: TestClient, auth_headers: dict):
        """Test retrieving non-existent quotation"""
        response = client.get("/quotations/99999", headers=auth_headers)

        assert response.status_code == 404
        assert "Quotation not found" in response.json()["detail"]
