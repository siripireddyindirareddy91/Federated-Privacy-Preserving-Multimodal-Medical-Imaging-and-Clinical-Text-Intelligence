# MediFed AI

Privacy-aware federated multimodal **research application**, using synthetic data. Next.js research workspace plus FastAPI, SQLAlchemy and a real PyTorch in-process federated learning engine.

## What works

- Thirteen research modules with responsive navigation, search, dark mode, empty states, error messages and downloadable results.
- Password hashing (scrypt), eight-hour JWT sessions, administrator/researcher authorization and owner-scoped research records.
- Five seeded synthetic hospitals; administrator hospital CRUD and client activation.
- PNG/JPEG, DICOM and uncompressed NIfTI uploads; validation, intensity normalization, private in-memory previews and deterministic image embeddings.
- TXT/PDF/DOCX extraction, regex identifier masking and transparent keyword feature extraction.
- A trained two-branch PyTorch fusion baseline on linked synthetic sample IDs; modality probability comparison.
- Real local SGD on independent non-IID synthetic client partitions; sample-weighted FedAvg or FedProx; image/text/multimodal experiments; clipping and optional Gaussian gradient noise.
- Background training, polling, pause/resume/stop, stored rounds, per-client loss and transfer size, held-out metrics and confusion matrices.
- Dataset metadata catalog, structured audit events and PDF/CSV/JSON reports generated from stored results.
- SQLite local mode; PostgreSQL-compatible SQLAlchemy configuration; Docker Compose and Render blueprint.

## Quick start (PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DEMO_PASSWORD='ResearchDemo!2026'
$env:JWT_SECRET=python -c "import secrets; print(secrets.token_urlsafe(48))"
python -m uvicorn app.main:app --reload
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000, then Settings to verify the backend connection, and Sign in. Demo email: `admin@medifed.ai`; password is the value of `DEMO_PASSWORD` (the example above uses `ResearchDemo!2026`). No administrator is created unless that environment variable is set. Registration creates researchers only. Change the example password for shared deployments.

## Structure

```text
frontend/app/             Next.js pages and design system
frontend/components/     Connected research workspace
backend/app/main.py      API, auth, persistence and training worker
backend/app/ml.py        Feature encoders, fusion, FedAvg/FedProx, evaluation
backend/tests/           API and mathematical integration tests
backend/migrations/      Schema initialization and migration guidance
docker-compose.yml       PostgreSQL and Python backend
render.yaml              Backend deployment blueprint
```

## Verification

```powershell
cd backend
python -m pytest tests -q
cd ../frontend
npm run typecheck
npm run build
```

See [INSTALLATION.md](INSTALLATION.md), [DEPLOYMENT.md](DEPLOYMENT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [API_DOCUMENTATION.md](API_DOCUMENTATION.md) and [PRIVACY_AND_SECURITY.md](PRIVACY_AND_SECURITY.md).

## Research limits

This implements a functional, lightweight research baseline, not every enterprise feature in the original brief. It uses an honest in-process PyTorch fallback rather than Flower networking. The imaging encoder is deterministic intensity pooling, not pretrained ResNet18; clinical features use keywords, not a clinical transformer. Fusion and federated classification are trained on synthetic feature distributions, not validated medical datasets. Uploaded image/text representations are exploratory preprocessing outputs; uploaded files do not train a medical model. The dataset catalog does not feed training. The modality comparison evaluates three federated baselines; six-model centralized/federated benchmarking is not implemented. There is no formal DP accountant, secure aggregation, regulatory certification, production distributed job queue, password reset, token revocation or full schema migration framework. Model parameters live for the current experiment process; round results persist, but weights and paused jobs do not survive restart. Use one backend worker. Production deployment needs a separately provisioned persistent Python host and PostgreSQL. Vercel hosts the frontend only.

Future work: medically licensed datasets and validation, pretrained encoders, Flower isolated hospital clients, per-example DP-SGD and validated accounting, secure aggregation, durable worker queue and checkpoints, normalized domain tables with versioned migrations, comprehensive browser/component coverage and production identity provider.
