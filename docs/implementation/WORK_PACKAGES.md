# Implementation work packages

Version 1.0, 14 October 2026. All cards start TODO. This is future work, not a
record of delivered functionality. Dependencies also appear in `state.json`.
Paths below are repository-relative; `architecture/` means
`apps/api/app/services/architecture/`, and `editor/` means
`apps/web/src/components/architecture/`. New files/tables are proposals: inspect
existing equivalents before introducing a duplicate. Follow CONTRACTS.md.

## Common completion contract

For each card record the commit, actual checks/results, data compatibility,
remaining limits and next step in state.json. Add focused pytest tests for backend
behavior, browser tests for interactive changes and PostgreSQL tests for database
guarantees. AWS mocks validate contracts, not deployed capability. Every card
needs a usable failure/retry path. Preserve unrelated work and existing IDs.

If a card exceeds one session, split it into numbered steps in its checkpoint;
do not claim the card DONE until all acceptance conditions hold. Feature flags
may hide incomplete paths but never bypass authorization or policy. Database
migrations are additive first; rollback normally disables new writes and keeps
new data readable. Never use a destructive downgrade as routine recovery.

## A. Reliable repository-to-reviewed-design product

### A01 — Reproducible baseline and regression fixtures

**Depends on:** none. **Release:** R1; establishes R0 baseline evidence.

**Seams:** `apps/api/tests/conftest.py`, existing architecture/resource tests,
`apps/web/tests/workspace-fixture.ts`, `apps/web/tests/e2e/architecture-editor.spec.ts`,
`apps/web/package.json`, API requirements and Alembic chain; proposed `.github/workflows/architecture.yml`.

1. Record current HEAD/status and inventory actual API/web test commands and their
   environment guards. Pin compatible dependencies using the existing package
   manager; do not upgrade unrelated libraries. Classify simulation, local, live
   provider and PostgreSQL tests explicitly.
2. Create synthetic fixtures: multi-repo four-frontends/API/data, existing v1
   resource settings, monorepo roots, invalid cross-VPC references, unresolved
   browser API call, empty design and disconnected support services. No customer
   source or secret in fixtures.
3. Make CI run API tests against disposable storage, frontend config/type/lint,
   build and an authenticated local browser journey. Add a disposable PostgreSQL
   service for migration/isolation tests; live AWS tests opt in separately.
4. Record baseline failures accurately; fix harness blockers before product
   behavior. Preserve existing test coverage rather than weakening assertions.

**Acceptance:** a fresh checkout can reproduce results from documented setup;
CI distinguishes skipped external checks from success; unsafe production database
test configuration fails closed. Fixture v1 export/history tests are green.
**Evidence/recovery:** command report, dependency lock diff and CI link if run;
revert harness-only changes without altering customer state.

### A02 — Preserve saved work and immutable history on source changes

**Depends on:** A01. **Release:** R1.

**Seams:** `apps/api/app/api/v1/architecture_workspace.py` analyze/output,
`apps/api/app/api/v1/applications.py` set_repositories,
`architecture/workspace.py`, `apps/api/app/models/entities.py`, Alembic,
`editor/GraphChangeReview.tsx`, `editor/ArchitectureHistory.tsx`.

1. Add the minimal current workspace/head/source-epoch record described in
   CONTRACTS; backfill without rewriting historical graph JSON or IDs. Record
   current authorization/freshness separately from immutable snapshots.
2. Stop looping over old Architecture rows to change history when repositories
   change. Increment source epoch and invalidate *current eligibility*; keep
   historical approvals as historical evidence, never reusable authority.
   Move mutable chat/proposal/reference/approval state out of `spec_json` for new
   snapshots too; audit every endpoint writing that field, not only analyze.
   Preserve legacy embedded metadata for historical display through an adapter.
3. Refresh reads a captured base head and source epoch, produces a proposal,
   and preserves resource configurations, execution mode, bindings, manual nodes,
   edges and layout unless an explicit reviewed operation changes them.
4. Apply under a database lock with expected head/epoch; stale proposals return
   a conflict and reload/compare actions. First analysis of an empty workspace may
   propose the whole design. Cancellation/error leaves the previous head intact.

**Acceptance:** byte-equivalent old snapshots after link/unlink/refresh; manual
S3/network properties survive refresh; concurrent refresh/edit and unlink/apply
cannot overwrite newer work; viewer/cross-tenant operations fail; restore creates
a new version. Browser can inspect and discard source changes before Apply.
**Evidence/recovery:** migration rehearsal and preservation tests; disable new
refresh entry if rollback needed, retaining immutable proposals and head state.

### A03 — Canonical design v2 and compatibility boundary

**Depends on:** A02. **Release:** R1.

**Seams:** `architecture/workspace.py`, `resource_configuration.py`,
`resource_topology.py`, `resource_edits.py`, response schemas, web API types.
Proposed `design_spec.py`, `design_adapter.py`, shared JSON-schema fixtures.

