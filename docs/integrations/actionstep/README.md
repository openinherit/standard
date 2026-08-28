# Actionstep Integration Guide

> **INHERIT v4** | Public document | Last updated: April 2026

Actionstep is a cloud-based legal practice management platform with particular strength in **New Zealand and Australia**. It provides dedicated estate planning and probate workflow templates through its Marketplace, making it a natural fit for INHERIT integration in the APAC region.

This guide shows how to map Actionstep's REST API entities to INHERIT v4 schemas, with field-level mappings, workflow alignment, and TypeScript code examples.

**Actionstep API documentation:** [docs.actionstep.com](https://docs.actionstep.com)

---

## Table of Contents

1. [Overview](#overview)
2. [Field Mappings](#field-mappings)
   - [Actions to estate.json](#actions--estatejson)
   - [Participants to person.json, executor.json, guardian.json](#participants--personjson--executorjson--guardianjson)
   - [Data Collections to custom estate fields](#data-collections--custom-estate-fields)
   - [Steps to estate lifecycle status](#steps--estate-lifecycle-status)
   - [Files to document.json](#files--documentjson)
3. [Estate Planning Workflow Template Mapping](#estate-planning-workflow-template-mapping)
4. [Probate Workflow Mapping](#probate-workflow-mapping)
5. [Code Examples](#code-examples)
6. [Authentication](#authentication)
7. [Edge Cases](#edge-cases)

---

## Overview

### What is Actionstep?

Actionstep is a legal workflow automation platform used primarily by law firms in New Zealand, Australia, the United Kingdom, and the United States. Unlike general-purpose CRMs, Actionstep models legal work as **Actions** (matters) with typed **Participants** (contacts with roles), **Steps** (workflow stages), and **Data Collections** (custom field sets) -- making it structurally closer to INHERIT's entity model than many competitors.

### Why Actionstep + INHERIT?

| Strength | Detail |
|----------|--------|
| **APAC market** | Dominant in NZ/AU estate planning firms |
| **Typed participants** | Participant types (Executor, Beneficiary, Trustee) map directly to INHERIT person roles |
| **Workflow templates** | Marketplace templates for estate planning and probate provide structured task sequences |
| **Data Collections** | Custom field sets allow estate-specific data capture beyond standard contact fields |
| **REST API** | Publicly documented, OAuth 2.0, programmatic access to all core entities |

### Key API Entities

| Actionstep Entity | INHERIT Equivalent | Notes |
|-------------------|--------------------|-------|
| Action | `estate.json` | A matter/case -- one Action per estate |
| Participant | `person.json` + role schemas | Contact linked to an Action with a typed role |
| Data Collection | Custom estate fields | Configurable field sets attached to Actions |
| Step | `estate.status` | Workflow stages within an Action |
| File (Document) | `document.json` | Files attached to an Action |

---

## Field Mappings

### Actions / `estate.json`

An Actionstep **Action** represents a legal matter. For estate work, each Action corresponds to one INHERIT estate record.

| Actionstep Field | INHERIT Field | Type | Notes |
|------------------|---------------|------|-------|
| `actions.id` | `estate.id` | UUID | Generate a v4 UUID; store Actionstep ID in `provenance.sourceSystemId` |
| `actions.name` | -- | string | Matter name (e.g. "Estate of Davies, James"). Not directly mapped -- used for display |
| `actions.reference` | -- | string | Firm's internal reference number. Store in `provenance.sourceSystemRef` if needed |
| `actions.actionTypeName` | `estate.willType` | string | Map Actionstep action type to INHERIT will type (see mapping table below) |
| `actions.status` | `estate.status` | enum | See [Steps mapping](#steps--estate-lifecycle-status) |
| `actions.createdTimestamp` | `estate.createdAt` | ISO 8601 | Direct mapping |
| `actions.modifiedTimestamp` | `estate.lastModifiedAt` | ISO 8601 | Direct mapping |
| `actions.assignedTo` [TBC] | -- | integer | Staff assignment -- not modelled in INHERIT |
| Data Collection fields | `estate.domicile`, `estate.willType`, etc. | varies | Estate-specific fields live in Data Collections, not on the Action itself |

#### Action Type to Will Type Mapping

| Actionstep Action Type | INHERIT `willType` |
|------------------------|--------------------|
| Estate Planning [TBC] | `secular` |
| Probate [TBC] | `secular` (inferred from existing will) |
| Trust Administration [TBC] | -- (maps to trust entities, not willType) |

### Participants / `person.json` + `executor.json` + `guardian.json`

Actionstep **Participants** are contacts linked to an Action with a **participantType** that defines their role. This maps naturally to INHERIT's `person.roles` array and the specialised role schemas.

#### Core Person Fields

| Actionstep Field | INHERIT Field | Type | Notes |
|------------------|---------------|------|-------|
| `participants.id` | -- | integer | Actionstep internal ID. Store in `provenance.sourceSystemId` |
| `participants.firstName` | `person.givenName` | string | Direct mapping |
| `participants.lastName` [TBC] | `person.familyName` | string | Direct mapping |
| `participants.middleName` [TBC] | `person.additionalName` | string | Direct mapping |
| `participants.preferredName` [TBC] | `person.preferredName` | string | Direct mapping if available |
| `participants.email` | `person.contact.email` | string | Direct mapping |
| `participants.phone` [TBC] | `person.contact.phone` | string | Direct mapping |
| `participants.dateOfBirth` [TBC] | `person.dateOfBirth` | date | Direct mapping |
| `participants.dateOfDeath` [TBC] | `person.dateOfDeath` | date | Available via Data Collections for deceased parties |
| `participants.companyName` [TBC] | -- | string | Maps to `organisation.json` if a firm/company |

#### Participant Type to INHERIT Role Mapping

| Actionstep participantType | INHERIT `person.roles[]` | Additional Schema |
|----------------------------|--------------------------|-------------------|
| `Client` / `Testator` [TBC] | `["testator"]` | -- |
| `Executor` [TBC] | `["executor"]` | Create `executor.json` record with `role: "primary"` |
| `Beneficiary` [TBC] | `["beneficiary"]` | -- |
| `Trustee` [TBC] | `["trustee"]` | -- |
| `Guardian` [TBC] | `["guardian"]` | Create `guardian.json` record |
| `Witness` [TBC] | `["witness"]` | -- |
| `Solicitor` / `Lawyer` [TBC] | -- | Professional contact, not an INHERIT person role. Store as `executor.json` with `isProfessional: true` if acting as professional executor |
| `Spouse` / `Partner` [TBC] | `["beneficiary"]` (typically) | Role depends on context. May also link via `estate.companionEstateId` |
| `Accountant` [TBC] | -- | Professional contact, not modelled as an INHERIT person role |

#### Executor-Specific Mapping

When a Participant has an executor-type role, create both a `person.json` and an `executor.json` record:

| Actionstep Field | INHERIT `executor.json` Field | Notes |
|------------------|-------------------------------|-------|
| participantType = Executor | `executor.role` | Map to `"primary"`, `"secondary"`, or `"substitute"` based on ordering or Data Collection fields |
| Company participant | `executor.isProfessional` | Set `true` if the participant is a company/firm |
| `participants.companyName` [TBC] | `executor.firmName` | Direct mapping for professional executors |
| Data Collection: Grant Reference [TBC] | `executor.grantReference` | Custom field from probate workflow |
| Data Collection: Grant Date [TBC] | `executor.grantDate` | Custom field from probate workflow |
| Data Collection: Issuing Court [TBC] | `executor.issuingCourt` | Custom field from probate workflow |

#### Guardian-Specific Mapping

| Actionstep Field | INHERIT `guardian.json` Field | Notes |
|------------------|-------------------------------|-------|
| participantType = Guardian [TBC] | `guardian.role` | Typically `"primary"` |
| Linked child participant [TBC] | `guardian.childPersonId` | Requires cross-referencing participant relationships |
| -- | `guardian.appointmentType` | Default to `"testamentary"` for estate planning matters |

### Data Collections / Custom Estate Fields

Actionstep **Data Collections** are configurable field sets attached to Action types. Estate planning and probate templates include pre-configured collections for estate-specific data that does not fit on standard Participant or Action records.

| Data Collection Field [TBC] | INHERIT Target | Notes |
|------------------------------|----------------|-------|
| Date of Death | `person.dateOfDeath` (testator) | On the testator's person record |
| Date of Birth | `person.dateOfBirth` (testator) | On the testator's person record |
| Domicile / Jurisdiction | `estate.domicile` | Map to INHERIT jurisdiction format (ISO 3166-1 alpha-2) |
| Will Date | `document.createdAt` (will document) | Date the will was executed |
| Grant of Probate Reference | `executor.grantReference` | On the primary executor's record |
| Grant Date | `executor.grantDate` | On the primary executor's record |
| Issuing Court / Registry | `executor.issuingCourt` | On the primary executor's record |
| Estate Value (Gross) [TBC] | -- | Not directly modelled in INHERIT core; available via asset aggregation |
| Estate Value (Net) [TBC] | -- | Not directly modelled in INHERIT core |
| IHT Reference [TBC] | `estate.taxReferences` [TBC] | Inheritance tax reference number |
| Marital Status [TBC] | -- | Inferred from companion estate link or person extensions |

> **Note:** Data Collection field names are configurable per Actionstep tenant. The names above are typical defaults from estate planning templates. Implementations must discover the actual field names via the Data Collections API endpoint.

### Steps / Estate Lifecycle Status

Actionstep **Steps** define the workflow stages within an Action. Estate planning and probate templates come with preconfigured step sequences that map to INHERIT's `estate.status` enum.

#### Estate Planning Template Steps

| Actionstep Step [TBC] | INHERIT `estate.status` | Notes |
|------------------------|-------------------------|-------|
| Initial Instructions / Client Intake | `planning` | Gathering client information |
| Drafting | `planning` | Will being drafted |
| Review / Approval | `planning` | Client reviewing the draft |
| Execution / Signing | `confirmed` | Will signed and witnessed |
| Storage / Filing | `confirmed` | Will stored securely |

#### Probate Template Steps

| Actionstep Step [TBC] | INHERIT `estate.status` | Notes |
|------------------------|-------------------------|-------|
| Death Notification / Initial Instructions | `pre_probate` | Death reported, matter opened |
| Gather Assets & Liabilities | `pre_probate` | Identifying and valuing the estate |
| Apply for Grant | `pre_probate` | Probate application submitted |
| Grant Issued | `in_administration` | Court has issued the grant |
| Collect Assets | `in_administration` | Calling in assets |
| Pay Debts & Liabilities | `in_administration` | Settling the estate's obligations |
| Distribute Estate | `distributed` | Assets distributed to beneficiaries |
| Final Accounts / Closure | `closed` | Administration complete |

> **Implementation note:** Actionstep Steps are ordered and trackable. When syncing, read the current Step of the Action and map it to the corresponding `estate.status` value. If the Step does not match any mapping, retain the previous INHERIT status and log a warning.

### Files / `document.json`

Actionstep **Files** (documents) are attached to Actions and optionally linked to Participants.

| Actionstep Field | INHERIT Field | Type | Notes |
|------------------|---------------|------|-------|
| `files.id` [TBC] | -- | integer | Store in `document.provenance.sourceSystemId` |
| `files.name` [TBC] | `document.title` | string | Direct mapping |
| `files.fileName` [TBC] | -- | string | Extract `fileFormat` from the extension |
| `files.extension` [TBC] | `document.fileFormat` | string | Lowercase, no leading dot |
| `files.fileSize` [TBC] | `document.fileSizeBytes` | integer | Direct mapping |
| `files.mimeType` [TBC] | `document.mimeType` | string | Direct mapping |
| `files.createdTimestamp` [TBC] | `document.createdAt` | ISO 8601 | Direct mapping |
| `files.folderName` [TBC] | -- | string | Actionstep folder structure; not modelled in INHERIT |
| -- | `document.type` | enum | Infer from file name/folder: files in a "Wills" folder map to `"will"`, "Grant" folder to `"grant_of_probate"`, etc. |
| -- | `document.storageRef` | string | Construct from Actionstep file download URL or store as `actionstep://files/{id}` |

#### Document Type Inference

| Actionstep Folder / Naming Convention [TBC] | INHERIT `document.type` |
|----------------------------------------------|-------------------------|
| Wills / Last Will | `will` |
| Codicil | `codicil` |
| Grant of Probate | `grant_of_probate` |
| Letters of Administration | `letters_of_administration` |
| Death Certificate | `death_certificate` |
| Trust Deed | `trust_deed` |
| Power of Attorney / EPA / LPA | `power_of_attorney` |
| Valuation | `valuation_report` |
| Tax Return / IHT | `tax_return` |
| Marriage Certificate | `marriage_certificate` |
| Other | `other` |

---

## Estate Planning Workflow Template Mapping

Actionstep's Marketplace includes estate planning workflow templates that provide a structured sequence of steps, participant types, and data collection fields for will preparation.

### Typical Template Structure

```
Estate Planning Template (Actionstep)
|
+-- Action Type: "Estate Planning" [TBC]
|   +-- Data Collections: Client details, estate details, wishes
|   +-- Participant Types: Testator, Spouse, Executor, Beneficiary, Guardian, Witness
|
+-- Steps (workflow):
|   1. Client Intake          --> INHERIT: estate.status = "planning"
|   2. Information Gathering   --> INHERIT: estate.status = "planning"
|   3. Instructions Confirmed  --> INHERIT: estate.status = "planning"
|   4. Will Drafting           --> INHERIT: estate.status = "planning"
|   5. Client Review           --> INHERIT: estate.status = "planning"
|   6. Execution Appointment   --> INHERIT: estate.status = "confirmed"
|   7. Will Signed             --> INHERIT: estate.status = "confirmed"
|   8. Storage & Filing        --> INHERIT: estate.status = "confirmed"
|
+-- Documents:
    +-- Draft Will             --> INHERIT: document.type = "will"
    +-- Signed Will            --> INHERIT: document.type = "will"
    +-- Client ID              --> INHERIT: document.type = "other"
    +-- Attendance Notes       --> INHERIT: document.type = "other"
```

### Mapping Approach

1. **Create the INHERIT estate** when the Actionstep Action is created, with `status: "planning"`.
2. **Sync participants** -- each Participant with a recognised participantType becomes a `person.json` entry with the appropriate `roles[]` value.
3. **Read Data Collections** for estate-specific fields (domicile, will type, special wishes) and map to the corresponding INHERIT fields.
4. **Monitor Step changes** -- when the Action advances to the "Will Signed" step (or equivalent), update `estate.status` to `"confirmed"`.
5. **Sync documents** as they are uploaded to the Action.

---

## Probate Workflow Mapping

Actionstep's probate templates model the post-death administration process, which maps closely to INHERIT's `pre_probate` through `closed` status lifecycle.

### Date-of-Death-Based Task Automation

Actionstep probate templates can trigger tasks based on the date of death, which corresponds to key INHERIT transitions:

| Trigger | Actionstep Behaviour [TBC] | INHERIT Mapping |
|---------|---------------------------|-----------------|
| Date of death entered | Open probate Action, set initial Step | Set `person.dateOfDeath` on testator; create estate with `status: "pre_probate"` |
| Asset gathering complete | Advance to "Apply for Grant" Step | Estate remains `"pre_probate"` |
| Grant issued | Advance to "Grant Issued" Step | Update `estate.status` to `"in_administration"`; populate `executor.grantDate`, `executor.grantReference`, `executor.issuingCourt` |
| Distribution complete | Advance to "Distribute" Step | Update `estate.status` to `"distributed"` |
| Final accounts filed | Advance to "Closure" Step | Update `estate.status` to `"closed"` |

### Probate-Specific Data Collection Fields

| Actionstep Field [TBC] | INHERIT Target | Notes |
|-------------------------|----------------|-------|
| Date of Death | `person.dateOfDeath` (testator) | Triggers probate workflow |
| Place of Death [TBC] | -- | Not directly modelled; use `person.notes` |
| Cause of Death [TBC] | -- | Not modelled in INHERIT (sensitive data) |
| Death Certificate Number [TBC] | `document.registryReference.referenceNumber` | On the death certificate document |
| Probate Registry [TBC] | `executor.issuingCourt` | NZ: High Court; AU: Supreme Court of relevant state |
| Grant Type [TBC] | `executor.grantType` | Map to INHERIT enum: `grant_of_probate`, `letters_of_administration`, etc. |
| IHT Form Reference [TBC] | -- | Tax-jurisdiction-specific; store in estate extensions |

### NZ/AU-Specific Considerations

Actionstep's probate templates reflect NZ and Australian court processes:

| Jurisdiction | Court | INHERIT `executor.issuingCourt` Example |
|-------------|-------|----------------------------------------|
| New Zealand | High Court of New Zealand | `"High Court of New Zealand, Wellington"` |
| New South Wales | Supreme Court of NSW | `"Supreme Court of New South Wales"` |
| Victoria | Supreme Court of Victoria | `"Supreme Court of Victoria"` |
| Queensland | Supreme Court of Queensland | `"Supreme Court of Queensland"` |
| Western Australia | Supreme Court of WA | `"Supreme Court of Western Australia"` |

For NZ estates, `executor.grantType` maps to:
- Probate (testate) -> `"grant_of_probate"`
- Letters of Administration (intestate) -> `"letters_of_administration"`
- Letters of Administration with Will Annexed -> `"letters_of_administration_with_will_annexed"`

---

## Code Examples

### Import: Actionstep Action to INHERIT Estate

```typescript
import type { Estate, Person, Executor, Document } from '@openinherit/sdk';
import { v4 as uuidv4 } from 'uuid';

interface ActionstepAction {
  id: number;
  name: string;
  reference: string;
  status: string;
  actionTypeName: string;
  createdTimestamp: string;
  modifiedTimestamp: string;
}

interface ActionstepParticipant {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  participantTypeName: string; // [TBC] exact field name
  dateOfBirth?: string;
}

/**
 * Maps an Actionstep Step name to an INHERIT estate status.
 */
function mapStepToStatus(stepName: string): Estate['status'] {
  const normalised = stepName.toLowerCase().trim();

  if (normalised.includes('intake') || normalised.includes('draft') || normalised.includes('review')) {
    return 'planning';
  }
  if (normalised.includes('sign') || normalised.includes('execut') || normalised.includes('storage')) {
    return 'confirmed';
  }
  if (normalised.includes('death') || normalised.includes('gather') || normalised.includes('apply')) {
    return 'pre_probate';
  }
  if (normalised.includes('grant issued') || normalised.includes('collect') || normalised.includes('pay debt')) {
    return 'in_administration';
  }
  if (normalised.includes('distribut')) {
    return 'distributed';
  }
  if (normalised.includes('clos') || normalised.includes('final')) {
    return 'closed';
  }

  return 'planning'; // default
}

/**
 * Maps an Actionstep participantType to INHERIT person roles.
 */
function mapParticipantTypeToRoles(participantType: string): Person['roles'] {
  const normalised = participantType.toLowerCase().trim();

  const roleMap: Record<string, Person['roles']> = {
    'client':      ['testator'],
    'testator':    ['testator'],
    'executor':    ['executor'],
    'beneficiary': ['beneficiary'],
    'trustee':     ['trustee'],
    'guardian':    ['guardian'],
    'witness':     ['witness'],
  };

  return roleMap[normalised] ?? [];
}

/**
 * Imports an Actionstep Action and its Participants into INHERIT format.
 */
async function importFromActionstep(
  action: ActionstepAction,
  participants: ActionstepParticipant[],
  currentStepName: string,
): Promise<{ estate: Estate; people: Person[]; executors: Executor[] }> {
  const people: Person[] = [];
  const executors: Executor[] = [];
  let testatorPersonId: string | undefined;

  for (const participant of participants) {
    const personId = uuidv4();
    const roles = mapParticipantTypeToRoles(participant.participantTypeName);

    if (roles.length === 0) continue; // skip unmapped roles (solicitors, accountants)

    const person: Person = {
      id: personId,
      givenName: participant.firstName,
      familyName: participant.lastName,
      additionalName: participant.middleName,
      roles,
      contact: {
        email: participant.email,
        phone: participant.phone,
      },
      dateOfBirth: participant.dateOfBirth,
      provenance: {
        source: 'imported',
        sourceSystem: 'actionstep',
        sourceSystemId: String(participant.id),
        humanVerified: false,
      },
    };

    people.push(person);

    if (roles.includes('testator')) {
      testatorPersonId = personId;
    }

    if (roles.includes('executor')) {
      executors.push({
        id: uuidv4(),
        personId,
        role: executors.length === 0 ? 'primary' : 'secondary',
        isProfessional: false,
        provenance: {
          source: 'imported',
          sourceSystem: 'actionstep',
          humanVerified: false,
        },
      });
    }
  }

  if (!testatorPersonId) {
    throw new Error(`No testator found in Action ${action.id} participants`);
  }

  const estate: Estate = {
    id: uuidv4(),
    testatorPersonId,
    status: mapStepToStatus(currentStepName),
    domicile: { country: 'NZ' }, // default for Actionstep APAC -- override from Data Collections
    createdAt: action.createdTimestamp,
    lastModifiedAt: action.modifiedTimestamp,
    provenance: {
      source: 'imported',
      sourceSystem: 'actionstep',
      sourceSystemId: String(action.id),
      sourceSystemRef: action.reference,
      humanVerified: false,
    },
  };

  return { estate, people, executors };
}
```

### Export: INHERIT Estate to Actionstep Action

```typescript
/**
 * Creates an Actionstep Action from an INHERIT estate.
 * Uses the Actionstep REST API.
 */
async function exportToActionstep(
  estate: Estate,
  people: Person[],
  executors: Executor[],
  accessToken: string,
  baseUrl: string,
): Promise<{ actionId: number }> {
  const testator = people.find(p => p.id === estate.testatorPersonId);
  if (!testator) throw new Error('Testator not found in people array');

  // 1. Create the Action
  const actionResponse = await fetch(`${baseUrl}/api/rest/actions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      actions: [{
        name: `Estate of ${testator.familyName}, ${testator.givenName}`,
        actionTypeName: 'Estate Planning', // [TBC] exact type name
      }],
    }),
  });

  const actionData = await actionResponse.json();
  const actionId = actionData.actions[0].id;

  // 2. Create Participants for each person
  for (const person of people) {
    const participantType = mapRoleToParticipantType(person.roles[0]);
    if (!participantType) continue;

    await fetch(`${baseUrl}/api/rest/participants`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participants: [{
          actionId,
          firstName: person.givenName,
          lastName: person.familyName,
          participantTypeName: participantType, // [TBC] exact field name
          email: person.contact?.email,
        }],
      }),
    });
  }

  return { actionId };
}

function mapRoleToParticipantType(role: string): string | null {
  const map: Record<string, string> = {
    testator: 'Client',       // [TBC]
    executor: 'Executor',     // [TBC]
    beneficiary: 'Beneficiary', // [TBC]
    trustee: 'Trustee',       // [TBC]
    guardian: 'Guardian',      // [TBC]
    witness: 'Witness',        // [TBC]
  };
  return map[role] ?? null;
}
```

### Sync: Actionstep File to INHERIT Document

```typescript
interface ActionstepFile {
  id: number;
  name: string;
  fileName: string;
  extension: string;
  fileSize: number;
  mimeType: string;
  createdTimestamp: string;
  folder?: string; // [TBC] folder/category name
}

function mapFileToDocument(file: ActionstepFile): Document {
  return {
    id: uuidv4(),
    type: inferDocumentType(file.folder, file.name),
    title: file.name,
    fileFormat: file.extension?.toLowerCase().replace(/^\./, ''),
    fileSizeBytes: file.fileSize,
    mimeType: file.mimeType,
    createdAt: file.createdTimestamp,
    storageRef: `actionstep://files/${file.id}`,
    provenance: {
      source: 'imported',
      sourceSystem: 'actionstep',
      sourceSystemId: String(file.id),
      humanVerified: false,
    },
  };
}

function inferDocumentType(folder?: string, fileName?: string): Document['type'] {
  const text = `${folder ?? ''} ${fileName ?? ''}`.toLowerCase();

  if (text.includes('will') && !text.includes('codicil')) return 'will';
  if (text.includes('codicil')) return 'codicil';
  if (text.includes('grant') || text.includes('probate')) return 'grant_of_probate';
  if (text.includes('death cert')) return 'death_certificate';
  if (text.includes('trust deed')) return 'trust_deed';
  if (text.includes('power of attorney') || text.includes('epa') || text.includes('lpa')) return 'power_of_attorney';
  if (text.includes('valuation')) return 'valuation_report';
  if (text.includes('tax') || text.includes('iht')) return 'tax_return';
  if (text.includes('marriage')) return 'marriage_certificate';

  return 'other';
}
```

---

## Authentication

Actionstep uses **OAuth 2.0 Authorization Code** flow. There is no client credentials (machine-to-machine) grant -- all access requires user consent.

### Token Lifecycle

| Token | Lifetime | Notes |
|-------|----------|-------|
| Access token | **8 hours** | Short-lived; must be refreshed frequently |
| Refresh token | **21 days** | Rolling -- each use extends the 21-day window |

### Flow

1. **Authorise:** Redirect the user to `https://{instance}.actionstep.com/api/oauth/authorize` with `response_type=code`, `client_id`, `redirect_uri`, and `scope`.
2. **Exchange:** POST the authorisation code to `https://{instance}.actionstep.com/api/oauth/token` to receive access and refresh tokens.
3. **Refresh:** Before the access token expires (8 hours), POST the refresh token to the same endpoint to obtain a new pair.

### Implementation Notes

- **Instance-specific URLs:** Each Actionstep tenant has its own subdomain (`{firm}.actionstep.com`). The base URL must be configurable per client.
- **Token storage:** The 8-hour access token lifetime means background sync processes must refresh proactively. Store the refresh token securely and refresh the access token well before expiry (e.g. at the 7-hour mark).
- **No client credentials grant:** Unattended sync requires storing a refresh token from an initial user authorisation. If the refresh token expires (21 days of inactivity), the user must re-authorise.
- **Rate limits:** Actionstep's rate limits are dynamic and undisclosed. Implement exponential backoff on `429 Too Many Requests` responses.

```typescript
interface ActionstepTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date; // 8 hours from issue
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  instanceUrl: string,
): Promise<ActionstepTokens> {
  const response = await fetch(`${instanceUrl}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}
```

---

## Edge Cases

### 1. Multiple Roles per Person

A single Actionstep Participant may appear multiple times on an Action with different participantTypes (e.g. a person who is both Executor and Beneficiary). INHERIT handles this natively -- a single `person.json` entry can have `roles: ["executor", "beneficiary"]`. When importing, deduplicate participants by name/ID and merge their roles into a single INHERIT person record.

### 2. Professional Executors

Actionstep may represent a professional executor as a **Company** participant rather than an individual. When the participant is a company:
- Create an `executor.json` record with `isProfessional: true` and `firmName` set to the company name.
- Use `organisationId` instead of `personId` on the executor record.

### 3. Data Collection Field Discovery

Data Collection field names are **tenant-configurable**. The field names in this guide are typical defaults, but each Actionstep instance may use different names. Implementations must:
1. Query the Data Collection definitions via the API.
2. Match fields by name pattern or custom mapping configuration.
3. Fail gracefully when expected fields are missing.

### 4. Multi-Jurisdiction Estates

Actionstep typically creates one Action per matter. A cross-border estate (e.g. NZ assets + AU assets) may be modelled as:
- **One Action** with Data Collection fields noting multiple jurisdictions, or
- **Multiple Actions** (one per jurisdiction).

INHERIT models this as a single estate with per-asset `applicableLaw` overrides. When importing multiple Actionstep Actions for the same deceased person, consider merging into a single INHERIT estate record.

### 5. Step Names Are Not Standardised

Actionstep workflow templates can be customised by each firm. The step-to-status mapping in this guide assumes default template names. Implementations should:
- Allow configurable step-to-status mapping per Actionstep tenant.
- Log unmapped steps rather than failing silently.

### 6. File Download and Content

Actionstep file download requires a separate API call (typically `GET /api/rest/files/{id}/content` [TBC]). For INHERIT's `document.content` field (base64-encoded), download the file content separately. For large files, prefer `document.storageRef` over embedding content.

### 7. 8-Hour Token Expiry During Long Syncs

For large estates with many participants and documents, a full sync may take long enough for the access token to expire mid-operation. Implement a token-aware HTTP client that checks `expiresAt` before each request and refreshes proactively.

### 8. Deleted or Archived Actions

Actionstep may soft-delete or archive closed Actions. When syncing, check the Action status and handle archived matters appropriately -- typically mapping them to `estate.status: "closed"` rather than deleting the INHERIT record.

### 9. NZ/AU Date Formats

Actionstep instances in NZ/AU may return dates in local formats (dd/MM/yyyy) in some contexts, despite the API generally using ISO 8601. Always parse dates defensively and normalise to ISO 8601 (`YYYY-MM-DD`) for INHERIT fields.

### 10. Currency and Monetary Amounts

INHERIT represents all monetary amounts as **integer minor units** (e.g. cents, not dollars). Actionstep may store values as decimal strings or floats. When importing monetary values from Data Collections, convert to minor units: `Math.round(parseFloat(value) * 100)`.

For NZD and AUD, the minor unit is cents (1/100). Ensure the correct currency code is set on any INHERIT monetary fields.
