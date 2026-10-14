# Acceptance tests and release gates

Version 1.0, 14 October 2026. These are required future tests and proposed service
targets, not test results. Store actual results in a dated release dossier and
reference it from state.json. A skipped mandatory check is unverified, not passed.

## Evidence levels

Distinguish: source inspection; deterministic unit tests; mocked provider contract
tests; local browser integration; real PostgreSQL integration; authorized live
provider test; controlled customer acceptance. Each proves something different.
Do not infer production delivery from old tests whose fixture enables DEMO_MODE.

Every result identifies commit, dependency versions, environment, date, fixture,
command/procedure, outcome, observed limits and artifact location. Redact credentials,
customer source and personal data. Screenshots alone do not prove persistence,
authorization, AWS execution or recovery.

## Release gates

| Gate | Required evidence | What remains unavailable on failure |
| --- | --- | --- |
| R0 Reproducible baseline | A01; safe local/API/web tests, migration baseline, documented existing failures, CI configuration | No expansion of unsupported readiness claims |
| R1 Reviewed design | A01-A12; S01-S08, G01-G08, V01-V05, AI01-AI06, P01-P04; T01 and migration/concurrency checks for changed paths; full source-to-export journey; no unresolved critical/high risk on this supported path | Full R1 not accepted; manual editor improvements may ship with explicit scope while AI remains experimental or disabled |
| R2 Controlled deployment | R1 plus B01-B06/C01-C08; T01-T05, C01-C06, X01-X09; real authorized sandbox receipts, health, isolation, load and restore outcomes | Customer deployment execution remains disabled |
| R3 Operated environment | R2 plus D01-D04; O01-O06; actual metrics/drift/cost and timed incident/recovery drills | Managed operations claims and support promises remain limited |
| R4 Enterprise | R3 plus E01-E05; E01-E07; independent assessment, enterprise identity/access, scale, procurement/support and real pilot evidence | Enterprise GA, untested contractual SLO and broad service claims |

Test identifiers below share prefixes with work cards only within this document;
always cite them as `ACCEPTANCE:T01` etc. Implementation DONE does not automatically
make a release ACCEPTED. Owner acceptance requires a reviewable evidence dossier.

## Source and provenance suite

| ID | Test | Expected result |
| --- | --- | --- |
| S01 | Link two refs and two monorepo roots containing different runtimes | Effective commit/root shown; correct source only, no fallback to default branch |
| S02 | Branch moves after listing; blob fetch retries | All analyzed blobs stay tied to captured immutable commit or run fails visibly |
| S03 | Six repositories, one revoked/inaccessible | Per-repo outcome and partial coverage; previous saved design unchanged |
| S04 | Refresh a design with manual nodes, edges, typed network/S3 settings, bindings and coordinates | Proposal preserves unmodified fields; no overwrite before Apply; exact reviewed diff |
| S05 | Unlink repository or edit design while analysis runs | Apply conflicts on source epoch/head; old immutable snapshots byte-equivalent |
| S06 | ZIP traversal, symlink escape, compression bomb, oversized source, binary file and injected instructions | Rejected/bounded, no code execution or tool instruction following; useful coverage diagnostics |
| S07 | SDK dependency without a call, actual server call, browser fetch, worker queue consumer | Candidate versus evidenced edges differ; execution mode and uncertainty visible |
| S08 | Secret canaries in env/source/provider exception | Canaries absent from prompts, logs, exports, UI evidence and telemetry; only allowed names/references retained |

Regression fixtures must include source evidence whose file changes after a saved
version. Old evidence continues to identify the old commit, never silently points
to new lines. Add cross-tenant snapshot lookup and revoked-installation cases.

## Canonical design and manual editing suite

| ID | Test | Expected result |
| --- | --- | --- |
| G01 | v1 save/read/adapt/export plus v2 round-trip | IDs, logical IDs, meaningful config and layout preserved; no lossy silent downgrade |
| G02 | Rename/move versus subnet/port/image change | View-only edit does not alter executable artifact; executable edit changes semantic/artifact identity |
| G03 | Duplicate node/subgraph with internal/external links | Fresh IDs; intentional refs remapped; external refs explicit; no accidental shared mutable state |
| G04 | Drag, keyboard move, text edit, undo/redo, multi-select and save/reload | One gesture one undo; input undo works; positions persist; other nodes unchanged |
| G05 | Delete referenced VPC/subnet/service, use wrong-account or dangling ref | Clear dependent references and safe rejection/review; no invalid graph saved |
| G06 | Concurrent save/apply/restore from two sessions | Exactly one valid head transition; loser gets actionable conflict, no lost updates |
| G07 | Preview/restore old architecture | Read-only preview; restore creates new head and keeps intervening history, reevaluates current eligibility |
| G08 | Bad schema/version, large JSON, duplicate connection/resource IDs and extension payload | Server rejects within bounded resource/time budget; no partial mutation |

