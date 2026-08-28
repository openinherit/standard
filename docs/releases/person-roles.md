# Person Roles Reference

Every person in an INHERIT document has one or more roles from a fixed set of 10. A person can hold multiple roles simultaneously — for example, a spouse might be both `beneficiary` and `executor`.

Roles are assigned via the `roles` array on `person.json`. The array may be empty — a person with no active role in the estate (e.g. a deceased relative referenced only as a kinship node) can have `roles: []`. Extension-specific roles (e.g. `bekhor`, `karta`, `okpara`, `mutawalli`) are added via `x-inherit-*` extension blocks, not by extending this enum.

---

## testator

The person whose estate this is. Every INHERIT document has exactly one testator.

**When to use:** assign this role to the person whose estate plan is being documented. The estate's `testatorPersonId` must reference a person with this role.

**Related entities:**
- `estate.testatorPersonId` — must match this person's `id`
- All bequests, trusts, executors, guardians, and wishes in the document relate to this testator's estate

**Example:**
```json
{
  "id": "a0000000-0000-0000-0000-000000000001",
  "givenName": "James",
  "familyName": "Ashford",
  "dateOfBirth": "1965-04-12",
  "roles": ["testator"]
}
```

---

## beneficiary

Someone who receives something from the estate — whether a specific item, a cash gift, a share of the residuary estate, or income from a trust.

**When to use:** assign this role to anyone named in a bequest, trust distribution, or residuary gift. Also assign it to people who are potential beneficiaries even if the testator has not yet decided what they receive.

**Related entities:**
- `bequest.beneficiaryId` — references this person
- `trust.beneficiaries[].personId` — references this person
- `assetInterest.personId` — soft preferences before formal bequests

**Example:**
```json
{
  "id": "a0000000-0000-0000-0000-000000000003",
  "givenName": "Oliver",
  "familyName": "Ashford",
  "roles": ["beneficiary"]
}
```

---

## executor

Appointed to administer the estate after the testator's death. Executors apply for probate, collect assets, pay debts, and distribute the estate according to the will.

**When to use:** assign this role to anyone named as executor in the will. A person can be both executor and beneficiary (very common — spouses often serve as both).

**Related entities:**
- `executor.personId` — references this person
- `executor.role` — specifies priority (primary, secondary, substitute, administrator)
- `executor.grantType` — the type of probate grant

**Example:**
```json
{
  "id": "a0000000-0000-0000-0000-000000000002",
  "givenName": "Catherine",
  "familyName": "Ashford",
  "roles": ["beneficiary", "executor"]
}
```

---

## guardian

Appointed to care for the testator's minor children if both parents die. Guardianship is one of the most important decisions in estate planning for parents.

**When to use:** assign this role to anyone named as guardian in the will. The guardian need not be a beneficiary, though they often are.

**Related entities:**
- `guardian.personId` — references this person
- `guardian.childPersonId` — the child they would care for
- `guardian.role` — priority (primary, secondary, substitute)
- `guardian.appointmentType` — how they were appointed

**Example:**
```json
{
  "id": "a0000000-0000-0000-0000-000000000004",
  "givenName": "Margaret",
  "familyName": "Ashford",
  "roles": ["guardian"]
}
```

---

## trustee

Manages assets held in a trust. Trustees have a fiduciary duty to administer the trust in accordance with its terms and in the best interests of the beneficiaries.

**When to use:** assign this role to anyone appointed as trustee of a trust created by the will (testamentary trust) or referenced in the estate plan (inter vivos trust).

**Related entities:**
- `trust.appointees[].personId` — references this person
- `trust.appointees[].role` — should be `"trustee"`
- `trust.trustType` — the type of trust they manage

**Example:**
```json
{
  "id": "a0000000-0000-0000-0000-000000000005",
  "givenName": "Robert",
  "familyName": "Shaw",
  "roles": ["trustee"]
}
```

---

## witness

Witnessed the signing of the will or other testamentary document. Witnesses attest that the testator signed voluntarily and appeared to have testamentary capacity.

