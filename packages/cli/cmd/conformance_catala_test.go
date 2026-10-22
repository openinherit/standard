package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// fakeClerk stands in for clerk 1.2.0 so the Catala leg can be tested
// without the toolchain. `clerk test` passes only when every generated driver
// in the project contains $FAKE_CLERK_PASS_IF -- so a test proves the oracle's
// figure reached the driver, not merely that clerk was called. `clerk run`
// prints $FAKE_CLERK_RUN. Every driver it sees is appended to $FAKE_CLERK_LOG.
const fakeClerkScript = `#!/bin/sh
case "$1" in
  --version) echo "1.2.0 (fake)"; exit 0 ;;
  start) exit 0 ;;
  test)
    cat ./*.catala_en >> "$FAKE_CLERK_LOG"
    if grep -qF -- "$FAKE_CLERK_PASS_IF" ./*.catala_en; then echo "ALL TESTS PASSED"; exit 0; fi
    echo "[ERROR] Assertion failed"; echo "1 tests FAILED"; exit 1 ;;
  run)
    cat ./*.catala_en >> "$FAKE_CLERK_LOG"
    printf '%s\n' "$FAKE_CLERK_RUN"; exit 0 ;;
esac
exit 99
`

func fakeClerk(t *testing.T, passIf, run string) string {
	t.Helper()
	dir := t.TempDir()
	p := filepath.Join(dir, "clerk")
	if err := os.WriteFile(p, []byte(fakeClerkScript), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("FAKE_CLERK_PASS_IF", passIf)
	t.Setenv("FAKE_CLERK_RUN", run)
	t.Setenv("FAKE_CLERK_LOG", filepath.Join(dir, "log"))
	return p
}

func clerkLog(t *testing.T, clerk string) string {
	b, _ := os.ReadFile(filepath.Join(filepath.Dir(clerk), "log"))
	return string(b)
}

const fixedNetSumOracle = "tests/oracles/fixed-net-sum-aea1925.oracle.json"

// catalaTree is a standard holding one published scalar oracle and its rule.
func catalaTree(t *testing.T) string {
	return copyTree(t, "catala/contract", "catala/probate/FixedNetSum.catala_en", fixedNetSumOracle)
}

func writeOracle(t *testing.T, p string, v any) {
	t.Helper()
	out, _ := json.MarshalIndent(v, "", "  ")
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, out, 0o644); err != nil {
		t.Fatal(err)
	}
}

func editJSON(t *testing.T, p string, fn func(map[string]any)) {
	t.Helper()
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Fatal(err)
	}
	var d map[string]any
	if err := json.Unmarshal(raw, &d); err != nil {
		t.Fatal(err)
	}
	fn(d)
	writeOracle(t, p, d)
}

func runCatala(t *testing.T, std, clerk string) (int, string) {
	t.Helper()
	var buf bytes.Buffer
	code := ExecuteConformanceRules(std, "catala", clerk, false, &buf)
	return code, buf.String()
}

func TestRulesCatalaClerkMissingFailsClosed(t *testing.T) {
	code, out := runCatala(t, catalaTree(t), filepath.Join(t.TempDir(), "no-clerk"))
	if code != 2 {
		t.Fatalf("exit %d, want 2 (no clerk is never a pass)\n%s", code, out)
	}
	if !strings.Contains(out, "clerk") {
		t.Errorf("output does not say clerk is missing\n%s", out)
	}
}

func TestRulesCatalaGreenWhenEveryFigureReproduced(t *testing.T) {
	clerk := fakeClerk(t, "assertion c1_amt = $322,000", "")
	code, out := runCatala(t, catalaTree(t), clerk)
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if !strings.Contains(out, "GREEN") || !strings.Contains(out, "fixed-net-sum-aea1925") {
		t.Errorf("no GREEN line for the oracle\n%s", out)
	}
	log := clerkLog(t, clerk)
	for _, want := range []string{"declaration scope AsAt:", "-- date_of_death: |2022-06-01|", "assertion c0_amt = $270,000", "assertion c0_ok = true"} {
		if !strings.Contains(log, want) {
			t.Errorf("clerk was not given %q", want)
		}
	}
}

func TestRulesCatalaFlippedFigureIsRed(t *testing.T) {
	std := catalaTree(t)
	editJSON(t, filepath.Join(std, fixedNetSumOracle), func(d map[string]any) {
		d["cases"].([]any)[1].(map[string]any)["expected_money"] = "325000"
	})
	clerk := fakeClerk(t, "assertion c1_amt = $322,000", "")
	code, out := runCatala(t, std, clerk)
	if code != 1 {
		t.Fatalf("exit %d, want 1\n%s", code, out)
	}
	if !strings.Contains(out, "RED") || !strings.Contains(out, "fixed-net-sum-aea1925") {
		t.Errorf("output does not name the RED oracle\n%s", out)
	}
}

