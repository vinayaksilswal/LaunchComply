# LaunchComply Production Go-Live Runbook

## 1. Scope & Objective
This runbook defines the authoritative, step-by-step procedure for deploying, verifying, and declaring LaunchComply live in a production environment.

## 2. Preconditions & Launch Gates (P0 Blockers)
Before initiating go-live, all P0 Launch Gates must report `PASS`:
1. **Database:** PostgreSQL 15+ cluster active with TLS enforced, connection pooling configured, and SQLite strictly prohibited.
2. **Environment Isolation:** `ENVIRONMENT=production`, `DEMO_MODE=False`, `DEBUG=False`.
3. **Secrets:** Cryptographic `JWT_SECRET` and `ENCRYPTION_KEY` configured with 32+ high-entropy characters from AWS Secrets Manager or secure vault.
4. **Migrations:** Alembic migrations applied cleanly to HEAD with automated pre-checks.
5. **Backups:** Automated RDS snapshots active and at least one isolated restore drill verified with measured RTO < 600s.
6. **Billing & Invoices:** Webhook signing secrets verified for Stripe/Razorpay; sequential invoice prefix `LC-INV-` active.
7. **Security Gate:** Phase 6 VAPT self-assurance completed with 0 unresolved critical findings.

## 3. Go-Live Execution Procedure

### Step 3.1: Pre-Deployment Database Snapshot & Migration
```bash
# 1. Trigger pre-migration snapshot
aws rds create-db-snapshot --db-instance-identifier launchcomply-prod --db-snapshot-identifier lc-pre-deploy-$(date +%Y%m%d%H%M%S)

# 2. Check current migration state
python -m alembic current

# 3. Apply pending migrations
python -m alembic upgrade head

# 4. Verify migration state
python -m alembic check
```

### Step 3.2: Container Artifacts & Image Verification
- Verify build provenance linking Git SHA, Docker digest, and SBOM scan results.
- Pull release image from private AWS ECR:
```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com
```

### Step 3.3: ECS Service Deployment & Traffic Shift
- Deploy updated task definitions for:
  - `launchcomply-api` (FastAPI backend)
  - `launchcomply-web` (Next.js frontend)
  - `launchcomply-worker` (Background job processor)
- Execute canary or blue/green traffic shift via AWS ALB:
  - 10% canary traffic for 5 minutes (monitor 5xx error rate < 0.1%).
  - 100% traffic cutover upon successful health check validation.

### Step 3.4: Post-Deployment Smoke Verification
Run automated non-destructive production smoke suite:
- `GET https://api.launchcomply.com/api/v1/health` (verify HTTP 200)
- `GET https://app.launchcomply.com/` (verify Next.js SSR)
- `GET https://status.launchcomply.com/` (verify public status page)
- `GET https://api.launchcomply.com/api/v1/commercial/plans` (verify catalog)

### Step 3.5: Authoritative Sign-Off & Launch Approval
- Platform Operations and Security Officers log into `/platform-admin/launch`.
- Confirm all 12 launch gates show green.
- Click **"Sign-Off Commercial Launch"** to record `ProductionLaunchApproval` with timestamp and operator identity.
