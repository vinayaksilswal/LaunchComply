# Deep research prompt: Enterprise AWS architecture and deployment

Act as a senior AWS solutions architect, SaaS security engineer, SRE, and infrastructure product designer. Research how real production SaaS systems and enterprise cloud platforms are designed, deployed, validated, modified, and operated. Translate the evidence into an implementation specification for LaunchComply, an AWS architecture editor with manual editing and a scoped AI copilot.

Use current primary sources: AWS documentation, AWS Well-Architected and SaaS Lens, AWS Architecture Center, Builders' Library, CloudFormation documentation, AWS security guidance, official service quotas/pricing, and original engineering case studies. Date the research, cite links next to claims, separate documented behavior from recommendations and assumptions, and identify account/region-specific facts that require live checks. Avoid vendor marketing claims, unsupported cost estimates, and treating a diagram as deployment evidence.

## Business and workload context

- Initial customer: an India-based multi-tenant SaaS with multiple frontend repositories and a shared backend; proposed primary region Mumbai (ap-south-1).
- Initial planning targets: 100 concurrent users and approximately 100–500 requests per minute. These are demand goals, not tested instance capacity. Do not derive CPU, memory, replicas or database sizes without request characteristics and measurements.
- All hosting should be on AWS. The customer wants a public-facing frontend tier and private backend/data tiers. Examine public versus private frontend **compute** behind public ingress rather than assuming every frontend needs a public IP. Explain which choices meet the customer's intent most securely.
- Browser traffic should use the public frontend origin. Where the API must be unreachable from the internet, research a frontend server/BFF proxy into internal API ingress. Explain why JavaScript in a browser cannot directly address a private API merely because its static files are hosted in a VPC.
- Private data includes relational databases, cache and object storage. Explain that S3 is a regional managed service outside subnet containment; a private bucket and appropriate endpoint/IAM/bucket policies implement restricted access. WAF filters supported ingress traffic; it is not a connection or tunnel between public/private networks.
- Expansion targets: more services, multiple businesses/accounts/environments, higher traffic, multi-AZ reliability, and justified multi-region recovery. Do not copy an expensive enterprise reference stack into a startup without explaining why each component is needed.

The attached PeopleStrong network request-flow SVG is a visual reference for explicit VPC/AZ/subnet ownership, separated service groups, numbered request paths, internal connections, and corporate connectivity. Inspect its visible labels and legend. Do not assume its routes, permissions, capacity, costs or security are verified, or that its EKS/peering/VPN design is appropriate for this SaaS. Report unreadable sections rather than inventing them.

## Research questions

1. **Application understanding:** What evidence must a repository analyzer collect to identify frontend, SSR/BFF, API, workers, schedules, queues, data stores, outbound dependencies, authentication, tenant boundaries, ports and health checks? Distinguish manifests, resolved static calls, environment variable names, declared endpoints and observed runtime evidence. Explain handling multiple repositories, monorepos, unknown connections and conflicting evidence without reading or sending secret values to an AI model.

2. **Secure request paths:** Compare browser → CDN/WAF/public HTTPS ALB → web/BFF → internal HTTPS ALB → private API → private database/cache. Specify trust boundaries, security-group source/destination relationships, TLS termination/re-encryption, authentication/authorization, sessions, CSRF/CORS, rate limiting, timeouts, forwarded-header trust and health checks. Compare same-VPC subnets with separate VPCs plus approved peering/Transit Gateway/PrivateLink when justified. Include DNS, routing, endpoint policies and NACL considerations. Identify misconfigurations that a graph validator can prove versus checks requiring deployed resources.

3. **Compute and scaling:** Compare ECS Fargate, EC2, EKS and Lambda using workload needs, operational burden, regional limits and cost drivers. Define autoscaling inputs, min/max capacity, cooldowns, graceful termination, connection draining, worker/backlog scaling and database bottlenecks. Explain ALB placement across AZs and the difference between a regional load balancer and per-AZ replicas. Propose realistic load tests, p95/p99 latency/error objectives, saturation tests and capacity acceptance criteria for the initial targets and subsequent growth.

4. **Data and tenant isolation:** Compare pooled, siloed and hybrid tenant models. Cover authorization at every data access, connection pools, encryption/KMS, secrets rotation, backups, restore rehearsals, retention/deletion, cache partitioning and object ownership. Distinguish Multi-AZ availability, read replicas, backups and cross-region disaster recovery. Require explicit RPO/RTO and data-residency decisions.

