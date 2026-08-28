# Platform Integrations

How real-world estate planning, probate, and wealth management platforms map to INHERIT schemas. Each guide includes field-level mappings, authentication details, and code examples where the platform's API is publicly documented.

## Full Guides

These platforms have public, documented APIs. The guides include field-level mapping, authentication, and TypeScript code examples.

| Platform | Region | Category | Guide |
|----------|--------|----------|-------|
| [Wealth.com](wealth-com/) | US | Wealth management / estate planning | REST API, SFTP bulk format, webhook events, Ester AI output mapping |
| [Clio](clio/) | US/CA/UK/AU | Legal practice management | Contacts, Matters, 13 Wills & Estates Custom Field Sets, rate limits |
| [Actionstep](actionstep/) | NZ/AU/US/UK | Legal practice management | Actions, Participants, Data Collections, estate planning and probate workflow templates |
| [Addepar](addepar/) | US/Global | Wealth management | Entity hierarchy, position/ownership percentages, 300+ attribute mapping |

## Partial Guides

These platforms have limited or undocumented APIs. The guides cover conceptual mapping and partnership pathways.

| Platform | Region | Category | Guide |
|----------|--------|----------|-------|
| [Estateably](estateably/) | CA/US | Probate administration | Probate entity mapping, Clio intermediary integration, court form data model |
| [Settld](settld/) | UK | Death notification | Proposed Bereavement API data format, death verification mapping |
| [LegalZoom](legalzoom/) | US | Online will-writing | Embedded Legal Services Flow concept, questionnaire field mapping |

## Planned

These platforms are on our roadmap for future integration guides. Community contributions are welcome.

| Platform | Region | Category | Why |
|----------|--------|----------|-----|
| **LEAP Legal Software** | AU/UK/US/IE | Legal practice management | 100,000+ users globally, strong in AU and UK markets, probate-specific features |
| **PracticePanther** | US | Legal practice management | Growing mid-market platform with estate planning support |
| **Rocket Lawyer** | US/UK/EU | Online will-writing | 30M+ customers, REST APIs available |

## Writing a New Integration Guide

If you'd like to contribute a guide for a platform not listed here:

1. Create a folder under `docs/integrations/{platform-name}/`
2. Add a `README.md` following the structure of the existing guides
3. Include field-level mappings between the platform's API entities and INHERIT schemas
4. Submit a PR — we'll review and merge

See the [Clio guide](clio/) for a good example of a full integration guide.
