#!/usr/bin/env bash
set -euo pipefail

RESOLVE_FLAGS="--resolve v3/extensions/africa-customary/africa-customary.json --resolve v3/extensions/australia-nz/australia-nz.json --resolve v3/extensions/brazil/brazil.json --resolve v3/extensions/canada/canada.json --resolve v3/extensions/eu-succession/eu-succession.json --resolve v3/extensions/hindu-succession/hindu-succession.json --resolve v3/extensions/hong-kong/hong-kong.json --resolve v3/extensions/india/india.json --resolve v3/extensions/ireland/ireland.json --resolve v3/extensions/islamic-succession/islamic-succession.json --resolve v3/extensions/israel/israel.json --resolve v3/extensions/japan/japan.json --resolve v3/extensions/jewish-succession/jewish-succession.json --resolve v3/extensions/latin-america/latin-america.json --resolve v3/extensions/prc-china/prc-china.json --resolve v3/extensions/scotland/scotland.json --resolve v3/extensions/singapore-malaysia/singapore-malaysia.json --resolve v3/extensions/switzerland/switzerland.json --resolve v3/extensions/uae/uae.json --resolve v3/extensions/uk-england-wales/uk-england-wales.json --resolve v3/extensions/us-estate/us-estate.json --resolve v3/dialect.json --resolve v3/vocab/estate/meta.json --resolve v3/asset-collection.json --resolve v3/asset-interest.json --resolve v3/asset.json --resolve v3/asset-categories/financial.json --resolve v3/asset-categories/vehicle.json --resolve v3/asset-categories/digital.json --resolve v3/asset-categories/business.json --resolve v3/asset-categories/general.json --resolve v3/attestation.json --resolve v3/bequest.json --resolve v3/catalogue.json --resolve v3/dealer-interest.json --resolve v3/document.json --resolve v3/event.json --resolve v3/estate.json --resolve v3/executor.json --resolve v3/guardian.json --resolve v3/kinship.json --resolve v3/liability.json --resolve v3/lifetime-transfer.json --resolve v3/nonprobate-transfer.json --resolve v3/organisation.json --resolve v3/person.json --resolve v3/space.json --resolve v3/property.json --resolve v3/proxy-authorisation.json --resolve v3/relationship.json --resolve v3/schema.json --resolve v3/trust.json --resolve v3/valuation.json --resolve v3/insurance-policy.json --resolve v3/notification.json --resolve v3/pet.json --resolve v3/acknowledgement.json --resolve v3/subscription.json --resolve v3/wish.json --resolve v3/power-of-appointment.json --resolve v3/conformance-declaration.json --resolve v3/common/ --resolve v3/common/audit-event.json"
SCHEMA="v3/schema.json"
SKIP="broken-references.json catalogue-only.json sample-will-text.txt"
SKIP_PREFIX="extension-"
PASSED=0
FAILED=0

for fixture in examples/fixtures/*; do
  filename=$(basename "$fixture")

  # Skip non-JSON, known-invalid, and extension fixtures (not root documents)
  if echo "$SKIP" | grep -qw "$filename"; then
    echo "SKIP: $filename"
    continue
  fi
  if echo "$filename" | grep -q "^${SKIP_PREFIX}"; then
    echo "SKIP: $filename (extension fixture)"
    continue
  fi

  if jsonschema validate "$SCHEMA" "$fixture" $RESOLVE_FLAGS 2>/dev/null; then
    echo "PASS: $filename"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL: $filename"
    FAILED=$((FAILED + 1))
  fi
done

# Also validate will-companion fixtures in examples/wills/
for fixture in $(find examples/wills -name '*-inherit-*.json' 2>/dev/null); do
  if jsonschema validate "$SCHEMA" "$fixture" $RESOLVE_FLAGS 2>/dev/null; then
    echo "PASS: $fixture"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL: $fixture"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Results: $PASSED passed, $FAILED failed"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