1. Implement strict v2 models from CONTRACTS and a pure v1-to-v2 reader. Keep
   resource IDs and existing compiler logical IDs; generate deterministic stable
   connection IDs, including duplicate legacy connections.
2. Separate semantic intent, view state and analysis metadata. Define canonical
   serialization and semantic/artifact hashes; timestamps and viewport do not
   create infrastructure changes. Explicitly version extension namespaces.
3. Keep old API compatibility while adding v2 read capability, then gate v2
   writes. Reject unknown future versions safely; do not down-convert lossy data.
4. Round-trip both schemas through save/history/export/proposal review; move
   canonical ownership out of ad-hoc renderer heuristics.

**Acceptance:** golden v1 fixtures render/export identically; same input gives
same hash; semantic changes change hash; layout-only changes preserve artifact
identity; dangling references/duplicate IDs/oversize payloads rejected.
**Evidence/recovery:** compatibility matrix and migrated-copy rehearsal; backend
reader deploys before writer. Keep old snapshots and disable v2 writes on fault.

### A04 — Effective GitHub refs, roots and immutable source snapshots

**Depends on:** A03. **Release:** R1.

**Seams:** `architecture/repository_links.py`, `workspace.py`, `source_archive.py`,
`apps/api/app/models/source_control.py`, source/application APIs and source UI.

1. Carry link-specific branch/root through analysis; resolve to an immutable
   commit before listing/fetching files. Snapshot installation/repository/ref/root,
   commit, parser version, analyzed files and coverage/skip reasons.
2. Validate root paths and installation access server-side; handle branch delete,
   token revocation, empty repo, rate limiting and repo unlink during work.
3. Analyze multiple repositories with bounded concurrency/bytes/time. Reuse
   immutable content hashes without mixing tenants; archive analysis executes no
   customer code and rejects traversal/bomb/symlink escape cases.
4. UI exposes the effective ref/root/commit and per-repo outcome, with retry for
   failed repositories. A partial run must visibly state partial coverage.

**Acceptance:** two branches and monorepo roots produce distinct correct facts;
all blobs correspond to the pinned commit; invalid roots denied; no access after
revocation; six-repo limits consistent across API/UI. Audit legacy disconnect
authorization and repair if it permits ordinary members to revoke shared access.
**Evidence/recovery:** synthetic GitHub/ZIP fixtures and API permission tests;
retain snapshots, disable affected source action without deleting designs.

### A05 — Evidence-backed workloads and request connections

**Depends on:** A04. **Release:** R1.

**Seams:** `architecture/code_evidence.py`, `environment_connections.py`,
`workspace.py`, `editor/codeArchitecture.ts`, `ArchitectQuestions.tsx`,
`RequestFlows.tsx`, `ArchitectureSettings.tsx`.

1. Add bounded parser adapters for the supported JS/TS and Python frameworks,
   Docker/Compose, routes, clients and environment variable *names*. Record
   file/line/content-hash provenance and parser confidence. Unsupported frameworks
   stay unresolved; manifests alone yield dependency candidates.
2. Distinguish browser bundle, server renderer/BFF, API, background worker,
   database, cache, queue and object store. Build cross-repo links only from
   evidence or explicit customer binding; never connect every frontend to every API.
3. Ask short questions for unresolved execution mode, API target, auth, protocol
   and hosting. Preserve answers as versioned user decisions tied to evidence.
4. Validate browser reachability versus server-private reachability. Offer a BFF
   or public controlled ingress design only when its implementation/configuration
   exists or is explicitly marked required work. Keep telemetry/build separate.
5. Environment UI accepts names/bindings and secret references. If actual secret
   storage is later needed, use a separate vault flow, never graph properties.

**Acceptance:** known-positive and known-negative fixture edges; no invented
runtime proof; evidence opens the correct source; secret fixtures never appear
in model prompts, responses, logs or exports; public frontend preference survives.
**Evidence/recovery:** detection precision/coverage report and unresolved list;
new analysis is a proposal so parser rollback does not alter accepted designs.

### A06 — Editor commands and complete manual controls

**Depends on:** A03, A05. **Release:** R1.

**Seams:** `editor/ArchitectureCanvas.tsx`, `useGraphHistory.ts`,
`manualPlacement.ts`, `GraphChangeReview.tsx`, inspector and history components.
Proposed pure command reducer and selection/view-state hooks.

1. Extract domain mutations, view state and server sync before renderer changes.
   Commands address stable IDs: add/edit/duplicate/delete resource or connection,
   multi-select, align, pin, group presentation, configure and restore.
2. One gesture equals one undo step; Ctrl/Cmd+Z and redo ignore active text input
   appropriately. Delete previews dependent references and rejects dangling state.
3. Provide editable named ports/connections, inspector validation, unsaved guard,
   conflict recovery and history preview/restore with explicit current-version diff.
4. Drag changes layout only; changing VPC/subnet happens through validated settings.
   Copy/paste creates fresh IDs and remaps only intentional internal references.

