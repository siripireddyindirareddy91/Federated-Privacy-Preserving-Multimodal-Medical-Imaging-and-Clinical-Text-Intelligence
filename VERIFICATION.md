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

Cloud API is not provisioned. The site shows honest API-offline preview mode until a persistent Python host is connected. Render is the selected backend target; its plugin is available but not connected in this session. Direct Vercel Git linking returned repo_no_access; source was deployed through the authenticated Vercel API instead. Automatic GitHub deployment remains unconfigured.

The local verification frontend runs on http://localhost:3031 and API on http://localhost:8031 to avoid existing applications on ports 3000 and 8000. Demo administrator: admin@medifed.ai, with development password ResearchDemo!2026. Use a different password and stable JWT_SECRET for a shared host.

Not yet verified: PostgreSQL runtime, Docker image build, Render runtime, full automated browser/component suite, all DICOM transfer syntaxes, all NIfTI geometries. The original enterprise acceptance criteria are broader than this delivered baseline; documented limitations remain in README.md. Frontend source is formatted with Prettier.
