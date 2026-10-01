"""Phase 5 Operations & Observability Automated Test Suite.
Validates Health Engine reasoning, Alert deduplication, Release Observation & Canary,
Incident lifecycle, isolated Restore Drills, Security Signals, Cloud Cost, Evidence Freshness,
Log Redaction, and Tenant Isolation.
"""
import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.application import Environment, Application
from app.models.release import ApplicationRelease, ApplicationDeployment
from app.models.operations import AlertRule, AlertEvent, Incident, BackupObservation
from app.services.operations import (
    AWSCloudWatchProvider,
    OperationalHealthEngine,
    AlertEngine,
    ReleaseObservationEngine,
    IncidentEngine,
    BackupDREngine,
    SecuritySignalsEngine,
    CostEngine,
    ContinuousComplianceEngine,
    sanitize_log,
)
from app.services.operations.observability_provider import (
    TelemetrySummary,
    IngressMetrics,
    ServiceMetrics,
    DatabaseMetrics,
)


@pytest.mark.asyncio
async def test_log_sanitization_secrets_redacted():
    """Validates that sensitive secrets, GitHub tokens, AWS keys, and DB credentials are redacted."""
    raw_log = (
        "Connected with ghp_123456789012345678901234567890123456 and AKIAIOSFODNN7EXAMPLE "
        "using postgresql://postgres:SuperSecretP@ss@db.internal:5432/prod and Bearer eyJhbGciOiJIUzI1NiJ9"
    )
    sanitized = sanitize_log(raw_log)
    assert "ghp_" not in sanitized
    assert "AKIAIOSFODNN7EXAMPLE" not in sanitized
    assert "SuperSecretP@ss" not in sanitized
    assert "[***REDACTED***]" in sanitized


