"""GitHub App authorization and real repository metadata, without fixture fallback."""
import base64
import hashlib
import re
from urllib.parse import urlencode, urlsplit
import httpx
from cryptography.fernet import Fernet
from fastapi import HTTPException
from app.core.config import settings

def configured():
    callback = urlsplit(settings.GITHUB_CALLBACK_URL)
    return bool(settings.GITHUB_APP_ID.isdigit() and
        re.fullmatch(r"[a-zA-Z0-9-]+", settings.GITHUB_APP_SLUG) and
        settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET and
        callback.scheme == "https" and callback.netloc and not callback.username and
        not callback.password and not callback.query and not callback.fragment and
        callback.path == "/onboarding/github/callback" and
        f"{callback.scheme}://{callback.netloc}" in settings.BACKEND_CORS_ORIGINS)

def require_configuration():
    if not configured():
        raise HTTPException(503, "GitHub connection is not available yet. Contact your administrator.")

def state_hash(value):
    return hashlib.sha256(value.encode()).hexdigest()

def verifier_cipher():
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()))

def installation_url():
    return f"https://github.com/apps/{settings.GITHUB_APP_SLUG}/installations/new"

def authorization_url(state, verifier):
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    return "https://github.com/login/oauth/authorize?" + urlencode({
        "client_id": settings.GITHUB_CLIENT_ID, "redirect_uri": settings.GITHUB_CALLBACK_URL,
        "state": state, "code_challenge": challenge, "code_challenge_method": "S256",
    })

class GitHubAppClient:
    def client(self):
        return httpx.AsyncClient(timeout=20, follow_redirects=False)

    async def authorized_installations(self, code, verifier):
        require_configuration()
        try:
            async with self.client() as client:
                response = await client.post("https://github.com/login/oauth/access_token",
                    headers={"Accept": "application/json"}, data={
                        "client_id": settings.GITHUB_CLIENT_ID, "client_secret": settings.GITHUB_CLIENT_SECRET,
                        "code": code, "redirect_uri": settings.GITHUB_CALLBACK_URL, "code_verifier": verifier,
                    })
                if response.status_code != 200:
                    raise HTTPException(502, "GitHub authorization could not be completed. Please reconnect.")
                token_payload = response.json()
                token = token_payload.get("access_token")
                if token_payload.get("error") or not isinstance(token, str) or not token:
                    raise HTTPException(400, "GitHub authorization was declined or expired. Please reconnect.")
                headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
                identity = await client.get("https://api.github.com/user", headers=headers)
                if identity.status_code != 200 or not identity.json().get("id"):
                    raise HTTPException(502, "GitHub account verification failed. Please reconnect.")
                installations = await self.pages(client, "/user/installations", headers, "installations")
                authorized = []
                for item in installations:
                    if str(item.get("app_id")) != settings.GITHUB_APP_ID or item.get("suspended_at"):
                        continue
                    identifier = str(item["id"])
                    if not identifier.isdigit():
                        raise HTTPException(502, "GitHub returned an invalid installation.")
                    repos = await self.pages(client, f"/user/installations/{identifier}/repositories", headers, "repositories")
                    authorized.append({"installation_id": identifier, "account": item["account"], "repositories": repos})
                return authorized
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            raise HTTPException(502, "GitHub is temporarily unavailable. Please reconnect shortly.") from None

    async def pages(self, client, path, headers, key):
        items = []
        for page in range(1, 11):
            response = await client.get(f"https://api.github.com{path}", headers=headers, params={"per_page": 100, "page": page})
            if response.status_code != 200:
                raise HTTPException(502, "Unable to read authorized GitHub repositories. Check GitHub App access and reconnect.")
            entries = response.json()[key]
            if not isinstance(entries, list):
                raise ValueError("Invalid GitHub response")
            items.extend(entries)
            if len(entries) < 100:
                return items
        raise HTTPException(502, "Too many GitHub repositories to connect at once. Limit the app to the repositories you need.")

github_app_client = GitHubAppClient()
