# LaunchComply First-Customer Onboarding Runbook

## 1. Objective
Ensures a structured, repeatable, white-glove onboarding experience for LaunchComply's initial paying enterprise customers—taking them safely from localhost to a fully deployed, secured, audited, and compliant production business.

## 2. Onboarding Lifecycle Stages

### Stage 1: Contract, Legal & Account Setup
1. Execute Master Services Agreement (MSA), Data Processing Agreement (DPA), and VAPT Rules of Engagement.
2. Sales logs accepted deal into LaunchComply CRM and provisions organization profile with customer GSTIN/PAN and legal entity details.
3. Organization Owner receives cryptographically signed invitation link and verifies work email.

### Stage 2: Technical Architecture & AWS Connection
1. Customer connects GitHub repository via GitHub App integration.
2. Static repository analysis detects microservices, container ports, databases, and environment variables.
3. LaunchComply generates production Terraform IaC architecture.
4. Customer configures AWS IAM STS cross-account assume-role policy with LaunchComply External ID.

### Stage 3: Deployment & Infrastructure Provisioning
1. IaC plan reviewed and approved by Customer DevOps Lead.
2. OpenTofu provisions VPC, ECS Fargate cluster, Aurora PostgreSQL, and ALB.
3. Build engine compiles container image, generates SBOM, runs database migrations, and deploys ECS services.
4. Custom domain bound with ACM TLS certificate and DNS validation verified.

### Stage 4: Continuous Security & VAPT
1. Automated SAST, container scan, and dependency vulnerability assessment executed.
2. Customer signs Phase 6 Penetration Testing Authorization form.
3. Authorized non-destructive VAPT scan executed against bounded target endpoints.
4. AI remediation guidance reviewed and approved by customer engineering team.

### Stage 5: Compliance ISMS & Evidence Vault
1. Initialize ISO 27001 / SOC 2 / DPDP compliance readiness framework.
2. Technical evidence collectors link AWS CloudWatch, CloudTrail, and GitHub settings to controls.
3. Evidence Vault generates exportable Audit Package.
4. Auditor Portal provisioned with read-only scoped access for external compliance assessors.

### Stage 6: Commercial Billing & First Customer Sign-Off
1. Customer completes tokenized checkout or accepts invoice-only pilot agreement.
2. Verified provider webhook activates Business/Enterprise subscription.
3. System issues sequential statutory tax invoice (`LC-INV-YYYY-XXXX`).
4. Internal Onboarding Owner and Customer Executive execute formal `CustomerAcceptance` record in `/platform-admin/first-customer`.
