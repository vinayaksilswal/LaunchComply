# LaunchComply Disaster Recovery Runbook

## 1. Objectives & RPO/RTO Targets
- **Recovery Point Objective (RPO):** < 1 hour (Automated hourly database WAL shipping & continuous S3 evidence replication).
- **Recovery Time Objective (RTO):** < 4 hours (Cold/Warm standby ECS cluster restoration in secondary AWS region).
- **Primary Region:** `ap-south-1` (Mumbai)
- **Secondary DR Region:** `ap-southeast-1` (Singapore)

## 2. DR Rehearsal Procedure (Non-Destructive)
1. Trigger non-destructive restore rehearsal via Platform Admin API:
   ```bash
   POST /api/v1/platform-admin/restore-rehearsal
   ```
2. System restores latest RDS automated snapshot into isolated temporary database (`isolated_rehearsal_db`).
3. Executes automated schema validation and row-count verification.
4. Records measured RTO in seconds and generates tamper-evident SHA-256 evidence hash in `RestoreRehearsalRecord`.
5. Destroys temporary DB without impacting production workloads.

## 3. Real Regional Failover Procedure
1. **Declare Disaster:** Incident Commander verifies primary region outage with AWS status.
2. **Promote Read-Replica:** Promote Singapore cross-region PostgreSQL read-replica to standalone primary.
3. **Provision DR ECS Cluster:** Apply Terraform IaC in secondary region:
   ```bash
   cd terraform/dr
   tofu init && tofu apply -auto-approve
   ```
4. **DNS Failover Cutover:** Update Amazon Route 53 latency/failover routing policy to point `api.launchcomply.com` and `app.launchcomply.com` to secondary ALB.
5. **Publish Public Advisory:** Update `/status` to notify customers of operational transition.
