# LaunchComply architecture implementation programme

Plan version: 1.0. Date: 14 October 2026 (Asia/Calcutta).
Audited code baseline: `83a5d87`. This document is a plan, not a readiness certificate.

## Start here

Open [your requests and visible progress checklist](PROGRESS.md) alongside the
workspace. Keep completed requests checked and struck through, never deleted.

This is the implementation entry point for subsequent development sessions,
including GPT-6.1 Sol sessions. Read [continuation instructions](CONTINUE.md),
[execution state](state.json), and the next eligible card in
[work packages](WORK_PACKAGES.md). Implement one complete, tested vertical slice
at a time. Do not restart the platform or repeat completed work.

Supporting contracts:

- [Current state and research corrections](RESEARCH_AND_BASELINE.md)
- [Architecture, data and API contracts](CONTRACTS.md)
- [Acceptance tests and release gates](ACCEPTANCE.md)
- [Ordered implementation cards](WORK_PACKAGES.md)
- [Session handoff and execution rules](CONTINUE.md)
- [Machine-readable progress](state.json)
- [Plan validation record](PLAN_VALIDATION.md)

The existing [development backlog](../ENTERPRISE_DEVELOPMENT_BACKLOG.md) retains
historical delivery evidence. This programme takes precedence for *future work
ordering*. Current user instructions always override documents. Dates below are
planning windows, not promises that external acceptance or enterprise readiness
can be achieved in seven days.

## Product outcome

Updated customer direction, 14 October 2026: serve new and mid-sized businesses
that need websites or custom applications built around their operations, with
useful AI features and ongoing hosting/support. The delivery model (team-delivered,
self-service or both) awaits the user's preference. Track the customer journey
and every prior request in PROGRESS.md. The engineering foundation below supports
that service; customers should not need to understand AWS to describe their needs.

The architecture workspace helps a SaaS team or delivery agency connect its repositories,
understand its services and dependencies, create an editable AWS design, review
its security/cost/availability tradeoffs, and manage approved changes in its own
AWS account. The product must answer:

1. What does my code actually contain, and what is still uncertain?
2. Where will each workload run and how will requests reach it?
3. What will change, cost money, or risk data when I deploy this version?
4. What is actually running, unhealthy or different from the saved design?
5. How can I fix that safely, manually or with an AI proposal?

The original technical user segment was agencies and small B2B SaaS teams with several
frontend/backend repositories and limited AWS operations capacity. Large,
regulated enterprises are a later segment requiring independently demonstrated
isolation, recovery, governance and support. The visual reference is a quality
target for clarity; it is not a mandate to add EKS, transit gateways or duplicate
databases to every startup.

## What people can pay for

Sell a concrete outcome at each release level. Keep infrastructure ownership and
AWS charges with the customer. Never imply that a small platform subscription
includes AWS infrastructure, unlimited engineering or compliance certification.

| Release | Customer receives | Claim permitted only after its gate |
| --- | --- | --- |
| R1 Reviewed design | Evidence-linked multi-repository service map, editable AWS proposal, unresolved decisions, versioned export and an optional human review | Architecture planning and reviewed handover |
| R2 Controlled deployment | Approved exact plan, managed deployment into a supported customer account, health verification, recorded recovery procedure | Supported workload deployment within the tested matrix |
| R3 Operated environment | Actual health, drift, costs, alerts and safe update/rollback workflow | Managed visibility and changes with stated freshness/support scope |
| R4 Enterprise | SSO, stronger access governance, audit export, multi-account ownership, recovery exercises, security/procurement evidence | Only the tested enterprise controls and contracted service level |

### Pricing and unit economics hypotheses

These are experiments to validate with paying design partners, not researched
market prices or published offers. Start with owner-approved quotes through the
existing service request/payment workflow, then introduce subscriptions once
metering and billing reconciliation pass.

- Planning hypothesis: INR 1,499/month, 3 business assets, 6 linked repositories
  per asset under the current cap, 30 bounded AI proposals/month, exports/history,
  asynchronous product support. No included architecture consulting.
