# Asset Location Classes

Every asset in INHERIT has a `category` that determines its location class — whether the asset exists physically at a property, in a financial institution, in digital infrastructure, or as an intangible right.

## Location Class Reference

### Physical Assets

Physical assets exist as tangible objects at a real-world location. Set `propertyId` to the property where the item is stored or kept.

| Category | Description |
|----------|-------------|
| `vehicle` | Cars, motorcycles, boats, caravans |
| `property_contents` | Furniture, electronics, kitchenware, tools, garden equipment, sports equipment |
| `jewellery_watches` | Jewellery, watches, and precious items |
| `art` | Paintings, sculptures, prints |
| `antiques` | Antique furniture, ceramics, silverware of historical value |
| `collectibles` | Stamps, coins, trading cards, memorabilia |
| `musical_instruments` | Pianos, guitars, violins |
| `books_manuscripts` | Physical book collections and manuscripts |
| `wine_spirits` | Wine cellars, whisky collections |
| `clothing_textiles` | High-value clothing, textiles, and accessories |
| `firearms_sporting` | Licensed firearms and sporting equipment |

### Financial Assets

Financial assets are held by institutions. `propertyId` should be `null` — these assets do not have a physical location at a property.

| Category | Description |
|----------|-------------|
| `financial` | Bank accounts, savings, investments, pensions, shares, premium bonds, insurance |
| `islamic_financial` | Sukuk, takaful, Shariah-compliant deposits |

### Business Assets

Business assets represent ownership stakes and commercial interests. `propertyId` should be `null`.

| Category | Description |
|----------|-------------|
| `business` | Business ownership stakes, partnerships, intellectual property |

### Digital Assets

Digital assets exist in online infrastructure. `propertyId` should be `null`.

| Category | Description |
|----------|-------------|
| `digital` | Cryptocurrency, domain names, social media accounts, digital subscriptions |

### Other

The `other` category is a catch-all for assets that do not fit the above classifications. Set `propertyId` based on whether the asset has a physical location.

## The `propertyId` Rule

Set `propertyId` to a valid `Property.id` for physical assets — it records which property the item is located at. This is useful for executors who need to visit properties to catalogue and collect estate assets.

Leave `propertyId` null (or omit it) for financial, digital, and intangible assets. These assets are not stored at a physical property. Their location is captured in the `location` free-text field or via `identifiers` (account numbers, policy references, etc.).

### Example

```json
{
  "id": "d4e5f6a7-b8c9-0123-def4-56789abcdef0",
  "name": "Steinway Model B grand piano",
  "category": "musical_instruments",
  "propertyId": "p0000000-0000-0000-0000-000000000001",
  "estimatedValue": { "amount": 8500000, "currency": "GBP" },
  "condition": "excellent",
  "location": "Drawing room, ground floor"
}
```

```json
{
  "id": "e5f6a7b8-c9d0-1234-ef56-789abcdef012",
  "name": "Barclays current account",
  "category": "financial",
  "estimatedValue": { "amount": 1245032, "currency": "GBP" },
  "identifiers": [
    { "type": "sort_code", "value": "20-45-67" },
    { "type": "account_number", "value": "12345678" }
  ]
}
```

## Summary Table

| Location Class | Categories | `propertyId` | Count |
|----------------|-----------|--------------|-------|
| Physical | vehicle, property_contents, jewellery_watches, art, antiques, collectibles, musical_instruments, books_manuscripts, wine_spirits, clothing_textiles, firearms_sporting | Set to property | 11 |
| Financial | financial, islamic_financial | Null | 2 |
| Business | business | Null | 1 |
| Digital | digital | Null | 1 |
| Other | other | Depends on asset | 1 |
