"""Offline canonical compatibility; no provider, database or deployment claims."""
import copy
import json
from pathlib import Path

import pytest

from app.services.architecture.design_adapter import from_legacy, to_legacy, read_design, read_design_json, fingerprints, UnsupportedDesign
from app.services.architecture.design_spec import Design, canonical_json, MAX_DESIGN_BYTES
from app.services.architecture.resource_configuration import compile_template, logical_id

IDENTITY = {"revision_id": "canonical-fixture-v1", "organization_id": "fixture-org", "application_id": "fixture-app"}


def fixture():
    path = Path(__file__).resolve().parents[3] / "fixtures/architecture/saas-v1.json"
    spec = json.loads(path.read_text(encoding="utf-8"))["design"]
    spec["requirements"] = {"region": "ap-south-1"}
    return spec


def test_frozen_golden_contract_and_export_identity():
    path = Path(__file__).resolve().parents[3] / "fixtures/architecture/canonical-v2-golden.json"
    golden = json.loads(path.read_text(encoding="utf-8"))
    original = copy.deepcopy(golden["legacy"])
    design = from_legacy(original, **golden["identity"])
    assert design.model_dump(mode="json") == golden["canonical"]
    assert fingerprints(design) == golden["fingerprints"]
    assert to_legacy(design) == original
    compiled = compile_template(original["graph"], original["resource_configurations"], "ap-south-1", list(original["resource_configurations"]))
    assert compiled["sha256"] == golden["offline_export_sha256"]


def test_golden_legacy_round_trip_preserves_ids_multiplicity_metadata_and_compiler():
    legacy = fixture()
    legacy["graph"]["edges"].append(copy.deepcopy(legacy["graph"]["edges"][0]))
    legacy["extensions"] = {"old-customer-option": {"keep": True}}
    legacy["messages"] = [{"role": "assistant", "content": "Historical explanation"}]
    legacy["created_at"] = "2026-01-01T00:00:00Z"
    before = copy.deepcopy(legacy)
    design = from_legacy(legacy, **IDENTITY)
    assert design == read_design(json.loads(canonical_json(design)), **IDENTITY)
    assert to_legacy(design) == before and legacy == before
    assert list(design.resources_by_id) == [n["id"] for n in before["graph"]["nodes"]]
    ordinary = [c for c in design.connections_by_id.values() if c.origin == "LEGACY"]
    assert len(ordinary) == len(before["graph"]["edges"])
    assert ordinary[0].id != ordinary[-1].id
    assert ordinary[0].source == ordinary[-1].source and ordinary[0].target == ordinary[-1].target
    assert all(r.compiler_logical_id == logical_id(r.id) for r in design.resources_by_id.values())
    assert all(w.execution_mode == "UNKNOWN" for w in design.workloads_by_id.values())
    round_trip = to_legacy(design)
    args = ("ap-south-1", list(legacy["resource_configurations"]))
    assert compile_template(legacy["graph"], legacy["resource_configurations"], *args) == compile_template(round_trip["graph"], round_trip["resource_configurations"], *args)


def test_semantic_and_artifact_input_identity_ignore_revision_display_activity_and_layout():
    legacy = fixture()
    original = fingerprints(from_legacy(legacy, **IDENTITY))
    changed = copy.deepcopy(legacy)
    changed["revision"] += 1
    changed["graph"]["nodes"][0].update(label="Renamed VPC", description="New display description", x=222, y=333)
    changed["messages"] = [{"role": "user", "content": "SECRET_CANARY_NEVER_HASH"}]
    changed["proposal"] = {"id": "activity-only"}
    changed["created_at"] = "2026-10-16T00:00:00Z"
    new = fingerprints(from_legacy(changed, **(IDENTITY | {"revision_id": "new-saved-version"})))
    assert new["semantic_hash"] == original["semantic_hash"]
    assert new["artifact_input_hash"] == original["artifact_input_hash"]
    assert new["layout_hash"] != original["layout_hash"]
    # Connection IDs differ across legacy revisions without changing intent identity.
    assert fingerprints(from_legacy(legacy, **(IDENTITY | {"revision_id": "another-version"})))["semantic_hash"] == original["semantic_hash"]


