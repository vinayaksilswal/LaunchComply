# LaunchComply — Independent Auditor Guide
*Workpapers, Cryptographic Evidence Chains & Audit Engagements.*

---

## 1. Overview for External Auditors & CPA Firms
LaunchComply provides external SOC 2, ISO 27001, and DPDP auditors with a secure, read-only audit workspace to inspect operational evidence, formulate workpapers, and communicate with compliance officers without accessing customer secrets.

---

## 2. Auditor Portal Access
- Auditor access is granted via time-bound, cryptographically signed tokens.
- Enter your portal link or access token at `/audit`.
- Access is strictly read-only for infrastructure configurations and sensitive tenant credentials.

---

## 3. Cryptographic Evidence Vault & Chain Verification
- Evidence collected by automated audit bots is hashed using SHA-256 and chained sequentially:
  $$\text{Hash}_n = \text{SHA-256}(\text{Index}_n \parallel \text{Hash}_{n-1} \parallel \text{PayloadHash}_n \parallel \text{Timestamp}_n)$$
- Auditors can independently verify chain integrity via `/dashboard/assurance/evidence` or the public assurance API.
- Any unauthorized post-collection mutation immediately breaks the chain integrity calculation.

---

## 4. Auditor Workpapers & Statistical Sampling
- Navigate to `/audit/workpapers`.
- Create a new workpaper bound to a control (e.g. `CC6.1` or `A.8.24`) and an audit period (e.g. `2026-Q3`).
- Select sampling methodology:
  - **Random Sampling**
  - **Stratified Sampling**
  - **Exhaustive Population Sampling**
- Document test procedures, observed exceptions, and audit conclusions.
- Collaborate directly with compliance managers using threaded comments on `/audit/workpapers`.
