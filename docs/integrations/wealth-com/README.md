# Wealth.com Integration Guide

## Overview

[Wealth.com](https://www.wealth.com) is an estate planning platform used by financial advisers, estate attorneys, and wealth managers across the United States. It provides a comprehensive digital estate planning experience — from will and trust creation to document management and beneficiary tracking — with an AI engine called Ester that parses trusts, wills, and powers of attorney into structured data.

Wealth.com's entity model (Clients, People, Trusts, Entities, Assets, Documents) maps almost one-to-one with INHERIT's core schemas. This makes it one of the strongest natural fits for INHERIT adoption. An integration allows firms to export estate data from Wealth.com into a portable, standards-based format that can be shared with solicitors, probate registries, tax advisers, and other platforms without vendor lock-in.

This guide documents how each Wealth.com API entity maps to INHERIT v3 schemas, including field-level mappings, code examples for both import and export, and guidance on handling the Wealth.com SFTP bulk format and webhook events.

## Field Mapping

### Clients → INHERIT `estate`

A Wealth.com Client represents a single person's estate plan. In INHERIT, this maps to the root `estate.json` entity combined with a `person.json` record for the testator.

| Wealth.com Field | INHERIT Field | Notes |
|---|---|---|
| Client ID | `estate.id` | Generate a new UUID or maintain a mapping table. Store the Wealth.com Client ID in the provenance metadata |
| Client Name | `person.givenName`, `person.familyName` | Split into structured name fields on the INHERIT person record |
| Client Email | `person.contact.email` | Mapped to the testator's contact object |
| Client Phone | `person.contact.phone` | E.164 format recommended in INHERIT |
| Client Status | `estate.status` | Map: Active → `planning` or `confirmed`; Deceased → `pre_probate` or `in_administration` |
| Client Address | `person.contact.address` | Map to INHERIT's `common/address.json` structure |
| Date of Birth | `person.dateOfBirth` | ISO 8601 date format (`YYYY-MM-DD`) |
| Date of Death | `person.dateOfDeath` | Only present if the client is deceased |
| State of Residence | `estate.domicile` | Map US state to ISO 3166-2 code (e.g. `US-CA`, `US-NY`) |
| Plan Type | `estate.primaryInstrument` | Map: Will-based → `will`; Trust-based → `revocable_trust`; Both → `both` |
| Created Date | `estate.createdAt` | ISO 8601 datetime |
| Last Modified | `estate.lastModifiedAt` | ISO 8601 datetime |
| [Exact field TBC — requires API access] Marital Status | `estate.defaultPropertyRegime` | Infer property regime from state (community property vs separate property states) |

### People → INHERIT `person`

Wealth.com People represents all individuals connected to an estate plan — beneficiaries, executors, trustees, guardians, and other contacts.

| Wealth.com Field | INHERIT Field | Notes |
|---|---|---|
| Person ID | `person.id` | Generate a new UUID; store Wealth.com ID in `person.identity.externalIds` |
| First Name | `person.givenName` | Direct mapping |
| Middle Name | `person.additionalName` | Direct mapping |
| Last Name | `person.familyName` | Direct mapping |
| Nickname / Preferred Name | `person.preferredName` | [Exact field TBC — requires API access] |
| Date of Birth | `person.dateOfBirth` | ISO 8601 format |
| Date of Death | `person.dateOfDeath` | ISO 8601 format |
| Gender | `person.gender` | Map to INHERIT enum: `male`, `female`, `non_binary`, `other`, `prefer_not_to_say`, `unknown` |
| Email | `person.contact.email` | Direct mapping |
| Phone | `person.contact.phone` | Direct mapping |
| Address | `person.contact.address` | Map to INHERIT `common/address.json` |
| Relationship to Client | `person.roles` | Map: Spouse → `beneficiary`; Child → `beneficiary`; Executor → `executor`; Trustee → `trustee`; Guardian → `guardian`; Attorney-in-Fact → `attorney` |
| SSN | `person.identifiers[]` | Map to `{ system: "urn:ssa:ssn", value: "...", type: "social_security" }` |
| [Exact field TBC — requires API access] Role Type | `person.roles` | Array — a person may hold multiple roles simultaneously |

### Trusts → INHERIT `trust`

Wealth.com Trusts represent both testamentary trusts (created by a will) and living trusts (revocable/irrevocable inter vivos trusts).

| Wealth.com Field | INHERIT Field | Notes |
|---|---|---|
| Trust ID | `trust.id` | Generate a new UUID; store Wealth.com ID in provenance |
| Trust Name | `trust.name` | Direct mapping |
| Trust Type | `trust.trustType` | Map: Revocable Living Trust → `discretionary`; Irrevocable Trust → per subtype; Testamentary Trust → varies. Also set `trust.creationType` |
| [Exact field TBC — requires API access] Revocable | `trust.revocability` | Map: true → `revocable`; false → `irrevocable` |
| [Exact field TBC — requires API access] Is Testamentary | `trust.isTestamentary` | `true` if created by the will, `false` for living trusts |
| Creation Date | `trust.createdAt` | ISO 8601 datetime |
| Settlor / Grantor | `trust.settlor` | Reference to the corresponding `person.id` |
| Trustees | `trust.trustees[]` | Array of `TrustAppointee` objects with `role: "trustee"` and `personId` references |
| Successor Trustees | `trust.trustees[]` | Include with appropriate ordering. [Exact field TBC — requires API access] |
| Beneficiaries | `trust.beneficiaries[]` | Array of `TrustBeneficiary` objects with `interestType` and `personId` references |
| [Exact field TBC — requires API access] Distribution Terms | `trust.conditions` | Free-text conditions field |
| [Exact field TBC — requires API access] Vesting Age | `trust.vestingAge` | Integer age |
| Governing State | `trust.governingLaw` | Map US state to ISO 3166-2 jurisdiction code |
| [Exact field TBC — requires API access] Trust Protector | `trust.protectorPersonId` | Reference to `person.id` of the protector |

### Entities → INHERIT `organisation`

Wealth.com Entities represent legal entities such as LLCs, corporations, partnerships, and charities connected to the estate plan.

| Wealth.com Field | INHERIT Field | Notes |
|---|---|---|
| Entity ID | `organisation.id` | Generate a new UUID; store Wealth.com ID in provenance |
| Entity Name | `organisation.name` | Direct mapping |
| Entity Type | `organisation.organisationType` | Map: LLC/Corporation → `other` (or use extension `x-inherit-llc`); Charity → `charity`; Trust Company → `trust_corporation`; Financial Institution → `financial_institution` |
| [Exact field TBC — requires API access] EIN / Tax ID | `organisation.registrations[]` | Map to registration with `body: "irs"`, `number: "<EIN>"` |
| State of Formation | `organisation.jurisdiction` | Map US state to ISO 3166-2 code |
| Address | `organisation.address` | Map to INHERIT `common/address.json` |
| Contact Person | `organisation.contactPerson` | Direct mapping |
| Email | `organisation.email` | Direct mapping |
| Phone | `organisation.phone` | Direct mapping |
| Website | `organisation.url` | Direct mapping |
| [Exact field TBC — requires API access] Role in Estate | `organisation.estateRoles[]` | Map: Beneficiary → `beneficiary`; Trustee → `trustee`; Adviser → `professional_adviser` |
| Notes | `organisation.notes` | Direct mapping |

### Assets → INHERIT `asset`

Wealth.com Assets cover all types of property — financial accounts, real property, personal property, business interests, and digital assets.

| Wealth.com Field | INHERIT Field | Notes |
|---|---|---|
| Asset ID | `asset.id` | Generate a new UUID; store Wealth.com ID in provenance |
| Asset Name / Description | `asset.name` | Direct mapping |
| Asset Type | `asset.category` | Map: Bank Account → `financial`; Investment → `financial`; Real Estate → use `property.json` instead; Vehicle → `vehicle`; Personal Property → `property_contents`; Business Interest → `business`; Digital Asset → `digital`; Life Insurance → `financial` |
| [Exact field TBC — requires API access] Asset Subtype | `asset.subcategory` | Finer classification (e.g. "checking_account", "IRA", "401k") |
| Current Value | `asset.estimatedValue` | Convert to minor units (multiply dollars by 100). Use INHERIT `common/money.json` with `currency: "USD"` |
| [Exact field TBC — requires API access] Valuation Date | `asset.valuationDate` | ISO 8601 date |
| Institution / Holder | `asset.location` | Free-text location, or link to an `organisation.id` via the asset's holder fields |
| Account Number | `asset.identifiers[]` | Map to `{ system: "<institution>", value: "<number>", type: "account_number" }` |
| [Exact field TBC — requires API access] Ownership Type | `asset.ownershipType` | Map: Sole → sole ownership; Joint → joint tenancy; Community → community property |
| [Exact field TBC — requires API access] Beneficiary Designations | Separate `bequest` entries | Wealth.com may track beneficiary designations on accounts — map these to INHERIT bequests |
| Notes | `asset.notes` | Direct mapping |

### Documents → INHERIT `document`

Wealth.com Documents represent uploaded and generated files — wills, trust agreements, powers of attorney, and supporting documents.

| Wealth.com Field | INHERIT Field | Notes |
|---|---|---|
| Document ID | `document.id` | Generate a new UUID; store Wealth.com ID in provenance |
| Document Name / Title | `document.title` | Direct mapping |
| Document Type | `document.type` | Map: Will → `will`; Trust Agreement → `trust_deed`; POA → `power_of_attorney`; Death Certificate → `death_certificate`; Insurance Policy → `insurance_policy`; Other → `other` |
| [Exact field TBC — requires API access] File URL / Storage Reference | `document.storageRef` | Store the Wealth.com download URL or re-upload to your own storage |
| File Format | `document.fileFormat` | Lowercase extension without leading dot (e.g. `pdf`, `docx`) |
| [Exact field TBC — requires API access] MIME Type | `document.mimeType` | e.g. `application/pdf` |
| [Exact field TBC — requires API access] File Size | `document.fileSizeBytes` | Integer bytes |
| Upload Date / Created Date | `document.createdAt` | ISO 8601 datetime |
| [Exact field TBC — requires API access] Related Entity | `document.entityType` + `document.entityId` | Links the document to its subject (e.g. a trust deed linked to a specific trust) |
| Notes | `document.notes` | Direct mapping |

### Top Accounts → INHERIT `asset` (financial)

Wealth.com Top Accounts represent portfolio and investment accounts — brokerage accounts, retirement accounts (IRA, 401(k)), and managed portfolios.

| Wealth.com Field | INHERIT Field | Notes |
|---|---|---|
| Account ID | `asset.id` | Generate a new UUID |
| Account Name | `asset.name` | Direct mapping |
| Account Type | `asset.subcategory` | Map: Brokerage → `brokerage_account`; IRA → `ira`; 401(k) → `401k`; Roth IRA → `roth_ira` |
| — | `asset.category` | Always `financial` for Top Accounts |
| Balance / Value | `asset.estimatedValue` | Convert to minor units. Use `common/money.json` with `currency: "USD"` |
| Institution | `asset.location` | Free-text institution name, or reference an `organisation.id` |
| Account Number | `asset.identifiers[]` | Map to identifier with appropriate `type` |
| [Exact field TBC — requires API access] Beneficiary Designations | Linked `bequest` entries | Transfer-on-death or beneficiary designations on the account |
| [Exact field TBC — requires API access] Ownership Percentage | Ownership metadata | If the account is jointly owned, capture the percentage split |

### Client Groups → INHERIT family grouping

Wealth.com Client Groups represent households or family units — typically a married couple and their dependants.

| Wealth.com Field | INHERIT Field | Notes |
|---|---|---|
| Group ID | — | No direct INHERIT equivalent; use `estate.companionEstateId` to link companion estates |
| Group Name | — | Informational only; can be stored in `estate.notes` |
| Primary Client | `estate.testatorPersonId` | The primary estate owner |
| Secondary Client | Companion `estate.testatorPersonId` | Create a second estate record linked via `companionEstateId` |
| Group Members | `person.roles` array | Each member is a `person` record with appropriate roles across both estates |
| [Exact field TBC — requires API access] Relationship Type | Kinship/relationship data | Map to INHERIT's relationship modelling. Spouse relationships are captured via `companionEstateId`; parent-child via role assignments |

## SFTP Bulk Format Mapping

Wealth.com provides SFTP-based bulk data transfer with separate files for each entity type. These map directly to INHERIT document arrays.

| Wealth.com SFTP File | INHERIT Array | Notes |
|---|---|---|
| People file | `persons[]` | Each row becomes a `person.json` object. Parse names, dates, and identifiers according to the field mapping above |
| Trusts/Entities file | `trusts[]` + `organisations[]` | Split rows: trust records → `trust.json`, entity records → `organisation.json` |
| Assets file | `assets[]` | Each row becomes an `asset.json` object. Map category from Wealth.com's asset type field |
| Client Groups file | Multiple `estate` records | Each group generates linked estate records with `companionEstateId` references |
| Documents file | `documents[]` | Each row becomes a `document.json` object. File content must be fetched separately via the API or SFTP |

**Processing approach:**

1. Parse the People file first — all other entities reference person records.
2. Parse Trusts and Entities, linking `personId` references to the person records created in step 1.
3. Parse Assets, linking to organisations (holders) and persons (owners) as needed.
4. Parse Client Groups to establish companion estate links.
5. Parse Documents and link to their parent entities.
6. Validate the complete INHERIT document against the JSON Schema before persisting.

## Webhook Event Mapping

Wealth.com provides webhooks for real-time change notifications. Map these to INHERIT entity update operations.

| Wealth.com Webhook Event | INHERIT Entity Affected | Recommended Action |
|---|---|---|
| `client.created` | `estate` + `person` | Create a new INHERIT estate record and testator person record |
| `client.updated` | `estate` and/or `person` | Re-fetch the client and update the corresponding INHERIT fields |
| `client.deleted` | `estate` | Mark the INHERIT estate as retired or remove it from the active set |
| `document.created` | `document` | Fetch the document metadata and create a new INHERIT document record |
| `document.updated` | `document` | Re-fetch and update the INHERIT document record |
| `document.deleted` | `document` | Remove the document from the INHERIT document array |
| `contacts.created` | `person` | Create a new INHERIT person record with appropriate roles |
| `contacts.updated` | `person` | Re-fetch and update the INHERIT person record |
| `contacts.deleted` | `person` | Remove the person from the INHERIT persons array (check for dangling references) |
| `assets.created` | `asset` | Create a new INHERIT asset record |
| `assets.updated` | `asset` | Re-fetch and update the INHERIT asset record |
| `assets.deleted` | `asset` | Remove the asset from the INHERIT assets array |
| `quiz_recommendations.*` | — | Informational only; no direct INHERIT mapping. Could be stored in `estate.notes` |

**Best practice:** On each webhook event, re-validate the entire INHERIT document to catch any broken references caused by deletions.

## Code Examples

### Import: Wealth.com → INHERIT

```typescript
import { v4 as uuidv4 } from 'uuid';
import { InheritDocument, Estate, Person, Asset, Trust } from '@openinherit/sdk';

/**
 * Fetch a Wealth.com client and convert to an INHERIT document.
 * Requires a valid Wealth.com OAuth2 access token.
 */
async function importFromWealth(
  clientId: string,
  accessToken: string
): Promise<InheritDocument> {
  const baseUrl = 'https://api.wealth.com/v1';
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // Fetch all entities in parallel
  const [clientRes, peopleRes, trustsRes, assetsRes, docsRes] =
    await Promise.all([
      fetch(`${baseUrl}/clients/${clientId}`, { headers }),
      fetch(`${baseUrl}/clients/${clientId}/people`, { headers }),
      fetch(`${baseUrl}/clients/${clientId}/trusts`, { headers }),
      fetch(`${baseUrl}/clients/${clientId}/assets`, { headers }),
      fetch(`${baseUrl}/clients/${clientId}/documents`, { headers }),
    ]);

  const client = await clientRes.json();
  const people = await peopleRes.json();
  const trusts = await trustsRes.json();
  const assets = await assetsRes.json();
  const docs = await docsRes.json();

  // Map the testator (client) to an INHERIT person
  const testatorId = uuidv4();
  const testator: Person = {
    id: testatorId,
    givenName: client.firstName,
    familyName: client.lastName,
    dateOfBirth: client.dateOfBirth, // Already ISO 8601
    roles: ['testator'],
    contact: {
      email: client.email,
      phone: client.phone,
      address: mapWealthAddress(client.address),
    },
    identity: {
      externalIds: [
        {
          system: 'wealth.com',
          value: clientId,
          type: 'platform_id',
        },
      ],
    },
  };

  // Map all people to INHERIT persons
  const persons: Person[] = [testator];
  const wealthIdToInheritId = new Map<string, string>();
  wealthIdToInheritId.set(clientId, testatorId);

  for (const p of people.data) {
    const personId = uuidv4();
    wealthIdToInheritId.set(p.id, personId);

    persons.push({
      id: personId,
      givenName: p.firstName,
      familyName: p.lastName,
      additionalName: p.middleName ?? undefined,
      dateOfBirth: p.dateOfBirth ?? undefined,
      roles: mapWealthRoles(p.relationshipType),
      contact: {
        email: p.email ?? undefined,
        phone: p.phone ?? undefined,
        address: p.address ? mapWealthAddress(p.address) : undefined,
      },
      identity: {
        externalIds: [
          {
            system: 'wealth.com',
            value: p.id,
            type: 'platform_id',
          },
        ],
      },
    });
  }

  // Map trusts
  const inheritTrusts: Trust[] = trusts.data.map((t: any) => ({
    id: uuidv4(),
    name: t.name,
    trustType: mapWealthTrustType(t.type),
    creationType: t.isTestamentary ? 'testamentary' : 'inter_vivos_revocable',
    revocability: t.revocable ? 'revocable' : 'irrevocable',
    isTestamentary: t.isTestamentary ?? false,
    settlor: testatorId,
    trustees: (t.trustees ?? []).map((tr: any) => ({
      personId: wealthIdToInheritId.get(tr.personId) ?? uuidv4(),
      role: 'trustee' as const,
    })),
    beneficiaries: (t.beneficiaries ?? []).map((b: any) => ({
      personId: wealthIdToInheritId.get(b.personId) ?? uuidv4(),
      interestType: 'discretionary' as const,
    })),
    governingLaw: { code: mapStateToIso(t.governingState) },
  }));

  // Map assets (convert dollars to minor units)
  const inheritAssets: Asset[] = assets.data.map((a: any) => ({
    id: uuidv4(),
    name: a.name ?? a.description,
    category: mapWealthAssetCategory(a.type),
    subcategory: a.subtype ?? undefined,
    estimatedValue: a.value
      ? { amount: Math.round(a.value * 100), currency: 'USD' }
      : undefined,
    location: a.institution ?? undefined,
    identifiers: a.accountNumber
      ? [{ system: a.institution ?? 'unknown', value: a.accountNumber, type: 'account_number' }]
      : [],
    notes: a.notes ?? undefined,
  }));

  // Build the INHERIT document
  const now = new Date().toISOString();
  const estate: Estate = {
    id: uuidv4(),
    testatorPersonId: testatorId,
    status: client.status === 'deceased' ? 'pre_probate' : 'planning',
    domicile: { code: mapStateToIso(client.stateOfResidence) },
    primaryInstrument: mapPlanType(client.planType),
    createdAt: client.createdAt ?? now,
    lastModifiedAt: now,
  };

  return {
    $schema: 'https://openinherit.org/v3/inherit-document.json',
    estate,
    persons,
    trusts: inheritTrusts,
    assets: inheritAssets,
    documents: docs.data.map((d: any) => ({
      id: uuidv4(),
      type: mapWealthDocType(d.type),
      title: d.name ?? d.title,
      fileFormat: d.fileExtension?.toLowerCase() ?? 'pdf',
      createdAt: d.createdAt ?? now,
      storageRef: d.downloadUrl ?? undefined,
      notes: d.notes ?? undefined,
    })),
  };
}

// --- Helper functions ---

function mapWealthRoles(relationshipType: string): string[] {
  const roleMap: Record<string, string[]> = {
    spouse: ['beneficiary'],
    child: ['beneficiary'],
    executor: ['executor'],
    trustee: ['trustee'],
    guardian: ['guardian'],
    attorney: ['attorney'],
    beneficiary: ['beneficiary'],
    witness: ['witness'],
  };
  return roleMap[relationshipType?.toLowerCase()] ?? ['beneficiary'];
}

function mapWealthTrustType(type: string): string {
  const typeMap: Record<string, string> = {
    revocable_living: 'discretionary',
    irrevocable: 'discretionary',
    testamentary: 'discretionary',
    charitable: 'charitable',
    special_needs: 'disabled_persons',
  };
  return typeMap[type?.toLowerCase()] ?? 'other';
}

function mapWealthAssetCategory(type: string): string {
  const catMap: Record<string, string> = {
    bank_account: 'financial',
    investment: 'financial',
    retirement: 'financial',
    insurance: 'financial',
    vehicle: 'vehicle',
    personal_property: 'property_contents',
    business: 'business',
    digital: 'digital',
    real_estate: 'other', // Real estate uses property.json, not asset.json
  };
  return catMap[type?.toLowerCase()] ?? 'other';
}

function mapWealthDocType(type: string): string {
  const docMap: Record<string, string> = {
    will: 'will',
    trust_agreement: 'trust_deed',
    power_of_attorney: 'power_of_attorney',
    death_certificate: 'death_certificate',
    insurance_policy: 'insurance_policy',
  };
  return docMap[type?.toLowerCase()] ?? 'other';
}

function mapPlanType(planType: string): string {
  const map: Record<string, string> = {
    will: 'will',
    trust: 'revocable_trust',
    both: 'both',
  };
  return map[planType?.toLowerCase()] ?? 'will';
}

function mapStateToIso(state: string): string {
  // Convert US state abbreviation to ISO 3166-2 code
  return `US-${state?.toUpperCase()}`;
}

function mapWealthAddress(addr: any): any {
  return {
    streetAddress: addr.line1,
    addressLocality: addr.city,
    addressRegion: addr.state,
    postalCode: addr.zip,
    addressCountry: 'US',
  };
}
```

### Export: INHERIT → Wealth.com

```typescript
import { InheritDocument, Person, Trust, Asset } from '@openinherit/sdk';

/**
 * Push an INHERIT document to Wealth.com, creating or updating
 * the client, people, trusts, and assets.
 * Requires a valid Wealth.com OAuth2 access token.
 */
async function exportToWealth(
  doc: InheritDocument,
  accessToken: string
): Promise<{ clientId: string }> {
  const baseUrl = 'https://api.wealth.com/v1';
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // Find the testator
  const testator = doc.persons.find(
    (p) => p.id === doc.estate.testatorPersonId
  );
  if (!testator) {
    throw new Error('Testator person record not found in INHERIT document');
  }

  // Create or update the Wealth.com client
  const clientPayload = {
    firstName: testator.givenName,
    lastName: testator.familyName,
    email: testator.contact?.email,
    phone: testator.contact?.phone,
    dateOfBirth: testator.dateOfBirth,
    stateOfResidence: extractStateFromJurisdiction(doc.estate.domicile),
    address: testator.contact?.address
      ? mapToWealthAddress(testator.contact.address)
      : undefined,
  };

  const clientRes = await fetch(`${baseUrl}/clients`, {
    method: 'POST',
    headers,
    body: JSON.stringify(clientPayload),
  });
  const client = await clientRes.json();
  const clientId = client.id;

  // Create people (excluding the testator, who is already the client)
  const nonTestatorPersons = doc.persons.filter(
    (p) => p.id !== doc.estate.testatorPersonId
  );

  for (const person of nonTestatorPersons) {
    await fetch(`${baseUrl}/clients/${clientId}/people`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        firstName: person.givenName,
        lastName: person.familyName,
        middleName: person.additionalName,
        email: person.contact?.email,
        phone: person.contact?.phone,
        dateOfBirth: person.dateOfBirth,
        relationshipType: mapInheritRolesToWealth(person.roles),
        address: person.contact?.address
          ? mapToWealthAddress(person.contact.address)
          : undefined,
      }),
    });
  }

  // Create trusts
  for (const trust of doc.trusts ?? []) {
    await fetch(`${baseUrl}/clients/${clientId}/trusts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: trust.name,
        type: mapInheritTrustTypeToWealth(trust.trustType, trust.creationType),
        revocable: trust.revocability === 'revocable',
        isTestamentary: trust.isTestamentary ?? false,
        governingState: extractStateFromJurisdiction(trust.governingLaw),
      }),
    });
  }

  // Create assets (convert minor units back to dollars)
  for (const asset of doc.assets ?? []) {
    await fetch(`${baseUrl}/clients/${clientId}/assets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: asset.name,
        type: mapInheritCategoryToWealth(asset.category),
        subtype: asset.subcategory,
        value: asset.estimatedValue
          ? asset.estimatedValue.amount / 100
          : undefined,
        institution: asset.location,
        accountNumber: asset.identifiers?.[0]?.value,
        notes: asset.notes,
      }),
    });
  }

  // Upload documents
  for (const document of doc.documents ?? []) {
    await fetch(`${baseUrl}/clients/${clientId}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: document.title,
        type: mapInheritDocTypeToWealth(document.type),
        notes: document.notes,
      }),
    });
  }

  return { clientId };
}

