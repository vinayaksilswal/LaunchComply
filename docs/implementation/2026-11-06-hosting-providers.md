# Hosting provider management and monitoring — 6 November 2026

## Customer request

Tech Invenso's apps run on Vercel (corporate site, HRMS, ERP and Legal frontends),
Render (unified FastAPI backend), Neon (PostgreSQL) and Cloudinary (media), per
`HRMS/DEPLOYMENT.md`. The customer asked to manage and monitor that real
infrastructure from LaunchComply, with full management, and to keep the AWS
proposal and the current hosting as two options in one architecture tab.

## What was built

- `hosting_provider_connections` table (additive migration `c14d2e3f4a5b`).
  Each business can have several provider accounts. Credentials are stored only as
  Fernet ciphertext derived from `ENCRYPTION_KEY`. Responses show only a 4-character hint.
- `app/services/hosting/providers.py`: normalized inventory for Vercel projects
  (deployments, domains, env names), Render services (deploys, custom domains, env
  names, plan and instances), Neon projects (branches, computes, storage) and
  Cloudinary (plan usage meters, upload presets, folders).
- Cross-provider links: an env var value is reduced in memory to a hostname and
  matched against other resources' hosts, then discarded. Only the key name and
  the match are stored. A name-only link is used solely when exactly one candidate
  exists, and it is labelled as inferred.
- Monitoring: point-in-time HTTPS probes of provider-reported URLs (and Render's
  health-check path). Probes refuse non-HTTPS addresses and hosts that resolve to
  non-global addresses. Alerts cover failed or suspended deploys, failing or slow
  probes, Cloudinary usage at 80% or more, and disabled Neon computes. A
  48-point history is kept per connection. The UI can auto-refresh every minute
  while the view is open; there is no background scheduler.
- Management: a fixed action catalog.
  - Vercel: redeploy, rollback, set or delete env vars, add or remove domains.
  - Render: deploy, clear-cache deploy, restart, rollback, suspend, resume, scale,
    set or delete env vars.
  - Neon: start, restart or suspend compute; autoscaling; create or delete branches.
  - Cloudinary: create folders; save or delete upload presets.

  Guards on every action:
  - Owners and admins only.
  - Explicit confirmation; HIGH-risk actions need the resource name typed.
  - Targets are validated against the last refresh, and parameters are validated
    server-side.
  - Env values are write-only.
  - Each action is audit-logged as `HOSTING_ACTION` or `HOSTING_ACTION_FAILED`,
    without values.
  - The default Neon branch cannot be deleted.

  Not offered: deleting provider projects or services, deleting Cloudinary assets,
  and Neon restores.
- UI: `/dashboard/architecture` has an "AWS proposal | Current hosting" switch.
  Both views stay mounted, so unsaved AWS diagram edits and saved designs are
  untouched. Current hosting shows lanes for frontends, services, and data and
  media, with link arrows (solid for value matches, dashed for name-only
  inferences), alerts, a details panel, the action form, and a providers dialog
  to connect, rotate or disconnect accounts.

## Verification

- `tests/test_hosting.py` (6 tests, mocked provider HTTP) covers:
  - no credential, env value or database password in responses, stored rows or audit;
  - bad credentials rejected with no row saved;
  - duplicate and unknown fields rejected;
  - normalization and cross-provider links;
  - probes and alerts;
  - refresh throttling;
  - confirmation and typed-name gates;
  - rejected actions never reaching the provider;
  - tenant isolation and spoofed organization headers;
  - probe SSRF refusals.
- The migration chain, container start, GitHub authorization and auth/isolation
  tests passed; the full API suite was run as well.
- `tsc --noEmit` and eslint on the new files pass.
- Local browser journey against an isolated SQLite database and a fixture provider
  transport: connected all four providers through the dialog, refreshed, saw the
  linked topology and alerts, opened details, saw the high-risk rollback gate, ran
  Scale and saw the provider response, and switched views without disturbing the
  AWS canvas.

## Not yet accepted

- No real Vercel, Render, Neon or Cloudinary API has been called. Live acceptance
  needs the customer to deploy this release, run migration `c14d2e3f4a5b` on the
  production database, and enter real tokens in the providers dialog.
- Provider API response shapes were implemented from public API documentation and
  fixtures. The first live refresh may reveal field differences.
- Probes are on-demand or while-open checks, not continuous uptime monitoring.
  Scheduled checks and notifications are follow-up work.

## Follow-up the same day (commits 4dc7925, 4c74970)

- Provider failures return HTTP 424 with the provider's reason. The web client
  hid 5xx details, which made a Neon refusal look like an outage.