**Acceptance:** reducer tests plus keyboard/pointer browser journeys, one-step
drag undo, duplicate independence, stale save conflict, reload persistence, no
whole-design changes on selected-node edit. Server revalidates all commands.
**Evidence/recovery:** short browser recording and command tests; keep current
renderer using the same reducer while moving controls incrementally.

### A07 — Measured layout and renderer decision

**Depends on:** A06. **Release:** R1.

**Seams:** `editor/ArchitectureCanvas.tsx`, `flowRouting.ts`, `resourceTopology.ts`,
web dependencies; proposed layout worker and benchmark fixtures.

1. Compare current SVG against React Flow plus ELK using synthetic 20/80/200/500
   resource fixtures, boundaries, cycles, multi-edges and selected-path focus.
   Research current APIs/licenses from primary documentation before integration.
2. Measure fit/readability, drag/pan latency, layout duration, memory, keyboard
   accessibility and export parity on a recorded reference browser/device.
3. Choose and record an ADR. Library adoption requires measurable benefit and
   preservation of domain contracts; do not maintain two canonical graph models.
4. Implement worker layout cancellation/stale-result rejection and deterministic
   seed/order; honor pins and selected-scope arrangement. Keep existing caps until
   all layers support the larger size and A08 acceptance passes.

**Acceptance:** comparable benchmark artifacts, no render-thread freeze from
layout, old graph identities/export preserved, no stale worker overwrites edits.
**Evidence/recovery:** ADR with license/performance/accessibility tradeoffs;
feature-flag renderer and retain old read/render path during migration.

### A08 — Professional hierarchy, readable flow and accessible workspace

**Depends on:** A07. **Release:** R1.

**Seams:** editor canvas/map/routing, `AssistantWindow.tsx`, architecture route,
dashboard navigation and SVG export functions.

1. Render account/region/VPC/AZ/subnet boundaries from typed intent, never inferred
   from node pixels. Show shared multi-AZ resources once with attachment markers.
2. Default request flow left-to-right: ingress, frontend/BFF, private API, data;
   separate global services and a support/observability rail. Use typed edge
   filters, selectable paths, labels on focus, collapse, minimap and zoom-to-node.
3. Compact header/navigation; avoid document scrolling for desktop editor.
   Make text readable at normal zoom with detail levels rather than fitting an
   entire huge graph into illegible cards. Offer Fit and readable focused views.
4. AI popup supports drag with keyboard alternative, viewport bounds, resize,
   focus restoration and one two-state minimize/expand control. Persist safe
   position locally; inspect a node without blocking canvas editing.
5. Export SVG/print with matching boundaries, legend, revision, unresolved status
   and full labels. Escape all repository/user text; never embed active content.

**Acceptance:** ACCEPTANCE V01-V05; desktop/laptop keyboard and touch checks;
cycles/crossings manageable with focus; no automatic re-layout on ordinary edit;
all fixtures render without overlapping labels hiding selected connections.
**Evidence/recovery:** screenshots at recorded sizes and performance report;
retain old layout coordinates, migration flag and reset-view action.

### A09 — Typed, scoped AI edits and guided service addition

**Depends on:** A05, A06, A08. **Release:** R1.

**Seams:** `architecture/agent.py`, `edit_scope.py`, `proposal_policy.py`,
`response_schema.py`, `resource_edits.py`, chat/proposal APIs, catalog/questions UI.

1. Keep LangGraph/LangChain with bounded nodes: context, clarify, propose typed
   operations, validate, present. No deployment or credential tools.
2. Supply selected IDs, permitted operation types, relevant evidence and nearby
   dependencies only. Treat repository comments/docs as untrusted content.
3. Generate explicit stable-ID additions/updates/removals and connection edits;
   ask for required settings before claiming configuration complete. Catalog
   choices filter by region and capability; visual-only services remain usable
   for planning with visible deployment blockers.
4. Validate entire candidate graph and scope on server. At most two repair rounds,
   then actionable failure. Show exact before/after and unchanged scope summary;
   Apply requires matching head/source epoch. Never auto-apply AI responses.

**Acceptance:** selected description change preserves all other fields; adding
a service does not rewrite the architecture; broad unrequested ops rejected;
prompt injection, malformed JSON, deleted target and stale proposal fail safely.
**Evidence/recovery:** deterministic provider fixtures and UI review journey;
disable AI mutations independently of manual editor.

### A10 — AI reliability, free routing and evaluation gate

**Depends on:** A09. **Release:** R1.

**Seams:** `architecture/routing.py`, `provider_status.py`, `provider_errors.py`,
agent tests and assistant status UI; proposed redacted evaluation corpus/runner.

1. Verify the user's configured model IDs against current provider metadata. Use
   only zero-price eligible routes under free-only policy; availability changes
   become route health, not code assumptions. Never silently choose paid routes.
2. Bound total wall time, attempts, context/output size and concurrency; classify
   auth, quota, rate limit, transport, unsupported schema and invalid response.
   Backoff/circuit-break unavailable routes and respect cancellation.
