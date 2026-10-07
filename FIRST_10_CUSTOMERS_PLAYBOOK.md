# LaunchComply First 10 Customers Operational Playbook

**Mission:** Convert 10 early high-intent SaaS companies from Localhost to Live, Secure, Audited, and Compliant Production on AWS with zero security findings.  
**Program Status:** Active GA Operations  
**Target Window:** October – November 2026

---

## 1. First 10 Customer Target Profile (§113)

Ideal early customers share these characteristics:
- **Product Type:** B2B SaaS, FinTech, HealthTech, or Developer Tools with an active codebase in GitHub/GitLab.
- **Current State:** Staging on Render/Heroku/Vercel or unhardened single-EC2 AWS, facing enterprise security reviews.
- **Immediate Trigger:** An upcoming enterprise pilot, customer security questionnaire (SIG Lite, CAIQ), or mandate for ISO 27001 / SOC 2 / DPDP compliance within 60–90 days.
- **Budget:** Pre-Series A to Series A; seeking to avoid spending $80k–$150k on external DevOps and compliance consultants.

---

## 2. Customer Cohort Profile Blueprint

For each of the first 10 customers, maintain this canonical profile in Platform Admin:

| Field | Description | Example / Target |
|---|---|---|
| **Organization Name** | Customer Company Legal / Trading Name | *FinScale Technologies Pvt Ltd* |
| **Lead Source** | How they entered the pipeline (§41) | *VAPT Inquiry / Organic SEO* |
| **Decision Maker** | Economic Buyer (CEO / Founder / VP Eng) | *Priya Sharma (Founder & CEO)* |
| **Technical Owner** | Execution Lead (CTO / Lead Architect) | *Arun Nair (CTO)* |
| **Codebase & Tech Stack** | Frontend, Backend, Database, Frameworks | *React 18 + FastAPI + PostgreSQL on RDS* |
| **AWS Account ID** | Target AWS Account for STS Connection | *12-digit AWS Account ID* |
| **Go-Live Target Date** | Hard deployment deadline | *T+14 Days from Kickoff* |
| **Security Baseline Target** | Zero critical/high CVEs, WAF active | *0 Critical, 0 High findings* |
| **Compliance Goal** | Immediate regulatory requirement | *ISO 27001 Readiness + SOC 2 Type 1* |
| **Commercial Plan** | Subscription Tier | *Growth (₹19,999/mo) or Business (₹49,999/mo)* |
| **Professional Services** | Assisted Pilot / White-Glove Package | *Managed AWS Deployment + Assisted VAPT* |
| **LaunchComply Owner** | Internal TAM / Commercial Account Executive | *Assigned Customer Success Engineer* |

---

## 3. White-Glove Customer Kickoff Checklist (§114)

Before provisioning resources or writing Terraform, execute this structured 45-minute kickoff meeting:

### Phase A: Architecture & Codebase Discovery
- [ ] Connect repository via LaunchComply GitHub App (read-only repository permissions).
- [ ] Trigger automated codebase analysis: Inspect `Dockerfile`, dependencies, environment variables.
- [ ] Review synthesized architecture diagram: ECS Fargate, Multi-AZ RDS, ElastiCache Redis, ALB, Route53.
- [ ] Align on VPC CIDR block, subnets (public/private/isolated), and egress NAT Gateways.

### Phase B: Cloud & Infrastructure Onboarding
- [ ] Run cross-account AWS STS CloudFormation template in customer's AWS account.
- [ ] Validate minimum IAM trust policy with automated LaunchComply verification probe.
- [ ] Confirm AWS service quotas (Elastic IPs, VPC limits, ECS task limits).
- [ ] Validate custom domain ownership and SSL/TLS certificate ARN in AWS ACM.

### Phase C: Data Protection & Disaster Recovery
- [ ] Configure RDS automated snapshots (30-day retention, cross-region replication if required).
- [ ] Configure S3 bucket versioning, server-side encryption (KMS CMK), and public access block.
- [ ] Schedule initial backup verification drill.

### Phase D: Security & VAPT Scoping
- [ ] Execute initial SAST and container vulnerability scan.
- [ ] Obtain signed Rules of Engagement (RoE) for Penetration Testing.
- [ ] Agree on testing window and whitelist LaunchComply dedicated security scanner IP pool.

### Phase E: Commercial & Governance Setup
- [ ] Verify billing subscription tier in Razorpay or Stripe.
- [ ] Issue formal GST Tax Invoice / International Commercial Invoice.
- [ ] Add customer core engineering team to organization workspace with RBAC roles.
- [ ] Configure Slack notification webhook for build alerts and security findings.

---

## 4. Weekly Customer Review Cadence (§116)

During the first 30 days of onboarding, hold weekly 30-minute syncs between LaunchComply Technical Account Manager and customer engineering leads:

- **Review Objective:** Review deployment telemetry, resolve security findings, remove blockers, and record product feedback.
- **Standard Agenda:**
  1. Infrastructure health and p95 latency review (5 min).
  2. Security findings burndown: Verify remediation of discovered vulnerabilities (10 min).
  3. Compliance workspace progress: Evidence collection for ISO 27001 / SOC 2 controls (10 min).
  4. Blockers and feature requests for Platform Engineering team (5 min).

---

## 5. Manual Work Tracking & Automation Priority (§172, §173)

To prevent premature abstraction while systematically driving Phase 14 automation, every manual operator action performed by LaunchComply engineers for early customers must be logged in Platform Admin:

| Category | Manual Interventions Observed | Planned Automation in Phase 14 |
|---|---|---|
| **AWS Account** | Debugging missing STS permissions, resolving VPC peering CIDR conflicts | Automated STS permission validator with inline IAM policy generator |
| **DNS & SSL** | Manually creating Route53 CNAME verification records for CloudFront/ACM | One-click Route53 zone delegation wizard |
| **Deployment** | Environment variable mapping and secret injection into AWS Secrets Manager | Encrypted secret manager UI with `.env` file parser |
| **Security** | Suppressing false positive container CVEs in vendor base images | Policy-driven vulnerability suppression engine with justification audit |
| **VAPT** | Manual scheduling and RoE verification with customer security teams | In-app digital RoE signing and scan calendar scheduler |
| **Compliance** | Exporting evidence artifacts for third-party auditor review | One-click automated auditor evidence bundle zip generator |
| **Billing** | Generating manual GST invoices with customer GSTIN and state tax codes | Automated GSTIN validation via GST portal API |
| **Training** | Conducting 1-on-1 walkthroughs of the continuous assurance dashboard | Interactive in-product guided tour with Action Center checklists |

---

## 6. First Customer Retrospective Protocol (§117)

Upon successful customer deployment to production (Milestone: `DEPLOYMENT_LIVE` + `SECURITY_BASELINE` achieved), conduct a 45-minute internal retrospective:

1. **Friction Analysis:** At which step did the customer get stuck or require manual Slack guidance?
2. **Ignored Features:** Which built features did the customer not use or find irrelevant?
3. **Core Value Moments:** What exact screen or capability generated the strongest emotional reaction of relief or delight?
4. **Referral Potential:** Is the customer willing to serve as a reference customer or provide a verified quote?
5. **Backlog Refinement:** Translate retrospective learnings into ranked tickets for Phase 14 development.
