# LaunchComply Canonical Business & Commercial Metric Definitions

**Standard:** Commercial Source of Truth & Financial Integrity Standard  
**Effective Date:** October 2026 (Phase 14 Post-GA Operating Standard)  
**Governance:** Finance, Revenue Operations, and Customer Success  

---

## 1. Commercial Source of Truth & Customer Classifications (§3, §4, §155)

Every customer organization in LaunchComply is unambiguously classified into one of the following canonical classifications:

| Classification | Definition | Revenue Inclusion Rule |
|---|---|---|
| **REAL_CUSTOMER** | Verified external commercial entity operating genuine business workloads. | Eligible for commercial analytics upon paid transaction. |
| **PAID_CUSTOMER** | Customer with a verified live gateway charge or an authorized reconciled invoice. | **Included in Live MRR & Paid Count**. |
| **PILOT_CUSTOMER** | Customer engaged in a white-glove deployment/compliance pilot under contract. | Service fees counted; recurring counted only if reconciled. |
| **TEST_CUSTOMER** | Sandbox, QA, or staging accounts used for testing features or APIs. | **STRICTLY EXCLUDED** from Live MRR, ARR, and real funnels. |
| **DEMO_CUSTOMER** | Showcase workspace (e.g., `demo.launchcomply.com`) with synthetic assets. | **STRICTLY EXCLUDED** (MRR = ₹0.00 pinned). |
| **INTERNAL_CUSTOMER** | LaunchComply team dogfooding environments and internal administrative workspaces. | **STRICTLY EXCLUDED** from external business traction. |
| **CHURNED_CUSTOMER** | Former paid customer who cancelled or failed renewal beyond grace period. | Excluded from active MRR; tracked in churn cohort. |

---

## 2. Canonical Definition of Paid Customer (§4)

A customer organization shall **only** be designated as a `PAID_CUSTOMER` when meeting at least one of the following four criteria with complete financial provenance:

1. **Verified Live Payment Gateway Transaction:** A successful charge processed through live Stripe or live Razorpay with a verified webhook ID, provider payment ID, and zero chargeback/dispute.
2. **Reconciled Invoice-Only Payment:** An issued commercial/tax invoice with a recorded bank transaction reference number (e.g., UTR / Wire Ref), verified amount, reconciliation timestamp, and designated finance officer sign-off.
3. **Verified Offline Enterprise Wire/NEFT/RTGS:** Reconciled bank transfer matched against a signed Service Order or Master Services Agreement (MSA).
4. **Approved Revenue Contract:** Legally binding enterprise agreement with formal accounting revenue recognition basis.

> **CRITICAL RULE:**  
> A test gateway checkout, seeded demo subscription, or administrative manual status toggle (`status = ACTIVE`) without an underlying reconciled payment record **NEVER** constitutes a Paid Customer.

---

## 3. Revenue Provenance Standard (§5, §6, §7)

Every single currency unit (INR ₹ or USD $) included in commercial reporting must be fully traceable through the following 6-stage provenance chain:

$$\text{Organization} \longrightarrow \text{Subscription / Service Order} \longrightarrow \text{Invoice} \longrightarrow \text{Payment} \longrightarrow \text{Payment Source} \longrightarrow \text{Reconciliation State}$$

### Payment Sources (§6)
- `STRIPE`: Live Stripe automated card, ACH, or SEPA charge.
- `RAZORPAY`: Live Razorpay UPI, NetBanking, card, or auto-debit charge.
- `BANK_TRANSFER`: Offline NEFT, RTGS, IMPS, or international SWIFT wire.
- `MANUAL_INVOICE`: Enterprise direct corporate invoicing with purchase order (PO).
- `CREDIT`: Authorized promo or cloud credit explicitly backed by marketing budget.
- `OTHER_APPROVED`: Custom board-approved commercial arrangement.
- `TEST`: Sandbox transaction (Stripe Test Clock or Razorpay Test Keys).
- `DEMO`: Synthetic demonstration payment.

### Payment Reality States (§7)
- `UNVERIFIED`: Transaction initiated but not yet settled or verified by gateway webhook.
- `TEST`: Executed in non-production sandbox; never admitted to realized revenue.
- `PENDING`: Awaiting bank settlement, clearinghouse confirmation, or webhook delivery.
- `RECONCILED`: Formally matched, verified against bank statement or live gateway settlement report. Only `RECONCILED` enters realized revenue.
- `FAILED`: Declined or terminal gateway error.
- `REFUNDED`: Fully or partially returned to customer; deducted from collected receipts.
- `VOID`: Cancelled prior to settlement.

