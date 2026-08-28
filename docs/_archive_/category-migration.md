# Category Migration Guide

This document maps the 33 legacy category values to the new 16 top-level category system. The new system uses broader top-level categories with an optional freeform `subcategory` field for additional specificity.

## How migration works

When migrating from the old category values:

1. Replace the old `category` value with the corresponding new top-level category from the table below.
2. Optionally set the `subcategory` field to preserve the original specificity.
3. The `subcategory` field is **freeform text** — it is not constrained to a fixed set of values. The suggestions below are conventions, not enforced enums. You can use any descriptive string that makes sense for the item.

Items that already use the new category values require no changes.

---

## Migration Table

| Old Value | New Category | Suggested Subcategory | Notes |
|---|---|---|---|
| `bank_account` | `financial` | `bank_account` | Includes current accounts, joint accounts, and basic deposit accounts. |
| `savings_account` | `financial` | `savings_account` | ISAs, fixed-term savings, and notice accounts all map here. |
| `investment` | `financial` | `investment` | General investment accounts, funds, and platforms (e.g., Hargreaves Lansdown, Vanguard). |
| `pension` | `financial` | `pension` | Defined benefit, defined contribution, SIPP, and state pension entitlements. |
| `shares` | `financial` | `shares` | Directly held equities. For shares held within an investment wrapper, use `investment` instead. |
| `premium_bonds` | `financial` | `bonds` | NS&I Premium Bonds and other government bond products. The subcategory `bonds` covers all bond types. |
| `cryptocurrency` | `digital` | `cryptocurrency` | Bitcoin, Ethereum, and all other crypto assets. Ensure wallet access information is securely documented. |
| `insurance` | `financial` | `insurance` | Life insurance, critical illness cover, and other policies with a payout or surrender value. |
| `vehicle` | `vehicle` | *(user should specify)* | Cars, motorcycles, boats, caravans, tractors. Set subcategory to the specific vehicle type. |
| `jewellery` | `jewellery_watches` | `jewellery` | Rings, necklaces, bracelets, brooches, and loose gemstones. |
| `art` | `art` | *(null)* | Paintings, drawings, prints, sculpture, and photography. Use subcategory to specify medium if desired. |
| `antiques` | `antiques` | *(null)* | General antiques not covered by more specific categories. Use subcategory for type (e.g., `ceramics`, `silver`, `clocks`). |
| `collectibles` | `collectibles` | *(null)* | Broad category — consider whether the item fits better under a more specific category like `art`, `books_manuscripts`, or `wine_spirits`. Set subcategory to the collection type (e.g., `model_railways`, `stamps`, `coins`, `toys`). |
| `furniture` | `property_contents` | `furniture` | Tables, chairs, beds, wardrobes, and other household furniture. For antique furniture with significant value, consider using `antiques` instead. |
| `electronics` | `property_contents` | `electronics` | Computers, televisions, audio equipment, cameras. For items with collector value (e.g., vintage hi-fi), consider `collectibles`. |
| `musical_instruments` | `musical_instruments` | *(null)* | Pianos, guitars, violins, brass, woodwind, and percussion. Use subcategory for instrument family if desired. |
| `books` | `books_manuscripts` | `books` | Modern books, first editions, and general libraries. For medieval or early modern manuscripts, use subcategory `manuscripts`. |
| `clothing` | `clothing_textiles` | `clothing` | Everyday clothing, designer fashion, vintage clothing, and costumes. |
| `kitchenware` | `property_contents` | `kitchenware` | Cookware, utensils, appliances, and tableware. For antique or collectible kitchenware (e.g., copper pans, vintage Le Creuset), consider `antiques` or `collectibles`. |
| `sports_equipment` | `firearms_sporting` | `sporting_equipment` | Golf clubs, fishing tackle, cricket bats, gym equipment. The `firearms_sporting` category covers all sporting goods. |
| `firearms` | `firearms_sporting` | `firearms` | Shotguns, rifles, and other Section 1/Section 2 items. Executor must notify police licensing immediately. |
| `wine_and_spirits` | `wine_spirits` | *(null)* | Wine, whisky, port, and other collectible beverages. Use subcategory for specificity (e.g., `red_wine`, `single_malt`). |
| `tools` | `property_contents` | `tools` | Hand tools, power tools, and workshop equipment. For specialist or antique tools, consider `collectibles` or `antiques`. |
| `garden_and_outdoor` | `property_contents` | `garden_outdoor` | Lawnmowers, garden furniture, BBQs, sheds, greenhouses. |
| `business_interest` | `business` | `business_interest` | Partnership shares, sole trader businesses, company directorships. |
| `intellectual_property` | `business` | `intellectual_property` | Patents, trademarks, copyrights, and design rights. |
| `domain_name` | `digital` | `domain_name` | Registered internet domain names. Record the registrar and expiry date. |
| `social_media_account` | `digital` | `social_media` | Twitter/X, Instagram, Facebook, LinkedIn, YouTube, and TikTok accounts. Record the handle and platform. |
| `digital_subscription` | `digital` | `subscription` | Streaming services, SaaS subscriptions, cloud storage, and paid memberships. Note which have recurring charges that should be canceled. |
| `sukuk` | `islamic_financial` | `sukuk` | Islamic bonds (Sharia-compliant fixed-income instruments). |
| `takaful` | `islamic_financial` | `takaful` | Islamic insurance (cooperative risk-sharing arrangements). |
| `islamic_deposit` | `islamic_financial` | `islamic_deposit` | Sharia-compliant deposit accounts (profit-sharing rather than interest-bearing). |
| `other` | `other` | *(null)* | Catch-all for items that do not fit any defined category. Add a descriptive subcategory to aid future categorization. |

---

## The 16 new top-level categories

For reference, the complete set of new top-level categories is:

1. `financial`
2. `digital`
3. `vehicle`
4. `jewellery_watches`
5. `art`
6. `antiques`
7. `collectibles`
8. `property_contents`
9. `musical_instruments`
10. `books_manuscripts`
11. `clothing_textiles`
12. `firearms_sporting`
13. `wine_spirits`
14. `business`
15. `islamic_financial`
16. `other`

---

## Notes for implementors

- **Backward compatibility:** Systems reading INHERIT data should accept both old and new category values during the transition period. When encountering an old value, apply the mapping above.
- **Subcategory is optional:** The `subcategory` field may be `null`, an empty string, or absent entirely. Do not require it.
- **Subcategory is freeform:** The suggested subcategory values above are conventions for consistency, but any descriptive string is valid. A user might write `vintage_rolex` as a subcategory under `jewellery_watches` — that is perfectly acceptable.
- **One-way migration:** There is no need to support reverse migration from new categories back to old values. The old values are deprecated.
