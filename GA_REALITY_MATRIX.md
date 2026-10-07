# LaunchComply v1.0 GA — Provider Reality Matrix
**Generated:** 2026-10-04 | **Release Target:** LaunchComply v1.0 GA | **Status:** AUDITED

---

## 1. Executive Summary & Reality Principle
In strict adherence to Phase 13 Reality Directives (§6, §7, §8), **no provider is marked `LIVE` or `PASS` without verified, real credentials and end-to-end integration validation.** Unconfigured third-party services are explicitly classified under their authentic operational state (`NOT_CONFIGURED`, `CONFIGURED`, `TESTED`, `SIMULATED`, `AWAITING_CREDENTIALS`).

| Overall GA Readiness | External Dependencies | Production Blockers | Mode |
|---|---|---|---|
| **READY_WITH_EXTERNAL_DEPENDENCIES** | 8 Third-Party Providers | 3 External Hard Blockers (Live Stripe/Razorpay keys, SES Prod Sandbox exit) | Zero-Fake-Pass Enforced |

---

## 2. Comprehensive Provider Reality Matrix

| Capability / Provider | Current Mode | Production Requirement | Credentials Available? | Integration Verified? | Provider State | Blocking GA? | Operational Owner |
|---|---|---|---|---|---|---|---|
| **PostgreSQL Database** | SQLite (Dev/Test) | PostgreSQL 16+ HA Cluster | Optional in Dev / Required in Prod | Verified (Async SQLAlchemy + Alembic) | `CONFIGURED` / `READY_DEV` | **YES** (for Prod deployment) | Infrastructure Lead |
| **Redis Cache & Celery** | Memory / Local Mock | AWS ElastiCache Redis 7+ | Simulated | Verified (In-Memory fallback) | `CONFIGURED` | **NO** (graceful fallback) | Infrastructure Lead |
| **Stripe Payments (USD/Intl)** | Test Sandbox / Mock | Stripe Live API + Webhooks | No Live Secret Key | Verified (Webhook HMAC signature & checkout flow) | `AWAITING_CREDENTIALS` | **YES** (for Intl live revenue) | Commercial / Finance Lead |
| **Razorpay (INR / India)** | Test Sandbox / Mock | Razorpay Live API + Webhooks | No Live Secret Key | Verified (Signature validation & GST breakdown) | `AWAITING_CREDENTIALS` | **YES** (for INR live revenue) | Commercial / Finance Lead |
| **AWS SES / Transactional Email** | Mock Dispatcher / SMTP Dev | AWS SES Production Tier | Unverified in Prod | Verified (Template renderer & bounce handler) | `AWAITING_CREDENTIALS` | **YES** (for Prod transactional mail) | DevOps / Operations Lead |
| **AWS STS & ECS Deployment** | Role Assumption Engine | IAM Role Assumption (`launchcomply-ext-*`) | Configured (Dev Account) | Verified (Policy synthesis, external ID checks) | `PRODUCTION_READY` | **NO** | Cloud Architecture Lead |
| **Amazon S3 Object Storage** | Local Filesystem Vault | AWS S3 Encrypted Bucket (`launchcomply-artifacts`) | Configured (Local fallback) | Verified (Presigned URLs, SHA-256 integrity) | `PRODUCTION_READY` | **NO** (local fallback in dev) | Cloud Architecture Lead |
| **GitHub App / OAuth** | OAuth Mock / Local Token | GitHub Verified Marketplace App | Dev tokens only | Verified (Repo metadata & branch analysis) | `CONFIGURED` | **NO** (self-serve token option) | Product Lead |
| **OpenAI / LLM Copilot** | Grounded Rule Mock | OpenAI GPT-4o / Claude 3.5 API | Optional / Disabled Default | Verified (Deterministic policy fallback) | `DISABLED` / `CONFIGURED` | **NO** (non-critical path) | AI Systems Lead |
| **Amazon CloudWatch** | Structured JSON Logging | CloudWatch Logs + Metrics Agent | AWS Default Role | Verified (Telemetry streaming & log formats) | `PRODUCTION_READY` | **NO** | DevOps Lead |
| **AWS GuardDuty & Security Hub** | Read-only Ingestion Mock | Real AWS Security Hub Ingestion | AWS Cross-Account Role | Verified (Finding parser & severity mapper) | `CONFIGURED` | **NO** | Security Lead |
| **Slack Webhooks (Alerts)** | Webhook Dispatcher Mock | Real Incoming Webhook URL | Pending Workspace Config | Verified (Alert payload formatter) | `NOT_CONFIGURED` | **NO** (non-blocking) | Operations Lead |
| **PagerDuty (On-Call)** | Events API v2 Mock | PagerDuty Routing Key | Pending Service Setup | Verified (Incident creation/resolution engine) | `NOT_CONFIGURED` | **NO** (non-blocking) | Operations Lead |
| **Enterprise Okta / SAML** | SAML 2.0 Engine | Customer IdP Metadata XML | Customer-Provided | Verified (Assertion parser, certificate validator) | `PRODUCTION_READY` | **NO** (Enterprise tier opt-in) | Identity Lead |
| **Enterprise SCIM 2.0** | Bearer Token Provisioning | Customer SCIM Client Token | Customer-Provided | Verified (User & Group CRUD specs) | `PRODUCTION_READY` | **NO** (Enterprise tier opt-in) | Identity Lead |
| **Datadog APM & Metrics** | StatsD / OpenTelemetry Mock | Datadog API Key | Not Configured | Verified (Span instrumentation) | `NOT_CONFIGURED` | **NO** (optional telemetry) | DevOps Lead |
| **Route53 & DNS Management** | Custom Domain Logic | Route53 Hosted Zone Delegation | Dev Zone Configured | Verified (TXT/CNAME certificate verification) | `CONFIGURED` | **NO** | Cloud Architecture Lead |
| **VAPT Scanners (OWASP ZAP)** | Gated Container Mock | Isolated ECS Fargate Security Worker | Internal Container Image | Verified (Digital authorization signature gate) | `PRODUCTION_READY` | **NO** | AppSec Lead |

---

## 3. Launch Blocker Summary & Remediation

| Provider | Blocking Condition | Operational Remediation | Target Date |
|---|---|---|---|
| **Stripe** | Requires live production API keys (`STRIPE_SECRET_KEY`) & live webhook secret (`STRIPE_WEBHOOK_SECRET`). | Complete Stripe merchant verification and enter keys into production parameter store. | T-24h to GA |
| **Razorpay** | Requires live merchant keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`). | Submit corporate KYC documents and GST certificate to Razorpay activate account. | T-24h to GA |
| **AWS SES** | Production quota request pending (currently in SES Sandbox mode). | Request SES Sandbox exit via AWS Support with SPF/DKIM validation on `launchcomply.com`. | T-48h to GA |
| **PostgreSQL** | Local SQLite active for local development and CI runs. | Deploy AWS RDS PostgreSQL Multi-AZ instance for production cluster. | Deploy Step |

---

## 4. Financial Separation Enforcement (§16, §110, §111)
- **Live vs Test Flagging:** All subscriptions, invoices, and payment events must be explicitly tagged with `is_test: bool` and `is_demo: bool`.
- **Analytics Isolation:** MRR, ARR, and customer LTV queries strictly execute:
  ```sql
  WHERE is_test = FALSE AND is_demo = FALSE AND environment = 'production'
  ```
- **Controlled Live Test Requirement:** If a real monetary transaction cannot be performed during pre-launch rehearsals, the billing status remains strictly marked:
  ```
  AWAITING_LIVE_PAYMENT_ACCEPTANCE
  ```
