---
title: "The Lau Pa Sat Report v2 — After the Storm"
version: "1.0"
status: draft
date: 2026-04-16T23:30:00Z
lastmod: 2026-04-16T23:30:00Z
author: "Rich Davies"
source: "docs/proposals/lau-pa-sat-report-v2.md"
---

# The Lau Pa Sat Report v2 — After the Storm

> A fictional collaborative review of INHERIT v6.4.2, set after API Days Singapore 2026

---

## How This Happened

The talk was called "Till Death Do Us Parse." Rich had forty minutes on Day 1, Tuesday 15 April, in the main hall at Marina Bay Sands. He opened with a slide that said "Nobody wants to think about death. That's why the data is terrible." Then he showed willscan.ai.

He loaded Katrina Tan's will — a Singapore AMLA estate with CPF nominations, Islamic faraid shares, and a jade bangle with cultural obligations. The tool extracted it into an INHERIT document in eleven seconds. Every field populated. Every condition typed. Every witness named. The audience was quiet in the way audiences are quiet when they are paying attention rather than being polite.

Then he loaded Mark Richardson's will — an English estate with a nil rate band discretionary trust, executor powers under the Trustee Act 2000, statutory exclusions disapplying the Apportionment Act 1870, and precatory wishes about the family piano. Eleven seconds again. He merged the two documents using the companion tool. A cross-jurisdiction estate plan, machine-readable, validated against 77 test suites, in under thirty seconds.

"Anyone else want to try?" Rich said. "If INHERIT can't model your will, I'll donate a hundred dollars to MSF."

Three hands went up.

The first was a Canadian estate lawyer. Her will had a preferential share under Ontario's Succession Law Reform Act, a cottage held in joint tenancy, and an RRSP with a named beneficiary. INHERIT modelled it perfectly — the Canada extension handled the preferential share, the nonprobate transfer captured the RRSP designation, and the joint tenancy was a property-level attribute. She sat down looking slightly annoyed, as people do when they have been hoping to find a flaw.

The second was an Australian probate practitioner. His client's will included a Maori whangai adoption, a family provision claim from an estranged daughter, and superannuation death benefits. The Australia-NZ extension had `whangai` fields on `MaoriLandDetails`, `relationshipCategory` on `FamilyProvisionClaim`, and the nonprobate transfer handled the super. He nodded and said "Fair enough."

The third was an Indian tax consultant from Mumbai. His will was for a Hindu Undivided Family with coparcenary property in Pune, stridhan gold jewellery, a self-acquired flat in Malabar Hill, and a daughter married to a Parsi man whose own estate would be governed by the Indian Succession Act 1925 Part V. INHERIT got the coparcenary details, the property classification, the HUF implications, the heir classifications under the Hindu Succession Act. But it could not model the distinction between ancestral and self-acquired property at the individual asset level — the `propertyClassification` on the India extension was estate-wide, not per-property. A coparcenary share in one property and full testamentary freedom over another required a field that did not exist.

Rich paid the hundred dollars. He donated it to Medecins Sans Frontieres — receipt WC00468019 — because both Katrina's and Mark's demo wills leave residuary bequests to MSF. "It felt on-brand," he said. Then he fixed the gap before his flight home on Wednesday, adding per-asset property classification to the India and Hindu Succession extensions with test coverage.

By 10pm Wednesday, everyone was at Lau Pa Sat.

---

## Part 1: What Changed Since Last Time

The satay arrived before the conversation started. Eight skewers of chicken, eight of mutton, a stack of ketupat, and a bowl of peanut sauce that Graham Grieve regarded with the suspicion of a man who has been to too many conference dinners. Tiger Beers were ordered. Jon Scheele was already on his second.

**Graham Grieve** turned his bottle slowly. "Last time we were here, you had — what — twenty-something schemas and a handful of extensions. Now I'm looking at the changelog and counting. PowerOfAppointment as a first-class entity. General, special, hybrid powers. Appointor, appointee, class of beneficiaries, scope, exercise tracking. That's a FHIR Resource, Rich. You've built a FHIR Resource and you don't even know it."

"I know it," Rich said.

