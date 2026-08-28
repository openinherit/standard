---
title: "Backoffice — Extensions Administration"
version: "2.0"
status: draft
date: 2026-04-11T17:00
lastmod: 2026-04-15T23:30
author: "Rich Davies"
source: "docs/backoffice-extensions-admin.md"
---

## Concept

A backoffice application at `backoffice.openinherit.org` for administrating INHERIT extensions. Database-first with PR-based publishing to the schema repo.

## Key design decisions

1. **Scope:** Registry metadata + schema properties (not just metadata)
2. **Users:** Admin (Rich, Josh) + partner organisations with employees
3. **Data flow:** Database first → "Publish" button generates schema files → creates GitHub PR → review before merge
4. **Auth:** Supabase Auth with magic links (no passwords)
5. **Login:** Single login page, context-aware — adapts to show admin branding or partner org context after email entry
6. **Stack:** Supabase Postgres + Auth, Next.js App Router on Vercel

## User model

### Hierarchy

```
INHERIT Admin (Rich, Josh)
  └── Partner Organisation (e.g. Campbell & Co Solicitors)
        ├── Org Admin (can invite/remove team members)
        └── Org Member (edit access only)
```

### Organisations

- Invited by INHERIT admins (invite-only, no self-registration)
- Assigned to one or more extensions with roles: succession, tax, or both
- Assignment model: (org, extension, roles[]) — e.g. KPMG → Scotland (tax), Ireland (tax), UAE (succession)
- Minimum data captured: org name, first extension assignment, org admin email
- Org admin receives magic link invitation, then invites their own team

### Three levels of access

| Capability | INHERIT Admin | Org Admin | Org Member |
|------------|--------------|-----------|------------|
| See all extensions | Yes | No (own assignments) | No (own assignments) |
| Edit succession properties | Yes | Yes (assigned only) | Yes (assigned only) |
| Edit tax properties | Yes | Yes (assigned only) | Yes (assigned only) |
| Edit metadata | Yes | No | No |
| Propose new properties | Yes | Yes | Yes |
| Publish → Create PR | Yes | No | No |
| Create new extensions | Yes | No | No |
| Invite users to org | N/A | Yes | No |
| Remove users from org | N/A | Yes | No |
| Create/manage orgs | Yes | No | No |
| Review partner drafts | Yes | No | No |

## Pages

### 1. Login (`/login`)

Two-step magic link flow:

**Step 1 — Email entry.** Clean, centred form. "INHERIT Backoffice" branding. "Invite-only" note with link to partners page for those without accounts.

**Step 2 — Context-aware confirmation.** After email entry:
- **Admin recognised:** Admin badge, "Welcome back", magic link sent confirmation
- **Partner recognised:** Org context card (org name, initial, assignment badges), then magic link sent
- **Unknown email:** Red error on input, "No account found"

Magic link expires in 10 minutes. "Send again" and "Use a different email" links.

Security note: Email enumeration is acceptable for an invite-only system. Can be hardened later with a generic response if needed.

### 2. Extensions list — admin view (`/extensions`)

Top navigation: **Extensions** | **Partners** tabs.

Table columns: Extension, Legal Tradition, Type, Key Features, Succession Rules, Tax Treatment, Scenarios, Seeking.

Each coverage cell shows:
- Coverage badge (comprehensive/partial/outline)
- "N props · N tests" count
- Progress bar with percentage
- "Edit succession →" / "Edit tax →" links
- Draft count if unpublished changes exist

Footer: "Publish N drafts → Create PR" button.

Filters: search, succession coverage filter, tax coverage filter. "+ New Extension" button.

### 3. Succession/tax rules edit page (`/extensions/:id/succession` or `/tax`)

Properties grouped by topic (e.g. Legal Rights & Entitlements, Intestacy, Property Classification, Administration, Will & Testamentary, Special Succession).

Each property shows: name, published/draft status, type, description, sub-property count. Draft changes highlighted in amber with discard option.

Tabs: Succession Rules | Tax Treatment | Metadata.

Footer: "+ Add property", "Discard all drafts", "Publish N drafts → Create PR".

### 4. Property editor (`/extensions/:id/succession/:property`)

Breadcrumb navigation. Property header with name, status, type, group.

