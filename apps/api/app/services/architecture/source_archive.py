"""Inspect bounded ZIP packages in memory. Never extract or execute customer code."""
import base64
import hashlib
import io
import re
import stat
import zipfile
import zlib
from pathlib import PurePosixPath
from cryptography.fernet import Fernet
from fastapi import HTTPException
from app.core.config import settings
from app.services.architecture import workspace, code_evidence

MAX_UPLOAD_BYTES = 3 * 1024 * 1024
MAX_EXPANDED_BYTES = 25 * 1024 * 1024
MANIFESTS = {"package.json", "requirements.txt", "pyproject.toml", "go.mod", "Gemfile", "pom.xml", "Dockerfile"}
EXCLUDED_DIRECTORIES = {".git", "node_modules", ".venv", "venv", "__pycache__", ".next"}


def inspect_archive(raw: bytes, filename: str):
    if not settings.ENCRYPTION_KEY:
        raise HTTPException(503, "Code uploads require platform encryption to be configured.")
    if not filename.lower().endswith(".zip") or not raw or len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(422, "Choose a ZIP file no larger than 3 MB.")
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            entries = archive.infolist()
            if not entries or len(entries) > 2000 or sum(item.file_size for item in entries) > MAX_EXPANDED_BYTES:
                raise HTTPException(422, "ZIP packages may contain up to 2,000 entries and 25 MB of uncompressed code.")
            paths, files, components = set(), [], []
            total_read, file_count = 0, 0
            sources, source_candidates = {}, 0
            for item in entries:
                path = item.filename
                parts = PurePosixPath(path).parts
                mode = item.external_attr >> 16
                if (len(path) > 512 or "\x00" in item.orig_filename or "\\" in path or ":" in path or path.startswith("/")
                        or ".." in parts or not parts or str(PurePosixPath(path)) in paths or item.flag_bits & 1
                        or (stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR))):
                    raise HTTPException(422, "The ZIP contains an unsafe path, duplicate entry, link, or encrypted file.")
                paths.add(str(PurePosixPath(path)))
                basename = parts[-1]
                if (any(part.lower() in EXCLUDED_DIRECTORIES for part in parts)
                        or (basename.lower().startswith(".env") and basename.lower() not in {".env.example", ".env.sample", ".env.template"})
                        or basename.lower().endswith((".pem", ".key", ".p12", ".pfx"))
                        or basename.lower() in {"id_rsa", "id_ed25519", "credentials"}):
                    raise HTTPException(422, "Remove environment files, private keys, installed dependencies, and Git history before uploading.")
                if item.is_dir():
                    continue
                file_count += 1
                manifest = basename in MANIFESTS
                source = code_evidence.eligible(path)
                if source: source_candidates += 1
                capture_source = source and item.file_size <= code_evidence.MAX_SOURCE_BYTES and len(sources) < code_evidence.MAX_SOURCE_FILES
                if manifest and (item.file_size > 100_000 or len(files) >= 30):
                    raise HTTPException(422, "Manifest analysis supports up to 30 files, each no larger than 100 KB.")
                content = bytearray()
                with archive.open(item) as stream:
                    while chunk := stream.read(64 * 1024):
                        total_read += len(chunk)
                        if total_read > MAX_EXPANDED_BYTES:
                            raise HTTPException(422, "The uncompressed ZIP exceeds 25 MB.")
                        if manifest or capture_source:
                            content.extend(chunk)
                            if len(content) > 100_000:
                                raise HTTPException(422, "A manifest exceeds 100 KB.")
                if capture_source:
                    sources[path] = bytes(content)
                if manifest:
                    names = workspace.dependencies(path, content.decode("utf-8"))
                    names = [name for name in names if isinstance(name, str) and re.fullmatch(r"[@a-zA-Z0-9][a-zA-Z0-9@/_.-]{0,199}", name)]
                    files.append({"path": path, "sha": hashlib.sha256(content).hexdigest(), "dependencies": names})
                    for kind, label, indicators in workspace.COMPONENTS:
                        found = [name for name in names if name.lower() in indicators]
                        if found:
                            components.append({"kind": kind, "label": label, "path": path, "dependencies": found})
            if not files:
                raise HTTPException(422, "Include a dependency manifest such as package.json, requirements.txt, or pyproject.toml in your ZIP.")
            digest = hashlib.sha256(raw).hexdigest()
            cipher = Fernet(base64.urlsafe_b64encode(hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()))
            evidence = {"source_type": "UPLOAD", "repository": filename, "branch": "Uploaded ZIP", "commit": digest,
                "files": files, "components": components,
                **code_evidence.inspect_sources(sources, source_candidates)}
            return {"sha256": digest, "file_count": file_count, "evidence": evidence, "encrypted_archive": cipher.encrypt(raw)}
    except HTTPException:
        raise
    except (zipfile.BadZipFile, UnicodeError, ValueError, TypeError, KeyError, AttributeError, RuntimeError, NotImplementedError, EOFError, zlib.error, OSError):
        raise HTTPException(422, "This ZIP or one of its dependency manifests is invalid. No workspace was saved.") from None
