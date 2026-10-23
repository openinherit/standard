package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// standardRoot is the checkout of the standard this CLI lives in.
const standardRoot = "../../.."

const decisionsRel = "tests/cedar/service-eligibility/decisions.json"

// copyTree copies the named standard-relative paths (files or directories)
// from the real checkout into a fresh temp standard, so a test can mutate it.
func copyTree(t *testing.T, rels ...string) string {
	t.Helper()
	dst := t.TempDir()
	for _, rel := range rels {
		src := filepath.Join(standardRoot, rel)
		err := filepath.Walk(src, func(p string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			r, _ := filepath.Rel(standardRoot, p)
			if info.IsDir() {
				return os.MkdirAll(filepath.Join(dst, r), 0o755)
			}
			data, err := os.ReadFile(p)
			if err != nil {
				return err
			}
			if err := os.MkdirAll(filepath.Dir(filepath.Join(dst, r)), 0o755); err != nil {
				return err
			}
			return os.WriteFile(filepath.Join(dst, r), data, 0o644)
		})
		if err != nil {
			t.Fatalf("copy %s: %v", rel, err)
		}
	}
	return dst
}

func cedarTree(t *testing.T) string {
	return copyTree(t, "cedar/service-eligibility", decisionsRel)
}

// editDecisions rewrites the decisions fixture through fn.
func editDecisions(t *testing.T, std string, fn func(d map[string]any)) {
	t.Helper()
	p := filepath.Join(std, decisionsRel)
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Fatal(err)
	}
	var d map[string]any
	if err := json.Unmarshal(raw, &d); err != nil {
		t.Fatal(err)
	}
	fn(d)
	out, _ := json.MarshalIndent(d, "", "  ")
	if err := os.WriteFile(p, out, 0o644); err != nil {
		t.Fatal(err)
	}
}

func cases(d map[string]any) []any { return d["cases"].([]any) }

func runRules(t *testing.T, std, leg string) (int, string) {
	t.Helper()
	var buf bytes.Buffer
	code := ExecuteConformanceRules(std, leg, "clerk", false, &buf)
	return code, buf.String()
}

// --- Cedar leg ---------------------------------------------------------------

func TestRulesCedarRealTreeConformant(t *testing.T) {
	code, out := runRules(t, standardRoot, "cedar")
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	for _, pack := range []string{"ew.cedar", "sct.cedar", "nir.cedar"} {
		if !strings.Contains(out, pack) {
			t.Errorf("output does not name pack %s\n%s", pack, out)
		}
	}
	if !strings.Contains(out, "RULES CONFORMANT") {
		t.Errorf("no RULES CONFORMANT verdict\n%s", out)
	}
}

func TestRulesCedarInvertedDecisionIsRed(t *testing.T) {
	std := cedarTree(t)
	var label string
	editDecisions(t, std, func(d map[string]any) {
		c := cases(d)[0].(map[string]any)
		label = c["label"].(string)
		if c["expected"] == "allow" {
			c["expected"] = "deny"
		} else {
			c["expected"] = "allow"
		}
	})
	code, out := runRules(t, std, "cedar")
	if code != 1 {
		t.Fatalf("exit %d, want 1\n%s", code, out)
	}
	if !strings.Contains(out, label) {
		t.Errorf("output does not name the inverted case %q\n%s", label, out)
	}
}

func TestRulesCedarUnexercisedPackFailsClosed(t *testing.T) {
	std := cedarTree(t)
	pack := `@jurisdiction("IE")
permit (principal, action == Action::"OfferService", resource)
when { principal.category == "solicitor" && resource.jurisdiction == "IE" };
`
	if err := os.WriteFile(filepath.Join(std, "cedar/service-eligibility/irl.cedar"), []byte(pack), 0o644); err != nil {
		t.Fatal(err)
	}
	code, out := runRules(t, std, "cedar")
	if code != 2 {
		t.Fatalf("exit %d, want 2 (a published pack with no fixtures is unchecked)\n%s", code, out)
	}
	if !strings.Contains(out, "irl.cedar") {
		t.Errorf("output does not name the unexercised pack\n%s", out)
	}
}

func TestRulesCedarPackWithoutDenyCaseFailsClosed(t *testing.T) {
	std := cedarTree(t)
	editDecisions(t, std, func(d map[string]any) {
		var kept []any
		for _, c := range cases(d) {
			m := c.(map[string]any)
			if m["pack"] == "cedar/service-eligibility/nir.cedar" && m["expected"] == "deny" {
				continue
			}
			kept = append(kept, c)
		}
		d["cases"] = kept
	})
	code, out := runRules(t, std, "cedar")
	if code != 2 {
		t.Fatalf("exit %d, want 2\n%s", code, out)
	}
	if !strings.Contains(out, "nir.cedar") {
		t.Errorf("output does not name the pack missing a deny case\n%s", out)
	}
}

func TestRulesCedarAttributeNotInSchemaFailsClosed(t *testing.T) {
	std := cedarTree(t)
	editDecisions(t, std, func(d map[string]any) {
		cases(d)[0].(map[string]any)["resource"].(map[string]any)["colour"] = "red"
	})
	code, out := runRules(t, std, "cedar")
	if code != 2 {
		t.Fatalf("exit %d, want 2 (a request the schema does not admit)\n%s", code, out)
	}
}

func TestRulesCedarAllowFromAnotherPackFailsClosed(t *testing.T) {
	std := cedarTree(t)
	editDecisions(t, std, func(d map[string]any) {
		for _, c := range cases(d) {
			m := c.(map[string]any)
			if m["pack"] == "cedar/service-eligibility/ew.cedar" && m["expected"] == "allow" {
				m["pack"] = "cedar/service-eligibility/sct.cedar"
				return
			}
		}
		t.Fatal("no E&W allow case to relabel")
	})
	code, out := runRules(t, std, "cedar")
	if code != 2 {
		t.Fatalf("exit %d, want 2 (an allow the named pack did not grant)\n%s", code, out)
	}
}

func TestRulesCedarNoFixturesFailsClosed(t *testing.T) {
	std := copyTree(t, "cedar/service-eligibility")
	code, out := runRules(t, std, "cedar")
	if code != 2 {
		t.Fatalf("exit %d, want 2\n%s", code, out)
	}
}

func TestRulesUnknownLegFailsClosed(t *testing.T) {
	code, out := runRules(t, standardRoot, "tax")
	if code != 2 {
		t.Fatalf("exit %d, want 2\n%s", code, out)
	}
}