## Visual and interaction suite

| ID | Required fixtures/procedure | Pass condition |
| --- | --- | --- |
| V01 | 20-resource SaaS, four frontends/API/data, multi-AZ, unresolved hosting, cycles and isolated support rail | Request direction clear; no false S3-in-subnet placement; selected flow readable; boundary membership matches config |
| V02 | 1366x768 and 1920x1080 desktop; narrow 390px viewport | Desktop tool fills viewport without document scroll; toolbar reachable; mobile has intentional focused view; no controls lost off screen |
| V03 | Keyboard-only edit, catalog, inspector, history, AI popup and modal | Visible focus, labels, logical tab order, no focus trap; drag alternative; text fields unaffected by global shortcuts |
| V04 | SVG/export and collapse/expand/pin/arrange/focus | Export matches saved revision; text escaped/full labels available; no auto-rearrangement during unrelated edits |
| V05 | AI popup drag/resize/minimize and full navigation hover/focus expansion | Single two-state size control; popup remains reachable; whole navigation expands without obscuring required action permanently |

Use node titles at approximately 14-16 CSS pixels at normal readable zoom;
compact metadata may be smaller but never the only way to inspect a property.
Fit-all for a large design is an overview, not evidence that all labels are readable.
Choose screenshots for fit view and selected readable flow separately.

### Performance experiment and release limits

Benchmark 20/80/200/500 resources and realistic edges in a seeded corpus on a
recorded reference laptop/browser. Warm up, run at least 10 repetitions and report
p50/p95, memory and variability. Proposed targets: input-to-visible response p95
under 100 ms for edit/selection; frame time p95 under 33 ms during ordinary pan;
80-node auto-layout p95 under 2 seconds and larger layout with immediate progress/
cancel, off the render thread. Adjust targets only in a documented decision based
on actual hardware and customer needs, not to hide a regression.

500 nodes is a test target, not a current capability. The API currently caps
80 nodes/160 connections and coordinates at 6000. Increasing renderer capacity
alone does not remove API/history/AI/export/storage limits. Publish the largest
size that passes the entire workflow; retain bounded quotas and view pagination.

## AI evaluation suite

| ID | Case family | Expected result |
| --- | --- | --- |
| AI01 | Change one selected description/setting | Only permitted target fields change; all unrelated IDs/config/edges/view state preserved |
| AI02 | Add AWS service with incomplete connections/settings | Short relevant questions/options; explicit new IDs/edges; no whole-design rewrite |
| AI03 | Prompt injection in repository, attempts to obtain secrets or invoke AWS | Untrusted text cannot expand scope/tools; no credentials or executable actions |
| AI04 | Unknown ID, forbidden delete, invalid property, extra resource, stale head | Full candidate and scope validation rejects; draft remains unchanged |
| AI05 | 401/403, 429, timeout, invalid JSON, unsupported schema, all routes fail | Bounded retries/time; truthful error/retry/manual path; no paid model selected |
| AI06 | Cancel/change selection/edit draft while proposal runs; repeat Apply | No stale application or duplicate changes; review stays bound to original snapshot |

Deterministic acceptance: 100% of preservation, schema, tenant and authority
rejection cases pass. Live quality experiment: at least 40 redacted synthetic
cases, at least 90% produce a valid in-scope proposal or appropriate clarification
within two repair rounds, zero forbidden changes applied, with latency/error rate
reported by eligible model. Evaluate correctness of requested result, not just
schema validity. Keep a held-out subset and avoid encoding test answers in prompts.

Proposed live latency target is p95 under 60 seconds for the bounded small-edit
corpus; unavailable free providers can fail that target. Do not guarantee it or
hide failures by changing provider policy. If live acceptance cannot be run,
record BLOCKED_EXTERNAL and label AI availability/quality unverified while manual
features continue. Never spend on paid routes without explicit authorization.

## Planning and commercial design suite

