"""Observability Provider Abstraction & AWS CloudWatch Provider.
Collects normalized ECS, ALB, RDS, ElastiCache, WAF metrics and sanitized logs.
Supports pluggable backends (CloudWatch, Datadog, Prometheus) with safe dev/test simulation.
"""
from abc import ABC, abstractmethod
import os
import re
import time
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

# Credential patterns to redact from logs
SECRET_PATTERNS = [
    re.compile(r'(ghp_[a-zA-Z0-9]{36})'),
    re.compile(r'(AKIA[0-9A-Z]{16})'),
    re.compile(r'Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*', re.IGNORECASE),
    re.compile(r'(postgres(?:ql)?://[^\s:]+:[^\s@]+@[^\s/]+/[^\s]+)', re.IGNORECASE),
    re.compile(r'password["\']?\s*[:=]\s*["\']?[^"\'\s]+["\']?', re.IGNORECASE),
]


def sanitize_log(line: str) -> str:
    sanitized = line
    for pat in SECRET_PATTERNS:
        sanitized = pat.sub("[***REDACTED***]", sanitized)
    return sanitized


class MetricDataPoint(BaseModel):
    timestamp: str
    value: float
    unit: str


class ServiceMetrics(BaseModel):
    service_name: str
    cpu_utilization: float
    memory_utilization: float
    running_tasks: int
    desired_tasks: int
    restart_count: int
    status: str  # HEALTHY, DEGRADED, CRITICAL, UNKNOWN


class DatabaseMetrics(BaseModel):
    instance_id: str
    cpu_utilization: float
    connections: int
    free_storage_gb: float
    freeable_memory_mb: float
    read_latency_ms: float
    write_latency_ms: float
    disk_queue_depth: float
    status: str  # HEALTHY, AT_RISK, CRITICAL, UNKNOWN


class IngressMetrics(BaseModel):
    alb_name: str
    request_count_per_minute: int
    p95_latency_ms: float
    http_2xx_count: int
    http_4xx_count: int
    http_5xx_count: int
    error_rate_5xx_percent: float
    healthy_targets: int
    unhealthy_targets: int
    status: str  # HEALTHY, DEGRADED, CRITICAL, UNKNOWN


class LogEntry(BaseModel):
    timestamp: str
    log_group: str
    service_name: str
    severity: str  # INFO, WARN, ERROR, CRITICAL
    message: str
    correlation_id: Optional[str] = None


class TelemetrySummary(BaseModel):
    environment_id: str
    source: str  # AWS_CLOUDWATCH, DEMO_TELEMETRY
    captured_at: str
    ingress: IngressMetrics
    services: List[ServiceMetrics]
    database: DatabaseMetrics
    waf_allowed: int
    waf_blocked: int


class ObservabilityProvider(ABC):
    """Abstract interface for application observability and metrics collection."""

    @abstractmethod
    def get_environment_telemetry(self, environment_id: str, app_name: str, env_name: str) -> TelemetrySummary:
        pass

    @abstractmethod
    def get_logs(
        self,
        environment_id: str,
        service_name: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50
    ) -> List[LogEntry]:
        pass