// --- Helper functions ---

function extractStateFromJurisdiction(jurisdiction: any): string | undefined {
  const code = jurisdiction?.code;
  if (code?.startsWith('US-')) {
    return code.substring(3);
  }
  return undefined;
}

function mapToWealthAddress(addr: any): any {
  return {
    line1: addr.streetAddress,
    city: addr.addressLocality,
    state: addr.addressRegion,
    zip: addr.postalCode,
    country: addr.addressCountry ?? 'US',
  };
}

function mapInheritRolesToWealth(roles: string[]): string {
  // Wealth.com uses a single relationship type; pick the primary role
  if (roles.includes('executor')) return 'executor';
  if (roles.includes('trustee')) return 'trustee';
  if (roles.includes('guardian')) return 'guardian';
  if (roles.includes('attorney')) return 'attorney';
  if (roles.includes('witness')) return 'witness';
  return 'beneficiary';
}

function mapInheritTrustTypeToWealth(
  trustType: string,
  creationType?: string
): string {
  if (creationType === 'testamentary') return 'testamentary';
  if (trustType === 'charitable') return 'charitable';
  if (trustType === 'disabled_persons') return 'special_needs';
  return 'revocable_living';
}

function mapInheritCategoryToWealth(category: string): string {
  const catMap: Record<string, string> = {
    financial: 'investment',
    vehicle: 'vehicle',
    property_contents: 'personal_property',
    business: 'business',
    digital: 'digital',
  };
  return catMap[category] ?? 'personal_property';
}

