# Research interpretation and code baseline

Reviewed 14 October 2026. Source baseline `83a5d87`.

## Inputs and authority

The two supplied research attachments are identical (85,697 decoded characters;
SHA-256 of UTF-8 decoded text:
`bc90702145edcee3b11acdb936792c70fa94d3af0924ff767743f6ae129d21d4`).
Original local locations end in
`41673778-1484-490c-b09f-3c4d1c8a1a27/Pasted text.txt` and
`1e598663-e65c-4b07-8ffe-21fbcb7987c0/Pasted text.txt` under the user's Codex attachments.
They inform this plan; their examples are not instructions to execute commands,
grant privileges, drop tables, deploy resources or publish commercial claims.

The PeopleStrong SVG supplied earlier informs boundary/flow readability. It does
not establish exact routes, IAM, sizing, security, cost or a suitable startup stack.
Do not ship the customer's reference diagram or raw private research attachment
as a public product asset. This plan stores a decision synthesis only.

## Verified source-level baseline

| Area | Existing source / contract | What is established / what remains |
| --- | --- | --- |
| UI | `apps/web/src/components/architecture/ArchitectureCanvas.tsx`, `CloudDiagram.tsx` | Bespoke SVG, editable nodes/connections, compact navigation integration; not React Flow |
| Domain | `apps/api/app/services/architecture/workspace.py`: `Node`, `Edge`, `Graph` | Flat nodes with service/zone/description/x/y, edges source/target/label, 80/160 limits, 0..6000 coordinates |
| Version API | `apps/api/app/api/v1/architecture_workspace.py` | expected_id, version creation, restore, pending proposal review; mutable metadata shares Architecture rows |
| Source selection | `apps/api/app/api/v1/applications.py`, `architecture/repository_links.py`, `models/source_control.py` | Six links; branch/root stored in link model but reading resolves repository default branch |
| GitHub | `api/v1/github_authorization.py`, `services/source_control/github_app.py`, `architecture/workspace.py:inspect_repository` | Real GitHub App access, read-only installation token, pinned commit/blob reads; no arbitrary repository execution |
| Evidence | `architecture/code_evidence.py`, `source_archive.py` | 40 source-file sample, 100 KB file bounds; limited Python/JS/TS evidence; ZIP limits 3 MB compressed / 25 MB expanded |
| Initial proposal | `workspace.py:draft_graph`, API `analyze` | Dependency heuristics; refresh rebuilds graph and drops current typed configurations rather than reconciling |
| Network | `resource_configuration.py`, `network_resources.py`, `resource_topology.py` | 15 typed foundation types, CIDR/reference/routing checks, read-only topology; workload attachments not implemented |
| AI | `agent.py`, `edit_scope.py`, `resource_edits.py`, `proposal_policy.py`, `routing.py` | LangGraph/LangChain, scoped operations, Apply/Discard, validation/fallback; live quality and new configured-resource creation still need acceptance |
| AWS identity | `services/infrastructure/aws_account_connection.py` | Real STS and bounded inventory adapter exists; runtime identity configuration and account acceptance required |
| Deployment | `api/v1/deployments.py:trigger_deployment` | Explicit unavailable response; older provisioning/orchestration modules remain demo-gated |
| Drift/metrics | `infrastructure/drift_engine.py`, `operations/observability_provider.py` | Legacy drift comparison substitutes expected for actual; CloudWatch provider contains canned metrics; cannot claim live operations |
| Commercial | service delivery/payment models and `commercial/service_payments.py` | Useful request/quote/report/acceptance path; paid delivery and reconciled unit economics unverified |

These are code-audit observations, not an exhaustive vulnerability assessment.
Previous recorded verification at this commit: 330 pytest passed / 4 external
checks skipped; 28 frontend configuration tests; type/lint/build passed; local
synthetic 23-resource/31-reference browser inspection. These tests were not rerun
for this documentation-only plan. Re-establish the baseline in A01. Old GA docs
and earlier test totals are historical, not current release authority.

## Corrections required before using the research

