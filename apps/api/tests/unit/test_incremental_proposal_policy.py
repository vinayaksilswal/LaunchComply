import copy
import pytest
from app.services.architecture.proposal_policy import check_transition

def legacy():
    return {"nodes": [
        {"id": "web", "label": "Web application", "zone": "APPLICATION", "service": "Static hosting / container", "description": "Unresolved hosting"},
        {"id": "api", "label": "API", "zone": "APPLICATION", "service": "ECS Fargate", "description": "Private backend"},
        {"id": "logs", "label": "Logs", "zone": "SUPPORT", "service": "CloudWatch", "description": ""}],
        "edges": [{"source": "web", "target": "api", "label": "Legacy unresolved proposed flow"}]}

def test_unrelated_rename_and_new_unconnected_resource_do_not_rebuild_legacy_graph():
    original = legacy()
    renamed = copy.deepcopy(original)
    renamed["nodes"][2]["label"] = "Operations logs"
    check_transition(original, renamed, "Rename logs only")
    added = copy.deepcopy(original)
    added["nodes"].append({"id": "vpc", "label": "VPC", "zone": "EDGE", "service": "AWS::EC2::VPC", "description": ""})
    check_transition(original, added, "Add VPC only")

@pytest.mark.parametrize("change,expected", [
    ("web_type", "FRONTEND_PLACEMENT_UNRESOLVED"),
    ("web_flow", "FRONTEND_PLACEMENT_UNRESOLVED"),
    ("role", "WORKLOAD_ROLE_CHANGED"),
    ("exposure", "BACKEND_PUBLIC_EXPOSURE"),
    ("operations", "OPERATIONS_IN_REQUEST_PATH"),
])
def test_changed_paths_still_reject_unsafe_or_unresolved_connections(change, expected):
    original = legacy()
    if change == "operations": original["edges"] = []
    proposed = copy.deepcopy(original)
    if change == "web_type": proposed["nodes"][0]["service"] = "ECS Fargate"
    if change == "web_flow": proposed["edges"][0]["label"] = "Pretend secure HTTPS"
    if change == "role": proposed["nodes"][0]["label"] = "Backend API"
    if change == "exposure": proposed["nodes"][1]["service"] = "ECS public API"
    if change == "operations": proposed["edges"].append({"source": "api", "target": "logs", "label": "HTTPS request"})
    with pytest.raises(ValueError, match=expected):
        check_transition(original, proposed, "Make proposed change")