"The executor schema — literary, digital, specialist roles with scope. The trust schema — discretionary, life interest, bare, accumulation and maintenance, disabled persons, charitable, nil rate band, residence nil rate band, A/B marital, bypass. Plus extension types via the x-inherit prefix. Generation-skipping with generation levels on beneficiaries. Charitable remainder details with CRAT/CRUT income splits. Reserved powers, flee clauses, protector powers." Graham put the bottle down. "That's not an estate data standard. That's a trust administration platform disguised as a JSON Schema."

"Is that a compliment?"

"It's an observation. In FHIR, we spent three years arguing about whether Observation and DiagnosticReport should be separate resources. You've made PowerOfAppointment separate from Bequest in — what — a day?"

"Four hours," Rich said. "It was Phase 2 of the Lau Pa Sat implementation."

"Four hours." Graham looked at Eve. "This is what happens when you have zero users. You can move at the speed of thought."

**Eve Maler** had been reading the schema on her phone. "The `validityStatus` array is interesting. You've got condition types for `unmarried`, `not_divorced`, `not_converted`, `domiciled_in`, `testamentary_capacity`, `no_subsequent_will`, and `custom`. Each with a status — `satisfied`, `breached`, `unknown`. Each with an optional `breachedDate` and `statute` reference."

She looked up. "This maps directly to delegation chain lifecycle management. In UMA, we track whether a permission ticket is valid based on conditions — the resource owner hasn't revoked it, the requesting party still meets the policy, the ticket hasn't expired. Your `validityStatus` is doing the same thing for wills. A marriage is a revocation event. A religious conversion is a policy change. A new domicile is a jurisdiction switch."

"You're seeing delegation chains in a will?"

"I'm seeing delegation chains everywhere, Rich. That's my curse. But specifically — the `connections` array on estate. Directed non-familial links between people. `fromPersonId` has the connection to `toPersonId`. Types: friend, solicitor, financial adviser, accountant, employer, carer, religious leader, medical practitioner, business partner. These are trust relationships. In the delegation sense. The testator trusted these people enough to name them in a legal document. That's a verifiable claim waiting to happen."

**Juan Cruz Viotti** had been quiet, which meant he was thinking. "I looked at the Bowtie CI workflow. You're running cross-implementation validation against multiple JSON Schema 2020-12 implementations on every push to `v3/`. That's exactly what we designed Bowtie for. How many test suites?"

"Seventy-seven."

"Seventy-seven test suites across — let me count — thirty-one core entities, fifteen common types, five asset categories, twenty-one extensions. Plus the dialect schema and the vocabulary. And you're resolving all of them in the test command." Juan pulled up the `package.json` on his phone. "That `pnpm test` command is... it's long."

"It works."

"It works. The if/then pattern usage in the bequest schema — I saw the allOf with conditional validation for core types requiring beneficiaryId. And the extension validation in schema.json — twenty-one if/then blocks enforcing core extensions at Level 1, with a generic fallback for community extensions. That's clean. That's the right way to do it. Ron would approve."

"Tell Ron I said thank you."

"I'm not telling Ron anything until you fix the bundled schema size."

**Cassian Smith** was grinning. He had been grinning since Rich showed him the practitioner polish review request. "You simulated a conversation between me and Juan. You had me quoting my own book back at you. Chapter 4.4, Conditional Validation and Cross-Field Rules. Chapter 10.2, Evolving Enums, Deprecations, and Safe Removals. Chapter 3.4, Common Schema Anti-Patterns."

"Was I wrong?"

"You were annoyingly accurate. The `failureConsequence` enum on bequest conditions — `lapse_to_residue`, `hold_in_trust`, `gift_over`, `revert_to_estate`, `redistribute`, `custom` — that's textbook Chapter 4.4. The condition's failure mode interacts with the bequest's distribution path. You even added `failureDescription` for the cases where the consequence needs natural-language explanation. That's the anti-pattern escape hatch I describe in 3.4 — structured where you can be, free text where you must be."

"And the tsup fix?"

