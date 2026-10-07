# Vercel + Render first; AWS after owner acceptance

This is LaunchComply's hosting plan. Customer application deployment remains a separate AWS workflow and is not proven merely by hosting LaunchComply on Render.

## Stage 1: owner testing

Vercel serves `apps/web` (Next.js). Render runs `apps/api` (FastAPI) and a private PostgreSQL 16 database. Use provider-managed environment secrets. Keep separate databases and secrets for demo, owner testing, and eventual production. Do not use the existing SQLite file as a hosted database.

The root `render.yaml` defines paid services in Singapore, disables automatic deploys and external database connections, supplies the private database URL, generates independent JWT/encryption secrets, runs Alembic before deployment, and checks `/health/ready`. Review current charges before applying. No hosting resources have been created by this change. See the [Render Blueprint specification](https://render.com/docs/blueprint-spec) and [FastAPI deployment documentation](https://render.com/docs/deploy-fastapi).

### Render setup

1. Push the reviewed repository changes to your connected Git repository. Include the existing untracked application code and migration files that the current code imports; deploying only the files added in this pass will not work.
2. In Render, create a Blueprint from this repository and choose `render.yaml`. Confirm API/database region, service names, compute/storage plans and costs in the review screen.
3. Set `BACKEND_CORS_ORIGINS` to a JSON array of exact frontend origins, for example `["https://your-project.vercel.app"]`. Use your assigned project domain, not this example. Exclude wildcards, localhost, paths, and trailing slashes. Update it when adding a custom domain. Do not allow all Vercel preview domains.
4. Keep `ENVIRONMENT=staging`, `DEBUG=false`, `DEMO_MODE=false`, and `PILOT_MODE=true` during owner testing. The same startup configuration gates apply in staging and production. Billing, email and real execution flags remain disabled until their implementations and providers are verified.
5. Deploy, review migration/startup logs, and visit the assigned API origin followed by `/health/live` and `/health/ready`. Readiness must return HTTP 200 with a successful database probe; an unavailable database returns HTTP 503. This does not verify email, AWS, workers, backup or application acceptance.
6. Keep the generated secrets stable between deploys. Replacing the encryption key without a migration plan can prevent decryption of stored data. Store them in a password/secret manager for the eventual AWS transfer; do not print or commit them.

### Vercel setup

1. Import the same Git repository. Select Next.js and set the Root Directory to `apps/web`; build with `npm run build` and install with `npm ci`. See [Vercel monorepo setup](https://vercel.com/docs/monorepos).
2. Set server-side `BACKEND_URL` to the assigned HTTPS Render API origin, such as `https://your-api.onrender.com`, with no `/api/v1` suffix or credentials. The Vercel build rejects a missing, localhost, or non-HTTPS destination.
3. Leave `NEXT_PUBLIC_API_URL` unset. The browser uses `/api/backend`; Next.js forwards it to the Render API. Existing `/api/v1` callers also have a forwarding rule. Optional direct browser access requires the complete API URL and the exact CORS origin allowlist.
4. Redeploy after changing environment values: Next.js rewrites are configured at build time. Keep Preview deployments connected to a separate staging backend/database. See [Vercel environment variable documentation](https://vercel.com/docs/environment-variables).
5. Check home, pricing, security, docs, signup, email verification, onboarding and the API proxy in the deployed browser. Complete signup with an owner-only test identity and confirm that subsequent authenticated requests use its token and organization. Record HTTP errors as failures.

### Limits before meaningful dogfood

The repository includes simulations, sample metrics, and incomplete external integrations. The hosted site can be used to find these gaps, but successful hosting is not a successful customer deployment. See `CURRENT_PRODUCTION_REALITY.md` and `PRODUCTION_GA_CHECKLIST.md` before running the full owner journey.

Render's runtime filesystem must not be the durable store for customer source archives, Terraform state, evidence or artifacts. Audit each storage call and configure private persistent object storage before relying on those capabilities. Setting `OBJECT_STORAGE_PROVIDER=s3` alone does not implement an upload.

Redis is mentioned in the local Compose file but is not wired to a durable job consumer. This Blueprint intentionally does not provision a service with no functioning consumer. In-process tasks require restart/recovery work before unattended builds, scans or provisioning are accepted.

Enable a database backup policy supported by the chosen provider plan, record retention, and restore a backup into an isolated PostgreSQL database. Verify schema and representative records and measure recovery time. Until that rehearsal succeeds, backup/restore remains unverified. No RTO/RPO promise is established here.

## Stage 2: owner dogfood

Follow `OWNER_DOGFOOD_RUNBOOK.md`. First use a low-risk application with API + database, then a different frontend + API + worker + database architecture. Require actual repository content, STS identity, approved infrastructure plan, immutable image digest, HTTPS health, monitoring, security results and restore evidence. Record every manual intervention. Do not turn mock outputs into LIVE evidence.

## Stage 3: migrate LaunchComply to AWS

Preserve the standard application interfaces: Next.js frontend, FastAPI API, PostgreSQL database, stable JWT/encryption keys and portable object storage. Reuse existing suitable deployment/IaC code after verifying its real provider behavior.

Map API to ECS/Fargate behind an ALB, PostgreSQL to private RDS, durable artifacts/state to private S3, secrets to Secrets Manager, and operational telemetry to CloudWatch. Add a durable worker/queue only when implemented. The frontend can remain on Vercel during the API/database move; moving every component at once is not required by this plan. Additional AWS services should follow measured needs and documented requirements.

Before cutover: back up Render Postgres; restore into isolated RDS; apply the verified migration chain; compare row counts and critical records; migrate artifact/state references; validate auth, tenant isolation, jobs, billing webhooks and provider callbacks. Rehearse rollback before changing production origins or DNS.

At cutover: enter maintenance/read-only mode; stop writes and jobs; take the final backup; restore and validate; update the API destination and callbacks; redeploy frontend; run smoke/acceptance checks; reopen writes. Keep only one database writable. Retain the old environment for the agreed recovery window. If writes have occurred on AWS, reverting to an earlier Render backup can lose data: reconcile those writes before rollback. A database downgrade is not the recovery plan.

## Stage 4: B2B beta and enterprise gates

Start a small controlled beta only after the ordinary owner journey works, isolation/authentication are reviewed, dependency/security blockers are addressed, backups restore, support is operational, and operational claims are backed by external evidence. Enterprise GA additionally requires durable jobs, stronger administrator authentication, reviewed contracts/privacy terms, measured recovery and service commitments, and customer acceptance. Platform flags, local tests and compliance templates do not establish certification or enterprise readiness.
