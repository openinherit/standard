<!-- SPDX-FileCopyrightText: 2026 Testate Technologies Ltd -->
<!-- SPDX-License-Identifier: Apache-2.0 -->
# SSSOM alignment mapping-sets

Per-primitive **SSSOM** (Simple Standard for Sharing Ontological Mappings) mapping-sets that
bridge the INHERIT v2 canonical primitives and classifier-scheme values to external legal
substrate, statutes, standards, and reference ontologies (BFO / PROV-O).

Authored under **TT-367** (P10-1) by harvesting the frozen spike TSVs on `docs-strategy`
`origin/main` (`docs/superpowers/specs/**/spike-references/**`) — see each file's
`mapping_set_id` and the `source:` field in `manifest.yaml` for provenance. Validated by the
`sssom-py-validate` gate (**G-05**), un-orphaned here (P10-10).

## Files

| File                                         | Contents                                                            |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `<module>-<primitive>-mapping-set.sssom.tsv` | One mapping-set per canonical primitive / cross-module primitive.   |
| `manifest.yaml`                              | Row-count manifest — the machine-checked source of expected counts. |

## Authoring conventions (uniform across every set)

- **Namespace** — all internal INHERIT terms use the flat `inherit:` prefix
  (`https://openinherit.org/schemas/`, TT-751 / A-328). Source module prefixes
  (`inherit_assets:`, `inherit_core:`, `inherit_transfer:`, …) are collapsed to `inherit:`.
- **Columns** — exactly the canonical 7, in order: `subject_id`, `subject_label`,
  `predicate_id`, `object_id`, `object_label`, `mapping_justification`, `confidence`, with an
  optional 8th `comment` column and nothing else.
- **Predicates** — **exactly the five SKOS mapping properties**: `skos:exactMatch`,
  `skos:closeMatch`, `skos:broadMatch`, `skos:narrowMatch`, `skos:relatedMatch`. No
  `owl:equivalentClass`, `rdfs:subClassOf`, `rdfs:seeAlso`, or `dcat:` / `dcterms:` / `prov:`
  predicates (those are Layer-2 catalog material — deferred, see below).
- **Metadata** (commented YAML header): self-contained `curie_map` (every used prefix
  declared); `mapping_set_id`; `mapping_set_version: '1.0'`; `mapping_set_title` +
  `mapping_set_description` (harvested verbatim); `license:`
  `https://creativecommons.org/publicdomain/zero/1.0/` (**CC0**, all sets);
  `creator_id: https://openinherit.org` (organisation IRI, all sets — never a fabricated
  ORCID).
- **`mapping_justification`** — a `semapv:` term (`semapv:ManualMappingCuration` for most
  rows; `semapv:LiteralBasedMatching` where the spike author used it).
- **`confidence`** — numeric in `(0, 1]`. Authoring bands: `exactMatch` ≥ 0.90;
  `closeMatch` 0.80–0.90; `broad`/`narrow`/`relatedMatch` 0.70–0.85 (guidance; the gate
  enforces only presence + numeric + `(0, 1]`).

## The gate — `make sssom-validate` (G-05)

`scripts/validate_sssom.py` runs seven ERROR-tier checks over every file here: sssom-py
strict parse · column-shape · predicate allow-list · curie_map completeness · confidence ·
subject-existence · row-count manifest. Local (`make sssom-validate`) and CI
(`.github/workflows/sssom-validate.yml`) run the identical command (hook == CI parity).
Requires `pip install sssom pyyaml` (kept isolated from the pinned LinkML lock).

**Subject-existence** resolves every `inherit:` subject against the **live LinkML schema**
term universe — classes, enums, slots (top-level + attributes + `slot_usage`), and enum
permissible-values, with dotted `Head.value` grounding — **not** against
`generated/primitive-registry.json`. The generated registry intentionally holds only
CamelCase class/enum/catala names and zero permissible-values, so classifier-value subjects
(e.g. `inherit:assent`) resolve 0/N against it; resolving against the schema is the sound
reading of the gate description and only _reads_ the schema (the LinkML class universe is
untouched).

## OWL-DL safety — standing rule

These mapping-sets are **TSV data only**. Nothing here materialises OWL / `.ttl`, so the
ROBOT `validate-profile` DL gate never sees a mapping row and DL-conformance (TT-750's
140 → 0) cannot regress.

**If these mappings are ever materialised to OWL**, SKOS mapping properties asserted between
**classes** MUST be emitted as **annotation assertions only**: `skos:exactMatch` (and the
other four) are `owl:ObjectProperty`, so asserting them directly between classes _puns_ those
classes and re-breaks OWL 2 DL conformance. Any such materialisation must be a separate
artifact with its own ROBOT `validate-profile` run.

## Deferred — Layer-2 catalog

The Layer-2 external-ontology catalog `inherit.sssom.tsv` (A-131), the 23 SKOS-scheme
alignments (A-23.3), and the Role rows (A-20.2) are a **separate** deliverable (its inputs —
the 23 schemes and the IRI lock — do not yet exist) tracked as its own follow-up issue. The
four non-SKOS relationship rows dropped from the cryptocurrency spike (`dcat:` / `dcterms:` /
`prov:`) belong to that Layer-2 catalog, not to a per-primitive SKOS set (see
`manifest.yaml` note).