Cassian's grin widened. "The tsup fix is my favourite thing. You had an SDK that was broken for ESM consumers. `ERR_MODULE_NOT_FOUND`. Classic TypeScript compilation problem — `tsc` emits declarations but doesn't rewrite import paths for ESM. You switched to tsup for the build, kept `tsc --emitDeclarationOnly` for declarations, and the package size dropped 45% in the next release because you stripped source maps and declaration maps. That's not a schema improvement. That's a distribution improvement. And it matters more than any schema improvement because nobody can use a schema they can't install."

**Dean Saxe** leaned forward. "I need to tell you what happened during the talk. I was sitting in row seven. You put up the willscan.ai URL. You said 'If INHERIT can't model your will, I'll donate a hundred dollars to MSF.' I thought — there's no way this works for a real will. So I opened my phone, took a photo of my own will — I keep a scan in my password manager, don't judge me — and uploaded it."

The table went quiet.

"It took fourteen seconds instead of eleven. The estate had a pour-over trust, beneficiary designations on two retirement accounts, a UTMA custodial account for my daughter, and a guardian nomination that names my sister as primary and my wife's brother as substitute. The New York extension handled the EPTL references. The trust schema picked up the pour-over. The nonprobate transfers caught the retirement accounts with designation conflict flags. The guardian schema had the substitution chain." Dean paused. "The only thing it missed was the digital asset memorandum — I have a separate document listing crypto wallets and social media accounts. But that's a document reference, not a modelling failure."

"Did you tell anyone?"

"I told Heather. She told me to delete the photo from my phone."

**Jon Scheele** had been watching the audience during the talk, which is what conference producers do. "Three things. First, you got a standing ovation. I've produced API Days for eleven years. Standards talks do not get standing ovations. API talks about death do not get standing ovations. You got one because you showed working software, not slides.

"Second, the three audience members who volunteered — that was unscripted. I could tell because your face went slightly white when the Indian will came up. The fact that you paid the hundred dollars, admitted the gap publicly, and fixed it the next day — that's the story. Not the eleven seconds. The vulnerability and the recovery.

"Third, I had fourteen people ask me after the talk how to get involved. Not how to use INHERIT — how to contribute. That's different. That's community formation."

**Mike Kiser** tapped the table. "Which brings us to governance. You have a Founding Steward model, replacing the phrase 'Benevolent Dictator.' You have a governance charter. You have ecosystem invitation wording that's carefully neutral — no specific standards bodies named. You have a conformance declaration schema. But you don't have a working committee."

"I'm forming one."

"Forming is not having. Right now, INHERIT is Rich Davies in a hotel room in Singapore fixing coparcenary property classification at 2am. That's admirable. It's also a bus factor of one."

**Heather Flanagan** had been reading the person schema. "The religion field. Fourteen values: animist, buddhist, christian, confucian, hindu, jain, jewish, muslim, shinto, sikh, taoist, zoroastrian, none, other. Plus denomination. Plus `asAtDate`."

"It's a jurisdictional switch, not a belief declaration," Rich said. "Singapore AMLA, Malaysian faraid, Israeli rabbinical courts — the person's religion determines which succession law applies."

"I understand the legal rationale. I helped write identity standards for twenty years. The rationale doesn't change the risk. A database of people's religions, linked to their assets, their family relationships, their addresses, their dates of birth and death — that's a surveillance dataset. The `asAtDate` field makes it worse, because it implies tracking changes in religious affiliation over time. In the wrong hands, this is a religious persecution tool."

The table was quiet again, but differently.

"I didn't build it for persecution," Rich said.

"Nobody builds anything for persecution. They build it for legitimate purposes. And then someone else finds a purpose the builder didn't imagine."

---

## Part 2: What They'd Do Differently

The second round of Tiger Beers arrived. The satay was gone. Someone ordered roti prata. The criticism came from the place criticism comes from when people respect the work — not from hostility, but from the desire to see it survive.

**Graham Grieve** went first. "You've shipped fifty-three changes across four point releases in a single day. PowerOfAppointment, executorPowers, validityStatus, connections, constructionClauses, administrationPhases, bequest conditions with failure consequences, attestation page tracking, CPF nomination enrichment, executorPowers with eight statutory types, disinheritedPersons, mutual will agreements, generation-skipping trusts, charitable remainder details, tax relief eligibility, family provision claims, parental order details, conflicts of interest on executors, and I'm only halfway through the changelog.