3. Maintain at least 40 synthetic cases spanning edits, additions, networking,
   uncertainty, source injection and failures. Separate deterministic policy
   acceptance from live model quality/latency results with date/model recorded.
4. Show progress, provider failure and retry/manual alternative without losing
   draft or chat. Capture redacted metrics; no secrets/source dumps in telemetry.

**Acceptance:** all scope/security rejection cases pass; no paid fallback under
free-only policy; bounded all-provider-failure path; live sample meets AITest
thresholds or release explicitly remains manual-only/AI experimental.
**Evidence/recovery:** evaluation report and provider routing matrix; config
rollback to last verified eligible model set, manual work always available.

### A11 — Readiness issues, load targets and cost assumptions

**Depends on:** A05, A08. **Release:** R1.

**Seams:** `architecture/design_review.py`, `deployment_planning.py`,
`capacity_planning.py`, `network_guidance.py`, `editor/DesignReview.tsx`, settings.

1. Build deterministic issue objects: code/severity/resource/field/evidence/fix
   action; block for missing config, impossible browser-private path, public data,
   invalid references and unsupported export types. Policy version is explicit.
2. Persist Mumbai (`ap-south-1`), 500 peak requests/minute, 100 concurrent users
   and multi-AZ as user targets after confirming existing saved values; never
   turn them into measured capacity. Track request mix, latency, DB/storage and
   recovery questions; autoscale minimum/maximum remain bounded proposals.
3. Cost view lists billable components, region, assumptions, freshness and unknown
   items. Until pricing integration, provide an assumption worksheet/calculator
   handoff, not a fabricated monthly quote. Include NAT, logs, ALB, egress and DB.
4. Separate design completeness, tested deployability and compliance evidence.
   Issue click opens relevant field; successful correction recalculates immediately.

**Acceptance:** invalid/unknown cannot score ready; issue IDs stable; load changes
generate a reviewable proposal, not silently resize infrastructure; no compliance
certification claim from a percentage; unauthorized updates rejected.
**Evidence/recovery:** golden issue fixtures and browser fix loop; retain policy
version and previous reports while recalculating new evaluations separately.

### A12 — Versioned customer handover and R1 release decision

**Depends on:** A01-A11. **Release:** R1.

**Seams:** export/history/source/editor flows, existing service delivery/report
records, runbooks and public capability text only where it misstates architecture.

1. Package revision-specific SVG, design JSON, evidence coverage, unresolved
   decisions, security/request flow, capacity assumptions, cost worksheet and
   supported/omitted infrastructure export list with checksums.
2. Exercise connect -> choose ref/root -> analyze -> clarify -> edit -> AI review
   -> save -> history -> export, plus retry/conflict/cancel. Preserve customer
   context when opening optional existing service review; no promotion panels.
3. Document a scoped human design review deliverable and acceptance checklist.
   Prepare opted-in pilot script and feedback form; no outbound customer messages
   or fabricated pilot results. Record actual R1 gate decision and open gaps.

**Acceptance:** complete synthetic journey and release checks; bundle opens without
LaunchComply, identifies exact revision and no secrets, no unsupported deployment
claim. R1 remains NOT_ACCEPTED if mandatory gates lack evidence.
**Evidence/recovery:** release dossier and tagged candidate; revert UI release
without deleting saved designs/reports. Paid pilot acceptance is recorded later.

## B. Supported workload compiler

### B01 — One resource registry and truthful capability levels

**Depends on:** A03, A11. **Release:** R2.

**Seams:** `architecture/resource_configuration.py`, `network_resources.py`,
`knowledge.py`, `editor/awsResourceCatalog.json`, property fields and catalog.

Define versioned resource descriptors for schema, scope, dependencies, validation,
compiler mapping, property form, risk, pricing keys and tests. Generate UI support
metadata from backend contract. Record per-region capability evidence and review
date; keep broad AWS discovery separate from the tested deployment allowlist.
Start with the existing 15 types; preserve logical IDs and exported templates.
No raw CloudFormation/JSON escape hatch bypassing policy.

**Acceptance:** frontend/backend registry parity, unsupported properties blocked,
catalog search/category/region support, deterministic template fixtures unchanged.
**Evidence/recovery:** registry coverage report; version descriptors, retain old
readers and disable newly introduced types without breaking existing display.

### B02 — Real ingress and network attachments

**Depends on:** B01. **Release:** R2.

**Seams:** resource compiler/registry, network validators, topology and property UI.

Add ALB, target groups, listeners/rules, certificate references and explicit subnet/
security-group attachments. Validate internet-facing versus internal placement,
at least required AZ/subnet coverage, target type for ECS awsvpc, protocol/ports,
health path and HTTPS redirect. WAF is an association/control, not a transport hop.
Model frontend/BFF-to-private-API through internal ingress or supported service
discovery. Validate route/security references without promising runtime reachability.

