#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
# SPDX-License-Identifier: Apache-2.0
"""The conformance kit's own gate.

@openinherit/conformance is what an implementer grades themselves against, so
it has to be right before anyone else is graded on it. This checks, with the
reference validator (Python jsonschema, Draft 2020-12, over the kit's own
bundled schemas):

  K1  the manifest is at the kit's version, and the kit is at the root version
  K2  every file the manifest names exists and matches its sha256
  K3  every VALID fixture is accepted
  K4  every INVALID fixture is generated from mutations.json -- one VALID base,
      one operation -- and rebuilding the kit reproduces it exactly
  K5  each INVALID targets ONE rule: its base is accepted, the mutant is
      rejected with exactly one top-level error, and that error's tree holds
      the declared keyword at the declared instance path
  K6  the catalogue covers every required rule class

USAGE: python3 scripts/check-conformance-kit.py [--root <dir>]
EXIT CODES: 0 clean - 1 one or more assertions failed - 2 cannot answer.
Exit 2 is never "no failures".
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

REQUIRED_CLASSES = {"closed-world", "enum", "required", "type", "x-inherit"}


def cannot(message):
    print(f"CANNOT ANSWER: {message}", file=sys.stderr)
    sys.exit(2)


try:
    from jsonschema import Draft202012Validator
except ImportError:
    cannot("the jsonschema package is not installed (pip install jsonschema)")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.conformance_kit import apply_op, load_json, sha256_of  # noqa: E402


def error_tree(error):
    yield error
    for child in error.context or []:
        yield from error_tree(child)


def keywords(error):
    """The keyword an error reports, plus propertyNames when the error is a
    subschema of propertyNames (jsonschema reports that as the inner keyword,
    e.g. pattern, where other validators report propertyNames)."""
    found = {error.validator}
    path = list(error.relative_schema_path)
    if len(path) >= 2 and path[-2] == "propertyNames":
        found.add("propertyNames")
    return found


def pointer(path):
    return "".join("/" + str(p).replace("~", "~0").replace("/", "~1") for p in path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(Path(__file__).resolve().parent.parent))
    args = parser.parse_args()
    root = Path(args.root)
    kit = root / "packages" / "conformance"
    if not (kit / "manifest.json").exists():
        cannot(f"{kit / 'manifest.json'} does not exist")

    failures = []

    def fail(check, message):
        failures.append(f"[{check}] {message}")

    manifest = load_json(kit / "manifest.json")
    root_version = load_json(root / "package.json")["version"]
    kit_version = load_json(kit / "package.json")["version"]

    # K1 -------------------------------------------------------------------
    if manifest.get("version") != kit_version:
        fail("K1", f"manifest.json is at {manifest.get('version')}, the package at {kit_version}")
    if kit_version != root_version:
        fail("K1", f"@openinherit/conformance is at {kit_version}, the standard at {root_version}")

    # K2 -------------------------------------------------------------------
    named = [(s["file"], s.get("sha256")) for s in manifest.get("schemas", [])]
    for t in manifest.get("tests", []):
        named += [(t["file"], t.get("sha256")), (t["expected"], t.get("expectedSha256"))]
    if not manifest.get("schemas"):
        fail("K2", "manifest.json lists no schemas")
    for rel, digest in named:
        path = kit / rel
        if not path.exists():
            fail("K2", f"{rel} is in the manifest but not in the kit")
        elif digest != sha256_of(path):
            fail("K2", f"{rel}: sha256 {sha256_of(path)} does not match the manifest's {digest}")

    schemas = {
        "estate": Draft202012Validator(load_json(kit / "schemas" / "inherit-v3-bundled.json")),
        "catalogue": Draft202012Validator(load_json(kit / "schemas" / "catalogue-v3-bundled.json")),
    }

    # Validating against the bundles is the slow part (up to ~2 s a document),
    # so each file on disk is validated once and K5 reuses the result.
    verdicts = {}

    # K3 + manifest verdicts -----------------------------------------------
    for t in manifest.get("tests", []):
        if not (kit / t["file"]).exists() or not (kit / t["expected"]).exists():
            continue
        expected = load_json(kit / t["expected"])
        if t.get("valid") != expected.get("valid"):
            fail("K3", f"{t['file']}: the manifest says valid={t.get('valid')}, its expected file {expected.get('valid')}")
        doc = load_json(kit / t["file"])
        errors = list(schemas[expected.get("schemaMode", "estate")].iter_errors(doc))
        verdicts[t["file"]] = (doc, errors)
        if expected.get("valid") is True and errors:
            fail("K3", f"{t['file']} is VALID but the reference validator refuses it: {errors[0].message[:160]}")
        if expected.get("valid") is False and not errors:
            fail("K3", f"{t['file']} is INVALID but the reference validator accepts it")

    # K4 -------------------------------------------------------------------
    mutations = []
    if (kit / "mutations.json").exists():
        mutations = load_json(kit / "mutations.json")["cases"]
    else:
        fail("K4", "packages/conformance/mutations.json does not exist")
    generated = {f"{m['schemaMode']}/invalid/{m['id']}.json" for m in mutations}
    invalid_in_manifest = {t["file"] for t in manifest.get("tests", []) if t.get("valid") is False}
    on_disk = {str(p.relative_to(kit)) for p in kit.glob("*/invalid/*.json")}
    for rel in sorted(on_disk - generated):
        fail("K4", f"{rel} is an INVALID fixture with no entry in mutations.json")
    for rel in sorted(invalid_in_manifest - generated):
        fail("K4", f"{rel} is INVALID in the manifest but not generated from mutations.json")
    build = subprocess.run(
        [sys.executable, str(root / "scripts" / "build-conformance-kit.py"), "--root", str(root), "--check"],
        capture_output=True, text=True,
    )
    if build.returncode == 2:
        cannot(f"build-conformance-kit.py --check could not answer: {build.stderr.strip()}")
    if build.returncode != 0:
        fail("K4", f"rebuilding the kit does not reproduce it:\n{build.stdout}{build.stderr}".rstrip())

    # K5 -------------------------------------------------------------------
    for m in mutations:
        validator = schemas[m["schemaMode"]]
        base = load_json(kit / m["base"])
        if not m["base"].startswith(f"{m['schemaMode']}/valid/"):
            fail("K5", f"{m['id']}: base {m['base']} is not a {m['schemaMode']} VALID fixture")
        base_errors = verdicts[m["base"]][1] if m["base"] in verdicts else list(validator.iter_errors(base))
        if base_errors:
            fail("K5", f"{m['id']}: base {m['base']} is not itself valid")
            continue
        try:
            doc = apply_op(base, m["op"])
        except (KeyError, IndexError, ValueError) as err:
            fail("K5", f"{m['id']}: the operation does not apply to its base -- {err}")
            continue
        rel = f"{m['schemaMode']}/invalid/{m['id']}.json"
        if rel in verdicts and verdicts[rel][0] == doc:
            errors = verdicts[rel][1]
        else:
            errors = list(validator.iter_errors(doc))
        rule = m["rule"]
        if len(errors) != 1:
            got = "; ".join(f"{e.validator} at '{pointer(e.absolute_path)}'" for e in errors) or "none"
            fail("K5", f"{m['id']}: expected exactly one rejected rule, got {len(errors)} ({got})")
            continue
        hits = [e for e in error_tree(errors[0])
                if rule["keyword"] in keywords(e) and pointer(e.absolute_path) == rule["instancePath"]]
        if not hits:
            e = errors[0]
            fail("K5", f"{m['id']}: declared {rule['keyword']} at '{rule['instancePath']}', "
                       f"but the reference validator rejects {e.validator} at '{pointer(e.absolute_path)}'")

    # K6 -------------------------------------------------------------------
    missing = REQUIRED_CLASSES - {m["rule"]["class"] for m in mutations}
    if missing:
        fail("K6", f"no INVALID case in the class(es): {', '.join(sorted(missing))}")

    cases = len(manifest.get("tests", []))
    if failures:
        for f in failures:
            print(f, file=sys.stderr)
        print(f"\nconformance kit: {len(failures)} failure(s)", file=sys.stderr)
        sys.exit(1)
    print(f"conformance kit: OK -- {manifest['version']}, {cases} cases "
          f"({cases - len(mutations)} VALID, {len(mutations)} INVALID one-rule mutations)")


if __name__ == "__main__":
    main()
