#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
# SPDX-License-Identifier: Apache-2.0
#
# L6 temporal: the statutory legacy resolves to the right figure AS AT the date
# of death, and the harness has teeth. Needs catala + clerk 1.2.0 on PATH.
#
#   1. tests/oracles/fixed-net-sum-aea1925.oracle.json must be GREEN (exit 0):
#      2022-06-01 -> £270,000, 2024-06-01 -> £322,000, both sides of 26 July 2023.
#   2. Each file in tests/oracles/negative/fixed-net-sum-*.oracle.json must be
#      RED (exit 1, not 3): a wrong-as-at figure, and a date before the
#      modelled window. A negative that passes, or fails closed, is a failure.
#
# Exit 0 = all as expected; 1 = an expectation broke.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
expect() {
  local want="$1" oracle="$2" got
  python3 scripts/oracle_verify.py --oracle "$oracle" --standard . >/tmp/l6-oracle.$$ 2>&1
  got=$?
  if [ "$got" -eq "$want" ]; then
    echo "ok    exit $got (want $want)  $oracle"
  else
    echo "FAIL  exit $got (want $want)  $oracle"
    sed 's/^/      /' /tmp/l6-oracle.$$ | tail -15
    fail=1
  fi
  rm -f /tmp/l6-oracle.$$
}

expect 0 tests/oracles/fixed-net-sum-aea1925.oracle.json
negatives=(tests/oracles/negative/fixed-net-sum-*.oracle.json)
if [ "${#negatives[@]}" -lt 2 ] || [ ! -e "${negatives[0]}" ]; then
  echo "FAIL  expected at least 2 negative controls, found ${#negatives[@]}"
  fail=1
fi
for n in "${negatives[@]}"; do expect 1 "$n"; done

[ "$fail" -eq 0 ] && echo "L6 as-at oracle: GREEN, negative controls RED" || echo "L6 as-at oracle: FAILED"
exit "$fail"
