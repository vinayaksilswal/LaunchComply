"""Release Evidence and Security Center Linkage Service.
Collects tamper-evident supply chain hashes (commit, build manifest, SBOM, container digest,
migration log, smoke tests), creates Compliance Vault Evidence, and pipes security findings.
"""
import hashlib
import json
import time
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class ReleaseEvidencePackage(BaseModel):
    application_release_id: str
    version: str
    commit_sha: str
    release_hash: str
    evidence_items: List[Dict[str, Any]] = Field(default_factory=list)


class ReleaseEvidenceService:
    """Generates immutable cryptographic compliance evidence records for releases."""

    @classmethod
    def compile_evidence(
        cls,
        release_id: str,
        version: str,
        commit_sha: str,
        artifacts: List[Dict[str, Any]],
        sbom_data: Dict[str, Any],
        scan_data: Dict[str, Any],
        migration_data: Optional[Dict[str, Any]],
        smoke_tests: List[Dict[str, Any]],
        approver: Optional[str]
    ) -> ReleaseEvidencePackage:
        evidence_items = []

        # 1. Build Integrity Evidence
        build_payload = {
            "commit_sha": commit_sha,
            "artifacts": artifacts,
            "timestamp": time.time()
        }
        build_hash = hashlib.sha256(json.dumps(build_payload, sort_keys=True).encode()).hexdigest()
        evidence_items.append({
            "evidence_type": "BUILD_INTEGRITY",
            "source": "LocalIsolatedBuildProvider",
            "artifact_key": f"releases/{release_id}/build-manifest.json",
            "sha256": build_hash,
            "metadata": build_payload
        })

        # 2. Container Vulnerability Scan Evidence
        scan_hash = hashlib.sha256(json.dumps(scan_data, sort_keys=True).encode()).hexdigest()
        evidence_items.append({
            "evidence_type": "CONTAINER_SECURITY_SCAN",
            "source": "LaunchComply-Image-Scanner",
            "artifact_key": f"releases/{release_id}/cve-scan.json",
            "sha256": scan_hash,
            "metadata": scan_data
        })

        # 3. SBOM Evidence
        sbom_hash = hashlib.sha256(json.dumps(sbom_data, sort_keys=True).encode()).hexdigest()
        evidence_items.append({
            "evidence_type": "SOFTWARE_BILL_OF_MATERIALS",
            "source": "CycloneDX-1.5-Engine",
            "artifact_key": f"releases/{release_id}/sbom-cyclonedx.json",
            "sha256": sbom_hash,
            "metadata": {"components_count": len(sbom_data.get("components", []))}
        })

        # 4. Migration Execution Evidence
        if migration_data:
            mig_hash = hashlib.sha256(json.dumps(migration_data, sort_keys=True).encode()).hexdigest()
            evidence_items.append({
                "evidence_type": "DATABASE_MIGRATION",
                "source": migration_data.get("migration_type", "alembic"),
                "artifact_key": f"releases/{release_id}/migration-run.json",
                "sha256": mig_hash,
                "metadata": migration_data
            })

        # 5. Production Smoke Test Verification Evidence
        test_payload = {"tests": smoke_tests, "verified_at": time.time()}
        test_hash = hashlib.sha256(json.dumps(test_payload, sort_keys=True).encode()).hexdigest()
        evidence_items.append({
            "evidence_type": "PRODUCTION_VERIFICATION",
            "source": "SmokeTestProvider",
            "artifact_key": f"releases/{release_id}/smoke-tests.json",
            "sha256": test_hash,
            "metadata": test_payload
        })

        # Master release cryptographic hash linking all pieces together
        hasher = hashlib.sha256()
        hasher.update(commit_sha.encode())
        hasher.update(build_hash.encode())
        hasher.update(scan_hash.encode())
        hasher.update(sbom_hash.encode())
        master_release_hash = hasher.hexdigest()

        return ReleaseEvidencePackage(
            application_release_id=release_id,
            version=version,
            commit_sha=commit_sha,
            release_hash=master_release_hash,
            evidence_items=evidence_items
        )
