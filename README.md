# LaunchComply
**"From Localhost to Real Business."**
*Deploy. Secure. Audit. Comply.*

LaunchComply is an independent B2B SaaS platform and professional services ecosystem designed to take software applications from local development into secure, scalable, auditable, and enterprise-compliant AWS production environments.

---

## Capabilities Overview
1. **Application Analysis**: Framework, runtime, dependency, database, storage, worker, and security surface detection.
2. **Visual Architecture Canvas**: Interactive multi-tier AWS topology visualization with public/private network boundaries and component inspector.
3. **Downloadable Architecture Package**: Terraform IaC, architecture diagrams, data flow specs, and subprocessor registers.
4. **AWS Deployment Engine**: Secure STS cross-account IAM role assumption with least privilege, automated ECS/RDS/CloudFront orchestration, and streaming logs.
5. **Domain & TLS Management**: Route 53 DNS verification, ACM certificate provisioning, and HTTPS enforcement.
6. **Security Center & Controls**: Continuous monitoring across identity, network, encryption, database, secrets, and container posture.
7. **VAPT Lifecycle**: Automated security assessments combined with professional penetration testing workflows, CVSS 3.1 scoring, and "Fix with AI" patch recommendations.
8. **Compliance Readiness Hub**: Implementation workflows, evidence collection, and gap analysis for DPDP (India), ISO/IEC 27001, and SOC 2 Type II.
9. **Backup & Disaster Recovery**: Policy enforcement, RPO/RTO tracking, and automated restore verification logging.
10. **Evidence Vault & Subprocessor Registry**: Cryptographically verified audit artifacts and vendor risk tracking.
11. **Professional Services Marketplace**: High-touch architecture reviews, cloud migration, VAPT execution, and compliance advisory.

---

## Repository Structure
```
LaunchComply/
├── apps/
│   ├── api/        # FastAPI, Python 3.11, SQLAlchemy 2, Alembic, Pydantic v2
│   └── web/        # Next.js 15+ App Router, TypeScript, Tailwind CSS
├── docs/           # Architecture diagrams, specifications, threat models
└── docker-compose.yml
```

---

## Getting Started

### Backend (`apps/api`)
```bash
cd apps/api
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```

### Frontend (`apps/web`)
```bash
cd apps/web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view LaunchComply.
