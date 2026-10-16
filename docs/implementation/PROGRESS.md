# LaunchComply — your requests and implementation progress

Updated: **16 October 2026**. This is the visible checklist for our ongoing work.

**Rule:** Keep every request. When work is implemented and verified, mark it
**[x] ~~Done~~** and retain its evidence. Never delete it to make the backlog shorter.
An existing screen or a successful build alone does not make a whole request done.

**Current work:** A01 and A02 are complete. A03 is in progress: the unified design
format and compatibility boundary. Its read-only inspector/export is implemented;
native writes and mixed-version editor migration remain. No release gate has
been accepted yet.

## Completed and verified

- [x] ~~Create a durable implementation plan that another model can continue.~~
  [35 work packages](WORK_PACKAGES.md), contracts, acceptance criteria and saved state.
- [x] ~~Dashboard with a world map and “Deploy application” action.~~
  Select regions, zoom/pan/reset, inspect saved availability/AZs and designed
  connections, open the matching architecture, and enter deployment preparation.
  Commit `6b422bc`; four desktop/mobile browser journeys passed. Live telemetry
  is a separate pending request below.
- [x] ~~Establish reproducible API, browser and PostgreSQL baseline checks.~~
  CI for `97918cc` passed API, browser and PostgreSQL jobs. Includes populated
  migration rehearsal, tenant isolation, version persistence and real database
  locking. [CI evidence](https://github.com/vinayaksilswal/LaunchComply/actions/runs/38552779669).
- [x] ~~Fix the PostgreSQL schema mismatches found by the new baseline.~~
  Forward migration preserves unique experiment names and recorded UTC timestamps.
  Commit `97918cc`; local migration tests and PostgreSQL CI passed.
- [x] ~~Show this plan beside the chat and retain completed work with strikethrough.~~
  This file is the customer-visible progress record; machine state remains in
  [state.json](state.json).

## Current system review

[Code-path review, remaining gaps and exact next steps](2026-10-14-system-review.md).
Workspace state protects history during repository-link changes. Conversations,
proposals, references and approvals are separate from saved diagram JSON. Source
refresh is reviewed before Apply, preserving customer configuration and layout.

- [x] ~~Add and verify the separate workspace-state database foundation.~~
  Migration preserves stored JSON/IDs/timestamps; tenant and environment references,
  uniqueness and concurrent initialization verified in PostgreSQL. API, browser
  and PostgreSQL CI passed at `129a575`.
- [x] ~~Preserve saved versions when repositories are added or removed.~~
  Current eligibility uses source epochs; historical JSON and timestamps remain
  unchanged. API, PostgreSQL concurrency and browser CI passed at `8cdf0f3`.
  [Evidence](2026-10-15-source-history.md).
- [x] ~~Separate conversations, proposals, references and approvals from saved design JSON.~~
  Legacy metadata remains readable; new snapshots keep activity in separate
  version records. API, PostgreSQL and browser CI passed at `1085c2b`.
  [Activity evidence](2026-10-16-version-activity.md).
- [x] ~~Review, apply or discard source refreshes without losing manual changes.~~
  Final API, PostgreSQL concurrency and browser CI passed at `66451d8`.
  [Refresh evidence](2026-10-16-reviewed-refresh.md).

- [x] ~~Canonical design reader, stable identities and saved-design inspector/export.~~
  Commit `b53fe2a`; local checks and final API, PostgreSQL and browser CI passed.
  Native saves and the full editor cutover remain part of A03. [Reader evidence](2026-10-16-canonical-reader.md).

## Your requested product direction

- [ ] **Bring existing software:** customers connect production-ready websites
  or custom applications; LaunchComply designs, deploys and operates them on AWS.
- [ ] **Useful AI assistance:** understand source evidence, ask necessary
  questions and propose exact reviewed architecture changes without replacing
  unrelated customer decisions.
- [ ] **Simple customer journey:** connect repositories, resolve requirements,
  review architecture/security/costs, approve a deployment, verify health and
  operate it. Clearly identify unsupported workloads and missing prerequisites.
- [ ] **Affordable, sustainable service:** define platform fees, recurring support,
  infrastructure charges and AI usage limits before advertising a price.
- [ ] **Market positioning and conversion:** apply the supplied research, explain
  concrete deliverables and test the inquiry-to-paying-customer journey.
- [ ] **Readiness for first paying customers:** prove a supported end-to-end
  delivery on a test customer before claiming broader enterprise readiness.

Clarification retained: an earlier interpretation was that our team would build
new websites/custom applications around customer business needs, with business
AI features. The user clarified that customers bring their software and the
platform deploys it securely. That interpretation is **superseded, not completed**.
No promise of profitability, certification or an untested deployment is implied.

## Architecture and source-code requests

Some controls already exist. Items remain open until the complete requested
workflow is verified; this list does not mean every item must be rebuilt.

- [ ] Connect several GitHub repositories to one business asset; add and remove
  repositories, preserving unrelated work and version history.
- [ ] Respect selected branches and monorepo folders; record exact inspected commits.
- [ ] Identify frontends, backend APIs, data stores, dependencies and actual
  connection evidence; distinguish inference from confirmed connections.
- [ ] Use environment-variable names and secure secret references to help map
  connections; keep raw secrets out of diagrams, model prompts and logs.
- [ ] One unified professional architecture view, guided by the supplied AWS,
  GCP and PeopleStrong examples; clear request paths and readable labels.
- [ ] Editable AWS VPC/subnet settings, public frontend placement, private backend
  and database placement, and explicit secure ingress/server-side paths.
- [ ] Private storage access: model S3 outside subnet boundaries with private
  access controls/endpoints where applicable; never falsely place S3 in a subnet.
- [ ] Explain browser-to-API versus server-to-API traffic; no direct public backend
  compute exposure implied by a diagram line, and WAF is not a private connection.
- [ ] Availability zones, multi-region options, load balancers, autoscaling,
  recovery and traffic settings. Saved targets: Mumbai, 500 requests/minute,
  100 concurrent users; capacity still requires measurement.
- [ ] Monitoring, CloudWatch, build and image services separated from the default
  request flow while remaining inspectable.
- [ ] Drag, move, resize, connect, disconnect, edit and delete components; preserve
  positions and configuration through save/reload.
- [ ] Undo/redo, Ctrl+Z and reliable recovery of accidental edits.
- [ ] Saved architecture history, preview and restore as a new version.
- [x] ~~Refresh source findings without replacing manual work or rewriting history.~~
  A02 verified with manual VPC/storage configuration, connections, bindings and
  positions; API, PostgreSQL and browser [evidence](2026-10-16-reviewed-refresh.md).
- [ ] Broad searchable AWS service catalog, properties, implementation guidance
  and guided additions; clearly distinguish drawable from deployable services.
- [ ] Readable large diagrams, compact toolbars, usable zoom/focus and exports.
- [ ] Full sidebar expansion on hover; compact icon rail when collapsed.
- [ ] Movable floating AI window, with one minimize/restore control and usable sizing.

## AI architect requests

- [ ] LangGraph/LangChain workflow that uses repository evidence and saved settings.
- [ ] Edit only the components/options the customer requested; preserve all others.
- [ ] Preview exact proposed changes; validate them before the customer applies them.
- [ ] Ask focused questions with selectable or typed answers when connections,
  hosting or configuration are uncertain.
- [ ] Free-model routing and fallback on errors, with no silent paid fallback.
- [ ] Actionable failures, retry/cancel controls and measured quality evaluations.
- [ ] Clear assistant presentation and persistent, version-linked conversation context.

## Deployment and operations requests

- [ ] Safe AWS connection with narrowly scoped roles and tenant authorization.
- [ ] Compile supported designs into reproducible deployment artifacts.
- [ ] Review actual AWS changes, costs/assumptions and risks before approval.
- [ ] Deploy the exact approved artifact; survive retries/restarts without duplicate work.
- [ ] Build and release frontend/backend code with health checks and rollback.
- [ ] Real monitoring, availability, accessibility and connection observations on
  the dashboard map, with freshness and source coverage.
- [ ] Security findings, drift detection, backup/recovery and operational actions.
- [ ] Cost visibility, budgets and usage controls for an affordable service.

## Dashboard and customer-management requests

- [ ] Direct navigation to the relevant workspace; remove unnecessary intermediary pages.
- [ ] Consistent “My business assets” and “Business architecture” naming.
- [ ] Separate Security and Compliance tabs with working, relevant actions.
- [ ] Compliance readiness percentage and remaining tasks based on actual evidence;
  readiness is not certification. Submit the appropriate review request when ready.
- [ ] Central Service requests page: service cards, detail window, apply action,
  request history, customer status, replies and delivered reports.
- [ ] Remove duplicate service-promotion panels elsewhere; keep operator delivery
  controls in administration and customers' own status/reports accessible.
- [ ] Add/remove team members, inspect contact details and enforce role permissions.
- [ ] Clear Settings, Team, Support and existing Service requests navigation;
  logout returns to the landing page.
- [ ] Fix form interaction blockers; every relevant page has usable input, save,
  error/retry and basic management controls.
- [ ] Ensure tested changes reach the intended production frontend and backend;
  a Git push alone is not production verification.

## Engineering work packages

The checklist below follows the implementation plan. Each package has detailed
steps and acceptance criteria in [WORK_PACKAGES.md](WORK_PACKAGES.md). Completing
one package does not automatically complete every customer request it supports.

<!-- work-packages:start -->
- [x] ~~A01 — Reproducible baseline and regression fixtures~~ — Done; verified in CI.
- [x] ~~A02 — Preserve saved work and immutable history~~ — Done; migration, activity separation, reviewed refresh and concurrency/browser checks passed.
- [ ] **A03 — Canonical design v2 and compatibility** — In progress. Reader/adapter and inspector/export implemented; native write and mixed-version cutover remain.
- [ ] **A04 — Effective GitHub refs, roots and snapshots**
- [ ] **A05 — Evidence-backed workloads and connections**
- [ ] **A06 — Editor commands and manual controls**
- [ ] **A07 — Measured layout and renderer decision**
- [ ] **A08 — Professional hierarchy and accessible workspace**
- [ ] **A09 — Typed scoped AI and guided service addition**
- [ ] **A10 — AI reliability, free routing and evaluations**
- [ ] **A11 — Readiness, load targets and cost assumptions**
- [ ] **A12 — Versioned handover and R1 decision**
- [ ] **B01 — Resource registry and capability levels**
- [ ] **B02 — Ingress and network attachments**
- [ ] **B03 — Container workloads, images and IAM**
- [ ] **B04 — Persistent data and secret contracts**
- [ ] **B05 — Autoscaling, queues and health signals**
- [ ] **B06 — Edge services and complete reference compiler**
- [ ] **C01 — Tenant and deployment authorization**
- [ ] **C02 — Durable jobs, outbox and restart safety**
- [ ] **C03 — Artifacts and AWS target preflight**
- [ ] **C04 — Actual CloudFormation change-set plans**
- [ ] **C05 — Exact approvals and execution permissions**
- [ ] **C06 — Execution, reconciliation and health**
- [ ] **C07 — Isolated builds and recovery procedures**
- [ ] **C08 — Sandbox matrix and controlled R2 pilot**
- [ ] **D01 — Observed health, telemetry and alerts**
- [ ] **D02 — Drift, ownership and safe import**
- [ ] **D03 — Cost visibility, budgets and metering**
- [ ] **D04 — Operations runbooks and R3 acceptance**
- [ ] **E01 — Metered entitlements and paid design pilot**
- [ ] **E02 — Enterprise identity, access and audit**
- [ ] **E03 — Enterprise scale, accounts and advanced patterns**
- [ ] **E04 — Independent security and recovery acceptance**
- [ ] **E05 — Delivery, support capacity and R4 decision**
<!-- work-packages:end -->

## How this stays current

1. Add new user requests here without deleting earlier ones.
2. Mark the active work package in progress in `state.json`.
3. Record actual tests and delivery limits in a dated evidence report.
4. Only then use `[x] ~~Completed request~~` here and mark the package DONE.
5. If a regression is found, reopen the item with the reason and retain the old evidence.
6. Keep this file open in the side panel during development sessions.

Unrelated HRMS CORS debugging remains outside the current implementation scope.
Customer credentials and pasted API keys are intentionally excluded from this plan.
