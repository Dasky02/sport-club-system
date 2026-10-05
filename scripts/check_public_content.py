#!/usr/bin/env python3
"""Check staged/tracked and unignored files without printing secret values."""
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path
root = Path(__file__).resolve().parents[1]
paths = subprocess.check_output(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=root).decode().split("\0")
paths = sorted(set(filter(None, paths)))
patterns = [
    rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    rb"gh[pousr]_[A-Za-z0-9]{30,}",
    rb"github_pat_[A-Za-z0-9_]{40,}",
    rb"AKIA[A-Z0-9]{16}",
    rb"sk-(?:proj-)?[A-Za-z0-9_-]{32,}",
]
failures = []
for name in paths:
    p = Path(name)
    if (p.name == ".env" or p.name.startswith(".env.")) and p.name != ".env.example":
        failures.append(name + ": private env file")
    if any(part in {"node_modules", ".next", "target", ".git"} for part in p.parts):
        failures.append(name + ": generated or nested Git files")
    if p.suffix in {".pem", ".key", ".p12", ".jks"}:
        failures.append(name + ": credential-like file")
    full = root / p
    if full.is_file():
        content = full.read_bytes()
        if any(re.search(pattern, content) for pattern in patterns):
            failures.append(name + ": credential pattern (value redacted)")
version = (root / "VERSION").read_text().strip()
if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
    failures.append("VERSION: expected X.Y.Z")
ns = {"m": "http://maven.apache.org/POM/4.0.0"}
pom = ET.parse(root / "backend/pom.xml").getroot()
if pom.findtext("m:version", namespaces=ns) != version:
    failures.append("backend/pom.xml: version differs from VERSION")
for name in ["package.json", "package-lock.json"]:
    data = json.loads((root / "frontend" / name).read_text())
    if data["version"] != version or ("packages" in data and data["packages"][""]["version"] != version):
        failures.append("frontend/" + name + ": version differs from VERSION")
if failures:
    raise SystemExit("\n".join(failures))
print(f"Public content check passed for {len(paths)} files; version {version}. Secret values were not printed.")