func TestRulesCatalaUnpublishedRuleCannotBeAnswered(t *testing.T) {
	std := catalaTree(t)
	writeOracle(t, filepath.Join(std, "tests/oracles/missing.oracle.json"), map[string]any{
		"rule":  map[string]any{"rule_file": "catala/wills/Absent.catala_en", "scope": "S", "depends_modules": []string{"catala/contract/ComputedOrNeedsHuman.catala_en"}},
		"cases": []any{map[string]any{"label": "x", "inputs": map[string]any{"a": "1"}, "expected_money": "1"}},
	})
	clerk := fakeClerk(t, "assertion c1_amt = $322,000", "")
	code, out := runCatala(t, std, clerk)
	if code != 2 {
		t.Fatalf("exit %d, want 2 (an oracle whose rule is not published is unanswered)\n%s", code, out)
	}
	if !strings.Contains(out, "UNPUBLISHED RULE") || !strings.Contains(out, "catala/wills/Absent.catala_en") {
		t.Errorf("output does not name the unpublished rule\n%s", out)
	}
}

func TestRulesCatalaRedOutranksUnpublished(t *testing.T) {
	std := catalaTree(t)
	writeOracle(t, filepath.Join(std, "tests/oracles/missing.oracle.json"), map[string]any{
		"rule":  map[string]any{"rule_file": "catala/wills/Absent.catala_en", "scope": "S"},
		"cases": []any{map[string]any{"label": "x", "inputs": map[string]any{"a": "1"}, "expected_money": "1"}},
	})
	clerk := fakeClerk(t, "this text is in no driver", "")
	if code, out := runCatala(t, std, clerk); code != 1 {
		t.Fatalf("exit %d, want 1 (a proven difference is reported as one)\n%s", code, out)
	}
}

func TestRulesCatalaMalformedOracleCannotBeAnswered(t *testing.T) {
	std := catalaTree(t)
	editJSON(t, filepath.Join(std, fixedNetSumOracle), func(d map[string]any) { d["cases"] = []any{} })
	clerk := fakeClerk(t, "", "")
	if code, out := runCatala(t, std, clerk); code != 2 {
		t.Fatalf("exit %d, want 2\n%s", code, out)
	}
}

func TestRulesCatalaNoOraclesCannotBeAnswered(t *testing.T) {
	std := copyTree(t, "catala/contract")
	clerk := fakeClerk(t, "", "")
	if code, out := runCatala(t, std, clerk); code != 2 {
		t.Fatalf("exit %d, want 2\n%s", code, out)
	}
}

func TestRulesCatalaRuleOutsideStandardRefused(t *testing.T) {
	std := catalaTree(t)
	editJSON(t, filepath.Join(std, fixedNetSumOracle), func(d map[string]any) {
		d["rule"].(map[string]any)["rule_file"] = "../../etc/passwd"
	})
	clerk := fakeClerk(t, "", "")
	if code, out := runCatala(t, std, clerk); code != 2 {
		t.Fatalf("exit %d, want 2\n%s", code, out)
	}
}

func perHeirTree(t *testing.T, claimed []int) string {
	std := t.TempDir()
	if err := os.MkdirAll(filepath.Join(std, "catala/probate"), 0o755); err != nil {
		t.Fatal(err)
	}
	rule := "```catala\ndeclaration scope Distribute:\n  input fund content money\n  input members content list of integer\n  output per_member_amounts content list of money\n```\n"
	if err := os.WriteFile(filepath.Join(std, "catala/probate/ClassGift.catala_en"), []byte(rule), 0o644); err != nil {
		t.Fatal(err)
	}
	writeOracle(t, filepath.Join(std, "tests/oracles/class-gift.oracle.json"), map[string]any{
		"rule": map[string]any{"rule_file": "catala/probate/ClassGift.catala_en", "scope": "Distribute", "result_kind": "per_heir", "list_field": "per_member_amounts"},
		"cases": []any{
			map[string]any{"label": "match", "inputs": map[string]any{"fund": "100000", "members": []int{1, 1, 1, 1}}, "expected_per_heir_gbp": claimed, "expect": "match"},
			map[string]any{"label": "wrong-split", "inputs": map[string]any{"fund": "100000", "members": []int{1, 1, 1, 1}}, "expected_per_heir_gbp": []int{40000, 20000, 20000, 20000}, "expect": "wrong_split"},
		},
	})
	return std
}

