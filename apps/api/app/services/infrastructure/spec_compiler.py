"""
Infrastructure Specification Compiler
Transforms approved Architecture recommendations and questionnaire inputs
into a normalized, deterministic InfrastructureSpecification.
"""
from typing import Dict, Any, List, Optional

class InfrastructureSpecCompiler:
    """Compiles high-level architecture recommendations into normalized IaC specifications."""

    @staticmethod
    def compile(
        app_name: str,
        env_name: str,
        profile: str = "BALANCED",
        region: str = "ap-south-1",
        detected_services: Optional[List[Dict[str, Any]]] = None,
        custom_inputs: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        profile = profile.upper() if profile else "BALANCED"
        if profile not in ["LEAN", "BALANCED", "HIGH_AVAILABILITY"]:
            profile = "BALANCED"

        custom = custom_inputs or {}
        sanitized_app = app_name.lower().replace(" ", "-").replace("_", "-")
        sanitized_env = env_name.lower().replace(" ", "-").replace("_", "-")
        name_prefix = f"launchcomply-{sanitized_app}-{sanitized_env}"

        # Sizing parameters based on Profile
        if profile == "LEAN":
            ecs_min_tasks = 1
            ecs_max_tasks = 2
            ecs_cpu = 256
            ecs_memory = 512
            db_instance_class = "db.t4g.small"
            db_multi_az = False
            nat_strategy = "single_nat"
            log_retention_days = 14
            backup_retention_days = 7
            azs = ["ap-south-1a", "ap-south-1b"]
            cache_node_type = "cache.t4g.micro"
        elif profile == "HIGH_AVAILABILITY":
            ecs_min_tasks = 4
            ecs_max_tasks = 16
            ecs_cpu = 1024
            ecs_memory = 2048
            db_instance_class = "db.r6g.large"
            db_multi_az = True
            nat_strategy = "multi_nat"
            log_retention_days = 90
            backup_retention_days = 35
            azs = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
            cache_node_type = "cache.t4g.medium"
        else: # BALANCED (Recommended default)
            ecs_min_tasks = 2
            ecs_max_tasks = 8
            ecs_cpu = 512
            ecs_memory = 1024
            db_instance_class = "db.t4g.medium"
            db_multi_az = True
            nat_strategy = "multi_nat"
            log_retention_days = 30
            backup_retention_days = 35
            azs = ["ap-south-1a", "ap-south-1b"]
            cache_node_type = "cache.t4g.small"

        # Determine services to provision based on detected services or defaults
        has_redis = True
        has_worker = True
        if detected_services:
            service_types = [s.get("service_type") for s in detected_services]
            has_redis = any(t in ["cache", "queue"] for t in service_types) or any("redis" in s.get("name", "").lower() for s in detected_services)
            has_worker = any(t == "worker" for t in service_types)

        spec = {
            "version": "1.0",
            "provider": "aws",
            "region": region,
            "environment": sanitized_env,
            "profile": profile,
            "name_prefix": name_prefix,
            "tags": {
                "ManagedBy": "LaunchComply",
                "LaunchComplyManaged": "true",
                "LaunchComplyApplication": sanitized_app,
                "LaunchComplyEnvironment": sanitized_env,
                "Profile": profile
            },
            "networking": {
                "vpc_cidr": custom.get("vpc_cidr", "10.0.0.0/16"),
                "availability_zones": azs,
                "public_subnets": ["10.0.1.0/24", "10.0.2.0/24"] if len(azs) == 2 else ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"],
                "private_app_subnets": ["10.0.10.0/24", "10.0.11.0/24"] if len(azs) == 2 else ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"],
                "isolated_db_subnets": ["10.0.20.0/24", "10.0.21.0/24"] if len(azs) == 2 else ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"],
                "nat_strategy": nat_strategy,
                "enable_dns_hostnames": True,
                "enable_dns_support": True
            },
            "edge": {
                "enabled": True,
                "price_class": "PriceClass_All" if profile == "HIGH_AVAILABILITY" else "PriceClass_100",
                "ssl_support_method": "sni-only",
                "minimum_protocol_version": "TLSv1.2_2021",
                "custom_domain": custom.get("domain_name", f"{sanitized_app}.launchcomply.run")
            },
            "waf": {
                "enabled": True,
                "default_action": "ALLOW",
                "rate_limit_per_five_minutes": 1000,
                "managed_rule_groups": [
                    "AWSManagedRulesCommonRuleSet",
                    "AWSManagedRulesKnownBadInputsRuleSet",
                    "AWSManagedRulesAmazonIpReputationList"
                ]
            },
            "alb": {
                "internal": False,
                "idle_timeout": 60,
                "enable_deletion_protection": profile != "LEAN",
                "drop_invalid_header_fields": True,
                "listeners": [
                    {"port": 80, "protocol": "HTTP", "action": "redirect_to_https"},
                    {"port": 443, "protocol": "HTTPS", "action": "forward_to_api"}
                ],
                "health_check": {
                    "path": custom.get("health_endpoint", "/health"),
                    "port": "8000",
                    "protocol": "HTTP",
                    "interval": 30,
                    "timeout": 5,
                    "healthy_threshold": 2,
                    "unhealthy_threshold": 3
                }
            },
            "compute": {
                "cluster_name": f"{name_prefix}-cluster",
                "api_service": {
                    "name": f"{name_prefix}-api",
                    "cpu": ecs_cpu,
                    "memory": ecs_memory,
                    "container_port": 8000,
                    "desired_count": ecs_min_tasks,
                    "min_count": ecs_min_tasks,
                    "max_count": ecs_max_tasks,
                    "enable_execute_command": True
                },
                "worker_service": {
                    "enabled": has_worker,
                    "name": f"{name_prefix}-worker",
                    "cpu": ecs_cpu,
                    "memory": ecs_memory,
                    "desired_count": 1 if profile == "LEAN" else 2
                }
            },
            "ecr": {
                "repositories": [
                    {"name": f"{name_prefix}-api", "scan_on_push": True, "immutable_tags": True},
                    {"name": f"{name_prefix}-worker", "scan_on_push": True, "immutable_tags": True}
                ],
                "lifecycle_rule_days": 30
            },
            "database": {
                "engine": "postgres",
                "engine_version": "16.3",
                "instance_class": db_instance_class,
                "allocated_storage_gb": 20 if profile == "LEAN" else 50,
                "max_allocated_storage_gb": 100 if profile == "LEAN" else 500,
                "multi_az": db_multi_az,
                "publicly_accessible": False, # Non-negotiable security guarantee
                "storage_encrypted": True,
                "deletion_protection": profile != "LEAN",
                "backup_retention_days": backup_retention_days,
                "db_name": sanitized_app.replace("-", "_"),
                "port": 5432
            },
            "cache": {
                "enabled": has_redis,
                "engine": "redis",
                "engine_version": "7.1",
                "node_type": cache_node_type,
                "num_cache_nodes": 1 if not db_multi_az else 2,
                "port": 6379,
                "transit_encryption_enabled": True,
                "at_rest_encryption_enabled": True,
                "publicly_accessible": False
            },
            "storage": {
                "bucket_name": f"{name_prefix}-vault",
                "block_public_access": True, # Strict AWS Block Public Access enabled
                "versioning_enabled": True,
                "kms_encrypted": True,
                "lifecycle_glacier_days": 90 if profile == "HIGH_AVAILABILITY" else 180
            },
            "kms": {
                "alias": f"alias/{name_prefix}-key",
                "description": f"Dedicated customer-managed KMS key for {sanitized_app} {sanitized_env}",
                "enable_key_rotation": True
            },
            "secrets": {
                "secret_name": f"{name_prefix}-env-secrets",
                "description": f"Production secrets injected at runtime for {sanitized_app}",
                "auto_rotate_days": 30
            },
            "monitoring": {
                "log_retention_days": log_retention_days,
                "alarms_enabled": True,
                "cpu_utilization_threshold": 80,
                "memory_utilization_threshold": 85,
                "alb_5xx_threshold": 10
            },
            "backup": {
                "policy_name": f"{name_prefix}-daily-backup",
                "retention_days": backup_retention_days,
                "schedule_cron": "cron(0 2 * * ? *)" # Daily 2 AM UTC
            }
        }
        return spec
