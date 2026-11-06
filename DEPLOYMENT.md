# Deployment

## Python backend (required for functioning analyses and training)

### Render Blueprint setup

Install and authorize the Render app in Codex, or sign in to the Render dashboard. Create a Blueprint from this repository and select the root `render.yaml`. It declares a free Singapore web service and a free PostgreSQL database, connects the database URL automatically, generates JWT_SECRET, and configures both Vercel frontend origins for CORS. Supply a unique DEMO_PASSWORD in Render's secret prompt; it seeds admin@medifed.ai on the new database. Do not reuse the local demonstration password on a public deployment.

The backend accepts Render's native postgresql:// connection strings and selects the installed psycopg 3 driver. Docker installs CPU-only PyTorch wheels before application dependencies. Database ingress is private-only. Render resources are not created merely by committing this file: the Blueprint must be applied through an authenticated account.

Free hosting is suitable for a research preview: it can sleep and has resource limits, and free PostgreSQL expires after 30 days. See [Render free instance limits](https://render.com/docs/free). A long-lived deployment needs an appropriate database plan and backups. Do not silently upgrade to a paid plan when free capacity is unavailable.

After the backend is healthy, configure NEXT_PUBLIC_API_URL on the existing Vercel project with the actual Render service URL and rebuild the frontend. Verify login, hospital CRUD, text/image uploads, fusion, an actual federated experiment, evaluation, report export and audit records against the hosted API before claiming the live integration is complete.

1. Provision a persistent Docker-capable Python host, e.g. Render or Railway. The repository contains `render.yaml`. No backend account is provisioned by this project.
2. Build using backend/Dockerfile with backend as build context. Start command is `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`.
3. Set `APP_ENV=production`, a long random `JWT_SECRET`, `DATABASE_URL` to PostgreSQL, `DEMO_PASSWORD` to a unique administrator password, and `CORS_ORIGINS` to the exact HTTPS frontend origin. Multiple origins may be comma-separated.
4. Verify `GET /api/health` returns healthy. Open `/docs` for Swagger.
5. Use one process: in-memory jobs are not shared between workers. Free-tier hosts may sleep and interrupt training; use short experiments and do not claim durable jobs.

## Vercel frontend

1. Import the GitHub repository into the intended Vercel team; configure Root Directory `frontend`, framework Next.js, Node.js 24.
2. Set `NEXT_PUBLIC_API_URL` to the Python backend HTTPS origin, without `/api` suffix. Build with `npm run build`.
3. Alternatively deploy the frontend source directly using Vercel's deployment API. This does not establish automatic GitHub deploys.
4. Set backend `CORS_ORIGINS` to the deployed frontend origin and redeploy the backend if needed.
5. Sign in, register a synthetic hospital, run text/image analysis, start a two-round experiment and export a report to validate the integrated deployment.

Users may also configure a backend URL in browser Settings. This value remains only in that browser. Without a reachable API, the website explicitly shows preview/offline mode and will not fabricate results. Default localhost API works only when the visitor is running the backend; HTTPS browsers may block a localhost HTTP connection depending on browser policy. Use localhost frontend for local development, and an HTTPS API for hosted use.

Git integration access is separate from local Git credentials. If Vercel reports `repo_no_access`, grant the Vercel GitHub app access to this repository before enabling automatic deployments.

Production hardening: managed identity, revocable sessions, trusted-proxy rate limiting, durable queue, checkpoint storage, database backups, comprehensive migrations and monitoring. No real medical data should be uploaded.
