# AWS CloudFormation Quick Setup Reference (Phase 16 - §12-§22)

LaunchComply provides an automated CloudFormation Quick-Create integration that creates a customer-approved IAM cross-account role in under 60 seconds with zero manual JSON copying.

---

## 1. Quick Create Workflow (§15, §17)

1. LaunchComply generates a deterministic, customer-safe stack name:
   ```
   LaunchComply-Onboarding-<short-org-id>
   ```
2. A deep-link Quick Create URL is generated containing only safe parameters:
   - Stack Name
   - Organization-specific `ExternalId`
   - Target Region (default `ap-south-1`)
   - **Zero credentials, zero sensitive tokens.**
3. The URL launches the official AWS CloudFormation console:
   ```
   https://{region}.console.aws.amazon.com/cloudformation/home?region={region}#/stacks/quickcreate?stackName={stack_name}&param_ExternalId={external_id}
   ```
4. The customer reviews parameters, checks the IAM acknowledgment checkbox, and approves creation in their AWS account.

---

## 2. Stack Lifecycle Observation (§18, §19)

LaunchComply tracks the CloudFormation stack state machine:

| AWS Stack Status | Meaning | Next Step in LaunchComply |
|---|---|---|
| `CREATE_IN_PROGRESS` | AWS is provisioning the role and policies. | Waiting (usually 30–60 seconds). |
| `CREATE_COMPLETE` | Stack created successfully. | Automatic role detection and STS precheck. |
| `CREATE_FAILED` | Stack failed during creation. | Displays customer-safe error explanation and retry options. |
| `ROLLBACK_IN_PROGRESS` | AWS is tearing down failed resources. | Awaiting rollback completion. |
| `ROLLBACK_COMPLETE` | Failed resources cleaned up. | View root cause and retry or use Manual Setup. |
| `UPDATE_COMPLETE` | Template updated to new revision. | Re-validates trust and permission scopes. |
| `DELETE_COMPLETE` | Stack deleted by customer. | Connection marked REVOKED. |

---

## 3. Customer-Safe Error Translation (§20, §21)

Raw CloudFormation errors are translated into actionable, human-friendly guidance:

- **Raw:** `CREATE_FAILED AWS::IAM::Role API: iam:CreateRole User is not authorized to perform: iam:CreateRole`
  - **Translated:** *"AWS could not create the LaunchComply role. Your current AWS user may not have permission to create IAM roles, or an organization Service Control Policy (SCP) may block it."*
- **Raw:** `CREATE_FAILED AlreadyExistsException: Role with name LaunchComplyProvisioningRole already exists`
  - **Translated:** *"An IAM role named 'LaunchComplyProvisioningRole' already exists in this account. Switch to Option C in the wizard to validate the existing role."*
- **Raw:** `UnrecognizedClientException: The security token included in the request is invalid`
  - **Translated:** *"Your AWS management session expired. Refresh your AWS console window and try again."*

---

## 4. Template Immutability & Versioning (§13, §14)

- Every template is assigned a semantic version (e.g., `v1.2.0`) and a SHA256 checksum.
- Templates are **immutable**: changing policy statements increments the template version.
- Existing customer connections remain pinned to their verified template version.