---

## 4. Primary Recurring Revenue Metrics (§11, §12)

### Monthly Recurring Revenue (MRR)
- **Definition:** The total normalized recurring subscription fees contracted and collected from active, verified `PAID_CUSTOMER` accounts for a 30-day period.
- **Normalization Formula:**
  $$\text{MRR} = \sum \text{Monthly Subscription Fees} + \sum \left( \frac{\text{Annual Subscription Fees}}{12} \right)$$
- **Explicit Inclusions:** Active recurring platform tiers (Starter, Growth, Business, Enterprise Platform Core).
- **Explicit Exclusions:**
  - One-time Professional Services (VAPT, AWS Deployment advisory, ISO 27001 readiness packages).
  - Test and sandbox subscriptions.
  - Demo accounts.
  - Setup and onboarding fees.
  - Unpaid or past-due invoices beyond grace period.
  - Free trials and trial extensions.
  - Refunds, chargebacks, and credits.

### Annual Run Rate / Annual Recurring Revenue (ARR)
- **Definition:** The 12-month forward-looking projection of currently active recurring subscription commitments:
  $$\text{ARR} = \text{MRR} \times 12$$
- **Rule:** One-time consulting projects, annual service contracts without automatic renewal, and non-recurring migration packages must **never** be lumped into ARR.

### Professional Services Revenue (§59, §78)
- **Definition:** Non-recurring revenue realized from delivery of specialized engineering and compliance packages (e.g., Assisted Cloud Deployment, Third-Party Penetration Testing, Audit Facilitation).
- **Rule:** Reported on a separate line item from SaaS subscription MRR to prevent distorted valuation multiples.

---

## 5. Efficiency and Customer Economics (§80, §81, §82)

### Average Revenue Per Account (ARPA) / Average Revenue Per User (ARPU)
- **Definition:** Average monthly subscription revenue generated across active paid customer accounts:
  $$\text{ARPA} = \frac{\text{Live MRR}}{\text{Count of Active Paid Customers}}$$
- **Sample Size Requirement:** Must always state sample size ($n$). If $n < 5$, label as *"Emerging / Small Sample ($n=X$)"*.

### Customer Lifetime Value (LTV) Governance
- **Prohibition:** Estimating LTV as a multiple of early ARR without historical churn data is deceptive.
- **Interim Phase 14 Metric:** Label early estimates as **"Projected 12-Month Subscription Value"** or **"Annual Contract Value (ACV)"**.
- **True LTV Standard:** True LTV will only be calculated once at least 6 months of observed retention, cohort decay, and gross margin data exist:
  $$\text{True LTV} = \frac{\text{ARPA} \times \text{Gross Margin \%}}{\text{Monthly Churn Rate}}$$

---

## 6. Lifecycle & Conversion Metrics (§38, §39, §40)

LaunchComply strictly maintains **two separate funnels**:

### A. Commercial Sales Funnel
Measures prospective buyer qualification and sales cycle velocity:
$$\text{Lead} \longrightarrow \text{Qualified} \longrightarrow \text{Demo Conducted} \longrightarrow \text{Trial Activated} \longrightarrow \text{Proposal Sent} \longrightarrow \text{Closed Won} \longrightarrow \text{Reconciled Payment} \longrightarrow \text{Retained}$$

### B. Product Activation Funnel
Measures technical onboarding milestone achievement:
$$\text{Signup} \longrightarrow \text{Email Verified} \longrightarrow \text{Repo Connected} \longrightarrow \text{Analysis Completed} \longrightarrow \text{Architecture Approved} \longrightarrow \text{AWS STS Connected} \longrightarrow \text{Production Deployed} \longrightarrow \text{Security Baseline} \longrightarrow \text{Compliance Active}$$

> **Separation Rule (§40):** The Commercial Sales Funnel and Product Activation Funnel must never be averaged into a single misleading conversion percentage.

---

## 7. Retention & Cohort Maturity (§83, §84)

- **Unmatured Cohorts:** Cohort retention matrices must mark future, unelapsed calendar months as **`N/A / NOT MATURED`**. Fabricating or assuming 100% future retention is strictly prohibited.
- **Churn Metric:** Count of cancelled paid customers divided by starting paid customer base at the beginning of the monthly period.
