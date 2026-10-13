# Network configuration and granular AI engineering report

Date: 13 October 2026. This report records implemented and verified work, not an
enterprise GA declaration or proof of a customer AWS deployment.

## A. Initial State

The saved architecture designer already supported editable graphs, version
history, scoped LangGraph/LangChain proposals, repository evidence, traffic
targets and a 1,748-type Mumbai CloudFormation catalog. Four resource types had
validated property forms and offline export. AI could edit graph attributes but
could not change saved resource properties. Public/private diagram placement was
planning metadata, not an explicit routing or security definition.

This pass prioritized explicit network/security definitions and reviewed property
patches because they are necessary foundations for compiling a customer's actual
design rather than a separate, unrelated profile template.

## B. Completed Implementation

- Expanded the canonical property model from four to fifteen types: route tables,
  associations, internet gateways/attachments, IPv4 routes, Elastic IPs, zonal
  public NAT, security groups, ingress/egress rules and S3 gateway endpoints.
- Added strict typed references, same-VPC checks, duplicate/overlap checks,
  explicit public routing requirements for NAT, bounded port/protocol controls,
  group-only private inbound access and acknowledged public HTTPS egress.
- Compiled real Ref/GetAtt/DependsOn relationships from properties. Diagram arrows
  still do not create routes or grant access. Separate SG rules avoid circular
  group references. Default internet egress is suppressed with AWS's documented
  localhost-only rule. Endpoint policies restrict access to the selected bucket.
- Security-rule removal/replacement uses Delete to revoke obsolete grants;
  foundation/data resources retain protection. Compiler version 2 is included in
  template metadata. No stack update occurs during export or design Apply.
- Added server-driven select/checkbox/numeric forms, a configurable-resource
  catalog category, explicit capability labels and actionable validation feedback.
- Added named, typed AI resource patches for selected existing nodes, exact
  before/after review, property-only pending proposals, Apply/Discard and History
  restoration. Pending review appears first in the floating AI window rather
  than below generic guidance. Unrequested properties and unrelated graph
  content stay intact.
- Corrected transition checks so unchanged legacy gaps do not block an unrelated
  rename or unconnected addition; new/changed request paths remain checked.
- Updated old fixtures to use multi-source evidence identities, scoped edit
  operations, authorized invitations, reviewed service delivery and truthful
  incomplete launch readiness. No runtime security gate was relaxed to pass them.

Key modules: `network_resources.py`, `resource_configuration.py`,
`resource_edits.py`, `agent.py`, `workspace.py`, `proposal_policy.py`,
`response_schema.py`, `architecture_workspace.py`, `ResourcePropertyFields.tsx`,
`ResourceChangeReview.tsx`, `ResourceConfigurationPanel.tsx`,
`ArchitectEditScope.tsx`, `AwsServiceCatalog.tsx` and `ArchitectureCanvas.tsx`.

Properties use the same stable component IDs and architecture JSON revisions.
There is no database migration, new owner database or separate deployment copy.
Browser QA uses a separate local SQLite database with synthetic assets; no saved
customer architecture was replaced. No environment credentials were inspected.

## C. AI & Architecture Safety

EDIT is required for property patches. The server checks selected node IDs,
matching immutable configured service identity, exact property types and all
configured-resource references/policies. Unknown/credential fields and duplicate
operations are rejected. Compatible selected-resource schemas bound the prompt.
REVIEW/ADD/REMOVE cannot patch properties; newly added nodes need configuration.

Questions preserve the saved graph and properties. Invalid responses are rejected
before OpenRouter fallback. Free-only prices and provider data-collection denial
remain enforced. Model authorization/account policy failures retain existing
bounded error handling; failures do not silently authorize another account.

Property-only proposals lock competing saves. Apply requires the expected revision
and proposal ID, checks base graph/property fingerprints, reconstructs the patch,
compares it with reviewed properties and revalidates scope, identity and request
paths. It saves a new revision and invalidates design approval. Discard retains
the old design; History restores saved graph, properties and requirements.