**Acceptance:** compile/cfn-lint golden cases; deny cross-VPC targets, invalid
subnet/AZ/listener combinations and public API compute exposure by default;
explicit deviations require reviewed policy exceptions, never AI-only approval.
**Evidence/recovery:** policy matrix/template snapshots; changes requiring
replacement are visible, newly supported types flaggable.

### B03 — Container workloads, images and least-privilege roles

**Depends on:** B02. **Release:** R2.

**Seams:** registry/compiler, source workload map, infrastructure IAM helpers;
do not enable legacy simulated provisioning.

Add ECS cluster/task definition/service, task/execution roles, image digest,
container ports, health checks, logs, resource limits and placement. Require a
real image/build contract; diagram of an API alone is not a runnable image. Use
separate workload IAM and platform execution IAM, constrained PassRole and no
default wildcard policy. Bind secret references without storing resolved secrets
in template previews. Make public frontend/private API placement explicit.

**Acceptance:** supported combinations compile; invalid CPU/memory/architecture,
missing digest, broad IAM, unsupported task mode and public private-API flags fail;
logical IDs stable on label/layout edits; IAM changes classified for approval.
**Evidence/recovery:** template/policy corpus; reviewed task-definition rollback
retains previous digest and secret reference versions where supported.

### B04 — Persistent data and secret contracts

**Depends on:** B03. **Release:** R2.

**Seams:** registry/compiler, private storage/environment bindings, data inspector.

Add explicitly supported RDS PostgreSQL configuration, subnet group, security
group consumers, backup/deletion protection/encryption and secret references;
extend S3 private policy/endpoints. Add ElastiCache only after its own matrix,
otherwise mark unsupported deployment. No database/Redis public ingress. S3 stays
regional outside subnets with private access shown via endpoint/policy. Separate
provisioning DB from application schema migration. Review replacements and retention.

**Acceptance:** reject open CIDRs, invalid engine/version/region combinations,
plaintext passwords and implicit destructive replacement; generated backup/retain
settings and IAM policies tested. Missing tenant strategy is a design issue.
**Evidence/recovery:** data-change risk matrix; rollback never deletes retained
data and never assumes database contents can be reversed by CloudFormation.

### B05 — Bounded autoscaling, queues and health signals

**Depends on:** B03, B04. **Release:** R2.

**Seams:** capacity planner, resource registry, scaling settings and alarms.

Add ECS scalable targets/policies, CloudWatch alarms and supported SQS/worker
contracts. Capture min/max, CPU or request metric, cooldown, backlog/DLQ/retry
and downstream DB connection budgets. Show workload-specific scaling and
multi-AZ minimum cost tradeoffs. Derive recommendations from measured load tests
when available; 500 RPM/100 users alone cannot determine task size.

**Acceptance:** invalid min/max/metric or unbounded capacity blocked; queue retry
does not create infinite poison-message processing; dependent DB/pool saturation
is an issue; CPU/request changes require review. Golden compiler checks pass.
**Evidence/recovery:** explicit test workload assumptions; scale rollback uses
reviewed safe minimum, preserving queue messages and data.

### B06 — Edge services and complete reference compilation

**Depends on:** B02, B03, B04, B05. **Release:** R2.

**Seams:** registry/compiler, network policy engine, artifact exporter.

Support selected Route53 records, ACM certificate references, CloudFront origin/
cache behavior and WAF associations/rules with region/scope restrictions. Require
domain ownership/certificate validation; protect private S3 with the supported
origin access pattern, do not confuse gateway endpoints with CloudFront origins.
Compile the full golden frontend/BFF/private API/data design with clear outputs,
cross-stack restrictions, no omissions and deterministic digest. Run cfn-lint plus
versioned policy checks; report partial export separately from whole deployment.

**Acceptance:** same semantic graph yields same artifact; no unsupported service
silently omitted; unsafe cache/auth/CORS/default network settings fail policy;
resource count/template limits handled visibly. No claim of live success yet.
**Evidence/recovery:** complete reference artifact and policy report; keep prior
compiler version available for reproducibility and reject incompatible updates.

## C. Controlled AWS deployment

### C01 — Tenant and deployment authorization foundation

**Depends on:** A03, B01. **Release:** R2.

**Seams:** existing auth/organization models, DB sessions, architecture/deployment
APIs, AWS connection roles, Alembic and PostgreSQL test harness.

Enforce tenant-bound queries and composite ownership constraints for all design,
proposal, job, artifact, account and environment references. Implement deployment
roles (read/design/approve/execute/admin), server checks and auditable transitions.
Assess RLS as defense in depth; if adopted test with a non-owner runtime role,
transaction-local tenant context and restricted worker roles. Do not copy unsafe
research SQL or globally bypass policies. Isolate support access with recorded grants.

**Acceptance:** cross-tenant IDs, forged organization values, worker jobs and
download URLs denied; no connection-pool tenant context leakage; owner/BYPASSRLS
tests establish actual protection; last-owner/access recovery covered.
**Evidence/recovery:** permission matrix and PostgreSQL integration report;
rehearse additive migrations and role rollout without locking out valid owners.

