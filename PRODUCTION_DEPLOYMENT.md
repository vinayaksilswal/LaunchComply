# Vercel + Render first; AWS after owner acceptance

This is LaunchComply's hosting plan. Customer application deployment remains a separate AWS workflow and is not proven merely by hosting LaunchComply on Render.

## Stage 1: owner testing

Vercel serves `apps/web` (Next.js). Render runs `apps/api` (FastAPI) as a Docker container; Neon supplies the hosted PostgreSQL database. Use provider-managed environment secrets. Keep demo/test databases separate from the production database. Do not use the existing SQLite file as a hosted database.

The root `render.yaml` defines a Free Docker API service in Singapore, enables deploys on commits, accepts the Neon URL through `DATABASE_URL`, generates independent JWT/encryption secrets, and checks `/health/ready`. It does not provision a second database. No hosting resources have been created by this change. See the [Render Blueprint specification](https://render.com/docs/blueprint-spec) and [Docker deployment documentation](https://render.com/docs/docker).

### Manual Docker setup (the New Web Service screen)

| Field | Value |
| --- | --- |
| Language | Docker |
| Branch | main |
| Region | Singapore |
| Root Directory | apps/api |
| Dockerfile Path | Dockerfile |
| Docker Build Context Directory | . |
| Docker Command | Leave blank; use the Dockerfile CMD |
| Health Check Path | /health/ready |
| Auto-Deploy | On Commit |

These Docker paths are relative to the configured Root Directory. Do not enter `apps/api/Dockerfile` again when Root Directory is already `apps/api`. Render builds the image; there is no Python build/start command to fill in. [Root-relative Render settings](https://render.com/docs/monorepo-support).

Set the following runtime environment variables (manual setup does not automatically import Blueprint values):

| Variable | Value |
| --- | --- |
| DATABASE_URL | The Neon PostgreSQL URL, including sslmode/channel_binding; store as a secret |
| ENVIRONMENT | production |
| DEBUG | false |
| DEMO_MODE | false |
| PILOT_MODE | true |
| MIGRATE_ON_STARTUP | true |
| JWT_SECRET | An independent random value of at least 32 characters |
| ENCRYPTION_KEY | A different random value of at least 32 characters |
| BACKEND_CORS_ORIGINS | JSON array of the exact frontend HTTPS origin |

The container validates configuration before attempting migrations and stops if migration fails. Startup migration is enabled here for one API instance, including the Free plan. Before running multiple instances, run migrations once through a separate deployment job and set `MIGRATE_ON_STARTUP=false` on the API instances. The hosted lifespan still checks the migration/schema before serving traffic. Never point demo seeds or destructive test suites at Neon.

### Fixing missing runtime values after manual service creation

If Render logs report default `JWT_SECRET`, default `ENCRYPTION_KEY`, or invalid `BACKEND_CORS_ORIGINS`, the Docker build has succeeded but runtime setup is incomplete. Git-ignored local environment files and Blueprint-generated secrets do not populate a manually created Render service.

For this owner's deployment, a local ignored file `apps/api/.env.render.local` contains the prepared database URL, independent stable secrets and safe runtime flags. In the Render service, open **Environment → Add from .env**, paste its contents, and choose **Save, rebuild, and deploy**. Merge/replace any existing entries with the same names. The file must never be committed or copied into the image.

The initial allowlist is the known API origin, `https://launchcomply.onrender.com`, for backend/docs access. Add the actual Vercel frontend origin to the JSON array when configured; keep preview environments separate. Successful local validation does not mean Render has received these values.

After deployment, run the optional read-only pytest smoke checks from `apps/api`: set `LIVE_API_URL=https://launchcomply.onrender.com`, then run `.venv/Scripts/python.exe -m pytest tests/test_live_health.py -q`. They check the root response, liveness and database readiness without creating live users or changing database records. Default test runs skip these remote checks and use isolated SQLite.

Standard PostgreSQL URLs now use SQLAlchemy's async psycopg driver, preserving Neon's libpq TLS and channel-binding options. Explicit `postgresql+asyncpg` URLs remain supported for compatible configurations. The owner-provided Neon URL passed a read-only connection probe; no migration revision table existed at that check. Migrations have not been executed against it in this session.

### Render setup

1. Push the reviewed repository changes to your connected Git repository. Include the existing untracked application code and migration files that the current code imports; deploying only the files added in this pass will not work.
2. In Render, create a Blueprint from this repository and choose `render.yaml`, or use the manual Docker settings above. Confirm the API service settings and provide the existing Neon URL as `DATABASE_URL`.
3. Set `BACKEND_CORS_ORIGINS` to a JSON array of exact frontend origins, for example `["https://your-project.vercel.app"]`. Use your assigned project domain, not this example. Exclude wildcards, localhost, paths, and trailing slashes. Update it when adding a custom domain. Do not allow all Vercel preview domains.
4. Use `ENVIRONMENT=production`, `DEBUG=false`, `DEMO_MODE=false`, and `PILOT_MODE=true` for this deployment. Configuration mode does not establish enterprise readiness. Billing, email and real execution flags remain disabled until their implementations and providers are verified.
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

Before cutover: back up Neon PostgreSQL; restore into isolated RDS; apply the verified migration chain; compare row counts and critical records; migrate artifact/state references; validate auth, tenant isolation, jobs, billing webhooks and provider callbacks. Rehearse rollback before changing production origins or DNS.

At cutover: enter maintenance/read-only mode; stop writes and jobs; take the final backup; restore and validate; update the API destination and callbacks; redeploy frontend; run smoke/acceptance checks; reopen writes. Keep only one database writable. Retain the old environment for the agreed recovery window. If writes have occurred on AWS, reverting to an earlier Neon backup can lose data: reconcile those writes before rollback. A database downgrade is not the recovery plan.

## Stage 4: B2B beta and enterprise gates

Start a small controlled beta only after the ordinary owner journey works, isolation/authentication are reviewed, dependency/security blockers are addressed, backups restore, support is operational, and operational claims are backed by external evidence. Enterprise GA additionally requires durable jobs, stronger administrator authentication, reviewed contracts/privacy terms, measured recovery and service commitments, and customer acceptance. Platform flags, local tests and compliance templates do not establish certification or enterprise readiness.
