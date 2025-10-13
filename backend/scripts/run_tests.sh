#!/bin/bash
# Quick script to run backend tests locally

echo "🧪 Running ICMAS Backend Tests..."
echo "=================================="

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "✓ Activating virtual environment..."
    source venv/bin/activate
else
    echo "⚠️  Virtual environment not found. Creating one..."
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Set Python path
export PYTHONPATH=$(pwd)

# Run pytest
echo ""
echo "🚀 Running tests..."
echo ""

python -m pytest tests/ -v --tb=short

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
else
    echo ""
    echo "❌ Some tests failed. Check the output above."
    exit 1
fi
