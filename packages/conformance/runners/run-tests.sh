#!/bin/bash
set -euo pipefail

# INHERIT Conformance Test Runner
# Usage: ./run-tests.sh <validator-command>
# Example: ./run-tests.sh "inherit validate --json"

VALIDATOR="${1:?Usage: $0 <validator-command>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PASS=0
FAIL=0
TOTAL=0

run_test() {
    local fixture="$1"
    local expected_file="$2"

    TOTAL=$((TOTAL + 1))

    local result
    result=$($VALIDATOR "$SCRIPT_DIR/$fixture" 2>&1) || true

    local expected_valid
    expected_valid=$(python3 -c "import json; print(json.load(open('$SCRIPT_DIR/$expected_file'))['valid'])")

    local actual_valid
    actual_valid=$(echo "$result" | python3 -c "import json,sys; print(json.load(sys.stdin).get('valid', 'PARSE_ERROR'))" 2>/dev/null) || actual_valid="PARSE_ERROR"

    if [ "$actual_valid" = "$expected_valid" ]; then
        PASS=$((PASS + 1))
        echo "  PASS  $fixture"
    else
        FAIL=$((FAIL + 1))
        echo "  FAIL  $fixture (expected valid=$expected_valid, got valid=$actual_valid)"
    fi
}

echo "INHERIT Conformance Test Kit v6.1.1"
echo "Validator: $VALIDATOR"
echo "---"

# Use a temp file to avoid the subshell variable scoping issue with pipes
TMPFILE=$(mktemp)
python3 -c "
import json
manifest = json.load(open('$SCRIPT_DIR/manifest.json'))
for t in manifest['tests']:
    print(t['file'] + '|' + t['expected'])
" > "$TMPFILE"

while IFS='|' read -r fixture expected; do
    run_test "$fixture" "$expected"
done < "$TMPFILE"

rm -f "$TMPFILE"

echo "---"
echo "Results: $PASS passed, $FAIL failed, $TOTAL total"

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