func TestRulesCatalaPerHeirGreen(t *testing.T) {
	clerk := fakeClerk(t, "", `{ "per_member": [25000.0, 25000.0, 25000.0, 25000.0] }`)
	code, out := runCatala(t, perHeirTree(t, []int{25000, 25000, 25000, 25000}), clerk)
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if !strings.Contains(clerkLog(t, clerk), "(output of Distribute with { -- fund: $100,000 -- members: [1; 1; 1; 1] }).per_member_amounts") {
		t.Errorf("per-heir driver not generated as expected\n%s", clerkLog(t, clerk))
	}
}

func TestRulesCatalaPerHeirWrongAllocationIsRed(t *testing.T) {
	clerk := fakeClerk(t, "", `{ "per_member": [25000.0, 25000.0, 25000.0, 25000.0] }`)
	code, out := runCatala(t, perHeirTree(t, []int{30000, 30000, 20000, 20000}), clerk)
	if code != 1 {
		t.Fatalf("exit %d, want 1\n%s", code, out)
	}
	if !strings.Contains(out, "match") {
		t.Errorf("output does not name the failing case\n%s", out)
	}
}

func TestRulesCatalaPerHeirNoOutputCannotBeAnswered(t *testing.T) {
	clerk := fakeClerk(t, "", "error: the rule did not compile")
	if code, out := runCatala(t, perHeirTree(t, []int{25000, 25000, 25000, 25000}), clerk); code != 2 {
		t.Fatalf("exit %d, want 2 (no list printed is not an answer)\n%s", code, out)
	}
}

func TestRulesCatalaVerdictKind(t *testing.T) {
	std := t.TempDir()
	if err := os.MkdirAll(filepath.Join(std, "catala/wills"), 0o755); err != nil {
		t.Fatal(err)
	}
	rule := "```catala\ndeclaration scope Check:\n  input witnessed content boolean\n  output verdict content Validity\n```\n"
	if err := os.WriteFile(filepath.Join(std, "catala/wills/Check.catala_en"), []byte(rule), 0o644); err != nil {
		t.Fatal(err)
	}
	writeOracle(t, filepath.Join(std, "tests/oracles/check.oracle.json"), map[string]any{
		"rule":  map[string]any{"rule_file": "catala/wills/Check.catala_en", "scope": "Check", "result_kind": "verdict"},
		"cases": []any{map[string]any{"label": "two witnesses", "inputs": map[string]any{"witnessed": true}, "expected_verdict": "Valid"}},
	})
	clerk := fakeClerk(t, "assertion v = Valid", "")
	code, out := runCatala(t, std, clerk)
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if !strings.Contains(clerkLog(t, clerk), "declaration scope OracleVerdict_0_two_witnesses:\n  output v content Validity") {
		t.Errorf("verdict driver not generated as expected\n%s", clerkLog(t, clerk))
	}
}

// TestRulesCatalaRealTreeAccountsForEveryOracle runs the real published
// oracles: every one is either run or named as UNPUBLISHED RULE, and it is
// UNPUBLISHED exactly when a file it names is absent.
func TestRulesCatalaRealTreeAccountsForEveryOracle(t *testing.T) {
	clerk := fakeClerk(t, "", "")
	var buf bytes.Buffer
	code := ExecuteConformanceRules(standardRoot, "catala", clerk, true, &buf)
	var res rulesResult
	if err := json.Unmarshal(buf.Bytes(), &res); err != nil {
		t.Fatalf("%v\n%s", err, buf.String())
	}
	files, _ := filepath.Glob(filepath.Join(standardRoot, "tests/oracles/*.oracle.json"))
	if len(res.Legs) != 1 || len(res.Legs[0].Outcomes) != len(files) || len(files) < 16 {
		t.Fatalf("graded %d outcomes for %d oracle files\n%s", len(res.Legs[0].Outcomes), len(files), buf.String())
	}
	unpublished := 0
	for _, o := range res.Legs[0].Outcomes {
		raw, _ := os.ReadFile(filepath.Join(standardRoot, "tests/oracles", o.Name+".oracle.json"))
		var or struct {
			Rule struct {
				RuleFile string   `json:"rule_file"`
				Deps     []string `json:"depends_modules"`
			} `json:"rule"`
		}
		_ = json.Unmarshal(raw, &or)
		missing := false
		for _, f := range append([]string{or.Rule.RuleFile}, or.Rule.Deps...) {
			if _, err := os.Stat(filepath.Join(standardRoot, f)); err != nil {
				missing = true
			}
		}
		if missing != (o.Status == "UNPUBLISHED RULE") {
			t.Errorf("%s: status %s, but a named file missing = %t", o.Name, o.Status, missing)
		}
		if missing {
			unpublished++
		}
	}
	if unpublished > 0 && code != 1 && code != 2 {
		t.Errorf("exit %d with %d unpublished rules: an unanswered oracle must never pass", code, unpublished)
	}
	t.Logf("%d oracles, %d with an unpublished rule", len(files), unpublished)
}
