# Architecture map dashboard and A01 checkpoint

Starting commit: `1749b01`. Date: 14 October 2026.

## Delivered dashboard slice

The user requested a map-oriented dashboard based on their supplied reference.
The home dashboard now has four summary cards, a local world map, region markers,
zoom/pan/reset, region selection, saved-design availability and configured AZs,
expandable connection previews and direct architecture/deployment-preparation links.
The action is named **Deploy application**. Unknown regions are retained in an
unmapped list. Planned secondary-region relationships are dashed. No third-party
map tile requests, API key or cloud provisioning is involved.

The new `/dashboard/architecture-map` projection is authenticated and tenant-scoped,
paginates at 100 assets, selects the latest repository-draft snapshot per asset,
and excludes old sample topologies. It exposes summary fields and up to eight
designed edges, not raw evidence, environment secrets or chat history. The UI loads
successive pages and cancels stale updates when the organization changes.

Availability targets, drawn connections and named private components do not prove
deployed network isolation, reachability or uptime. Runtime status remains explicitly
unverified. Deployment actions open existing preparation; they do not create AWS
resources. Live infrastructure overlays remain part of the later operations plan.

## Actual validation

- Full isolated SQLite API suite: **343 passed, 4 skipped** (164.48 seconds).
  The four skips are explicitly opted-in read-only hosted health checks.
- New focused guard, fixture and map tests: **13 passed** before the full run.
- Frontend typecheck, ESLint and production Next build passed.
- Frontend configuration suite: **28 passed**.
- New real-API map journeys: **4 passed**, desktop Chrome and mobile Chrome.
  They create isolated businesses/assets, save region/availability targets, inspect
  region markers and connections, zoom/reset, and open the matching editor.
- Desktop/mobile screenshots inspected. They contain synthetic test businesses.
- Git whitespace validation passed.

Initial harness failures were corrected: missing local declared LangGraph dependencies,
SQLAlchemy malformed-URL exception handling, setting a region before configuring a
subnet, and supplying required slugs in direct database fixtures. These were fixture/
environment problems; assertions were retained. One browser invocation found no tests
during a corrected file-write error; the subsequent four real journeys passed.

## A01 implementation, not yet accepted

Added a Python 3.11 test constraints file, shared synthetic v1 graph/configuration
fixture, preservation/compile tests, explicit live-test marker, and default SQLite
suite discovery. Added a separately guarded disposable PostgreSQL runner, populated
migration rehearsal, non-superuser API isolation/history and actual row-lock tests.
Added CI jobs for SQLite, PostgreSQL and browser validation. See TEST_BASELINE.md.

PostgreSQL is unavailable locally (no service/container runtime). The new PG job
and fresh-checkout CI have not been verified in this checkpoint. A01 stays
IN_PROGRESS, all release gates remain NOT_ACCEPTED. No production deployment or
AWS verification is claimed. Next: inspect actual CI results, repair any migration/
dependency issues, validate fresh checkout, then begin A02 history preservation.

Unrelated `.artifacts/` content was preserved. No environment files, runtime databases,
fixture auth state or customer secrets are included in the change.
