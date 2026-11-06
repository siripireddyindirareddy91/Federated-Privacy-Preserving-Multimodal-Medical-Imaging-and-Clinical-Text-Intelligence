# API

Interactive OpenAPI: backend `/docs`. Use JSON requests and `Authorization: Bearer TOKEN` after login. All paths below have `/api` prefix.

| Area | Endpoints |
|---|---|
| Health | GET /health |
| Accounts | POST /auth/register, POST /auth/login, GET /auth/me, POST /auth/logout |
| Dashboard | GET /dashboard/overview, GET /dashboard/analytics |
| Hospitals | GET/POST /hospitals, GET/PUT/DELETE /hospitals/{id} |
| Image processing | POST /images/upload (multipart file), GET /images/history |
| Text | POST /clinical-text/upload (multipart file), POST /clinical-text/analyze (`text`), GET /clinical-text/history |
| Fusion | POST /multimodal/analyze (`sample_id`, 1–100), GET /multimodal/history |
| Experiments | GET/POST /federated/experiments |
| Control | POST /federated/experiments/{id}/{start,pause,resume,stop} |
| Monitoring | GET /federated/experiments/{id}/{status,metrics,rounds} |
| Evaluation | POST /evaluation/run, GET /evaluation/results |
| Privacy | GET /privacy/status, PUT /privacy/configuration |
| Dataset catalog | GET/POST /datasets, DELETE /datasets/{id} |
| Reports | GET /reports, POST /reports/generate (`format`: json/csv/pdf) |
| Audit | GET /audit-logs |

Training request example:

```json
{"name":"Research run","rounds":8,"epochs":2,"batch_size":16,"learning_rate":0.1,"strategy":"FedAvg","modality":"multimodal","noise":0,"clip_norm":1}
```

Create the experiment, POST its start endpoint, then poll status each second. Rounds and metrics are computed and persisted. At least two active hospitals are required. One experiment runs at a time per backend process. Privacy defaults are metadata; training uses its explicitly supplied noise/clip_norm settings.

Administrator role required for hospital mutations and privacy configuration. New registrations are researcher accounts. Errors use FastAPI `detail`; 401 unauthenticated, 403 unauthorized, 404 missing/other-owner resources, 409 state conflict, 413 upload limit, 415 file extension, 422 validation, 429 rate limit. List endpoints return up to 500 recent owner-visible records, with frontend pagination and search. Server-side pagination is not implemented in this baseline.
