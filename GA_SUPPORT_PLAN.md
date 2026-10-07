# LaunchComply GA Support Operations Plan

**Commitment:** Enterprise-grade support from Day 1 of General Availability.  
**Support Email:** `support@launchcomply.com`  
**Security Disclosure:** `security@launchcomply.com`  
**Status Page:** `https://status.launchcomply.com`

---

## 1. Initial Launch Staffing Model (§203)

For the initial GA launch phase, operational efficiency requires cross-functional roles while maintaining crystal-clear ownership and accountability:

| Duty / Role | Primary Assigned Lead | Secondary Backup | Coverage Hours |
|---|---|---|---|
| **Tier 1 & 2 Support Desk** | Customer Success Specialist | Senior Backend Engineer | 09:00 – 21:00 IST (Mon–Sat) |
| **Urgent & P0 Incident Escalation** | On-Call Platform Engineer | CTO | 24/7/365 via PagerDuty |
| **Cloud & Deployment Assistance** | Cloud Architect Lead | DevOps Specialist | 10:00 – 19:00 IST |
| **Billing & Commercial Queries** | Operations Lead | Revenue Operations | 10:00 – 18:00 IST |
| **Security Disclosures** | Head of Security | Compliance Lead | 24/7 (< 2h initial acknowledgment) |

---

## 2. Service Level Agreement (SLA) Targets (§81)

All inbound support requests are categorized upon ingestion with hard SLA clocks:

| Severity Level | Definition & Criteria | Target First Response | Target Resolution |
|---|---|---|---|
| **P0 - Urgent / Critical** | Production deployment down, data corruption, total API outage, active security incident | **< 1 Hour** (24/7) | < 4 Hours |
| **P1 - High Priority** | Staging deployment blocked, billing webhook failure, failed automated security scan | **< 4 Hours** (Business Hours) | < 24 Hours |
| **P2 - Normal** | How-to questions, architecture guidance, compliance evidence collection inquiries | **< 12 Hours** | < 48 Hours |
| **P3 - Low** | Feature requests, minor UI cosmetic feedback, documentation suggestions | **< 24 Hours** | Backlog Triage |

---

## 3. Support Response Macros & Knowledge Base Links (§78, §79)

Support engineers utilize standardized, security-reviewed response macros to ensure consistent and accurate customer guidance:

### Macro 1: AWS STS Connection Troubleshooting
- **Trigger:** Customer STS AssumeRole fails with `AccessDenied` or external ID mismatch.
- **Response:**
  > *"Hello [Name], thank you for reaching out. It looks like the AWS STS Trust Policy in your target AWS account may be missing our LaunchComply External ID or the required `sts:AssumeRole` principal.  
  > Please follow our step-by-step verification guide here: [docs.launchcomply.com/aws/sts-troubleshooting](https://docs.launchcomply.com/aws/sts-troubleshooting).  
  > Ensure that the External ID matches the unique token displayed in your LaunchComply Cloud Settings."*

### Macro 2: DNS & Custom Domain SSL Propagation
- **Trigger:** CloudFront / ALB custom domain verification pending.
- **Response:**
  > *"Hello [Name], ACM certificates require CNAME validation records in your DNS provider (e.g., Route53, Cloudflare, or GoDaddy).  
  > You can find the exact CNAME name and target values in your Application Settings -> Custom Domains. Full guide: [docs.launchcomply.com/networking/custom-domains](https://docs.launchcomply.com/networking/custom-domains)."*

### Macro 3: Authorized VAPT Authorization & Rules of Engagement
- **Trigger:** Customer requesting penetration testing execution.
- **Response:**
  > *"Hello [Name], before LaunchComply initiates any automated or assisted DAST/VAPT security scans, an authorized company officer must sign our digital Rules of Engagement (RoE).  
  > Please review and sign the RoE in your Security Dashboard -> VAPT -> Authorize Scan: [docs.launchcomply.com/security/vapt-rules-of-engagement](https://docs.launchcomply.com/security/vapt-rules-of-engagement)."*

---

## 4. Support to Product Feedback Loop (§80)

Customer support tickets represent the highest-fidelity signal for product improvement:
1. Every resolved ticket can be converted with 1-click in Platform Admin into a structured `CustomerFeedback` record.
2. Categorized as: `BUG`, `UX`, `FEATURE`, `DOCUMENTATION`, `PRICING`, or `PERFORMANCE`.
3. High-frequency support tags are reviewed weekly by the product engineering team to eliminate recurring customer friction.

---

## 5. Platform Incident Communication & Status Page Updates (§83, §84)

During any platform degradation or external provider outage (e.g., AWS us-east-1 issue or Stripe API latency):
1. **Status Incident Creation:** On-call engineer posts an incident on `status.launchcomply.com` with state `INVESTIGATING` within 10 minutes.
2. **Customer-Safe In-App Banners:** Platform displays a contextual, non-alarmist warning banner (e.g., *"Stripe checkout is currently experiencing intermittent latency. Active production applications and monitoring are unaffected."*).
3. **Status Subscriptions:** Automated email notifications are dispatched to registered status page subscribers.
4. **Resolution Notice:** Once verified, update state to `RESOLVED` and publish a brief root-cause summary.
