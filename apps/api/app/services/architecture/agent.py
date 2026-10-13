"""Bounded architecture planning workflow. Database versions own durable state and approval."""
import asyncio
import json
from functools import lru_cache
from typing import Any
from typing_extensions import TypedDict
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_core.output_parsers import PydanticOutputParser
from langgraph.graph import StateGraph, START, END
from langsmith import tracing_context

class ArchitectState(TypedDict, total=False):
    graph: dict
    evidence: dict
    message: str
    history: list
    references: dict | None
    requirements: dict | None
    edit_scope: dict
    resource_configurations: dict
    resource_schema_version: int | None
    context: dict
    answer: dict
    workflow: dict

def prepare_context(state: ArchitectState):
    from app.services.architecture.workspace import Graph
    from app.services.architecture.network_guidance import NETWORK_GUIDANCE
    from app.services.architecture.design_review import build_review
    from app.services.architecture.resource_edits import selected_schemas
    from app.services.architecture.resource_topology import build_topology
    graph = Graph.model_validate(state["graph"]).model_dump()
    topology = build_topology(graph, state.get("resource_configurations", {}), (state.get("requirements") or {}).get("region"), state.get("resource_schema_version", 1))
    scope_ids = set(state["edit_scope"].get("node_ids", []))
    if scope_ids:
        relations = [r for r in topology["relations"] if r["source"] in scope_ids or r["target"] in scope_ids]
        context_ids = scope_ids | {node for r in relations for node in (r["source"], r["target"])}
        topology = {**topology, "placements": [p for p in topology["placements"] if p["node_id"] in context_ids], "relations": relations,
                    "issues": [issue for issue in topology["issues"] if not issue["node_id"] or issue["node_id"] in context_ids]}
    required = ("peak_requests_per_minute", "concurrent_users", "region", "availability")
    missing = [key for key in required if not (state.get("requirements") or {}).get(key)]
    return {"graph": graph, "context": {"missing_requirements": missing,
        "source_snapshot": state["evidence"].get("commit"),
        "source_coverage": state["evidence"].get("source_coverage"),
        "source_repositories": state["evidence"].get("repositories", []),
        "approval_required": True, "edit_scope": state["edit_scope"], "network_design_guidance": NETWORK_GUIDANCE,
        "resource_configurations": state.get("resource_configurations", {}),
        "configured_network": topology,
        "selected_resource_schemas": selected_schemas(graph, state["edit_scope"]),
        "planning_review": build_review(graph, state["evidence"], state.get("requirements"))}, "workflow": {"framework": "LangGraph / LangChain",
        "stages": ["source_context_prepared"], "missing_requirements": missing}}

async def propose(state: ArchitectState):
    from app.services.architecture.workspace import provider_refine
    async def invoke(inputs):
        return await provider_refine(inputs["graph"], inputs["evidence"], inputs["message"],
            inputs["history"], inputs.get("references"), inputs.get("requirements"), inputs["context"])
    answer = await RunnableLambda(invoke).ainvoke(state)
    return {"answer": answer, "workflow": {**state["workflow"],
        "stages": state["workflow"]["stages"] + ["model_proposal_returned"]}}

def validate_proposal(state: ArchitectState):
    from app.services.architecture.workspace import AIAnswer
    from app.services.architecture.design_review import build_review
    answer = state["answer"]
    # Schema validation is not a claim of AWS deployability or sufficient capacity.
    parsed = PydanticOutputParser(pydantic_object=AIAnswer).parse(json.dumps({
        "message": answer["message"], "graph": answer["graph"], "questions": answer.get("questions", []),
        "resource_updates": answer.get("resource_updates", [])})).model_dump()
    # Clarification is not permission to rewrite a design while choices are missing.
    if parsed["questions"]:
        parsed["graph"] = state["graph"]
        parsed["resource_updates"] = []
    from app.services.architecture.edit_scope import enforce_scope
    parsed["graph"] = enforce_scope(state["graph"], parsed["graph"], state["edit_scope"])
    from app.services.architecture.edit_scope import enforce_resource_identity
    parsed["graph"] = enforce_resource_identity(state["graph"], parsed["graph"], state.get("resource_configurations", {}))
    from app.services.architecture.proposal_policy import check_transition
    check_transition(state["graph"], parsed["graph"], state["message"])
    from app.services.architecture.resource_edits import apply_resource_updates
    # Remove configurations only for explicitly removed diagram nodes, as manual saves do.
    remaining = {node["id"] for node in parsed["graph"]["nodes"]}
    configs = {key: value for key, value in state.get("resource_configurations", {}).items() if key in remaining}
    parsed["resource_configurations"] = apply_resource_updates(parsed["graph"], configs,
        parsed["resource_updates"], state["edit_scope"], (state.get("requirements") or {}).get("region"))
    if answer.get("ai_model"): parsed["ai_model"] = answer["ai_model"]
    if answer.get("provider_attempts"): parsed["provider_attempts"] = answer["provider_attempts"]
    parsed["agent_workflow"] = {**state["workflow"], "stages": state["workflow"]["stages"] + ["graph_schema_validated", "request_path_policy_checked"],
        "status": "AWAITING_CUSTOMER_REVIEW",
        "planning_review_status": build_review(parsed["graph"], state["evidence"], state.get("requirements"))["status"]}
    return {"answer": parsed}

@lru_cache(maxsize=1)
def architect_workflow():
    builder = StateGraph(ArchitectState)
    builder.add_node("prepare_source_context", prepare_context)
    builder.add_node("propose_architecture", propose)
    builder.add_node("validate_graph", validate_proposal)
    builder.add_edge(START, "prepare_source_context")
    builder.add_edge("prepare_source_context", "propose_architecture")
    builder.add_edge("propose_architecture", "validate_graph")
    builder.add_edge("validate_graph", END)
    # No shared memory/checkpointer and no cloud/code execution tools.
    return builder.compile()

async def run(graph, evidence, message, history, references=None, requirements=None, edit_scope=None, resource_configurations=None, resource_schema_version=1):
    with tracing_context(enabled=False):
        async with asyncio.timeout(95):
            result = await architect_workflow().ainvoke({"graph": graph, "evidence": evidence,
                "message": message, "history": history[-6:], "references": references, "requirements": requirements,
                "edit_scope": edit_scope or {"mode": "REVIEW", "node_ids": []}, "resource_configurations": resource_configurations or {}, "resource_schema_version": resource_schema_version},
                config={"recursion_limit": 8, "callbacks": []})
    return result["answer"]

def provider_messages(instructions: str, context: str) -> list[dict[str, Any]]:
    prompt = ChatPromptTemplate.from_messages([("system", "{instructions}"), ("human", "{context}")])
    messages = prompt.invoke({"instructions": instructions, "context": context}).to_messages()
    return [{"role": "system" if message.type == "system" else "user", "content": message.content} for message in messages]
