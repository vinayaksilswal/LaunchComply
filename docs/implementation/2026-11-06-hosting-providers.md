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
