# 🧪 Test Suite Setup - ICMAS Project

## Overview

This document describes the test infrastructure set up for the ICMAS (Intelligent Contract Management and Automation System) project, covering both backend (Python/FastAPI) and frontend (React/Next.js) testing.

---

## 📁 Project Structure

```
Project/
├── backend/
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py          # Pytest fixtures and configuration
│   │   ├── test_auth.py          # Authentication tests (17 test cases)
│   │   └── test_quotations.py    # Quotation management tests (25 test cases)
│   └── requirements.txt          # Updated with pytest dependencies
│
├── frontend/
│   ├── src/
│   │   └── components/
│   │       ├── auth/__tests__/
│   │       │   └── sign-in-form.test.tsx    # Sign-in form tests (22 test cases)
│   │       └── dashboard/quotation/__tests__/
│   │           └── quotations-table.test.tsx # Quotations table tests (25 test cases)
│   ├── jest.config.js            # Jest configuration
│   ├── jest.setup.js             # Jest setup file
│   └── package.json              # Updated with test scripts
│
└── .github/
    └── workflows/
        └── ci.yml                # Updated CI/CD workflow
```

---

## 🔧 Backend Testing (Python + pytest)

### Test Files Created

#### 1. `backend/tests/conftest.py`
**Purpose:** Pytest configuration and shared fixtures

**Key Features:**
- Uses **SQLite in-memory database** for testing (100% isolated from production)
- Creates fresh database for each test function
- Automatic cleanup after each test (rollback + drop tables)
- Provides reusable fixtures:
  - `db` - Database session
  - `client` - FastAPI test client
  - `test_roles` - Pre-populated roles (admin, superadmin, user)
  - `test_user`, `test_superadmin`, `test_regular_user` - Test users
  - `auth_headers`, `superadmin_headers` - Authentication tokens
  - `test_client_data` - Sample client
  - `test_template` - Sample quotation template

**Safety:** ✅ No impact on production database

#### 2. `backend/tests/test_auth.py` (17 test cases)
**Purpose:** Authentication and authorization testing

**Test Coverage:**
- ✅ Login success with valid credentials
- ✅ Login failure with invalid email
- ✅ Login failure with invalid password
- ✅ Get current authenticated user
- ✅ Access protected endpoint without token (should fail)
- ✅ Access protected endpoint with invalid token (should fail)
- ✅ Change password successfully
- ✅ Change password with wrong current password (should fail)
- ✅ Change password without authentication (should fail)
- ✅ Password hashing and verification
- ✅ Role-based access control (admin/superadmin can access quotations)
- ✅ Regular users cannot access admin endpoints (should fail)
- ✅ Activity logging for login and password changes

**Key Validations:**
- JWT token generation and validation
- Password hashing (bcrypt)
- Role-based permissions
- Activity log creation
- Error message accuracy

#### 3. `backend/tests/test_quotations.py` (25 test cases)
**Purpose:** Quotation management functionality

**Test Coverage:**
- ✅ Create quotation with auto-filled template
- ✅ Quotation number auto-generation (Q-2025-0001 format)
- ✅ Quotation number sequential increment
- ✅ Create quotation with non-existent client (should fail)
- ✅ Create quotation with non-existent template (should fail)
- ✅ Create quotation with wrong template type (should fail)
- ✅ List quotations with pagination
- ✅ Filter quotations by status (unpaid/paid)
- ✅ Search quotations by number or client name
- ✅ Update quotation status
- ✅ Update quotation due date
- ✅ Update non-existent quotation (should fail)
- ✅ Delete quotation successfully
- ✅ Delete non-existent quotation (should fail)
- ✅ Get quotation by ID
- ✅ Get non-existent quotation (should fail)
- ✅ Template placeholder filling (mocked)
- ✅ Unfilled placeholder tracking
- ✅ Activity log creation for quotation actions

**Key Validations:**
- CRUD operations
- Business logic (quotation numbering)
- File handling (mocked)
- Pagination and filtering
- Authorization checks
- Activity logging

### Running Backend Tests

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth.py -v

# Run with coverage report
pytest tests/ -v --cov=app --cov-report=html

