import hmac
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.services.source_control.base import SourceControlProvider
from app.core.config import settings

class GitHubProvider(SourceControlProvider):
    def __init__(
        self,
        app_id: Optional[str] = None,
        private_key: Optional[str] = None,
        webhook_secret: Optional[str] = None,
        app_slug: Optional[str] = None
    ):
        self.app_id = app_id or "1029384"
        self.private_key = private_key or "mock_private_key"
        self.webhook_secret = webhook_secret or "launchcomply_gh_webhook_secret_dev_32char"
        self.app_slug = app_slug or "launchcomply-cloud"

    @property
    def provider_name(self) -> str:
        return "GITHUB"

    def get_installation_url(self, state: str) -> str:
        return f"https://github.com/apps/{self.app_slug}/installations/new?state={state}"

    async def exchange_installation_token(self, installation_id: str) -> str:
        # In live production: signs a JWT with self.private_key and requests /app/installations/{id}/access_tokens
        # Returns ephemeral token (1-hour expiry). Never persisted to database.
        return f"ghs_ephemeral_token_inst_{installation_id}"

    async def list_repositories(self, installation_id: str) -> List[Dict[str, Any]]:
        # Returns repositories accessible to the GitHub App installation
        return [
            {
                "id": "gh_repo_101",
                "name": "acme-core",
                "full_name": "acmecloud/acme-core",
                "owner": "acmecloud",
                "default_branch": "main",
                "visibility": "private",
                "html_url": "https://github.com/acmecloud/acme-core",
                "language": "Python / TypeScript",
                "archived": False
            },
            {
                "id": "gh_repo_102",
                "name": "acme-frontend",
                "full_name": "acmecloud/acme-frontend",
                "owner": "acmecloud",
                "default_branch": "main",
                "visibility": "private",
                "html_url": "https://github.com/acmecloud/acme-frontend",
                "language": "TypeScript (Next.js)",
                "archived": False
            },
            {
                "id": "gh_repo_103",
                "name": "acme-backend-api",
                "full_name": "acmecloud/acme-backend-api",
                "owner": "acmecloud",
                "default_branch": "main",
                "visibility": "private",
                "html_url": "https://github.com/acmecloud/acme-backend-api",
                "language": "Python (FastAPI)",
                "archived": False
            },
            {
                "id": "gh_repo_104",
                "name": "acme-infra-terraform",
                "full_name": "acmecloud/acme-infra-terraform",
                "owner": "acmecloud",
                "default_branch": "main",
                "visibility": "private",
                "html_url": "https://github.com/acmecloud/acme-infra-terraform",
                "language": "HCL / Terraform",
                "archived": False
            }
        ]

    async def list_branches(self, installation_id: str, owner: str, repo: str) -> List[Dict[str, Any]]:
        return [
            {"name": "main", "commit_sha": "a7b3e9f42c10b88d3e21", "is_default": True},
            {"name": "staging", "commit_sha": "c4d2e1a90f33b11c8d76", "is_default": False},
            {"name": "feat/production-hardening", "commit_sha": "e9b8a7c6d5e4f3a2b1c0", "is_default": False}
        ]

    def verify_webhook_signature(self, payload: bytes, signature_header: str) -> bool:
        if not signature_header or not signature_header.startswith("sha256="):
            return False
        
        expected_sig = signature_header[7:]
        computed_sig = hmac.new(
            self.webhook_secret.encode("utf-8"),
            payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(computed_sig, expected_sig)

    async def handle_webhook(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        action = payload.get("action", "unknown")
        
        if event_type == "installation":
            return {
                "action": action,
                "installation_id": str(payload.get("installation", {}).get("id")),
                "account": payload.get("installation", {}).get("account", {}).get("login"),
                "status": "SYNCED"
            }
        elif event_type == "installation_repositories":
            return {
                "action": action,
                "installation_id": str(payload.get("installation", {}).get("id")),
                "repositories_added": len(payload.get("repositories_added", [])),
                "repositories_removed": len(payload.get("repositories_removed", [])),
                "status": "SYNCED"
            }
        elif event_type == "push":
            ref = payload.get("ref", "")
            branch = ref.replace("refs/heads/", "")
            return {
                "action": "push",
                "repository": payload.get("repository", {}).get("full_name"),
                "branch": branch,
                "commit_sha": payload.get("after"),
                "status": "RECORDED"
            }
        return {"status": "IGNORED", "event": event_type}

github_provider = GitHubProvider()