"In FHIR, we have a maturity model. Level 0 is draft. Level 1 is committee review. Level 5 is normative — locked, can't change without a formal ballot. You've gone from Level 0 to something like Level 3 in forty-eight hours, but without the committee review or the implementation feedback or the interoperability testing.

"You need a stability period. Six months minimum. No new entities. No new fields on existing entities. Bug fixes and documentation only. Let implementers catch up. Let the test wills expose the real problems — the ones that only emerge when someone tries to build software against the schema, not just validate fixtures against it. If you keep adding features, you'll have the most comprehensive estate schema in history and zero implementations because nobody can hit a moving target."

Rich nodded. He didn't argue. Graham had seen a hundred standards come and go and he knew what killed them: not inadequacy, but instability.

**Eve Maler** set down her beer. "The religion field is a surveillance risk. I understand that Singapore AMLA requires it. I understand that Israeli rabbinical courts require it. I understand that Malaysian faraid requires it. But you've put it on Person — which means it's present in every INHERIT document for every jurisdiction, whether the jurisdiction needs it or not.

"Move it to the extension. Singapore-Malaysia can have it. Islamic Succession can have it. Israel can have it. A UK will or a French will or an Australian will should not have a religion field on Person, because those jurisdictions don't use religion to determine succession law, and including the field implies that it's relevant data to collect.

"Better yet — put it on Estate, not Person. The question isn't 'what religion is this person?' The question is 'which succession law governs this estate?' The answer might be determined by religion, but the data model should capture the answer, not the input to the answer. You already have `personalLaw` on the India extension. That's the right pattern. Religion as a succession-law selector is an extension concern, not a core Person attribute."

Rich pulled out his phone and started typing notes. Eve had found the seam in the design that he had papered over with a comment field.

**Juan Cruz Viotti** held up his phone, showing the bundled schema file size. "One point one megabytes. The bundled schema — `dist/inherit-v3-bundled.json` — is 1.1MB. That's thirty-one core entities, fifteen common types, five asset categories, twenty-one extensions, one dialect, one vocabulary — all bundled into a single JSON Schema document.

"For validation purposes, that's fine. You load it once, you compile it, you validate documents against it. The compilation cost is amortised. But for distribution — for someone who just wants to validate a simple English will with two bequests — they're downloading 1.1MB of Indian coparcenary rules, Japanese saishi custodial succession, Brazilian meacao community property, and Hong Kong tso/tong ancestral trusts. They don't need any of that.

"You need a tree-shaking strategy. The extension architecture already supports it — each extension is a separate schema file. But the bundled distribution flattens that separation. You should ship the core bundle — entities plus common types — as one file, and each extension as a separate downloadable. The core bundle would be maybe 400KB. An implementer in Singapore adds the Singapore-Malaysia extension. An implementer in London adds the UK-England-Wales extension. Nobody downloads everything unless they're building a multi-jurisdiction platform.

"Also — and this is a Sourcemeta concern, not a personal one — the if/then pattern for extension validation in schema.json is elegant, but it creates twenty-one conditional branches that every validator must evaluate. Some implementations handle that well. Some don't. Cross-implementation variance in conditional schema evaluation is a known issue. Your Bowtie CI will catch it, but only if you're testing all twenty-one extension paths, not just the happy path."

**Cassian Smith** ordered another beer and got specific. "You don't have contract tests between the schema package and the OpenAPI spec. The schema defines thirty-one entity types. The OpenAPI spec — `openapi/reference-api.yaml` — exposes endpoints for some of those types. But there's no automated check that the response schemas in the OpenAPI spec match the JSON Schemas in `v3/`.

"Right now, they're maintained by different processes. The schemas are the source of truth. The OpenAPI spec is a reference implementation. But reference implementations drift. It's one of the anti-patterns in Chapter 3.4 — the 'twin schema' problem. Two schema definitions that describe the same data structure, maintained in different files, validated by different tools. They will diverge. It's not a question of if.

