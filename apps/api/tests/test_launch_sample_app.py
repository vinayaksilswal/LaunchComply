"""The live-launch sample app is planned correctly by the real analysis code (no network)."""
from pathlib import Path

from app.services.architecture import code_evidence
from app.services.architecture.workspace import dependencies
from app.services.launch.plan import build_plan, readiness

SAMPLE = Path(__file__).resolve().parents[3] / "fixtures" / "sample-launch-app"
REPO = "learner/sample-shop"


def evidence_from_folder(root: Path) -> dict:
    files, sources = [], {}
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        relative = path.relative_to(root).as_posix()
        if path.name in ("package.json", "requirements.txt"):
            files.append({"path": f"{REPO}/{relative}", "dependencies": dependencies(relative, path.read_text(encoding="utf-8"))})
        elif code_evidence.eligible(relative):
            sources[relative] = path.read_bytes()
    inspected = code_evidence.inspect_sources(sources, len(sources))
    modules = [{**m, "path": f"{REPO}/{m['path']}"} for m in inspected["modules"]]
    return {"repositories": [{"full_name": REPO, "branch": "main"}], "files": files, "modules": modules, "components": [], "commit": "sample"}


def test_sample_app_produces_the_expected_launch_plan():
    plan = build_plan(evidence_from_folder(SAMPLE))
    parts = {p["role"]: p for p in plan["parts"]}
    assert set(parts) == {"database", "backend", "frontend"}, "no media part: the sample does not use Cloudinary"
    web, api = parts["frontend"], parts["backend"]
    assert web["root_dir"] == "web" and web["framework"] == "vite" and web["api_url_key"] == "VITE_API_URL"
    assert api["root_dir"] == "api" and api["runtime"] == "python" and api["framework_label"] == "FastAPI"
    assert api["start_command"] == "uvicorn main:app --host 0.0.0.0 --port $PORT"
    assert api["build_command"] == "pip install -r requirements.txt"
    assert api["database_url_key"] == "DATABASE_URL" and "DATABASE_URL" in api["env_keys"]
    for part in plan["parts"]:
        blockers, warnings = readiness(part, plan["parts"], source_changed=False)
        assert blockers == [] and warnings == [], (part["role"], blockers, warnings)
