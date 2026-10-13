# LaunchComply engineering report - 2026-10-13

## A. Initial state and priority

The existing platform had repository inspection, a versioned diagram, bounded
LangGraph/LangChain AI edits, scope/diff review, history, connection editing,
network-placement proposals and a broad AWS catalog. The catalog's 264 families /
1,748 types described visual coverage. It did not provide a typed definition or
deployment implementation for every resource.

The largest immediate gap between drawing and real infrastructure was missing
validated resource properties on the customer's canonical architecture. Separate
profile-based infrastructure templates and simulation paths could not safely be
represented as deployment of the edited diagram. This session prioritized a
complete property-to-version-to-export feature, with explicit bounded coverage.

## B. Completed implementation

- Canonical resource property schema v1, keyed by stable diagram component IDs.
  Four supported definitions: VPC, Subnet, S3 Bucket and CloudWatch Logs LogGroup.
- Strict validation of fields/types, private canonical CIDRs, VPC references,
  subnet containment/overlap, region/AZ spelling and supported log retention.
- Authenticated server schemas, editor-only versioned property saves, and member
  read-only CloudFormation export bound to the current saved revision.
- Deterministic CloudFormation resource IDs and template checksums. Public-IP
  assignment disabled for configured subnets; S3 public access blocked, encryption,
  ownership controls and TLS-only policy. No diagram arrow becomes IAM or routing.
- Resource configuration UI with exact template preview/download, explicit subset
  acknowledgement, omitted components and clear capability limits. Whole-diagram
  export cannot silently skip unsupported/unconfigured cards.
- Empty initial canvas for an existing business asset without repository analysis.
- History counts, property comparisons and restoration using the same canonical
  saved revision. No separate property database or migration was introduced.
- Revision/region guard against late export results; busy inputs cannot switch
  resource or export subset during a save/export.

Primary implementation files:

- `apps/api/app/services/architecture/resource_configuration.py`
- `apps/api/app/api/v1/architecture_workspace.py`
- `apps/api/app/services/architecture/{agent,workspace,edit_scope}.py`
- `apps/web/src/components/architecture/ResourceConfigurationPanel.tsx`
- `apps/web/src/components/architecture/{ArchitectureCanvas,ArchitectureHistory,ArchitectEditScope}.tsx`
- `apps/api/tests/unit/test_resource_{configuration,configuration_handlers,identity_scope}.py`

README/current-reality documentation now separates delivered functionality from
unverified automated deployment, monitoring, recovery and enterprise readiness.

## C. AI and architecture safety

The existing granular AI operation schema, selected-component scope, unrelated
node/coordinate/flow preservation and customer proposal review remain active.
Saved resource properties are supplied as read-only context. AI cannot alter
those properties or retype a surviving configured resource through diagram edits.
Explicit selected removal remains possible; persistence removes only that node's
configuration. A property save invalidates prior design approval and in-flight AI
revision receipts. Older versions remain available through History.

AI property patches are not yet implemented. The interface tells users to use
Resource configuration for infrastructure properties. Description edits are not
represented as actual AWS configuration. No live model call was made this session.

## D. Actual AWS reality

No AWS API or cloud provisioning was executed. Four resource definitions compile
to offline CloudFormation. Retain policies protect against accidental template
deletion/replacement, but retained resources still require deliberate cleanup and
recovery planning. No template deployability badge or runtime health claim is made.

VPC/subnet definitions do not include route tables, gateways, SGs or workloads.
The private S3 definition does not include application IAM grants, a VPC endpoint,
KMS customer keys or backups. Log group configuration does not connect emitters or
create alarms. AWS-generated physical names are used for buckets/log groups.

Actual account/region validation, quotas, permissions, reviewed change sets,
durable execution, health checks, drift and recovery remain outstanding. Controlled
provisioning needs an explicitly authorized sandbox account/role, budget and
cleanup/recovery plan. No AWS spending or deployment authorization was inferred.

## E. Verification and limits

- 50 focused tests passed, zero failed: production pure validators/compiler/scope
  helpers and actual handler/DTO bodies with isolated storage/access adapters.
  These tests do not prove real PostgreSQL locking, full role/tenant acceptance
  or cloud execution. Root database/owner-state fixtures were not loaded.
- Frontend type check, changed-component ESLint and production Next build passed.
- Python architecture/API syntax checks passed.
- Four representative generated templates and the actual production-downloaded
  v16 S3 template passed cfn-lint against Mumbai schemas without errors/warnings.
  The initial literal-AZ lint warning was fixed using an AWS AZ parameter.
- Signed-in production acceptance: v15 to v16 S3 property save; all 15 nodes,
  coordinates, 15 ordered flows, targets and evidence preserved; reload persistence;
  old-version property comparison; whole-export rejection and explicit subset
  preview/download with 14 omitted components.
- Resource modal checked at desktop and 390x844 dimensions without horizontal
  overflow. No full-canvas mobile acceptance or large-diagram benchmark claimed.

The extra late-response guard was checked through type/lint/build verification;
an injected network-race browser rehearsal was not performed. Empty initialization
was exercised in isolated handler tests, not by creating disposable production
business data. No full-repository security audit or complete-suite acceptance was
performed. See RESOURCE_CONFIGURATION.md for reproduction and detailed evidence.

## F. Remaining work

1. Canonical route tables/gateways/endpoints, SG rules, certificates, ALB/targets,
   ECS task/service/image/IAM and database/cache configurations. Require explicit
   runtime inputs and validated references before compiling application workloads.
2. Exact version/hash-bound AWS validation and change-set planning, then approved
   durable execution with cross-account permissions, idempotency and reconciliation.
3. Real database concurrency/tenant isolation and authorized sandbox deployment,
   load, health, replacement, rollback and recovery acceptance.
4. Typed account/region/VPC/subnet ownership, property-aware granular AI patches,
   larger diagram operations, import/discovery, drift and actual observability.

The platform is not yet ready for unrestricted enterprise production deployment.
The persistent continuation plan is ENTERPRISE_DEVELOPMENT_BACKLOG.md.
