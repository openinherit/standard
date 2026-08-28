# Addepar Integration Guide

> **INHERIT v4** | Public document | Last updated: 2026-04-04

How to map Addepar's wealth management API to INHERIT schemas for estate planning data interchange.

---

## 1. Overview

[Addepar](https://addepar.com) is a wealth management technology platform managing over **$9 trillion AUM** across 1,000+ RIAs, private banks, and family offices. Its core strength is an **ownership graph** — a hierarchical model that tracks who owns what, through which structures, and at what percentage.

Addepar's REST API (documented at [developers.addepar.com](https://developers.addepar.com)) exposes:

- **Entities** — clients, households, legal entities, accounts, and investments
- **Positions** — the ownership graph, with percentage-based ownership at every level
- **Attributes** — 300+ data fields across entity types
- **Files** — document attachments

This guide maps Addepar's entity hierarchy and position model to INHERIT v4 schemas, enabling wealth managers to export structured estate data in INHERIT format.

---

## 2. Entity Hierarchy Mapping

Addepar's entity hierarchy follows a top-down ownership model:

```
Household
  └── Client (natural person)
        └── Legal Entity (trust, LLC, foundation)
              └── Account (brokerage, bank, custody)
                    └── Investment (individual security/holding)
```

### 2.1 Household → Family Group

Addepar **Households** group related clients (typically a married couple and dependants) for consolidated reporting.

INHERIT does not have a dedicated "household" schema. Map households using the **estate document** itself — an INHERIT document naturally groups all people, trusts, and assets related to an estate. For multi-generational family offices, each household maps to a separate INHERIT document, or use the `companionEstateId` field to link spouse estates.

| Addepar Field | INHERIT Mapping | Notes |
|---------------|-----------------|-------|
| `household.id` | Document-level reference | Store as external identifier |
| `household.name` | Document metadata | e.g. "The Davies Family" |
| `household.members[]` | `persons[]` array | Each member becomes a Person entity |

### 2.2 Client → person.json

Addepar **Clients** are natural persons — the beneficial owners of wealth.

| Addepar Field | INHERIT Field | Schema |
|---------------|---------------|--------|
| `client.id` | `person.identifiers[].value` (system: `urn:addepar:client`) | `person.json` |
| `client.name` | `person.givenName` + `person.familyName` | `person.json` |
| `client.date_of_birth` | `person.dateOfBirth` | `person.json` |
| `client.date_of_death` | `person.dateOfDeath` | `person.json` |
| `client.email` | `person.contact.email` | `person.json` |
| `client.phone` | `person.contact.phone` | `person.json` |
| `client.address` | `person.contact.address` | `person.json` |
| `client.tax_id` | `person.taxResidency[].taxpayerIdentifier` | `person.json` |
| `client.citizenship` | `person.domicile` | `person.json` — note: domicile and citizenship differ legally |
| `client.roles` | `person.roles[]` | Map: "beneficiary" → `beneficiary`, "trustee" → `trustee` |

**Name parsing note:** Addepar stores names as a single string in many configurations. Use the Attributes API to fetch structured name components where available. If only a single name string is available, apply heuristic splitting and set `person.provenance.method` to `"automated"` with appropriate confidence.

### 2.3 Legal Entity → trust.json / organisation.json

Addepar **Legal Entities** represent trusts, LLCs, family limited partnerships, private foundations, and other structures.

**Routing logic:**

| Addepar `legal_entity.type` | INHERIT Schema | Notes |
|------------------------------|----------------|-------|
| `trust`, `revocable_trust`, `irrevocable_trust` | `trust.json` | Map trust type to `trustType` enum |
| `llc`, `corporation`, `partnership` | `organisation.json` | Set `organisationType` to relevant value |
| `foundation` | `organisation.json` | Set `organisationType` to `"charity"` if charitable, else `"other"` |
| [TBC] Other entity types | Case-by-case | Addepar supports custom entity types |

**Trust mapping:**

| Addepar Field | INHERIT Field | Schema |
|---------------|---------------|--------|
| `legal_entity.id` | Store as external identifier | `trust.json` |
| `legal_entity.name` | `trust.name` | `trust.json` |
| `legal_entity.type` = `revocable_trust` | `trust.trustType` = `"discretionary"` + `trust.revocability` = `"revocable"` | `trust.json` |
| `legal_entity.type` = `irrevocable_trust` | `trust.trustType` = [determine from attributes] + `trust.revocability` = `"irrevocable"` | `trust.json` |
| `legal_entity.inception_date` | `trust.createdAt` | `trust.json` |
| `legal_entity.governing_jurisdiction` | `trust.governingLaw` | `trust.json` |
| Ownership positions (settlor) | `trust.settlor` → Person.id | `trust.json` |
| Ownership positions (beneficiaries) | `trust.beneficiaries[]` | `trust.json` |
| Ownership positions (trustees) | `trust.trustees[]` | `trust.json` |

**Organisation mapping:**

| Addepar Field | INHERIT Field | Schema |
|---------------|---------------|--------|
| `legal_entity.id` | Store as external identifier | `organisation.json` |
| `legal_entity.name` | `organisation.name` | `organisation.json` |
| `legal_entity.type` = `llc` | `organisation.organisationType` = `"other"` | `organisation.json` |
| `legal_entity.tax_id` (EIN) | `organisation.registrations[].number` | `organisation.json` |
| `legal_entity.jurisdiction` | `organisation.jurisdiction` | `organisation.json` |

### 2.4 Account → asset.json (financial category)

Addepar **Accounts** are financial containers — brokerage accounts, bank accounts, custody accounts, retirement accounts.

| Addepar Field | INHERIT Field | Schema |
|---------------|---------------|--------|
| `account.id` | `asset.identifiers[].value` (system: `urn:addepar:account`) | `asset.json` — [TBC] identifiers not yet on asset.json |
| `account.name` | `asset.name` | `asset.json` |
| `account.type` | `asset.category` = `"financial"` + `asset.subcategory` | `asset.json` |
| `account.custodian` | `asset.notes` or linked `organisation.json` | `asset.json` |
| `account.account_number` | `asset.notes` (sensitive — handle with care) | `asset.json` |
| `account.inception_date` | [TBC] No direct mapping | `asset.json` |

**Subcategory mapping:**

| Addepar Account Type | INHERIT `subcategory` |
|----------------------|-----------------------|
| Brokerage | `"investment_account"` |
| IRA / 401(k) / Roth | `"pension"` |
| Bank account | `"bank_account"` |
| Custody | `"investment_account"` |
| [TBC] Others | Map on a case-by-case basis |

### 2.5 Investment → asset.json (specific holding)

Addepar **Investments** are individual securities or holdings within an account.

| Addepar Field | INHERIT Field | Schema |
|---------------|---------------|--------|
| `investment.id` | Store as external identifier | `asset.json` |
| `investment.ticker` | `asset.name` (include ticker) | `asset.json` |
| `investment.asset_class` | `asset.category` = `"financial"` + `asset.subcategory` | `asset.json` |
| `investment.quantity` | `asset.notes` | `asset.json` |
| `investment.market_value` | `asset.estimatedValue` | `asset.json` |
| `investment.cost_basis` | `asset.notes` | `asset.json` |
| `investment.currency` | `asset.estimatedValue.currency` | `common/money.json` |

---

## 3. Position Mapping — Ownership Percentages

Addepar's **Position** model is its most powerful feature for estate planning. Positions express the ownership graph:

```
Client (person) ──[owns 50%]──► Trust ──[holds 100%]──► Account ──[contains]──► Investment
```

### 3.1 Positions to Beneficiary Shares

Addepar ownership percentages map to INHERIT beneficiary structures:

```typescript
// Addepar position: Client owns 33.33% of a trust
const addepar_position = {
  owner_id: "client-123",
  owned_id: "trust-456",
  ownership_percentage: 33.33
};

// INHERIT mapping
const trust_beneficiary: TrustBeneficiary = {
  personId: "f47ac10b-...",  // mapped from client-123
  interestType: "both",      // or "income"/"capital" if known
  // Note: INHERIT trust beneficiaries do not currently have a
  // percentage field — this is a known gap. Store the percentage
  // in notes or use x-inherit-addepar extension.
};
```

### 3.2 Ownership Percentage Gap

INHERIT's `trust.json` beneficiary model uses `interestType` (income/capital/both/discretionary) but does **not** currently carry a numeric ownership percentage. Addepar's positions are percentage-based.

**Recommended approaches:**

1. **Extension field:** Use `x-inherit-addepar` on the trust or person to store the percentage:
   ```json
   {
     "x-inherit-addepar": {
       "ownershipPercentage": 33.33,
       "positionId": "pos-789"
     }
   }
   ```

2. **Notes field:** Record the percentage in `trust.notes` as human-readable text.

3. **Proposal:** A future INHERIT version may add `share` or `percentage` to `TrustBeneficiary`. [TBC]

---

## 4. Attribute Mapping

Addepar exposes **300+ attributes** across entity types. Most are custom-configured per firm. The Attributes API (`GET /v1/attributes`) returns the attribute catalogue for a given firm.

### 4.1 Common Attributes to INHERIT Fields

| Addepar Attribute | INHERIT Field | Notes |
|-------------------|---------------|-------|
| `first_name` | `person.givenName` | |
| `last_name` | `person.familyName` | |
| `middle_name` | `person.additionalName` | |
| `date_of_birth` | `person.dateOfBirth` | |
| `date_of_death` | `person.dateOfDeath` | |
| `ssn` / `tax_id` | `person.taxResidency[].taxpayerIdentifier` | Sensitive — PII handling required |
| `citizenship` | `person.domicile` | Caveat: citizenship ≠ domicile |
| `email` | `person.contact.email` | |
| `phone` | `person.contact.phone` | |
| `trust_type` | `trust.trustType` | Map to INHERIT enum values |
| `trust_date` | `trust.createdAt` | |
| `jurisdiction` | `trust.governingLaw` or `organisation.jurisdiction` | |
| `entity_type` | Routing field — determines target schema | |
| `market_value` | `asset.estimatedValue` | Convert to minor units |
| `cost_basis` | `asset.notes` | No dedicated INHERIT field |
| `asset_class` | `asset.subcategory` | |
| `account_type` | `asset.subcategory` | |
| `custodian_name` | Linked `organisation.json` | |
| [TBC] Custom attributes | `x-inherit-addepar` extension | Firm-specific |

### 4.2 Currency and Money Conversion

Addepar stores monetary values as decimal numbers with a currency code. INHERIT uses **integer minor units** (pennies/cents).

```typescript
function addepar_to_inherit_money(
  value: number,
  currency: string
): { amount: number; currency: string } {
  // Addepar: 1234.56 USD
  // INHERIT: { amount: 123456, currency: "USD" }
  const minor_units = Math.round(value * 100);
  return { amount: minor_units, currency: currency.toUpperCase() };
}
```

**Warning:** Not all currencies use 2 decimal places. JPY uses 0, KWD uses 3. Use a currency-aware conversion library in production.

---

## 5. Valuation Data

Addepar positions include market values that map to INHERIT's `valuation.json`.

### 5.1 Position Values to Valuations

| Addepar Field | INHERIT Field | Schema |
|---------------|---------------|--------|
| `position.market_value` | `valuation.valuedAmount` | `valuation.json` |
| `position.as_of_date` | `valuation.valuationDate` | `valuation.json` |
| — | `valuation.entityType` = `"asset"` | `valuation.json` |
| — | `valuation.entityId` → mapped Asset.id | `valuation.json` |
| — | `valuation.providerType` = `"other"` | `valuation.json` |
| — | `valuation.provider` = `"Addepar"` | `valuation.json` |
| — | `valuation.method` = `"market_listing"` | `valuation.json` |
| — | `valuation.valuationPurpose` = `"current_estimate"` | `valuation.json` |
| — | `valuation.confidence` = `"medium"` | `valuation.json` |

### 5.2 Date-of-Death Valuations

For estate administration, request positions as at the date of death:

```
GET /v1/positions?as_of_date=2026-01-15&entity_id=household-123
```

Set `valuation.valuationPurpose` to `"date_of_death"` for these valuations.

---

## 6. Code Examples

### 6.1 Fetching Entities and Building an INHERIT Document

```typescript
import { v4 as uuid } from "uuid";

interface AddeparEntity {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
}

interface InheritPerson {
  id: string;
  givenName: string;
  familyName?: string;
  roles: string[];
  dateOfBirth?: string;
  contact?: {
    email?: string;
    phone?: string;
  };
  identifiers?: Array<{
    system: string;
    value: string;
    type: string;
  }>;
}

/**
 * Convert an Addepar client entity to an INHERIT Person.
 */
function mapClientToPerson(client: AddeparEntity): InheritPerson {
  const attrs = client.attributes;

  return {
    id: uuid(),
    givenName: String(attrs.first_name ?? ""),
    familyName: attrs.last_name ? String(attrs.last_name) : undefined,
    roles: ["beneficiary"], // refine from positions
    dateOfBirth: attrs.date_of_birth
      ? String(attrs.date_of_birth)
      : undefined,
    contact: {
      email: attrs.email ? String(attrs.email) : undefined,
      phone: attrs.phone ? String(attrs.phone) : undefined,
    },
    identifiers: [
      {
        system: "urn:addepar:client",
        value: client.id,
        type: "platform_id",
      },
    ],
  };
}
```

### 6.2 Fetching Positions with Rate-Limit Handling

```typescript
interface AddeparPosition {
  owner_id: string;
  owned_id: string;
  ownership_percentage: number;
  market_value: number;
  currency: string;
  as_of_date: string;
}

class AddeparClient {
  private base_url: string;
  private auth_header: string;
  private request_count = 0;
  private window_start = Date.now();

  constructor(firm_id: string, api_key: string, api_secret: string) {
    this.base_url = `https://api.addepar.com/v1/firms/${firm_id}`;
    this.auth_header =
      "Basic " + Buffer.from(`${api_key}:${api_secret}`).toString("base64");
  }

  /**
   * Rate-limit-aware fetch. Addepar allows 50 requests per 15 minutes.
   * Backs off automatically when approaching the limit.
   */
  private async rate_limited_fetch(path: string): Promise<unknown> {
    const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
    const MAX_REQUESTS = 50;
    const SAFETY_MARGIN = 5; // leave headroom

    const elapsed = Date.now() - this.window_start;
    if (elapsed > WINDOW_MS) {
      this.request_count = 0;
      this.window_start = Date.now();
    }

    if (this.request_count >= MAX_REQUESTS - SAFETY_MARGIN) {
      const wait_ms = WINDOW_MS - elapsed + 1000;
      console.log(
        `Rate limit approaching — waiting ${Math.ceil(wait_ms / 1000)}s`
      );
      await new Promise((resolve) => setTimeout(resolve, wait_ms));
      this.request_count = 0;
      this.window_start = Date.now();
    }

    const response = await fetch(`${this.base_url}${path}`, {
      headers: {
        Authorization: this.auth_header,
        Accept: "application/vnd.api+json",
      },
    });

    this.request_count++;

    if (response.status === 429) {
      const retry_after = Number(response.headers.get("Retry-After")) || 60;
      console.log(`Rate limited — retrying in ${retry_after}s`);
      await new Promise((resolve) =>
        setTimeout(resolve, retry_after * 1000)
      );
      return this.rate_limited_fetch(path);
    }

    if (!response.ok) {
      throw new Error(
        `Addepar API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async get_entities(entity_type: string): Promise<AddeparEntity[]> {
    const data = (await this.rate_limited_fetch(
      `/entities?filter[entity_type]=${entity_type}`
    )) as { data: AddeparEntity[] };
    return data.data;
  }

  async get_positions(
    entity_id: string,
    as_of_date: string
  ): Promise<AddeparPosition[]> {
    const data = (await this.rate_limited_fetch(
      `/positions?entity_id=${entity_id}&as_of_date=${as_of_date}`
    )) as { data: AddeparPosition[] };
    return data.data;
  }
}
```

### 6.3 Full Import Pipeline

```typescript
async function import_from_addepar(
  client: AddeparClient,
  household_id: string,
  as_of_date: string
): Promise<void> {
  // 1. Fetch all clients in the household
  const clients = await client.get_entities("client");

  // 2. Map to INHERIT persons
  const persons = clients.map(mapClientToPerson);

  // 3. Fetch legal entities (trusts, LLCs)
  const legal_entities = await client.get_entities("legal_entity");

  // 4. Route to trust.json or organisation.json
  const trusts = legal_entities
    .filter((e) => ["trust", "revocable_trust", "irrevocable_trust"]
      .includes(String(e.attributes.entity_type)))
    .map(mapLegalEntityToTrust);

  const organisations = legal_entities
    .filter((e) => ["llc", "corporation", "partnership"]
      .includes(String(e.attributes.entity_type)))
    .map(mapLegalEntityToOrganisation);

  // 5. Fetch accounts → asset.json (financial)
  const accounts = await client.get_entities("account");
  const assets = accounts.map(mapAccountToAsset);

  // 6. Fetch positions → valuation.json + ownership
  const positions = await client.get_positions(household_id, as_of_date);
  const valuations = positions.map(mapPositionToValuation);

  // 7. Assemble the INHERIT document
  const inherit_document = {
    "$schema": "https://openinherit.org/v4/inherit.json",
    persons,
    trusts,
    organisations,
    assets,
    valuations,
  };

  console.log(JSON.stringify(inherit_document, null, 2));
}
```

---

## 7. Rate Limit Strategy

Addepar enforces **tight rate limits**:

| Limit | Window | Notes |
|-------|--------|-------|
| **50 requests** | 15 minutes | Per API key |
| **1,000 requests** | 24 hours | Per API key |

### 7.1 Strategies

1. **Cache aggressively.** Entity data (persons, trusts) rarely changes. Cache for 24 hours minimum. Only positions/valuations need fresh data.

2. **Batch by entity type.** Fetch all clients in one paginated request rather than fetching each individually.

3. **Use `include` parameters.** Addepar's JSON:API implementation supports `include` to sideload related entities, reducing round trips.

4. **Schedule overnight syncs.** Run full imports during off-peak hours. Use incremental updates (filtered by `modified_since`) during the day.

5. **Implement exponential backoff.** When receiving `429 Too Many Requests`, respect the `Retry-After` header. Never retry immediately.

6. **Budget your requests.** A typical household import requires approximately:
   - 1 request for household members
   - 1 request for client entities
   - 1 request for legal entities
   - 1 request for accounts
   - 1 request for positions
   - **Total: ~5 requests** per household (before pagination)

   At 50 requests/15 minutes, you can import roughly **10 households per window**.

### 7.2 Webhook Alternative

Addepar does not currently offer webhooks. Polling is the only option. [TBC] — check for webhook support in future API versions.

---

## 8. Authentication

Addepar supports two authentication methods:

### 8.1 Basic Auth

```
Authorization: Basic base64(API_KEY:API_SECRET)
```

Suitable for server-to-server integrations. API credentials are issued per firm by Addepar's support team.

### 8.2 OAuth 2.0

For user-facing applications, Addepar supports OAuth 2.0 with authorisation code flow. Contact Addepar for client credentials and scope details. [TBC] — exact OAuth scopes for entity/position access.

### 8.3 Firm-Scoped Requests

All API requests are scoped to a firm. The firm ID appears in the URL path:

```
GET https://api.addepar.com/v1/firms/{firm_id}/entities
```

A single API key can access only one firm. Multi-firm integrations require separate credentials per firm.

---

## 9. Edge Cases and Limitations

### 9.1 What Addepar's Ownership Model Cannot Express in INHERIT

| Addepar Concept | INHERIT Gap | Workaround |
|-----------------|-------------|------------|
| **Fractional ownership percentages** | `TrustBeneficiary` has no `percentage` field | Use `x-inherit-addepar` extension or `notes` |
| **Multi-level ownership chains** | INHERIT is flat — person owns asset, not person → trust → account → investment | Flatten the chain: link the person directly to the end asset, note the chain in `provenance` |
| **Account-level grouping** | INHERIT has no "account" entity — assets are individual | Group related assets using `assetCollections` or naming conventions |
| **Custodian relationships** | No dedicated custodian field on `asset.json` | Link to an `organisation.json` in `notes` or use extension |
| **Performance/return data** | INHERIT has no performance tracking | Out of scope — INHERIT captures point-in-time valuations, not time-series returns |
| **Tax lot accounting** | INHERIT does not track cost basis lots | Store in `asset.notes` if needed for estate tax calculations |

### 9.2 Data Quality Considerations

- **Name parsing:** Addepar may store names as a single string. Always validate parsed components.
- **Currency mismatches:** A single household may hold assets in multiple currencies. Ensure each `money.json` instance carries the correct currency code.
- **Stale positions:** Addepar positions are as-of-date snapshots. Always record `valuation.valuationDate` and check freshness.
- **Custom entity types:** Firms may define custom entity types beyond the standard set. These will not match the routing logic in section 2.3 — log and flag for manual review.
- **PII handling:** Addepar attributes include SSN, tax IDs, and contact details. Ensure INHERIT documents carrying this data are handled according to the relevant data protection regime (GDPR, CCPA, etc.). Use `writeOnly: true` fields and `visibility` controls.

### 9.3 Missing Mappings

The following Addepar concepts have no direct INHERIT equivalent and are **out of scope** for v4:

- Investment performance attribution
- Rebalancing targets and drift
- Fee schedules and billing
- Compliance screening results
- Document management (beyond file references)

---

## 10. Further Reading

- [Addepar API Documentation](https://developers.addepar.com)
- [INHERIT person.json schema](/v3/person.json)
- [INHERIT trust.json schema](/v3/trust.json)
- [INHERIT organisation.json schema](/v3/organisation.json)
- [INHERIT asset.json schema](/v3/asset.json)
- [INHERIT valuation.json schema](/v3/valuation.json)
- [INHERIT Extension Guide](/docs/implement/extension-guide.md)
