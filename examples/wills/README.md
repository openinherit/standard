---
title: "INHERIT Example Wills Collection"
version: "1.0"
status: draft
date: 2026-04-16T12:00
lastmod: 2026-04-16T12:00
author: "Rich Davies"
source: "examples/wills/README.md"
---

# INHERIT Example Wills Collection

This folder contains a curated set of example wills used to develop, test, and demonstrate the INHERIT standard.

---

## Purpose

Each example will is a self-contained package: a story narrative, an INHERIT JSON fixture, and a source will PDF, all filed together per person. This structure serves three uses:

- **Live demos at conferences** — PDFs are uploaded to willscan.ai to demonstrate AI-assisted estate data extraction in real time.
- **Schema validation** — JSON fixtures validate against the v3 schema, confirming that the standard can represent each will's data completely and correctly.
- **Regression testing** — re-extracting a will from its PDF and comparing to the stored fixture confirms that no data is lost when the schema or extraction tooling changes.

These are demonstration documents only. They are not valid legal instruments.

---

## Naming Convention

Each person's folder contains exactly three file types:

| File type | Pattern | Notes |
|-----------|---------|-------|
| Story narrative | `{person}-story-v{NNNN}.md` | Narrative analysis with frontmatter; zero-padded four-digit version |
| Source will PDF | `{person}-source-will-{YYYY-MM-DD}.pdf` | Date is the will's legal execution date (ISO 8601) |
| INHERIT JSON fixture | `{person}-inherit-v{NNNN}.json` | INHERIT JSON fixture; zero-padded four-digit version, tracks schema and conversion changes |

Examples:

```
singapore/katrina-tan/katrina-tan-story-v0001.md
singapore/katrina-tan/katrina-tan-source-will-2024-03-15.pdf
singapore/katrina-tan/katrina-tan-inherit-v0001.json
```

---

## Versioning Exception

**This folder uses version numbers in filenames.** This is a documented exception to the project's general "no versions in filenames" convention.

The reasons for the exception are:

- **Source wills carry their legal execution date as an intrinsic property** — it is not a revision marker. The date in `{person}-source-will-{YYYY-MM-DD}.pdf` identifies which signed document this is, not which draft.
- **Story and JSON files can change multiple times per day** as the schema evolves — and multiple revisions may be worth comparing side by side during active development. Git tracks file-level history, but version numbers in filenames allow quick visual comparison without running `git log`.
- **Preventing confusion in multi-version workflows** — when exporting fixtures or uploading PDFs externally (e.g. to willscan.ai), having an explicit version suffix prevents overwriting or misidentifying an earlier fixture.

All version numbers are zero-padded to four digits (`v0001`, `v0002`) for correct lexicographic sorting.

---

## Filing Convention

Wills are filed by jurisdiction using clear, readable folder names rather than ISO codes:

```
examples/wills/
  england-wales/
  singapore/
  new-york/
  michigan/
  taiwan/
  philippines/
  australia/
  india/
  nigeria/
  islamic-succession/
```

**Each jurisdiction folder contains one subfolder per person.**

**Faith-based succession** folders (such as `islamic-succession/`) sit alongside jurisdiction folders as cross-jurisdictional categories. A will that primarily tests faraid rules goes in `islamic-succession/` rather than the geographic jurisdiction, because the interesting complexity is the religious succession framework, not the country.

For cross-border wills, file under the primary jurisdiction — the one that makes the will most interesting for testing purposes.

---

## The Collection

| Will | Path | Jurisdiction | Complexity | What it tests |
|------|------|-------------|------------|---------------|
| Katrina Tan Wei Lin | `singapore/katrina-tan/` | Singapore | Simple | Aunt-niece kinship, sibling bequests, CPF exclusion, Buddhist funeral wishes, jade bangle provenance, 30-day survivorship |
| Mark James Richardson | `england-wales/mark-richardson/` | England & Wales | Medium | Executor powers (Trustee Act 2000), statutory exclusion, precatory wishes, residuary split, charitable bequest with discharge, 28-day survivorship |
| Fatima binte Abdul Rahman | `islamic-succession/fatima-al-rashid/` | Singapore (AMLA) | Complex | Islamic faraid + wasiyyah one-third limit, Syariah Court, CPF sub-account nominations, HDB joint tenancy, non-Muslim beneficiary under faraid |
| Pierre Dubois | `england-wales/pierre-dubois/` | France + England | Complex | Cross-border forced heirship, lex situs, Brussels IV Regulation, dual wills strategy |
| Gloria Helmsley-Winters | `new-york/gloria-helmsley-winters/` | New York, USA | Complex | $8M pet trust, explicit disinheritance, massive charitable trust, judicial variation, conflicts of interest |
| Henry Burt III | `michigan/henry-burt-iii/` | Michigan, USA | Extreme | Multi-generational perpetuity trust, generation-skipping across 4 generations, trust duration modelling |
| Chen Wei | `taiwan/chen-wei/` | Taiwan + England | Complex | Agricultural property relief (APR), organic farming conditions, environmental compliance, cross-border agricultural estate |
| Maria Santos de la Cruz | `philippines/maria-santos/` | Philippines + USA | Complex | Forced heirship (legitime), US property, CRUT, generation-skipping trust, multiple jurisdictions with conflicting succession rules |
| Tommy & Sarah Bancroft | `australia/bancroft/` | Australia (NSW) | Complex | Mutual wills, blended family, Aboriginal land with customary succession, family provision claims, superannuation nominations |
| Dr. Ananya Sharma | `india/ananya-sharma/` | India (Hindu Succession Act) | Complex | HUF property, coparcenary rights post-2005, Parsi succession for mixed-faith, stridhan, multi-state Indian property |
| Chief George Okafor | `nigeria/george-okafor/` | Nigeria + England | Complex | Dual legal system (Igbo customary + English common law), eldest son custodial rights, parallelSuccessionConflicts |

---

## How to Use

### At a conference demo

Open the source will PDF in willscan.ai and run an extraction. The resulting INHERIT JSON should match the stored fixture. This demonstrates the full pipeline — legal document in, structured estate data out — without exposing any real client data.

### For schema testing

Validate any fixture against the v3 schema using the `jsonschema` CLI:

```bash
jsonschema validate v3/schema.json \
  examples/wills/<jurisdiction>/<person>/<name>-inherit-v0001.json \
  --resolve v3/
```

Run all fixtures at once to catch regressions after a schema change:

```bash
for f in examples/wills/**/*-inherit-*.json; do
  jsonschema validate v3/schema.json "$f" --resolve v3/ && echo "PASS: $f" || echo "FAIL: $f"
done
```

### For AI extraction benchmarking

Each source will PDF has a known-good fixture. To benchmark an extraction model or prompt:

1. Feed the PDF to the model and capture its output as JSON.
2. Compare the output to the stored fixture (field by field, not string comparison).
3. Track which fields were extracted correctly, incorrectly, or missed.

Fixtures are maintained at the most recent schema version. When the schema changes, fixtures are updated and the version suffix is incremented.

---

## Security Note

All names, addresses, and identifying details in this collection are entirely fictional. They have been constructed to exercise specific schema features and legal frameworks — not to represent real people.

Real wills, client documents, or any personally identifiable estate data must never be committed to any git repository. Store real wills outside any git repository, on your local machine only.