5. **Networking and platform services:** Define explicit VPC/subnet/AZ/route-table/gateway/endpoints/security-group resource identities. Cover outbound-only NAT tradeoffs and cost, supported endpoint types, S3 gateway policy scope, public exposure checks and private application access. Separate application HTTP paths, data dependencies, permission references, telemetry, build/deployment flows and network associations. Do not represent CloudWatch or ECR as request-routing hops.

6. **Deployment lifecycle:** Describe version-bound IaC generation, schema/property validation, AWS template validation, account/region identity verification, change sets/plans, IAM capability acknowledgements, least-privilege execution roles, approvals/expiry, replacement/deletion impact and policy gates. Specify durable workers, idempotency, deployment locks, retry/reconciliation after crashes, drift discovery, health verification, rollback and recovery. Compare CloudFormation/Terraform/CDK; recommend a bounded first implementation. Explain imported versus managed resources and ownership transfer.

7. **Operations and assurance:** Cover structured logs, metrics, traces, alerts, SLO/error budgets, access/audit logs, vulnerability/image/IaC scans, dependency risks, runtime detection and incident response. Map actual evidence to compliance readiness; distinguish preparatory percentage/checklists from an auditor's certification and from continuously verified controls. Identify what can be automated, what needs an operator, and what requires independent assessment.

8. **Architecture editor:** Specify a canonical model with stable IDs, resource types, typed properties/references, account/region/environment ownership, nested groups and typed edge purposes. Define validation of illegal containment and broken references, diagram layout, readable typography, orthogonal routing, selected-path focus, collapsible groups, filtering, minimap, multi-select, copy/paste, undo/redo, revision history and exports. Include backwards-compatible migrations, accessibility, conflict handling and performance benchmarks for dense 80-, 500- and 1,000-resource diagrams. Do not claim scale without measured results.

9. **AI copilot:** Specify LangGraph/LangChain workflows for evidence gathering, clarifying missing inputs, scoped operations, typed validation and proposed changes. The AI must change only requested resources/properties/connections, preserve unrelated IDs/positions/settings, show exact before/after differences and require Apply/Discard. Define provenance, stale-version detection, scope tests, adversarial repository prompt-injection tests, free-model fallback/timeout handling, privacy and redaction. Never allow AI conversation to authorize cloud execution or manufacture a safe/production-ready verdict.

## Required output

Deliver these concrete artifacts:

1. A decision summary with recommended startup baseline, growth stages, assumptions and tradeoffs.
2. A sourced correction table for common misconceptions: public/private VPC versus subnet, browser versus server proxy, WAF versus routing, S3 placement, SGs versus authentication, Multi-AZ versus recovery, readiness versus certification.
3. Three reference architectures: initial SaaS, scaled multi-AZ SaaS, and enterprise multi-account design with optional disaster recovery. Include numbered request flows, explicit ownership, security boundaries and separate telemetry/build paths. Label proposals and missing inputs clearly.
4. A service capability matrix: visual support, configurable fields, IaC export, AWS validation, deployment, drift and recovery support. Avoid “all AWS services deployable” claims.
5. Example canonical schemas and safe scoped AI patches; an example of a property change that preserves the rest of a design.
6. A production deployment sequence with reviewable plan artifacts, approval boundaries, failure cases, retries, reconciliation, health checks and recovery.
7. A measurable acceptance checklist and test plan, including pytest, API/tenant/permission tests, frontend editing tests, real PostgreSQL concurrency, offline IaC checks and owner-authorized AWS sandbox acceptance. Distinguish mocks from real evidence.
8. A prioritized implementation backlog for LaunchComply, with dependencies, effort ranges, security impact and acceptance criteria for each complete vertical feature.
9. Unresolved questions to ask the customer and live account checks required before provisioning; no unsupported defaults for budgets, ports, RPO/RTO or regional availability.
10. A source list, research date, limitations and an explicit list of claims that cannot be validated from the provided code or diagram.

The goal is an evidence-backed engineering specification that a development team can implement and verify, not an attractive diagram, a generic best-practices essay, or a declaration that an untested system is enterprise-ready.
