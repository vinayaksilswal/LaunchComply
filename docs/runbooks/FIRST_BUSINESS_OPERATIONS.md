# First business onboarding and delivery

Updated 2026-10-10. This is an operating procedure for the current release, not evidence of a completed customer deployment.

## Accept a prospective business

1. Review `/platform-admin/consultations` daily. The public `/contact#consultation` form records the business, contact permission, requested area of help, message, timestamp and reference. It does not send email or start an engagement.
2. Use Review inquiry to record whether it fits a scope review, is not a current fit, or should return to new. Include the reason. Reviews check the previous status and record an operator audit entry; they do not send a message or accept an engagement. Mark browser-review inquiries as not a current fit. Do not count these records as customers or revenue.
3. Follow up manually only about the inquiry. Establish the business outcome, source ownership, data sensitivity, current hosting, timeline, and what operations can actually deliver. Agree scope and commercial terms separately; no response SLA is currently promised.
4. Direct the customer to create their own account. Do not set their password or enter their cloud secrets. Legal agreements and assessment authorization require a separate reviewed process.

## Connect code and review the proposal

1. `/onboarding` offers GitHub and ZIP upload on one page. Connect multiple selected repositories under one business asset when frontend and backend live separately.
2. Review the source evidence, pinned commits and coverage in Business architecture. Static sampled findings do not establish complete runtime behaviour. Refreshing analysis replaces the proposed design; agree before replacing customer edits.
3. Collect expected peak requests, concurrent users, region and availability. Do not invent traffic or size requirements for a customer.
4. Review the combined diagram: managed services, public ingress, private application subnets and isolated data subnets. These are proposed placements; routes, addresses, capacity and recovery still need engineering review.
5. Open Services & sizing to review the engineering planning checklist. Resolve missing requirements and ambiguous hosting choices. The remaining network, runtime, recovery, IAM and cost areas require actual engineering evidence; a valid diagram is not an operational readiness review. Download the checklist only from a saved design without pending proposals.
6. Review and approve the actual saved design version. Any design or requirement edit invalidates that approval. Saving and approval do not authorize provisioning.

## Scope an assisted deployment

1. Home and Deployments use the same recorded preparation checks. A source record, planning target, design approval or AWS identity result is shown only when present.
2. Request deployment review from the selected asset's saved design. This captures the design version, source snapshot, recorded targets and engineering checklist in the submission audit record. Open Submitted design checklist in request progress, from either the customer workspace or operator queue. The snapshot does not silently update when later designs change; agree any revised scope explicitly. Older requests without a captured checklist are not backfilled from today's design.
3. Check `/platform-admin/system` before promising cloud connection, payment or execution. Current automatic provisioning is unavailable. Operator credentials and customer role access must be configured and actually verified before work involving AWS.
4. Review the real infrastructure plan, provisioning permissions, cloud costs, build and registry artifacts, runtime secrets, migrations, health checks, domain/TLS, rollback and backups. Do not treat an observation role as a provisioning role.
5. Publish a quote only after confirming delivery capability and the required design/cloud gates. Live checkout, webhook reconciliation and refunds need acceptance for each provider; a configured key or test payment is not paid revenue.

## Coordinate and hand over actual work

1. Use the business service queue for status, customer-visible updates and questions. Keep internal notes internal. Customer replies to a waiting request return it to review.
2. Scope and authorize security testing separately. Compliance preparation is not certification or an independent audit.
3. Publish a report of the work actually performed, its evidence, limitations and remaining actions. A checksum identifies content; it is not an assessor's digital signature. Do not mark deployment delivered merely because a design exists.
4. Verify the customer can open the permanent service request page, respond and download the report. An owner/admin records acceptance of the latest report there; the receipt binds to its ID and checksum. A new report needs new acceptance. Operations cannot close a request with a report before that acceptance. Agree support ownership separately; this does not prove cloud validation or certification.
5. Before promising production service levels, complete a real recovery rehearsal, security/tenant-isolation acceptance, payment reconciliation and customer deployment handover. Marketing an architecture planning workflow does not establish enterprise production readiness.

## Public intake controls and limits

Inquiries validate email, field lengths, supported interests and contact permission. The consultation, legacy lead and demo-request routes reject bodies above 16 KB before JSON parsing. An unchanged inquiry reuses its UUID reference across a browser retry. A hidden website field filters simple automated submissions. Database counts limit admission to three inquiries per email and 200 total in an hour across CRM lead writes; these are soft concurrency limits, not a distributed bot defence. Configure edge request limits/bot protection before an advertising campaign, and monitor inbox volume. Inbox access requires the platform operator role and is paginated; tenant users must not receive prospect contact details.
