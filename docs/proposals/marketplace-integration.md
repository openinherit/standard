# Marketplace Integration Guide

How to resolve INHERIT's `externalLinks` and `platformListingId` fields into rich product data using marketplace APIs.

## Introduction

INHERIT assets include two fields designed for marketplace integration:

- **`externalLinks`** on the `Asset` schema — an array of `{ system, id, url }` objects linking an asset to external databases, marketplaces, and registries (Chrono24, Discogs, Companies House, Land Registry, etc.).
- **`platformListingId`** on the `Valuation.comparables[]` schema — the platform-specific listing identifier for a comparable sale (eBay item number, Catawiki lot ID, Chrono24 ref, etc.).

Both fields are deliberately platform-agnostic strings. The `system` or `platform` field tells you *which* API to call; the `id` or `platformListingId` tells you *what to look up*. This guide shows how to resolve these identifiers into rich product data, comparable sales, and market valuations using real marketplace APIs.

All code examples use TypeScript with the native `fetch` API. No third-party HTTP libraries are required.

---

## eBay Browse API

The eBay Browse API v1 lets you resolve a `platformListingId` (eBay item number) into full listing data including sold price, sale date, and item details.

### Resolving a comparable

Given a comparable with `platform: "eBay"` and `platformListingId: "123456789012"`, call:

```
GET https://api.ebay.com/buy/browse/v1/item/v1|{item_id}|0
```

### TypeScript example

```typescript
interface EbayItemResponse {
  itemId: string;
  title: string;
  price: { value: string; currency: string };
  itemEndDate: string;
  condition: string;
  image: { imageUrl: string };
  seller: { username: string; feedbackPercentage: string };
}

async function resolveEbayComparable(
  platformListingId: string,
  accessToken: string,
): Promise<{
  title: string;
  salePrice: { amount: number; currency: string };
  saleDate: string;
}> {
  // eBay Browse API expects the legacy item ID in v1|{id}|0 format
  const itemRef = `v1|${platformListingId}|0`;
  const url = `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(itemRef)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
    },
  });

  if (!response.ok) {
    throw new Error(`eBay API error: ${response.status} ${response.statusText}`);
  }

  const item: EbayItemResponse = await response.json();

  // Map to INHERIT Comparable fields
  // INHERIT uses integer minor units (pennies/cents)
  const priceInMinorUnits = Math.round(parseFloat(item.price.value) * 100);
  const saleDate = item.itemEndDate
    ? item.itemEndDate.substring(0, 10) // ISO date portion
    : new Date().toISOString().substring(0, 10);

  return {
    title: item.title,
    salePrice: {
      amount: priceInMinorUnits,
      currency: item.price.currency,
    },
    saleDate,
  };
}
```

### Mapping to INHERIT fields

| eBay response field     | INHERIT `Comparable` field |
| ----------------------- | -------------------------- |
| `title`                 | `title`                    |
| `price.value`           | `salePrice.amount` (convert to minor units) |
| `price.currency`        | `salePrice.currency`       |
| `itemEndDate`           | `saleDate` (date portion)  |
| `condition`             | `matchNotes` (append)      |
| eBay listing URL        | `url`                      |

### Requirements

- **eBay Developer account** — register at [developer.ebay.com](https://developer.ebay.com)
- **OAuth 2.0 Application token** — use the Client Credentials flow for public data (no user login required)
- Rate limits apply per application; the Browse API allows 5,000 calls/day on the basic tier

---

## Chrono24

Chrono24 is the world's largest watch marketplace. INHERIT assets can link to Chrono24 via `externalLinks`:

```json
{
  "system": "chrono24",
  "id": "12345678",
  "url": "https://www.chrono24.co.uk/rolex/ref-116610ln--id12345678.htm"
}
```

### API access

Chrono24 maintains a public reference database of watch specifications, but **full API access requires a commercial partnership**. Contact Chrono24's B2B team for API credentials.

For publicly accessible data, their reference pages provide:

- Brand, model, and reference number
- Case material, diameter, and movement type
- Current market price range (asking prices, not sold prices)
- Price trend charts

### Mapping to INHERIT fields

| Chrono24 data            | INHERIT `Asset` field                        |
| ------------------------ | -------------------------------------------- |
| Brand name               | `brand` (or `brand.name`)                    |
| Model name               | `model`                                      |
| Reference number         | `identifiers[].value` (system: `manufacturer_ref`) |
| Market price range       | Informs `Valuation.valuedAmount`             |
| Case material            | `attributes` or `notes`                      |
| Movement                 | `attributes` or `notes`                      |

### Note on scraping

Do not scrape Chrono24. Their terms of service prohibit automated access outside the API programme. Use the `url` field in `externalLinks` for human-clickable links and the API for programmatic access.

---

## Discogs API

Discogs is the definitive database for vinyl records, CDs, and music releases. INHERIT assets can link via `externalLinks`:

```json
{
  "system": "discogs",
  "id": "1234567",
  "url": "https://www.discogs.com/release/1234567"
}
```

### Resolving a release

```
GET https://api.discogs.com/releases/{id}
```

### TypeScript example

```typescript
interface DiscogsRelease {
  id: number;
  title: string;
  artists: Array<{ name: string }>;
  labels: Array<{ name: string; catno: string }>;
  year: number;
  genres: string[];
  styles: string[];
  formats: Array<{ name: string; descriptions: string[] }>;
  identifiers: Array<{ type: string; value: string }>;
  lowest_price: number | null;
  community: { have: number; want: number };
}