These are model contract/control tests, not proof that a live model accurately
understands arbitrary enterprise source code. A property diff is not an AWS
replacement plan. AI has no provisioning or executable-code tools.

## D. AWS Deployment Reality

No AWS API calls, account validation, change-set execution, paid provisioning or
customer deployment were performed in this pass. Export and cfn-lint are offline.
Fifteen types have validated configuration/export; the broader 1,748-type catalog
offers diagram planning. This is not deployable support for every AWS service.

The configured network can be exported, but it does not create workloads, ALBs,
certificates, IAM/task roles, ECS services, database/cache instances or scaling
policies. Security groups alone do not implement TLS, authentication or tenant
isolation. S3 remains a regional managed service; a gateway endpoint supplies
private access rather than placing a bucket inside a subnet. Matching workload
ports, permissions and actual reachability still require application acceptance.

Read-only AWS account/template validation and a persisted version/hash-bound
change set are next. Actual execution needs an authorized sandbox, reviewed
budget/permissions, durable worker, lock/idempotency, explicit approval and tested
failure recovery. No backend environment key was changed in this pass.

## E. Verification

- Backend: full isolated `python -m pytest -q --tb=short`; 320 passed, four
  external-environment checks skipped. The test database is explicitly separate
  from owner data. Focused pure resource/policy/handler suite: 104 passed.
- Ten isolated API tests cover property-only proposals, Apply, stale replay,
  History, malformed/unselected patches, clarification and tampered proposals.
  Four of those verify fallback from invalid properties, unselected IDs, HTTP 429
  or timeout to the general free router while retaining strict scope/schema checks.
  Clarification replies also cannot bypass a future property-schema migration.
- Frontend: TypeScript check, ESLint and optimized Next.js build pass; 105 routes
  generated. Final build includes catalog capability states and validation text.
- Frontend configuration/HTTP/auth contracts: 24 passed. Four stale proxy
  assertions were updated to verify explicit slash-preserving collection routes
  and their configured backend origin, rather than assuming only wildcard routes.
- A complete 23-component network fixture produces 24 CloudFormation resources,
  including the S3 TLS policy. Both the directly compiled fixture and the exact
  browser-downloaded v3 artifact pass cfn-lint for ap-south-1.
- Browser: signed into an isolated local account; public CIDR private-backend
  inbound was rejected, a same-VPC group peer was saved as a new revision, S3
  route-table checkboxes and bucket/access selectors worked, and exact export
  identified its version/checksum and unperformed AWS validation.
- Browser property-review fixture: zero graph changes and one exact property
  change appeared first in the floating AI window. Apply created local v4;
  History preview identified one difference and restoring v3 created v5.
  This fixture tests the actual UI/API workflow without a live model request.

Browser evidence is local acceptance. No live provider quality benchmark,
PostgreSQL concurrency rehearsal, independent security audit, real AWS runtime
test, SLA or compliance certification is established by these results.

## F. Remaining Work

1. Explicit workload, IAM, image, ALB/target group, TLS certificate, ECS service,
   database/cache and autoscaling definitions with health/rollback acceptance.
2. AWS read-only validation, exact change-set planning and approved durable
   execution/reconciliation before any customer deployment action.
3. Typed account/region/VPC/subnet parent relationships and edge semantics in
   the diagram renderer; existing visual boundaries remain heuristic planning.
4. Benchmarked large-graph interaction, multi-select/copy/paste, nested groups,
   import/discovery, collaboration and performance before increasing 80/160 caps.
5. Live scoped AI quality acceptance, PostgreSQL tenant/concurrency tests, real
   monitoring/drift, backups/restore, security and independent assurance.

The saved Mumbai 500 peak requests/minute and 100 concurrent-user targets remain
planning goals until workload benchmarks establish capacity. See
[the persistent backlog](ENTERPRISE_DEVELOPMENT_BACKLOG.md) and
[resource coverage](RESOURCE_CONFIGURATION.md) for continuation.
