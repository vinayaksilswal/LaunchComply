# AWS SaaS architecture planning

The supplied application network diagram is a visual reference for clear boundaries and request flow. Its EKS, multiple VPCs, corporate VPN and data platform are specific to that system; they are not prerequisites for every SaaS workload. Connected source evidence and customer decisions determine which services belong in a business design.

## Selected request pattern

For the selected frontend-server proxy pattern: browser -> CloudFront/public web ALB -> AWS frontend hosting server -> internal HTTPS ALB -> private API -> isolated database/cache or private S3 endpoint. Public/private describes subnet routing inside a regional VPC. Frontend task access is restricted to its web ALB security group; backend tasks have no public IP and accept API-ingress SG traffic. Browser code uses same-origin `/api`; actual frontend proxy code, authentication and authorization must be implemented and verified.

WAF associates with supported public ingress; it is not a network bridge. Fargate targets use dedicated IP target groups per ECS service. ALBs span selected AZ subnets; a logical ALB/service card is not a separate resource per AZ or a measured task count. Global DNS/CDN and managed S3 buckets remain outside customer subnet boundaries. Build, secrets and observability are separate from HTTP request arrows.

## Scaling and release policies

Architecture settings records a policy per ECS workload: minimum/maximum tasks, CPU/memory or ALB request-count target, scale-in/out cooldowns, deployment strategy and an existing connected ALB's HTTPS target port/health path. Plans are versioned with traffic requirements and clear design approval. Existing traffic edits preserve workload policies; changing source/graph identity can require policy remapping. Old APIs do not expose the scaling capability, so new UI cannot claim a successful policy save against an API that would discard it.

Peak traffic is demand, not per-task throughput. Benchmark the request mix and validate CPU/memory, latency, database connections, quotas and scaling lag. Capacity estimates retain the supplied benchmark assumptions and flag when proposed peak replicas exceed a policy's maximum. A two-task baseline needs actual AZ distribution and surviving-zone capacity; it does not guarantee availability.

ALB request-count target tracking is not supported for the selected blue/green deployment type. Blue/green needs distinct target groups, traffic shifting and rollback. Health endpoints, grace periods, matcher/thresholds and connection draining require configuration and rollout checks. ALBs can fail open when all targets are unhealthy. HTTPS encrypts target traffic, but ALB does not validate target certificates; SG restrictions and application authentication remain necessary.

## SaaS acceptance requirements

Choose pooled, silo or bridge tenant isolation. Validate identity and server-side membership, enforce object/operation authorization and test tenant separation across database, storage, cache and jobs. Review administrator MFA, task-specific IAM, secret rotation, tenant quotas/rate limits and tenant-aware audit logs. Authentication, WAF and a private VPC do not themselves establish tenant isolation.

Review backups, tested restore/RPO/RTO, monitoring/alert drills, deploy/rollback, security findings and actual compliance evidence before production acceptance. This planner records decisions and gaps; it does not provision AWS, configure controls or certify a business.

## Official sources reviewed on 2026-10-12

- [ECS load balancing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html)
- [Fargate ALB target groups](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb.html)
- [ECS service autoscaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
- [ECS target tracking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-autoscaling-targettracking.html)
- [ALB target health checks](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)
- [ALB target protocols and TLS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html)
- [Multi-location resilience](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_fault_isolation_multiaz_region_system.html)
- [Frontend server/API integration](https://docs.aws.amazon.com/prescriptive-guidance/latest/micro-frontends-aws/api-integration-data-fetching.html)
- [SaaS tenant isolation](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/isolation-mindset.html)
- [ECS task IAM roles](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
# Scoped editing and AWS resource catalog

The editor offers direct insertion from common AWS services and a versioned Mumbai
CloudFormation catalog (264 resource families, 1,748 resource types in specification
267.0.0). `tools/update_aws_catalog.py` refreshes the snapshot from the official
regional resource specification. Catalog coverage is not universal AWS product
coverage or implementation support. A component is inserted without connections;
its architecture layer, actual placement, consumers and resource properties require
review. CloudFormation types remain planning references, not executable templates.

AI defaults to review only. Add mode preserves existing nodes, coordinates and
connections. Edit mode requires an explicit component selection and allows only
selected nodes, incident flows and related additions. Remove mode permits only
selected deletions and incident-flow removal. Permissions come from the validated
request scope; instruction keywords cannot authorize a whole-diagram replacement.
The provider returns bounded edit operations rather than resending the complete
graph. The server materializes, checks scope, validates graph references and applies
the existing request-path policy before creating a proposal. Incompatible free
provider responses can fall through the existing bounded routing chain.

Clarification answers are tied to the original request receipt, intent and scope.
Expired questions are rejected. Proposed changes show exact fields and flows;
the customer can preview, apply or discard. Applying rechecks the saved graph
fingerprint and scope. Older proposals without scope metadata must be discarded.
Conversation replies are labelled with their saved version and action; earlier
conversation is marked explicitly. Discarding does not create a new graph version.

Manual connection editing includes purpose/protocol labels, reversal and removal,
with existing undo/redo. Graphs remain bounded to 80 components and 160 connections.
This release does not implement arbitrary enterprise IaC, verify real network
isolation or enable automatic AWS provisioning. The deployment execution gate stays
closed until an authenticated, reviewed execution workflow is implemented.

Sources: [AWS CloudFormation resource specification](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/cfn-resource-specification.html),
[regional resource provider schemas](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/resource-type-schemas.html).
