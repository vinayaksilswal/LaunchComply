# LaunchComply — Frontend Data Source Audit (Phase 12)

Audited against all 71 Next.js application routes in `apps/web/src/app`.

| # | Route | Purpose | Current Data Source | Backend Endpoint | Real API Wired | Loading State | Empty State | Error State | Production Ready |
|---|-------|---------|---------------------|------------------|:--------------:|:-------------:|:-----------:|:-----------:|:----------------:|
| 1 | `/` | Marketing Hero, Features, Positioning | Static / Hardcoded Array | `GET /health` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 2 | `/audit` | Auditor Portal Token Entry / Workspace | Static / Hardcoded Array | `GET /api/v1/security/auditor/portal/{token}` | 🔄 REFACTOR | ✅ | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 3 | `/audit/workpapers` | Auditor Workpapers & Reviews | Static / Hardcoded Array | `GET /api/v1/assurance/workpapers` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 4 | `/dashboard` | Executive Command Center / Health | Hybrid Fallback / Mock | `GET /api/v1/dashboard/overview` | ✅ WIRED | ⚠️ ADD | ✅ | ✅ | PRODUCTION |
| 5 | `/dashboard/account` | User Profile, Credentials, MFA | Static / Hardcoded Array | `GET /api/v1/auth/me` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 6 | `/dashboard/applications` | Application Portfolio List | Static / Hardcoded Array | `GET /api/v1/applications` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 7 | `/dashboard/applications/[id]` | Application Detail Workspace | Static / Hardcoded Array | `GET /api/v1/applications/{id}` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 8 | `/dashboard/applications/[id]/environments/[environmentId]` | Environment Workspace | Static / Hardcoded Array | `GET /api/v1/operations/environments/{id}/health` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 9 | `/dashboard/applications/[id]/releases` | Application Releases List | Real API Fetch | `GET /api/v1/releases?application_id={id}` | ✅ WIRED | ✅ | ✅ | ⚠️ ADD | PRODUCTION |
| 10 | `/dashboard/applications/[id]/releases/[releaseId]` | Release Detail / Pipeline | Hybrid Fallback / Mock | `GET /api/v1/releases/{id}` | ✅ WIRED | ⚠️ ADD | ✅ | ⚠️ ADD | PRODUCTION |
| 11 | `/dashboard/architecture` | Architecture Diagram & Plan | Static / Hardcoded Array | `GET /api/v1/architecture` | 🔄 REFACTOR | ⚠️ ADD | ⚠️ ADD | ⚠️ ADD | NEEDS_WIRING |
| 12 | `/dashboard/assurance` | Assurance Overview & Stream | Static / Hardcoded Array | `GET /api/v1/assurance/summary` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ✅ | NEEDS_WIRING |
| 13 | `/dashboard/assurance/bots` | Continuous Audit Bots | Static / Hardcoded Array | `GET /api/v1/assurance/bots` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 14 | `/dashboard/assurance/controls` | Continuous Controls Monitor | Static / Hardcoded Array | `GET /api/v1/assurance/controls` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 15 | `/dashboard/assurance/evidence` | Cryptographic Evidence Vault | Static / Hardcoded Array | `GET /api/v1/assurance/evidence` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 16 | `/dashboard/assurance/exceptions` | SOC 2 Operating Exceptions | Static / Hardcoded Array | `GET /api/v1/assurance/exceptions` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 17 | `/dashboard/backups` | Database & S3 Backup Snapshots | Static / Hardcoded Array | `GET /api/v1/operations/backups/environments/{id}` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ✅ | NEEDS_WIRING |
| 18 | `/dashboard/billing` | SaaS Subscription & Invoices | Static / Hardcoded Array | `GET /api/v1/commercial/subscription` | 🔄 REFACTOR | ✅ | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 19 | `/dashboard/business-units` | Multi-BU Org Hierarchy | Static / Hardcoded Array | `GET /api/v1/enterprise/business-units` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 20 | `/dashboard/compliance` | Compliance Hub Overview | Static / Hardcoded Array | `GET /api/v1/compliance-os/readiness/all` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 21 | `/dashboard/compliance/actions` | Compliance Remediations | Static / Hardcoded Array | `GET /api/v1/compliance-os/tasks` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 22 | `/dashboard/compliance/audit-packages` | One-Click Audit Evidence Pack | Static / Hardcoded Array | `GET /api/v1/compliance-os/audit-packages` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 23 | `/dashboard/compliance/audit-readiness` | Multi-framework Readiness | Static / Hardcoded Array | `GET /api/v1/compliance-os/readiness/ISO27001` | 🔄 REFACTOR | ✅ | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 24 | `/dashboard/compliance/audits` | Formal Audit Engagements | Static / Hardcoded Array | `GET /api/v1/compliance-os/audits` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 25 | `/dashboard/compliance/calendar` | Compliance Calendar & Recurrence | Static / Hardcoded Array | `GET /api/v1/compliance-os/tasks` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 26 | `/dashboard/compliance/iso27001` | ISO 27001:2022 Workspace | Static / Hardcoded Array | `GET /api/v1/compliance-os/iso27001/status` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 27 | `/dashboard/compliance/policies` | Policy Governance Library | Static / Hardcoded Array | `GET /api/v1/compliance-os/policies` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 28 | `/dashboard/compliance/privacy` | DPDP / GDPR Privacy Desk | Static / Hardcoded Array | `GET /api/v1/compliance-os/privacy/status` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 29 | `/dashboard/compliance/risks` | Enterprise Risk Register | Static / Hardcoded Array | `GET /api/v1/compliance-os/risks` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 30 | `/dashboard/compliance/soc2` | SOC 2 Type II Workspace | Static / Hardcoded Array | `GET /api/v1/compliance-os/soc2/status` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 31 | `/dashboard/compliance/vendors` | Third-Party Vendor Management | Static / Hardcoded Array | `GET /api/v1/compliance-os/vendors` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 32 | `/dashboard/contracts` | SaaS Master Service Agreements | Static / Hardcoded Array | `GET /api/v1/enterprise/contracts` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 33 | `/dashboard/copilot` | AI Compliance & Security Copilot | Static / Hardcoded Array | `POST /api/v1/copilot/query` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 34 | `/dashboard/cost` | AWS FinOps Cloud Cost Analytics | Static / Hardcoded Array | `GET /api/v1/operations/cost/environments/{id}` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 35 | `/dashboard/deployments` | ECS Deployment Pipeline | Static / Hardcoded Array | `GET /api/v1/deployments/` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 36 | `/dashboard/dr` | Disaster Recovery & Drills | Static / Hardcoded Array | `GET /api/v1/security/dr/plan` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 37 | `/dashboard/export` | Compliance & Audit Data Export | Hybrid Fallback / Mock | `GET /api/v1/compliance-os/export` | ✅ WIRED | ✅ | ✅ | ✅ | PRODUCTION |
| 38 | `/dashboard/incidents` | Operational Incidents & SLA | Static / Hardcoded Array | `GET /api/v1/operations/incidents` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ✅ | NEEDS_WIRING |
| 39 | `/dashboard/logs` | Real-time CloudWatch Logs Stream | Static / Hardcoded Array | `GET /api/v1/operations/environments/{id}/logs` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ✅ | NEEDS_WIRING |
| 40 | `/dashboard/my-actions` | Unified Action Center | Static / Hardcoded Array | `GET /api/v1/dashboard/my-actions` | 🔄 REFACTOR | ⚠️ ADD | ⚠️ ADD | ⚠️ ADD | NEEDS_WIRING |
| 41 | `/dashboard/notifications` | Security & Audit Alerts Feed | Static / Hardcoded Array | `GET /api/v1/operations/alerts` | 🔄 REFACTOR | ⚠️ ADD | ⚠️ ADD | ⚠️ ADD | NEEDS_WIRING |
| 42 | `/dashboard/operations` | Operational Health & Runbooks | Static / Hardcoded Array | `GET /api/v1/operations/environments/{id}/health` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ✅ | NEEDS_WIRING |
| 43 | `/dashboard/security` | Security Findings & Posture | Static / Hardcoded Array | `GET /api/v1/security/findings` | 🔄 REFACTOR | ✅ | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 44 | `/dashboard/security/threat-models` | Threat Models Directory | Static / Hardcoded Array | `GET /api/v1/threat-models` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 45 | `/dashboard/security/threat-models/[id]` | Live Architecture Threat Canvas | Static / Hardcoded Array | `GET /api/v1/threat-models/{id}` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 46 | `/dashboard/services` | AWS Cloud Provisioned Resources | Real API Fetch | `GET /api/v1/services/catalog` | ✅ WIRED | ⚠️ ADD | ✅ | ⚠️ ADD | PRODUCTION |
| 47 | `/dashboard/settings/security/sso` | Enterprise SAML / OIDC SSO | Static / Hardcoded Array | `GET /api/v1/enterprise/sso/config` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ✅ | NEEDS_WIRING |
| 48 | `/dashboard/support` | Enterprise Support Desk | Static / Hardcoded Array | `GET /api/v1/commercial/support/tickets` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ✅ | NEEDS_WIRING |
| 49 | `/dashboard/team` | RBAC Team Members & Invitations | Static / Hardcoded Array | `GET /api/v1/auth/organization/users` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 50 | `/dashboard/trust` | Public Trust Center Config | Static / Hardcoded Array | `GET /api/v1/security/trust/profile` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 51 | `/dashboard/usage` | Resource Metering & Quotas | Static / Hardcoded Array | `GET /api/v1/commercial/usage` | 🔄 REFACTOR | ⚠️ ADD | ⚠️ ADD | ⚠️ ADD | NEEDS_WIRING |
| 52 | `/dashboard/vapt` | Authorized Pentesting Projects | Static / Hardcoded Array | `GET /api/v1/vapt/projects` | 🔄 REFACTOR | ✅ | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 53 | `/onboarding` | 7-Step Production Readiness Launcher | Static / Hardcoded Array | `GET /api/v1/dashboard/overview` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 54 | `/partner` | MSP Partner Directory & Portfolio | Static / Hardcoded Array | `GET /api/v1/partner/{id}/portfolio` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 55 | `/partner/settings/branding` | MSP White-Label Branding Studio | Static / Hardcoded Array | `GET /api/v1/assurance/branding` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 56 | `/partner/settings/domain` | Vanity Custom Domain & TLS Wizard | Static / Hardcoded Array | `GET /api/v1/assurance/custom-domains` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 57 | `/platform-admin` | Internal Platform Command 360 | Static / Hardcoded Array | `GET /api/v1/platform-admin/overview` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 58 | `/platform-admin/billing` | Platform Global Revenue & Invoices | Static / Hardcoded Array | `GET /api/v1/platform-admin/billing` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 59 | `/platform-admin/customers` | Tenant Directory & Health 360 | Static / Hardcoded Array | `GET /api/v1/platform-admin/customers` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 60 | `/platform-admin/first-customer` | First Customer Launch Review | Hybrid Fallback / Mock | `GET /api/v1/platform-admin/launch-readiness` | ✅ WIRED | ✅ | ✅ | ✅ | PRODUCTION |
| 61 | `/platform-admin/launch` | P0 Production Launch Gates | Real API Fetch | `GET /api/v1/platform-admin/launch-gates` | ✅ WIRED | ✅ | ⚠️ ADD | ✅ | PRODUCTION |
| 62 | `/platform-admin/providers` | Cloud & SaaS Providers Matrix | Hybrid Fallback / Mock | `GET /api/v1/platform-admin/providers-matrix` | ✅ WIRED | ✅ | ✅ | ✅ | PRODUCTION |
| 63 | `/platform-admin/sales` | Enterprise CRM Sales Pipeline | Hybrid Fallback / Mock | `GET /api/v1/platform-admin/sales` | ✅ WIRED | ✅ | ✅ | ✅ | PRODUCTION |
| 64 | `/platform-admin/services` | Managed Services Fulfillment Desk | Static / Hardcoded Array | `GET /api/v1/platform-admin/services-orders` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 65 | `/platform-admin/subscriptions` | Global SaaS Subscription Roster | Static / Hardcoded Array | `GET /api/v1/platform-admin/subscriptions` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 66 | `/platform-admin/support` | Internal Support Escalation Desk | Static / Hardcoded Array | `GET /api/v1/platform-admin/support` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 67 | `/platform-admin/system` | Cluster Health & Runbooks | Real API Fetch | `GET /api/v1/platform-admin/settings` | ✅ WIRED | ✅ | ✅ | ✅ | PRODUCTION |
| 68 | `/platform-admin/trials` | Active Customer Trials & Conversions | Static / Hardcoded Array | `GET /api/v1/platform-admin/trials` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 69 | `/pricing` | Public Commercial Tier Matrix | Static / Hardcoded Array | `GET /api/v1/commercial/plans` | 🔄 REFACTOR | ⚠️ ADD | ⚠️ ADD | ⚠️ ADD | NEEDS_WIRING |
| 70 | `/security` | Public Security Baseline & Controls | Static / Hardcoded Array | `GET /api/v1/public/v1/assurance/summary` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 71 | `/signup` | Self-Serve Enterprise Registration | Hybrid Fallback / Mock | `POST /api/v1/auth/register` | ✅ WIRED | ✅ | ✅ | ✅ | PRODUCTION |
| 72 | `/status` | Public Status Page & SLA | Static / Hardcoded Array | `GET /api/v1/platform-admin/status-incidents` | 🔄 REFACTOR | ⚠️ ADD | ✅ | ⚠️ ADD | NEEDS_WIRING |
| 73 | `/verify-email` | Email Verification Flow | Real API Fetch | `POST /api/v1/auth/verify-email` | ✅ WIRED | ✅ | ✅ | ✅ | PRODUCTION |

## Summary Audit Findings
- **Total Routes Audited:** 71
- **Fully Wired to Backend APIs:** 12 routes
- **Routes Requiring Real API Wiring & UX Consolidation:** 59 routes
- **Zero Tolerance Target:** Eliminate hardcoded dummy arrays across all production dashboards.
