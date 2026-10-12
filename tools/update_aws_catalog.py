"""Refresh planning catalog from AWS's public CloudFormation specification. No credentials."""
import json
import gzip
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SOURCE = "https://d2senuesg1djtx.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json"
DESTINATION = Path(__file__).resolve().parents[1] / "apps/web/src/components/architecture/awsResourceCatalog.json"


def main():
    with urllib.request.urlopen(SOURCE, timeout=60) as response:
        raw = response.read()
        spec = json.loads(gzip.decompress(raw) if raw.startswith(b"\x1f\x8b") else raw)
    families = {}
    for name, resource in sorted(spec["ResourceTypes"].items()):
        parts = name.split("::")
        documentation = resource.get("Documentation", "").replace("http://docs.aws.amazon.com/", "https://docs.aws.amazon.com/")
        if len(parts) != 3 or parts[0] != "AWS" or not documentation.startswith("https://docs.aws.amazon.com/"):
            continue
        families.setdefault(parts[1], []).append({"type": name, "documentation": documentation})
    catalog = {"source": SOURCE, "region": "ap-south-1", "version": spec["ResourceSpecificationVersion"],
               "checked_at": datetime.now(timezone.utc).date().isoformat(),
               "families": [{"name": name, "resources": resources} for name, resources in sorted(families.items())]}
    if len(families) < 100:
        raise ValueError("AWS specification is incomplete; existing catalog retained.")
    DESTINATION.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(f"Catalog: {len(families)} resource families, {sum(map(len, families.values()))} resource types; version {catalog['version']}")


if __name__ == "__main__":
    main()
