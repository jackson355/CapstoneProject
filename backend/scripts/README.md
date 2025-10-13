# Backend Scripts

Helper scripts for common development tasks.

## 🧪 Test Runner Scripts

### Windows
```bash
scripts\run_tests.bat
```

### Linux/Mac
```bash
chmod +x scripts/run_tests.sh
./scripts/run_tests.sh
```

### What They Do
- Activate virtual environment (or create if missing)
- Set PYTHONPATH correctly
- Run pytest with verbose output
- Show test results with colors

---

## 📁 Files in This Folder

| File | Platform | Purpose |
|------|----------|---------|
| `run_tests.bat` | Windows | Run all backend tests |
| `run_tests.sh` | Linux/Mac | Run all backend tests |
| `README.md` | All | This file |

---

## 🔧 Manual Testing (Without Scripts)

If you prefer to run tests manually:

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
export PYTHONPATH=$(pwd)  # Windows: set PYTHONPATH=%CD%
python -m pytest tests/ -v
```

---

**Note:** These scripts are helpers for local development. CI/CD uses the workflow defined in `.github/workflows/ci.yml`.
