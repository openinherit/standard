#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Testate Technologies Ltd
# SPDX-License-Identifier: Apache-2.0
#
# Hermetic red-proofs for scripts/check-eli-point-in-time.py. Synthetic trees and
# a local HTTP stub standing in for legislation.gov.uk — no network, no real repo.
# Every way the gate is meant to go red has an assertion here, so a green run of
# the gate means something.
#
# Exit 0 = every assertion held; 1 = at least one did not.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
GATE="$HERE/check-eli-point-in-time.py"
WORK="$(mktemp -d)"
trap 'kill "$STUB_PID" 2>/dev/null; rm -rf "$WORK"' EXIT

pass=0; fail=0
check() { # check <want-exit> <name> <cmd...>
  local want="$1" name="$2"; shift 2
  local out got
  out="$("$@" 2>&1)"; got=$?
  if [ "$got" -eq "$want" ]; then pass=$((pass+1)); echo "✅ $name (exit $got)"
  else fail=$((fail+1)); echo "❌ $name: want exit $want, got $got"; echo "$out" | sed 's/^/     /' | tail -8; fi
}
check_out() { # check_out <want-exit> <must-contain> <name> <cmd...>
  local want="$1" needle="$2" name="$3"; shift 3
  local out got
  out="$("$@" 2>&1)"; got=$?
  if [ "$got" -eq "$want" ] && grep -qF -- "$needle" <<<"$out"; then pass=$((pass+1)); echo "✅ $name (exit $got)"
  else fail=$((fail+1)); echo "❌ $name: want exit $want + '$needle', got $got"; echo "$out" | sed 's/^/     /' | tail -8; fi
}

# --- a conformant rule body ---------------------------------------------------
GOOD_RULE='> Module R

Jurisdiction: GB-ENG

```catala
declaration scope S:
  input d content date
  internal x content money
  output v content money

scope S:
  # eli: value=$100 effective=2020-01-01 instrument=https://www.legislation.gov.uk/uksi/2020/1/made pit=https://www.legislation.gov.uk/ukpga/2000/1/section/1/2021-06-01
  definition x equals $100

  # eli: value=$200 effective=2022-01-01 instrument=https://www.legislation.gov.uk/uksi/2022/2/made pit=https://www.legislation.gov.uk/ukpga/2000/1/section/1/2023-06-01
  exception definition x
    under condition d >= |2022-01-01|
    consequence equals $200

  definition v equals
    if d < |2020-01-01| then $0 else x
```
'
mk() { # mk <name> <rule-text>  -> tree path
  local t="$WORK/$1"; mkdir -p "$t/catala/probate"
  printf '%s' "$2" > "$t/catala/probate/R.catala_en"; echo "$t"
}
G="$(mk good "$GOOD_RULE")"

# --- static leg ----------------------------------------------------------------
check 0 "conformant tree is clean" python3 "$GATE" --tree "$G" --min-citations 2
check_out 1 "literal differs from the cited value" "value=\$100 but the definition says \$150" \
  python3 "$GATE" --tree "$(mk lit "${GOOD_RULE/equals \$100/equals \$150}")" --min-citations 2
check_out 1 "condition date differs from the cited effective date" "a condition date that is not the cited effective date" \
  python3 "$GATE" --tree "$(mk cond "${GOOD_RULE/d >= |2022-01-01|/d >= |2022-02-01|}")" --min-citations 2
check_out 1 "|2019-05-05|" "an uncited date literal is refused" \
  python3 "$GATE" --tree "$(mk undated "${GOOD_RULE/if d < |2020-01-01|/if d < |2019-05-05|}")" --min-citations 2
check_out 1 "pit has no point-in-time /YYYY-MM-DD date" "a pit ELI with no @date is refused" \
  python3 "$GATE" --tree "$(mk nodate "${GOOD_RULE/section\/1\/2023-06-01/section/1}")" --min-citations 2
