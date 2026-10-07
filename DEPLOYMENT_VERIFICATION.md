# Deployment preparation and verification

Date: 2026-10-07. Rollout: **Vercel + Render → owner projects → AWS migration → limited B2B beta → enterprise GA**.

## Docker and Neon follow-up

### Vercel deployment follow-up

The owner corrected the missing Vercel `BACKEND_URL` setting to `https://launchcomply.onrender.com` and supplied the deployed frontend `https://launch-comply-tau.vercel.app`. Read-only HTTP checks returned **200** for the homepage and `/login`. The frontend `/api/backend/source-control/providers` request and Render `/health/ready` request both timed out. Frontend delivery is confirmed; backend recovery and authenticated hosted operation remain unverified.

The unchanged Next.js configuration passed **13 configuration regression tests**, covering production and preview destinations, local development, missing hosted configuration and unsafe origins. A production-mode build using the supplied Render origin passed with **81 generated pages** and two existing hook warnings. Both generated API rewrites target the Render `/api/v1` endpoint. The prepared ignored Render environment file now includes the exact Vercel origin and passes local hosted configuration validation; its private values still need to be saved in Render.

### Render startup incident

The owner's Render log confirms that the Docker image built and was uploaded successfully. Runtime exits before migrations because `JWT_SECRET` and `ENCRYPTION_KEY` are unset/default and the CORS allowlist contains development origins. Production validation remains enforced. A clearer runtime setup instruction and a regression reproducing these three failures were added.

Prepared `apps/api/.env.render.local` passes local production configuration validation and is excluded from Git and the image. It contains stable independent secrets, the owner database URL, safe runtime flags and the known backend and Vercel HTTPS origins. It must be imported into the manually created Render service's Environment settings; Git pushes do not transfer its private values. No authenticated Render administration session was available to apply the values here.

Fresh checks: focused startup/hosting pytest **22 passed**; full local pytest **190 passed, 3 skipped in 70.41 seconds**. Remote checks are opt-in and were separately executed with `LIVE_API_URL=https://launchcomply.onrender.com`: **3 failed in 104.95 seconds**, all with read timeouts (root, liveness and readiness). Live recovery is not verified. Production database migrations have not been executed here. The remaining immediate action is to save the prepared values in Render and redeploy, then rerun the read-only smoke tests.

The API now has a non-root Dockerfile, an environment/database exclusion file and a validated startup entry point. Render is configured for Docker in Singapore with the existing Neon database, production configuration, one-instance startup migrations and deployment on commits to main. The Blueprint uses the Free service selected in the owner's setup screen. Manual setup needs the same runtime variables; see `PRODUCTION_DEPLOYMENT.md`.

Neon's provided connection string passed a read-only query using async psycopg with its TLS/channel-binding requirements retained. No schema/data was changed; the migration revision table was absent. The local `.env` is Git-ignored and excluded from the Docker image. Independent JWT/encryption secrets were generated there without printing their values. Exact frontend CORS origin remains an owner setting.

After these changes: **189 backend tests passed in 80.52 seconds**, including startup validation, migration failure handling, assigned-port behavior and connection-option preservation. Docker is unavailable on this machine, so image build/run is unverified locally. Render build/start logs and hosted readiness still need confirmation; public business/enterprise acceptance remains NO_GO.

The earlier results below describe the pre-Docker baseline. Current Neon/Docker setup supersedes the earlier Render-managed database and paid-service configuration.

## Decision and scope

**Public launch: NO_GO.** Hosting preparation is locally verified in the areas below. No hosting resources were created, live deployments performed, or owner repository/AWS account exercised. Provider setup, hosted PostgreSQL acceptance, and significant real integration work remain.

The repository already contained substantial modified and untracked phase 6–17 work. It was preserved. Review and include required existing application files when committing a deployment candidate. This pass does not certify the whole existing product.

## Changes

- Added `render.yaml`, API/frontend environment examples, hosting instructions and an owner dogfood runbook. Next.js forwards browser requests to the configured API origin; hosted builds reject missing/localhost backend configuration.
- Added PostgreSQL drivers, URL normalization, actual database health and hosted startup validation. Staging/production require safe secrets, exact HTTPS origins and a migrated schema; startup does not create or seed tables.
- Repaired repeated table/index operations, shared PostgreSQL enum handling, missing schema elements and model drift in the migration chain. SQLite acceptance passes; PostgreSQL execution remains unverified.
- Added sign-in and consistent browser auth/organization storage; removed localhost endpoints and the silent sample dashboard fallback in affected paths.
- Removed unmeasured GA/provider/email claims from affected responses and admin pages. Hosted GitHub fixture install/callback/webhook actions fail closed. Other simulation paths still require isolation and implementation.
- Made local tests use independent disposable databases. Browser fixtures refuse remote targets.

## Fresh verification

