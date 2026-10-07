# AWS STS Diagnostics & Troubleshooting Guide (Phase 16 - §27, §28)

This guide documents common AWS STS `AssumeRole` errors encountered during cross-account onboarding, their root causes, and verified resolution procedures.

---

## 1. Diagnostic Taxonomy & Error Codes

LaunchComply classifies STS validation failures into 16 canonical error codes with diagnostic confidence levels (`CONFIRMED`, `LIKELY`, `UNKNOWN`):

| Error Code | Confidence | Root Cause | Recommended Fix |
|---|---|---|---|
| **`INVALID_PRINCIPAL`** | CONFIRMED | Trust policy does not grant `sts:AssumeRole` to LaunchComply's AWS principal. | In AWS IAM Console, edit the trust policy to set `Principal.AWS` to LaunchComply's verified principal. |
| **`PRINCIPAL_MISMATCH`** | CONFIRMED | Trust policy has a typo in LaunchComply's AWS Account ID. | Use the "Copy Corrected Trust Policy" button in LaunchComply and paste into the role. |
| **`WRONG_EXTERNAL_ID`** | CONFIRMED | The `sts:ExternalId` string in the trust policy condition does not match your tenant's ID. | Check for trailing spaces or copy errors in `StringEquals: sts:ExternalId`. |
| **`MISSING_EXTERNAL_ID`** | CONFIRMED | The trust policy omits the `sts:ExternalId` condition entirely. | Re-add the mandatory `StringEquals: sts:ExternalId` block. ExternalId is required for security. |
| **`ROLE_NOT_FOUND`** | CONFIRMED | The Role ARN does not exist in the target AWS account, or role name is mistyped. | Confirm CloudFormation stack is `CREATE_COMPLETE` and verify the 12-digit account ID. |
| **`INVALID_ROLE_ARN`** | CONFIRMED | Malformed ARN string (e.g., missing `role/` prefix). | Ensure format is `arn:aws:iam::<12-digit-account>:role/<role-name>`. |
| **`WRONG_ACCOUNT`** | CONFIRMED | The Role ARN account ID belongs to a different AWS account than configured. | Verify you are connected to the intended AWS account in your console. |
| **`ORG_SCP_DENIED`** | CONFIRMED | An AWS Organizations Service Control Policy denies `sts:AssumeRole` across accounts. | Contact your AWS Organization administrator to permit external STS assumption on this OU. |
| **`PERMISSION_BOUNDARY_DENIED`** | CONFIRMED | An attached IAM Permissions Boundary restricts the role from performing STS or deployment. | Update the permissions boundary policy to allow required workload actions. |
| **`SESSION_POLICY_DENIED`** | LIKELY | A session policy restriction denies the requested session rights. | Inspect the customer IAM role configuration for session restrictions. |
| **`MFA_CONDITION_BLOCK`** | CONFIRMED | The role trust policy enforces `aws:MultiFactorAuthPresent: true`. | LaunchComply is an automated SaaS service that cannot provide interactive hardware MFA. Remove MFA condition from the cross-account provisioning role. |
| **`SOURCE_IP_CONDITION_BLOCK`** | CONFIRMED | The trust policy restricts source IP addresses (`aws:SourceIp`). | Remove IP restrictions or add LaunchComply's egress IP ranges. |
| **`REGION_DISABLED`** | CONFIRMED | The target AWS region is disabled in AWS Account Settings. | In AWS Console, go to Billing & Account -> Regions, and enable the target region. |
| **`ROLE_MAX_SESSION_INVALID`** | CONFIRMED | Maximum session duration is configured to less than 15 minutes. | In IAM Role Settings, increase maximum session duration to at least 1 hour (3600s). |
| **`ACCESS_DENIED`** | LIKELY | General IAM evaluation denial (implicit deny). | Inspect trust relationship, permissions policies, and SCP boundaries. |
| **`UNKNOWN_STS_ERROR`** | UNKNOWN | Transient AWS API error or network issue. | Click "Verify Connection" again to re-probe. |

---

## 2. Using the Trust Policy Diff Inspector (§29, §30)

When an `INVALID_PRINCIPAL` or `WRONG_EXTERNAL_ID` error occurs:
1. LaunchComply displays the **Trust Policy Diff Inspector** directly inside the connection wizard.
2. It highlights the exact mismatch between:
   - **Expected Principal:** `arn:aws:iam::<LAUNCHCOMPLY_ACCOUNT>:root`
   - **Current Principal:** What AWS evaluated in your role
   - **Expected ExternalId:** `launchcomply-ext-...`
   - **Current Condition:** What was detected in your role
3. Click **Copy Corrected Trust Policy** to copy a sanitized, syntax-checked JSON policy.
4. Paste it into your role in the AWS IAM Console under **Trust relationships -> Edit trust policy**, save, and click **Verify Connection**.

---

## 3. Resolving AWS Organization Service Control Policies (SCPs) (§42)

If your enterprise uses AWS Organizations with restrictive SCPs:
- Check for SCP statements containing `"Effect": "Deny"` and `"Action": ["sts:AssumeRole", "sts:*"]`.
- Ensure an exception exists for cross-account roles with `Condition: {"StringEquals": {"sts:ExternalId": "..."}}`.
- For pilot testing, consider deploying the onboarding role in a designated sandbox or non-production organizational unit.

---

## 4. Requesting White-Glove Setup Assistance (§62)

If STS verification fails after two attempts:
1. Click **Request Setup Help** in the connection wizard.
2. LaunchComply packages a sanitized diagnostic context package containing:
   - Organization ID
   - Target AWS Account ID and Region
   - Role ARN
   - Failure Code and Diagnostic Confidence
   - Missing Capability Report
3. **No credentials or secrets** are included in the assistance payload.
4. An on-call LaunchComply DevOps architect is dispatched to help resolve your IAM trust configuration within 4 business hours.
