# Installation

Requirements: Python 3.12, Node.js 22 or 24, npm. PyTorch installation can require several gigabytes. No paid API keys are needed.

PowerShell commands are in README.md. Environment examples are documentation; the backend reads process environment and does not automatically load `.env` files.

Linux/macOS:

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export DEMO_PASSWORD='ResearchDemo!2026'
export JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
python -m uvicorn app.main:app --reload
```

In another terminal: `cd frontend`, `npm ci`, `npm run dev`.

SQLite tables are initialized automatically on backend startup. For PostgreSQL set `DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE`. Use a direct database connection, with `?sslmode=require` for hosted PostgreSQL. Tables initialize using SQLAlchemy. Preserve a backup before any schema change.

Docker Compose: set POSTGRES_PASSWORD, JWT_SECRET and DEMO_PASSWORD in the shell environment, then run `docker compose up --build`. Frontend still runs with npm. Docker database volume persists records. For a deliberate fresh local reset, stop the API and archive the SQLite database before restarting; avoid deleting shared research data.

All uploads are limited to 10 MB. DICOM and NIfTI require the optional format libraries included in requirements.txt. NIfTI `.nii.gz` is not supported by this baseline. PDF image OCR is not implemented. Do not use genuine patient data.
