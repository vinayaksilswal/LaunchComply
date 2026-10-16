"""Shared legacy graph contract. No database, settings or provider dependencies."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

class Node(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    label: str = Field(min_length=1, max_length=100)
    service: str = Field(max_length=100)
    zone: Literal["EDGE", "APPLICATION", "DATA", "SUPPORT"]
    description: str = Field(max_length=500)
    x: int = Field(ge=0, le=6000)
    y: int = Field(ge=0, le=6000)

class Edge(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: str = Field(max_length=64)
    target: str = Field(max_length=64)
    label: str = Field(max_length=80)

class Graph(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nodes: list[Node] = Field(max_length=80)
    edges: list[Edge] = Field(max_length=160)

    @model_validator(mode="after")
    def references(self):
        ids = {node.id for node in self.nodes}
        if len(ids) != len(self.nodes) or any(edge.source not in ids or edge.target not in ids or edge.source == edge.target for edge in self.edges):
            raise ValueError("Graph requires unique nodes and valid connection endpoints.")
        return self
