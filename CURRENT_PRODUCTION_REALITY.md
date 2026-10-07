# Current production reality

Updated: 2026-10-07. Target: Vercel frontend + Render API/PostgreSQL for private owner testing, followed by AWS and a controlled B2B beta.

Launch decision: **NO_GO for public customers**. Render's Docker image build is verified by the owner's log, but the API fails startup because private environment values are missing. A Neon read-only connection passed; schema migrations and application acceptance remain unverified there. No real owner application deployment or backup restore has been verified. This is a deployment audit with a focused authentication fix, not a completed repository security assessment.

| Capability | Classification | Evidence / next check |
| --- | --- | --- |
| Hosting, public domain, TLS | BROKEN at runtime | Docker image build succeeded on Render. Startup rejects missing secrets and unsafe/default CORS. Live HTTP checks time out; prepared runtime values require import. |
| PostgreSQL | IMPLEMENTED_NOT_EXTERNALLY_VERIFIED | Neon read-only connection passed with TLS/channel binding required. No migration version table existed at that check; schema/runtime acceptance remains unverified. |
| Clean schema migrations | REAL_AND_VERIFIED locally on SQLite | Clean upgrade and schema parity pass; representative upgrade preserves a user. PostgreSQL remains unverified. |
| Existing local API database | BROKEN | A copied database stamped at `7462d21be55a` lacks required tables and fails upgrade. Original preserved; a matching version stamp is insufficient. Do not deploy this database. |
| Hosted startup and health | REAL_AND_VERIFIED locally | Hosted config and schema gates, actual DB health probe and sanitized 503 behavior covered by tests. Hosted startup does not create or seed tables. |
| Authentication, signup, RBAC, multi-tenancy | IMPLEMENTED_NOT_EXTERNALLY_VERIFIED | Canonical browser auth storage and same-origin proxy fixed; local login journey passes. Complete hosted signup and tenant/security acceptance still required. |
| Password reset | NOT_CONFIGURED for public recovery | Caller-visible usable reset token exposure fixed. Requests return uniform 503 without issuing tokens until trusted email delivery exists; internal single-use token lifecycle passes. |
| Email verification and transactional email | SIMULATED / NOT_CONFIGURED | No actual delivery dispatcher located. Hosted email health now reports unknown delivery/DNS rather than fabricated success. |
| GitHub repository connection | SIMULATED | Fixture adapter creates sample repositories. Install/callback/webhook paths disabled in hosted environments; real token exchange, authorization and checkout require implementation. |
| Repository analysis and architecture | IMPLEMENTED_NOT_EXTERNALLY_VERIFIED | Existing orchestration includes local/fixture scan paths; no owner repository content or architecture acceptance evidence. |
| AWS identity, permissions, discovery and stack observation | SIMULATED | Configured identity flags and canned permission/resource/stack responses are not STS or AWS API evidence. These paths still require implementation and environment isolation; keep unused in hosted owner testing. |
| Build, image scanning, SBOM and registry push | SIMULATED | Local build adapter generates digests/sample results; CodeBuild adapter falls back to it. No real container build, scanner execution or ECR push verified. |
| Plan/apply, release, rollback, customer domain/TLS | IMPLEMENTED_NOT_EXTERNALLY_VERIFIED | Real resource/artifact and recovery evidence absent; simulated paths remain. Hosting LaunchComply does not validate customer deployment. |
| Monitoring, alerts, backup and restore | IMPLEMENTED_NOT_EXTERNALLY_VERIFIED | No external probe or isolated restore rehearsal. No measured RTO/RPO. |
| Security baseline, VAPT, compliance and assurance | IMPLEMENTED_NOT_EXTERNALLY_VERIFIED | Local records/templates do not establish external scan results or certification. Dependency findings remain open. |
| Durable workers and scheduler | NOT_CONFIGURED | No durable queue consumer located; in-process jobs need restart/retry acceptance. |
| Billing, Stripe, Razorpay and AI | IMPLEMENTED_NOT_EXTERNALLY_VERIFIED | Flags/credentials do not prove connectivity, payments or reconciled revenue; leave disabled. |
| Support, platform admin, public API, partner and auditor | IMPLEMENTED_NOT_EXTERNALLY_VERIFIED | Endpoints exist; complete authorization and operational acceptance remain. Hosted operator bootstrap requires a reviewed process. |
| Public website, SEO, analytics and status | IMPLEMENTED_NOT_EXTERNALLY_VERIFIED | Production build passes; full browser run has failures. Hosted crawling, real telemetry and public status unverified. |
| Demo seed and sample metrics elsewhere | SIMULATED | Demo/test seed is separated from hosted startup. Remaining UI/service sample data requires review before business use. |

Fresh backend results: 190 passed, 3 remote checks skipped locally; explicitly running the three remote checks produced three read timeouts. Earlier frontend results: lint has zero errors and two warnings; type check and production build passed. Full browser run: 29 passed, 57 failed (42 mobile cases blocked by missing Windows browser libraries; 15 desktop failures). Targeted desktop login/proxy/reset checks: 2 passed. See `DEPLOYMENT_VERIFICATION.md` for scope and unresolved gates.
