package oracle

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// The standard this package's CLI lives in.
const standardRoot = "../../../.."

func TestInputLiteral(t *testing.T) {
	for _, tc := range []struct {
		in   string // JSON
		want string
	}{
		{`"325000"`, "$325,000"},
		{`"0.40"`, "$0.40"},
		{`"70000.5"`, "$70,000.50"},
		{`true`, "true"},
		{`false`, "false"},
		{`[1, 2, 3]`, "[1; 2; 3]"},
		{`{"enum": "GroupA"}`, "GroupA"},
		{`"2023-07-26"`, "|2023-07-26|"},
	} {
		got, err := InputLiteral(json.RawMessage(tc.in))
		if err != nil || got != tc.want {
			t.Errorf("InputLiteral(%s) = %q, %v; want %q", tc.in, got, err, tc.want)
		}
	}
}

func TestInputLiteralRefusesWhatCannotBeRendered(t *testing.T) {
	for _, in := range []string{
		`"2023-02-30"`,        // not a calendar date
		`"12.345"`,            // more than two decimal places
		`"ten pounds"`,        // not a number
		`{"enum": "A; drop"}`, // not an identifier: would inject text
		`{"enum": ""}`,        // empty constructor
		`null`,                // nothing to render
	} {
		if got, err := InputLiteral(json.RawMessage(in)); err == nil {
			t.Errorf("InputLiteral(%s) = %q, want an error", in, got)
		}
	}
}

func TestScopeTypesAndCertifiedWrapping(t *testing.T) {
	rule := "```catala\n" +
		"declaration scope Charge:\n" +
		"  input taxable content ComputedOrNeedsHuman.CertifiedMoney\n" +
		"  input married content boolean\n" +
		"  output verdict content ComputedOrNeedsHuman.Verdict\n" +
		"declaration scope Other:\n" +
		"  input taxable content money\n" +
		"```\n"
	in := ScopeInputTypes(rule, "Charge")
	if in["taxable"] != "ComputedOrNeedsHuman.CertifiedMoney" || in["married"] != "boolean" || len(in) != 2 {
		t.Fatalf("ScopeInputTypes = %v", in)
	}
	if out := ScopeOutputTypes(rule, "Charge"); out["verdict"] != "ComputedOrNeedsHuman.Verdict" {
		t.Fatalf("ScopeOutputTypes = %v", out)
	}
	if got := WrapCertified("$5", in["taxable"]); got != "ComputedOrNeedsHuman.CertifiedMoney.Certified content $5" {
		t.Errorf("WrapCertified certified = %q", got)
	}
	if got := WrapCertified("true", in["married"]); got != "true" {
		t.Errorf("WrapCertified bare = %q", got)
	}
}

func TestParseMoneyListJSONAndPretty(t *testing.T) {
	got, err := ParseMoneyList(`noise {"per_member": [300000.0, 150000.5]} tail`, "per_member")
	if err != nil || len(got) != 2 || got[0] != 30000000 || got[1] != 15000050 {
		t.Fatalf("json form = %v, %v", got, err)
	}
	got, err = ParseMoneyList("│ per_member = [ $300,000.00; $150,000.00 ]", "per_member")
	if err != nil || len(got) != 2 || got[0] != 30000000 || got[1] != 15000000 {
		t.Fatalf("pretty form = %v, %v", got, err)
	}
	if _, err := ParseMoneyList("clerk: error: type mismatch", "per_member"); err == nil {
		t.Fatal("a missing field must be an error, never an empty list")
	}
}

func TestJudgePerHeir(t *testing.T) {
	right := []int64{2500000, 2500000, 2500000, 2500000}
	wrong := []int64{4000000, 2000000, 2000000, 2000000}
	if ok, _, _ := JudgePerHeir(right, right, "match"); !ok {
		t.Error("equal multisets must match")
	}
	if ok, _, _ := JudgePerHeir(right, wrong, "match"); ok {
		t.Error("a different split must not match")
	}
	if ok, _, _ := JudgePerHeir(right, wrong, "wrong_split"); !ok {
		t.Error("a conserving wrong split must be caught")
	}
	if ok, _, _ := JudgePerHeir(right, right, "wrong_split"); ok {
		t.Error("a wrong_split case that matches must fail")
	}
	if _, _, err := JudgePerHeir(right, []int64{1}, "wrong_split"); err == nil {
		t.Error("a non-conserving wrong_split case is malformed")
	}
	if _, _, err := JudgePerHeir(right, right, "maybe"); err == nil {
		t.Error("an unknown expect value is malformed")
	}
}

func TestExpandPerHeir(t *testing.T) {
	got, err := ExpandPerHeir([]int64{10, 20}, []int64{2, 1})
	if err != nil || len(got) != 3 || got[0] != 10 || got[1] != 10 || got[2] != 20 {
		t.Fatalf("ExpandPerHeir = %v, %v", got, err)
	}
	if _, err := ExpandPerHeir([]int64{10}, []int64{1, 1}); err == nil {
		t.Fatal("a length mismatch must be an error")
	}
}