Each sub-property renders based on its type:
- **string** — text input with examples
- **enum** — dropdown with plain-English descriptions of each value
- **money ($ref)** — amount + currency fields with minor units explanation
- **temporal-rule ($ref)** — read-only card showing current rule, "Edit temporal rule →" link
- **boolean** — radio buttons (true/false)
- **number** — number input with constraints
- **New fields (draft)** — highlighted in amber with "Remove" option

Footer: "+ Add sub-property", "Cancel", "Save as draft".

### 5. Add property wizard

**Step 1 — Name & type.** camelCase name input with guidance, description textarea, group assignment dropdown, type selection as radio cards (object, string, enum, boolean, number, array, $ref). Each card explains when to use that type.

**Step 2 — Configure.** Varies by type:
- **Object:** inline sub-property builder (name/type/description grid). Type dropdown changes third column contextually. Required fields checkboxes. Live JSON Schema preview (read-only).
- **Enum:** opens enum editor (see below).
- **$ref:** opens $defs browser (see below).
- **Primitives (string/number/boolean):** constraints (maxLength, minimum/maximum, etc.).

### 6. Enum editor (modal/inline)

Drag-to-reorder values. Each value: snake_case machine name + plain-English description. Add/remove buttons. Naming convention guidance.

**Editing published enums:** Published values are locked (cannot be deleted — greyed out × with tooltip). Description edits highlighted as amber drafts with strikethrough of previous text and "Revert" link. New values highlighted as drafts. Warning: "Published values cannot be deleted — existing data may reference them."

### 7. $defs browser (modal)

Radio-select cards showing each shared definition: name, description, field summary, usage count. Search bar. Selected definition highlighted. "Request new $def" button for partners (admin-gated). Admins see a "Create new $def" button instead.

Available $defs include: `money.json`, `temporal-rule.json`, `date-range.json`, `percentage.json`, `address.json`.

### 8. Partner views (`/` for partners — their landing page)

Partners see only their org's assigned extensions and coverage areas. Same grouped layout as admin but restricted scope. "Gaps" section shows what expertise is needed. Partners can propose new properties but can't publish.

Blue info banner: "Your edits are saved as drafts. An INHERIT administrator will review and publish them."

### 9. Partner administration — admin view (`/partners`)

**Organisations list.** Table: org name, assignment badges (colour-coded succession green / tax amber), user count, draft count, last active, "Manage →" link. Amber banner: "N partner drafts awaiting review" with quick link. Pending orgs shown greyed out with "Resend invite".

**Organisation detail** (`/partners/:org`). Extension assignments with add/remove. User list with avatars/initials, org admin badge, promote/demote/remove actions. Pending invites with resend/revoke. Pending drafts from this org with approve/reject inline.

**Invite organisation modal.** Org name, extension + role checkboxes (succession/tax), org admin email, optional personal message, email preview.

**Aggregated draft review** (`/partners/drafts`). All partner drafts grouped by organisation. Filter pills (all/new properties/modifications). Diff link + approve/reject per draft. "Approve all" bulk action.

### 10. Publish flow (`/publish`)

Three stages:

**Stage 1 — Select drafts.** All pending drafts (admin + approved partner drafts) grouped by extension and coverage area. Checkbox per draft with select-all. Shows contributor and timestamp.

**Stage 2 — Diff preview.** GitHub-style file-by-file diff (green/red lines). Summary bar (changes, files, lines added/removed). Editable PR title and description (auto-generated, lists contributors). Branch name (auto: `backoffice/publish-YYYY-MM-DD`), reviewers, labels. Pre-publish validation checks: schema metaschema, breaking changes, $ref targets, required fields, test suite.

**Stage 3 — Confirmation.** Success state with GitHub PR card and link. "What happens next" steps (CI → review → merge → npm publish). Drafts transition to "publishing" status. Auto-flip to "published" when PR merged (via webhook). Revert to "draft" if PR closed without merge.

## Draft lifecycle

```
draft → publishing → published
  ↑         |
  └─────────┘ (PR closed without merge)
```

- **draft** — saved in backoffice DB, not yet submitted
- **publishing** — PR created, awaiting merge
- **published** — PR merged, schema files updated

Partner drafts have an additional layer:
```
partner-draft → approved → draft → publishing → published
                   ↓
               rejected (with feedback)
```

## Technical stack

