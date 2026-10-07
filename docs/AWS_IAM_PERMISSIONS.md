# AWS IAM Least-Privilege Permission Profiles (Phase 16 - §34-§42)

LaunchComply enforces strict least privilege. We do not use monolithic `AdministratorAccess` or broad wildcard policies.

---

## 1. Zero AdministratorAccess Guarantee (§40)

- LaunchComply strictly **prohibits** attaching `arn:aws:iam::aws:policy/AdministratorAccess`.
- If an onboarding template or attached IAM role grants broad `*` on `*` resources, LaunchComply flags it as an audit violation and requests scoped replacement.

---

## 2. Permission Feature Profiles (§34, §35)

Permissions are organized into 6 modular feature profiles:

### 1. `DISCOVERY` (Required for Onboarding)
- **Purpose:** Read-only inspection of existing AWS infrastructure to plan non-conflicting container placement.
- **Actions:**
  - `ec2:DescribeVpcs`: Identifies VPC CIDR blocks to avoid network collisions.
  - `ec2:DescribeSubnets`: Maps public vs private subnet topologies for secure tiering.
  - `ec2:DescribeSecurityGroups`: Inspects ingress/egress rules.
  - `elasticloadbalancing:DescribeLoadBalancers`: Discovers active load balancers and target groups.

### 2. `DEPLOYMENT` (Required for Automated Deployment)
- **Purpose:** Executes zero-downtime rolling container updates on ECS Fargate.
- **Actions:**
  - `ecs:DescribeClusters`, `ecs:DescribeServices`: Checks cluster capacity and service status.
  - `ecs:UpdateService`: Triggers rolling deployment with new container image.
  - `ecr:GetAuthorizationToken`, `ecr:BatchGetImage`: Authenticates Fargate tasks to pull private images.
  - `elasticloadbalancing:RegisterTargets`, `elasticloadbalancing:DeregisterTargets`: Registers healthy container instances into load balancers.
  - `iam:PassRole`: Limited strictly to `Resource: arn:aws:iam::*:role/launchcomply-*` to pass vetted task execution roles to containers.

### 3. `MONITORING` (Required for Production Observability)
- **Purpose:** Collects container execution logs and operational metrics.
- **Actions:**
  - `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`: Ingests container application stdout/stderr logs.
  - `cloudwatch:DescribeAlarms`: Reads 5xx error alarms to trigger automated rollbacks when enabled.

### 4. `SECURITY_READ` (Required for Compliance Auditing)
- **Purpose:** Validates encryption at rest and security controls without accessing plaintext secrets.
- **Actions:**
  - `kms:DescribeKey`, `kms:ListAliases`: Confirms databases and S3 buckets use KMS customer-managed key encryption.
  - `secretsmanager:DescribeSecret`: Validates secret rotation cadence and tags (never retrieves secret values).
  - `acm:DescribeCertificate`: Verifies TLS certificate status, domain SANs, and expiry dates.

### 5. `BACKUP_READ` (Required for Disaster Recovery Verification)
- **Purpose:** Verifies automated backup schedules, retention, and point-in-time recovery.
- **Actions:**
  - `rds:DescribeDBInstances`, `rds:DescribeDBSnapshots`: Verifies multi-AZ replication status and automated snapshot policies.

### 6. `COST_READ` (Optional)
- **Purpose:** Cloud cost visibility and right-sizing recommendations.
- **Actions:**
  - `ce:GetCostAndUsage`: Reads aggregated daily AWS billing metrics.

---

## 3. Permission Manifest & Justification Matrix (§37, §38)

Every single IAM action requested by LaunchComply includes an explicit business justification:

| Action | Profile | Required | Reason / Justification |
|---|---|---|---|
| `ec2:DescribeVpcs` | DISCOVERY | Yes | Required to map network topology and VPC subnets for secure container placement. |
| `ecs:UpdateService` | DEPLOYMENT | Yes | Used to orchestrate blue/green rolling updates and verify container health. |
| `ecr:GetAuthorizationToken` | DEPLOYMENT | Yes | Permits Fargate tasks to authenticate and securely pull vetted container images. |
| `iam:PassRole` | DEPLOYMENT | Yes | Scoped passing of execution roles to ECS Fargate tasks (limited to `launchcomply-*` roles). |
| `logs:PutLogEvents` | MONITORING | Yes | Captures structured application logs for real-time auditability and deployment verification. |
| `kms:DescribeKey` | SECURITY_READ | Yes | Validates that databases, storage, and secrets use AWS KMS customer-managed key encryption. |
| `rds:DescribeDBSnapshots` | BACKUP_READ | Yes | Verifies automated snapshot retention for ISO 27001 / SOC 2 DR compliance. |
| `ce:GetCostAndUsage` | COST_READ | No | Provides visibility into daily cloud spend and unit economics (optional). |
