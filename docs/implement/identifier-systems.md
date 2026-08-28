# Identifier Systems Guide

Every asset in INHERIT can carry an `identifiers` array — a list of typed references that link the item to recognized catalog numbers, serial numbers, certificate IDs, and other external systems. Using standardized identifiers makes it dramatically easier for executors, valuers, and dealers to locate, verify, and appraise items.

## How identifiers work

Each entry in the `identifiers` array has three fields:

```json
{
  "system": "uri-or-short-code",
  "value": "the-actual-number"
}
```

- **system** — A URI or short code identifying which numbering system the value belongs to.
- **value** — The identifier itself, exactly as it appears in the source catalog or on the item.

You can attach as many identifiers as needed. A single model railway locomotive might carry a Hornby catalogue number, a Bachmann item number, and a personal collection inventory code.

---

## Collectibles — Model Railways

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `hornby:catalogue` | Hornby Catalogue Number | Printed on the box end-flap and in the annual Hornby catalogue | `R3804` |
| `bachmann:item` | Bachmann Item Number | Box label, Bachmann website product page | `32-929` |
| `lima:ref` | Lima Reference | Original box label (Lima ceased production; numbers found in collector guides) | `205143` |
| `dapol:item` | Dapol Item Number | Box label, Dapol website | `4D-022-001` |
| `hattons:sku` | Hattons SKU | Hattons.co.uk product listing | `H4-PEN-014A` |
| `heljan:item` | Heljan Item Number | Box label | `3400` |

**Tips:** For OO-gauge items, the catalogue number is the single most important identifier for resale. Include the livery variant suffix where applicable (e.g., `R3804` vs `R3804X` for DCC-fitted). For kit-built or brass models, use a freeform description in the asset notes instead.

---

## Collectibles — Stamps

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `sg:number` | Stanley Gibbons SG Number | Stanley Gibbons catalogue (the standard UK reference) | `SG 1` |
| `scott:number` | Scott Catalogue Number | Scott Standard Postage Stamp Catalogue (the standard US reference) | `US 1` |
| `michel:number` | Michel Number | Michel catalogue (the standard European reference, published in Germany) | `DR 1` |
| `yvert:number` | Yvert et Tellier Number | Yvert catalogue (standard French reference) | `FR 1` |

**Tips:** Always record which edition of the catalogue the number comes from, as numbering can shift between editions. For GB stamps, the SG number is almost always what a UK dealer expects. For worldwide collections, record both the SG and the local standard (Scott for US, Michel for Europe).

---

## Collectibles — Coins

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `krause:km` | Krause KM Number | Standard Catalog of World Coins (Krause Publications) | `KM#896` |
| `spink:ref` | Spink Reference | Coins of England and the United Kingdom (Spink & Son) | `S.4561` |
| `ngc:cert` | NGC Certification Number | NGC slab label or NGC online verification | `5880834-003` |
| `pcgs:cert` | PCGS Certification Number | PCGS slab label or PCGS Cert Verification tool | `37128654` |

**Tips:** For graded coins in NGC or PCGS slabs, the certification number is the most valuable identifier — it links directly to the grade, photographs, and auction history. For raw (ungraded) coins, the Spink reference is standard in the UK and the Krause KM number works internationally.

---

## Jewellery & Watches

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `rolex:serial` | Rolex Serial Number | Engraved between the lugs at 6 o'clock (older models) or on the rehaut (newer) | `V832914` |
| `rolex:model` | Rolex Model/Reference Number | Engraved between the lugs at 12 o'clock | `116610LN` |
| `omega:ref` | Omega Reference Number | Case back or inside case back | `311.30.42.30.01.005` |
| `cartier:serial` | Cartier Serial Number | Case back engraving | `12345AB` |
| `gia:cert` | GIA Certificate Number | GIA diamond grading report; also laser-inscribed on the girdle | `2141438171` |
| `uk:hallmark` | UK Hallmark | Stamped on the item — includes assay office mark, fineness, date letter | `London, 750, y` |
| `ags:cert` | AGS Certificate Number | AGS Laboratories diamond grading report | `104064587001` |

**Tips:** For watches, record both the serial number and the model reference — together they identify the exact variant and production year. For precious metal jewellery, photograph the hallmark rather than trying to transcribe tiny punch marks. For diamonds over 0.3 ct, the GIA or AGS certificate number is essential for valuation.

---

## Art

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `art:artist-title` | Artist + Title Convention | Standard description format used by auction houses | `Lowry, L.S. — Going to the Match` |
| `cat-raisonne:ref` | Catalogue Raisonné Reference | Published catalogue raisonné for the artist | `Wildenstein D.342` |
| `gallery:inventory` | Gallery Inventory Number | Label on the back of the frame or gallery records | `WG-2019-0042` |
| `artuk:id` | Art UK Work ID | Art UK website (artuk.org), for publicly owned works | `artuk-w-12345` |
| `rkd:id` | RKD Images Number | Netherlands Institute for Art History (rkd.nl) | `52678` |

**Tips:** Always record the medium, dimensions, and whether the work is signed. For prints and multiples, include the edition number (e.g., `15/250`). Photographs of the back of the canvas or frame often reveal gallery labels, exhibition stickers, and provenance notes that are more useful than the front for identification.