### C02 — Durable jobs, outbox and restart safety

**Depends on:** C01, A04. **Release:** R2.

**Seams:** API jobs/status endpoints, DB/Alembic, proposed worker process;
legacy in-memory provisioning locks must not become the execution authority.

Use PostgreSQL jobs/outbox with transactionally created work, unique idempotency
key, lease/heartbeat, attempt budget, fencing token and bounded retries. Persist
progress/events with tenant ownership. Separate source/build/AWS jobs and quotas.
Worker claims one allowed state; cancellation and lease expiry have explicit rules.
Move long source analysis to this path preserving A02 proposal semantics.

**Acceptance:** process kill/restart, duplicate delivery, lease expiry, stale
worker write and two-worker contention preserve one logical outcome; exhausted
jobs visible/retryable, no endless poll. Real PostgreSQL required for locks.
**Evidence/recovery:** restart fault-injection report; pause claims and drain
leases before deploy; leave durable pending work intact for new worker.

### C03 — Immutable artifacts and AWS target preflight

**Depends on:** B06, C01, C02. **Release:** R2.

**Seams:** `infrastructure/aws_account_connection.py`, architecture deployment
planning, artifact records/storage and customer environment UI.

Capture template/source/policy/compiler digests and immutable encrypted artifact
storage with controlled retention. Verify actual account ID/region/role/session,
external ID and granted operation scope; distinguish observation/planning/execution
roles. Read-only preflight checks quotas, supported services, AZs, certificate/image/
secret reference accessibility where permitted. Unknown permission is not a pass.

**Acceptance:** wrong account, expired connection, missing role/region, inaccessible
artifact and changed artifact fail; diagnostics do not reveal credentials; AI
cannot call preflight as an execution tool. Revalidation has freshness bounds.
**Evidence/recovery:** target mismatch/permission tests and authorized read-only
AWS evidence; artifacts versioned, failed preflight leaves design unchanged.

### C04 — Actual CloudFormation change-set plans

**Depends on:** C03. **Release:** R2.

**Seams:** new supported deployment service behind existing gated deployment API,
AWS SDK adapter, review UI and plan records.

Create non-executed change sets for exact immutable artifacts with scoped role,
stack name/tags and operation identity. Poll durable status and capture adds,
modifications, replacements/deletions, IAM changes and unresolved estimates.
Handle empty change sets as no-op, failed plans as failed, nested/import operations
only when supported. Plan expiry and newer source/design invalidate execution
eligibility. Creating a plan does not authorize ExecuteChangeSet.

**Acceptance:** no resource creation from plan path; timeout/access-denied/no-op/
replacement accurately displayed; template/target substitution rejected; mocks
plus authorized sandbox change-set evidence required before capability promotion.
**Evidence/recovery:** captured change-set receipt and diff; cancel/delete only
the owned unexecuted change set, retain audit/artifact evidence.

### C05 — Exact approval and execution permissions

**Depends on:** C04. **Release:** R2.

**Seams:** approval models/API, deployment review UI, audit service.

Bind approval to plan/change-set/artifact/policy/source hashes, target account/
region/environment, risk summary and expiry. Check approver role and optional
separation of duties. Support explicit decline/revoke/reapprove; changed inputs
require a fresh plan. Billable action requires owner-approved budget/scope;
payment status alone never authorizes a deployment. Display irreversible risks.

**Acceptance:** replay, expired/revoked approval, self-approval when disallowed,
concurrent change, forged IDs and capability escalation blocked at execution
boundary, not just UI. Audit records include actor/reason and are tenant scoped.
**Evidence/recovery:** authorization/race test matrix; revoke eligibility without
erasing past approvals. Default execution feature remains off until C08.

### C06 — Execution, reconciliation and health verification

**Depends on:** C05. **Release:** R2.

**Seams:** durable worker, new AWS adapter, deployment status/events UI;
do not activate demo worker/orchestrator code as a shortcut.

Implement CONTRACTS state machine and provider client tokens. Recheck target,
approval, artifact and policy immediately before action. Persist intent before
calling AWS; after ambiguous timeout reconcile actual stack/change-set events
before retry. Poll stack status, then bounded workload health probes from approved
outputs; guard SSRF/private metadata destinations. Distinguish infrastructure
complete, workload healthy and deployment accepted. Redact events consistently.

**Acceptance:** create/update success, provider rejection, worker restart after
AWS accepted request, duplicate event, failed health and rollback failure all
end in truthful recoverable state. No fabricated metrics or live-success mock.
**Evidence/recovery:** authorized sandbox execution receipts and fault drill;
MANUAL_RECOVERY for ambiguity, never repeat creates or blanket delete stacks.

### C07 — Isolated builds and recovery procedures

**Depends on:** C06, B03, B04. **Release:** R2.

**Seams:** existing build/release modules (audit simulations first), durable jobs,
image provenance, deployment artifacts and recovery runbooks.

