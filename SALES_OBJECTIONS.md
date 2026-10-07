# LaunchComply Sales Objection Handling Guide

**Positioning:** Integrated Lifecycle — *Architecture -> Deployment -> Security -> VAPT -> Compliance -> Continuous Assurance.*  
**Core Rule (§155):** Never make unsupported claims. Differentiate on end-to-end integration and eliminating the friction between disconnected point solutions.

---

## 1. Top Objections & Structured Battlecards (§154)

### Objection 1: *"We already use AWS."*
- **Prospect Mindset:** *"We opened an AWS account and have an EC2 instance or ECS cluster running. Why do we need LaunchComply?"*
- **Strategic Response:**  
  *"Having an AWS account is just the raw canvas. The question enterprise buyers will ask is: Is your AWS environment hardened according to the AWS Well-Architected Framework? Is your database isolated in private subnets? Are automated daily snapshots validated? Are container images scanned for CVEs before deployment?*  
  *LaunchComply doesn't replace your AWS account—it connects directly to your existing AWS account via secure STS roles to turn raw cloud resources into an audited, secure, production-grade deployment with continuous compliance evidence."*

---

### Objection 2: *"We already write our own Terraform scripts."*
- **Prospect Mindset:** *"Our developers write HCL and maintain a GitHub repo of Terraform modules."*
- **Strategic Response:**  
  *"Terraform is powerful, but hand-written scripts rot quickly as cloud APIs evolve, state files drift, and security best practices change. Who ensures that every new S3 bucket or RDS cluster provisioned by your team adheres to SOC 2 encryption and IAM least-privilege standards?*  
  *LaunchComply automatically synthesizes and manages enterprise-grade infrastructure directly from your application dependencies. You get the benefits of IaC without spending 20 hours a month debugging provider version conflicts and drift."*

---

### Objection 3: *"We already use Vanta / Drata / Sprinto."*
- **Prospect Mindset:** *"We have a compliance automation tool checking our checklists."*
- **Strategic Response:**  
  *"Tools like Vanta and Drata are great auditor checklist dashboards, but they are passive monitors—they observe your infrastructure after the fact and flag 40 red warnings when something is misconfigured. When a warning appears, who actually fixes your VPC routing, rotates your KMS keys, or patches your Dockerfiles? Your engineers still have to do all the heavy lifting.*  
  *LaunchComply is proactive: we build and deploy the compliant infrastructure from day one. You never have compliance drift because your production environment was deployed correctly by design. Furthermore, LaunchComply handles your actual deployments and VAPT, which pure compliance scanners don't touch."*

---

### Objection 4: *"We have an in-house DevOps engineer."*
- **Prospect Mindset:** *"We don't need a platform; our DevOps person handles this."*
- **Strategic Response:**  
  *"Your DevOps engineers are one of your highest-cost, most specialized engineering assets. Do you want them spending weeks building custom deployment pipelines, writing compliance evidence scripts, and filling out vendor questionnaires—or building internal platform tooling, optimizing performance, and accelerating product shipping?*  
  *LaunchComply acts as a force multiplier for your DevOps team, giving them a production-ready baseline so they can focus on high-leverage product engineering."*

---

### Objection 5: *"Why should we grant LaunchComply access to our AWS account?"*
- **Prospect Mindset:** *"Security concern: granting third-party access to cloud infrastructure."*
- **Strategic Response:**  
  *"That is exactly the right question to ask, and security is our foundational principle. LaunchComply never asks for root credentials or permanent IAM user secret keys. We connect using an AWS STS AssumeRole with fine-grained cross-account permissions scoped strictly via external IDs.*  
  *All actions are logged in your AWS CloudTrail and LaunchComply audit logs. You retain 100% ownership of your infrastructure, data, and encryption keys, and you can revoke the STS role at any moment with one click in the AWS console."*

---

### Objection 6: *"Can LaunchComply legally certify us for ISO 27001 or SOC 2?"*
- **Prospect Mindset:** *"Will buying LaunchComply give me an accredited certificate directly?"*
- **Strategic Response:**  
  *"Under ISO and AICPA standards, accredited certifications and SOC 2 audit reports must be issued by independent, accredited CPA firms or certification bodies to ensure objectivity. No software vendor can legally certify you directly.*  
  *LaunchComply provides the complete technical control implementation, continuous evidence collection, and automated audit package. We partner with accredited auditors who access your read-only Auditor Workspace to complete your audit in days instead of months, at a fraction of traditional audit preparation costs."*

---

### Objection 7: *"Can you perform our third-party VAPT?"*
- **Prospect Mindset:** *"Does LaunchComply do penetration testing or do we need an external agency?"*
- **Strategic Response:**  
  *"Yes. LaunchComply conducts authorized, automated, and assisted Penetration Testing adhering to OWASP Top 10 and NIST SP 800-115 standards. Before any scan runs, we execute an explicit, legally binding digital Rules of Engagement (RoE). You receive certified executive summaries and technical remediation findings ready to share with enterprise customers."*

---

## 2. Competitive Positioning Matrix (§155)

| Capability | Generic Cloud (Heroku / Render) | Compliance Checkers (Vanta / Drata) | Manual Agency / Consultants | LaunchComply |
|---|---|---|---|---|
| **Production AWS Deployment** | Shared multi-tenant | None (Monitor only) | 6–12 weeks manual setup | **Built-in (Automated STS)** |
| **Data & Cloud Ownership** | Locked in vendor cloud | Customer cloud | Customer cloud | **100% Customer AWS Account** |
| **Security Baseline & SAST** | Basic/Limited | Scan only | Extra consulting fee | **Continuous CIS & CVE Scans** |
| **Authorized VAPT** | None | Partner referral | $5,000–$15,000 per test | **Integrated Platform VAPT** |
| **Compliance Readiness** | None | Checklist monitoring | Manual spreadsheets | **Automated Evidence Vault** |
| **Auditor Workspace** | None | Yes | None | **Live Evidence Verification** |
| **Deployment Rollback** | Basic | None | Manual | **Zero-Downtime Rollback** |
