# Privacy and security

This is a synthetic-data research platform, not a clinical service. It makes no formal privacy, HIPAA, regulatory compliance, diagnostic accuracy or medical safety claim.

The federated aggregation function receives model state dictionaries and sample counts. Raw image pixels and clinical text are not inputs to aggregation. Clients share a single process; this illustrates federated mathematics rather than hospital network isolation. Parameter updates can leak data. Synthetic image and text uploads for preprocessing are sent to the API and are separate from the federated workflow. Do not upload genuine sensitive information.

Gradient mechanism: global batch gradient norm clipping followed by optional Gaussian noise scaled by clip norm / configured batch size. This is not per-example DP-SGD; there is no validated accountant, delta, sampling-composition analysis or epsilon guarantee. Privacy status states this explicitly. Noise and clipping are configurable per experiment; the privacy defaults record is informational.

Clinical masking removes basic email, phone, and line-labeled name/MRN/DOB/address patterns. It is incomplete, language-dependent and must not be relied on as medical de-identification. Do not use it to sanitize patient records for public sharing.

Uploads: extension and actual decoder validation, 10 MB input limit, document expansion/page limits, image limits, no uploaded file written to a public directory. Previews exclude DICOM patient tags. Clinical content is returned to the requesting browser in memory; central records retain content-free text metadata. Image embeddings persist and may reveal input information. Content-free audit events do not log request bodies. Production proxy access logs should exclude bearer tokens and bodies.

Authentication uses salted scrypt and JWT expiration. The environment-provided signing secret must be stable and private. Administrator provisioning requires DEMO_PASSWORD. Signup cannot assign privileged roles. Research records are owner-scoped unless administrator. Tokens in sessionStorage are exposed to same-origin scripts; use managed identity and httpOnly cookies for stronger production session protection. Logout clears browser session but does not revoke a stolen token before expiry. There is no password recovery flow. IP rate limits are single-process and not a substitute for a trusted edge gateway.

Production requires HTTPS, restrictive CORS, database access controls/backups, a secrets manager, security review, durable access controls and proper deletion/retention policies. Research infrastructure defaults must never be assumed safe for clinical workloads.
