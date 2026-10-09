"""Safe provider diagnostics. Never retain prompts, raw errors, credentials or source."""
import re
import json
from fastapi import HTTPException

class AIProviderError(HTTPException):
    def __init__(self, code, attempts, status=502):
        super().__init__(status, {"code": code, "message": "The architecture model request could not complete."})
        self.attempts = attempts

def failure_kind(status, payload):
    error = payload.get("error", {}) if isinstance(payload, dict) else {}
    message = str(error.get("message", "")).lower() if isinstance(error, dict) else str(error).lower()
    if isinstance(payload, dict):
        for field in ("message", "detail"):
            if isinstance(payload.get(field), str): message += " " + payload[field].lower()
    metadata = error.get("metadata", {}) if isinstance(error, dict) else {}
    raw = metadata.get("raw", "") if isinstance(metadata, dict) else ""
    # Only categorical matches survive; upstream text never leaves this function.
    if isinstance(raw, str) and len(raw) < 20_000:
        try:
            nested = json.loads(raw)
            inner = nested.get("error", nested) if isinstance(nested, dict) else {}
            if isinstance(inner, dict): message += " " + str(inner.get("message", "")).lower()
        except (ValueError, TypeError, RecursionError):
            pass
    if status in {400, 422}:
        if "model" in message and any(word in message for word in ("required", "must specify", "missing")): return "REQUIRED_MODEL"
        if "model" in message and any(word in message for word in ("invalid", "unknown", "not found", "does not exist")): return "INVALID_MODEL"
        if any(word in message for word in ("max_tokens", "max_output_tokens", "max_completion_tokens", "output budget")): return "OUTPUT_BUDGET"
        if "models" in message and any(word in message for word in ("limit", "maximum", "at most", "too many")): return "ROUTING_LIMIT"
        if any(word in message for word in ("max_price", "data_collection", "provider.")): return "ROUTING_PARAMETER"
    # Text is inspected only to classify the error; it is never recorded or returned.
    if status == 404 and any(word in message for word in ("privacy", "data policy", "data collection")):
        return "PRIVACY_FILTER"
    if status == 403:
        if any(word in message for word in ("guardrail", "content filter", "prompt injection", "sensitive info", "moderation")): return "POLICY_BLOCKED"
        if any(word in message for word in ("budget", "credit", "spending", "allowance")): return "CREDIT_LIMIT"
        if any(word in message for word in ("invalid api key", "invalid key", "authentication", "unauthorized", "user not found")): return "AUTH_FAILED"
        return "MODEL_ACCESS_DENIED"
    return {400: "REQUEST_REJECTED", 401: "AUTH_FAILED", 402: "CREDIT_LIMIT",
        404: "NO_ENDPOINT", 408: "TIMEOUT", 413: "CONTEXT_LIMIT", 422: "REQUEST_REJECTED", 429: "RATE_LIMIT"}.get(status, "UPSTREAM_UNAVAILABLE")

def failure_code(kind):
    return {"AUTH_FAILED": "ARCHITECTURE_AI_AUTH_FAILED", "CREDIT_LIMIT": "ARCHITECTURE_AI_CREDIT_LIMIT",
        "NO_ENDPOINT": "ARCHITECTURE_AI_NO_ENDPOINT", "PRIVACY_FILTER": "ARCHITECTURE_AI_PRIVACY_FILTER",
        "RATE_LIMIT": "ARCHITECTURE_AI_RATE_LIMIT", "TIMEOUT": "ARCHITECTURE_AI_TIMEOUT",
        "CONTEXT_LIMIT": "ARCHITECTURE_AI_CONTEXT_LIMIT", "REQUEST_REJECTED": "ARCHITECTURE_AI_REQUEST_REJECTED",
        "INVALID_MODEL": "ARCHITECTURE_AI_MODEL_CONFIG", "OUTPUT_BUDGET": "ARCHITECTURE_AI_REQUEST_REJECTED",
        "MODEL_ACCESS_DENIED": "ARCHITECTURE_AI_ACCESS_DENIED", "POLICY_BLOCKED": "ARCHITECTURE_AI_POLICY_BLOCKED",
        "REQUIRED_MODEL": "ARCHITECTURE_AI_REQUEST_REJECTED",
        "ROUTING_LIMIT": "ARCHITECTURE_AI_REQUEST_REJECTED", "ROUTING_PARAMETER": "ARCHITECTURE_AI_REQUEST_REJECTED",
        "INVALID_RESPONSE": "ARCHITECTURE_AI_INVALID_PROPOSAL", "TRUNCATED_RESPONSE": "ARCHITECTURE_AI_INVALID_PROPOSAL"}.get(kind, "ARCHITECTURE_AI_UNAVAILABLE")

def parse_answer(text, schema):
    if not isinstance(text, str) or len(text) > 100_000:
        raise ValueError("Invalid content")
    # A single Markdown JSON fence is harmless formatting. Free-form prefixes remain invalid.
    fenced = re.fullmatch(r"\s*```(?:json)?\s*\n([\s\S]*?)\n```\s*", text)
    if fenced: text = fenced.group(1)
    return schema.model_validate_json(text).model_dump()

def response_payload(response):
    try: return response.json()
    except (ValueError, TypeError): return {}

def model_name(value, default):
    return value if isinstance(value, str) and re.fullmatch(r"[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.:-]{1,120}", value) else default