---

## Vehicles

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `vin` | Vehicle Identification Number | Dashboard plaque (visible through windscreen), door jamb sticker, V5C document | `WBAPH5C55BA123456` |
| `uk:reg` | UK Registration Number | Number plates, V5C document | `AB12 CDE` |
| `uk:v5c` | V5C Document Reference | Top-right of the V5C registration certificate | `BG12345678` |
| `dvla:ref` | DVLA Reference | DVLA correspondence | `DVL/123/456/789` |

**Tips:** The VIN is the universal vehicle identifier and should always be recorded. For classic cars without a 17-character VIN, use the chassis number or engine number as found on the heritage certificate. Always photograph the V5C — the executor will need it for ownership transfer.

---

## Firearms

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `firearm:serial` | Firearm Serial Number | Engraved or stamped on the receiver/frame | `B78432` |
| `uk:fac` | UK Firearms Certificate Reference | Firearms certificate issued by the local police force | `FAC/12345/2024` |
| `uk:sgc` | UK Shotgun Certificate Reference | Shotgun certificate issued by the local police force | `SGC/67890/2024` |
| `uk:rfd` | Registered Firearms Dealer Number | Dealer's premises certificate | `RFD 123` |

**Tips:** In the UK, firearms are held on either a Section 1 Firearms Certificate (FAC) or a Section 2 Shotgun Certificate (SGC). On the death of the certificate holder, the executor must notify the police firearms licensing department immediately. Record the serial number exactly as it appears on the certificate — it must match the physical item. Never store firearms certificate scans in unsecured digital systems.

---

## Books & Manuscripts

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `isbn` | International Standard Book Number | Copyright page, back cover, or barcode area | `978-0-14-044913-6` |
| `isbn10` | ISBN-10 (legacy) | Older books published before 2007 | `0-14-044913-4` |
| `oclc` | OCLC Number | WorldCat record (worldcat.org) | `12345678` |
| `estc` | English Short Title Catalogue | British Library ESTC for pre-1800 printed works | `T12345` |
| `rare:collation` | Bibliographic Collation | Rare book trade format: author, title, place, date, edition points | `Dickens. Bleak House. London, 1853. First edition in book form, bound from parts.` |

**Tips:** For modern books, the ISBN is sufficient. For rare and antiquarian books, the ISBN is often irrelevant — dealers rely on edition points (binding state, issue points, provenance). Include a note on condition using the standard abbreviations: Fine, Near Fine, Very Good, Good, Fair, Poor. For manuscripts, note the number of pages/leaves, the material (paper, vellum), and whether the item has been professionally cataloged.

---

## Vinyl Records

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `discogs:release` | Discogs Release ID | Discogs.com release page URL | `1234567` |
| `matrix:number` | Matrix/Runout Number | Etched or stamped in the dead wax near the label | `SHVL-804-A-1` |
| `label:cat` | Label Catalogue Number | Printed on the record label and sleeve spine | `PCS 7027` |

**Tips:** The matrix number in the dead wax is the most reliable way to identify a specific pressing — it distinguishes first pressings from later runs even when the catalogue number is the same. Always check both sides. For valuable records, note the label variant (e.g., UK 1st press Parlophone yellow/black vs later silver/black). The Discogs release ID links to a community-maintained database with pressing details and current market values.

---

## Wine & Spirits

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `livex:lwin` | Liv-ex LWIN Code | Liv-ex.com (London International Vintners Exchange) | `1014033` |
| `wine:chateau-vintage` | Château + Vintage | Bottle label | `Château Margaux 2005` |
| `parker:score` | Robert Parker Score Reference | Wine Advocate / RobertParker.com | `WA 98+` |
| `whisky:distillery-age` | Distillery + Age Statement | Bottle label | `Macallan 18 Year Sherry Oak` |

**Tips:** For fine wine, the Liv-ex LWIN is the industry-standard identifier used by merchants, auction houses, and storage facilities. Always record the bottle format (750ml, magnum, etc.) and storage provenance (professional bonded warehouse vs home cellar). For spirits, the distillery name, age statement, and bottling year are the key identifiers — cask numbers are a bonus for single-cask releases.

---

## Financial

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `uk:sortcode-account` | UK Sort Code + Account Number | Bank statements, cheque book, online banking | `12-34-56 / 12345678` |
| `iban` | International Bank Account Number | Bank statements, online banking | `GB29NWBK60161331926819` |
| `isin` | International Securities Identification Number | Share certificates, broker statements | `GB0002634946` |
| `cusip` | CUSIP (US/Canadian securities) | Broker statements (US/Canada) | `037833100` |
| `sedol` | SEDOL (UK/Irish securities) | London Stock Exchange data, broker statements | `0263494` |
| `uk:nino` | National Insurance Number | HMRC correspondence, pension statements | `QQ 12 34 56 C` |
| `pension:ref` | Pension Scheme Reference | Annual pension statement | `NEST/123456/789` |
| `ns-i:ref` | NS&I Reference (Premium Bonds, etc.) | NS&I correspondence, online account | `123456789` |

