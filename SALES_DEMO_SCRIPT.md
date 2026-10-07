# LaunchComply 20-Minute Sales Demo Script

**Target Audience:** Founder, CTO, VP Engineering, or Head of Compliance at early-to-growth stage SaaS companies.  
**Core Narrative:** *"From Localhost to Real Business. Deploy. Secure. Audit. Comply."*  
**Environment:** Use dedicated demo tenant (`demo.launchcomply.com`) with sample production repo `saas-fintech-core`.  
**Total Duration:** 20 minutes (15 min demo walkthrough + 5 min Q&A and next steps).

---

## 1. Opening & Framing (Minutes 00:00 – 02:00)

**Speaker:** *"Good morning/afternoon [Prospect Name]. Most SaaS teams spend 3 to 6 months and $100,000 trying to stitch together Terraform scripts, AWS IAM permissions, external penetration testing agencies, and compliance spreadsheets just to close their first enterprise customer.*

*Today, we're going to take a modern SaaS application from raw GitHub code to an audited, compliant, production-grade AWS infrastructure in under 15 minutes. Let's jump right in."*

---

## 2. Step 1: Connect Repository (Minutes 02:00 – 03:30)

**Screen:** `/onboarding/github` or Applications -> Connect Application  
**Speaker Action:** Select `github.com/launchcomply-demo/saas-fintech-core`.  
**Talking Point:**  
*"LaunchComply connects directly to your GitHub repository via fine-grained GitHub App permissions. It requires zero custom configuration files or DSLs to get started."*

---

## 3. Step 2: Analyze Stack (Minutes 03:30 – 05:00)

**Screen:** `/applications/demo-saas/overview`  
**Speaker Action:** Point out detected stack cards (Next.js 14, Python FastAPI, PostgreSQL, Redis).  
**Talking Point:**  
*"Within seconds, LaunchComply inspects your Dockerfiles, dependencies, and environment patterns. It detects your frontend runtime, API framework, database requirements, background task workers, and port bindings automatically."*

---

## 4. Step 3: Generate Production Architecture (Minutes 05:00 – 07:00)

**Screen:** `/architecture` & Architecture Graph Canvas  
**Speaker Action:** Expand the interactive diagram showing VPC, Private Subnets, ALB, ECS Fargate, Multi-AZ RDS, and ElastiCache.  
**Talking Point:**  
*"Rather than copying outdated Medium blog posts or raw Terraform scripts, LaunchComply synthesizes a hardened, enterprise-ready cloud architecture adhering to the AWS Well-Architected Framework. Notice the clear network isolation: your database and cache sit in private isolated subnets with zero internet exposure."*

---

## 5. Step 4: Deploy to AWS (Minutes 07:00 – 09:00)

**Screen:** `/releases` & Deployment Execution Log  
**Speaker Action:** Show live pipeline step progression: Stack Validation -> ECR Build -> RDS Provisioning -> ECS Rolling Update.  
**Talking Point:**  
*"Deployment happens directly inside your own AWS account using secure cross-account STS roles. LaunchComply never holds permanent root credentials to your infrastructure. You retain 100% cloud ownership and zero vendor lock-in."*

---

## 6. Step 5: Operations & Health Monitoring (Minutes 09:00 – 10:30)

**Screen:** `/operations` & System Monitoring  
**Speaker Action:** Hover over live CPU, memory utilization, request rates, p95 latency, and automated backup schedules.  
**Talking Point:**  
*"Once live, your operations dashboard gives you real-time visibility into cluster health, container restarts, and database metrics without setting up third-party agents."*

---

## 7. Step 6: Automated Security Baseline (Minutes 10:30 – 12:00)

**Screen:** `/security` & Vulnerability Overview  
**Speaker Action:** Filter findings by severity (Critical: 0, High: 0, Medium: 2) and click into a remediated finding.  
**Talking Point:**  
*"Security cannot be an afterthought. LaunchComply continuously scans container images, dependencies, and infrastructure configurations against CIS Benchmarks. You know your exact security posture before your customers even ask for it."*

---

## 8. Step 7: Authorized VAPT (Minutes 12:00 – 13:30)

**Screen:** `/security/vapt` & Penetration Test Reports  
**Speaker Action:** Show signed Rules of Engagement (RoE) badge and download sample Executive VAPT Summary PDF.  
**Talking Point:**  
*"When enterprise buyers ask, 'Have you conducted third-party penetration testing?', you don't need to scramble for a 4-week manual agency quote. LaunchComply coordinates authorized DAST, OWASP Top 10 scans, and certified reporting directly from the platform."*

---

## 9. Step 8: Compliance Readiness (Minutes 13:30 – 15:00)

**Screen:** `/compliance` & ISO 27001 / SOC 2 Readiness Matrices  
**Speaker Action:** Show control fulfillment percentage (e.g., 94% compliant) and automated evidence linkage.  
**Talking Point:**  
*"This is where the magic happens. Because LaunchComply manages both the infrastructure deployment and security controls, your compliance evidence is collected automatically. Encryption at rest, automated backups, IAM least privilege, and TLS configurations are verified with real cryptographic proof."*

---

## 10. Step 9: Continuous Assurance & Auditor Workspace (Minutes 15:00 – 16:30)

**Screen:** `/auditor-workspace` & Continuous Assurance  
**Speaker Action:** Switch to Auditor View showing read-only evidence vaults.  
**Talking Point:**  
*"You can invite your external auditor directly into a dedicated, read-only Auditor Workspace. They inspect real live evidence instead of asking you for 400 screenshots over email."*

---

## 11. Closing & Next Steps Call-to-Action (Minutes 16:30 – 20:00)

**Speaker:** *"To summarize: We started with a GitHub repository. We now have a production AWS cluster, zero critical security findings, a certified VAPT report, and a live ISO 27001 readiness workspace.*

*For our first customer cohort, our team conducts white-glove guided onboarding to deploy your actual application within 7 business days.*

*Would you like to schedule your architecture discovery session for this Thursday or Friday?"*