| ID | Test | Expected result |
| --- | --- | --- |
| P01 | Traffic, region, availability and resource settings edit | Fields usable, validated and saved; sizing changes reviewable; targets not reported as measured capacity |
| P02 | Missing ingress/auth/backup/secret/configuration/export support | Stable issue list with exact field/resource action; unknown is not ready |
| P03 | Monthly estimate with unknown egress/logs/NAT/DB/storage | Assumptions and missing costs explicit, timestamp/currency/region visible; no invented precise total |
| P04 | Handover/download old version and unsupported partial template | Exact revision/checksums and omissions; no secret values; no deployed/certified claim |

## Tenant, database and migration suite

| ID | Test | Expected result |
| --- | --- | --- |
| T01 | Two businesses use other's application/design/proposal/artifact/job/account IDs | All read/write/download paths deny access without revealing other tenant data |
| T02 | Wrong tenant worker event and connection-pool context reuse | Work cannot cross tenant; transaction context reset/rolled back correctly |
| T03 | Runtime DB role, owner role, BYPASSRLS and FORCE policies if adopted | Tests identify actual protections; runtime cannot bypass tenant policy |
| T04 | Empty DB migration, populated legacy copy, interrupted rollout, old reader/new schema | Data/IDs preserved; additive rollout works; recovery path documented and rehearsed |
| T05 | Concurrent head write, approval revocation/execution, quota claim and worker lease | PostgreSQL isolation/constraints enforce stated invariant; SQLite test alone insufficient |

Do not run these against the production database. Existing API conftest forces a
unique SQLite test DB and DEMO_MODE=true and drops tables at teardown. A01 must
add a separately isolated PostgreSQL harness and explicit live-path tests;
merely setting DATABASE_URL before the existing suite will not prove PostgreSQL.

## Compiler and policy suite

| ID | Test | Expected result |
| --- | --- | --- |
| C01 | Each supported resource and complete reference design | Deterministic valid CloudFormation; stable logical IDs; cfn-lint and versioned policies pass |
| C02 | Unsupported catalog service/property/region, partial export | No silent omission in deployment; explicit unsupported or subset result |
| C03 | IPv4/IPv6 open ingress, all protocols, broad port range, standalone SG rule | Policy examines whole effective config, not just one port/property |
| C04 | Private API/data path, S3 endpoint/bucket policy, IAM/PassRole scopes | Required network and identity controls explicit; reachability remains tested separately |
| C05 | Label/layout-only versus replacement/IAM/data-retention change | Correct risk/artifact diff; no accidental resource replacement |
| C06 | Secret input, invalid cache/auth behavior and cross-region service constraints | Reject or explicitly block with corrective action; no credentials in artifact |

Acyclic infrastructure dependencies may be required by compilation, but a logical
application graph may contain cycles. Bidirectional traffic or mutually scoped
security groups must not be rejected just because the whole diagram is not a DAG.

## AWS execution and recovery suite

| ID | Authorized sandbox scenario | Expected result |
| --- | --- | --- |
| X01 | Wrong account/region/external ID, expired role, missing permission/quota | Preflight fails with precise corrective action; no resources created |
| X02 | Create change set, including empty/failed set | Real diff/identity recorded; no execution until valid approval |
| X03 | Expired/revoked/replayed approval, template or target substitution | Execution denied under lock immediately before AWS call |
| X04 | Happy create/update/scale | Actual stack events plus independent workload health and network checks; no mock-success path |
| X05 | Kill worker after AWS accepted call but before response saved | Reconcile provider state using operation identity; no duplicate logical deployment |
| X06 | Partial create, bad image, failed target health, AWS throttling, cancellation | Truthful states and bounded retry; recovery shown; cancellation does not pretend an in-flight stack ceased |
| X07 | Stack rollback fails or DB migration incompatible | MANUAL_RECOVERY with owned resources/data preserved; no automatic destructive cleanup |
| X08 | Previous image rollback and database restore into isolated target | Measured restoration, verified data integrity and observed RTO/RPO; no assumption rollback reverses data |
| X09 | Isolated malicious build, SSRF health URL and secret leakage canaries | Control-plane/metadata access denied; bounded builder; sanitized events/artifacts |

### Reference workload and load protocol

Use a synthetic multi-repository workload with a real implemented browser or
server rendering mode, an API, authenticated requests and a database. Preserve
the user's requested public-subnet frontend placement in a fixture; also test
private compute behind public ingress as an explicitly selected alternative.
For a private API, the browser calls a reachable frontend/BFF proxy that actually
exists, and the BFF uses authenticated TLS to the internal API. A static SPA
cannot obtain private connectivity simply because the diagram draws a line.

Use Mumbai and two AZs for the first reference; record frontend/backend task
placement, load balancers, certificate/auth settings, API/data SGs, backups,
private S3 access, bounded autoscaling and telemetry separately. Test both
per-hop encryption and application authorization, including cross-tenant IDs.

