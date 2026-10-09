"""Bounded static imports and entry points; no execution or runtime claims."""
import ast
import hashlib
import posixpath
import re

SOURCE_SUFFIXES = (".py", ".ts", ".tsx", ".js", ".jsx", ".mjs")
MAX_SOURCE_FILES = 40
MAX_SOURCE_BYTES = 100_000
EXCLUDED = {"node_modules", "vendor", ".venv", "venv", ".git", ".next", "dist", "build", "__pycache__"}

def eligible(path):
    return path.endswith(SOURCE_SUFFIXES) and not any(part in EXCLUDED for part in path.split("/")) and not path.endswith(".d.ts")

def inspect_sources(sources, total_candidates):
    modules = []
    for path, raw in sorted(sources.items()):
        imports, entries = set(), set()
        language, status = ("Python" if path.endswith(".py") else "JavaScript / TypeScript"), "INSPECTED"
        try:
            text = raw.decode("utf-8")
            if language == "Python":
                tree = ast.parse(text)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        imports.update(item.name for item in node.names)
                    elif isinstance(node, ast.ImportFrom):
                        base = "." * node.level + (node.module or "")
                        imports.add(base)
                        imports.update(base + ("." if node.module else "") + item.name for item in node.names)
                    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        for decorator in node.decorator_list:
                            if isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Attribute) and decorator.func.attr in {"get", "post", "put", "delete", "patch", "route", "websocket"}:
                                entries.add(f"{decorator.func.attr.upper()} handler: {node.name}")
            else:
                # Syntax clues only: comments, aliases and dynamic imports are not resolved.
                imports.update(re.findall(r"(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*|\bimport\s*)['\"]([@a-zA-Z0-9_./-]{1,200})['\"]", text))
                entries.update(f"Export: {name}" for name in re.findall(r"\bexport\s+(?:async\s+)?(?:function|const|class)\s+([a-zA-Z_$][\w$]{0,79})", text)[:20])
        except (SyntaxError, UnicodeError, ValueError, RecursionError):
            status = "UNPARSED"
        imports = sorted(value for value in imports if re.fullmatch(r"[@a-zA-Z0-9_./-]{1,200}", value))[:60]
        modules.append({"id": "src-" + hashlib.sha256(path.encode()).hexdigest()[:16], "path": path,
            "language": language, "status": status, "imports": imports, "entry_points": sorted(entries)[:20]})
    lookup = {item["path"]: item["id"] for item in modules}
    links = set()
    for module in modules:
        for name in module["imports"]:
            if module["language"] == "Python":
                if name.startswith("."):
                    dots = len(name) - len(name.lstrip("."))
                    base = posixpath.dirname(module["path"])
                    for _ in range(dots - 1): base = posixpath.dirname(base)
                    stem = posixpath.join(base, name[dots:].replace(".", "/"))
                else:
                    stem = name.replace(".", "/")
                candidates = [stem + ".py", stem + "/__init__.py"]
                # Also inspect local package roots in a monorepo without asserting ambiguous imports.
                matches = [path for path in lookup if any(path == candidate or path.endswith("/" + candidate) for candidate in candidates)]
            elif name.startswith("."):
                stem = posixpath.normpath(posixpath.join(posixpath.dirname(module["path"]), name))
                candidates = [stem] + [stem + suffix for suffix in SOURCE_SUFFIXES] + [stem + "/index" + suffix for suffix in SOURCE_SUFFIXES]
                matches = [path for path in candidates if path in lookup]
            else: matches = []
            if len(matches) == 1 and lookup[matches[0]] != module["id"]:
                links.add((module["id"], lookup[matches[0]]))
    return {"modules": modules, "module_edges": [{"source": source, "target": target, "label": "Static import"} for source, target in sorted(links)[:160]],
        "source_coverage": {"inspected": len(modules), "candidates": total_candidates, "limit": MAX_SOURCE_FILES},
        "scope": "Dependency manifests and a bounded static source sample. Python imports are parsed; JavaScript imports are syntax clues. Dynamic calls, secrets, runtime behavior and deployed infrastructure are not verified."}
