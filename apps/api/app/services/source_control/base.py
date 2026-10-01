from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class SourceControlProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Returns provider identifier: GITHUB, GITLAB, BITBUCKET"""
        pass

    @abstractmethod
    def get_installation_url(self, state: str) -> str:
        """Generates provider installation URL with secure CSRF state."""
        pass

    @abstractmethod
    async def exchange_installation_token(self, installation_id: str) -> str:
        """Requests a short-lived installation access token. Never persisted."""
        pass

    @abstractmethod
    async def list_repositories(self, installation_id: str) -> List[Dict[str, Any]]:
        """Lists accessible repositories for the given installation."""
        pass

    @abstractmethod
    async def list_branches(self, installation_id: str, owner: str, repo: str) -> List[Dict[str, Any]]:
        """Lists branches for a given repository."""
        pass

    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature_header: str) -> bool:
        """Verifies cryptographic signature of incoming webhook payload."""
        pass

    @abstractmethod
    async def handle_webhook(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Processes incoming webhook event (installation, push, repo sync)."""
        pass
