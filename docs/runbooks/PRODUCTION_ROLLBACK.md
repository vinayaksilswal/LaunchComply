# LaunchComply Production Rollback Runbook

## 1. Trigger Conditions
Initiate emergency rollback immediately if:
- Elevated API 5xx error rate exceeds 1% over a 3-minute window.
- Database connection pool exhaustion or query timeout spike.
- Critical security defect or authentication bypass identified post-deploy.
- Webhook signature verification failure blocking customer subscriptions.

## 2. Rollback Decision Authority
- Incident Commander (Platform Ops Lead or Engineering Director)
- Security Lead

## 3. Rollback Procedure

### Step 3.1: Revert Traffic Shift (ALB / Router)
```bash
# Shift 100% of ALB listener traffic back to stable Target Group (Green/Previous)
aws elbv2 modify-listener --listener-arn <ALB_LISTENER_ARN> --default-actions Type=forward,TargetGroupArn=<STABLE_TG_ARN>
```

### Step 3.2: Revert ECS Task Definitions
```bash
# Roll back API service to previous revision
aws ecs update-service --cluster launchcomply-prod --service launchcomply-api --task-definition launchcomply-api:<PREVIOUS_REVISION>

# Roll back Web service to previous revision
aws ecs update-service --cluster launchcomply-prod --service launchcomply-web --task-definition launchcomply-web:<PREVIOUS_REVISION>
```

### Step 3.3: Database Migration Rollback (If Applicable)
If database schema change is backwards-incompatible:
```bash
# Revert migration to target previous revision
python -m alembic downgrade <PREVIOUS_REVISION>
```
*Note: If data loss would occur from downgrade, restore from pre-deploy snapshot taken during Step 3.1 of Go-Live.*

### Step 3.4: Post-Rollback Verification
1. Verify endpoint response times: `curl -I https://api.launchcomply.com/api/v1/health`
2. Check synthetic error rates on CloudWatch.
3. Publish incident update on `/status` (`StatusIncidentState.MONITORING`).
