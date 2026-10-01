import os
import tarfile
import zipfile
import shutil
import tempfile
from pathlib import Path
from contextlib import contextmanager
from typing import Generator, List

class ArchiveSecurityError(Exception):
    """Raised when an archive violates security limits or contains malicious path traversal."""
    pass

class SafeArchiveExtractor:
    MAX_FILE_COUNT = 5000
    MAX_INDIVIDUAL_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    MAX_TOTAL_EXTRACTED_SIZE = 100 * 1024 * 1024 # 100 MB

    @classmethod
    def is_safe_path(cls, base_dir: Path, target_path: Path) -> bool:
        """Ensures target path resolves strictly inside base_dir (prevents ../ path traversal)."""
        try:
            resolved_base = base_dir.resolve()
            resolved_target = target_path.resolve()
            return resolved_target.is_relative_to(resolved_base)
        except (ValueError, RuntimeError):
            return False

    @classmethod
    def extract_zip(cls, zip_path: str, extract_to: str) -> List[str]:
        target_dir = Path(extract_to).resolve()
        extracted_files = []
        total_size = 0
        file_count = 0

        with zipfile.ZipFile(zip_path, 'r') as zf:
            for member in zf.infolist():
                file_count += 1
                if file_count > cls.MAX_FILE_COUNT:
                    raise ArchiveSecurityError(f"Archive exceeds maximum file count limit ({cls.MAX_FILE_COUNT})")

                if member.file_size > cls.MAX_INDIVIDUAL_FILE_SIZE:
                    raise ArchiveSecurityError(f"File {member.filename} exceeds max size limit ({cls.MAX_INDIVIDUAL_FILE_SIZE} bytes)")

                total_size += member.file_size
                if total_size > cls.MAX_TOTAL_EXTRACTED_SIZE:
                    raise ArchiveSecurityError(f"Total extracted size exceeds limit ({cls.MAX_TOTAL_EXTRACTED_SIZE} bytes)")

                # Path traversal check
                dest_path = (target_dir / member.filename).resolve()
                if not cls.is_safe_path(target_dir, dest_path):
                    raise ArchiveSecurityError(f"Malicious path traversal detected in archive: {member.filename}")

                # Reject dangerous symlinks
                if member.is_dir():
                    dest_path.mkdir(parents=True, exist_ok=True)
                else:
                    dest_path.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(member) as source, open(dest_path, "wb") as target:
                        shutil.copyfileobj(source, target)
                    extracted_files.append(str(dest_path.relative_to(target_dir)))

        return extracted_files

@contextmanager
def temporary_analysis_workspace() -> Generator[str, None, None]:
    """Provides an isolated temporary workspace that is unconditionally cleaned up."""
    temp_dir = tempfile.mkdtemp(prefix="launchcomply_analysis_")
    try:
        yield temp_dir
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
