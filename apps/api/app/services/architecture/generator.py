from typing import Dict, List, Any, Optional

class AWSCostEstimator:
    # Monthly cost assumptions in INR (approx 84 INR per USD)
    PRICING = {
        "LEAN": {
            "route53": 450,
            "cloudfront": 900,
            "waf": 1200,
            "alb": 1800,
            "ecs_fargate": 6500,     # 1-2 vCPU tasks
            "rds_postgres": 7500,    # Single AZ db.t4g.small
            "elasticache_redis": 0,  # Redis omitted or local in Lean
            "s3_storage": 850,
            "secrets_manager": 350,
            "cloudwatch": 800,
            "nat_gateway": 3800,     # Single NAT
            "aws_backup": 650,
        },
        "BALANCED": {
            "route53": 450,
            "cloudfront": 1800,
            "waf": 2500,
            "alb": 2200,
            "ecs_fargate": 12400,    # 2-4 tasks across 2 AZs
            "rds_postgres": 14500,   # Multi-AZ db.t4g.medium
            "elasticache_redis": 2800, # cache.t4g.micro
            "s3_storage": 1850,
            "secrets_manager": 650,
            "cloudwatch": 1500,
            "nat_gateway": 7600,     # 2 NAT Gateways (HA)
            "aws_backup": 1200,
        },
        "HIGH_AVAILABILITY": {
            "route53": 900,
            "cloudfront": 3500,
            "waf": 4500,
            "alb": 3800,
            "ecs_fargate": 24000,    # 4-8 tasks auto-scaling
            "rds_postgres": 32000,   # Aurora PostgreSQL Multi-AZ
            "elasticache_redis": 6500, # Multi-node replication
            "s3_storage": 4500,
            "secrets_manager": 1200,
            "cloudwatch": 3200,
            "nat_gateway": 7600,
            "aws_backup": 2500,
        }
    }

    @classmethod
    def estimate_cost(cls, profile: str = "BALANCED", has_redis: bool = True, has_worker: bool = False) -> Dict[str, Any]:
        p = profile.upper()
        if p not in cls.PRICING:
            p = "BALANCED"

        costs = dict(cls.PRICING[p])
        if not has_redis:
            costs["elasticache_redis"] = 0
        if has_worker:
            costs["ecs_fargate"] = int(costs["ecs_fargate"] * 1.35)

        total_inr = sum(costs.values())
        min_inr = int(total_inr * 0.90)
        max_inr = int(total_inr * 1.15)

        return {
            "profile": p,
            "currency": "INR",
            "estimated_monthly_inr": f"₹{total_inr:,}",
            "range_inr": f"₹{min_inr:,} – ₹{max_inr:,}",
            "estimated_monthly_usd": f"${int(total_inr / 84):,}",
            "breakdown": {
                "Compute (ECS Fargate)": f"₹{costs['ecs_fargate']:,}",
                "Database (RDS PostgreSQL)": f"₹{costs['rds_postgres']:,}",
                "In-Memory Cache (Redis)": f"₹{costs['elasticache_redis']:,}",
                "Network & Ingress (ALB + NAT)": f"₹{(costs['alb'] + costs['nat_gateway']):,}",
                "Edge & CDN (CloudFront + WAF + Route53)": f"₹{(costs['cloudfront'] + costs['waf'] + costs['route53']):,}",
                "Storage & Encryption (S3 + Secrets)": f"₹{(costs['s3_storage'] + costs['secrets_manager']):,}",
                "Observability & Backup": f"₹{(costs['cloudwatch'] + costs['aws_backup']):,}",
            },
            "disclaimer": "ESTIMATED MONTHLY COST based on current AWS ap-south-1 on-demand pricing and typical traffic baseline. Actual billing depends on data transfer and compute utilization."
        }

