import os
import hashlib
from pathlib import Path
from typing import Dict, List, Any

IGNORE_DIRS = {
    ".git", "node_modules", ".venv", "venv", "ENV", "dist", "build",
    ".next", ".nuxt", "coverage", "__pycache__", ".pytest_cache", ".idea", ".vscode"
}

MANIFEST_NAMES = {
    "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
    "requirements.txt", "pyproject.toml", "poetry.lock", "Pipfile", "Pipfile.lock",
    "Dockerfile", "docker-compose.yml", "docker-compose.yaml", "Procfile",
    ".env.example", ".env.template", "next.config.js", "next.config.mjs", "next.config.ts",
    "vite.config.js", "vite.config.ts", "nginx.conf"
}

class RepositoryIndexer:
    @classmethod
    def categorize_file(cls, path_obj: Path) -> str:
        filename = path_obj.name.lower()
        ext = path_obj.suffix.lower()

        if filename in MANIFEST_NAMES or filename.startswith("dockerfile"):
            return "manifest"
        if filename.startswith("docker-compose") or filename.startswith("dockerfile"):
            return "docker"
        if ext in {".tf", ".hcl", ".template"} or "cloudformation" in str(path_obj).lower():
            return "infrastructure"
        if ext in {".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".java", ".rs", ".rb", ".php"}:
            return "source"
        if ext in {".json", ".yaml", ".yml", ".toml", ".ini", ".env"}:
            return "config"
        if ext in {".md", ".rst", ".txt", ".pdf"}:
            return "documentation"
        if "test" in filename or "spec" in filename or "tests" in path_obj.parts:
            return "test"
        if ext in {".png", ".jpg", ".jpeg", ".svg", ".ico", ".css"}:
            return "static"
        return "unknown"

    @classmethod
    def index_directory(cls, root_dir: str) -> Dict[str, Any]:
        root_path = Path(root_dir)
        files_index: List[Dict[str, Any]] = []
        total_size = 0
        categories_count: Dict[str, int] = {}
        manifest_files: List[str] = []

        for current_root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

            for file in files:
                full_path = Path(current_root) / file
                rel_path = str(full_path.relative_to(root_path)).replace("\\", "/")
                
                try:
                    file_stat = full_path.stat()
                    size = file_stat.st_size
                except OSError:
                    continue

                category = cls.categorize_file(full_path)
                categories_count[category] = categories_count.get(category, 0) + 1
                total_size += size

                if category in {"manifest", "docker"}:
                    manifest_files.append(rel_path)

                files_index.append({
                    "path": rel_path,
                    "filename": file,
                    "extension": full_path.suffix.lower(),
                    "size": size,
                    "category": category,
                })

        return {
            "total_files": len(files_index),
            "total_size_bytes": total_size,
            "categories": categories_count,
            "manifest_files": manifest_files,
            "files": files_index
        }