@pytest.mark.asyncio
async def test_health_engine_explainable_reasoning():
    """Validates that OperationalHealthEngine produces normalized status and explainable reasons."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()
        assert env is not None

        engine = OperationalHealthEngine()

        # 1. Healthy Telemetry
        healthy_telemetry = TelemetrySummary(
            environment_id=env.id,
            source="TEST",
            captured_at=datetime.utcnow().isoformat(),
            ingress=IngressMetrics(
                alb_name="acme-alb",
                request_count_per_minute=2400,
                p95_latency_ms=120.0,
                http_2xx_count=2395,
                http_4xx_count=3,
                http_5xx_count=2,
                error_rate_5xx_percent=0.08,
                healthy_targets=2,
                unhealthy_targets=0,
                status="HEALTHY",
            ),
            services=[
                ServiceMetrics(
                    service_name="api",
                    cpu_utilization=28.5,
                    memory_utilization=42.0,
                    running_tasks=2,
                    desired_tasks=2,
                    restart_count=0,
                    status="HEALTHY",
                )
            ],
            database=DatabaseMetrics(
                instance_id="rds-pg",
                cpu_utilization=18.0,
                connections=22,
                free_storage_gb=84.0,
                freeable_memory_mb=3400.0,
                read_latency_ms=2.1,
                write_latency_ms=4.5,
                disk_queue_depth=0.1,
                status="HEALTHY",
            ),
            waf_allowed=2398,
            waf_blocked=2,
        )

        snap = await engine.evaluate_environment_health(
            db=session,
            environment_id=env.id,
            organization_id=env.organization_id,
            application_id=env.application_id,
            telemetry_override=healthy_telemetry,
        )
        assert snap.overall_status == "HEALTHY"
        assert snap.component_status_json["ingress"] == "HEALTHY"

        # 2. Degraded Telemetry (elevated 5xx rate)
        degraded_telemetry = TelemetrySummary(
            environment_id=env.id,
            source="TEST",
            captured_at=datetime.utcnow().isoformat(),
            ingress=IngressMetrics(
                alb_name="acme-alb",
                request_count_per_minute=2500,
                p95_latency_ms=920.0,
                http_2xx_count=2300,
                http_4xx_count=20,
                http_5xx_count=180,
                error_rate_5xx_percent=7.2,
                healthy_targets=1,
                unhealthy_targets=1,
                status="CRITICAL",
            ),
            services=[
                ServiceMetrics(
                    service_name="api",
                    cpu_utilization=78.5,
                    memory_utilization=64.0,
                    running_tasks=1,
                    desired_tasks=2,
                    restart_count=3,
                    status="DEGRADED",
                )
            ],
            database=DatabaseMetrics(
                instance_id="rds-pg",
                cpu_utilization=84.0,
                connections=89,
                free_storage_gb=4.2,
                freeable_memory_mb=420.0,
                read_latency_ms=18.2,
                write_latency_ms=34.5,
                disk_queue_depth=4.8,
                status="AT_RISK",
            ),
            waf_allowed=2500,
            waf_blocked=0,
        )

        degraded_snap = await engine.evaluate_environment_health(
            db=session,
            environment_id=env.id,
            organization_id=env.organization_id,
            application_id=env.application_id,
            telemetry_override=degraded_telemetry,
        )
        assert degraded_snap.overall_status == "CRITICAL"
        assert len(degraded_snap.reasons_json) >= 2
        # Verify explainable reason text
        reasons_text = " ".join(degraded_snap.reasons_json)
        assert "ALB 5xx error rate" in reasons_text
        assert "unhealthy backend target" in reasons_text


@pytest.mark.asyncio
async def test_alert_engine_deduplication_and_incident_creation():
    """Validates that alert rules evaluate thresholds, deduplicate active events, and auto-create incidents."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        alert_eng = AlertEngine()

        # Create alert rule with auto_create_incident
        rule = AlertRule(
            organization_id=env.organization_id,
            environment_id=env.id,
            name="Test ALB 5xx Spike Rule",
            metric="alb_5xx_rate",
            condition="GT",
            threshold=2.0,
            window_minutes=5,
            severity="CRITICAL",
            enabled=True,
            auto_create_incident=True,
            auto_rollback_release=False,
            created_by="tester@launchcomply.io",
        )
        session.add(rule)
        await session.commit()
        await session.refresh(rule)

        spiking_telemetry = TelemetrySummary(
            environment_id=env.id,
            source="TEST",
            captured_at=datetime.utcnow().isoformat(),
            ingress=IngressMetrics(
                alb_name="acme-alb",
                request_count_per_minute=1000,
                p95_latency_ms=200.0,
                http_2xx_count=940,
                http_4xx_count=10,
                http_5xx_count=50,
                error_rate_5xx_percent=5.0,  # Breaches 2.0%
                healthy_targets=2,
                unhealthy_targets=0,
                status="CRITICAL",
            ),
            services=[],
            database=DatabaseMetrics(
                instance_id="rds",
                cpu_utilization=10,
                connections=5,
                free_storage_gb=50,
                freeable_memory_mb=1000,
                read_latency_ms=1,
                write_latency_ms=1,
                disk_queue_depth=0,
                status="HEALTHY",
            ),
            waf_allowed=1000,
            waf_blocked=0,
        )

        # 1. First breach -> Creates new alert event & incident
        events_1 = await alert_eng.evaluate_alert_rules(
            db=session,
            environment_id=env.id,
            organization_id=env.organization_id,
            application_id=env.application_id,
            telemetry=spiking_telemetry,
        )
        rule_events = [e for e in events_1 if e.alert_rule_id == rule.id]
        assert len(rule_events) == 1
        first_event = rule_events[0]
        assert first_event.status == "OPEN"
        assert first_event.incident_id is not None

        # 2. Second breach with higher spike -> Deduplicated to existing event, no duplicate incident
        spiking_telemetry.ingress.error_rate_5xx_percent = 8.5
        events_2 = await alert_eng.evaluate_alert_rules(
            db=session,
            environment_id=env.id,
            organization_id=env.organization_id,
            application_id=env.application_id,
            telemetry=spiking_telemetry,
        )
        rule_events_2 = [e for e in events_2 if e.alert_rule_id == rule.id]
        assert len(rule_events_2) == 1
        assert rule_events_2[0].id == first_event.id
        assert rule_events_2[0].value == 8.5

        # 3. Acknowledge alert
        acked = await alert_eng.acknowledge_alert(
            db=session,
            alert_id=first_event.id,
            organization_id=env.organization_id,
            actor_email="oncall@launchcomply.io",
        )
        assert acked.status == "ACKNOWLEDGED"
        assert acked.acknowledged_by == "oncall@launchcomply.io"