- Neon keys inside an organization: the single visible organization is discovered
  and stored with the encrypted credential.
- Resources carry their GitHub repository, root folder and branch, and are grouped
  into projects by repository. Databases and media join the projects whose services
  link to them. LaunchComply applications are matched by repository, and by root
  path for monorepos.
- Status follows the deployment that is actually serving. A newer build or failed
  deploy shows as detail or DEGRADED rather than hiding a live site.
- Live updates (every minute while the view is open) are on by default. A refresh
  runs right after a provider is connected.
- Live acceptance so far: the customer connected Vercel (6 projects, health probes
  responding), Render and Neon in production. Render and Neon inventories await the
  first refresh after deploy.

## Background monitoring and notifications (later on 6 November)

- `app/services/hosting/sync.py` performs refreshes for both the API and the
  background monitor:
  - a per-business in-process lock;
  - no database transaction held during provider calls;
  - an alert baseline on the first check;
  - `HOSTING_ALERT_OPENED` and `HOSTING_ALERT_RESOLVED` audit events written only
    for critical alerts and status/usage warnings. Slow responses and missing URLs
    do not notify.
- `app/services/hosting/scheduler.py` runs in the API process every
  `HOSTING_MONITOR_INTERVAL_SECONDS` (default 300, minimum 60, 0 disables). On
  PostgreSQL a transaction-scoped advisory lock (`pg_try_advisory_xact_lock`) lets
  one instance run each cycle, which stays valid behind Neon's transaction pooler.
  A free Render instance that is asleep does not run the monitor.
- The Notifications page now merges hosting alerts ("Problem detected" /
  "Recovered") with service-request updates. Messages are in plain language.
- History holds about 24 hours (300 points), and the overview returns
  `uptime_24h` (percent, checks, timeline) per resource. Polling payloads send
  only the last 48 history points.
- UI: uptime bars on hosting cards and in the details panel; diagram cards
  outlined in their live health colour.
- Tests: transitions, uptime window, outage→recovery notifications, and a
  background cycle covering every business. 15 hosting tests pass.

## Guided launch for new learners (6 November)