check_out 1 "legislation.gov.uk" "an instrument off legislation.gov.uk is refused" \
  python3 "$GATE" --tree "$(mk offsite "${GOOD_RULE/https:\/\/www.legislation.gov.uk\/uksi\/2022\/2\/made/https://example.org/si}")" --min-citations 2
check_out 1 "before its effective date" "a pit date before the figure was in force is refused" \
  python3 "$GATE" --tree "$(mk early "${GOOD_RULE/section\/1\/2023-06-01/section/1/2021-12-31}")" --min-citations 2
check_out 1 "after the next commencement" "a pit date after the figure was superseded is refused" \
  python3 "$GATE" --tree "$(mk late "${GOOD_RULE/section\/1\/2021-06-01/section/1/2022-06-01}")" --min-citations 2
check_out 1 "missing field" "a citation missing a field is refused" \
  python3 "$GATE" --tree "$(mk field "${GOOD_RULE/ effective=2020-01-01/}")" --min-citations 2
check_out 1 "not followed by a definition" "a dangling citation is refused" \
  python3 "$GATE" --tree "$(mk dangle "${GOOD_RULE/  definition x equals \$100/  # moved}")" --min-citations 2
NOCITE_RULE="$(sed '/# eli:/d' <<<"$GOOD_RULE")"
check_out 1 "|2022-01-01|" "a dated rule with its citations stripped is refused" \
  python3 "$GATE" --tree "$(mk stripped "$NOCITE_RULE")" --min-citations 0
# an uncited definition of a cited name, reusing a cited date
UNCITED_EXC="${GOOD_RULE/  definition v equals/  exception definition x
    under condition d >= |2022-01-01|
    consequence equals \$999

  definition v equals}"
check_out 1 "definition x has no \`# eli:\` citation" "an uncited exception reusing a cited date is refused" \
  python3 "$GATE" --tree "$(mk uncexc "$UNCITED_EXC")" --min-citations 2
# a citation must not bind past the end of its own definition
NOBLANK="${GOOD_RULE/  definition x equals \$100/  definition x equals \$1
  definition y equals \$100}"
check_out 1 "literal differs from the cited value" "a citation binds only to its own definition" \
  python3 "$GATE" --tree "$(mk noblank "$NOBLANK")" --min-citations 2
check_out 1 "exactly one money literal" "a cited definition with two figures is refused" \
  python3 "$GATE" --tree "$(mk twomoney "${GOOD_RULE/consequence equals \$200/consequence equals if d >= |2022-01-01| then \$5 else \$200}")" --min-citations 2
check_out 1 "literal differs from the cited value" "a negated figure is refused" \
  python3 "$GATE" --tree "$(mk neg "${GOOD_RULE/consequence equals \$200/consequence equals -\$200}")" --min-citations 2
check_out 1 "no date literal in its condition" "an exception whose condition has no cited date is refused" \
  python3 "$GATE" --tree "$(mk nodatecond "${GOOD_RULE/d >= |2022-01-01|/d >= cutoff}")" --min-citations 2
check_out 1 "condition date differs from the cited effective date" "a date in the consequence must also be the cited one" \
  python3 "$GATE" --tree "$(mk consdate "${GOOD_RULE/consequence equals \$200/consequence equals if d >= |2020-01-01| then \$200 else \$200}")" --min-citations 2
check 2 "fewer citations than the floor cannot answer" python3 "$GATE" --tree "$G" --min-citations 3
check 2 "a tree with no catala/ cannot answer" python3 "$GATE" --tree "$WORK/empty-$$" --min-citations 0
# prose outside a code block may mention dates and `# eli:` freely
PROSE_RULE="${GOOD_RULE/Jurisdiction: GB-ENG/Jurisdiction: GB-ENG

Prose may cite |1999-01-01| outside a code block.}"
check 0 "a date in prose is not a rule literal" python3 "$GATE" --tree "$(mk prose "$PROSE_RULE")" --min-citations 2

# --- live leg, against a stub ---------------------------------------------------
STUB="$WORK/stub"; mkdir -p "$STUB"
inst() { # inst <file> <DocumentURI> <coming-into-force> <figure>
  cat > "$STUB/$1" <<XML
<Legislation xmlns="http://www.legislation.gov.uk/namespaces/legislation" xmlns:ukm="http://www.legislation.gov.uk/namespaces/metadata" DocumentURI="$2"><ukm:Metadata><ukm:SecondaryMetadata><ukm:ComingIntoForce><ukm:DateTime Date="$3"/></ukm:ComingIntoForce></ukm:SecondaryMetadata></ukm:Metadata><Secondary><P>The fixed net sum is $4.</P></Secondary></Legislation>
XML
}
pit() { # pit <file> <DocumentURI> <valid> [RestrictEndDate]
  local end=""; [ -n "${4:-}" ] && end=" RestrictEndDate=\"$4\""
  cat > "$STUB/$1" <<XML
<Legislation xmlns="http://www.legislation.gov.uk/namespaces/legislation" xmlns:ukm="http://www.legislation.gov.uk/namespaces/metadata" xmlns:dct="http://purl.org/dc/terms/" DocumentURI="$2"$end><ukm:Metadata><dct:valid>$3</dct:valid></ukm:Metadata><Primary/></Legislation>
XML
}
inst i1.xml "http://www.legislation.gov.uk/uksi/2020/1/made" 2020-01-01 '£100'
inst i2.xml "http://www.legislation.gov.uk/uksi/2022/2/made" 2022-01-01 '£200'
pit  p1.xml "http://www.legislation.gov.uk/ukpga/2000/1/2021-06-01" 2021-01-01 2021-12-31
pit  p2.xml "http://www.legislation.gov.uk/ukpga/2000/1/2023-06-01" 2022-01-01
cat > "$STUB/routes.json" <<'JSON'
{"/uksi/2020/1/made/data.xml": [200, "i1.xml"],
 "/uksi/2022/2/made/data.xml": [200, "i2.xml"],
 "/ukpga/2000/1/section/1/2021-06-01/data.xml": [200, "p1.xml"],
 "/ukpga/2000/1/section/1/2023-06-01/data.xml": [200, "p2.xml"]}