| Check | Result | Scope / limitation |
| --- | --- | --- |
| API: `.venv/Scripts/python.exe -m pytest -q --tb=short` | **181 passed**, 74.07 seconds | Isolated SQLite; local API/unit/integration coverage. |
| Migration acceptance in backend suite | **2 passed** | Clean head upgrade, no Alembic model drift, prior-head upgrade preserving a user. Not PostgreSQL acceptance. |
| Frontend: `npm run lint` | **PASS**, zero errors, two warnings | Hook dependencies in releases and first-10-customers pages. |
| Frontend: `npm run typecheck` | **PASS** | Final source state. |
| Frontend: `npm run build` | **PASS**, 81 generated pages | Final source state; local build configuration. |
| Full Playwright: `npx playwright test --workers=2 --reporter=json` | **29 passed, 57 failed** | Isolated seeded local API; preceded final provider display edits. |
| Final targeted Playwright: `npx playwright test tests/e2e/hosted-auth.spec.ts --project=chromium --workers=1 --reporter=list` | **2 passed** | UI login through proxy, retained identity/org and reset request boundary. |
| Frontend dependency audit | **11 entries: 8 high, 3 moderate** | Includes development dependencies; not a final deployed exploit assessment. No forced major framework upgrade applied. |
| Python environment audit | **23 advisory entries across 4 packages** | Includes local pip/setuptools tooling plus ecdsa/python-jose; not a built deployment artifact audit. |
| Hosted PostgreSQL, backup restore, real AWS/billing, public DNS/TLS | **UNVERIFIED** | No live provider evidence. |

The 57 browser failures comprise 42 mobile browser cases blocked by missing Windows WebKit libraries and 15 desktop failures finding expected content. Desktop failures cover public headings, partner/admin pages, billing/test-mode content and security/compliance pages. These remain unresolved acceptance failures; expectations were not rewritten merely to pass. Passing seeded fixture cases do not prove real business acceptance.

## Remaining status

| Area | Status |
| --- | --- |
| Repository | Modified and untracked existing work preserved; no commit/push performed. |
| Database migration | New head `f9d8161e682b`; SQLite clean/representative upgrade verified. PostgreSQL unverified. |
| Database | Existing API SQLite file incomplete despite prior head stamp; fresh hosted database recommended. |
| Auth / tenant isolation | Local regression passes; complete endpoint authorization review, MFA/admin hardening and hosted acceptance outstanding. |
| Signup | Proxy/token handling fixed; hosted verification journey outstanding. |
| Email / password reset | Real delivery absent. Public reset unavailable; focused token boundary fixed locally. |
| Production infrastructure / Redis / workers | Hosting configuration only; no provisioned production environment or durable queue consumer. |
| Backup / restore / rollback | Unverified; no measured recovery. Migration downgrade is not a supported recovery assumption. |
| Public domain / TLS / customer domain flow | Unconfigured/unverified externally. |
| Public website / SEO / robots / sitemap / canonical / Search Console | Build verified; complete browser/crawl/indexing acceptance outstanding. No search ranking claims. |
| GitHub / analysis / architecture | GitHub fixtures disabled in hosted mode; real repository ingestion and acceptance outstanding. |
| AWS onboarding / AWS test deployment / application deployment | Canned/configuration-based behavior remains; real account/resource/image evidence absent. |
| Monitoring / security baseline / VAPT | Unverified against actual workloads; local records do not prove executed scans. |
| Compliance readiness / auditor / enterprise identity | Workflow code exists; external acceptance and security review outstanding. No certification. |
| AI / support / partner / public API | Implementation and operational/authorization acceptance outstanding. |
| Stripe / Razorpay / revenue / customer acceptance | Disabled/unverified; no live payment, revenue or real customer claim. |
| Enterprise GA / limited B2B beta | **NO_GO** pending critical integration, auth/data/security and recovery gates. |

## Database recovery and hosting limits

A backup copy of `apps/api/launchcomply.db` failed upgrade with `NoSuchTableError`; required earlier tables are missing despite its revision stamp. The original database was not modified. Hosted schema checks reject incomplete stamped databases. Use a fresh database for private owner testing unless separately reviewed data recovery is needed.

The new reconciliation revision is forward-only; earlier revisions contain incomplete downgrades. Recovery requires a verified backup/restore and compatible application release. Test PostgreSQL clean and representative upgrades before accepting hosted operation.

The Render Blueprint has not been applied or validated by Render. Its services are paid; review the estimate in the setup screen. Local runtime files are not durable artifact storage. Keep stable JWT/encryption secrets for the future AWS migration.

## Next work

1. Review the deployment candidate, test the migration chain on PostgreSQL, then create private owner hosting services using `PRODUCTION_DEPLOYMENT.md` and record live smoke evidence.
2. Implement trusted email and a reviewed operator bootstrap; finish signup/recovery and authorization acceptance.
3. Replace GitHub, AWS and build fixtures with actual provider calls; add durable storage/jobs and recovery.
4. Resolve browser failures and applicable dependency/security findings; complete remaining security reviews.
5. Exercise two owner projects through the normal interface and verify actual deployment, monitoring, security results and isolated restore.
6. Rehearse AWS cutover and recovery before migration. Open a controlled business beta after critical checklist gates pass; enterprise launch requires further operational and contractual acceptance.

Detailed gates: `CURRENT_PRODUCTION_REALITY.md`, `PRODUCTION_GA_CHECKLIST.md`, `OWNER_ACTIONS_REQUIRED.md` and `OWNER_DOGFOOD_RUNBOOK.md`.