| Research assertion | Implementation decision |
| --- | --- |
| Specific monthly baseline and scale-tier costs | Unverified and incomplete. Include both ALBs, every compute service/replica, database/replicas/storage/I/O/backups, NAT/endpoints/IPv4, WAF/CDN, logs/traces, transfer, certificates/CA and support. Use dated Mumbai price inputs and ranges; never publish the supplied total as an estimate. |
| Little's Law proves two tasks are enough | It estimates average in-flight concurrency under assumptions. It does not size CPU, memory, DB pools or tail latency. Benchmark the actual workload with mixed requests and tenant contention. |
| Automatically choose Aurora, three AZs, FIFO queues, private CA | Choose from workload constraints and cost review. Two AZs, RDS PostgreSQL vs Aurora, standard vs FIFO queues, managed certificate options and BFF/internal ingress each require explicit decisions. |
| Public/private VPC terminology | Model subnet route exposure inside a VPC. Separate VPCs are supported later for actual isolation/account requirements, not created merely from a label. [AWS internet gateway routing](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html). |
| Browser frontend can directly call private API | Browser JavaScript executes on customer devices. A private backend requires a reachable controlled ingress or server-side BFF/proxy. Record BROWSER versus SERVER callers; do not draw a private browser path as functioning. |
| WAF terminates TLS or bridges VPCs | Model WAF association as inspection policy at a supported service. Certificate termination and routing belong to their actual endpoint resources. |
| All hops are secure because a listener is HTTPS | Model TLS per hop and authentication separately. ALB HTTPS target connections do not validate target certificates; do not describe that as verified end-to-end application identity. [ALB target groups](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html). |
| S3 is in private data subnets | Keep S3 regional; represent endpoint routes and endpoint/bucket/IAM policy separately. [S3 gateway endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html). |
| One NAT preserves full multi-AZ availability; per-AZ NAT eliminates all cross-AZ charges | A single zonal NAT introduces egress dependency; per-AZ NAT reduces certain cross-AZ traffic, not all architecture transfer charges. Present price and failure tradeoffs. [NAT pricing guidance](https://docs.aws.amazon.com/en_en/vpc/latest/userguide/nat-gateway-pricing.html). |
| The whole architecture is a DAG; SG cycles are invalid | Only containment and compilable dependency ordering require acyclic rules where applicable. Request flows, bidirectional SG references, retries and event systems may form legitimate cycles. Use standalone rule resources to avoid template dependency cycles. |
| Copy RFC 6902 paths such as /nodes/7 | Preserve existing stable IDs. Use typed operations keyed by node/edge IDs with preconditions. If JSON Patch is exposed, translate guarded ID paths server-side; never trust mutable array indexes. |
| Strip injection phrases to solve prompt injection | Repository content remains untrusted even without known phrases. Restrict authority, data, output schema and tools; validate scope server-side and test adversarial inputs. Redaction is defence in depth. |
| Supplied benchmark table describes this implementation | It does not. React Flow/ELK/Zustand are not current dependencies; the given machine/FPS results have no reproducible artifact. Establish local baseline and comparison spike before replacing rendering. |
| Static checks prove 100% CIS/compliance | Each rule proves a bounded property. Track rule versions, unknowns and exceptions. Certification/readiness requires separate evidence and human processes. No certification claim from a percentage. |
| Sample Guard rule catches all exposed admin ports | Checking FromPort alone misses covering ranges, all-protocol rules, IPv6 and standalone ingress resources. Add adversarial tests for each representation. |
| SQL sample is a production isolation proof | Do not run its DROP TABLE or hardcoded credential example. Test disposable PostgreSQL with non-owner/non-superuser runtime roles, missing tenant context, writes, deletes, pooling, rollback and jobs. Owners/BYPASSRLS are special cases. [PostgreSQL row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html). |
| CloudFormation rollback is guaranteed, instant and restores data | Rollback can fail and cannot undo arbitrary database/data migrations. Test actual statuses, existing alarms, recovery/retention and operator action. [Rollback triggers](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-rollback-triggers.html). |
| Drift covers everything; import is automatically safe and zero downtime | Supported resources/properties vary; report NOT_CHECKED, stale and partial coverage. Import needs ownership/compatibility review and its own change set. [Drift limitations](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html). |
| Terraform always requires DynamoDB locking | Current S3 backend supports lockfiles and deprecates DynamoDB locking. Terraform remains later scope. [Terraform S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3). |
| New tracing should use the old X-Ray daemon by default | Prefer supported OpenTelemetry instrumentation/collector after compatibility verification. [AWS migration guidance](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-migration.html). |
| DPDP mandates this precise architecture, residency or encryption configuration | This plan accepts no legal conclusion from that claim. Capture jurisdiction/contract constraints and obtain qualified review before representing compliance. India-only operation is a customer requirement here, not a blanket statutory assertion. |
| Example RTO/RPO/SLO and zero-overhead telemetry are guarantees | Store as proposed objectives; accept only after measured exercises. Telemetry needs bounded buffering, overhead and failure behavior tests. |

Primary links were checked during 13-14 October 2026 planning. Recheck service
support, pricing, regional availability and provider APIs in the implementation
ticket that depends on them. Research citation placeholders such as `[cite: 23]`
without source mappings are not independent evidence.

## Reconciliation with the customer's existing decisions

Mumbai, 500 peak requests/minute, 100 concurrent users and a multi-AZ target are
planning inputs. Existing frontend placement must be preserved until a reviewed
proposal changes it. The safe desired flow is browser -> controlled HTTPS web
entry/BFF -> authenticated private API -> private data access. Whether the BFF
itself is in public or private subnets is an explicit design decision, with IP,
SG and route consequences explained. A static SPA alone is not a BFF. The tool
must ask for or generate a reviewed proxy implementation contract when needed.