Start with verified prebuilt image digests; add supported GitHub-to-image builds
only in ephemeral isolated builders with time/disk/network limits and no control
plane credentials. Capture commit, Dockerfile/context, digest, scan/SBOM/provenance
and scoped registry push. Protect against fork/PR secret exposure and arbitrary
build command injection. Define expand/contract DB migration workflow, backup
verification, app rollback, failed-migration stop and data-retention behavior.

**Acceptance:** malicious build cannot reach platform DB/metadata/secrets; quota
and cancellation clean owned ephemeral resources; rollback previous image works;
database destructive changes require separate reviewed procedure and rehearsal.
**Evidence/recovery:** isolated build assessment and restore report; disable
builds while retaining prebuilt-image path, no promise that IaC reverts data.

### C08 — Sandbox matrix and controlled R2 pilot

**Depends on:** C06, C07, A12. **Release:** R2.

**Seams:** integration tests, AWS test account manifest, release dossier/runbooks.

Obtain explicit account/region/resource/budget/time-window authorization, then
exercise golden workload create/update/scale/failure/restart/recovery and teardown
of owned disposable resources. Check HTTPS/auth/network isolation, image/secret
rollout, RDS backups and cost recording. Run load test with synthetic data and
an agreed SLO; use no customer production traffic. Keep separate evidence for
each supported service/configuration. Prepare opt-in first customer acceptance.

**Acceptance:** R2 checklist passes with real AWS receipts, owner-reviewed cost
and recovery outcomes; unsupported combinations remain disabled. Customer pilot
requires its own concrete plan/approval; no deployment inferred from this card.
**Evidence/recovery:** sandbox inventory and cleanup reconciliation, signed-off
limits; stop gate on restore or isolation failure rather than marking success.

## D. Actual operations and controlled changes

### D01 — Observed health, telemetry and alerts

**Depends on:** C08. **Release:** R3.

**Seams:** `apps/api/app/services/operations/observability_provider.py`, health
APIs/dashboard, jobs and telemetry settings.

Replace canned values with read-only AWS metrics/events for owned resources,
OpenTelemetry-compatible application instrumentation where supported, bounded
polling/retention and timestamped freshness. Separate logs, metrics and traces;
tenant filter all queries. Configure thresholds/recipient channels through an
explicit customer action; do not send external alerts without configured consent.

**Acceptance:** unknown/stale/access-denied distinct from zero/healthy; delayed
and duplicate events handled; tenant isolation, redaction, polling budgets and
alert deduplication tested. Verified synthetic incident produces expected signal.
**Evidence/recovery:** real metric receipts and incident drill; disable collector
without pretending health is green or stopping customer infrastructure.

### D02 — Drift, inventory ownership and safe import

**Depends on:** D01. **Release:** R3.

**Seams:** `infrastructure/drift_engine.py`, actual inventory adapters, registry
ownership model, change review and import UI.

Compare supported observed properties to deployed artifact and current desired
version separately. Report NOT_CHECKED/unknown and freshness; no expected-as-actual
shortcut. Imported discovery is unmanaged until supported CloudFormation import
requirements and explicit plan succeed. Never auto-adopt/delete foreign resources.
Reconcile drift through a new design proposal and approved change set; preserve
user intent if live state diverges. Include nested-stack limitations.

**Acceptance:** intentional drift, unsupported fields, missing resource, foreign
ownership and failed import visible; no automatic repair; tests show discovered
state cannot overwrite desired or claim managed status before actual import.
**Evidence/recovery:** drift/import sandbox receipts; failed import leaves resource
unmanaged and directs recovery, never assumes zero-downtime import.

### D03 — Cost visibility, budgets and platform metering

**Depends on:** D01. **Release:** R3.

**Seams:** capacity/cost services, commercial usage records, AWS read-only adapters.

Integrate current AWS pricing estimates and separately delayed actual billing
data with permissions, currency, timestamp and regional assumptions. Attribute
supported costs through stack/resource tags; show unattributed totals rather than
invent allocation. Meter AI, jobs, repositories, storage and support usage with
idempotent events. Customer budget breach alerts do not silently terminate workloads.

**Acceptance:** estimate versus actual clearly distinguished; unsupported pricing,
delayed billing and permission failure displayed; replayed events not double billed;
spend alert thresholds and platform budget limits tested with synthetic ledger.
**Evidence/recovery:** reconciliation sample and per-plan contribution worksheet;
freeze disputed charging, retain usage records and preserve customer AWS services.

### D04 — Operations runbooks and R3 acceptance

**Depends on:** D01, D02, D03. **Release:** R3.

**Seams:** incident/recovery/support runbooks, operations UI and release evidence.

Exercise provider outage, connection revocation, unhealthy deployment, drift,
quota exhaustion, backup restore and control-plane restart. Record RTO/RPO/SLO
observations, contacts, ownership and escalation; do not publish untested targets
as commitments. Provide one-click context from alert to resource/events/fix
proposal. Prepare customer handoff with actual managed scope and retention.

