@echo off
REM Quick script to run backend tests on Windows

echo 🧪 Running ICMAS Backend Tests...
echo ==================================

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo ✓ Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo ⚠️  Virtual environment not found. Creating one...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
)

REM Set Python path
set PYTHONPATH=%CD%

REM Run pytest
echo.
echo 🚀 Running tests...
echo.

python -m pytest tests/ -v --tb=short

REM Check exit code
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ All tests passed!
) else (
    echo.
    echo ❌ Some tests failed. Check the output above.
    exit /b 1
)
