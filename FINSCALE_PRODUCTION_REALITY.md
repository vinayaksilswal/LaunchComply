# FinScale Technologies — Production Reality Matrix

**Organization:** FinScale Technologies Pvt Ltd (`org-finscale-001`)  
**Tenant Slug:** `finscale`  
**Classification:** `PILOT_CUSTOMER` (Real Customer Baseline: $n=1$)  
**Target Outcome:** Deploy fintech SaaS securely to AWS (`ap-south-1`) + demonstrate ISO 27001 readiness to enterprise banking partners.  
**Operating Principle (§2):** Evidence-Driven Truth Rule. States: `NOT_STARTED`, `CONFIGURED`, `SIMULATED`, `TEST_VERIFIED`, `CUSTOMER_VERIFIED`, `PRODUCTION_VERIFIED`. Never collapse unverified states into false-green production.

---

## Reality Matrix

| Capability | Expected State | Current State | Evidence Basis | Owner | Blocker | Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AWS IAM Role & STS Trust** | `PRODUCTION_VERIFIED` | `CUSTOMER_VERIFIED` | Dynamic LaunchComply principal + tenant ExternalId (`launchcomply-ext-demo-acme-9c4f12d8a`) verified via Wizard V3; CloudFormation template SHA-256 verified. | Customer (Arun Nair, CTO) | None (Technically unblocked) | Customer deploys CloudFormation Quick-Create stack in customer AWS account. |
| **Source Repository** | `PRODUCTION_VERIFIED` | `CUSTOMER_VERIFIED` | Connected GitHub repo `finscale-core` (`main` branch); commit hash `c89a1f4` recorded. | Customer / LaunchComply | None | Pull immutable commit for container build and SBOM. |
| **Target Architecture** | `PRODUCTION_VERIFIED` | `CUSTOMER_VERIFIED` | ECS Fargate + RDS PostgreSQL Multi-AZ + Application Load Balancer in `ap-south-1` approved by customer CTO. | DevOps Architect | None | Bind approved architecture `v1.0.0` to deployment plan. |
| **Infrastructure Plan** | `PRODUCTION_VERIFIED` | `TEST_VERIFIED` | Immutable plan generated (`plan-finscale-001`); zero destructive deletes; policy gates evaluated (`PASS`). | LaunchComply IaC Engine | Pre-deploy customer sign-off | Present immutable plan to customer for formal apply authorization. |
| **Customer Deployment Approval** | `PRODUCTION_VERIFIED` | `CONFIGURED` | Approval schema ready; records approver, scope, cost estimate, architecture version (§6). | Customer (Arun Nair / Priya Sharma) | Awaiting customer click | Customer reviews plan and records explicit deployment authorization. |
| **Infrastructure Apply** | `PRODUCTION_VERIFIED` | `SIMULATED` | Safe provisioning state machine (`QUEUED` -> `APPLYING` -> `VERIFYING`) tested; no silent apply without customer approval (§7). | LaunchComply Engine | Customer Approval | Execute provisioning upon customer authorization. |
| **AWS Resource Verification** | `PRODUCTION_VERIFIED` | `SIMULATED` | Real AWS read calls (`DescribeVpcs`, `DescribeClusters`) engine ready; awaiting live apply outputs. | LaunchComply Engine | Infrastructure apply | Discover created resources via read calls to verify actual AWS presence. |
| **Build & Container Image** | `PRODUCTION_VERIFIED` | `TEST_VERIFIED` | Build ID `bld-finscale-01`, immutable digest `sha256:d8a94bc72...`, CycloneDX SBOM generated, 0 critical CVEs. | DevOps Architect | None | Push image to customer ECR repository with immutable tag. |
| **Database Migration** | `PRODUCTION_VERIFIED` | `CONFIGURED` | Automated pre-migration snapshot hook and Alembic migration runner configured; dry-run passed. | DevOps Architect | Live RDS endpoint | Run migration on live RDS instance after DB availability. |
| **ECS Task & Service** | `PRODUCTION_VERIFIED` | `SIMULATED` | Task definition rendered (`finscale-core:1`); desired count = 2; CPU 512, RAM 1024; target group configured. | LaunchComply Engine | ECS Cluster provisioning | Deploy ECS service and wait for tasks to reach `RUNNING`. |
| **Health Check & Traffic Shift** | `PRODUCTION_VERIFIED` | `SIMULATED` | ALB target health check (`/healthz` 200 OK) configured; blue/green rolling traffic shift logic ready. | LaunchComply Engine | Task runtime | Verify target health before shifting 100% production traffic. |
| **Custom Domain & DNS** | `PRODUCTION_VERIFIED` | `PENDING` | Hostname `api.finscale.in` selected; DNS CNAME record pending configuration in customer DNS. | Customer IT / DNS Admin | Customer DNS update | Customer creates CNAME pointing to ALB DNS name. |
| **TLS Certificate** | `PRODUCTION_VERIFIED` | `PENDING` | ACM certificate requested; validation pending DNS CNAME; endpoint HTTPS verification required (§39, §40). | Customer / LaunchComply | DNS validation | Verify live HTTPS certificate chain on `api.finscale.in`. |
| **Monitoring & Telemetry** | `PRODUCTION_VERIFIED` | `CONFIGURED` | CloudWatch log group `/ecs/finscale-core` mapped; 5xx, latency, and DB CPU alarm thresholds set. | LaunchComply Operations | Live ECS telemetry | Activate metrics stream once ECS service is running. |
| **Database Backup** | `PRODUCTION_VERIFIED` | `SCHEDULED` | Automated daily RDS snapshot configured (7-day retention, KMS encrypted); restore drill scheduled (§48, §49). | DevOps Architect | Live DB snapshot | Verify first successful automated snapshot completion. |
| **Production Security Baseline** | `PRODUCTION_VERIFIED` | `SIMULATED` | Baseline rules audited; 0 Critical findings; live scan against running production endpoint pending (§51, §52). | Security Lead | Live production endpoint | Run authorized production security scan against live deployment. |
| **ISO 27001 Readiness Evidence** | `CUSTOMER_VERIFIED` | `CONFIGURED` | Controls A.9 (IAM least privilege), A.10 (KMS encryption), A.12 (ops/logging) mapped; awaiting live outputs. | Compliance Lead | Live resource IDs | Ingest live AWS ARN evidence into ISO 27001 readiness workpapers. |
| **DPDP Compliance Evidence** | `CUSTOMER_VERIFIED` | `CONFIGURED` | Data residency verified in `ap-south-1` (Mumbai); data flow and subprocessor review recorded. | Compliance Lead | None | Package DPDP evidence artifact for enterprise banking partner. |
| **Customer Acceptance** | `CUSTOMER_VERIFIED` | `NOT_READY` | Formal acceptance workflow ready; 4 categories: Technical, Security, Business Outcome, Commercial (§62, §63). | Priya Sharma (CEO) | Production readiness report | Present `PRODUCTION_READINESS_REPORT` for formal sign-off. |
| **Commercial Invoice** | `CUSTOMER_VERIFIED` | `CUSTOMER_VERIFIED` | Invoice `INV-2026-FINSCALE-001` (₹1,49,000 INR) issued; status `OPEN`; payment source `BANK_TRANSFER`. | Commercial Lead / Finance | Bank transfer arrival | Customer accounts payable initiates corporate wire transfer. |
| **Bank Payment Reconciliation** | `PRODUCTION_VERIFIED` | `PENDING` | Reconciliation queue ready in Platform Admin; UTR verification and finance segregation enforced (§77-§84). | Finance Verifier | UTR receipt | Reconcile corporate bank wire upon receipt of valid UTR. |
| **Revenue Classification** | `PRODUCTION_VERIFIED` | `TEST_VERIFIED` | Reconciled payment classified as `REALIZED_SERVICE_REVENUE`; Live MRR remains strictly `₹0.00` (§85-§89). | Finance Operator | Payment reconciliation | Realize ₹1,49,000 service revenue; maintain MRR at ₹0.00. |

---

## Reality Summary
- **Current Operational Frontier:** Transitioning from `CUSTOMER_VERIFIED` AWS onboarding into explicit customer-authorized deployment plan approval, live infrastructure provisioning, and verified production application release.
- **Strict Commercial Reality:** Live MRR remains **₹0.00**; Realized Service Revenue remains **₹0.00** until invoice `INV-2026-FINSCALE-001` (₹1,49,000) is reconciled with valid UTR evidence.
