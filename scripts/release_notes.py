#!/usr/bin/env python3
import re
from pathlib import Path
root = Path(__file__).resolve().parents[1]
version = (root / "VERSION").read_text().strip()
notes = (root / "backend/src/main/resources/RELEASE-NOTES.md").read_text()
match = re.search(r"(?ms)^## \[" + re.escape(version) + r"\][^\n]*\n(.*?)(?=^## |\Z)", notes)
if not match or not match[1].strip():
    raise SystemExit("Missing release notes section for " + version)
print(match[1].strip())
