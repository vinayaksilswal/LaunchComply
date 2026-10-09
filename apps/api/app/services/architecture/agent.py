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
    context: dict
    answer: dict
    workflow: dict

def prepare_context(state: ArchitectState):
    from app.services.architecture.workspace import Graph
    graph = Graph.model_validate(state["graph"]).model_dump()
    required = ("peak_requests_per_minute", "concurrent_users", "region", "availability")
    missing = [key for key in required if not (state.get("requirements") or {}).get(key)]
    return {"graph": graph, "context": {"missing_requirements": missing,
        "source_snapshot": state["evidence"].get("commit"),
        "source_coverage": state["evidence"].get("source_coverage"),
        "source_repositories": state["evidence"].get("repositories", []),
        "approval_required": True}, "workflow": {"framework": "LangGraph / LangChain",
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
    answer = state["answer"]
    # Schema validation is not a claim of AWS deployability or sufficient capacity.
    parsed = PydanticOutputParser(pydantic_object=AIAnswer).parse(json.dumps({
        "message": answer["message"], "graph": answer["graph"]})).model_dump()
    if answer.get("ai_model"): parsed["ai_model"] = answer["ai_model"]
    if answer.get("provider_attempts"): parsed["provider_attempts"] = answer["provider_attempts"]
    parsed["agent_workflow"] = {**state["workflow"], "stages": state["workflow"]["stages"] + ["graph_schema_validated"],
        "status": "AWAITING_CUSTOMER_REVIEW"}
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

async def run(graph, evidence, message, history, references=None, requirements=None):
    with tracing_context(enabled=False):
        async with asyncio.timeout(95):
            result = await architect_workflow().ainvoke({"graph": graph, "evidence": evidence,
                "message": message, "history": history[-6:], "references": references, "requirements": requirements},
                config={"recursion_limit": 8, "callbacks": []})
    return result["answer"]

def provider_messages(instructions: str, context: str) -> list[dict[str, Any]]:
    prompt = ChatPromptTemplate.from_messages([("system", "{instructions}"), ("human", "{context}")])
    messages = prompt.invoke({"instructions": instructions, "context": context}).to_messages()
    return [{"role": "system" if message.type == "system" else "user", "content": message.content} for message in messages]