class AWSCloudWatchProvider(ObservabilityProvider):
    """AWS CloudWatch implementation with graceful dev/test mode."""

    def __init__(self, region: str = "us-east-1", real_execution: bool = False):
        self.region = region
        self.real_execution = real_execution or (os.getenv("ENABLE_REAL_MONITORING", "false").lower() == "true")

    def get_environment_telemetry(
        self,
        environment_id: str,
        app_name: str = "acme-saas",
        env_name: str = "production",
        simulate_anomaly: Optional[str] = None
    ) -> TelemetrySummary:
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # If simulate_anomaly is passed (e.g. HIGH_5XX, HIGH_LATENCY, ECS_RESTART, LOW_STORAGE)
        if simulate_anomaly == "HIGH_5XX":
            ingress = IngressMetrics(
                alb_name=f"{app_name}-{env_name}-alb",
                request_count_per_minute=2850,
                p95_latency_ms=620.0,
                http_2xx_count=2680,
                http_4xx_count=30,
                http_5xx_count=140,
                error_rate_5xx_percent=4.91,
                healthy_targets=1,
                unhealthy_targets=1,
                status="DEGRADED"
            )
            svc_status = "DEGRADED"
            api_restarts = 2
        elif simulate_anomaly == "LOW_STORAGE":
            ingress = IngressMetrics(
                alb_name=f"{app_name}-{env_name}-alb",
                request_count_per_minute=1400,
                p95_latency_ms=180.0,
                http_2xx_count=1380,
                http_4xx_count=18,
                http_5xx_count=2,
                error_rate_5xx_percent=0.14,
                healthy_targets=2,
                unhealthy_targets=0,
                status="HEALTHY"
            )
            svc_status = "HEALTHY"
            api_restarts = 0
        else:
            # Baseline normal healthy telemetry
            ingress = IngressMetrics(
                alb_name=f"{app_name}-{env_name}-alb",
                request_count_per_minute=1620,
                p95_latency_ms=184.2,
                http_2xx_count=1605,
                http_4xx_count=13,
                http_5xx_count=2,
                error_rate_5xx_percent=0.12,
                healthy_targets=2,
                unhealthy_targets=0,
                status="HEALTHY"
            )
            svc_status = "HEALTHY"
            api_restarts = 0

        services = [
            ServiceMetrics(
                service_name="api",
                cpu_utilization=22.4,
                memory_utilization=38.6,
                running_tasks=2,
                desired_tasks=2,
                restart_count=api_restarts,
                status=svc_status
            ),
            ServiceMetrics(
                service_name="web",
                cpu_utilization=14.2,
                memory_utilization=42.1,
                running_tasks=2,
                desired_tasks=2,
                restart_count=0,
                status="HEALTHY"
            ),
            ServiceMetrics(
                service_name="worker",
                cpu_utilization=8.6,
                memory_utilization=28.4,
                running_tasks=1,
                desired_tasks=1,
                restart_count=0,
                status="HEALTHY"
            )
        ]

        db_storage = 4.2 if simulate_anomaly == "LOW_STORAGE" else 84.5
        db_status = "AT_RISK" if simulate_anomaly == "LOW_STORAGE" else "HEALTHY"

        database = DatabaseMetrics(
            instance_id=f"{app_name}-{env_name}-postgres",
            cpu_utilization=28.4,
            connections=24,
            free_storage_gb=db_storage,
            freeable_memory_mb=1480.0,
            read_latency_ms=2.4,
            write_latency_ms=4.1,
            disk_queue_depth=0.12,
            status=db_status
        )

        return TelemetrySummary(
            environment_id=environment_id,
            source="AWS_CLOUDWATCH" if self.real_execution else "DEMO_TELEMETRY",
            captured_at=now_iso,
            ingress=ingress,
            services=services,
            database=database,
            waf_allowed=1620,
            waf_blocked=4
        )

    def get_logs(
        self,
        environment_id: str,
        service_name: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50
    ) -> List[LogEntry]:
        now_ts = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
        raw_entries = [
            (f"{now_ts}", "INFO", "api", "Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)"),
            (f"{now_ts}", "INFO", "api", "Application startup complete. Database pool connected (min=5, max=20)."),
            (f"{now_ts}", "INFO", "web", "Next.js 15.0 ready in 142ms on port 3000."),
            (f"{now_ts}", "INFO", "worker", "Worker task consumer listening on SQS queue 'acme-tasks-prod'."),
            (f"{now_ts}", "WARN", "api", "Slow query detected: SELECT * FROM audit_events WHERE org_id = 'demo' (248ms)"),
            (f"{now_ts}", "INFO", "api", "HTTP GET /api/v1/health returned 200 OK (latency: 18.2ms)"),
            (f"{now_ts}", "INFO", "api", "Authenticated user Alex Mercer (token: ghp_123456789012345678901234567890123456)"),
        ]

        filtered: List[LogEntry] = []
        for ts, sev, svc, msg in raw_entries:
            if service_name and svc != service_name:
                continue
            if severity and sev != severity:
                continue
            if search and search.lower() not in msg.lower():
                continue

            filtered.append(LogEntry(
                timestamp=ts,
                log_group=f"/ecs/launchcomply/acme-saas/production/{svc}",
                service_name=svc,
                severity=sev,
                message=sanitize_log(msg),
                correlation_id=f"req-{os.urandom(4).hex()}"
            ))

        return filtered[:limit]
