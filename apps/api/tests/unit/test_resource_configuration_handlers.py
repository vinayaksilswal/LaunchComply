"""Actual handler logic with isolated storage doubles; not hosted/DB acceptance.

AST extraction avoids importing application settings or owner database state.
Only ORM/session/access adapters are replaced. The DTOs and handler bodies are
compiled unchanged from the production source.
"""
import ast
import copy
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock
from typing import Annotated

import pytest
from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from app.services.architecture.resource_configuration import ResourceConfiguration, compile_template, validate_resources
from test_resource_configuration import fixture


def handlers():
    source = ast.parse(Path("app/api/v1/architecture_workspace.py").read_text(encoding="utf-8"))
    names = {"ConfigureResource", "ExportResources", "pending_proposal", "current", "save_version", "configure_resource", "export_cloudformation", "initialize"}
    definitions = [item for item in source.body if getattr(item, "name", None) in names]
    for item in definitions:
        item.decorator_list = []
    async def application(db, application_id, membership, lock=False):
        if application_id != db.app.id or membership.organization_id != db.app.organization_id:
            raise HTTPException(404, "Not found")
        return db.app
    async def latest(db, app):
        return db.arch
    async def audit(db, membership, app, action, details=None):
        db.events.append((action, details))
    def record(**values):
        return SimpleNamespace(id="new-revision", **values)
    namespace = {"BaseModel": BaseModel, "ConfigDict": ConfigDict, "Field": Field, "Depends": Depends, "Annotated": Annotated,
                 "HTTPException": HTTPException, "AsyncSession": object, "editor": lambda: None,
                 "member": lambda: None, "get_db": lambda: None, "application": application,
                 "latest": latest, "audit": audit, "Architecture": record,
                 "ResourceConfiguration": ResourceConfiguration, "validate_resources": validate_resources,
                 "compile_template": compile_template, "output": lambda arch: {"id": arch.id, "version": arch.version, **copy.deepcopy(arch.spec_json)}}
    exec(compile(ast.Module(body=definitions, type_ignores=[]), "architecture_workspace_handlers", "exec"), namespace)
    return namespace


def storage():
    graph, configs = fixture()
    arch = SimpleNamespace(id="saved", version="v7", spec_json={"revision": 7, "graph": graph,
        "resource_configurations": configs, "requirements": {"region": "ap-south-1"}, "proposal": None,
        "design_approval": {"version": "v7"}, "messages": [], "evidence": {"commit": "saved-source"}})
    db = SimpleNamespace(arch=arch, app=SimpleNamespace(id="asset", organization_id="org", name="Business"),
                         events=[], commit=AsyncMock(), refresh=AsyncMock())
    db.add = lambda item: setattr(db, "arch", item)
    membership = SimpleNamespace(organization_id="org")
    return db, membership


@pytest.mark.asyncio
async def test_save_configuration_changes_only_its_properties_and_creates_revision():
    code = handlers()
    db, membership = storage()
    old = copy.deepcopy(db.arch.spec_json)
    payload = code["ConfigureResource"](expected_id="saved", node_id="logs", configuration={"resource_type": "AWS::Logs::LogGroup", "properties": {"retention_days": 90}})
    result = await code["configure_resource"]("asset", payload, membership, db)
    assert result["version"] == "v8"
    assert result["graph"] == old["graph"]
    assert result["evidence"] == old["evidence"]
    assert result["resource_configurations"]["vpc"] == old["resource_configurations"]["vpc"]
    assert result["resource_configurations"]["logs"]["properties"]["retention_days"] == 90
    assert "design_approval" not in result
    assert old["resource_configurations"]["logs"]["properties"]["retention_days"] == 30
    assert db.events[0][0] == "ARCHITECTURE_RESOURCE_CONFIGURED"


