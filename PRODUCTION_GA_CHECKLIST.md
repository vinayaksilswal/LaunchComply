# Launch gates

Current decision: **NO_GO for public customers**. Vercel/Render is the private owner testing stage. Hosting configuration is ready for provider review; meaningful application dogfood is blocked by incomplete real integrations.

| Gate | Status | Evidence | Owner | Blocker / next action |
| --- | --- | --- | --- | --- |
| Local backend regression | PASS | 181 tests, isolated SQLite | Engineering | No claim of complete security coverage. |
| Frontend lint/type/build | PASS WITH WARNINGS | Zero lint errors, two hook warnings; type check and production build pass | Engineering | Resolve warnings as affected pages are repaired. |
| Browser regression | FAIL | 29 passed / 57 failed; final targeted desktop auth 2 passed | Engineering | Repair 15 desktop failures; run mobile in a supported environment (42 library-blocked cases). |
| Clean migrations + representative upgrade | PASS ON SQLITE | Clean head/schema parity; preserved representative user | Engineering | Verify the complete chain against PostgreSQL. |
| Existing local database | FAIL | Head-stamped but missing required tables; copied rehearsal fails | Engineering + owner | Preserve original; select fresh hosted DB or reviewed data recovery. Never stamp to conceal missing schema. |
| Hosted API/frontend/Postgres | UNVERIFIED | Configuration only | Owner + engineering | Create reviewed hosting services, then run live smoke and migration acceptance. |
| Hosted startup and honest DB health | PASS LOCALLY | Configuration/schema gates and actual readiness probe | Engineering | Confirm with hosted DB and failure rehearsal. |
| Password reset token boundary | FIXED LOCALLY | Before-fix reproduction; regression and independent review | Engineering | Public reset stays unavailable until actual trusted email delivery works. |
| Signup, verification and transactional email | BLOCKED | Origin/auth fixes; no real delivery dispatcher | Engineering + owner | Implement delivery, then verify complete hosted lifecycle. |
| GitHub/AWS/build/release owner journey | BLOCKED | Mock source control and canned AWS/build behavior identified | Engineering | Replace fixture execution with actual provider calls; isolate all remaining simulations. |
| Tenant isolation, RBAC, MFA and rate limits | PARTIAL | Existing tests; not complete endpoint review | Engineering | Negative authorization tests, stronger administrator auth and review. |
| Dependency/security review | FAIL / INCOMPLETE | npm audit: 11 entries; local Python audit: 23 entries | Engineering | Assess deployed dependency graph and fix applicable issues; complete secret/container/IaC/security reviews. |
| Durable jobs and queue recovery | BLOCKED | In-process background tasks; no durable consumer | Engineering | Implement persistence, retries and restart acceptance. |
| Backup + isolated restore | UNVERIFIED | No external evidence | Owner + engineering | Verify restored schema/data and measure recovery. |
| Owner application #1 and #2 | UNVERIFIED | No real deployment evidence | Owner + engineering | Normal UI journey with distinct architectures; record manual intervention. |
| AWS platform migration | UNVERIFIED | Cutover runbook only | Owner + engineering | Rehearse DB/artifact transfer, stable secrets, smoke and recovery before cutover. |
| Limited B2B beta | NO_GO | Owner journey and recovery unproven | Owner + engineering | Close critical integration/auth/data/security/support gates. |
| Enterprise GA | NO_GO | No external acceptance or measured service evidence | Owner + engineering | Complete operational, security, contractual and customer acceptance gates. |
| SEO, analytics, legal and support | UNVERIFIED | Local pages only | Owner + engineering | Hosted crawl/funnel checks, reviewed terms and working support contacts. |