JSON
cat > "$WORK/stub.py" <<'PY'
import http.server, json, os, sys
root = sys.argv[1]
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        routes = json.load(open(os.path.join(root, "routes.json")))
        status, body = routes.get(self.path, [404, None])
        self.send_response(status)
        if 300 <= status < 400:
            self.send_header("Location", body)
            self.end_headers(); return
        self.send_header("Content-Type", "application/xml")
        self.end_headers()
        if status == 200: self.wfile.write(open(os.path.join(root, body), "rb").read())
srv = http.server.HTTPServer(("127.0.0.1", 0), H)
print(srv.server_address[1], flush=True)
srv.serve_forever()
PY
python3 "$WORK/stub.py" "$STUB" > "$WORK/port" & STUB_PID=$!
for _ in $(seq 50); do [ -s "$WORK/port" ] && break; sleep 0.1; done
BASE="http://127.0.0.1:$(cat "$WORK/port")"
live() { python3 "$GATE" --tree "$G" --min-citations 2 --resolve --base-url "$BASE"; }
route() { python3 - "$STUB/routes.json" "$1" "$2" "$3" <<'PY'
import json, sys
p, k, s, b = sys.argv[1:]
r = json.load(open(p)); r[k] = [int(s), b]; json.dump(r, open(p, "w"))
PY
}
cp "$STUB/routes.json" "$WORK/routes.orig"
reset() { cp "$WORK/routes.orig" "$STUB/routes.json"; }

check 0 "every ELI re-resolves" live
route /uksi/2022/2/made/data.xml 404 x;  check_out 1 "HTTP 404" "a withdrawn instrument is refused" live; reset
route /ukpga/2000/1/section/1/2023-06-01/data.xml 410 x; check_out 1 "HTTP 410" "a withdrawn point-in-time version is refused" live; reset
route /ukpga/2000/1/section/1/2021-06-01/data.xml 301 /ukpga/2000/1/section/1/data.xml
check_out 1 "moved" "a redirected (moved) version is refused" live; reset
inst i2.xml "http://www.legislation.gov.uk/uksi/2022/2/made" 2022-03-01 '£200'
check_out 1 "ComingIntoForce" "a commencement date that disagrees with effective is refused" live
inst i2.xml "http://www.legislation.gov.uk/uksi/2022/2/made" 2022-01-01 '£250'
check_out 1 "does not contain the cited figure" "an instrument without the cited figure is refused" live
inst i2.xml "http://www.legislation.gov.uk/uksi/2022/2/made" 2022-01-01 '£200'
pit p2.xml "http://www.legislation.gov.uk/ukpga/2000/1" 2022-01-01
check_out 1 "DocumentURI" "a point-in-time request answered with the current version is refused" live
pit p2.xml "http://www.legislation.gov.uk/ukpga/2000/1/2023-06-01" 2023-07-01
check_out 1 "dct:valid" "a version valid only after the as-at date is refused" live
pit p2.xml "http://www.legislation.gov.uk/ukpga/2000/1/2023-06-01" 2022-01-01
pit p1.xml "http://www.legislation.gov.uk/ukpga/2000/1/2021-06-01" 2021-01-01 2021-05-31
check_out 1 "RestrictEndDate" "a version that ended before the as-at date is refused" live
pit p1.xml "http://www.legislation.gov.uk/ukpga/2000/1/2021-06-01" 2021-01-01 2021-12-31
echo 'not xml' > "$STUB/bad.xml"; route /uksi/2020/1/made/data.xml 200 bad.xml
check_out 1 "machine-readable" "a 200 that is not legislation XML is refused" live; reset
route /uksi/2020/1/made/data.xml 503 x
check_out 2 "not a withdrawal" "a 503 outage cannot answer (and is not called a withdrawal)" live; reset
inst i1.xml "http://www.legislation.gov.uk/uksi/2020/1/made" 2020-01-01 '£1000'
check_out 1 "does not contain the cited figure" "a figure that is only a prefix of the stated one is refused" live
inst i1.xml "http://www.legislation.gov.uk/uksi/2020/1/made" 2020-01-01 '£100'
check 0 "restored stub is clean again" live
kill "$STUB_PID" 2>/dev/null; wait "$STUB_PID" 2>/dev/null
check 2 "an unreachable server cannot answer" live

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
