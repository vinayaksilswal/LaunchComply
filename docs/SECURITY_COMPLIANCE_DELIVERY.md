# Security observation and assisted delivery

Customer security pages separate AWS provider observations from application assessments. The regional observer reads Security Hub `GetFindings` and GuardDuty `ListDetectors`, `ListFindings` and `GetFindings`. It verifies the platform runtime role, customer identity and ExternalId isolation before using temporary credentials. Credentials are never stored in the snapshot.

The view shows the observation time, source access status and bounded sample counts. Sources may overlap. Missing permissions, missing services and failed calls produce unknown counts, never a healthy zero. Auto refresh is optional, runs every minute while the page is visible and stops on an error. The server serializes each connection refresh and reuses observations younger than one minute. This is polling, not an event stream; continuous ingestion and automated triage remain a separate delivery requirement.

The generated observer template includes these four read permissions. Existing customer roles require an AWS administrator to approve the policy update. Generating a template does not apply it or expand an existing role. Platform identity and a verified customer connection are prerequisites for live findings.

## Customer and operator workflow

1. Apply for security assessment, ISO 27001 preparation, SOC 2 preparation, privacy review, deployment support, monitoring, recovery, cost or workspace support.
2. The platform operations queue reviews the application. Assessment requests do not authorize active testing. Agree scope, ownership, permitted methods and written authorization separately.
3. An operator can request information using a customer-visible update. Internal operations notes are stored separately and excluded from the public activity feed.
4. Customers read progress and reply from the service application. A reply to a waiting request returns it to review. Replies use retry identifiers and an expected status; status conflicts require refresh.
5. Quoted work requires a verified real payment before starting or delivering it. Publishing a report has the same payment gate as a status change.
6. The operator publishes the work actually performed. Customers view and download the report. A recorded delivery is not independent certification or attestation.

Normal transitions: requested → reviewing / waiting; reviewing → in progress / waiting; in progress → waiting / delivered; waiting → reviewing / in progress; delivered → closed / reviewing. Publishing an actual report can deliver reviewed work. Closed requests cannot publish additional reports. Security and compliance requests require a published report to be marked delivered or closed.

Application lists and progress are tenant scoped. The public activity endpoint returns only submission, public update, customer reply and report publication fields. Internal notes, actor contact information and arbitrary audit details are excluded. Application lists and conversations explicitly disclose their latest-100 limit. Main security and compliance hubs include their service families, so specific ISO, SOC and VAPT requests are visible in the overview.

Legacy preset scan, retest, remediation, report, telemetry, cost and restore paths reject execution outside explicit local demo mode. The new observer does not run a vulnerability assessment, deploy resources or remediate findings. Live payments, cloud execution, provider coverage and recovery acceptance must be verified before a production-readiness claim.

Provider references: [Security Hub GetFindings](https://docs.aws.amazon.com/boto3/latest/reference/services/securityhub/client/get_findings.html), [GuardDuty ListFindings](https://docs.aws.amazon.com/boto3/latest/reference/services/guardduty/client/list_findings.html), [GuardDuty severity levels](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings-severity.html).
