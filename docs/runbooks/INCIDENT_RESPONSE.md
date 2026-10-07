# LaunchComply Incident Response Runbook

## 1. Severity Classification
| Severity | Description | Target Response Time | Target Resolution |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Complete platform outage, active data breach, or cross-tenant exposure | < 15 minutes | < 2 hours |
| **SEV-2 (Major)** | Core workflow degraded (e.g. deployments or billing webhooks failing) | < 30 minutes | < 6 hours |
| **SEV-3 (Minor)** | Non-blocking feature defect or cosmetic issue | < 2 hours | < 24 hours |

## 2. Incident Response Lifecycle
1. **Detection:** Automated CloudWatch alarm, error rate spike, or customer ticket alert.
2. **Triage & Role Assignment:**
   - Incident Commander (leads containment)
   - Operations Lead (technical execution)
   - Communications Lead (updates `/status` and customer emails)
3. **Containment:**
   - If security breach: revoke compromised credentials, initiate break-glass session if required, and isolate affected services.
   - If billing backlog: pause webhook queue ingestion and enable degraded mode.
4. **Resolution & Recovery:** Verify stability for 30 minutes before declaring incident resolved.
5. **Postmortem (Blameless):** Document timeline, root cause, RTO, customer impact, and action items in CAPA registry within 48 hours.