async function resolveDiscogsRelease(
  releaseId: string,
  userAgent: string,
): Promise<{
  brand: string;
  model: string;
  identifiers: Array<{ system: string; value: string }>;
  estimatedValue: number | null;
}> {
  const url = `https://api.discogs.com/releases/${releaseId}`;

  const response = await fetch(url, {
    headers: {
      // Discogs requires a descriptive User-Agent header
      'User-Agent': userAgent,
    },
  });

  if (!response.ok) {
    throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
  }

  const release: DiscogsRelease = await response.json();

  // Map Discogs fields to INHERIT Asset fields
  // In music context: label = brand, title = model
  const primaryLabel = release.labels[0]?.name ?? 'Unknown label';
  const catalogueNumber = release.labels[0]?.catno ?? '';

  const identifiers: Array<{ system: string; value: string }> = [];

  // Add catalogue number as an identifier
  if (catalogueNumber) {
    identifiers.push({ system: 'discogs_catno', value: catalogueNumber });
  }

  // Add any barcodes or matrix numbers
  for (const ident of release.identifiers) {
    if (ident.type === 'Barcode') {
      identifiers.push({ system: 'barcode', value: ident.value });
    }
    if (ident.type === 'Matrix / Runout') {
      identifiers.push({ system: 'matrix', value: ident.value });
    }
  }

  // lowest_price is in USD; convert to minor units
  const estimatedValue = release.lowest_price
    ? Math.round(release.lowest_price * 100)
    : null;

  return {
    brand: primaryLabel,   // label → brand
    model: release.title,  // release title → model
    identifiers,
    estimatedValue,
  };
}
```

### Mapping to INHERIT fields

| Discogs response field     | INHERIT `Asset` field                  |
| -------------------------- | -------------------------------------- |
| `labels[0].name`           | `brand` (record label as brand)        |
| `title`                    | `model`                                |
| `labels[0].catno`          | `identifiers[]` (system: `discogs_catno`) |
| `identifiers[].Barcode`    | `identifiers[]` (system: `barcode`)    |
| `year`                     | `dateAcquired` context or `notes`      |
| `lowest_price`             | Informs `Valuation.valuedAmount`       |
| `community.want`           | Useful for demand-based valuation      |

### Requirements

- **Free API** — no cost, no account required for basic lookups
- **User-Agent header required** — must be a descriptive string, e.g. `InheritApp/1.0 +https://openinherit.org`
- **Rate limit:** 60 requests/minute (unauthenticated), 240/minute (authenticated with personal access token)
- Register at [discogs.com/developers](https://www.discogs.com/developers) for authenticated access

---

## Companies House API (UK)

UK business interests recorded in INHERIT can link to Companies House:

```json
{
  "system": "companieshouse",
  "id": "12345678",
  "url": "https://find-and-update.company-information.service.gov.uk/company/12345678"
}
```

### Resolving a company

```
GET https://api.company-information.service.gov.uk/company/{company_number}
```

### TypeScript example

```typescript
interface CompaniesHouseCompany {
  company_name: string;
  company_number: string;
  company_status: string;
  type: string;
  date_of_creation: string;
  registered_office_address: {
    address_line_1: string;
    address_line_2?: string;
    locality: string;
    postal_code: string;
    country?: string;
  };
  sic_codes: string[];
  accounts: {
    last_accounts: { made_up_to: string };
  };
}

async function resolveCompaniesHouse(
  companyNumber: string,
  apiKey: string,
): Promise<{
  companyName: string;
  companyNumber: string;
  status: string;
  incorporationDate: string;
  registeredAddress: string;
  sicCodes: string[];
}> {
  const url = `https://api.company-information.service.gov.uk/company/${companyNumber}`;

  // Companies House uses HTTP Basic Auth with API key as username, no password
  const credentials = btoa(`${apiKey}:`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Companies House API error: ${response.status} ${response.statusText}`);
  }

  const company: CompaniesHouseCompany = await response.json();

  const addr = company.registered_office_address;
  const registeredAddress = [
    addr.address_line_1,
    addr.address_line_2,
    addr.locality,
    addr.postal_code,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    companyName: company.company_name,
    companyNumber: company.company_number,
    status: company.company_status,
    incorporationDate: company.date_of_creation,
    registeredAddress,
    sicCodes: company.sic_codes ?? [],
  };
}
```

### Mapping to INHERIT fields

For assets with `category: "business_interest"`, the Companies House response maps to the `businessInterest` sub-object:

| Companies House field         | INHERIT `Asset.businessInterest` field |
| ----------------------------- | -------------------------------------- |
| `company_name`                | `businessName`                         |
| `company_number`              | `registrationNumber`                   |
| `company_status`              | `status` context                       |
| `type`                        | `entityType` context                   |
| `date_of_creation`            | `incorporationDate`                    |
| `registered_office_address`   | `registeredAddress`                    |
| `sic_codes`                   | `industryClassification`               |

### Requirements

- **Free API** — no cost
- **API key required** — register at [developer.company-information.service.gov.uk](https://developer.company-information.service.gov.uk)
- **Rate limit:** 600 requests per 5-minute window
- Data is public record under the Open Government Licence

---

## Wikidata SPARQL

INHERIT's `brand` field supports a structured form with a `wikidataId` (Q-number):

```json
{
  "brand": {
    "name": "Rolex",
    "wikidataId": "Q62288"
  }
}
```

This Q-number unlocks the entire Wikidata knowledge graph for structured brand data.

### SPARQL query example

Fetch founding year, country, logo, official website, and parent company for a brand:

```sparql
SELECT ?brandLabel ?foundingYear ?countryLabel ?logoUrl ?website ?parentLabel WHERE {
  wd:Q62288 rdfs:label ?brandLabel .
  FILTER(LANG(?brandLabel) = "en")

  OPTIONAL {
    wd:Q62288 wdt:P571 ?inception .
    BIND(YEAR(?inception) AS ?foundingYear)
  }
  OPTIONAL {
    wd:Q62288 wdt:P17 ?country .
    ?country rdfs:label ?countryLabel .
    FILTER(LANG(?countryLabel) = "en")
  }
  OPTIONAL { wd:Q62288 wdt:P154 ?logoUrl . }
  OPTIONAL { wd:Q62288 wdt:P856 ?website . }
  OPTIONAL {
    wd:Q62288 wdt:P749 ?parent .
    ?parent rdfs:label ?parentLabel .
    FILTER(LANG(?parentLabel) = "en")
  }
}
LIMIT 1
```

### TypeScript example

```typescript
interface WikidataBrandData {
  name: string;
  foundingYear: number | null;
  country: string | null;
  logoUrl: string | null;
  website: string | null;
  parentCompany: string | null;
}

async function resolveWikidataBrand(
  wikidataId: string,
): Promise<WikidataBrandData> {
  const sparql = `
    SELECT ?brandLabel ?foundingYear ?countryLabel ?logoUrl ?website ?parentLabel WHERE {
      wd:${wikidataId} rdfs:label ?brandLabel .
      FILTER(LANG(?brandLabel) = "en")
      OPTIONAL {
        wd:${wikidataId} wdt:P571 ?inception .
        BIND(YEAR(?inception) AS ?foundingYear)
      }
      OPTIONAL {
        wd:${wikidataId} wdt:P17 ?country .
        ?country rdfs:label ?countryLabel .
        FILTER(LANG(?countryLabel) = "en")
      }
      OPTIONAL { wd:${wikidataId} wdt:P154 ?logoUrl . }
      OPTIONAL { wd:${wikidataId} wdt:P856 ?website . }
      OPTIONAL {
        wd:${wikidataId} wdt:P749 ?parent .
        ?parent rdfs:label ?parentLabel .
        FILTER(LANG(?parentLabel) = "en")
      }
    }
    LIMIT 1
  `;

  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'InheritApp/1.0 (https://openinherit.org)',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata SPARQL error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const bindings = data.results.bindings[0];

  if (!bindings) {
    throw new Error(`No Wikidata results for ${wikidataId}`);
  }

  return {
    name: bindings.brandLabel?.value ?? '',
    foundingYear: bindings.foundingYear?.value
      ? parseInt(bindings.foundingYear.value, 10)
      : null,
    country: bindings.countryLabel?.value ?? null,
    logoUrl: bindings.logoUrl?.value ?? null,
    website: bindings.website?.value ?? null,
    parentCompany: bindings.parentLabel?.value ?? null,
  };
}
```

### How the response enriches product pages

| Wikidata property          | Use case                                      |
| -------------------------- | --------------------------------------------- |
| Brand label                | Display name with correct capitalisation       |
| Founding year (P571)       | "Est. 1905" badge on product cards             |
| Country (P17)              | Country flag or "Swiss Made" indicator          |
| Logo (P154)                | Brand logo on product pages and catalogue views |
| Official website (P856)    | Link to manufacturer's site                    |
| Parent company (P749)      | "A subsidiary of LVMH" context line            |

### Requirements

- **Free, no API key** — the Wikidata Query Service is open
- **User-Agent header required** — identify your application
- **Rate limit:** be respectful; batch queries where possible, cache aggressively
- SPARQL endpoint: `https://query.wikidata.org/sparql`

---

## HM Land Registry (UK)

INHERIT property assets can link to the Land Registry:

```json
{
  "system": "landregistry",
  "id": "DN123456",
  "url": "https://search-property-information.service.gov.uk/"
}
```

### Available data

HM Land Registry provides two tiers of data:

#### 1. Price Paid Data (open data, no account required)

Historical transaction prices for properties in England and Wales. Available as:

- **Bulk CSV download** — updated monthly at [gov.uk/government/statistical-data-sets/price-paid-data-downloads](https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads)
- **Linked Data API** — query by postcode, street, or UPRN

Example query for recent sales on a street:

```
GET https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.street=HIGH+STREET&propertyAddress.town=OXFORD&_pageSize=10&_sort=-transactionDate
```

Price Paid records include:

| Land Registry field        | Use case                                         |
| -------------------------- | ------------------------------------------------ |
| `pricePaid`                | Comparable sale price for property valuations     |
| `transactionDate`          | Maps to `Comparable.saleDate`                     |
| `propertyAddress`          | Verification and display                          |
| `propertyType`             | Detached, semi-detached, terraced, flat           |
| `newBuild`                 | Context for valuation adjustments                 |

#### 2. Title Register (account required)

Ownership details, charges, restrictions, and title plans. Requires a registered account at the HM Land Registry portal. Costs apply per title (currently GBP 3 per title register, GBP 7 per title plan).

Title data is relevant to estate administration for:

- Confirming the deceased owned the property
- Identifying joint ownership (joint tenants vs tenants in common)
- Checking for charges, mortgages, or restrictions
- Verifying boundaries

### Requirements

- **Price Paid Data:** free, open data, no API key
- **Title Register:** account at [gov.uk/search-property-information](https://www.gov.uk/search-property-information), per-title fees apply
- **Linked Data API:** free, no authentication, rate-limited

---

## Pattern: Building a Product Page

This section demonstrates how to assemble a rich product page for a **Rolex Submariner** by resolving multiple INHERIT fields against different APIs. The asset in INHERIT might look like:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  "category": "collectables_and_antiques",
  "subcategory": "watches",
  "brand": {
    "name": "Rolex",
    "wikidataId": "Q62288",
    "website": "https://www.rolex.com"
  },
  "model": "Submariner Date",
  "identifiers": [
    { "system": "manufacturer_ref", "value": "126610LN" },
    { "system": "serial", "value": "7A3B9C2D" }
  ],
  "externalLinks": [
    {
      "system": "chrono24",
      "id": "12345678",
      "url": "https://www.chrono24.co.uk/rolex/ref-126610ln--id12345678.htm"
    }
  ],
  "images": [
    { "url": "https://storage.example.com/watches/sub-overview.jpg", "viewType": "overview" },
    { "url": "https://storage.example.com/watches/sub-dial.jpg", "viewType": "detail" },
    { "url": "https://storage.example.com/watches/sub-caseback.jpg", "viewType": "identification" },
    { "url": "https://storage.example.com/watches/sub-box.jpg", "viewType": "packaging" }
  ]
}
```

With a valuation containing comparables:

```json
{
  "id": "v9876543-2100-abcd-ef01-234567890abc",
  "entityType": "asset",
  "entityId": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  "valuedAmount": { "amount": 1025000, "currency": "GBP" },
  "valuationDate": "2026-03-15",
  "method": "comparable_sales",
  "comparables": [
    {
      "platform": "eBay",
      "platformListingId": "204987654321",
      "title": "Rolex Submariner 126610LN 2023 Box & Papers",
      "salePrice": { "amount": 985000, "currency": "GBP" },
      "saleDate": "2026-02-20",
      "matchConfidence": "close"
    },
    {
      "platform": "eBay",
      "platformListingId": "204876543210",
      "title": "Rolex Submariner Date 126610LN Unworn 2024",
      "salePrice": { "amount": 1075000, "currency": "GBP" },
      "saleDate": "2026-03-01",
      "matchConfidence": "exact"
    }
  ]
}
```

### Resolution sequence

The following steps resolve all external references into display-ready data:

#### Step 1 — Brand enrichment via Wikidata

Read `brand.wikidataId` ("Q62288") and query Wikidata SPARQL:

```typescript
const brandData = await resolveWikidataBrand('Q62288');
// → { name: "Rolex", foundingYear: 1905, country: "Switzerland",
//     logoUrl: "https://commons.wikimedia.org/...", website: "https://www.rolex.com",
//     parentCompany: null }
```

**Renders:** brand logo, "Est. 1905", Swiss flag, link to rolex.com.

#### Step 2 — Marketplace data via Chrono24

Read `externalLinks` where `system === "chrono24"` and resolve the `id`:

```typescript
const chrono24Link = asset.externalLinks.find((l) => l.system === 'chrono24');
if (chrono24Link) {
  // With API access: fetch specifications and market price range
  // Without API access: link to the public URL for manual reference
  console.log(`Chrono24 listing: ${chrono24Link.url}`);
}
```

**Renders:** current market price range, watch specifications, link to Chrono24 listing.

#### Step 3 — Comparable sold prices via eBay

Read `valuation.comparables[]` where `platform === "eBay"` and resolve each `platformListingId`:

```typescript
const ebayToken = await getEbayAccessToken();

const enrichedComparables = await Promise.all(
  valuation.comparables
    .filter((c) => c.platform === 'eBay' && c.platformListingId)
    .map(async (comparable) => {
      const ebayData = await resolveEbayComparable(
        comparable.platformListingId!,
        ebayToken,
      );
      return {
        ...comparable,
        // Enrich with live data (or confirm cached data is still accurate)
        title: ebayData.title,
        salePrice: ebayData.salePrice,
        saleDate: ebayData.saleDate,
      };
    }),
);
```

**Renders:** comparable sales table with prices, dates, and links to original listings.

#### Step 4 — Photography gallery from images

Read `images[]` and group by `viewType`:

```typescript
const imagesByView = new Map<string, typeof asset.images>();
for (const img of asset.images) {
  const group = imagesByView.get(img.viewType) ?? [];
  group.push(img);
  imagesByView.set(img.viewType, group);
}

// Display order: overview first, then detail, identification, packaging
const displayOrder = ['overview', 'detail', 'identification', 'packaging', 'condition', 'provenance'];
```

**Renders:** categorised gallery — hero image from "overview", detail shots, serial number photo from "identification", box/papers from "packaging".

#### Step 5 — Identifiers display

Read `identifiers[]` and present key reference numbers:

```typescript
const refNumber = asset.identifiers.find((i) => i.system === 'manufacturer_ref');
const serial = asset.identifiers.find((i) => i.system === 'serial');

// → Reference: 126610LN
// → Serial: 7A3B9C2D
```

**Renders:** reference number and serial number in a specifications panel.

### Assembled product page structure

```
┌─────────────────────────────────────────────────┐
│  [Rolex logo]  Rolex  ·  Est. 1905  ·  Swiss    │
│  rolex.com                                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Hero image: overview]                          │
│                                                  │
│  Submariner Date                                 │
│  Ref. 126610LN  ·  Serial 7A3B9C2D              │
│                                                  │
│  Estimated value: £10,250.00                     │
│  Based on 2 comparable sales                     │
│                                                  │
├─────────────────────────────────────────────────┤
│  Gallery                                         │
│  [overview] [detail] [identification] [packaging]│
├─────────────────────────────────────────────────┤
│  Comparable Sales                                │
│  ┌───────────────────────────────────┐           │
│  │ £9,850  · 20 Feb 2026  · close   │           │
│  │ £10,750 · 01 Mar 2026  · exact   │           │
│  └───────────────────────────────────┘           │
├─────────────────────────────────────────────────┤
│  Market Data (Chrono24)                          │
│  Current range: £9,500 – £11,200                 │
│  View on Chrono24 →                              │
└─────────────────────────────────────────────────┘
```

### Key principles

1. **Resolve, don't duplicate.** INHERIT stores identifiers, not full marketplace data. Always resolve at display time for current data.
2. **Cache aggressively.** Marketplace APIs have rate limits. Cache resolved data with a TTL appropriate to the source (Wikidata: days; eBay sold prices: hours; Chrono24 market range: hours).
3. **Degrade gracefully.** If an API is unavailable, display what you have from the INHERIT document. The `url` field in `externalLinks` always provides a human-clickable fallback.
4. **Respect rate limits.** Batch requests where possible. Use `Promise.all` for independent lookups, but add concurrency limits for large estates with hundreds of assets.
5. **Audit trail.** When you resolve a comparable via API, record the `capturedAt` date on the comparable and optionally store a `screenshotUrl` for evidential purposes.