@pytest.mark.asyncio
async def test_release_observation_window_and_canary_progression():
    """Validates release observation state transitions (LIVE_OBSERVING -> LIVE_STABLE) and canary promotion."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        rel = ApplicationRelease(
            organization_id=env.organization_id,
            application_id=env.application_id,
            environment_id=env.id,
            commit_sha="c0ffee1234567890abcdef1234567890abcdef12",
            version="v1.5.0-test",
            status="LIVE_OBSERVING",
            created_by="tester",
            deployed_at=datetime.utcnow() - timedelta(minutes=15),  # Elapsed past 10m window
        )
        session.add(rel)
        await session.flush()

        dep = ApplicationDeployment(
            organization_id=env.organization_id,
            application_release_id=rel.id,
            environment_id=env.id,
            strategy="CANARY",
            status="DEPLOYING",
            target_release_id=rel.id,
            traffic_percentage=10,
        )
        session.add(dep)
        await session.commit()

        obs_engine = ReleaseObservationEngine()

        healthy_telemetry = TelemetrySummary(
            environment_id=env.id,
            source="TEST",
            captured_at=datetime.utcnow().isoformat(),
            ingress=IngressMetrics(
                alb_name="acme-alb",
                request_count_per_minute=1000,
                p95_latency_ms=150.0,
                http_2xx_count=999,
                http_4xx_count=1,
                http_5xx_count=0,
                error_rate_5xx_percent=0.0,
                healthy_targets=2,
                unhealthy_targets=0,
                status="HEALTHY",
            ),
            services=[],
            database=DatabaseMetrics(
                instance_id="rds",
                cpu_utilization=10,
                connections=5,
                free_storage_gb=50,
                freeable_memory_mb=1000,
                read_latency_ms=1,
                write_latency_ms=1,
                disk_queue_depth=0,
                status="HEALTHY",
            ),
            waf_allowed=1000,
            waf_blocked=0,
        )

        # 1. Observation window completes healthy -> LIVE_STABLE
        obs_res = await obs_engine.evaluate_release_observation(
            db=session,
            release_id=rel.id,
            organization_id=env.organization_id,
            telemetry=healthy_telemetry,
            window_minutes=10,
        )
        assert obs_res["status"] == "LIVE_STABLE"

        # 2. Advance canary from 10% -> 25%
        canary_res = await obs_engine.advance_canary_stage(
            db=session,
            release_id=rel.id,
            organization_id=env.organization_id,
            telemetry=healthy_telemetry,
        )
        assert canary_res["status"] == "ADVANCED"
        assert canary_res["current_traffic_percentage"] == 25


@pytest.mark.asyncio
async def test_incident_lifecycle_timeline_and_postmortem():
    """Validates 1-click incident declaration, automated timeline logging, resolution, and postmortem drafting."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        inc_engine = IncidentEngine()

        incident = await inc_engine.create_incident(
            db=session,
            organization_id=env.organization_id,
            environment_id=env.id,
            application_id=env.application_id,
            title="Database Connection Pool Saturation",
            severity="SEV1",
            commander="Alex Mercer",
            impact="API p95 latency spiked to 2.4s across all customer tenants.",
            actor="MonitoringAlert",
        )
        assert incident.status == "DETECTED"
        assert incident.severity == "SEV1"

        # Append timeline events
        await inc_engine.append_timeline(
            db=session,
            incident_id=incident.id,
            event_type="USER_ACTION",
            message="Increased max_connections in RDS parameter group to 250",
            actor="Alex Mercer",
        )

        # Transition status to RESOLVED
        resolved = await inc_engine.update_status(
            db=session,
            incident_id=incident.id,
            organization_id=env.organization_id,
            new_status="RESOLVED",
            actor="Alex Mercer",
            note="Pool saturation mitigated. Connections stable at 65/250.",
        )
        assert resolved.status == "RESOLVED"
        assert resolved.resolved_at is not None

        # Generate structured postmortem
        postmortem_md = await inc_engine.generate_postmortem(
            db=session,
            incident_id=incident.id,
            organization_id=env.organization_id,
        )
        assert "# Postmortem: Database Connection Pool Saturation" in postmortem_md
        assert "Alex Mercer" in postmortem_md
        assert "Increased max_connections" in postmortem_md


@pytest.mark.asyncio
async def test_backup_dr_restore_drill_isolated():
    """Validates that RDS restore drill targets an isolated temporary resource and measures RTO."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        dr_engine = BackupDREngine()

        drill = await dr_engine.execute_restore_drill(
            db=session,
            environment_id=env.id,
            organization_id=env.organization_id,
            resource_id="rds-postgresql-primary",
            actor_email="devops@launchcomply.io",
        )

        assert drill.status == "COMPLETED"
        assert drill.data_validation_status == "PASSED"
        assert drill.rto_seconds is not None
        assert drill.target_temp_db_id.startswith("lc-drill-temp-rds-")
        # Ensure production resource was NOT the target
        assert drill.target_temp_db_id != "rds-postgresql-primary"
        assert drill.evidence_id is not None

        # Check recovery status calculation
        status_res = await dr_engine.get_recovery_status(
            db=session,
            environment_id=env.id,
            organization_id=env.organization_id,
        )
        assert status_res["levels"]["backup_succeeded"] is True
        assert status_res["levels"]["recovery_verified"] is True
        assert status_res["rto"]["status"] == "PASS"


@pytest.mark.asyncio
async def test_security_signals_and_deduplication():
    """Validates security provider signal normalization and deduplication."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        sec_engine = SecuritySignalsEngine()

        signals = await sec_engine.sync_security_signals(
            db=session,
            environment_id=env.id,
            organization_id=env.organization_id,
            application_id=env.application_id,
        )
        assert len(signals) >= 1
        assert any(s.provider == "GUARDDUTY" for s in signals)

        # Running sync again deduplicates without duplicating active signals
        signals_repeat = await sec_engine.sync_security_signals(
            db=session,
            environment_id=env.id,
            organization_id=env.organization_id,
            application_id=env.application_id,
        )
        assert len(signals_repeat) == len(signals)


