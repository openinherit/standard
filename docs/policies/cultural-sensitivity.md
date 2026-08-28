---
title: Cultural Sensitivity Statement
---

# Cultural Sensitivity Statement

INHERIT models **legal systems**, not religious beliefs.

---

## Why This Document Exists

INHERIT includes extension schemas for succession law traditions rooted in Islamic, Jewish, and Hindu legal frameworks. These are among the world's oldest and most sophisticated systems of inheritance law, each with centuries of jurisprudence. Modeling them accurately is essential for a standard that serves families across legal traditions.

We recognize that:

- Succession law is deeply personal. It intersects with family, faith, culture, and identity.
- Terminology matters. A misspelled transliteration or a term used out of context can signal carelessness or disrespect.
- Legal traditions are not monolithic. Islamic inheritance varies by school of jurisprudence. Jewish inheritance varies by denomination. Hindu succession varies by personal law and state legislation.
- We are technologists building a data standard, not scholars of religious law. We depend on expert review to get this right.

---

## Our Approach

### 1. Extensions reference legal traditions, not personal faith

The extension directories are named after the legal systems they model:

| Extension | Models | Not |
|-----------|--------|-----|
| `islamic-succession` | Faraid (Islamic inheritance law) as codified in national legislation | Personal religious practice |
| `jewish-succession` | Halachic inheritance principles as they interact with civil law | Personal religious observance |
| `hindu-succession` | The Hindu Succession Act 1956 (as amended 2005) and related statutes | Personal religious belief |

A person's data may be processed through the `islamic-succession` extension because they live in a jurisdiction where Sharia-based inheritance applies by default — not because of any assumption about their personal beliefs.

### 2. Legal diversity is modeled, not flattened

Islamic inheritance law varies significantly by school of jurisprudence (madhab). The `islamic-succession` extension includes a `school` field to capture this:

- **Hanafi** — followed in Turkey, South Asia, Central Asia, parts of the Middle East
- **Maliki** — followed in North and West Africa, parts of the Gulf
- **Shafii** — followed in Southeast Asia, East Africa, parts of the Middle East
- **Hanbali** — followed in Saudi Arabia, Qatar, parts of the Gulf
- **Jafari** — followed by Shia communities, codified in Iran, Iraq, Lebanon, Bahrain
- **Ibadi** — followed in Oman, parts of North and East Africa
- **Zahiri** — literalist school, historically influential, small contemporary following

The Jewish extension includes a `denomination` field (Orthodox, Conservative, Reform, Reconstructionist, Traditional, Unaffiliated) because these denominations differ on the interaction between halachic and civil inheritance.

The Hindu extension includes an `applicableLaw` field and `school` field because the Hindu Succession Act, the Indian Succession Act, and customary rules produce different outcomes.

INHERIT does not take a position on which interpretation is correct. It provides the fields to record which interpretation applies to a specific estate.

### 3. Transliteration follows established standards

Non-English terms in the schemas follow these conventions:

| Language | Convention | Examples |
|----------|-----------|----------|
| Arabic | Library of Congress ALA-LC romanization, cross-referenced with terms established in UK and UAE case law | `wasiyya`, `faraid`, `awl`, `radd`, `waqf`, `iddah` |
| Hebrew | Standard academic transliteration, consistent with Israeli legal English usage | `halacha`, `mezunot`, `bekhor`, `kinyan` |
| Sanskrit/Hindi | Spelling as established in Indian statute law (Hindu Succession Act, Indian Succession Act) | `stridhan`, `coparcenary`, `sapinda` |
| Japanese | Modified Hepburn romanization | `iryubun`, `koseki` |

Every non-English term in the schema has a `$comment` or `description` explaining its meaning in plain English. This serves both developers who are unfamiliar with the term and reviewers checking accuracy.

### 4. Examples use diverse names respectfully

Schema examples and test fixtures use names that reflect the cultural context of each jurisdiction:

- Names are plausible and respectful — never stereotypical or comedic
- Names reflect the naming conventions of the jurisdiction (e.g. Japanese family-name-first ordering, patronymic systems)
- Religious honorifics and titles are used correctly where applicable
- Examples do not assume family structures — extended families, blended families, and single-person estates are all represented

### 5. Expert review is ongoing

The extension schemas have been drafted based on:

- Primary legislation (national succession statutes)
- Published academic commentary on religious inheritance law
- Consultation with estate planning practitioners in relevant jurisdictions

We are actively seeking formal review from:

- Islamic finance and succession law practitioners
- Rabbinical authorities or Jewish estate planning specialists
- Hindu personal law practitioners in India

If you have expertise in any of these areas and would like to review the relevant extension schema, please open an issue on GitHub or contact the steering committee. We welcome corrections and will credit reviewers.

---

## Reporting Concerns

If you believe any aspect of INHERIT's schemas, documentation, examples, or terminology is:

- **Incorrect** — a term is wrong, a legal concept is misrepresented, or a transliteration is non-standard
- **Offensive** — a field name, example, or description could reasonably cause offense
- **Incomplete** — an important concept is missing or a legal tradition is oversimplified

Please report it:

- **GitHub issue:** [github.com/openinherit/standard/issues](https://github.com/openinherit/standard/issues) — use the label `cultural-sensitivity`
- **Private contact:** If the concern is sensitive, email the steering committee directly (address on openinherit.org)

All reports are treated seriously and addressed promptly. Getting this right matters more than shipping quickly.

---

## Acknowledgments

INHERIT's approach to cultural sensitivity is informed by:

- The HL7 FHIR standard's handling of jurisdiction-specific healthcare concepts across 70+ countries
- The Unicode Consortium's work on culturally respectful text processing
- The W3C Internationalization Working Group's guidance on names and cultural conventions
- Feedback from the INHERIT Steering Committee

---

*This document is maintained alongside the INHERIT specification. Last reviewed: March 2026.*