# Run tests in parallel (faster)
pytest tests/ -v -n auto
```

### New Dependencies Added to `requirements.txt`
```txt
pytest>=7.4.0
pytest-asyncio>=0.21.0
httpx>=0.24.0  # For TestClient
```

---

## 🎨 Frontend Testing (React + Jest + Testing Library)

### Test Files Created

#### 1. `frontend/jest.config.js`
**Purpose:** Jest configuration for Next.js

**Features:**
- Uses `next/jest` for Next.js compatibility
- `jsdom` test environment for React components
- Path aliasing (`@/` maps to `src/`)
- Coverage collection settings
- Test file patterns

#### 2. `frontend/jest.setup.js`
**Purpose:** Jest setup file

**Features:**
- Imports `@testing-library/jest-dom` for DOM matchers

#### 3. `frontend/src/components/auth/__tests__/sign-in-form.test.tsx` (22 test cases)
**Purpose:** Sign-in form component testing

**Test Coverage:**
- ✅ Render form with all elements
- ✅ Email input validation (required, format)
- ✅ Password input validation (required)
- ✅ Password visibility toggle
- ✅ Successful login flow
- ✅ Failed login with error message display
- ✅ Submit button disabled during login
- ✅ Submit button re-enabled after error
- ✅ Multiple login attempts
- ✅ Form state management
- ✅ Router refresh on success
- ✅ Session check on success
- ✅ No session check on failure

**Key Validations:**
- Form rendering
- Input validation (Zod schema)
- User interactions (typing, clicking)
- API call mocking
- Router navigation
- Error handling
- Loading states

**Mocks Used:**
- `next/navigation` (useRouter)
- `@/lib/auth/client` (authClient.signInWithPassword)
- `@/hooks/use-user` (useUser, checkSession)

#### 4. `frontend/src/components/dashboard/quotation/__tests__/quotations-table.test.tsx` (25 test cases)
**Purpose:** Quotations table component testing

**Test Coverage:**
- ✅ Render table with quotation data
- ✅ Display table headers
- ✅ Display contact information
- ✅ Loading skeletons during data fetch
- ✅ Empty state with "Create Quotation" button
- ✅ Status chips with correct colors (unpaid=warning, paid=success)
- ✅ Search functionality with debounce
- ✅ Filter by status dropdown
- ✅ Sorting by quotation number, status, created date
- ✅ Pagination controls
- ✅ Actions menu (Edit Document, Edit Details, Delete)
- ✅ Edit details dialog
- ✅ Update quotation status
- ✅ Update due date
- ✅ Delete quotation with confirmation
- ✅ Cancel delete when user declines
- ✅ Date formatting
- ✅ Display dash for missing dates
- ✅ Error handling (network failures)
- ✅ Client data fetching and display

**Key Validations:**
- Table rendering
- Data display
- User interactions (search, filter, sort, paginate)
- Action menu
- Edit dialog
- Delete confirmation
- API mocking
- Error states

**Mocks Used:**
- `next/link` (Link component)
- `@/lib/auth/client` (getQuotations, getClientById, updateQuotation, deleteQuotation)

### Running Frontend Tests

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- sign-in-form.test.tsx
```

### New Scripts Added to `package.json`
```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

### New Dependencies Added to `package.json`
```json
"devDependencies": {
  "@testing-library/user-event": "^14.5.1"
}
```

---

## 🚀 CI/CD Workflow Updates

### Updated `.github/workflows/ci.yml`

**Backend Changes:**
```yaml
- name: Run backend tests
  env:
    DATABASE_URL: postgresql://admin:admin@localhost:5432/icmasdb
  run: |
    cd backend
    source venv/bin/activate
    pytest tests/ -v --tb=short || exit 1
```

**Frontend Changes:**
```yaml
- name: Run frontend tests
  run: |
    cd frontend
    npm test -- --passWithNoTests || exit 1