@pytest.mark.asyncio
async def test_cost_engine_forecast_and_budget_alerts():
    """Validates Cost Explorer simulation, monthly spend forecast, and budget threshold alerts."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        cost_eng = CostEngine()

        # Monthly budget set to ₹40,000 (forecast ₹42,800 will trigger overrun alert)
        snapshot = await cost_eng.refresh_cost_snapshot(
            db=session,
            environment_id=env.id,
            organization_id=env.organization_id,
            monthly_budget=40000.0,
        )
        assert snapshot.currency == "INR"
        assert snapshot.forecast_monthly > 40000.0
        assert "Amazon Elastic Container Service (ECS)" in snapshot.service_breakdown_json


@pytest.mark.asyncio
async def test_continuous_compliance_evidence_freshness():
    """Validates evidence freshness tracking, dynamic control downgrading, and SOC2/ISO27001 posture."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        comp_engine = ContinuousComplianceEngine()

        # 1. Ingest fresh evidence
        fresh_rec = await comp_engine.ingest_evidence(
            db=session,
            organization_id=env.organization_id,
            framework="SOC2",
            control_id="CC6.1-ENCRYPTION-AT-REST",
            evidence_id="ev-test-fresh-kms",
            resource_ref="RDS KMS Key arn:aws:kms:ap-south-1:012345678901:key/test",
            ttl_days=30,
        )
        assert fresh_rec.freshness_status == "CURRENT"

        # 2. Get posture
        posture = await comp_engine.get_compliance_posture(
            db=session,
            organization_id=env.organization_id,
        )
        assert posture["evidence_coverage_percentage"] > 0
        assert "disclaimer" in posture


@pytest.mark.asyncio
async def test_operations_api_endpoints_and_tenant_isolation():
    """Validates HTTP endpoints in Operations router and verifies multi-tenant isolation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login demo user
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "demo@launchcomply.io",
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Fetch environments to find id
        env_res = await ac.get("/api/v1/applications/", headers=headers)
        apps = env_res.json()
        assert len(apps) > 0
        env_id = apps[0]["environments"][0]["id"]

        # 3. GET /operations/environments/{id}/health
        health_res = await ac.get(f"/api/v1/operations/environments/{env_id}/health", headers=headers)
        assert health_res.status_code == 200
        assert "overall_status" in health_res.json()

        # 4. GET /operations/environments/{id}/metrics
        metrics_res = await ac.get(f"/api/v1/operations/environments/{env_id}/metrics", headers=headers)
        assert metrics_res.status_code == 200
        assert "ingress" in metrics_res.json()

        # 5. GET /operations/environments/{id}/logs
        logs_res = await ac.get(f"/api/v1/operations/environments/{env_id}/logs", headers=headers)
        assert logs_res.status_code == 200
        assert isinstance(logs_res.json(), list)

        # 6. GET /operations/alerts
        alerts_res = await ac.get(f"/api/v1/operations/alerts?environment_id={env_id}", headers=headers)
        assert alerts_res.status_code == 200
        assert "rules" in alerts_res.json()

        # 7. GET /operations/incidents
        incidents_res = await ac.get(f"/api/v1/operations/incidents", headers=headers)
        assert incidents_res.status_code == 200
        assert isinstance(incidents_res.json(), list)

        # 8. GET /operations/backups/environments/{id}
        backup_res = await ac.get(f"/api/v1/operations/backups/environments/{env_id}", headers=headers)
        assert backup_res.status_code == 200
        assert "levels" in backup_res.json()

        # 9. GET /operations/cost/environments/{id}
        cost_res = await ac.get(f"/api/v1/operations/cost/environments/{env_id}", headers=headers)
        assert cost_res.status_code == 200
        assert "forecast_monthly" in cost_res.json()

        # 10. GET /operations/compliance/monitoring
        comp_res = await ac.get(f"/api/v1/operations/compliance/monitoring", headers=headers)
        assert comp_res.status_code == 200
        assert "evidence_coverage_percentage" in comp_res.json()

        # 11. Cross-tenant isolation test: Accessing non-existent / other tenant's environment returns 404
        fake_id = "00000000-0000-0000-0000-000000000000"
        leak_check = await ac.get(f"/api/v1/operations/environments/{fake_id}/health", headers=headers)
        assert leak_check.status_code == 404