"You need a CI step that extracts the response schemas from the OpenAPI spec, compares them structurally to the JSON Schemas, and fails the build if they diverge. Or — and this is the better answer — generate the OpenAPI response schemas from the JSON Schemas. Single source of truth. The Redocly bundler can handle `$ref` to external JSON Schema files. Use it."

**Dean Saxe** was still thinking about his will on his phone. "Where's the consent model? I uploaded my will to willscan.ai during a conference talk. My will contains my wife's name, my children's names, my sister's name, my brother-in-law's name, our addresses, the distribution of our assets, the existence of retirement accounts, and guardian nominations for our children. I gave consent by clicking 'upload.' But who consented on behalf of my wife? My children? My sister?

"INHERIT has a proxy-authorisation schema — `delegateType` with person, agent, and organisation. It has authentication methods. It has capabilities. But it doesn't have a consent model for the data subjects in the document. The testator consents to create the document. But the beneficiaries, the witnesses, the executors, the guardians — they're data subjects under GDPR, under CCPA, under Singapore's PDPA. Their personal data is in this document and they didn't consent to its creation, its storage, or its transmission.

"I know this is a data interchange standard, not an application platform. I know consent is an application concern. But if you don't at least define the consent events that should be captured — and give implementers a place to record them — every implementation will handle it differently, and some will handle it not at all."

**Mike Kiser** had been doing maths on a napkin. "You need three things before anyone will bet their business on this standard. A trademark. A governance charter — you have one, but it's a founder document, not a community document. And a funded working committee.

"The trademark is non-negotiable. If INHERIT isn't trademarked, someone else will trademark it. Or worse — they'll fork it, call it INHERIT, and you'll have two competing standards with the same name and no legal mechanism to distinguish them. File in the UK, the US, and Singapore. It'll cost you about four thousand pounds.

"The governance charter needs to be ratified by the working committee, not published by the founder. Right now, Rich Davies is INHERIT. If Rich Davies gets bored, or gets hired by Google, or gets hit by a bus — the standard dies. A ratified charter with named stewards, a succession plan for the stewards themselves, and a defined process for accepting or rejecting proposals — that's what turns a personal project into an institution.

"The working committee needs funding. Not much — enough for a shared Zoom account, a domain renewal budget, and travel expenses for two face-to-face meetings a year. A thousand pounds a year. If you can't find four organisations willing to put in two hundred and fifty pounds each for a seat on the working committee of an open estate data standard, the standard doesn't have a constituency and you should find out now rather than later."

Rich wrote "four thousand pounds — trademark" on the napkin and pushed it back to Mike.

**Heather Flanagan** had moved from the religion field to the attestation schema. "The `witnesses` array captures name, address, occupation, and an optional `personId` reference. The `address` field is a free-text string with a 500-character maximum. The `occupation` field is a free-text string.

"For will execution purposes, you need to know that the witnesses were present, that they were competent adults, and that they weren't beneficiaries. You do not need their home addresses. A witness's home address on a will is a historical convention from when courts needed to be able to find witnesses for probate verification. In the digital age, a witness reference — a name and an identifier — is sufficient.

"Make `address` optional in the schema. It already isn't required, technically — but the fact that you capture it at all, and that your test wills include full addresses for witnesses, sends a signal to implementers that this data should be collected. Implementers model on examples. If your examples include witness addresses, their intake forms will collect witness addresses. And witness addresses are PII that serves no purpose in the data interchange — it's needed for the original document, not for the structured representation of the document.

"The same applies to `occupation`. A retired schoolteacher. A nurse. A neighbour. These are details that appear on wills because solicitors write them there. They don't belong in a data interchange format unless they serve a computational purpose. And they don't."

**Jon Scheele** had been saving his for last. "Stop adding features. Start writing case studies.

"I've produced conferences for eleven years. I've seen a hundred standards launched. The ones that succeed don't succeed because they have fifty-three entity types or twenty-one jurisdiction extensions or seventy-seven test suites. They succeed because someone publishes a case study that says 'We used X and it saved us Y.'

