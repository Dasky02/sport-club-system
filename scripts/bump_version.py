#!/usr/bin/env python3
"""Update the independent project version. Does not commit, tag or publish."""
import json
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
if len(sys.argv) != 2 or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", sys.argv[1]):
    raise SystemExit("Usage: python3 scripts/bump_version.py X.Y.Z")
version = sys.argv[1]
pom = root / "backend/pom.xml"
text = pom.read_text()
# The first project version after the parent block, never the Spring Boot parent.
text, count = re.subn(r"(</parent>[\s\S]*?<version>)[^<]+(</version>)", lambda m: m[1] + version + m[2], text, count=1)
if count != 1:
    raise SystemExit("Project version missing from backend/pom.xml")
metadata = []
for name in ["package.json", "package-lock.json"]:
    path = root / "frontend" / name
    data = json.loads(path.read_text())
    data["version"] = version
    if "packages" in data:
        data["packages"][""]["version"] = version
    metadata.append((path, data))
pom.write_text(text)
for path, data in metadata:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
(root / "VERSION").write_text(version + "\n")
print("Updated VERSION, Maven and frontend metadata to " + version)