**Tips:** For bank accounts, always record the full sort code and account number pair — neither alone is sufficient. For investments, the ISIN is the universal identifier and can be used to look up any publicly traded security worldwide. For UK pensions, include the scheme name and the member reference from the most recent annual statement. For Premium Bonds, the NS&I holder number is needed for the executor to make a claim.

---

## Digital

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `domain:registrar` | Domain Registrar + Domain Name | WHOIS lookup, registrar account | `Cloudflare: example.com` |
| `social:handle` | Social Media Handle | The profile URL or handle | `@openinherit on Twitter/X` |
| `crypto:btc` | Bitcoin Wallet Address | Wallet software, exchange account | `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh` |
| `crypto:eth` | Ethereum Wallet Address | Wallet software, exchange account | `0x71C7656EC7ab88b098defB751B7401B5f6d8976F` |
| `apple:id` | Apple ID | Settings on any Apple device, iCloud account | `user@icloud.com` |
| `google:account` | Google Account | Google account settings page | `user@gmail.com` |

**Tips:** Digital assets are easy to overlook and hard to recover without credentials. Record the platform, the username or handle, and — critically — how to access the account (password manager entry, recovery email, 2FA method). For cryptocurrency, the wallet address alone is not enough; the executor needs access to the private key or seed phrase, which should be stored securely and referenced (not embedded) in the asset record.

---

## Marketplace and Registry Identifiers

### GTIN / EAN / UPC (Universal Product Codes)

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `gtin` | Global Trade Item Number | Barcode on product packaging; GS1 registry, UPCitemdb.com, or Open Food Facts API | `5012345678900` |
| `ean` | European Article Number | Barcode on product packaging (synonym for 13-digit GTIN) | `5012345678900` |
| `upc` | Universal Product Code | Barcode on product packaging (12-digit, US/Canada) | `012345678905` |

**Use case:** Any physical product with a barcode — consumer electronics, household goods, packaged items.

---

### Watch Marketplaces

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `chrono24:ref` | Chrono24 Listing Reference | Chrono24 listing page; resolves via Chrono24 API to watch specifications, market value, price history | `abc123` |
| `watchcharts:ref` | WatchCharts Reference | WatchCharts listing; resolves to price index, 12-month trend, comparable sales data | `rolex-submariner-116610ln` |

**Tips:** These complement the manufacturer serial and model reference numbers in the Jewellery & Watches section above. Use marketplace references to capture current market valuations and price trends for watch collections.

---

### Company Registries

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `companieshouse:number` | UK Companies House Company Number | Companies House website (8 digits); resolves via Companies House API (free, no key required) to directors, filing history, accounts, share capital, insolvency status | `12345678` |
| `sec:cik` | US SEC Central Index Key | EDGAR company search; resolves via EDGAR API to company filings, financial statements | `0000320193` |
| `abn` | Australian Business Number | ABN Lookup (abr.business.gov.au); resolves via ABR API | `51 824 753 556` |

**Tips:** For estates involving business interests, the company registration number is essential for establishing directorship, shareholding, and any outstanding obligations. The Companies House API is free and requires no API key — useful for automated verification.

---

### Property Registries

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `uk:landregistry:title` | HM Land Registry Title Number | Title register or property deeds; resolves to ownership data, title plan, price paid history | `DN123456` |
| `us:parcel` | US County Parcel/APN Number | County assessor records; varies by county | `123-456-789` |
| `au:torrens:title` | Australian Torrens Title Number | State land titles office | `Vol 1234 Fol 567` |

**Tips:** Property title numbers are the definitive proof of ownership and are critical for transferring real estate in an estate. For UK properties, the Land Registry title number links to the official register of title and title plan. For US properties, the parcel/APN number format varies by county — always record the county alongside it.

---

### Art Databases

| System URI | Name | Where to Find It | Example Value |
|---|---|---|---|
| `artnet:id` | Artnet Identifier | Artnet.com artist or artwork page; resolves to price database, auction results, market analytics | `artnet-12345` |
| `artlossregister:ref` | Art Loss Register Reference | Art Loss Register search result; used to verify an artwork is not stolen — legally required for high-value art sales in many jurisdictions | `ALR-2024-56789` |
| `artuk:id` | Art UK Work Identifier | Art UK website (artuk.org), for publicly owned works | `artuk-w-12345` |

**Tips:** For high-value artworks, always obtain an Art Loss Register check before sale — this is a legal requirement in many jurisdictions and failure to do so can void a transaction. The `artuk:id` system also appears in the Art section above; use whichever section is most natural for your asset type.

---

## Best practices

1. **Always prefer the most specific system.** A Rolex serial number is more useful than "watch serial number."
2. **Record identifiers exactly as printed.** Do not reformat, pad, or normalize — let downstream systems handle that.
3. **Attach multiple identifiers when available.** A coin in an NGC slab has both a Krause KM number and an NGC certification number. Record both.
4. **Use the `notes` field for context.** If the identifier is partially illegible or comes from an uncertain source, say so.
5. **Photograph the identifier.** A photo of the hallmark, serial number engraving, or certificate is worth more than a transcription.
