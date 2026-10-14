# LaunchComply

Implementation entry point: [architecture programme](docs/implementation/README.md),
[ordered work packages](docs/implementation/WORK_PACKAGES.md) and
[continuation state](docs/implementation/state.json). The 14 October 2026 plan
separates reviewed design, controlled AWS deployment, operations and enterprise
release gates; it does not declare those releases complete.

**"From Localhost to Real Business."**
*Deploy. Secure. Audit. Comply.*

LaunchComply is an independent B2B SaaS platform and professional services ecosystem designed to take software applications from local development into secure, scalable, auditable, and enterprise-compliant AWS production environments.

---

## Capabilities Overview
1. **Source evidence**: Multiple GitHub repositories or uploaded code, bounded dependency/source inspection and explicit inferred connections.
2. **Architecture workspace**: Editable AWS diagrams, network planning, workload scaling decisions, undo/redo and saved versions. Current graph limits are 80 components and 160 connections.
3. **AI review and scoped edits**: LangGraph/LangChain, selected-component permissions, exact proposed changes, explicit Apply/Discard and version conflict protection.
4. **Resource properties and infrastructure export**: Fifteen validated types covering VPC/subnets, explicit routes/gateways, security groups/rules, scoped S3 gateway access, private S3 and log groups. Selected-resource AI property patches require exact review and explicit Apply. Deterministic offline CloudFormation export identifies omissions; other catalog types remain visual/planning support. See [resource coverage](docs/RESOURCE_CONFIGURATION.md).
   Configured network maps now derive VPC/subnet/AZ ownership and routing from these resource settings. Configuration references are shown separately from application flows; unknown workload attachment stays unresolved. This is configured intent, not discovered AWS state or verified reachability.
5. **Business workflows**: Repository management, teams, service requests, customer reports, support and operator administration.
6. **Security/compliance records**: Separate readiness/evidence workflows. Recorded readiness is not an assessment result, audit or certification.

Automatic customer AWS deployment, verified runtime monitoring and drift management,
recovery acceptance and enterprise general availability remain incomplete. Historical
infrastructure, build, release and assurance modules include simulation paths; their
presence is not proof of real execution. Use [current production evidence](CURRENT_PRODUCTION_REALITY.md)
and the [persistent development backlog](docs/ENTERPRISE_DEVELOPMENT_BACKLOG.md).

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

## Deployment sequence

Start with Vercel (`apps/web`) and Render (FastAPI + private PostgreSQL) for owner testing. Follow [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md), then [OWNER_DOGFOOD_RUNBOOK.md](OWNER_DOGFOOD_RUNBOOK.md). Move to AWS after acceptance and a migration rehearsal; open a controlled B2B beta before enterprise GA. Current verified results and launch blockers are in [CURRENT_PRODUCTION_REALITY.md](CURRENT_PRODUCTION_REALITY.md).

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

## Local verification

See [deployment verification](DEPLOYMENT_VERIFICATION.md) for fresh results and unresolved launch gates. Hosting preparation does not establish a completed real application deployment or enterprise readiness.
