# Partner FAQ

## How do I get access to maintain my jurisdiction's extension?

When your partnership agreement is signed, we add your GitHub username to the CODEOWNERS file for your extension directory. You're then auto-assigned as a reviewer on any PR that touches your extension. You can also submit PRs directly.

## Can I maintain my own extension independently?

Yes. When you need full autonomy, your extension graduates to its own repo under the `openinherit` org (e.g. `openinherit/ext-japan`). You get full write access. The main repo references your extension via the registry. Most partners start with CODEOWNERS and graduate when they need to iterate faster.

## What if I find a bug in the core schema (not my extension)?

File an issue on `openinherit/standard` describing the problem — what you were trying to do, what the schema says, why it blocks you, and your proposed fix. We use the same public contribution process ourselves. Submit a PR with the fix. We review for backwards compatibility and merge.

## How does the CODEOWNERS to own-repo graduation work?

1. We create `openinherit/ext-{your-jurisdiction}`
2. We move your extension code there
3. You get full write access
4. The main repo's `extensions-registry.json` points to your repo
5. Your repo has its own CI that validates against INHERIT core
6. You publish releases independently

The main repo still lists your extension as "core" tier.

## What if legislation changes in my jurisdiction?

Update the extension schema, bump the `lastVerified` date in `extension.json`, and submit a PR. If the change requires a new field, add it as optional (non-breaking). If existing fields need changing, file a proposal in `proposals/`. For urgent changes (e.g. a threshold that changed overnight), we fast-track the review.

## Do I need to be technical?

Not necessarily. Many partners provide the legal expertise while we handle the technical implementation. You review the schema for legal accuracy; we write the JSON. The `extension.json` manifest and the review process are designed to be readable by non-developers.

## What's the steering committee?

Governance grows organically from commercial partnerships. Each jurisdiction partner firm gets a seat. The committee advises on schema evolution, new extensions, and breaking changes. Richard Davies (Testate Technologies) retains final decision-making authority as Founding Steward until the governance transition thresholds are met (see the [Governance Charter](../governance-charter.md)).