@pytest.mark.parametrize("change", ["properties", "source", "target", "compiler", "policy"])
def test_executable_or_provenance_inputs_change_identity(change):
    legacy = fixture()
    design = from_legacy(legacy, **IDENTITY)
    baseline = fingerprints(design)
    if change == "properties": legacy["resource_configurations"]["storage"]["properties"]["versioning"] = False
    if change == "source": legacy["evidence"]["commit"] = "b" * 40
    if change == "target": legacy["requirements"]["region"] = "ap-south-2"
    if change == "target":
        for config in legacy["resource_configurations"].values():
            if config["resource_type"] == "AWS::EC2::Subnet": config["properties"]["availability_zone"] = "ap-south-2a"
    context = {change + "_version": "changed"} if change in ("compiler", "policy") else {}
    actual = fingerprints(from_legacy(legacy, **IDENTITY), **context)
    assert actual["artifact_input_hash"] != baseline["artifact_input_hash"]
    if not context: assert actual["semantic_hash"] != baseline["semantic_hash"]


@pytest.mark.parametrize("mutation", ["key", "endpoint", "logical_id", "duplicate_order", "configuration_projection", "dangling_config", "unknown_property", "unknown_version", "float_version", "float_configuration_version", "oversize", "deep", "forged_permission", "scope", "capability", "sizing_target", "binding"])
def test_canonical_validation_rejects_invalid_and_unsupported_payloads(mutation):
    raw = from_legacy(fixture(), **IDENTITY).model_dump()
    if mutation == "key": raw["resources_by_id"]["vpc"]["id"] = "other"
    if mutation == "endpoint": next(iter(raw["connections_by_id"].values()))["target"] = "missing"
    if mutation == "logical_id": raw["resources_by_id"]["vpc"]["compiler_logical_id"] = logical_id("other")
    if mutation == "duplicate_order": raw["view_state"]["node_order"][0] = raw["view_state"]["node_order"][1]
    if mutation == "configuration_projection":
        key = next(key for key, c in raw["connections_by_id"].items() if c["origin"] == "CONFIGURATION")
        del raw["connections_by_id"][key]
    if mutation == "dangling_config": raw["resources_by_id"]["public"]["configuration"]["properties"]["vpc_node_id"] = "missing"
    if mutation == "unknown_property": raw["resources_by_id"]["storage"]["configuration"]["properties"]["public_access"] = True
    if mutation == "unknown_version": raw["schema_version"] = 99
    if mutation == "float_version": raw["schema_version"] = 2.0
    if mutation == "float_configuration_version": raw["resources_by_id"]["vpc"]["configuration_schema_version"] = 1.0
    if mutation == "forged_permission": next(iter(raw["connections_by_id"].values()))["purpose"] = "SECURITY_RULE"
    if mutation == "scope": raw["resources_by_id"]["vpc"]["target"]["account_id"] = "123456789012"; raw["resources_by_id"]["public"]["target"]["account_id"] = "999999999999"
    if mutation == "capability": raw["resources_by_id"]["vpc"]["capabilities"]["verified_deployment"] = True
    if mutation == "sizing_target": raw["requirements"]["sizing_workload_id"] = "missing"
    if mutation == "binding": raw["source_identity"]["declared_bindings"] = [{"name": "API_BASE", "source": "missing"}]
    if mutation == "oversize": raw["analysis_metadata"]["too_large"] = "x" * MAX_DESIGN_BYTES
    if mutation == "deep":
        nested = raw["analysis_metadata"]
        for _ in range(30): nested["child"] = {}; nested = nested["child"]
    with pytest.raises(ValueError): read_design(raw, **IDENTITY)


def test_native_features_cannot_silently_disappear_through_legacy_projection():
    design = from_legacy(fixture(), **IDENTITY)
    raw = design.model_dump()
    raw["view_state"]["node_positions"]["vpc"]["pinned"] = True
    with pytest.raises(UnsupportedDesign): to_legacy(Design.model_validate(raw))
    with pytest.raises(UnsupportedDesign): from_legacy(fixture() | {"resource_schema_version": 99}, **IDENTITY)
    with pytest.raises(UnsupportedDesign): read_design({"format": "future-format", "schema_version": 99}, **IDENTITY)


def test_json_reader_rejects_duplicate_keys_and_nonfinite_values():
    assert read_design_json(canonical_json(from_legacy(fixture(), **IDENTITY)), **IDENTITY).revision_id == IDENTITY["revision_id"]
    for raw in ('{"format":"launchcomply-design","format":"other"}', '{"number":NaN}', '[]'):
        with pytest.raises(ValueError): read_design_json(raw, **IDENTITY)


def test_reader_imports_without_runtime_configuration_or_provider_modules():
    import subprocess
    import sys
    result = subprocess.run([sys.executable, "-c", "import sys; import app.services.architecture.design_adapter; assert 'app.core.config' not in sys.modules; assert 'app.core.database' not in sys.modules; assert 'httpx' not in sys.modules"],
        capture_output=True, text=True, timeout=20)
    assert result.returncode == 0, result.stderr