- Operations hypothesis after R3: INR 4,999/month for a bounded number of managed
  environments and polling budgets, with additional environments priced from
  measured cost. No 24/7 response commitment by default.
- Assisted review/launch: a separately scoped fixed quote based on delivery
  hours, complexity and acceptance criteria; a possible initial review experiment
  is INR 4,999 for at most two engineer hours. Deployment work is separately quoted.
- Enterprise: discovery and contract, no low flat price for unlimited accounts,
  custom IAM, on-call coverage or regulated workloads.

Contribution per customer = collected revenue minus refunds/payment fees,
attributable compute/storage, AI/provider charges, AWS API/telemetry handling,
support labour and service delivery labour. Exclude customer AWS charges from
platform revenue. Example only: INR 1,499 revenue less INR 45 fees, INR 150 model
budget, INR 120 allocated hosting and INR 250 support labour leaves INR 934
contribution (62.3%) before fixed costs and taxes. Replace every input with actual
data. If free models fail, queue/retry or allow manual editing; never silently
spend on paid models. Avoid promising AI availability from a free-only route.

Proposed business acceptance: recruit 3-5 explicitly opted-in design partners;
at least 3 complete a reviewed design, 2 buy an explicitly scoped deliverable,
and support time and contribution are measured before scaling acquisition.
Targets are experiments, not predicted conversion rates. Do not buy ads before
the intended funnel and support capacity pass the relevant release gate.

## Current state and first priorities

Existing strengths: real GitHub App authorization, bounded read-only inspection,
six repository links per asset, editable SVG canvas, 80-node/160-flow limits,
undo/history, scoped LangGraph proposals and explicit review, broad AWS catalog,
15 typed foundation resources, deterministic subset CloudFormation export,
configured network projection, business/team/service workflows.

Immediate preservation gaps found by source inspection:

1. Source re-analysis constructs a fresh graph and does not carry forward typed
   resource configuration. A source refresh must become a reviewable proposal.
2. Repository changes mutate old architecture rows to invalidate approvals.
   Historical design snapshots must remain immutable; current authorization and
   freshness must be evaluated separately.
3. Inspection resolves `Repository.default_branch`, while the linking model has
   branch/root fields. The chosen branch and monorepo root must actually be used.
4. Dependency presence and sampled source are insufficient proof of runtime
   calls, frontend execution mode or tenant isolation.
5. There is no accepted end-to-end customer workload deployment. Old provisioning,
   drift and observability modules contain simulation and cannot be enabled as-is.

These are upstream of more icons or a new canvas library. Preserve customer data
first, then establish one canonical design contract, then extend rendering and
deployable workloads against that contract.

## Seven working-day focus

Day 1 means the first implementation day after this plan; it need not be today.
Each day may span several sessions. Move unfinished work forward instead of
marking it complete at midnight. The first week targets R1 quality, not R4.

| Day | Primary cards | Observable result |
| --- | --- | --- |
| 1 | A01, A02 | Reproducible baseline, fixtures, source refresh cannot erase a saved design, immutable history protection |
| 2 | A03, A04 | Versioned contract/compatibility adapter; branch/root selections are effective and provenance is explicit |
| 3 | A05 | Frontend/server/API/worker and connections have evidence/confidence, with a short unresolved-question workflow |
| 4 | A06, A07 | Editor state separated from domain state; manual edits/undo/selection survive round trips; measured layout spike |
| 5 | A08 | Readable hierarchy and focus for supported graph sizes; durable collapse/layout state and usable inspector |
| 6 | A09, A10 | Scoped AI handles typed edits/questions with exact diff; regression corpus demonstrates preservation |
| 7 | A11, A12 | Honest blockers, versioned handover bundle, complete repository-to-review journey and documented R1 decision |

If A02-A05 exceed the window, ship their accepted improvements and continue the
same order. Never sacrifice history safety or evidence accuracy for the calendar.
Optional parallel implementation requires separate file ownership and compatible
contracts; it is not required for this plan to work on one model/session.

## Later milestones, ordered by dependency

