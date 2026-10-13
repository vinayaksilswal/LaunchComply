# Enterprise development backlog and implementation history

Last updated 2026-10-13. Re-read current source and runtime evidence before changing
status. Historical GA documents and simulated service paths are not acceptance.

## Current baseline

- Next.js/React designer and FastAPI/PostgreSQL tenancy/version APIs already exist.
- Multiple repository links, bounded source evidence, editable saved graphs,
  traffic/availability policies, public frontend/private API planning, undo/redo,
  history, centralized service requests and separate security/compliance exist.
- LangGraph/LangChain proposals use server-owned scopes, compact operations,
  exact review, Apply/Discard, revision receipts, role preservation and free routing.
- Mumbai catalog snapshot covers 264 CloudFormation families / 1,748 types;
  broad visual coverage does not imply configurable/deployable coverage.
- Canonical graphs remain capped at 80 nodes / 160 flows. Current editor rendering
  and heuristic boundaries do not support arbitrary thousand-resource environments.
- Existing infrastructure compiler/templates use a separate profile-based model;
  they are not a verified compiler for the customer's edited diagram. Existing
  worker/orchestrator paths include simulation and in-memory locks. Hosted real
  provisioning remains gated; do not wire these paths to the canvas as deployment.
- No independent enterprise security/tenant acceptance, paid customer delivery,
  live AWS provisioning/recovery rehearsal, or certification has been established.

## Implementation history

| Date | Delivered | Evidence and limits |
| --- | --- | --- |
| 2026-10-12 | Scoped AI operations, full change review, broad catalog, manual connection editing | Live v15 changed only CloudWatch's description; IDs, positions and ordered flows preserved. 80/160 graph limit retained. |
| 2026-10-13 | Resource property schema v1, four typed AWS definitions, deterministic CloudFormation export, empty first design and property comparisons in History | 50 focused tests, frontend checks, four representative plus production-downloaded template cfn-lint validations. Live v16 S3 configuration persisted while all v15 graph/evidence/targets remained unchanged. Whole-diagram export correctly blocked; explicit subset identified 14 omitted components. No AWS provisioning; see RESOURCE_CONFIGURATION.md for exact coverage. |
| 2026-10-13 | Fifteen typed resources with network/security definitions, private S3 endpoint, reviewed selected-resource AI property patches and catalog capability filter | Full isolated backend suite passes; browser manual rule validation/save and exact 24-resource export verified locally. Template passes cfn-lint for Mumbai. Model fallbacks tested with mocked providers; no live model or AWS acceptance claimed. |

## Prioritized work

| Priority | Capability | Next engineering step / acceptance |
| --- | --- | --- |
| P0 | Deployable application resource model | Network routes/gateways/SG rules/S3 gateway endpoint now have explicit definitions. Next: certificates, ALBs/target groups, ECS task/service/image/IAM, database/cache. Require actual runtime inputs, health checks, IAM and tenant acceptance before workload deployment. |
| P0 | Real AWS execution workflow | Connect exact versioned artifact to read-only AWS template validation and change-set planning. Persist account/environment, plan hash, approvals and expiry; no AI-triggered apply. Add least-privilege cross-account role, external ID, durable queue, DB deployment lock/idempotency and restart reconciliation before execution. |
| P0 | Independent acceptance | Real PostgreSQL races, tenant/role isolation, secret handling, migration parity, policy checks, safe error logs and recovery tests. Owner-approved sandbox plan/apply/health/drift/replacement recovery before any deployable badge. |
| P1 | Typed topology and groups | Versioned accounts, regions, VPC/subnet parents and edge semantics (HTTP/dependency/telemetry/association). Replace placement heuristics with validated parent-child identities; backwards migration and round-trip tests. |
| P1 | Property-aware AI patches | Selected-existing-resource EDIT patches, typed validation, exact field review, stale fingerprint protection, apply/discard/restore are implemented. Next: explicit new-resource configuration operations, dependency/replacement analysis from AWS change sets and live model quality acceptance. |
| P1 | Large diagram interaction | Multi-select, duplicate/copy/paste, alignment, minimap, pan/zoom model, viewport culling, collapsible/nested groups; benchmark real dense graphs before raising caps. |
| P1 | Import and discovery | Bounded CloudFormation/Terraform import, authorized AWS discovery and ownership classification. Never treat imported/discovered resources as managed or apply changes automatically. |
| P1 | Runtime operations | Resource state sync, real CloudWatch evidence, durable notifications, drift detection, costs with actual pricing/usage, alerts and backup restore acceptance. |
| P1 | Review/collaboration | Organization environment protections, persisted approval policy, architecture access controls and conflict handling. |
| P2 | Broader service configurations | Maintain provider schemas, service capability matrix, supported fields/defaults, regional availability and documentation; do not expose arbitrary secret JSON. |
| P2 | Commercial customer journey | Real onboarding, billing reconciliation, support SLAs, trusted email, operator access and first controlled customer acceptance. Preserve existing centralized service workflow and accurate product claims. |

## External acceptance prerequisites

An explicitly authorized AWS sandbox account, cross-account role permissions,
reviewed budget and cleanup/recovery plan are required for controlled provisioning.
The currently saved Mumbai targets (500 peak requests/minute, 100 concurrent
users, multi-AZ) are demand goals, not benchmarked workload capacity. Container
images, ports/health checks, authenticated proxy behavior, certificates, task IAM,
tenant isolation, database budgets and tested backup/recovery remain necessary.

Next sessions should take a complete vertical capability from this list, record
the checks actually run, and preserve existing business designs and workflows.
