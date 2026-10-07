# LaunchComply — Customer Onboarding Guide
*From Localhost to Real Business.*

---

## 1. Getting Started: The 7-Step Journey

LaunchComply automates the complex transition from a localhost web application to a compliant, secure, production-grade cloud deployment.

### Step 1: Account Creation & Goal Selection
1. Navigate to `/signup` to register your enterprise account.
2. Choose your primary immediate objective on `/onboarding`:
   - **Deploy My Application**: Full cloud blueprinting, ECS Fargate provisioning, and DNS/TLS setup.
   - **Secure Existing Application**: Run vulnerability assessments, CVE scans, and continuous threat modeling.
   - **Prepare for ISO 27001 / SOC 2**: Adopt standard ISMS policies and begin continuous evidence collection.
   - **Run Authorized VAPT**: Formal penetration testing with certified methodology.

### Step 2: Name Application Workspace
- Give your application a descriptive workspace name (e.g. `Acme SaaS Web Platform`).
- Select your primary target cloud region (default: `ap-south-1` Mumbai).

### Step 3: Connect Source Code Repository
- Connect your GitHub repository URL (e.g. `https://github.com/myorg/saas-core`).
- LaunchComply scans repository manifests (`package.json`, `requirements.txt`, Dockerfiles) to detect frontend runtimes, backend frameworks, and database dependencies.

### Step 4: Review Architecture Blueprint
- Review the generated multi-tier topology:
  - Public Edge: AWS CloudFront + WAF Ingress
  - Load Balancer: Application Load Balancer (ALB)
  - Compute: ECS Fargate container tasks
  - Database: Multi-AZ RDS PostgreSQL 16
  - Storage: KMS-encrypted private S3 buckets
- Architecture changes require human review before any cloud provisioning.

### Step 5: Connect AWS Account via AssumeRole
- Provide your 12-digit AWS Account ID.
- LaunchComply operates strictly via cross-account IAM AssumeRole with restricted IAM permissions boundaries. No root or long-lived static credentials are ever stored.

### Step 6: Deploy & Verify Production Health
- Trigger the automated deployment pipeline.
- Containers build, migrate databases, and deploy with zero-downtime rolling updates.

### Step 7: Continuous Security & Compliance
- Continuous audit bots immediately verify TLS, encryption at rest, S3 public access blocks, and branch protections.
- Visit `/dashboard/my-actions` to inspect pending compliance obligations and risk sign-offs.
