# AWS Customer Onboarding Guide (Phase 16)

LaunchComply uses a secure, customer-controlled **cross-account AWS IAM role** with bounded AWS STS (Security Token Service) delegation.

---

## 1. Security Architecture & Principles

LaunchComply adheres strictly to AWS least-privilege security best practices:

- **Zero Root Credentials:** LaunchComply will never ask for, accept, or process AWS root account credentials.
- **Zero Long-Lived Access Keys:** We do not request or store permanent AWS IAM User Access Keys (`AKIA...`).
- **Short-Lived STS Sessions:** Access is achieved through bounded AWS STS `AssumeRole` sessions (15–60 minutes) that expire automatically.
- **Mandatory ExternalId (Confused-Deputy Protection):** Every tenant is assigned a cryptographically unique `sts:ExternalId`. AWS STS enforces that cross-account role assumption is rejected unless this exact ExternalId is supplied, preventing confused-deputy attacks.
- **Customer-Controlled Revocation:** You retain 100% ownership of your AWS account. You can revoke LaunchComply's access at any moment by deleting or modifying the IAM role in your AWS Console. Disconnecting LaunchComply **never deletes or modifies** your running infrastructure.

---

## 2. Onboarding Setup Methods

LaunchComply supports three onboarding methods:

### Method A: CloudFormation Quick Setup (Recommended)
1. In LaunchComply, click **Connect AWS** and select **CloudFormation Quick Setup**.
2. Click **Open AWS CloudFormation Setup**. This deep-links to your AWS Console with our vetted, versioned template and your unique ExternalId pre-populated.
3. Review the parameters in AWS, check the acknowledgement checkbox (*"I acknowledge that AWS CloudFormation might create IAM resources"*), and click **Create stack**.
4. LaunchComply observes the stack until creation completes (usually 30–60 seconds).
5. The role is automatically verified and your connection is established.

### Method B: Manual IAM Role
If your organization prefers manual IAM role creation or uses Terraform:
1. Open the AWS IAM Console -> **Roles** -> **Create role**.
2. Select **AWS account** -> **Another AWS account**.
3. Enter LaunchComply's trusted Account ID: `<LAUNCHCOMPLY_AWS_ACCOUNT_ID>`.
4. Check **Require external ID** and enter your tenant's ExternalId: `<EXTERNAL_ID>`.
5. Attach the scoped LaunchComply workload policy (do **NOT** attach `AdministratorAccess`).
6. Name the role `LaunchComplyProvisioningRole` and create the role.
7. Paste the generated Role ARN into LaunchComply and click **Verify Connection**.

### Method C: Existing Compatible Role
If your security team previously provisioned a role meeting LaunchComply's trust policy and permission requirements, paste its ARN into the connection wizard. LaunchComply will validate the trust relationship without duplicating resources.

---

## 3. Trust Policy Specification

Your IAM role's trust policy must follow this exact format:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LaunchComplyCrossAccountAssumeRole",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<LAUNCHCOMPLY_AWS_ACCOUNT_ID>:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "<EXTERNAL_ID>"
        }
      }
    }
  ]
}
```

> **IMPORTANT:**
> - Never hardcode sample account IDs. LaunchComply displays its verified production account identity during setup.
> - Never remove the `sts:ExternalId` condition. It is required for confused-deputy prevention.

---

## 4. What LaunchComply Can & Cannot Access

### What LaunchComply Can Access
- **Network Inspection:** Read VPCs, subnets, route tables, and load balancers to plan zero-conflict container deployment.
- **Container Orchestration:** Update ECS services, register targets in ALBs, and pull vetted container images from ECR.
- **Database & Storage Telemetry:** Read RDS PostgreSQL instance status, backup snapshot schedules, and S3 bucket encryption configurations.
- **CloudWatch Logs:** Stream container deployment logs and health metrics.

### What LaunchComply CANNOT Access
- **No Data Plane Access:** LaunchComply cannot query your application database tables, execute SQL, or read customer data.
- **No Secret Plaintext:** Secrets Manager permissions are restricted to describing secret metadata; plaintext secrets are never exfiltrated to SaaS servers.
- **No IAM Escalation:** Role creation and policy alteration are prohibited. PassRole is strictly scoped to `arn:aws:iam::*:role/launchcomply-*`.
- **Zero Root Privileges:** Bounded to containerized application workloads only.

---

## 5. Revoking LaunchComply Access

To disconnect LaunchComply at any time:
1. In LaunchComply, navigate to your application and click **Disconnect AWS**.
2. In your AWS IAM Console, delete or disable the `LaunchComplyProvisioningRole`.
3. All STS session tokens expire immediately. LaunchComply retains audit history but cannot perform any cloud actions.
4. Your production workloads, databases, and network topologies **remain completely intact and operational**.