"You don't have a single case study. You don't have a single implementation story. You have ten test wills, which are beautiful, but they're fictional. You have a working demo, which is impressive, but it's your demo. You have a practitioner polish spec that was reviewed by simulated versions of Cassian and Juan, not by actual practitioners.

"Nobody adopts a standard because it's comprehensive. They adopt it because someone they trust tells them it solved a real problem. Find three law firms. Give them the SDK for free. Help them integrate it into their intake process. Then write the case study. 'Morrison & Foerster reduced will intake time from four hours to forty minutes using INHERIT.' That's what sells a standard. Not another extension for Brazilian meacao."

Jon drained his Tiger Beer. "Also, the name is great. 'Till Death Do Us Parse' is the best talk title I've heard in three years. Lead with the humour. The standard is serious enough on its own."

---

## Part 3: The Bet

The roti prata arrived. Graham tore off a piece, dipped it in the curry sauce, and made a proposal.

"Bet."

"What kind of bet?"

"A real one. With stakes." Graham looked around the table. "INHERIT has zero users today. Not counting Rich. Not counting Testate Technologies. Not counting anyone Rich pays or cajoles or guilt-trips into adopting it. Zero independent, arms-length, I-found-this-on-npm-and-decided-to-use-it users.

"If INHERIT has ten real users by April 2027 — ten organisations that have integrated the schema into a production system, verified by public reference or private attestation — I'll write the foreword to the developer documentation. The dev.openinherit.org foreword. Signed, Graham Grieve, creator of FHIR. That's worth something in this industry, and I don't give it away lightly."

Rich looked at him. "You're serious."

"I'm serious. Ten users in twelve months for a death-tech data standard with no commercial backing and a bus factor of one. I think the odds are against you. But I've been wrong before — I thought FHIR would take five years to reach ten implementations and it took two. The difference was that HL7 had a hundred-person working group and you have a hotel room in Singapore."

Dean raised his hand. "I'll raise. If INHERIT has a hundred users by April 2027 — a hundred organisations, same verification standard — I'll propose it as a companion specification to the delegation protocol work we're doing. Companion, not core. But formally proposed, formally balloted, formally considered."

"A hundred is ambitious," Eve said.

"A hundred is impossible," Dean said. "That's why it's a good bet. If it happens, it means the market pulled the standard into existence rather than Rich pushing it. And market-pulled standards are the only ones worth formalising."

Juan had been peeling the label off his Tiger Beer, which is a habit he has when he is about to say something he has been thinking about for a long time. "If it has a thousand," he said quietly. "If INHERIT has a thousand users by April 2027 — and I don't think it will, and I don't think it can, and I want to be clear that I'm saying this as a person who has spent his career on JSON Schema tooling and knows exactly how hard adoption is — if it has a thousand users, I'll include the INHERIT dialect as a bundled test suite in Sourcemeta's default distribution. It'll ship with every copy of the Sourcemeta CLI. Every developer who installs `jsonschema` will have INHERIT's test fixtures available as a validation reference."

The table was quiet.

"That's a hell of a bet," Cassian said.

"It's a hell of a standard," Juan said. "If a thousand people agree."

Graham raised his bottle. "To INHERIT. The most comprehensive estate data standard ever built by one person in a hotel room."

They clinked bottles. The satay smoke drifted across the table. Someone at the next table was arguing about GraphQL subscriptions.

Cassian leaned over to Rich. "For what it's worth — the simulated conversation you wrote between me and Juan? The one in the practitioner polish review request?"

"Yes?"

"My simulated self was more generous than I would have been. Chapter 10.2 says enum evolution must be additive — never remove, only add. But it also says the initial enum must be minimal and complete. Fourteen values for the faith enum is neither minimal nor complete. You have Confucian and Shinto but not Baha'i. You have Jain but not Druze. Either you're modelling world religions — in which case you need forty values — or you're modelling succession-law triggers — in which case you need six. Pick one."

"Which six?"

"The ones that change which law applies: Muslim, Hindu, Jewish, Christian, Parsi, and none. Everything else is `other` until a jurisdiction extension says otherwise."

