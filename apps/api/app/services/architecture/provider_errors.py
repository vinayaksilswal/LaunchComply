"""Safe provider diagnostics. Never retain prompts, raw errors, credentials or source."""
import re
from fastapi import HTTPException

class AIProviderError(HTTPException):
    def __init__(self, code, attempts, status=502):
        super().__init__(status, {"code": code, "message": "The architecture model request could not complete."})
        self.attempts = attempts

def failure_kind(status, payload):
    error = payload.get("error", {}) if isinstance(payload, dict) else {}
    message = str(error.get("message", "")).lower() if isinstance(error, dict) else ""
    # Text is inspected only to classify the error; it is never recorded or returned.
    if status == 404 and any(word in message for word in ("privacy", "data policy", "data collection")):
        return "PRIVACY_FILTER"
    return {400: "REQUEST_REJECTED", 401: "AUTH_FAILED", 403: "AUTH_FAILED", 402: "CREDIT_LIMIT",
        404: "NO_ENDPOINT", 408: "TIMEOUT", 413: "CONTEXT_LIMIT", 422: "REQUEST_REJECTED", 429: "RATE_LIMIT"}.get(status, "UPSTREAM_UNAVAILABLE")

def failure_code(kind):
    return {"AUTH_FAILED": "ARCHITECTURE_AI_AUTH_FAILED", "CREDIT_LIMIT": "ARCHITECTURE_AI_CREDIT_LIMIT",
        "NO_ENDPOINT": "ARCHITECTURE_AI_NO_ENDPOINT", "PRIVACY_FILTER": "ARCHITECTURE_AI_PRIVACY_FILTER",
        "RATE_LIMIT": "ARCHITECTURE_AI_RATE_LIMIT", "TIMEOUT": "ARCHITECTURE_AI_TIMEOUT",
        "CONTEXT_LIMIT": "ARCHITECTURE_AI_CONTEXT_LIMIT", "REQUEST_REJECTED": "ARCHITECTURE_AI_REQUEST_REJECTED",
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
