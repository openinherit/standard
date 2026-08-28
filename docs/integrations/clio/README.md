# Clio Integration Guide

## Overview

[Clio](https://www.clio.com/) is the world's leading cloud-based legal practice management platform, serving over 150,000 legal professionals across 90+ countries. It is the number one choice for law firms managing client matters, documents, time tracking, and billing. Clio's market share is particularly strong among small-to-midsize firms in common law jurisdictions (US, Canada, UK, Australia), many of which handle wills, estates, and probate work.

For probate practitioners, Clio provides preconfigured **Wills & Estates Custom Field Sets** — seven for estate planning and six for probate — that capture estate-specific data within the Matter entity. However, Clio's data model is practice-management oriented, not estate-data oriented. There is no native "estate" or "beneficiary" entity; instead, estate data lives in custom fields attached to Matters and linked Contacts.

INHERIT bridges this gap. By mapping Clio's Contacts, Matters, Custom Fields, Relationships, and Documents to INHERIT's structured estate schemas, firms can export estate data into a portable, standards-compliant format — enabling interoperability with other estate platforms, regulatory submissions, and long-term archival.

## Authentication

Clio uses **OAuth 2.0 (authorisation code grant)** for API access. The flow is:

1. Register your application at [app.clio.com/nc/#/developer_applications](https://app.clio.com/nc/#/developer_applications)
2. Redirect the user to `https://app.clio.com/oauth/authorize` with your `client_id` and `redirect_uri`
3. Exchange the authorisation code for an access token at `https://app.clio.com/oauth/token`
4. Use the access token in the `Authorization: Bearer {token}` header for all API calls

Access tokens expire after a configurable period. Refresh tokens are provided to obtain new access tokens without re-authorising.

**Base URL:** `https://app.clio.com/api/v4/`

## Field Mapping

### Contact (Person) -> INHERIT `person`

Clio's Contact entity with `type: "Person"` maps to INHERIT's `person.json`.

| Clio Contact field | INHERIT `person.json` field | Notes |
|---|---|---|
| `id` | `identity.externalIds[].value` | Store with `system: "clio"`, `type: "contact_id"` |
| `first_name` | `givenName` | Direct mapping |
| `middle_name` | `additionalName` | Direct mapping |
| `last_name` | `familyName` | Direct mapping |
| `prefix` | `titles[].title` | Map to `titles` array with appropriate `type` |
| `date_of_birth` | `dateOfBirth` | Clio uses ISO 8601 date format |
| `email_addresses[].address` | `contact.email` | Use the primary email address |
| `phone_numbers[].number` | `contact.phone` | Use the primary phone number |
| `addresses[].street` | `contact.address.streetAddress` | Map primary address |
| `addresses[].city` | `contact.address.locality` | |
| `addresses[].province` | `contact.address.region` | |
| `addresses[].postal_code` | `contact.address.postalCode` | |
| `addresses[].country` | `contact.address.country` | Convert to ISO 3166-1 alpha-2 |
| `company.name` | `notes` | Employer info — append to notes if relevant |

**INHERIT fields not available from Clio Contact:** `dateOfDeath`, `gender`, `domicile`, `roles`, `taxResidency`, `identifiers` (NI number, passport, etc.), `ritualName`, `clanOrLineage`, `phoneticReading`. These must be populated from Clio Custom Fields or entered manually.

### Contact (Company) -> INHERIT `organisation`

Clio's Contact entity with `type: "Company"` maps to INHERIT's `organisation.json`.

| Clio Contact field | INHERIT `organisation.json` field | Notes |
|---|---|---|
| `id` | `sameAs` or external reference | Store as Clio system reference |
| `name` | `name` | Direct mapping |
| `email_addresses[].address` | `email` | Primary email |
| `phone_numbers[].number` | `phone` | Primary phone |
| `addresses[]` | `address` | Map primary address to `common/address.json` |
| `website` | `url` | Direct mapping |

**Determining `organisationType`:** Clio does not natively categorise companies by type. Use the Matter's practice area and the company's role to infer: a company linked as "Opposing Party" on a probate matter is likely a `financial_institution` or `employer`; a company marked as the client's firm is likely a `legal_firm`. Where ambiguous, default to `other` and flag for human review.

### Matter -> INHERIT `estate`

A Clio Matter with Practice Area "Wills & Estates" (or "Probate", "Estate Planning", "Estate Administration") maps conceptually to INHERIT's `estate.json`. This is an **indirect mapping** — Clio's Matter is a case-management container, not an estate record.

| Clio Matter field | INHERIT `estate.json` field | Notes |
|---|---|---|
| `id` | External reference | Store as provenance metadata |
| `display_number` | External reference | Clio's human-readable matter number |
| `description` | `notes` (on estate or relevant entity) | Free text — may contain estate context |
| `client` (Contact) | `testatorPersonId` | The client Contact is typically the testator (estate planning) or the executor (probate). Determine from context |
| `status` | `status` | Requires translation — see table below |
| `practice_area.name` | Determines which INHERIT entities to create | "Estate Planning" vs "Probate" changes the mapping strategy |
| `open_date` | `createdAt` | When the matter was opened |
| `close_date` | Indicates `status: "closed"` | |
| `custom_field_values` | Various INHERIT fields | **This is where estate data lives** — see Custom Field Sets below |

**Status mapping:**

| Clio Matter status | INHERIT `estate.status` |
|---|---|
| Open (Estate Planning) | `planning` |
| Open (Probate — pre-grant) | `pre_probate` |
| Open (Probate — post-grant) | `in_administration` |
| Closed (successfully) | `closed` |

> **Note:** Clio's matter status is a simple open/closed flag. The INHERIT lifecycle (`planning` -> `confirmed` -> `pre_probate` -> `in_administration` -> `distributed` -> `closed`) is far more granular. Implementers should use custom fields or matter stages to determine the correct INHERIT status.

### Wills & Estates Custom Field Sets -> INHERIT Entities

This is the most important section of this guide. Clio provides **preconfigured Wills & Estates Custom Field Sets** that capture estate-specific data not available in standard Matter or Contact fields. These custom field sets are the primary mechanism for storing estate data in Clio.

Custom Field Sets are retrieved via the API at `GET /api/v4/custom_field_sets.json` and individual custom field values on a matter at `GET /api/v4/matters/{id}/custom_field_values.json`.

#### Estate Planning Custom Field Sets (7 sets)

| Custom Field Set | Maps to INHERIT entity | Key fields |
|---|---|---|
| **Client Information** | `person` (testator) | [TBC -- requires Clio API access] Likely: full name, DOB, address, marital status, occupation, NI/SSN number. Maps to `givenName`, `familyName`, `dateOfBirth`, `contact.address`, `identifiers[]` |
| **Spouse/Partner Details** | `person` (spouse) + `relationship` | [TBC -- requires Clio API access] Likely: spouse name, DOB, marriage date. Creates a second `person` entry and a `relationship` with `relationshipType: "spouse"` |
| **Children & Dependants** | `person[]` (dependants) + `kinship[]` | [TBC -- requires Clio API access] Likely: child names, DOBs, ages. Each child becomes a `person` with `roles: ["beneficiary"]` and a `kinship` record with `kinshipType: "parent_child_biological"` |
| **Executors & Trustees** | `executor[]` + `person[]` | [TBC -- requires Clio API access] Likely: executor names, contact details, professional/lay status. Each maps to an `executor` entry with `personId` referencing a `person` |
| **Gifts & Legacies** | `bequest[]` | [TBC -- requires Clio API access] Likely: specific gifts, pecuniary legacies, residuary shares. Maps to INHERIT `bequest` entities with appropriate `bequestType` |
| **Guardianship** | `person[]` with `roles: ["guardian"]` | [TBC -- requires Clio API access] Likely: guardian names for minor children. Creates `person` entries with `roles: ["guardian"]` |
| **Assets & Liabilities** | `asset[]` + `liability[]` | [TBC -- requires Clio API access] Likely: property details, bank accounts, investments, debts. Maps to INHERIT asset category schemas (`property.json`, `financial-asset.json`, etc.) and `liability.json` |

#### Probate Custom Field Sets (6 sets)

| Custom Field Set | Maps to INHERIT entity | Key fields |
|---|---|---|
| **Deceased Details** | `person` (testator) + `estate` | [TBC -- requires Clio API access] Likely: date of death, place of death, domicile, marital status at death. Maps to `person.dateOfDeath`, `estate.domicile`, `estate.status: "pre_probate"` |
| **Grant Application** | `executor` + `estate` | [TBC -- requires Clio API access] Likely: grant type, applying executor(s), court. Maps to `executor.grantType`, `executor.issuingCourt`, `executor.grantDate` |
| **Estate Valuation** | `asset[]` with valuations | [TBC -- requires Clio API access] Likely: gross estate value, net estate value, individual asset values. Maps to asset `currentValue` fields in minor units |
| **Beneficiary Distribution** | `bequest[]` + `distribution[]` | [TBC -- requires Clio API access] Likely: who receives what, distribution dates, amounts. Maps to `bequest` and `distribution` entities |
| **Tax & IHT** | `estate` tax fields | [TBC -- requires Clio API access] Likely: IHT threshold, taxable estate, reliefs claimed. Maps to estate tax-related fields and jurisdiction-specific extensions |
| **Estate Accounts** | `distribution[]` | [TBC -- requires Clio API access] Likely: income received, expenses paid, distributions made. Maps to distribution records and estate accounting |

> **Implementation note:** The exact field names within each Custom Field Set require Clio API access to enumerate. Use `GET /api/v4/custom_field_sets.json?fields=id,name,custom_fields` to retrieve the full field definitions. The mappings above are based on Clio's published descriptions of their Wills & Estates templates.

### Relationships -> INHERIT `kinship` / `relationship`

Clio's Relationships resource (`/api/v4/relationships.json`) links two Contacts with a described relationship. This maps to either INHERIT's `kinship.json` (familial bonds) or `relationship.json` (non-familial relationships such as spouse, partner, carer).

| Clio Relationship field | INHERIT field | Notes |
|---|---|---|
| `id` | External reference | |
| `description` | Used to determine `kinshipType` or `relationshipType` | Free text — requires parsing |
| `contact` (from) | `fromPersonId` | Map via Contact -> Person lookup |
| `related_contact` (to) | `toPersonId` | Map via Contact -> Person lookup |

**Mapping relationship descriptions to INHERIT types:**

| Clio description (typical) | INHERIT entity | INHERIT type |
|---|---|---|
| "Parent", "Father", "Mother" | `kinship` | `parent_child_biological` |
| "Child", "Son", "Daughter" | `kinship` | `parent_child_biological` (reversed direction) |
| "Sibling", "Brother", "Sister" | `kinship` | `sibling` |
| "Spouse", "Husband", "Wife" | `relationship` | `spouse` |
| "Partner" | `relationship` | `partner` |
| "Stepchild" | `kinship` | `parent_child_step` |
| "Adopted child" | `kinship` | `parent_child_adopted` |

> **Caveat:** Clio's relationship descriptions are free text, not an enum. Implementations must normalise these strings — consider case-insensitive matching and common synonyms.

### Documents -> INHERIT `document`

Clio's Documents resource (`/api/v4/documents.json`) stores files attached to Matters.

| Clio Document field | INHERIT `document.json` field | Notes |
|---|---|---|
| `id` | External reference | |
| `name` | `title` | Direct mapping |
| `content_type` | `mimeType` | Direct mapping |
| `created_at` | `createdAt` | ISO 8601 timestamp |
| `latest_document_version.content_type` | `fileFormat` | Extract extension from MIME type |
| `latest_document_version.size` | `fileSizeBytes` | In bytes |
| `matter.id` | `entityId` + `entityType: "estate"` | Links document to the estate |

**Determining `document.type`:** Clio does not categorise documents by legal type. Implementations should infer the type from the filename, folder structure, or a custom field:

- Files in a "Wills" folder -> `type: "will"`
- Files named "Grant of Probate*" -> `type: "grant_of_probate"`
- Files named "Death Certificate*" -> `type: "death_certificate"`
- Default to `type: "other"` and flag for human review

**Downloading content:** Use `GET /api/v4/documents/{id}/download.json` to retrieve the file content. For INHERIT documents that embed content (using the `content` base64 field), encode the downloaded bytes. For large files, use `storageRef` instead.

### Activities -> INHERIT `event` (loosely)

Clio's Activities resource (`/api/v4/activities.json`) tracks time entries and tasks on a Matter. This is a **loose mapping** — Clio activities are billing-oriented, whilst INHERIT events are estate-lifecycle-oriented.

| Clio Activity field | Potential INHERIT use |
|---|---|
| `date` | Timeline reconstruction |
| `type` ("TimeEntry", "ExpenseEntry") | Distinguish billable vs administrative |
| `note` | Event description |
| `matter.id` | Link to estate |
| `user.name` | Who performed the action |

> Activities are most useful for reconstructing an audit trail of estate administration — who did what and when. They do not map directly to a single INHERIT entity but can inform `provenance` fields and administrative notes.

## Code Examples

### Import: Clio -> INHERIT

```typescript
import type { InheritDocument, Person, Estate } from '@openinherit/sdk';

const CLIO_BASE = 'https://app.clio.com/api/v4';

interface ClioContact {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  prefix?: string;
  date_of_birth?: string;
  email_addresses?: Array<{ address: string; name: string }>;
  phone_numbers?: Array<{ number: string; name: string }>;
  addresses?: Array<{
    street: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
  }>;
}

interface ClioMatter {
  id: number;
  display_number: string;
  description: string;
  client: { id: number };
  status: string;
  practice_area: { name: string };
  open_date: string;
  custom_field_values: Array<{
    id: number;
    field_name: string;
    value: string;
    custom_field: { id: number; name: string };
  }>;
}

/**
 * Fetch a Clio matter and its related contacts, then build
 * an INHERIT document.
 */
async function clioToInherit(
  matterId: number,
  accessToken: string
): Promise<InheritDocument> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Fetch matter with custom fields
  const matterRes = await fetch(
    `${CLIO_BASE}/matters/${matterId}.json?fields=id,display_number,description,client,status,practice_area,open_date,custom_field_values`,
    { headers }
  );
  const { data: matter }: { data: ClioMatter } = await matterRes.json();

  // Fetch the client contact (testator or executor)
  const contactRes = await fetch(
    `${CLIO_BASE}/contacts/${matter.client.id}.json?fields=id,first_name,middle_name,last_name,prefix,date_of_birth,email_addresses,phone_numbers,addresses`,
    { headers }
  );
  const { data: contact }: { data: ClioContact } = await contactRes.json();

  // Fetch relationships for this contact
  const relsRes = await fetch(
    `${CLIO_BASE}/relationships.json?contact_id=${contact.id}&fields=id,description,contact,related_contact`,
    { headers }
  );
  const { data: relationships } = await relsRes.json();

  // Build the INHERIT person from the Clio contact
  const testator: Person = {
    id: crypto.randomUUID(),
    givenName: contact.first_name,
    familyName: contact.last_name,
    additionalName: contact.middle_name || undefined,
    dateOfBirth: contact.date_of_birth || undefined,
    roles: ['testator'],
    contact: {
      email: contact.email_addresses?.[0]?.address,
      phone: contact.phone_numbers?.[0]?.number,
      address: contact.addresses?.[0]
        ? {
            streetAddress: contact.addresses[0].street,
            locality: contact.addresses[0].city,
            region: contact.addresses[0].province,
            postalCode: contact.addresses[0].postal_code,
            country: contact.addresses[0].country,
          }
        : undefined,
    },
    identity: {
      externalIds: [
        {
          system: 'clio',
          value: String(contact.id),
          type: 'contact_id',
        },
      ],
    },
  };

  // Build the INHERIT estate from the Clio matter
  const estate: Estate = {
    id: crypto.randomUUID(),
    testatorPersonId: testator.id,
    status: matter.status === 'Open' ? 'planning' : 'closed',
    domicile: 'GB', // Default — override from custom fields
    createdAt: new Date(matter.open_date).toISOString(),
    lastModifiedAt: new Date().toISOString(),
    provenance: {
      source: 'imported',
      importedFrom: `clio:matter:${matter.id}`,
      importedAt: new Date().toISOString(),
    },
  };

  // TODO: Parse custom_field_values to populate:
  // - Additional person records (spouse, children, executors)
  // - Assets and liabilities
  // - Bequests and distributions
  // - Estate-specific fields (domicile, will type, etc.)

  return {
    $schema: 'https://openinherit.org/v3/inherit-document.json',
    documentId: crypto.randomUUID(),
    version: '3.0',
    createdAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    estates: [estate],
    people: [testator],
    // Additional arrays populated from custom fields...
  };
}
```

### Export: INHERIT -> Clio

```typescript
const CLIO_BASE = 'https://app.clio.com/api/v4';

interface InheritPerson {
  id: string;
  givenName: string;
  familyName?: string;
  additionalName?: string;
  dateOfBirth?: string;
  roles: string[];
  contact?: {
    email?: string;
    phone?: string;
    address?: {
      streetAddress?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
      country?: string;
    };
  };
}

/**
 * Create or update Clio contacts and a matter from an INHERIT document.
 */
async function inheritToClio(
  inheritDoc: {
    estates: Array<{ id: string; testatorPersonId: string; status: string }>;
    people: InheritPerson[];
  },
  accessToken: string
): Promise<{ matterId: number; contactIds: number[] }> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const contactIds: number[] = [];

  // Create Clio contacts from INHERIT people
  for (const person of inheritDoc.people) {
    const contactPayload = {
      data: {
        first_name: person.givenName,
        last_name: person.familyName || '',
        middle_name: person.additionalName || undefined,
        date_of_birth: person.dateOfBirth || undefined,
        type: 'Person',
        email_addresses: person.contact?.email
          ? [{ address: person.contact.email, name: 'Home' }]
          : [],
        phone_numbers: person.contact?.phone
          ? [{ number: person.contact.phone, name: 'Mobile' }]
          : [],
        addresses: person.contact?.address
          ? [
              {
                street: person.contact.address.streetAddress || '',
                city: person.contact.address.locality || '',
                province: person.contact.address.region || '',
                postal_code: person.contact.address.postalCode || '',
                country: person.contact.address.country || '',
                name: 'Home',
              },
            ]
          : [],
      },
    };

    const res = await fetch(`${CLIO_BASE}/contacts.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify(contactPayload),
    });
    const { data } = await res.json();
    contactIds.push(data.id);
  }

  // Create a Clio matter from the INHERIT estate
  const estate = inheritDoc.estates[0];
  const testatorIndex = inheritDoc.people.findIndex(
    (p) => p.id === estate.testatorPersonId
  );
  const clientContactId = contactIds[testatorIndex];

  const matterPayload = {
    data: {
      client: { id: clientContactId },
      description: `INHERIT estate ${estate.id}`,
      status: estate.status === 'closed' ? 'Closed' : 'Open',
      // Practice area must be set to a Wills & Estates area —
      // retrieve available practice areas first:
      // GET /api/v4/practice_areas.json?fields=id,name
    },
  };

  const matterRes = await fetch(`${CLIO_BASE}/matters.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify(matterPayload),
  });
  const { data: matter } = await matterRes.json();

  // TODO: Set custom field values on the matter to populate
  // estate-specific data (executors, beneficiaries, assets, etc.)
  // Use PATCH /api/v4/matters/{id}.json with custom_field_values

  return { matterId: matter.id, contactIds };
}
```

## Webhook Considerations

Clio supports webhooks for real-time notifications when data changes. However, there is a critical operational constraint:

**Clio webhooks expire after a maximum of 31 days.** Your integration must re-register webhooks periodically. Failure to do so will silently stop notifications — there is no warning before expiry.

**Recommended approach:**

1. Register webhooks via `POST /api/v4/webhooks.json` for events: `matter.created`, `matter.updated`, `contact.created`, `contact.updated`, `document.created`
2. Store the webhook `id` and `expiry` timestamp
3. Run a scheduled job (daily or weekly) that checks remaining TTL and re-registers any webhook within 7 days of expiry
4. Implement idempotent webhook handlers — Clio may deliver duplicate notifications

```typescript
// Example: re-register expiring webhooks
async function refreshWebhooks(accessToken: string): Promise<void> {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const res = await fetch(`${CLIO_BASE}/webhooks.json`, { headers });
  const { data: webhooks } = await res.json();

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  for (const webhook of webhooks) {
    if (new Date(webhook.expires_at) < sevenDaysFromNow) {
      // Delete and re-create
      await fetch(`${CLIO_BASE}/webhooks/${webhook.id}.json`, {
        method: 'DELETE',
        headers,
      });
      await fetch(`${CLIO_BASE}/webhooks.json`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            url: webhook.url,
            events: webhook.events,
            model: webhook.model,
          },
        }),
      });
    }
  }
}
```

## Rate Limits

Clio enforces a rate limit of **50 requests per minute** during peak hours (business hours in the firm's time zone). Outside peak hours the limit may be higher, but do not depend on this.

**Strategies for batch operations:**

- **Paginate with `?limit=200`** — Clio supports up to 200 records per page, reducing the number of requests needed
- **Use `?fields=` parameter** — request only the fields you need, which reduces response size and server load
- **Implement exponential backoff** — when you receive a `429 Too Many Requests` response, back off with increasing delays
- **Queue and throttle** — for large imports/exports, queue requests and process at a rate of ~40/minute to stay safely under the limit
- **Batch custom field reads** — fetch all custom field values for a matter in a single request rather than one per field

**For a typical estate import** (1 matter + 5 contacts + custom fields + documents), expect approximately 10-15 API calls. This is well within the rate limit for individual estates but becomes a concern when processing multiple estates in batch.

## Edge Cases

### What does not map cleanly

1. **INHERIT roles vs Clio contacts.** INHERIT distinguishes between a person's identity and their role(s) in an estate. Clio has a flat contact model. A person who is both an executor and a beneficiary is one Contact in Clio but needs `roles: ["executor", "beneficiary"]` in INHERIT. Implementers must merge multiple Clio contact references into a single INHERIT person when they represent the same individual.

2. **Custom field fragility.** Clio's preconfigured Wills & Estates Custom Field Sets can be modified or deleted by firm administrators. An integration that depends on specific field names may break if the firm has customised their templates. Always validate field existence before reading values.

3. **No native estate lifecycle.** Clio tracks matter status as open/closed. INHERIT's six-stage lifecycle (`planning` -> `confirmed` -> `pre_probate` -> `in_administration` -> `distributed` -> `closed`) has no direct equivalent. Firms must either use custom fields or matter tags to track this progression.

4. **No asset or liability entities.** Clio has no structured asset or liability data model. All asset information lives in free-text custom fields. Extracting structured asset data (property addresses, account numbers, valuations) requires parsing custom field values — potentially with AI assistance.

5. **Relationship descriptions are free text.** Clio's Relationships use a free-text `description` field rather than a typed enum. "Father", "Dad", "Parent" all mean the same thing but require normalisation to map to INHERIT's `kinshipType: "parent_child_biological"`.

6. **No kinship direction.** Clio relationships are bidirectional with no inherent direction. INHERIT's `kinship` requires `fromPersonId` (parent/elder) and `toPersonId` (child/younger). Implementers must infer direction from the relationship description and the parties' dates of birth.

7. **Monetary amounts.** Clio stores monetary values as decimal numbers (e.g. `1500.00`). INHERIT uses integer minor units (e.g. `150000` for GBP 1,500.00). Always convert by multiplying by 100 (or the appropriate minor unit factor for the currency).

8. **Multi-jurisdiction estates.** Clio has no concept of multi-jurisdiction administration. An estate with assets in England and France is a single Matter in Clio. INHERIT supports multiple `jurisdictionAdministrations` within an estate — this data must be manually structured from custom fields or matter notes.

### Clio-specific data with no INHERIT equivalent

- **Billing data** (time entries, invoices, trust accounting) — INHERIT does not model legal fees
- **Calendar events** — INHERIT does not model scheduling
- **Tasks and task lists** — INHERIT does not model workflow
- **Matter permissions and sharing** — INHERIT handles access control differently via `visibility` fields

These are practice-management concerns and are intentionally outside INHERIT's scope.