```

**What Changed:**
- ❌ Removed: `|| echo "No tests yet"` (tests now required)
- ✅ Added: `|| exit 1` (fail CI if tests fail)
- ✅ Added: `-v --tb=short` (verbose output, short tracebacks)
- ✅ Added: `--passWithNoTests` (for frontend, pass if no tests yet)

**CI Pipeline Flow:**
1. Checkout code
2. Setup Python 3.11
3. Install backend dependencies
4. Wait for PostgreSQL
5. **Run backend tests** ⚡
6. Setup Node.js 18
7. Install frontend dependencies
8. Build frontend
9. **Run frontend tests** ⚡

---

## 📊 Test Coverage Summary

| Component | Test Files | Test Cases | Coverage |
|-----------|-----------|-----------|----------|
| **Backend Auth** | 1 | 17 | Authentication, RBAC |
| **Backend Quotations** | 1 | 25 | CRUD, Business Logic |
| **Frontend Sign-in** | 1 | 22 | Form, Validation, Auth |
| **Frontend Quotations** | 1 | 25 | Table, Actions, UI |
| **TOTAL** | **4** | **89** | **Core Features** |

---

## 🛡️ Data Safety Guarantees

### Backend Tests
- ✅ **Separate test database** (SQLite in-memory)
- ✅ **Automatic cleanup** after each test
- ✅ **Transaction rollback** on test completion
- ✅ **Fresh database** for every test function
- ✅ **Zero impact** on production database

### Frontend Tests
- ✅ **100% mocked** API calls
- ✅ **No real HTTP requests** made
- ✅ **Backend not required** to run tests
- ✅ **In-memory execution** in Node.js
- ✅ **Zero network activity**

---

## 🎯 What's Tested vs. What's Not

### ✅ Tested (High Priority)
- Authentication (login, logout, token validation)
- Password change functionality
- Role-based access control
- Quotation CRUD operations
- Quotation numbering system
- Status updates (unpaid → paid)
- Search and filter functionality
- Pagination
- UI component rendering
- Form validation
- User interactions
- Error handling

### ⚠️ Not Tested Yet (Future Enhancements)
- Client management CRUD
- Template management CRUD
- Quotation placeholder filling service (partially mocked)
- OnlyOffice document integration
- File upload/download
- PDF generation
- Email sending
- Activity logs display
- Dashboard analytics
- User profile updates

---

## 🔍 How Tests Work

### Backend Test Flow
```
1. Test starts
2. conftest.py creates fresh SQLite database
3. Creates tables from SQLAlchemy models
4. Populates test data (users, roles, clients, templates)
5. Test runs with isolated data
6. Test completes
7. Rollback transaction
8. Drop all tables
9. Next test gets clean slate
```

### Frontend Test Flow
```
1. Test starts
2. Mock all external dependencies (router, API client, hooks)
3. Render component with React Testing Library
4. Simulate user interactions (type, click, etc.)
5. Assert expected behavior (UI updates, API calls, etc.)
6. Test completes
7. Cleanup (unmount component)
8. Next test gets fresh mocks
```

---

## 📝 Example Test Commands

### Backend
```bash
# Run all backend tests
cd backend && pytest tests/ -v

# Run only auth tests
cd backend && pytest tests/test_auth.py -v

# Run only quotation tests
cd backend && pytest tests/test_quotations.py -v

# Run with coverage
cd backend && pytest tests/ -v --cov=app --cov-report=term-missing

# Run specific test
cd backend && pytest tests/test_auth.py::TestAuthentication::test_login_success -v
```

### Frontend
```bash
# Run all frontend tests
cd frontend && npm test

# Run only sign-in tests
cd frontend && npm test sign-in-form.test.tsx

# Run only quotations table tests
cd frontend && npm test quotations-table.test.tsx

# Run with coverage
cd frontend && npm run test:coverage

# Watch mode (re-run on file changes)
cd frontend && npm run test:watch
```

---

## 🚨 Troubleshooting

### Backend Tests Fail
**Issue:** `ModuleNotFoundError: No module named 'pytest'`
**Solution:** Install test dependencies
```bash
cd backend
pip install -r requirements.txt
```

**Issue:** Database connection error
**Solution:** Tests use SQLite in-memory, no database needed. If error persists, check conftest.py

### Frontend Tests Fail
**Issue:** `Cannot find module '@testing-library/user-event'`
**Solution:** Install missing dependency
```bash
cd frontend
npm install
```

**Issue:** Jest configuration not found
**Solution:** Ensure `jest.config.js` and `jest.setup.js` exist in frontend root

---

## 🎓 Best Practices Followed

### Backend
- ✅ Each test is independent (no shared state)
- ✅ Use fixtures for common setup (DRY principle)
- ✅ Mock external services (file storage, OnlyOffice)
- ✅ Test both success and failure cases
- ✅ Descriptive test names (test_login_with_invalid_password)
- ✅ Clear assertions (assert response.status_code == 401)

### Frontend
- ✅ Render components in isolation
- ✅ Mock all external dependencies
- ✅ Test user interactions (not implementation details)
- ✅ Use accessible queries (getByRole, getByLabelText)
- ✅ Wait for async updates (waitFor)
- ✅ Clean up after each test

---

## 📚 Resources

### Backend Testing
- [pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing Guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)

### Frontend Testing
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

## ✅ Summary

**Total Test Cases:** 89
- Backend: 42 test cases (authentication + quotations)
- Frontend: 47 test cases (sign-in form + quotations table)

**Coverage:** Core authentication and quotation management features
**Safety:** 100% isolated from production data
**CI/CD:** Integrated into GitHub Actions workflow
**Status:** ✅ Ready for continuous integration

---

**Created:** 2025-01-15
**Last Updated:** 2025-01-15
**Maintained By:** Claude Code