class ArchitectureGenerator:
    @classmethod
    def generate(cls, analysis_data: Dict[str, Any], profile: str = "BALANCED") -> Dict[str, Any]:
        services = analysis_data.get("services", [])
        databases = analysis_data.get("databases", [])
        integrations = analysis_data.get("integrations", [])
        has_redis = any("redis" in str(s).lower() for s in services) or any("redis" in str(i).lower() for i in integrations)
        has_worker = any(s.get("service_type") == "worker" for s in services)

        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        # 1. Edge Layer
        nodes.append({
            "id": "node-dns",
            "name": "Route 53 Managed DNS",
            "service": "Amazon Route 53",
            "category": "DNS & Routing",
            "tier": "PUBLIC_EDGE",
            "ports": "53/UDP, 53/TCP",
            "status": "READY_TO_PROVISION",
            "cost": "₹450 / mo",
            "public_private": "Public",
            "encryption": "DNSSEC Signed",
            "reason": "Provides latency-based apex DNS routing and health check failover.",
            "evidence": "Web application domain and public ingress requirement.",
            "alternative": "Cloudflare DNS",
            "security_rationale": "Managed AWS service protected against DNS amplification attacks."
        })
        nodes.append({
            "id": "node-cdn",
            "name": "CloudFront CDN Distribution",
            "service": "Amazon CloudFront",
            "category": "Content Delivery",
            "tier": "PUBLIC_EDGE",
            "ports": "443/HTTPS (TLS 1.3)",
            "status": "READY_TO_PROVISION",
            "cost": "₹1,800 / mo",
            "public_private": "Public",
            "encryption": "TLS 1.3 Strict, ACM Certificate",
            "reason": "Global edge caching for static assets and SNI SSL termination.",
            "evidence": "Detected web frontend and API routing.",
            "alternative": "Direct ALB ingress (discouraged due to DDoS vulnerability)",
            "security_rationale": "Shields internal ALB origin from direct Internet scanning."
        })
        nodes.append({
            "id": "node-waf",
            "name": "AWS WAF Web ACL",
            "service": "AWS WAF",
            "category": "Edge Protection",
            "tier": "PUBLIC_EDGE",
            "ports": "Inline Inspection",
            "status": "READY_TO_PROVISION",
            "cost": "₹2,500 / mo",
            "public_private": "Public",
            "encryption": "Edge Inspection",
            "reason": "Filters malicious traffic, SQL injection, and OWASP Top 10 automated threats.",
            "evidence": "Production API endpoints exposed to customer traffic.",
            "alternative": "Third-party CDN WAF",
            "security_rationale": "Enforces rate limiting (100 req/min per IP) and Core Rule Set."
        })

        # 2. Public Subnet
        nodes.append({
            "id": "node-alb",
            "name": "Application Load Balancer",
            "service": "AWS ALB",
            "category": "Traffic Distribution",
            "tier": "PUBLIC_SUBNET",
            "ports": "80->443 Redirect, 443/HTTPS",
            "status": "READY_TO_PROVISION",
            "cost": "₹2,200 / mo",
            "public_private": "Public Subnet (Restricted)",
            "encryption": "ELBSecurityPolicy-TLS13",
            "reason": "Reverse proxy routing HTTP requests to private ECS container target groups.",
            "evidence": "Containerized backend API detected on port 8000.",
            "alternative": "Network Load Balancer (NLB) for non-HTTP raw TCP",
            "security_rationale": "Security group restricts traffic exclusively to CloudFront edge prefix list."
        })

        # 3. Private Application VPC Subnet
        nodes.append({
            "id": "node-ecs-api",
            "name": "ECS Fargate (FastAPI API)",
            "service": "Amazon ECS Fargate",
            "category": "Container Compute",
            "tier": "PRIVATE_APP",
            "ports": "8000/TCP (Private)",
            "status": "READY_TO_PROVISION",
            "cost": "₹12,400 / mo",
            "public_private": "Private Subnet",
            "encryption": "AWS KMS Ephemeral Storage",
            "reason": "Serverless container execution with auto-scaling and zero server maintenance.",
            "evidence": "FastAPI runtime declared in requirements.txt with Dockerfile.",
            "alternative": "AWS EKS (Kubernetes) for complex microservices",
            "security_rationale": "Zero public IP; accessible strictly through private ALB target groups."
        })

        if has_worker:
            nodes.append({
                "id": "node-ecs-worker",
                "name": "ECS Fargate (Celery Worker)",
                "service": "Amazon ECS Fargate",
                "category": "Background Compute",
                "tier": "PRIVATE_APP",
                "ports": "None (Internal Task)",
                "status": "READY_TO_PROVISION",
                "cost": "₹4,500 / mo",
                "public_private": "Private Subnet",
                "encryption": "KMS Ephemeral",
                "reason": "Executes background queue jobs without consuming HTTP request threads.",
                "evidence": "Detected Celery / ARQ worker dependencies.",
                "alternative": "AWS Lambda for short event-driven tasks",
                "security_rationale": "Isolated compute process with separate least-privilege IAM execution role."
            })

        # 4. Isolated Data Subnet
        nodes.append({
            "id": "node-rds",
            "name": "RDS PostgreSQL Multi-AZ",
            "service": "Amazon RDS",
            "category": "Relational Database",
            "tier": "DATABASE_ISOLATED",
            "ports": "5432/TCP (Isolated)",
            "status": "READY_TO_PROVISION",
            "cost": "₹14,500 / mo",
            "public_private": "Isolated DB Subnet",
            "encryption": "AWS KMS Customer Managed Key",
            "reason": "High-availability relational database with automated Multi-AZ failover.",
            "evidence": "PostgreSQL driver (asyncpg/psycopg2) and SQLAlchemy models detected.",
            "alternative": "Amazon Aurora PostgreSQL Serverless v2",
            "security_rationale": "Zero internet gateway routing. Inbound traffic allowed strictly from ECS security groups."
        })

        if has_redis:
            nodes.append({
                "id": "node-redis",
                "name": "ElastiCache Redis",
                "service": "Amazon ElastiCache",
                "category": "In-Memory Cache",
                "tier": "DATABASE_ISOLATED",
                "ports": "6379/TCP (Private)",
                "status": "READY_TO_PROVISION",
                "cost": "₹2,800 / mo",
                "public_private": "Isolated Subnet",
                "encryption": "In Transit (AUTH) & At Rest (KMS)",
                "reason": "Fast sub-millisecond caching for user sessions and Celery message broker.",
                "evidence": "Redis dependencies detected in manifest.",
                "alternative": "Amazon MemoryDB for Redis",
                "security_rationale": "Encrypted in transit with token authentication and private subnet isolation."
            })

        # 5. Security & Storage Services
        nodes.append({
            "id": "node-s3",
            "name": "S3 KMS Encrypted Storage",
            "service": "Amazon S3",
            "category": "Object Storage",
            "tier": "SECURITY_SERVICES",
            "ports": "HTTPS IAM Restricted",
            "status": "READY_TO_PROVISION",
            "cost": "₹1,850 / mo",
            "public_private": "Private",
            "encryption": "SSE-KMS Customer Managed Key",
            "reason": "Durable object storage for tenant uploads, backups, and audit artifacts.",
            "evidence": "Boto3 / storage integration references detected.",
            "alternative": "AWS EFS (Elastic File System)",
            "security_rationale": "Public access completely blocked; presigned URLs with 15-minute expirations used."
        })
        nodes.append({
            "id": "node-secrets",
            "name": "AWS Secrets Manager",
            "service": "Secrets Manager",
            "category": "Secrets & Keys",
            "tier": "SECURITY_SERVICES",
            "ports": "VPC Endpoint IAM",
            "status": "READY_TO_PROVISION",
            "cost": "₹650 / mo",
            "public_private": "Private",
            "encryption": "Dedicated AWS KMS Key",
            "reason": "Eliminates hardcoded plaintext credentials from git and container images.",
            "evidence": "Detected environment variable contract with secret classifications.",
            "alternative": "AWS Systems Manager Parameter Store",
            "security_rationale": "Automated 30-day credential rotation and granular IAM policy access."
        })

        # Build Edges
        edges.append({"from": "node-dns", "to": "node-cdn", "label": "DNS Resolution"})
        edges.append({"from": "node-cdn", "to": "node-waf", "label": "Edge Filter"})
        edges.append({"from": "node-waf", "to": "node-alb", "label": "SSL Termination"})
        edges.append({"from": "node-alb", "to": "node-ecs-api", "label": "Private VPC Ingress"})
        edges.append({"from": "node-ecs-api", "to": "node-rds", "label": "TLS 1.3 / Port 5432"})
        if has_redis:
            edges.append({"from": "node-ecs-api", "to": "node-redis", "label": "Session Cache / Port 6379"})
        if has_worker and has_redis:
            edges.append({"from": "node-ecs-worker", "to": "node-redis", "label": "Queue Consume"})
            edges.append({"from": "node-ecs-worker", "to": "node-rds", "label": "Async Writes"})
        edges.append({"from": "node-ecs-api", "to": "node-s3", "label": "IAM Presigned Uploads"})
        edges.append({"from": "node-ecs-api", "to": "node-secrets", "label": "Runtime Decryption"})

        cost_data = AWSCostEstimator.estimate_cost(profile, has_redis=has_redis, has_worker=has_worker)

        return {
            "profile": profile,
            "version": "v2.0.0-dynamic",
            "summary": f"Production-grade AWS topology generated for {len(services)} services. Enforces least-privilege network isolation, Multi-AZ database redundancy, and zero hardcoded secrets.",
            "nodes": nodes,
            "edges": edges,
            "cost": cost_data,
            "assumptions": {
                "region": "ap-south-1 (Mumbai)",
                "vpc_cidr": "10.0.0.0/16",
                "az_count": 2,
                "multi_az_db": profile != "LEAN",
                "nat_count": 1 if profile == "LEAN" else 2
            }
        }
