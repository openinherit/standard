"""INHERIT document validation.

Validation results are informational. They verify schema conformance
and data structure, not legal accuracy or completeness. Do not rely
on validation results as the sole basis for legal or financial decisions.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, ValidationError
from referencing import Registry, Resource

SCHEMA_DIR = Path(__file__).parent / "schemas"
DISCLAIMER = (
    "Validation results are informational. They verify schema "
    "conformance and data structure, not legal accuracy or "
    "completeness. Do not rely on validation results as the "
    "sole basis for legal or financial decisions."
)

_SCHEMA_URI_ESTATE = "https://openinherit.org/v3/schema.json"
_SCHEMA_URI_CATALOGUE = "https://openinherit.org/v3/catalogue.json"

# Entity array names used to build the ID index
_ENTITY_ARRAYS = [
    "people",
    "organisations",
    "properties",
    "assets",
    "trusts",
    "bequests",
    "executors",
    "guardians",
    "wishes",
    "documents",
    "nonprobateTransfers",
    "proxyAuthorisations",
    "assetCollections",
    "valuations",
    "lifetimeTransfers",
    "kinships",
    "relationships",
    "liabilities",
    "spaces",
    "pets",
    "insurancePolicies",
    "notifications",
    "subscriptions",
    "acknowledgements",
    "events",
]

# Fields that look like IDs but are external references — skip these
_EXTERNAL_ID_FIELDS = {
    "wikidataId",
    "brandWikidataId",
    "listingId",
    "templateId",
    "platformListingId",
    "membershipId",
    "referenceId",
    "taxpayerIdentifier",
    "supersedesNominationId",
}


def _load_bundled_schema(name: str) -> dict[str, Any]:
    with open(SCHEMA_DIR / name) as f:
        return json.load(f)


def _detect_mode(document: dict[str, Any]) -> str:
    schema_uri = document.get("$schema", "")
    if schema_uri == _SCHEMA_URI_CATALOGUE:
        return "catalogue"
    return "estate"


def _build_validator(mode: str) -> Draft202012Validator:
    if mode == "catalogue":
        schema = _load_bundled_schema("catalogue-v3-bundled.json")
    else:
        schema = _load_bundled_schema("inherit-v3-bundled.json")

    registry = Registry()
    validator = Draft202012Validator(schema, registry=registry)
    return validator


def _build_id_index(document: dict[str, Any]) -> tuple[set[str], dict[str, set[str]]]:
    """Build an index of all entity IDs from the document.

    Returns:
        all_ids: set of every entity ID across all arrays
        per_type: dict mapping array name to set of IDs in that array
    """
    all_ids: set[str] = set()
    per_type: dict[str, set[str]] = {}

    for array_name in _ENTITY_ARRAYS:
        items = document.get(array_name, [])
        if not isinstance(items, list):
            continue
        ids: set[str] = set()
        for item in items:
            if isinstance(item, dict):
                item_id = item.get("id")
                if item_id and isinstance(item_id, str):
                    ids.add(item_id)
                    all_ids.add(item_id)
        per_type[array_name] = ids

    return all_ids, per_type


def _check_references(document: dict[str, Any]) -> list[dict[str, Any]]:
    """Check that all UUID cross-references resolve to actual entities.

    Returns a list of reference error dicts (each with path, message, level=2).
    """
    all_ids, per_type = _build_id_index(document)

    errors: list[dict[str, Any]] = []

    def _check_id(field_name: str, value: str, path: str) -> None:
        """Resolve a single ID reference and emit an error if unresolved."""
        if not isinstance(value, str) or field_name in _EXTERNAL_ID_FIELDS:
            return

        resolved = False

        if field_name == "testatorPersonId" or field_name.endswith("PersonId"):
            if value not in per_type.get("people", set()):
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any person.",
                    "level": 2,
                })
            return

        if field_name.endswith("OrganisationId"):
            if value not in per_type.get("organisations", set()):
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any organisation.",
                    "level": 2,
                })
            return

        if field_name == "propertyId" or field_name.endswith("propertyId"):
            if value not in per_type.get("properties", set()):
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any property.",
                    "level": 2,
                })
            return

        if field_name == "assetId":
            if value not in per_type.get("assets", set()):
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any asset.",
                    "level": 2,
                })
            return

        if field_name == "trustId" or field_name.endswith("TrustId"):
            if value not in per_type.get("trusts", set()):
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any trust.",
                    "level": 2,
                })
            return

        if field_name == "bequestId" or field_name.endswith("BequestId"):
            if value not in per_type.get("bequests", set()):
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any bequest.",
                    "level": 2,
                })
            return

        if field_name == "petId" or field_name.endswith("PetId"):
            if value not in per_type.get("pets", set()):
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any pet.",
                    "level": 2,
                })
            return

        if field_name == "valuationId" or field_name.endswith("ValuationId"):
            if value not in per_type.get("valuations", set()):
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any valuation.",
                    "level": 2,
                })
            return

        if field_name == "assetCollectionId" or field_name.endswith("AssetCollectionId"):
            if value not in per_type.get("assetCollections", set()):
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any asset collection.",
                    "level": 2,
                })
            return

        if field_name == "spaceId" or field_name.endswith("SpaceId"):
            if value not in per_type.get("spaces", set()):
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any space.",
                    "level": 2,
                })
            return

        if field_name == "entityId":
            if value not in all_ids:
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any entity.",
                    "level": 2,
                })
            return

        # Generic beneficiaryId — could be a person or organisation
        if field_name == "beneficiaryId":
            person_ids = per_type.get("people", set())
            org_ids = per_type.get("organisations", set())
            if value not in person_ids and value not in org_ids:
                errors.append({
                    "path": path,
                    "message": f"Reference '{value}' in '{field_name}' does not resolve to any person or organisation.",
                    "level": 2,
                })
            return

    def _check_array_ids(field_name: str, values: list, path: str) -> None:
        """Check each item in an array ID reference field."""
        if not isinstance(values, list):
            return

        if field_name.endswith("PersonIds"):
            person_ids = per_type.get("people", set())
            for i, v in enumerate(values):
                if isinstance(v, str) and v not in person_ids:
                    errors.append({
                        "path": f"{path}/{i}",
                        "message": f"Reference '{v}' in '{field_name}[{i}]' does not resolve to any person.",
                        "level": 2,
                    })
            return

        if field_name.endswith("OrganisationIds"):
            org_ids = per_type.get("organisations", set())
            for i, v in enumerate(values):
                if isinstance(v, str) and v not in org_ids:
                    errors.append({
                        "path": f"{path}/{i}",
                        "message": f"Reference '{v}' in '{field_name}[{i}]' does not resolve to any organisation.",
                        "level": 2,
                    })
            return

        if field_name.endswith("AssetIds") or field_name == "assetIds":
            asset_ids = per_type.get("assets", set())
            for i, v in enumerate(values):
                if isinstance(v, str) and v not in asset_ids:
                    errors.append({
                        "path": f"{path}/{i}",
                        "message": f"Reference '{v}' in '{field_name}[{i}]' does not resolve to any asset.",
                        "level": 2,
                    })
            return

    def _walk(obj: Any, path: str) -> None:
        """Recursively walk the document checking ID references."""
        if isinstance(obj, dict):
            for key, value in obj.items():
                child_path = f"{path}/{key}"
                if isinstance(value, str) and (
                    key.endswith("Id") or key == "testatorPersonId"
                ) and key not in _EXTERNAL_ID_FIELDS:
                    _check_id(key, value, child_path)
                elif isinstance(value, list) and (
                    key.endswith("Ids") or key.endswith("PersonIds") or key.endswith("OrganisationIds")
                ) and key not in _EXTERNAL_ID_FIELDS:
                    _check_array_ids(key, value, child_path)
                else:
                    _walk(value, child_path)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                _walk(item, f"{path}/{i}")

    _walk(document, "")
    return errors


def validate(
    document: dict[str, Any] | str | bytes,
    *,
    mode: str | None = None,
    level: int = 1,
) -> dict[str, Any]:
    """Validate an INHERIT document against the schema.

    Args:
        document: The document to validate (dict, JSON string, or bytes).
        mode: Force "estate" or "catalogue" mode. If None, auto-detected
              from the document's $schema field.
        level: Validation level. 1 = schema only (default). 2 = schema +
               referential integrity (UUID cross-references must resolve).

    Returns:
        Dict with: valid (bool), schemaMode (str), errors (list),
        conformanceLevel (int), disclaimer (str).

        conformanceLevel values:
          0 = failed schema validation (Level 1)
          1 = passed schema validation
          2 = passed schema + referential integrity
    """
    if isinstance(document, (str, bytes)):
        document = json.loads(document)

    if mode is None:
        mode = _detect_mode(document)

    validator = _build_validator(mode)

    errors = []
    for error in sorted(validator.iter_errors(document), key=lambda e: list(e.path)):
        errors.append({
            "path": "/" + "/".join(str(p) for p in error.absolute_path) if error.absolute_path else "/",
            "message": error.message,
        })

    # Level 1 failed — stop here
    if errors:
        return {
            "valid": False,
            "schemaMode": mode,
            "errors": errors,
            "conformanceLevel": 0,
            "disclaimer": DISCLAIMER,
        }

    # Level 1 passed
    if level < 2:
        return {
            "valid": True,
            "schemaMode": mode,
            "errors": [],
            "conformanceLevel": 1,
            "disclaimer": DISCLAIMER,
        }

    # Level 2: check referential integrity
    ref_errors = _check_references(document)
    if ref_errors:
        return {
            "valid": False,
            "schemaMode": mode,
            "errors": ref_errors,
            "conformanceLevel": 1,
            "disclaimer": DISCLAIMER,
        }

    return {
        "valid": True,
        "schemaMode": mode,
        "errors": [],
        "conformanceLevel": 2,
        "disclaimer": DISCLAIMER,
    }
