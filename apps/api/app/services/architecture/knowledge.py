"""Read-only AWS MCP references for saved drafts; never executes diagram code."""
import asyncio
import hashlib
import json
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException
from app.core.config import settings

ENDPOINT = "https://knowledge-mcp.global.api.aws"
SEARCH_TOOLS = {"aws___search_documentation", "search_documentation"}
# Only canonical public service names are sent to AWS, never customer labels,
# repository paths, prompts, credentials, or the application graph itself.
SERVICES = (
    (r"\bcloudfront\b", "Amazon CloudFront"),
    (r"\balb\b|application load balancer", "Application Load Balancer"),
    (r"\bfargate\b|\becs\b", "Amazon ECS Fargate"),
    (r"\brds\b|\baurora\b", "Amazon RDS"),
    (r"\belasticache\b", "Amazon ElastiCache"),
    (r"\bs3\b", "Amazon S3"),
    (r"\blambda\b", "AWS Lambda"),
    (r"\bdynamodb\b", "Amazon DynamoDB"),
    (r"api gateway", "Amazon API Gateway"),
    (r"route\s*53", "Amazon Route 53"),
    (r"\bsqs\b", "Amazon SQS"),
    (r"\bsns\b", "Amazon SNS"),
    (r"secrets manager", "AWS Secrets Manager"),
    (r"\bcloudwatch\b", "Amazon CloudWatch"),
    (r"\bwaf\b", "AWS WAF"),
    (r"\becr\b", "Amazon ECR"),
    (r"\beks\b", "Amazon EKS"),
    (r"\bec2\b", "Amazon EC2"),
    (r"\bcognito\b", "Amazon Cognito"),
    (r"\bvpc\b", "Amazon VPC"),
)


def available():
    return settings.ENABLE_AWS_KNOWLEDGE


def fingerprint(graph):
    return hashlib.sha256(json.dumps(graph, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def recognized_services(graph):
    labels = " ".join(node.get("service", "") for node in graph["nodes"])
    return [name for pattern, name in SERVICES if re.search(pattern, labels, re.I)]


def official_url(value):
    if not isinstance(value, str) or len(value) > 2000:
        return None
    try:
        parsed = urlsplit(value)
        safe = (parsed.scheme == "https" and parsed.hostname in {"docs.aws.amazon.com", "aws.amazon.com"}
                and not parsed.username and not parsed.password and parsed.port in (None, 443))
    except ValueError:
        return None
    return value if safe else None


def references(result):
    """Accept structured results or JSON text, and discard untrusted links."""
    payloads = []
    if result.structuredContent is not None:
        payloads.append(result.structuredContent)
    for block in result.content:
        if getattr(block, "type", None) == "text" and len(block.text) <= 100_000:
            try:
                payloads.append(json.loads(block.text))
            except ValueError:
                continue
    found = {}

    def visit(value, depth=0):
        if depth > 8 or len(found) >= 2:
            return
        if isinstance(value, dict):
            url = official_url(value.get("url"))
            title = value.get("title")
            if url and isinstance(title, str) and title.strip():
                snippet = value.get("context", value.get("snippet", ""))
                found[url] = {"url": url, "title": title[:200],
                              "excerpt": snippet[:1200] if isinstance(snippet, str) else ""}
            for child in list(value.values())[:40]:
                visit(child, depth + 1)
        elif isinstance(value, list):
            for child in value[:40]:
                visit(child, depth + 1)

    for payload in payloads:
        visit(payload)
    return list(found.values())[:2]


async def lookup(graph):
    if not available():
        raise HTTPException(503, "AWS references need to be enabled by your platform administrator.")
    services = recognized_services(graph)
    if not services:
        raise HTTPException(422, "Choose a supported AWS service in your saved design before finding references.")
    entries = []
    omitted = services[6:]
    try:
        # Import only when used. No local subprocesses, filesystem tools, AWS
        # credentials, sampling callbacks, or arbitrary customer MCP endpoints.
        from mcp import ClientSession
        from mcp.client.streamable_http import streamable_http_client

        async with asyncio.timeout(45):
            async with httpx.AsyncClient(timeout=12, follow_redirects=False, trust_env=False) as client:
                async with streamable_http_client(ENDPOINT, http_client=client) as (read, write, _):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        tools = (await session.list_tools()).tools
                        tool = next((item for item in tools if item.name in SEARCH_TOOLS), None)
                        if tool is None:
                            raise ValueError("Expected read-only search tool unavailable")
                        for name in services[:6]:
                            result = await session.call_tool(tool.name, arguments={
                                "search_phrase": f"{name} architecture security availability best practices",
                                "topics": ["general"], "limit": 2,
                            })
                            sources = [] if result.isError else references(result)
                            entries.append({"service": name, "sources": sources,
                                            "status": "REFERENCES_FOUND" if sources else "NO_REFERENCES_RETURNED"})
    except Exception:
        # Third-party response/transport details are never returned to customers.
        raise HTTPException(502, "AWS references are temporarily unavailable. Your saved design has not changed.") from None
    if not any(item["sources"] for item in entries):
        raise HTTPException(502, "AWS returned no usable references. Your saved design has not changed.")
    return {"provider": "AWS Knowledge MCP", "checked_at": datetime.now(timezone.utc).isoformat(),
            "graph_fingerprint": fingerprint(graph), "services": entries, "omitted_services": omitted,
            "scope": "Documentation references only. Not a deployment approval, security assessment, or compliance certification."}