- `app/services/launch/plan.py` builds a plan from the saved repository analysis:
  - manifest folders and dependencies (Next.js, Vite/React, Express/Fastify/Nest,
    FastAPI/Flask/Django);
  - Postgres drivers or `DATABASE_URL`-style names, which add a database part;
  - Cloudinary usage, which adds a media part;
  - the env var names each folder reads;
  - suggested Render build/start commands, with the Python entry module from the
    analyzed `main.py`/`app.py`.

  Parts already running are matched by repository and folder (databases through
  the backend's live link, or by name).
- `app/services/launch/provision.py`, called only after owner/admin confirmation:
  - creates a Vercel project linked to GitHub and starts its first production deploy;
  - creates a Render web service on the free plan, region chosen by the user;
  - creates a Neon project, discarding the connection string Neon returns.

  The "connect" step fetches the Neon pooled connection URI server-side, sets it,
  and Cloudinary settings in the names the code reads, on the Render service, then
  redeploys. It sets the website's API-address variable to an https address that
  must belong to the Render service, then redeploys. Values are never returned,
  logged or stored. Audit: `LAUNCH_PART_CREATED`, `LAUNCH_PART_FAILED`,
  `LAUNCH_PARTS_CONNECTED`, with names only.
- `/dashboard/launch` ("Launch your app" in the sidebar) is a four-step wizard in
  plain language, with free-account links, "let the provider read GitHub" links,
  editable commands, a confirmation per action, and polling while builds run.
- Bug found and fixed while testing: provisioning bound the HTTP client at import,
  so test transports did not apply and a test reached Neon's real API with a fake
  key. It now looks the client up at call time.
- Verification: `tests/test_launch.py` (plan detection; full create→connect flow
  on a stateful fixture with secret-leak checks, confirmation gate, no duplicate
  creation, API-address host check, audit; tenant isolation). Local browser
  journey through all four steps against the fixture world; every launch request
  returned 200.
- Not yet proven: a real launch on a learner's own Vercel/Render/Neon accounts.
  Vercel and Render must already be allowed to read the GitHub repository.

## Guided launch hardening (handover H03/H04, first slice)

- `launch_steps` table (additive migration `d25e3f4a5b6c`, after `c14d2e3f4a5b`):
  one row per application part, committed as `CREATING` before any provider call.
  Outcomes are `CREATED`, `FAILED` (provider definitely refused) or `AMBIGUOUS`
  (timeout, dropped connection, provider 5xx or an exceeded 90 s budget). A
  `CREATING` row older than 5 minutes counts as `AMBIGUOUS`.
- No duplicate creation:
  - an `AMBIGUOUS` or `CREATING` step is reconciled by looking the exact
    requested name up at the provider before any new attempt;
  - `POST /launch/{app}/parts/{part}/check` resolves an unconfirmed step
    explicitly;
  - a fresh `CREATING` step refuses concurrent attempts, and the unique constraint
    refuses racing inserts;
  - before a fresh create, a resource with the same name that LaunchComply did
    not record is refused. It is never adopted or modified.
- Exact confirmation: each part carries a fingerprint (detected
  source/target/framework/runtime/account). A create with a different fingerprint
  is refused ("plan changed since you reviewed it").
- Readiness blockers, enforced server-side and shown in the UI:
  - code changed since the analysis;
  - backend start command missing or not using `$PORT`.

  Warnings: backend not reading `DATABASE_URL`, website without an API-address
  variable, unrecognized framework.
- Account choice: with several connections for a provider, the owner must pick
  one. Connecting parts uses the account that owns each live resource.
- Redaction: secret values sent during "connect" are removed from any provider
  error text before it reaches the browser or the audit log.
- Vercel: if the project is created but its first deploy fails, the step is
  `CREATED` with a warning, not a failure.
- Wording: uptime reads "% of N checks answered · last 24 h". Launch copy no
  longer claims everything is free.
- Tests: `tests/test_launch.py` has 8 cases:
  - timeout after the provider created the database: retry reconciles, exactly
    one `POST /projects`;
  - check endpoint;
  - blockers, stale fingerprint and name clash never reach the provider;
  - echoed-secret redaction;
  - in-progress refusal.

  Local browser check: the blocker appears and disables the button, and a create
  succeeds through the UI.
- Still open from H03/H04 and H05:
  - creation runs inside the request rather than a durable C02 worker;
  - the PostgreSQL race is not yet proven on real PostgreSQL;
  - GitHub ref/root and analysis freshness come from the existing A04 evidence;
  - no real launch on disposable provider accounts yet.

## Health-check redirect hardening and rollout check (7 November)

- Production rollout of `0cccec3` verified from outside. `/health` reports
  HEALTHY with the database connected; `/api/v1/launch/...` answers 401
  (authentication required), so the route is deployed. The hosted schema check
  that gates startup passed, so the `launch_steps` table exists in production.
- Health probes no longer follow redirects automatically. Each hop (at most 3)
  is re-validated as public HTTPS with every resolved address global before it
  is requested. Only status and headers are read; bodies are never downloaded.
  A redirect to a metadata/private/plain-HTTP target stops the check and is
  reported as a failed check.
- Test `test_probe_revalidates_every_redirect_hop`: redirects to
  `http://169.254.169.254` and to a non-public HTTPS host are never requested; a
  relative hop is followed; a loop stops after 4 requests.
- Residual risk, recorded: DNS is resolved for validation and again by the HTTP
  client (a rebinding window). Pinning the connection to the validated address
  is the remaining fix.

## Provider API contract check against official docs (7 November)

Each request the launch flow makes was compared with the current official docs
(Render API reference, Neon API v2 at neon.com/docs, Vercel REST API).

- Confirmed:
  - Render: `POST /v1/services` fields `type`, `name`, `ownerId`, `repo`, `branch`,
    `rootDir`, `serviceDetails.runtime` (`env` is deprecated),
    `envSpecificDetails.buildCommand/startCommand`, region `singapore`, response
    `{service, deployId}`; `GET /v1/services?name=&ownerId=` (the code still
    filters for an exact name match); `PUT /services/{id}/env-vars/{key}` with
    `{value}`; `POST /services/{id}/deploys` with `clearCache`.
  - Neon: `GET /projects` with `search`/`limit`/`org_id`; `POST /projects`
    `{project: {name, region_id, org_id}}`; `GET .../connection_uri` (requires
    `database_name` and `role_name`) returning `{uri}`; branch databases with
    `name` and `owner_name`.
  - Vercel: `POST /v11/projects` with `framework`, `rootDirectory`,
    `gitRepository {type, repo}`; `POST /v13/deployments` with
    `gitSource {type, org, repo, ref}` (`repoId` not required).
- Changed: Render `autoDeploy: "yes"` (deprecated) is replaced by
  `autoDeployTrigger: "commit"`.
- Not confirmed from the docs read:
  - the Render web-service `plan: "free"` value in create-service details;
  - the Neon region ID list;
  - the Vercel 404 for an unknown project and the `/v10/projects/{id}/env?upsert`
    page.

  The first real launch must confirm these. Provider refusals are shown to the
  owner and recorded as FAILED steps, so a wrong value does not create anything.
