"""Curated design guidance, separate from inspected customer source evidence."""

NETWORK_GUIDANCE = {
    "scope": "AWS reference guidance only; not an observed or provisioned customer network.",
    "references": [
        {"title": "VPC with private servers and NAT", "url": "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-example-private-subnets-nat.html"},
        {"title": "Fargate task networking", "url": "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html"},
        {"title": "Application Load Balancers", "url": "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html"},
    ],
    "design_checks": [
        "Public/private describes subnet routing inside a VPC, not two mandatory VPC types.",
        "For public container services, consider an internet-facing ALB in public subnets and private compute without public IPs. Confirm listener and health-check ports from source.",
        "Use separate private data subnets for VPC-hosted persistence; restrict its security group to actual consumers. Do not invent database sharing between repositories.",
        "Public routes use an internet gateway; private outbound access needs an explicit NAT or supported VPC endpoint strategy. Avoid direct internet routes for isolated data subnets.",
        "Consider zonal NAT resilience and endpoint coverage, with cost tradeoffs. Do not assume a NAT is needed for all workloads.",
        "Static S3/CloudFront sites, DynamoDB and managed service APIs do not run in customer subnets. Lambda VPC attachment is optional and must be justified.",
        "A VPC is regional and a subnet belongs to one AZ. Multi-region recovery needs separate VPCs, replication, routing and failover decisions; do not promise automatic recovery.",
        "CIDRs must not overlap existing customer networks. DNS, TLS certificates, secrets injection, least privilege IAM, logging, backups, scaling and load tests remain explicit design decisions.",
        "An ambiguous static-hosting/container or CloudFront/ALB candidate must be resolved before choosing network placement. Dependency presence alone does not prove runtime usage.",
    ],
}