Rich wrote it on the napkin. Under the trademark estimate, under Graham's bet, under Dean's raise, under Juan's quiet gamble, under Eve's delegation chains, under Heather's surveillance warning, under Jon's case study demand, under Cassian's six-value enum — the napkin was full.

Mike looked at it. "You're going to need a bigger napkin."

"I'm going to need a working committee."

---

## What Rich Heard

On the flight home, somewhere over the Bay of Bengal, Rich opened his laptop and read through the notes he had taken on his phone. The satay grease on the napkin had made some of the writing illegible, but the important parts were clear.

Graham was right about stability. Fifty-three changes in a day was a sprint, not a pace. The zero-user window was closing — fourteen people had asked Jon how to contribute, and Dean had uploaded his own will during the talk. The moment someone builds against v6.4.2, every subsequent change has a cost. The stability period starts now.

Eve was right about the religion field. It was on Person because that's where it appeared in Katrina's will — a Singaporean Muslim woman whose faith determined her succession law. But the fact that it appeared in the will didn't mean it belonged on the core Person entity. The India extension already had `personalLaw` as the correct pattern — the legal consequence, not the personal attribute. Moving religion to an extension concern and keeping only the jurisdictional switch on Estate would be the right refactoring. Not today. During the stability period, as a considered proposal with community input.

Juan was right about the bundled schema. 1.1MB was a number that would appear in every blog post, every tech evaluation, every "should we use INHERIT?" Slack thread. The tree-shaking architecture already existed — twenty-one separate extension files, loadable independently. The distribution just needed to reflect that architecture. Core bundle plus optional extensions. The Bowtie CI needed to test all twenty-one extension paths, not just the ones that appeared in the fixtures.

Cassian was right about contract tests. The OpenAPI spec and the JSON Schemas were two representations of the same truth, and two representations without automated reconciliation would diverge. He was also right about the faith enum. Six values that changed succession law, plus `other`, plus `none`. Not fourteen values that tried to catalogue world religions in a JSON Schema. Pick one purpose and serve it completely.

Dean was right about consent. INHERIT modelled the estate from the testator's perspective — what they wanted, how they wanted it distributed, who they trusted. But every person named in an INHERIT document was a data subject who hadn't consented to being modelled. The proxy-authorisation schema handled delegation of authority. It didn't handle delegation of consent. That was a gap — not in the schema, but in the guidance to implementers.

Mike was right about governance. The trademark filing would happen before the end of April. The working committee would be announced at the next conference. The funding would come from the organisations that had already expressed interest — or it wouldn't, and that would be its own answer.

Heather was right about PII minimisation. Witness addresses and occupations were conventions of paper wills, not requirements of digital interchange. Making them genuinely optional — not just technically optional but absent from examples — would signal to implementers that INHERIT took data minimisation seriously.

Jon was right about case studies. The standard was comprehensive. The demo was compelling. The test wills were thorough. But none of it mattered until someone who wasn't Rich Davies said "I used this and it worked." The three audience members had given him something close — spontaneous, unscripted validation from practitioners in different jurisdictions. But conference moments aren't case studies. Case studies are written by the implementer, not the standard's creator.

The plane descended through clouds over Colombo. Rich closed his laptop. The napkin was in his jacket pocket. He would type up the notes when he got home. He would file the trademark application. He would email the fourteen people who had asked Jon about contributing. He would start the working committee.

But first, he would push the coparcenary fix. Because that Indian tax consultant's will deserved to be modelled correctly, and a hundred dollars to MSF was a promise to do better, not a payment to be excused.

The seatbelt sign came on. Rich put his tray table up. Somewhere in the cargo hold, his laptop bag contained a printed copy of Cassian's book with six pages dog-eared, a printed copy of Juan and Ron's book with eleven pages dog-eared, and a napkin covered in the handwriting of eight people who knew more about standards than he did.

It was enough to start.

---

*The characters in this document are real people in the identity and API standards community. The conversations are fictional. The technical details accurately reflect INHERIT v6.4.2 as released on Saturday 12 April 2026. The MSF donation receipt WC00468019 is real. The $100 bet is aspirational. The napkin was almost certainly recycled by the Lau Pa Sat cleaning crew before anyone thought to photograph it.*
