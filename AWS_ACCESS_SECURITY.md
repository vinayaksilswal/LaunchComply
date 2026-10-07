# LaunchComply AWS Access Security & Infosec Review Pack (Phase 16 - §146, §147)

**Document Classification:** Public / Customer Infosec Review Pack  
**Last Updated:** October 2026  
**Audience:** Chief Information Security Officers (CISOs), Security Architects, Cloud Compliance Officers

---

## Executive Summary

LaunchComply connects to customer AWS accounts exclusively via **ephemeral, cross-account AWS IAM roles** mediated by **AWS Security Token Service (STS)**.

LaunchComply:
- **NEVER** stores permanent AWS access keys or secret keys.
- **NEVER** requests AWS account root credentials.
- **NEVER** requests `AdministratorAccess`.
- **NEVER** accesses customer database rows, application payloads, or plaintext secrets.
- **ALWAYS** enforces unique cryptographic `sts:ExternalId` conditions for confused-deputy protection.
- **ALWAYS** permits immediate, customer-controlled revocation without modifying existing customer workloads.

---

## 1. Architectural Trust Model

```
+---------------------------+                     +---------------------------------+
|   LaunchComply Platform   |                     |     Customer AWS Account        |
|                           |                     |                                 |
|  Verified AWS Principal:  |                     |  Cross-Account IAM Role:        |
|  arn:aws:iam::<LC_ACCT>:  |                     |  LaunchComplyProvisioningRole   |
|         root              |                     |                                 |
|            |              |                     |         |                       |
|            |  sts:AssumeRole (ExternalId: lc_ext...)      |                       |
|            +--------------------------------------------->+                       |
|                           |                     |  [AWS STS Validates Trust]      |
|                           |                     |  [AWS STS Validates ExternalId] |
|            <----------------------------------------------+                       |
|                           |  Ephemeral STS Token (15-60m)|                        |
|                           |                     |                                 |
|  [Scoped Workload Ops]    |                     |                                 |
|  - Deploy ECS tasks       |====================>|  - VPC / Subnets (Read-only)    |
|  - Ingest deploy logs     |                     |  - ECS Fargate (UpdateService)  |
|  - Audit KMS config       |                     |  - RDS (Describe Instances)     |
+---------------------------+                     +---------------------------------+
```

---

## 2. Confused-Deputy Protection & ExternalId (§10, §33)

### The Threat
In cross-account scenarios without an ExternalId, an attacker could trick a multi-tenant SaaS provider into assuming another customer's role by providing that customer's Role ARN.

### The LaunchComply Defense
Every organization in LaunchComply receives an immutable, cryptographically unique ExternalId generated using a CSPRNG (`launchcomply-ext-<tenant>-<token>`).

The customer's IAM trust policy mandates:
```json
"Condition": {
  "StringEquals": {
    "sts:ExternalId": "launchcomply-ext-9c4f12d8a..."
  }
}
```

AWS STS rejects any `AssumeRole` request if the ExternalId does not match the exact value passed in the API call. LaunchComply **never suggests removing or omitting ExternalId**.

---

## 3. Session Boundaries & Ephemeral Credentials (§25, §53)

- **Session Duration:** Prechecks request 15-minute sessions; deployment tasks request maximum 60-minute sessions.
- **Zero Storage:** Temporary session tokens are held in volatile process memory only for the duration of the API call. They are **never stored** in databases, disk logs, or audit records.
- **Evidence Storage:** LaunchComply stores only cryptographic hashes (`sts_result_hash`), timestamps, and role ARNs for compliance evidence.

---

## 4. Least-Privilege IAM Policy Scope (§34-§42)

LaunchComply uses scoped policies with zero wildcard `*` permissions on administrative actions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "NetworkInspectionAndALB",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeRouteTables",
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:DescribeTargetGroups",
        "elasticloadbalancing:RegisterTargets",
        "elasticloadbalancing:DeregisterTargets"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ContainerDeploymentAndLogs",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeClusters",
        "ecs:DescribeServices",
        "ecs:UpdateService",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ManagedDatabaseAndKMS",
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBSnapshots",
        "kms:DescribeKey",
        "kms:GenerateDataKey",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "*"
    },
    {
      "Sid": "PassRoleScoped",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::*:role/launchcomply-*"
    }
  ]
}
```

---

## 5. Revocation & Safe Disconnect (§101, §102)

- You retain complete sovereignty. You can delete the `LaunchComplyProvisioningRole` at any time directly in your AWS IAM Console.
- When an account is disconnected in LaunchComply, all active connections are marked `REVOKED`.
- **Infrastructure Safety Guarantee:** Disconnecting LaunchComply **will never delete, alter, or terminate** your running AWS infrastructure, ECS services, databases, or VPCs.

---

## 6. Auditability & Compliance Evidence

- Every cross-account role assumption is logged in your AWS account's **AWS CloudTrail** under the event name `AssumeRole`, recording the source identity, time, and session name.
- LaunchComply maintains an immutable internal audit log of all connection, deployment, and verification events.

---

## 7. Compliance Certifications & Standards

This architecture directly addresses controls in:
- **ISO/IEC 27001:2022:** A.8.2 (Privileged Access Rights), A.8.3 (Information Access Restriction), A.8.24 (Use of Cryptography).
- **SOC 2 Type II:** CC6.1 (Logical Access Controls), CC6.2 (Credential Issuance and Revocation), CC6.3 (Least Privilege Access).
- **India DPDP Act 2023:** Reasonable Security Safeguards (§8(5)).