@pytest.mark.asyncio
@pytest.mark.parametrize("state,status", [("stale", 409), ("proposal", 409), ("source", 409), ("missing", 422), ("outside", 404)])
async def test_configuration_rejects_stale_pending_source_and_missing_components(state, status):
    code = handlers()
    db, membership = storage()
    expected = "old" if state == "stale" else "saved"
    node_id = "missing" if state == "missing" else "logs"
    if state == "proposal": db.arch.spec_json["proposal"] = {"graph": {"nodes": [], "edges": []}}
    if state == "source": db.arch.spec_json["source_changed"] = True
    if state == "outside": membership.organization_id = "other"
    before = copy.deepcopy(db.arch.spec_json)
    payload = code["ConfigureResource"](expected_id=expected, node_id=node_id, configuration=None)
    with pytest.raises(HTTPException) as error:
        await code["configure_resource"]("asset", payload, membership, db)
    assert error.value.status_code == status
    assert db.arch.spec_json == before and not db.events
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_vpc_resize_cannot_invalidate_existing_subnet_and_does_not_save():
    code = handlers()
    db, membership = storage()
    payload = code["ConfigureResource"](expected_id="saved", node_id="vpc", configuration={"resource_type": "AWS::EC2::VPC", "properties": {"cidr": "10.60.0.0/16"}})
    with pytest.raises(HTTPException) as error:
        await code["configure_resource"]("asset", payload, membership, db)
    assert error.value.status_code == 422
    assert db.arch.spec_json["resource_configurations"]["vpc"]["properties"]["cidr"] == "10.40.0.0/16"
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_deleted_components_prune_only_their_own_configuration():
    code = handlers()
    db, membership = storage()
    graph = copy.deepcopy(db.arch.spec_json["graph"])
    graph["nodes"] = [node for node in graph["nodes"] if node["id"] != "bucket"]
    result = await code["save_version"](db, membership, db.app, db.arch, graph, "DELETE")
    assert set(result["resource_configurations"]) == {"vpc", "subnet", "logs"}


@pytest.mark.asyncio
async def test_export_is_read_only_version_bound_and_audited():
    code = handlers()
    db, membership = storage()
    before = copy.deepcopy(db.arch.spec_json)
    result = await code["export_cloudformation"]("asset", code["ExportResources"](expected_id="saved"), membership, db)
    assert result["architecture_id"] == "saved" and result["version"] == "v7"
    assert db.arch.spec_json == before
    assert db.events[0][0] == "ARCHITECTURE_CLOUDFORMATION_EXPORTED"
    assert db.events[0][1]["sha256"] == result["sha256"]
    with pytest.raises(HTTPException) as error:
        await code["export_cloudformation"]("asset", code["ExportResources"](expected_id="old"), membership, db)
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_initialize_does_not_replace_an_existing_saved_architecture():
    code = handlers()
    db, membership = storage()
    before = copy.deepcopy(db.arch.spec_json)
    with pytest.raises(HTTPException) as error:
        await code["initialize"]("asset", membership, db)
    assert error.value.status_code == 409 and db.arch.spec_json == before
    db.arch = None
    result = await code["initialize"]("asset", membership, db)
    assert result["graph"] == {"nodes": [], "edges": []}
    assert result["deployment_status"] == "NOT_DEPLOYED"


@pytest.mark.asyncio
@pytest.mark.parametrize("endpoint", ["configure_resource", "export_cloudformation"])
async def test_future_property_schema_is_never_silently_downgraded(endpoint):
    code = handlers()
    db, membership = storage()
    db.arch.spec_json["resource_schema_version"] = 2
    payload = code["ConfigureResource"](expected_id="saved", node_id="logs", configuration=None) if endpoint == "configure_resource" else code["ExportResources"](expected_id="saved")
    with pytest.raises(HTTPException) as error:
        await code[endpoint]("asset", payload, membership, db)
    assert error.value.status_code == 409
    db.commit.assert_not_awaited()


def test_new_mutation_routes_use_existing_server_editor_dependency():
    source = ast.parse(Path("app/api/v1/architecture_workspace.py").read_text(encoding="utf-8"))
    for function in source.body:
        if getattr(function, "name", None) in {"configure_resource", "initialize"}:
            assert any(isinstance(default, ast.Call) and isinstance(default.func, ast.Name) and default.func.id == "Depends" and isinstance(default.args[0], ast.Name) and default.args[0].id == "editor" for default in function.args.defaults)
