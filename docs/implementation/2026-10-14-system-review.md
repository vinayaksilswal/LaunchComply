# System review and saved-work foundation

## Customer outcome and review scope

Customers bring existing software. The intended paid outcome is an understandable,
reviewed AWS design followed by supported secure deployment and useful operating
visibility. The earlier agency-build interpretation is superseded by the user's
explicit answer. It remains recorded in PROGRESS.md, not marked completed.

This review inventoried the API and web source tree (396 files at review time),
read the startup/router and model structure, and traced the architecture, source,
AI, deployment preparation and dashboard paths against the durable plan. This is
a system-level review of critical paths, not a claim of exhaustive line-by-line
security assessment or live AWS acceptance. Older phase reports are historical.

## System map and verified gaps

| Area | Actual code / current behavior | Next required work |
| --- | --- | --- |
| Web workspace | Next.js dashboard routes; custom SVG ArchitectureCanvas/CloudDiagram; editor, history and map | Preserve work first (A02), canonical intent and reliable large layouts (A03, A06-A08) |
| API and storage | FastAPI router, SQLAlchemy, Alembic; hosted startup checks database/schema; SQLite development and PostgreSQL CI | Add state safely before changing writers; maintain real PostgreSQL constraints/locking evidence |
| Source intake | GitHub links and bounded inspection; uploaded source evidence; selected branch/root metadata not fully honored by inspection | Effective refs/roots and immutable source snapshots (A04); evidence-backed connection detection (A05) |
| Saved design | Architecture JSON snapshots; saves and restores create versions; repository changes currently loop over old snapshots | Stop rewriting old rows; new source refresh must produce a reviewable proposal (A02) |
| Source refresh | analyze holds application lock during external read; generates a new graph; copies some bindings/requirements but drops manual configuration | Capture head/epoch before external work, preserve intent, compare again on apply (A02) |
| AI | LangGraph/LangChain path with scoped graph/resource checks; request/proposal/chat/reference state still mutates snapshot JSON | Separate mutable records and exact scoped proposals; free-only live evaluations remain unaccepted (A02, A09-A10) |
| AWS model/export | Typed resource configurations and limited CloudFormation export; catalog breadth exceeds deployable coverage | Supported reference stack, workloads, IAM, data, scaling, edge and health contracts (B01-B06) |
| Deployment | deployments.py returns automatic_deployment_available=false; trigger returns 503; IaC simulation adapter refuses live provisioning | Tenant-scoped durable jobs, actual plans/approvals/execution and recovery acceptance (C01-C08) |
| Operations | Legacy simulation and observation paths coexist; dashboard map labels runtime NOT_VERIFIED | Provider-backed observations, drift, cost and alert freshness (D01-D04); never expose canned results as live |
| Business/security/compliance | Many route/model families exist; screen existence does not establish working control coverage | Tenant/access/audit evidence and independent acceptance (E02-E04); keep user workflow requests visible |
| Readiness claims | Application/Environment models retain legacy optimistic defaults such as HEALTHY and percentage scores | Audit consumers and remove unsupported readiness signals as part of A11/D01; do not use these defaults as release evidence |

## A02 slice implemented in this change

Added `ArchitectureWorkspaceState` and a forward migration after `ae1f5a6b7c8d`.
It stores tenant, asset, optional environment, head version, source epoch,
analyzed epoch and optimistic state version separately from design JSON.

Composite references reject heads and environments from another tenant or asset.
Separate partial unique indexes enforce one unassigned planning workspace and
one workspace per assigned environment. Invalid negative/future epochs fail at
the database. Parent unique indexes avoid rebuilding existing customer tables.

Backfill selects only tenant-consistent `repository-draft-v1` records, ordered by
creation time then ID. Unsupported records and malformed legacy ownership links
are not promoted. Existing source-changed state starts stale. Historical graph,
configuration, approval metadata, IDs and timestamps are not rewritten. No
environment or current approval authority is invented.

**Additive rollout only:** existing endpoints still use their existing readers
and writers. The new table is not yet current authority and can lag new writes.
Do not enable it for deployment or source freshness until the A02 cutover below.
This migration is a foundation, not a fix for the existing refresh/history bugs.
No customer-facing workflow change or live database migration is claimed here.

## Exact continuation

1. Add separately tenant-scoped proposal/conversation/reference/approval records
   and a legacy read adapter. Audit every spec_json assignment in
   architecture_workspace.py, applications.py and other consumers.
2. At cutover, reconcile heads while locking the application/workspace; legacy
   writes since this backfill must not be lost. Do not blindly trust this table's
   backfilled head. Current versions are unassigned; environment-specific heads
   require version/environment binding before environment features are enabled.
3. Route initialize/save/restore/requirements/configuration/AI apply through one
   compare-and-swap head transition. Move mutable state out of snapshot writes.
4. Replace repository-change history loops with epoch invalidation; adapt
   deployment preparation, service requests, dashboard and approval consumers.
5. Source refresh captures expected head/epoch, releases locks for inspection,
   then publishes an exact reviewable diff. Apply checks both again. Preserve
   manual IDs, positions, edges, configurations and bindings by default.
6. Pair API changes with source-diff review/apply/discard UI and test concurrent
   edit/unlink/refresh, tenant/role denial, history bytes and browser recovery.

All R0-R4 gates remain NOT_ACCEPTED. A02 remains IN_PROGRESS.

## Validation

- Isolated SQLite migration rehearsal: **3 pytest tests passed** (71.99 seconds).
  Includes model drift checks, populated history preservation, deterministic head,
  stale source state, partial uniqueness and tenant/application/environment FKs.
- Full API regression: **344 passed, 4 opt-in live checks skipped**, 145.99 seconds.
- Final serialized-JSON preservation test: **1 passed**, 33.04 seconds locally.
- [Fresh Linux CI](https://github.com/vinayaksilswal/LaunchComply/actions/runs/38596994818)
  at `129a575e18cc47ac5b0aa101684c5102644c9ea1`: **API, PostgreSQL and browser jobs
  all passed**. Browser job includes type checking, lint, configuration tests,
  production build and real local-API architecture-map journeys.
- No live AWS, paid AI or manual production migration was performed.
- PostgreSQL harness now rehearses the same populated backfill and constraints;
  a domain-row concurrent initialization test checks uniqueness/wait/rollback.
