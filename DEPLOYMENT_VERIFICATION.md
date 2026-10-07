# Deployment preparation and verification

Date: 2026-10-07. Rollout: **Vercel + Render → owner projects → AWS migration → limited B2B beta → enterprise GA**.

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