function mapInheritDocTypeToWealth(type: string): string {
  const docMap: Record<string, string> = {
    will: 'will',
    trust_deed: 'trust_agreement',
    power_of_attorney: 'power_of_attorney',
    death_certificate: 'death_certificate',
    insurance_policy: 'insurance_policy',
  };
  return docMap[type] ?? 'other';
}
```

## Edge Cases

**Real estate:** Wealth.com Assets include real estate, but INHERIT separates real property into `property.json` (a dedicated schema with land registry references, tenure type, and room-level detail). When importing from Wealth.com, detect real estate assets and map them to INHERIT `property` records rather than `asset` records.

**Multiple roles per person:** INHERIT allows a person to hold multiple roles simultaneously (e.g. `["beneficiary", "executor"]`), whilst Wealth.com typically assigns a single relationship type. When importing, check whether a person appears in multiple contexts (e.g. listed as both a trustee on a trust and a beneficiary elsewhere) and merge roles into a single INHERIT person record.

**Monetary values:** Wealth.com stores values as decimal dollars. INHERIT stores all monetary amounts as integer minor units (pennies/cents). Always multiply by 100 on import and divide by 100 on export. Use `Math.round()` to avoid floating-point precision errors.

**Companion estates (mirror wills):** Wealth.com Client Groups may contain two clients with mirror wills. In INHERIT, these become two separate `estate` records linked via `companionEstateId` and `mirrorWillId`. Ensure both estates are created and cross-referenced.

**Ester AI parsed data:** Wealth.com's Ester AI engine extracts structured data from uploaded documents. When this data is available, use it to populate INHERIT fields but mark the provenance as `{ source: "ai_extracted", tool: "wealth.com/ester" }` and set `humanVerified: false` until a professional reviews it.

**Beneficiary designations on accounts:** US financial accounts (IRAs, 401(k)s, life insurance) often have beneficiary designations that override the will. Wealth.com may track these separately from trust/will beneficiaries. In INHERIT, model these as dedicated `bequest` records with appropriate notes indicating they are transfer-on-death designations, not testamentary gifts.

**US-specific fields:** Wealth.com is a US-focused platform. Fields like SSN, state of residence, and community property status are US-specific. INHERIT handles these through its jurisdiction-neutral design — SSN maps to `identifiers[]`, state maps to `domicile` with ISO 3166-2 codes, and property regime maps to `defaultPropertyRegime`.

## Authentication

Wealth.com's API uses **OAuth 2.0 with Authorization Code + PKCE** for user-facing integrations and **Basic Auth** for server-to-server access.

### OAuth 2.0 (recommended for user-facing integrations)

1. **Register your application** at [developer.wealth.com](https://developer.wealth.com) to obtain a client ID and client secret.
2. **Redirect the user** to the Wealth.com authorisation endpoint:
   ```
   https://auth.wealth.com/authorize
     ?response_type=code
     &client_id=YOUR_CLIENT_ID
     &redirect_uri=https://yourapp.com/callback
     &scope=clients.read clients.write people.read trusts.read assets.read documents.read
     &code_challenge=YOUR_PKCE_CHALLENGE
     &code_challenge_method=S256
   ```
3. **Exchange the authorisation code** for an access token at the token endpoint.
4. **Use the access token** in the `Authorization: Bearer <token>` header on all API requests.
5. **Refresh tokens** before expiry to maintain continuous access.

### Basic Auth (server-to-server)

For SFTP bulk transfers and backend integrations, Wealth.com supports HTTP Basic Authentication with an API key:

```
Authorization: Basic base64(api_key_id:api_key_secret)
```

### SFTP Access

SFTP credentials are provisioned separately through the Wealth.com partner portal. Files are made available on a scheduled basis (typically daily) at `sftp.wealth.com`.

> **Note:** Full API documentation, including rate limits, pagination, and error codes, requires partner access at [developer.wealth.com](https://developer.wealth.com). The field mappings marked "[exact field TBC -- requires API access]" in this guide will be confirmed once partner API credentials are available.