| Layer | Choice | Notes |
|-------|--------|-------|
| **Database** | Supabase Postgres | RLS for org/role permissions |
| **Auth** | Supabase Auth | Magic links (signInWithOtp), role in user metadata |
| **Backend** | Next.js API routes / Server Actions | Schema generation, GitHub PR creation |
| **Frontend** | Next.js App Router | React, Tailwind, deployed on Vercel |
| **GitHub integration** | Octokit | Create branches, commit files, open PRs |
| **Hosting** | Vercel | `backoffice.openinherit.org` |
| **Schema validation** | ajv or @hyperjump/json-schema | Pre-publish metaschema validation |
| **Webhook** | GitHub → Vercel Function | PR merge detection for draft → published transition |

## Database schema (high-level)

### Core tables

- **organisations** — id, name, created_at, created_by
- **organisation_assignments** — id, org_id, extension_id, succession (bool), tax (bool)
- **profiles** — id (= auth.users.id), email, org_id, role (admin | org_admin | org_member), created_at
- **invitations** — id, email, org_id, role, invited_by, accepted_at, expires_at

### Extension data

- **extensions** — id, slug, name, legal_tradition, type, key_features, metadata (jsonb)
- **properties** — id, extension_id, coverage_area (succession | tax), name, group, type, description, schema_definition (jsonb), status (draft | publishing | published), created_by, updated_at
- **property_drafts** — id, property_id (null for new), extension_id, coverage_area, name, group, type, description, schema_definition (jsonb), status (partner_draft | approved | draft | publishing | published | rejected), author_id, reviewer_id, review_note, created_at, updated_at
- **property_groups** — id, extension_id, coverage_area, name, display_order, description

### Metadata

- **shared_definitions** — id, name, description, schema (jsonb), usage_count
- **publish_history** — id, pr_number, pr_url, branch, drafts_included (jsonb), created_by, created_at, merged_at, status (open | merged | closed)

### RLS policies

- Admins: full access to all tables
- Org admins/members: read/write only rows where org_id matches their profile's org_id
- Extension data: filtered by organisation_assignments (can only see/edit extensions they're assigned to)
- Property drafts: partners can create drafts but not change status to 'approved' or 'published'

## Key flows (backend)

### Invite organisation
1. Admin submits org name + extension assignment + admin email
2. Insert organisation, organisation_assignment, invitation rows
3. Call `supabase.auth.admin.inviteUserByEmail()` with custom redirect
4. Recipient clicks link → lands on `/accept-invite` → profile created with org_id and role

### Magic link login
1. User enters email at `/login`
2. Frontend queries public `user_context` view (returns role + org name + assignment badges, or null — no sensitive data exposed)
3. Frontend calls `supabase.auth.signInWithOtp({ email })`
4. User clicks email link → redirected based on role

### Save draft
1. User edits property in backoffice
2. Frontend calls Server Action → inserts/updates property_drafts row
3. Status: 'draft' (admin) or 'partner_draft' (partner)

### Admin reviews partner draft
1. Admin views aggregated drafts at `/partners/drafts`
2. Approve → status changes to 'approved' (becomes eligible for publishing)
3. Reject → status changes to 'rejected' with review_note

### Publish
1. Admin selects drafts at `/publish`
2. Backend generates schema JSON files from property_drafts
3. Runs validation (metaschema, breaking changes, $ref resolution, tests)
4. Creates GitHub branch, commits files, opens PR via Octokit
5. Draft statuses → 'publishing'
6. GitHub webhook on PR merge → statuses → 'published', property rows updated

## Mockups

All mockups are in a local downloads folder:

| File | Content |
|------|---------|
| `backoffice-list-v5.html` | Extensions list (admin view) — final |
| `backoffice-edit-succession-v2.html` | Succession rules edit page — final |
| `backoffice-edit-property.html` | Property editor (type-aware inputs) |
| `backoffice-partner-view.html` | Partner views (succession + tax side-by-side) |
| `backoffice-partner-admin.html` | Partner administration (orgs list, detail, invite, draft review) |
| `backoffice-login.html` | Login flow (4 states) |
| `backoffice-property-deep-dive.html` | Add property wizard, enum editor, $defs browser |
| `backoffice-publish-flow.html` | Publish flow (select → diff → confirm) |

## Relationship to other work

- The extensions page on www.openinherit.org now shows succession/tax columns — the backoffice mirrors this
- Partners page now seeks "Succession Law Partners" and "Tax Treatment Partners" — the backoffice gives them a place to contribute
- The MFI professional comparison feature (strategy/ideas/mfi-professional-comparison.md) would use the same succession/tax categorisation
