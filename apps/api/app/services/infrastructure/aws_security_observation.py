"""Read-only, bounded AWS security observations. No scan, remediation or sample findings."""
from datetime import datetime, timezone
from app.services.infrastructure.aws_account_connection import customer_session

SECURITY_READ_ACTIONS = ["securityhub:GetFindings", "guardduty:ListDetectors", "guardduty:ListFindings", "guardduty:GetFindings"]


def text(value, limit=500):
    return value[:limit] if isinstance(value, str) else ""


def timestamp(value):
    return value.isoformat() if hasattr(value, "isoformat") else text(value, 80)


def unavailable(error):
    from botocore.exceptions import ClientError
    code = error.response.get("Error", {}).get("Code", "") if isinstance(error, ClientError) else ""
    return "ACCESS_DENIED" if code in {"AccessDenied", "AccessDeniedException", "UnauthorizedOperation"} else "UNAVAILABLE"


def observe(account_id, role_arn, external_id, region):
    from botocore.exceptions import BotoCoreError, ClientError
    customer, config, identity = customer_session(account_id, role_arn, external_id, region)
    findings, sources = [], []
    try:
        response = customer.client("securityhub", config=config).get_findings(Filters={
            "AwsAccountId": [{"Value": identity["Account"], "Comparison": "EQUALS"}],
            "RecordState": [{"Value": "ACTIVE", "Comparison": "EQUALS"}],
            "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}, {"Value": "NOTIFIED", "Comparison": "EQUALS"}]},
            SortCriteria=[{"Field": "UpdatedAt", "SortOrder": "desc"}], MaxResults=50)
        rows = [row for row in response.get("Findings", []) if row.get("AwsAccountId") == account_id]
        for row in rows:
            findings.append({"id": text(row.get("Id"), 1000), "provider": "SECURITY_HUB", "title": text(row.get("Title")),
                "severity": text((row.get("Severity") or {}).get("Label"), 30) or "UNKNOWN",
                "status": text((row.get("Workflow") or {}).get("Status"), 30) or "UNKNOWN",
                "updated_at": timestamp(row.get("UpdatedAt")), "region": region,
                "resource": text(next((resource.get("Id") for resource in row.get("Resources", []) if resource.get("Id")), ""), 1000)})
        sources.append({"provider": "SECURITY_HUB", "status": "OBSERVED", "count": len(rows), "truncated": bool(response.get("NextToken"))})
    except (BotoCoreError, ClientError) as error:
        sources.append({"provider": "SECURITY_HUB", "status": unavailable(error), "count": None, "truncated": False})
    try:
        client = customer.client("guardduty", config=config)
        detectors = client.list_detectors(MaxResults=5)
        ids = detectors.get("DetectorIds", [])[:1]
        rows, truncated = [], bool(detectors.get("NextToken") or len(detectors.get("DetectorIds", [])) > 1)
        for detector in ids:
            listed = client.list_findings(DetectorId=detector, MaxResults=50,
                FindingCriteria={"Criterion": {"accountId": {"Eq": [account_id]}, "service.archived": {"Eq": ["false"]}}},
                SortCriteria={"AttributeName": "updatedAt", "OrderBy": "DESC"})
            truncated = truncated or bool(listed.get("NextToken"))
            if listed.get("FindingIds"):
                found = client.get_findings(DetectorId=detector, FindingIds=listed["FindingIds"][:50])
                rows.extend(row for row in found.get("Findings", []) if row.get("AccountId") == account_id)
        for row in rows:
            severity = row.get("Severity")
            label = "UNKNOWN"
            if isinstance(severity, (int, float)):
                label = "CRITICAL" if severity >= 9 else "HIGH" if severity >= 7 else "MEDIUM" if severity >= 4 else "LOW"
            findings.append({"id": text(row.get("Id"), 1000), "provider": "GUARDDUTY", "title": text(row.get("Title")),
                "severity": label, "status": "ACTIVE", "updated_at": timestamp(row.get("UpdatedAt")), "region": region,
                "resource": text(row.get("Type"), 1000)})
        sources.append({"provider": "GUARDDUTY", "status": "OBSERVED" if ids else "NOT_ENABLED", "count": len(rows) if ids else None, "truncated": truncated})
    except (BotoCoreError, ClientError) as error:
        sources.append({"provider": "GUARDDUTY", "status": unavailable(error), "count": None, "truncated": False})
    return {"checked_at": datetime.now(timezone.utc).isoformat(), "region": region, "account_id": account_id,
        "findings": findings, "sources": sources,
        "scope": "Latest bounded active findings from this AWS account and region. Sources may overlap; this is not a complete assessment, attack test or compliance certification."}
