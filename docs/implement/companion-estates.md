# Companion Estate Semantics

Design document for how companion (household/couples) estates work in INHERIT. This defines the vocabulary, expected behaviour, sync rules, and schema implications.

## What Is a Companion Estate?

A companion estate is two or more estates linked via a companion relationship. Each person has their own estate and their own will, but they share a household. The companion link allows shared visibility over jointly held assets, mutual contacts, and household information — without merging the estates into one.

Companion estates model reality: a married couple each has their own legal estate, but they need to see each other's plans, coordinate on jointly owned assets, and share information about their children. INHERIT keeps the estates separate (because wills are individual documents) while providing a structured way to express the shared context.

## Ownership Categories

Every asset in a companion estate would have an `ownershipCategory` that determines sync behaviour, edit permissions, and visibility. Note: `ownershipCategory` is a proposed field — it does not yet exist in v3/asset.json. The categories below define the intended design:

| Category | Meaning | Example |
|----------|---------|---------|
| `joint` | Both partners own it | Family home, joint savings account |
| `sole_partner_interest` | One partner owns it, but the other needs to know about it | A pension, a life insurance policy naming the partner as beneficiary |
| `sole_no_partner_interest` | One partner owns it privately — the other has no reason to see it | A specialist collection, personal hobby equipment, a business interest the partner is not involved in |
| `sole` | Default for non-coupled estates, or assets that predate the companion link | Everything in a single-person estate |

The `sole` value is the default. When an estate has no companion link, every asset is implicitly `sole`. When a companion link is established, the testator classifies their assets into the appropriate category.

## Companion Link Lifecycle

A companion link moves through a defined lifecycle:

```
invited → active → decoupling → decoupled
```

### States

- **`invited`** — One partner has initiated the link. The other has not yet accepted. No data is shared in this state.
- **`active`** — Both partners have accepted. Sync rules apply. Shared visibility is enabled.
- **`decoupling`** — One partner has initiated decoupling. A snapshot of shared data is being prepared. Both partners retain read access to shared items during this transition.
- **`decoupled`** — The link is severed. Each estate is fully independent. Shared data has been copied to both estates.

### Rules

- **Unilateral initiation:** either partner can invite.
- **Mutual acceptance:** both partners must accept for the link to become active.
- **Unilateral decoupling:** either partner can initiate decoupling. Consent from the other party is not required — this is a deliberate design choice to prevent one partner from trapping the other in a shared arrangement.
- **No re-linking:** once decoupled, a new invitation must be sent to re-establish the link. The previous link's history is preserved for audit purposes.

## Shared vs Private Entities

### People

People referenced in an estate can be shared with the companion or kept private:

- **Shared people** — children, mutual friends, shared professional contacts. Both partners can see and reference them. Set `sharedWithCompanion: true` on the person record.
- **Private people** — one partner's siblings from a previous relationship, a personal solicitor, an estranged family member. Only visible to the owning estate.

A shared person appears in both estates' `people` arrays. Each estate holds its own copy — the `sharedWithCompanion` flag indicates that changes should be synchronised.

### Assets

Asset sharing is controlled by the `ownershipCategory` field on each asset. See the sync rules table below.

### Other Entities

Bequests, executors, guardians, trusts, and wishes are always private to their estate. They reference shared people and assets by ID, but the bequest itself belongs to one estate only. This reflects the legal reality: a will is an individual document.

## Sync Rules

| Ownership Category | Syncs to companion? | Who can edit? | Companion sees? |
|--------------------|---------------------|---------------|-----------------|
| `joint` | Yes | Both partners | Full read/write |
| `sole_partner_interest` | Yes (read-only copy) | Owner only | Read-only |
| `sole_no_partner_interest` | No | Owner only | No |
| `sole` | No | Owner only | No |

**Sync direction:** changes to a `joint` asset propagate bidirectionally. Changes to a `sole_partner_interest` asset propagate from owner to companion (read-only). Private assets never propagate.

**Conflict resolution for joint assets:** if both partners edit a joint asset simultaneously, the most recent write wins (last-write-wins). Implementations should display a warning when a joint asset has been modified by the companion since the user last viewed it.

## Decoupling Semantics

When a companion link moves to `decoupled`:

1. **Joint assets** are copied to both estates. Each estate gets an independent copy with `ownershipCategory` reset to `sole`. Neither partner loses any data.
2. **Sole, partner interest assets** — the read-only copy in the companion's estate is removed. The owner retains the original.
3. **Shared people** are copied to both estates. Each estate gets an independent copy with `sharedWithCompanion` reset to `false`.
4. **Private items** are unaffected.

After decoupling, each estate is fully independent. No references between the estates remain. Both partners retain all the data they had access to at the moment of decoupling.

## Malicious Deletion Protection

When a companion link is `active`, shared data requires additional safeguards:

### Soft Deletes Only

All deletions of shared items (joint assets, sole_partner_interest assets, shared people) must be soft deletes while companions are linked. The record is marked as deleted but not removed from storage.

### Companion Restore

The companion can see soft-deleted shared items and restore them. This prevents one partner from destroying shared records without the other's knowledge.

### Audit Trail

All changes to shared items must be recorded in an audit trail:
- Who made the change
- What changed
- When it changed
- The previous value

### Bulk Deletion Alert

If a partner deletes more than 3 shared items in a single session, the companion receives a notification. This is a safety measure, not a permission gate — the deletion still proceeds, but the companion is informed.

## Schema Implications

This design introduces the following fields:

### estate.json

| Field | Type | Description |
|-------|------|-------------|
| `companionLinkStatus` | string enum: `invited`, `active`, `decoupling`, `decoupled` | Current state of the companion link. Absent if the estate has never been linked. |
| `linkedAt` | string (date) | ISO 8601 date when the companion link became `active`. |
| `decoupledAt` | string (date) | ISO 8601 date when the companion link became `decoupled`. |

Note: the existing `companionEstateId` field on estate.json already provides the cross-reference to the linked estate. The new fields describe the state of that link.

### asset.json (proposed — not yet in schema)

| Field | Type | Description |
|-------|------|-------------|
| `ownershipCategory` | string enum: `joint`, `sole_partner_interest`, `sole_no_partner_interest`, `sole` | How this asset relates to the companion estate. Default: `sole`. **Proposed field — not yet added to v3/asset.json.** |

### person.json

| Field | Type | Description |
|-------|------|-------------|
| `sharedWithCompanion` | boolean | Whether this person is shared with the companion estate. Default: `false`. |

### All entities (optional)

Any entity may include an optional `visibility` field referencing `common/visibility.json`. The existing visibility enum includes `companion_visible` as one of its values, which integrates naturally with the companion estate model.

## Implementation Notes

- **The companion link is an application-layer concept.** The INHERIT schema records the state; it does not enforce sync rules. Implementations are responsible for propagating changes according to the sync rules documented here.
- **The `companionEstateId` on estate.json links two estates.** Both estates should reference each other — if estate A's `companionEstateId` points to estate B, then estate B's `companionEstateId` should point to estate A.
- **Decoupling is idempotent.** If both partners initiate decoupling simultaneously, the result is the same as if one partner initiated it.
- **The schema supports polygamous households** (common in Islamic and African customary law) through multiple companion links. Each pair of linked estates follows the same rules. A testator's estate can have multiple `companionEstateId` references via the `x-inherit-*` extension mechanism, though the core schema models the primary companion only.
