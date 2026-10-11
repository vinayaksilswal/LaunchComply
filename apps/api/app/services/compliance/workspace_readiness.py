"""Explainable readiness from current recorded controls; never seed customer results."""
from datetime import datetime
from sqlalchemy import select
from app.models.compliance_framework import (FrameworkVersion, CanonicalControl, ControlFrameworkMapping,
    ControlImplementation, ControlEvidenceMapping, ControlTest, ControlException)

async def workspace_readiness(db, organization_id, framework_code=None):
    now = datetime.utcnow()
    frameworks = (await db.execute(select(FrameworkVersion).where(FrameworkVersion.status == "ACTIVE")
        .order_by(FrameworkVersion.name))).scalars().all()
    mapped = (await db.execute(select(ControlFrameworkMapping, CanonicalControl).join(CanonicalControl,
        CanonicalControl.id == ControlFrameworkMapping.canonical_control_id))).all()
    implementations = (await db.execute(select(ControlImplementation).where(
        ControlImplementation.organization_id == organization_id).order_by(ControlImplementation.updated_at.desc()))).scalars().all()
    evidence = (await db.execute(select(ControlEvidenceMapping).where(ControlEvidenceMapping.organization_id == organization_id))).scalars().all()
    tests = (await db.execute(select(ControlTest).where(ControlTest.organization_id == organization_id)
        .order_by(ControlTest.tested_at.desc(), ControlTest.id.desc()))).scalars().all()
    exceptions = (await db.execute(select(ControlException).where(ControlException.organization_id == organization_id,
        ControlException.status.in_(["OPEN", "IN_PROGRESS", "ACCEPTED"])))) .scalars().all()
    impl_by_control = {}
    for item in implementations:
        impl_by_control.setdefault(item.control_id, item)
    latest_test = {}
    for item in tests:
        latest_test.setdefault(item.control_implementation_id, item)
    results = []
    for framework in frameworks:
        if framework_code and framework.code != framework_code:
            continue
        controls = {}
        for mapping, control in mapped:
            if mapping.framework_version_id == framework.id:
                controls.setdefault(control.id, (control, []))[1].append(mapping.requirement_code)
        rows = []
        for control, requirements in controls.values():
            impl = impl_by_control.get(control.id)
            reasons = []
            if not impl:
                reasons.append("Assign an owner and document the implementation.")
            else:
                if not impl.applicable:
                    reasons.append("Applicability exclusion needs scope review; it does not remove this requirement from the score.")
                if impl.status != "EFFECTIVE":
                    reasons.append("Implementation needs an effectiveness review.")
                if not impl.owner or not impl.implementation_description:
                    reasons.append("Assign an owner and document the implementation.")
                if not impl.last_reviewed_at or impl.last_reviewed_at > now or not impl.next_review_at or impl.next_review_at <= now:
                    reasons.append("A current control review and future review date are required.")
                valid = [item for item in evidence if item.control_implementation_id == impl.id
                    and item.quality_state in {"VERIFIED_AUTOMATED", "VERIFIED_MANUAL"}
                    and item.collected_at <= now < item.valid_until and item.evidence_id and item.sha256_hash
                    and (item.quality_state != "VERIFIED_MANUAL" or item.reviewer)]
                if not valid:
                    reasons.append("Attach current, reviewed evidence.")
                test = latest_test.get(impl.id)
                if not test or test.result != "PASS" or test.exceptions_found or test.tested_at > now or not impl.last_reviewed_at or test.tested_at < impl.last_reviewed_at:
                    reasons.append("Record a passing effectiveness test for the current review.")
                if any(item.control_implementation_id == impl.id for item in exceptions):
                    reasons.append("Resolve the recorded control exceptions.")
            rows.append({"control_id": control.id, "implementation_id": impl.id if impl else None,
                "code": control.control_code, "title": control.title, "requirements": sorted(set(requirements)),
                "owner": impl.owner if impl else "", "status": impl.status if impl else "NOT_STARTED",
                "description": impl.implementation_description if impl else "", "guidance": control.guidance,
                "complete": not reasons, "remaining": reasons})
        rows.sort(key=lambda item: (item["complete"], item["code"]))
        completed = sum(item["complete"] for item in rows)
        total = len(rows)
        # Never round an incomplete program to 100%.
        percentage = (100 if completed == total else min(99.9, round(completed * 100 / total, 1))) if total else None
        results.append({"framework_code": framework.code, "framework_name": framework.name,
            "completed": completed, "total": total, "percentage": percentage,
            "ready_to_apply": bool(total and completed == total), "controls": rows})
    return {"frameworks": results, "checked_at": now.isoformat() + "Z",
        "scope": "Mapped workspace controls only. Scope, required coverage and independent assessment must be confirmed; this percentage is not certification."}
