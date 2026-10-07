# LaunchComply Sales Discovery Framework

**Objective:** Uncover technical and commercial readiness, identify urgent pain triggers, qualify intent, and map customer requirements to LaunchComply tiers or professional pilot packages.

---

## 1. Discovery Qualification Matrix (§44)

Before committing senior engineering resources to an architecture review or pilot, qualify the prospect against the BANT / MEDDIC criteria:

| Category | High Intent / Qualified Indicator | Disqualification Warning |
|---|---|---|
| **Codebase & Tech Stack** | Active GitHub/GitLab repository with Dockerfile or standard framework (React, Node, Python, Go, Java) | Proprietary legacy desktop code, no containerization, no Git |
| **Cloud Hosting Target** | Dedicated AWS account ready or willing to open one | Requires on-premise hardware or strictly bare-metal colocation |
| **Immediate Pain Trigger** | Upcoming enterprise deal blocked on SOC 2/ISO questionnaire, or production outage on unhardened hosting | Casual curiosity, student project, no production roadmap |
| **Decision Maker & Timeline** | Founder, CTO, or VP Eng present; deadline within 30 to 90 days | Intern or junior developer exploring with no timeline or authority |
| **Commercial Budget** | Budget available for Starter/Growth/Business tier (₹5k–₹50k/mo or $100–$600/mo) | Seeking permanently free hosting |

---

## 2. Structured Discovery Question Flow (§153)

### Section A: Current Application & Architecture
1. *"Can you tell me about the architecture of your application today? What frameworks, databases, and background services are you running?"*
2. *"Where is the application currently hosted? (e.g., Render, Heroku, DigitalOcean, manual EC2, Vercel?)"*
3. *"How are you currently handling staging versus production environments?"*
4. *"Do you currently use Infrastructure as Code (Terraform, CloudFormation, CDK), or are changes made manually through the console?"*

### Section B: Production Operational Challenges
5. *"What happens today when your team pushes code to production? What is your deployment rollback strategy if something breaks?"*
6. *"How are database snapshots, backups, and disaster recovery tested right now?"*
7. *"Have you experienced any downtime or performance bottlenecks during peak traffic?"*

### Section C: Enterprise Deals & Customer Requirements
8. *"What is driving this evaluation right now? Have you had a customer or prospect send over an enterprise security questionnaire or Vendor Due Diligence checklist?"*
9. *"Are enterprise buyers asking about specific certifications—such as ISO 27001, SOC 2 Type 1/Type 2, or DPDP compliance?"*
10. *"Do you have deals currently stalled in procurement waiting for a clean third-party Penetration Testing (VAPT) report?"*

### Section D: Security Posture & Vulnerability Management
11. *"When was the last time your team ran automated container vulnerability or SAST scans on your codebase?"*
12. *"How are application secrets, API keys, and database credentials currently managed in production?"*
13. *"Do you have automated WAF (Web Application Firewall) or DDoS mitigation active in front of your customer-facing endpoints?"*

### Section E: Timeline, Team, and Commercial Authority
14. *"What is your hard deadline for having your application live, secure, and compliant on AWS?"*
15. *"How many engineers are currently dedicating time to DevOps and infrastructure instead of building core product features?"*
16. *"Who else on your team will be involved in the technical validation and sign-off for this deployment?"*
17. *(Optional)* *"Do you have an allocated budget for cloud hosting and compliance readiness this quarter?"*

---

## 3. Opportunity Scoring & Routing Rules

- **Score 16–20 (High Priority / Pilot Candidate):**  
  Schedule immediate 45-minute Technical Architecture Discovery with CTO / Principal Architect. Offer White-Glove Managed Pilot.
- **Score 10–15 (Standard SaaS Evaluation):**  
  Direct to 14-day free trial on Growth tier with assisted Slack channel.
- **Score < 10 (Nurture / Low Intent):**  
  Send self-serve documentation, Production Readiness Checklist lead magnet, and invite to weekly group webinar.
