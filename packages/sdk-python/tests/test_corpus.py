"""Run the generated pydantic models against the JSON Schema test corpus.

Same contract as scripts/test-runtime-validators.mjs, reading the same
register (scripts/runtime-validator-divergences.json): the set of corpus
cases on which the generated models disagree with the JSON Schema verdict
must EQUAL the registered set. A new disagreement fails; so does a
registered one that no longer reproduces. The register can only shrink.

Documents are validated the way a caller receiving JSON should validate
them: validate_json(raw, strict=True). Strict mode stops pydantic
coercing "1" into 1 or 1 into True, which JSON Schema never does; JSON mode
still lets a date or UUID arrive as a string, which is the only way JSON can
carry one.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import TypeAdapter, ValidationError

ROOT = Path(__file__).resolve().parents[3]
REGISTER = ROOT / "scripts" / "runtime-validator-divergences.json"


def load_corpus() -> list[dict]:
    """Key cases exactly as scripts/lib/runtime-validator-corpus.mjs does."""
    files = []
    for path in sorted((ROOT / "tests" / "v3").rglob("*.test.json")):
        doc = json.loads(path.read_text())
        target_abs = (path.parent / doc["target"]).resolve()
        rel = path.relative_to(ROOT).as_posix()
        seen: dict[str, int] = {}
        cases = []
        for t in doc["tests"]:
            n = seen.get(t["description"], 0) + 1
            seen[t["description"]] = n
            key = f"{rel}::{t['description']}" + (f" [#{n}]" if n > 1 else "")
            cases.append({"key": key, "valid": t["valid"], "data": t["data"]})
        files.append({
            "target": target_abs.relative_to(ROOT).as_posix(),
            "id": json.loads(target_abs.read_text()).get("$id"),
            "cases": cases,
        })
    return files


def accepts(model, data) -> bool:
    # TypeAdapter, not model.model_validate_json: a few v3 schemas are a bare
    # enum or a root type, and generate as an Enum rather than a BaseModel.
    try:
        TypeAdapter(model).validate_json(json.dumps(data), strict=True)
        return True
    except ValidationError:
        return False


def observe() -> tuple[dict[str, list[str]], list[str]]:
    from openinherit.models_by_id import MODELS_BY_ID

    register = json.loads(REGISTER.read_text())
    excluded = {e["target"] for e in register["excluded_targets"]}
    observed: dict[str, list[str]] = {"false_reject": [], "false_accept": []}
    unanswerable = []
    for f in load_corpus():
        if f["target"] in excluded:
            continue
        model = MODELS_BY_ID.get(f["id"])
        if model is None:
            unanswerable.append(f"{f['target']} ($id {f['id']})")
            continue
        for c in f["cases"]:
            ok = accepts(model, c["data"])
            if c["valid"] and not ok:
                observed["false_reject"].append(c["key"])
            if not c["valid"] and ok:
                observed["false_accept"].append(c["key"])
    return observed, unanswerable


def test_corpus_matches_register_exactly():
    register = json.loads(REGISTER.read_text())
    observed, unanswerable = observe()
    assert not unanswerable, f"CANNOT ANSWER — no generated model for: {unanswerable}"
    lines = []
    for kind in ("false_reject", "false_accept"):
        entries = register["pydantic"][kind]
        if kind == "false_reject":
            assert all(e.get("reason", "").strip() for e in entries), "every false_reject needs a reason"
        want = {e["case"] for e in entries}
        got = set(observed[kind])
        lines += [f"REGRESSION pydantic.{kind}: {k}" for k in sorted(got - want)]
        lines += [f"RATCHET pydantic.{kind}: no longer reproduces — remove it: {k}" for k in sorted(want - got)]
    assert not lines, "\n" + "\n".join(lines)


def _fixture(name: str):
    return json.loads((ROOT / "examples" / "fixtures" / name).read_text())


def test_exclusions_are_only_for_targets_without_a_model():
    """An exclusion switches the gate off for a whole target, so it must have a
    reason, name a target the corpus has, and name one with no generated model."""
    from openinherit.models_by_id import MODELS_BY_ID

    register = json.loads(REGISTER.read_text())
    by_target = {f["target"]: f for f in load_corpus()}
    bad = []
    for e in register["excluded_targets"]:
        if not e.get("reason", "").strip():
            bad.append(f"{e['target']}: no reason")
        f = by_target.get(e["target"])
        if f is None:
            bad.append(f"{e['target']}: no corpus file targets it")
        elif f["id"] in MODELS_BY_ID:
            bad.append(f"{e['target']}: has a generated model, so it cannot be excluded")
    assert not bad, bad


def test_catalogue_only_fixture_is_accepted():
    """The repo publishes this file as a correct catalogue; validate() agrees."""
    from openinherit import validate
    from openinherit.models import Catalogue

    doc = _fixture("catalogue-only.json")
    assert validate(doc)["valid"] is True
    Catalogue.model_validate_json(json.dumps(doc), strict=True)


def test_offsite_space_needs_no_property_id():
    """v3/space.json requires propertyId only for spaces inside a property."""
    from openinherit.models import Space

    Space.model_validate_json(json.dumps({
        "id": "7bc58028-1216-4931-a40c-9d81935087aa",
        "spaceType": "safe_deposit_box",
    }), strict=True)


if __name__ == "__main__":  # print the observed set, to review a register change
    print(json.dumps(observe()[0], indent=2))
    pytest.main([__file__])
