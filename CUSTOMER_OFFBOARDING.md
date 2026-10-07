# LaunchComply Customer Offboarding & Data Portability Runbook

**Philosophy:** Zero Vendor Lock-in. Customer retains 100% ownership of AWS infrastructure, data, and compliance evidence even if they decide to leave.

---

## 1. Principles of Respectful Offboarding (§124, §125)

At LaunchComply, customer trust is built on mutual freedom. We believe enterprise customers should stay because our platform delivers immense continuous value—not because their infrastructure is trapped.

When a customer initiates an offboarding request or subscription cancellation:
1. **Infrastructure Continuity:** Deployed AWS infrastructure inside the customer's AWS account is NEVER deleted or disrupted by LaunchComply.
2. **Data & IaC Portability:** Customers receive complete Infrastructure as Code (Terraform) scripts, architecture configurations, security logs, and compliance evidence packs.
3. **Structured Feedback Collection:** Optional cancellation surveys are captured to identify missing features, pricing issues, or product improvements (§70).

---

## 2. Customer Offboarding Workflow Checklist

### Phase 1: Commercial Cancellation & Subscription Status
- [ ] Customer initiates cancellation in Platform Billing or via Customer Success representative.
- [ ] Structured cancellation reason collected (Too expensive / Missing feature / Too complex / No longer needed / Technical issue / Moved to competitor).
- [ ] Recurring subscription status changed to `CANCELLED_AT_PERIOD_END` in Stripe / Razorpay.
- [ ] Active service period continues until current paid billing cycle expires.
- [ ] Confirmation email sent with detailed data export instructions.

### Phase 2: Full Data & Evidence Export (§124)
Before workspace deactivation, customer can export the complete organizational bundle:
- [ ] **Infrastructure as Code (IaC):** Download exported Terraform templates and module states for all deployed services (VPC, ECS, RDS, ALB, KMS).
- [ ] **Compliance Evidence Vault:** Export ZIP archive containing all collected SOC 2, ISO 27001, and DPDP evidence files, audit logs, and policy documents.
- [ ] **Security & VAPT Reports:** Download all historical SAST reports, dependency scan logs, and certified Penetration Testing (VAPT) executive summaries.
- [ ] **Audit Trail:** Export complete CSV of platform audit events (user logins, configuration changes, release history).

### Phase 3: Cloud Credential & AWS STS Revocation
- [ ] Guide customer to remove the LaunchComply IAM Cross-Account Role in AWS IAM Console:
  ```bash
  aws iam delete-role --role-name LaunchComplyProductionDeployRole
  ```
- [ ] Once the role is deleted, LaunchComply immediately loses all ability to query or modify customer cloud resources.
- [ ] Confirm in LaunchComply telemetry that cross-account STS probes return `AccessDenied` and transition account cloud state to `DISCONNECTED`.

### Phase 4: Data Retention & Purge Policy
- [ ] Customer telemetry and application metadata retained in encrypted cold storage for 30 days for accidental cancellation recovery.
- [ ] After 30 days, automated hard purge permanently deletes:
  - Repository webhooks and OAuth tokens.
  - Cached build logs and telemetry records.
  - Temporary workspace artifacts.
- [ ] Billing invoices and tax records retained for 7 years in compliance with statutory financial regulations (GST / IRS requirements).

### Phase 5: Offboarding Support & Handoff
- [ ] Offer optional 30-minute offboarding architectural transition call with LaunchComply systems engineer to ensure customer DevOps team can operate raw Terraform templates smoothly.
