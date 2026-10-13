"""Pure production edit-scope checks; no model, settings or database imports."""
import copy

import pytest

from app.services.architecture.edit_scope import ScopeViolation, enforce_resource_identity, enforce_scope


def design():
    return {"nodes": [
        {"id": "storage", "service": "S3", "label": "Files", "description": "Private storage", "x": 100, "y": 200},
        {"id": "api", "service": "ECS Fargate", "label": "API", "description": "Private API", "x": 400, "y": 200},
    ], "edges": [{"source": "api", "target": "storage", "label": "Storage access"}]}


CONFIGURATIONS = {"storage": {"resource_type": "AWS::S3::Bucket", "properties": {"versioning": True}}}


@pytest.mark.parametrize("field,value", [("description", "Private versioned files"), ("label", "Business files"), ("x", 500)])
def test_selected_diagram_edits_preserve_resource_definition_and_unrelated_content(field, value):
    original = design()
    proposed = copy.deepcopy(original)
    proposed["nodes"][0][field] = value
    before = copy.deepcopy(CONFIGURATIONS)
    scoped = enforce_scope(original, proposed, {"mode": "EDIT", "node_ids": ["storage"]})
    result = enforce_resource_identity(original, scoped, CONFIGURATIONS)
    assert result["nodes"][0][field] == value
    assert result["nodes"][1] == original["nodes"][1]
    assert result["edges"] == original["edges"]
    assert CONFIGURATIONS == before


def test_selected_edit_cannot_reinterpret_configured_storage_as_database():
    original = design()
    proposed = copy.deepcopy(original)
    proposed["nodes"][0]["service"] = "RDS PostgreSQL"
    scoped = enforce_scope(original, proposed, {"mode": "EDIT", "node_ids": ["storage"]})
    with pytest.raises(ScopeViolation, match="read-only"):
        enforce_resource_identity(original, scoped, CONFIGURATIONS)


def test_read_only_scope_preserves_graph_even_when_model_rewrites_service():
    original = design()
    proposed = copy.deepcopy(original)
    proposed["nodes"][0]["service"] = "RDS PostgreSQL"
    scoped = enforce_scope(original, proposed, {"mode": "REVIEW", "node_ids": []})
    assert enforce_resource_identity(original, scoped, CONFIGURATIONS) == original


def test_explicit_selected_removal_remains_possible_without_unrelated_changes():
    original = design()
    proposed = {"nodes": [copy.deepcopy(original["nodes"][1])], "edges": []}
    scoped = enforce_scope(original, proposed, {"mode": "REMOVE", "node_ids": ["storage"]})
    assert enforce_resource_identity(original, scoped, CONFIGURATIONS) == proposed


def test_unselected_move_rejected_before_resource_identity_check():
    original = design()
    proposed = copy.deepcopy(original)
    proposed["nodes"][1]["x"] = 800
    with pytest.raises(ScopeViolation, match="unselected"):
        enforce_scope(original, proposed, {"mode": "EDIT", "node_ids": ["storage"]})
