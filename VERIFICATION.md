# Verified results

Verified 6 November 2026:

- Production `next build`: passed; 18 prerendered routes including error page.
- TypeScript compilation: passed as part of production build.
- `python -m pytest tests -q -p no:cacheprovider`: 13 passed in 24.99 seconds; one third-party pytz deprecation warning. Includes synthetic PNG, DICOM and NIfTI preprocessing tests.
- Local browser: backend connection, administrator login, experiment start, one-second polling, eight completed federated rounds and measured chart/table output verified.
- Browser workflow measured held-out loss falling from 0.2874 after round 1 to 0.0149 after round 8; accuracy was 1.0 on the easy synthetic feature task. These are synthetic research results, not medical accuracy.
- Public Vercel production deployment reached READY. Overview and federated configuration navigation verified in browser.
- GitHub push succeeded for the initial implementation at 89bb80e.

Public frontend: https://medifed-ai.vercel.app

Permanent Render hosting is not provisioned. The live Vercel frontend is now configured with a temporary Cloudflare HTTPS tunnel to the local Python API on port 8032. The user authorized the temporary public connection after its scope and lifecycle were explained. The API and tunnel must remain running and this computer must stay online. Render installation supplies deployment skills, but no authenticated Render API tools are exposed in this session, and the dashboard requires sign-in. Direct Vercel Git linking returned repo_no_access; source was deployed through the authenticated Vercel API instead. Automatic GitHub deployment remains unconfigured.

Latest verification: 15 backend tests pass, including authenticated metadata search. Public HTTPS smoke checks passed for health, Vercel CORS, login, hospital search, clinical text masking and extraction, actual PNG processing, trained synthetic fusion, completed two-round federated training, three modality evaluations, PDF/CSV/JSON report generation and persistent audit records. The checks can be repeated with `python scripts/verify-live.py --api YOUR_API_URL`; supply the research account password through MEDIFED_VERIFY_PASSWORD or the interactive prompt.

Global search now finds navigation pages, hospitals, generated synthetic research sample descriptions and owner-visible backend metadata. Sample terms such as cough, fever, MRI, lesion and opacity link to prefilled text-analysis workspaces. These are illustrative research samples, not clinical evidence or diagnostic search results.

The local verification frontend runs on http://localhost:3031 and API on http://localhost:8031 to avoid existing applications on ports 3000 and 8000. Demo administrator: admin@medifed.ai, with development password ResearchDemo!2026. Use a different password and stable JWT_SECRET for a shared host.

Not yet verified: PostgreSQL runtime, Docker image build, Render runtime, full automated browser/component suite, all DICOM transfer syntaxes, all NIfTI geometries. The original enterprise acceptance criteria are broader than this delivered baseline; documented limitations remain in README.md. Frontend source is formatted with Prettier.