// TestDriversMatchOracleVerifyPy is the parity check: for every published
// oracle, the Catala driver generated here must be byte-identical to the one
// scripts/oracle_verify.py generates, so the CLI and the standard's own CI
// harness assert the same thing. Skipped only when python3 is absent.
func TestDriversMatchOracleVerifyPy(t *testing.T) {
	if _, err := exec.LookPath("python3"); err != nil {
		t.Skip("python3 not on PATH")
	}
	files, _ := filepath.Glob(filepath.Join(standardRoot, "tests/oracles/*.oracle.json"))
	neg, _ := filepath.Glob(filepath.Join(standardRoot, "tests/oracles/negative/*.oracle.json"))
	files = append(files, neg...)
	if len(files) < 16 {
		t.Fatalf("found %d oracles, want at least 16", len(files))
	}
	compared := 0
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		o, err := Parse(raw)
		if err != nil {
			t.Fatalf("%s: %v", f, err)
		}
		ruleText := ""
		if b, err := os.ReadFile(filepath.Join(standardRoot, o.Rule.RuleFile)); err == nil {
			ruleText = string(b)
		}
		verdictType := ScopeOutputTypes(ruleText, o.Rule.Scope)[o.Rule.ResultField]
		if verdictType == "" {
			verdictType = "ParityVerdict"
		}
		var drivers []string
		switch o.Rule.ResultKind {
		case "per_heir":
			for _, c := range o.Cases {
				d, err := BuildPerHeirDriver(c, o.Rule.Scope, o.Rule.ListField, ScopeInputTypes(ruleText, o.Rule.Scope))
				if err != nil {
					t.Fatalf("%s: %v", f, err)
				}
				drivers = append(drivers, d)
			}
		case "verdict":
			d, err := BuildVerdictDriver(o.Cases, o.Rule.Scope, o.Rule.ResultField, verdictType, ScopeInputTypes(ruleText, o.Rule.Scope))
			if err != nil {
				t.Fatalf("%s: %v", f, err)
			}
			drivers = append(drivers, d)
		default:
			d, err := BuildDriver(o.Cases, o.Rule.Scope, o.Rule.ResultField, ScopeInputTypes(ruleText, o.Rule.Scope))
			if err != nil {
				t.Fatalf("%s: %v", f, err)
			}
			drivers = append(drivers, d)
		}

		py := exec.Command("python3", "-I", "-c", pyDrivers, filepath.Join(standardRoot, "scripts"), f, filepath.Join(standardRoot, o.Rule.RuleFile), verdictType)
		out, err := py.Output()
		if err != nil {
			t.Fatalf("%s: oracle_verify.py: %v", f, err)
		}
		var want []string
		if err := json.Unmarshal(out, &want); err != nil {
			t.Fatalf("%s: %v\n%s", f, err, out)
		}
		if strings.Join(drivers, "\x00") != strings.Join(want, "\x00") {
			t.Errorf("%s: driver differs from oracle_verify.py\n--- go ---\n%s\n--- py ---\n%s", filepath.Base(f), strings.Join(drivers, "\n"), strings.Join(want, "\n"))
		}
		compared++
	}
	t.Logf("%d oracles generate byte-identical drivers", compared)
}

const pyDrivers = `
import json, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import oracle_verify as ov
o = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
rp = Path(sys.argv[3])
rule_text = rp.read_text(encoding="utf-8") if rp.is_file() else ""
r = o["rule"]
scope = r["scope"]
types = ov.scope_input_types(rule_text, scope)
kind = r.get("result_kind", "scalar")
if kind == "per_heir":
    out = [ov.build_per_heir_driver(c, scope, r.get("list_field", "per_member_amounts"), types) for c in o["cases"]]
elif kind == "verdict":
    out = [ov.build_verdict_driver(o["cases"], scope, r.get("result_field", "verdict"), sys.argv[4], types)]
else:
    out = [ov.build_driver(o["cases"], scope, r.get("result_field", "verdict"), types)]
print(json.dumps(out))
`

func TestJudgePerHeirNamesAmountsInPounds(t *testing.T) {
	_, detail, _ := JudgePerHeir([]int64{51100000}, []int64{51100100}, "match")
	if !strings.Contains(detail, "£511,000.00") || !strings.Contains(detail, "£511,001.00") {
		t.Errorf("detail = %q", detail)
	}
}

// oracle_verify.py defaults a rule key only when it is ABSENT; an explicit
// empty or null value is not the default, so it is refused here.
func TestParseRefusesExplicitEmptyRuleKeys(t *testing.T) {
	for _, rule := range []string{
		`{"rule_file": "r.catala_en", "scope": "S", "result_field": ""}`,
		`{"rule_file": "r.catala_en", "scope": "S", "result_kind": null}`,
		`{"rule_file": "r.catala_en", "scope": "S", "list_field": ""}`,
	} {
		raw := `{"rule": ` + rule + `, "cases": [{"label": "x", "inputs": {}, "expected_money": "1"}]}`
		if _, err := Parse([]byte(raw)); err == nil {
			t.Errorf("Parse accepted %s", rule)
		}
	}
	if _, err := Parse([]byte(`{"rule": {"rule_file": "r", "scope": "S"}, "currency": "", "cases": [{"label": "x", "inputs": {}}]}`)); err == nil {
		t.Error("Parse accepted an explicit empty currency")
	}
}