**Acceptance:** R3 gates, no simulation path supplies customer health; restore
and rollback can be operated by someone other than original author using runbook;
cost/alert freshness meets documented bounds.
**Evidence/recovery:** timed drill and revised runbooks; restrict operational
claims/support scope when evidence fails, without hiding incidents.

## E. Commercial sustainability and enterprise extension

### E01 — Metered entitlements and paid design pilot

**Depends on:** A12. **Release:** commercial R1 support; required for R4.

**Seams:** existing service payments, catalog/entitlement/usage models and customer
reports; reuse centralized service requests, do not spread sales panels.

Make plan limits server-enforced, explain upgrade/limit outcomes, reconcile
payment webhooks idempotently and test cancellation/refund/grace/recovery. Start
with owner-approved scoped invoices/services where existing workflow supports
them; subscriptions require real lifecycle acceptance. Measure actual cost and
delivery time against README hypotheses. Prepare pilot script, deliverables and
feedback metrics; only record paid acceptance with real customer evidence.

**Acceptance:** quota races/duplicate webhooks/failed payments cannot grant wrong
tenant access; no paid-AI fallback; entitled customers retain history/export access
per disclosed retention policy. Pilot/margin targets are measured, not fabricated.
**Evidence/recovery:** billing sandbox report and opted-in pilot outcomes when
available; compensating ledger entries/refunds rather than deleting history.

### E02 — Enterprise identity, access review and audit export

**Depends on:** C01, D04. **Release:** R4.

**Seams:** organization/auth/team/admin/audit modules and deployment approvals.

Add supported enterprise SSO and lifecycle/deprovisioning workflows, granular
project/environment roles, access review and controlled emergency support access.
Validate provider metadata/tenant binding and existing-session revocation. Export
immutable audit events with actor/target/action/result and retention rules; no
secret contents. Keep last-owner recovery and optional dual approval workable.

**Acceptance:** wrong-tenant identity linking, role escalation, stale sessions,
SSO outage/recovery, unauthorized audit access and approver removal tested with
real supported IdP sandbox before claiming integration support.
**Evidence/recovery:** identity matrix and access drill; staged enrollment with
documented recovery, never lock customers out on partial rollout.

### E03 — Enterprise graph scale, accounts and advanced patterns

**Depends on:** A08, B06, C08, D02. **Release:** R4.

**Seams:** canonical scope model, renderer/worker, registry and AWS connections.

Add environment overlays with explicit diff/promotion, multi-account/region views,
reusable versioned modules and supported private connectivity patterns. No implicit
cross-account grants. Expand service support by complete B01-style capability
cards, prioritizing actual paid demand; EKS/Aurora/transit/PrivateLink require
separate tests/cost/recovery, not icons. Raise graph limits only after end-to-end
storage/API/layout/AI/export performance tests and abuse budgets pass.

**Acceptance:** cross-account/region ownership errors rejected; promotion cannot
copy secrets/physical IDs incorrectly; target graph size supported in measured
browser and APIs; collapsed groups retain accurate references and exports.
**Evidence/recovery:** support matrix and benchmarks; old limits remain available,
no rewriting all saved diagrams to a new pattern.

### E04 — Independent security, isolation and recovery acceptance

**Depends on:** E02, E03, D04. **Release:** R4.

**Seams:** whole supported architecture path, CI, threat model, security/DR evidence.

Commission or perform an independently reviewed assessment of source ingestion,
secret handling, prompt boundary, tenant isolation, AWS confused-deputy defenses,
build isolation, deployment authorization and supply chain. Threat-model the actual
implementation; fix validated findings. Run platform load, backup restore and
migration rollback drills with non-production data and agreed scope. Review
privacy/contractual requirements with qualified reviewers rather than research
assumptions. Record exclusions and residual risks explicitly.

**Acceptance:** no unresolved critical/high findings on supported launch path,
measured recovery matches contracted promises, tenant escape tests pass and data
deletion/retention works. Test completion alone never means certified compliance.
**Evidence/recovery:** reviewed findings/remediation dossier; hold R4 launch for
material failures and roll back affected capability while retaining audit data.

### E05 — Repeatable delivery, support capacity and R4 decision

**Depends on:** E01, E04, D03. **Release:** R4.

**Seams:** customer onboarding/service delivery, runbooks, pricing/capability pages,
release state and commercial operations records.

Reconcile actual service scope, support hours, costs and margins from opted-in
pilots. Publish tested capability/region/version limits, onboarding requirements,
SLO/support terms and escalation ownership. Ensure customer can export/leave,
rotate/revoke access and understand who owns AWS bills. Run full first-business
and enterprise procurement review; remove claims unsupported by evidence.

**Acceptance:** technical R4 gate plus documented delivery/support capacity and
paid-pilot evidence; no claim that profitability is guaranteed. Marketing spend
requires a functioning measured funnel and separate owner-approved budget.
**Evidence/recovery:** release decision and current known limits; pause new
enterprise onboarding rather than oversell unmet controls or response commitments.
