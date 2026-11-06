"""Encrypt hosting credentials at rest. Plaintext never leaves the server."""
import base64
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _cipher() -> Fernet:
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(("hosting:" + settings.ENCRYPTION_KEY).encode()).digest()))


def seal(credential: dict) -> str:
    return _cipher().encrypt(json.dumps(credential, separators=(",", ":")).encode()).decode()


def open_sealed(ciphertext: str) -> dict:
    try:
        return json.loads(_cipher().decrypt(ciphertext.encode()))
    except (InvalidToken, ValueError):
        raise ValueError("Stored hosting credential cannot be decrypted. Reconnect this provider.") from None


def hint(secret: str) -> str:
    return "…" + secret[-4:] if len(secret) >= 8 else "…"
