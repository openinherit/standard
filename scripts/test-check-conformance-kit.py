#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
# SPDX-License-Identifier: Apache-2.0
"""Tests for check-conformance-kit.py: each check must go RED on its defect.

Every test copies the kit and the two scripts into a temporary root, seeds one
defect, and asserts the exit code and the check that names it. Hermetic: it
never writes to the real tree.

Run: python3 scripts/test-check-conformance-kit.py
"""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def run(root, script="check-conformance-kit.py"):
    return subprocess.run([sys.executable, str(root / "scripts" / script), "--root", str(root)],
                          capture_output=True, text=True)


class Kit(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="kit-"))
        shutil.copytree(REPO / "packages" / "conformance", self.root / "packages" / "conformance")
        (self.root / "scripts" / "lib").mkdir(parents=True)
        for rel in ("check-conformance-kit.py", "build-conformance-kit.py", "lib/conformance_kit.py"):
            shutil.copy(REPO / "scripts" / rel, self.root / "scripts" / rel)
        shutil.copy(REPO / "package.json", self.root / "package.json")
        self.kit = self.root / "packages" / "conformance"

    def tearDown(self):
        shutil.rmtree(self.root)

    def edit_json(self, rel, fn):
        path = self.kit / rel if not rel.startswith("/") else Path(rel)
        doc = json.loads(path.read_text())
        fn(doc)
        path.write_text(json.dumps(doc, indent=2) + "\n")

    def rebuild(self):
        r = run(self.root, "build-conformance-kit.py")
        self.assertEqual(r.returncode, 0, r.stderr)

    def assertRed(self, check, text=None):
        r = run(self.root)
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn(f"[{check}]", r.stderr)
        if text:
            self.assertIn(text, r.stderr)

    def add_case(self, case):
        self.edit_json("mutations.json", lambda d: d["cases"].append(case))

    def test_the_real_kit_is_green(self):
        r = run(self.root)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("conformance kit: OK", r.stdout)

    def test_K1_manifest_behind_the_package(self):
        self.edit_json("manifest.json", lambda d: d.update(version="6.1.1"))
        self.assertRed("K1", "manifest.json is at 6.1.1")

    def test_K1_kit_behind_the_standard(self):
        self.edit_json(str(self.root / "package.json"), lambda d: d.update(version="99.0.0"))
        self.assertRed("K1", "the standard at 99.0.0")

    def test_K2_one_changed_byte_in_a_fixture(self):
        path = self.kit / "estate" / "valid" / "minimal-estate.json"
        path.write_text(path.read_text().replace('"James"', '"Jameson"'))
        self.assertRed("K2", "estate/valid/minimal-estate.json: sha256")

    def test_K2_a_changed_bundled_schema(self):
        path = self.kit / "schemas" / "catalogue-v3-bundled.json"
        path.write_text(path.read_text() + " ")
        self.assertRed("K2", "schemas/catalogue-v3-bundled.json: sha256")

    def test_K2_a_file_the_manifest_names_is_missing(self):
        (self.kit / "expected" / "bad-uuid.expected.json").unlink()
        self.assertRed("K2", "expected/bad-uuid.expected.json is in the manifest but not in the kit")

    def test_K3_a_VALID_fixture_the_reference_refuses(self):
        self.edit_json("estate/valid/dubai-estate.json", lambda d: d.update(unknownTopLevelField=True))
        self.rebuild()
        self.assertRed("K3", "estate/valid/dubai-estate.json is VALID but the reference validator refuses it")

    def test_K4_a_hand_written_INVALID_fixture(self):
        shutil.copy(self.kit / "estate" / "invalid" / "bad-uuid.json", self.kit / "estate" / "invalid" / "by-hand.json")
        self.assertRed("K4", "estate/invalid/by-hand.json is an INVALID fixture with no entry in mutations.json")

    def test_K4_an_edited_generated_fixture(self):
        self.edit_json("estate/invalid/bad-uuid.json", lambda d: d["estate"].update(id="also-not-a-uuid"))
        self.assertRed("K4", "estate/invalid/bad-uuid.json differs from a rebuild")

    def test_K5_a_mutation_that_breaks_two_rules(self):
        self.add_case({"id": "two-rules", "schemaMode": "estate", "base": "estate/valid/minimal-estate.json",
                       "op": {"op": "add", "path": "/Bad-Property", "value": True},
                       "rule": {"class": "closed-world", "keyword": "unevaluatedProperties", "instancePath": ""},
                       "description": "x"})
        self.rebuild()
        self.assertRed("K5", "two-rules: expected exactly one rejected rule, got 2")

    def test_K5_a_mutation_declaring_the_wrong_rule(self):
        self.edit_json("mutations.json", lambda d: d["cases"][0]["rule"].update(keyword="enum"))
        self.rebuild()
        self.assertRed("K5", "closed-world-root: declared enum at ''")

    def test_K5_a_mutation_declaring_the_wrong_path(self):
        self.edit_json("mutations.json", lambda d: d["cases"][0]["rule"].update(instancePath="/estate"))
        self.rebuild()
        self.assertRed("K5", "declared unevaluatedProperties at '/estate'")

    def test_K5_a_mutation_that_breaks_nothing(self):
        self.add_case({"id": "no-op", "schemaMode": "estate", "base": "estate/valid/minimal-estate.json",
                       "op": {"op": "replace", "path": "/estate/status", "value": "confirmed"},
                       "rule": {"class": "enum", "keyword": "enum", "instancePath": "/estate/status"},
                       "description": "x"})
        self.rebuild()
        self.assertRed("K5", "no-op: expected exactly one rejected rule, got 0")

    def test_K5_a_base_that_is_not_valid(self):
        self.edit_json("mutations.json", lambda d: d["cases"][0].update(base="estate/invalid/bad-uuid.json"))
        self.assertRed("K5", "is not a estate VALID fixture")

    def test_K6_a_required_class_with_no_case(self):
        self.edit_json("mutations.json",
                       lambda d: d.update(cases=[c for c in d["cases"] if c["rule"]["class"] != "x-inherit"]))
        self.rebuild()
        self.assertRed("K6", "no INVALID case in the class(es): x-inherit")

    def test_cannot_answer_is_exit_2_never_green(self):
        (self.kit / "mutations.json").unlink()
        r = run(self.root)
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertIn("CANNOT ANSWER", r.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