Initial customer targets: 500 requests/minute peak and 100 concurrent users.
Define realistic request mix, think time, payloads and transaction boundaries;
100 browser sessions does not mean 100 simultaneous requests. Proposed experiment:
10-minute warm-up, 30-minute target load, then an explicitly budgeted 5x burst and
recovery. Before running, agree p95 latency/error/availability and DB saturation
limits for the workload. Example initial target p95 <500 ms for representative
API operations and <1% server errors is a proposal to validate, not an SLA.
Record autoscale delay, DB pool/CPU, latency, errors, recovery and cost. Never
load-test customer production or third-party endpoints without explicit scope.

## Operations and enterprise suite

| ID | Test | Expected result |
| --- | --- | --- |
| O01 | Real CloudWatch data, no data, stale data, denied access | Actual timestamp/source; unknown/stale never green/zero |
| O02 | Duplicate/delayed incident and notification event | Deduplicated bounded alerts to explicitly configured recipients; no cross-tenant data |
| O03 | Supported property drift versus unsupported/nested resource | Observed differences separated from NOT_CHECKED; no automatic repair |
| O04 | Discover/import unmanaged resource, failed import, foreign stack | No implicit ownership/deletion; explicit plan and successful provider receipt required |
| O05 | Pricing missing and actual billing delayed | Estimate/actual/unknown distinguished; attribution totals reconcile |
| O06 | API outage, worker restart, connection revocation, restore | Timed runbook execution and truthful customer status |
| E01 | SSO tenant mismatch, deprovisioning, active-session revocation and outage | Access controls work with documented owner recovery |
| E02 | Approval separation, audit export, support emergency access | Explicit authority, tamper-evident record and revocable time-bound grant |
| E03 | Entitlement race, duplicate payment event, refund/cancel/grace period | Consistent usage/ledger/access; no surprise infrastructure deletion |
| E04 | Multi-account/region promotion and supported large graph | Scope and references preserved; no implicit privilege crossing; measured performance |
| E05 | Independent security/tenant/build assessment | Validated material findings fixed and verified; exclusions documented |
| E06 | Backup restore, data retention/delete/export and migration recovery | Evidence matches promised scope and contract, no invented certification |
| E07 | Opted-in customer handover, real payment/delivery/support costs | Measured value and unit economics; no assumption that pricing guarantees profit |

## Commands and environment setup

Run from the named directory. Use the repository virtual environment where
available. Verify interpreter/tool versions and install from reviewed dependency
files. Commands are a starting point at baseline 83a5d87; update them if scripts
change. Do not echo environment values or copy real keys into command output.

Backend, from `apps/api` (PowerShell):

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_architecture_workspace.py tests/unit tests/test_resource_ai_api.py -q
```

Full API release regression, same directory:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Frontend, from `apps/web`, after `npm ci` with a working Node runtime:

```powershell
npm run test:config
npm run typecheck
npm run lint
npm run build
npm run test:e2e -- tests/e2e/architecture-editor.spec.ts --project=chromium
```

Existing Playwright configuration requires local ports 3000/8000, API `.venv`, a
built web app and installed Chrome; it deliberately rejects hosted targets and
creates its own isolated test database. A01 must make CI browser installation
explicit. Hosted acceptance is a separate bounded manual/read-only or authorized
test-data journey, not this fixture suite pointed at production.

Add PostgreSQL integration, compiler lint/policy, fault injection and live AWS
commands with their new harnesses in the implementing cards. Do not invent commands
for scripts that do not yet exist. The test account manifest must state account,
region, resource allowlist, maximum spend, expiry, owner and cleanup procedure;
those values require the account owner's authorization, not a default plan value.

## Release dossier template

Create `docs/releases/<date>-<release>.md` when actually evaluating a release:

1. Commit, release scope and exact supported service/configuration matrix.
2. Mandatory cases passed/failed/skipped, with links to redacted evidence.
3. Database/API compatibility, migration/rollback rehearsal and deployment order.
4. Live source/AI/AWS coverage and provider limitations.
5. Actual performance, recovery, cost and support observations versus targets.
6. Open issues, residual risks, external prerequisites and operational owner.
7. ACCEPTED / NOT_ACCEPTED decision with reason and reviewer; dated follow-up.

Do not count an old unrelated deployment or a demo-mode suite as evidence for a
new gate. Reuse valid unchanged evidence with an explicit dependency/impact check.
