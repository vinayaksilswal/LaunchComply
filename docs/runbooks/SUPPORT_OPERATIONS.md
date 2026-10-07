# LaunchComply Support Operations Runbook

## 1. Plan-Tiered SLA Standards
| Plan Tier | First Response Target | Coverage Hours | Escalation Path |
| :--- | :--- | :--- | :--- |
| **Enterprise** | < 1 hour | 24x7 Dedicated | Senior SRE / Security On-Call |
| **Business** | < 8 hours | Business Hours (Mon-Fri) | Tier 2 Support Lead |
| **Growth** | < 24 hours | Business Hours (Mon-Fri) | Tier 1 Support Agent |
| **Starter** | < 48 hours | Standard Queue | Community / Async Support |

## 2. Support Ticket Handling Workflow
1. Inbound tickets arrive via `/dashboard/support` or `support@launchcomply.com`.
2. SLA timer begins counting down based on the organization's plan tier.
3. Support agents claim ticket from the centralized queue at `/platform-admin/support`.
4. If technical investigation is required, agents can link corresponding `Incident`, `Application`, or `Environment` records.
5. Upon issue resolution, the agent posts concluding message and transitions ticket state to `RESOLVED`.