| Milestone | Cards | Exit result |
| --- | --- | --- |
| M2 Workload compiler | B01-B06 | Private API + frontend/BFF + persistent data reference application fully specified, compiled and statically checked |
| M3 Execution foundation | C01-C05 | Tenant-bound AWS target, durable jobs, exact artifacts, read-only preflight, real change-set review, human approval |
| M4 Sandbox deployment | C06-C08 | Create/update/failure/restart/recovery verified in an authorized sandbox and one controlled customer pilot |
| M5 Operations | D01-D04 | Observed health, bounded drift, costs and import preview with ownership safeguards |
| M6 Commercial/enterprise | E01-E05 | Metered economics, repeatable customer delivery, independent isolation/recovery/security evidence and enterprise governance |

Use gates rather than estimated story points as the release authority. After R1,
re-estimate workload using observed throughput and customer priorities. This is
several milestones of engineering and operations; it is not a seven-day claim to
support every AWS service or every enterprise architecture.

## Target experience

One workspace, one saved design, several views of the same data:

- **Source**: repositories, effective refs/roots, snapshot age, analysis coverage,
  workload detections, evidence and unresolved links.
- **Architecture**: main canvas, compact toolbar, collapsible navigation that
  expands as a whole on hover/focus, search, left catalog, selected-resource
  inspector. AI is a draggable/resizable window with one expand/minimize toggle.
- **Settings**: region/account/environment, traffic/availability, routing,
  source/environment bindings and secret *references*. Contextual fields are
  editable and validated; errors identify the field and corrective action.
- **Review**: exact manual/AI/source diff, cost deltas, configuration blockers,
  approvals and history. No action silently rearranges or replaces the full design.
- **Deploy / Operate**: artifact/change-set status, events, real health/drift and
  recovery actions for the same selected asset and environment.

Use one or two clicks to reach common actions: select node -> edit; History ->
preview/restore; AWS service -> configure/add; issue -> affected field. Destructive
or infrastructure-changing work still requires a concrete review. Navigation
must preserve asset/environment context. Existing service requests stay in one
place; customers retain their own status/reports. Security and compliance remain
separate. No marketing panels in the tool, and no unrelated dashboard redesign
within architecture tickets.

## Security and deployment architecture decisions

- CloudFormation is the first deployment backend because the existing compiler
  already emits it. Do not add Terraform/CDK execution in parallel. Terraform
  import/export can follow a supported subset later.
- Keep the Next.js/FastAPI/PostgreSQL control plane. Add a durable PostgreSQL job
  queue/outbox with leased workers first; do not introduce Kubernetes for this
  platform merely to run jobs. Reassess queue technology from measured demand.
- Separate observation, planning and deployment authority. AI never receives AWS
  credentials or an execution tool. Build customer code in a disposable isolated
  builder only after the build pipeline is explicitly supported.
- Read/plan/approve/execute/observe are different state transitions. Bind each
  approval to immutable artifact, source and policy hashes, account, region,
  environment, change-set identity and expiry. Payment is never deployment approval.
- Maintain explicit support levels per service: visual, configurable, exportable,
  account-validated, sandbox-deployed, operationally-supported. A catalog icon
  alone never grants a deployable badge.
- A proposed reference workload uses public ingress, private API/data and verified
  TLS/authentication paths. Respect the user's existing public-subnet frontend
  preference in saved designs; offer private compute behind public ingress as an
  explained alternative, never silently relocate it. See the research corrections.

## Progress and definition of completion

A ticket is done only when its stated behavior, negative tests, migration or
compatibility requirements, UI evidence and operational limits are recorded.
An API stub, empty screen, mocked AWS result or green build is not a delivered
customer capability. `state.json` records implementation and release acceptance
separately. Use BLOCKED_EXTERNAL for an unavailable sandbox or provider and take
the next independent ticket; do not fabricate an external success.

This plan is complete when the work cards, contracts, acceptance gates and
continuation record agree. The platform is complete for a release only when that
release's acceptance gate has evidence. Preserve this distinction in every handoff.