**When to use:** assign this role to anyone who witnessed the will's execution. In most common law jurisdictions, two witnesses are required. Witnesses generally cannot be beneficiaries (this is validated by the attestation's `witnessConflictCheckScope`).

**Related entities:**
- `attestation.witnesses[].personId` — references this person
- `attestation.method` — how the attestation was conducted
- `attestation.witnessConflictCheckScope` — which rules apply to witness eligibility

**Example:**
```json
{
  "id": "a0000000-0000-0000-0000-000000000006",
  "givenName": "Sarah",
  "familyName": "Thompson",
  "roles": ["witness"]
}
```

---

## attorney

Holds a power of attorney (POA) for the testator. This may be a general POA, lasting/enduring POA, or a specific POA for certain matters.

**When to use:** assign this role to anyone who holds a power of attorney over the testator's affairs. This role relates to the testator's capacity planning, not the estate distribution itself.

**Related entities:**
- `proxyAuthorisation` — may reference this person as the authorised representative
- `document` — the POA document itself

**Example:**
```json
{
  "id": "a0000000-0000-0000-0000-000000000007",
  "givenName": "David",
  "familyName": "Ashford",
  "roles": ["attorney"]
}
```

---

## proxy

Authorised to act on behalf of the testator in estate planning matters. Broader than attorney — a proxy might be a family member helping an elderly testator manage their estate information, or a professional adviser coordinating the plan.

**When to use:** assign this role to anyone authorised to interact with the estate plan on the testator's behalf. This is an INHERIT-specific concept, distinct from the legal power of attorney.

**Related entities:**
- `proxyAuthorisation.personId` — references this person
- `proxyAuthorisation.scope` — what they are authorised to do
- `proxyAuthorisation.consentRecords` — evidence of the testator's consent

**Example:**
```json
{
  "id": "a0000000-0000-0000-0000-000000000008",
  "givenName": "Emily",
  "familyName": "Ashford",
  "roles": ["proxy"]
}
```

---

## protector

Oversees trustees in a trust arrangement. Protectors have specific powers defined in the trust deed — typically consent to distributions, power to remove/appoint trustees, or veto investment decisions.

**When to use:** assign this role to anyone named as protector of a trust. Common in offshore and discretionary trusts where an independent check on trustee power is desired.

**Related entities:**
- `trust.appointees[].personId` — references this person
- `trust.appointees[].role` — should be `"protector"`
- `trust.protectorPowers` — lists the specific powers granted

**Example:**
```json
{
  "id": "a0000000-0000-0000-0000-000000000009",
  "givenName": "Michael",
  "familyName": "Henderson",
  "roles": ["protector"]
}
```

---

## enforcer

Enforces the terms of a purpose trust or waqf. Purpose trusts (trusts without human beneficiaries — e.g. trusts to maintain a building, fund research, or care for animals) require an enforcer because there is no beneficiary to hold the trustee to account.

**When to use:** assign this role to anyone appointed to enforce a purpose trust or waqf. In Islamic estates, the mutawalli (waqf administrator) may also serve as enforcer.

**Related entities:**
- `trust.appointees[].personId` — references this person
- `trust.appointees[].role` — should be `"enforcer"`
- `trust.trustType` — typically `"waqf"` or `"other"` (purpose trust)

**Example:**
```json
{
  "id": "a0000000-0000-0000-0000-000000000010",
  "givenName": "Fatima",
  "familyName": "Al-Hassan",
  "roles": ["enforcer"]
}
```

---

## Multiple Roles

A single person commonly holds several roles. There is no restriction on which roles can be combined, though some combinations trigger validation warnings (e.g. a witness who is also a beneficiary may invalidate the will in some jurisdictions).

Common combinations:
- `["testator"]` — the estate owner
- `["beneficiary", "executor"]` — spouse who inherits and administers
- `["beneficiary", "guardian"]` — family member who inherits and cares for children
- `["trustee", "protector"]` — rare but valid in some trust structures
- `["proxy", "beneficiary"]` — family member helping with planning who also inherits

```json
{
  "id": "a0000000-0000-0000-0000-000000000002",
  "givenName": "Catherine",
  "familyName": "Ashford",
  "roles": ["beneficiary", "executor", "guardian"]
}
```
