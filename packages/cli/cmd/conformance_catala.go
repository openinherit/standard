package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"sort"
	"strings"

	"github.com/openinherit/inherit-cli/internal/oracle"
)

// The published gov-oracles, standard-relative. negative/ holds the harness's
// own must-go-red controls and is not part of the standard's answers.
const oracleGlob = "tests/oracles/*.oracle.json"

// runCatalaLeg re-runs every published gov-oracle through the published Catala
// with clerk, the way scripts/oracle_verify.py does, and grades each oracle
// GREEN (every case reproduced), RED (clerk ran and an answer differs), or
// UNPUBLISHED RULE (a file the oracle names is not in the standard).
func runCatalaLeg(standard, clerk string) (rulesLegResult, error) {
	var lr rulesLegResult
	bin, err := exec.LookPath(clerk)
	if err != nil {
		return lr, unanswerable("clerk not found (%s): the Catala leg needs catala and clerk 1.2.0 on PATH, or --clerk", err)
	}
	ver, err := exec.Command(bin, "--version").Output()
	if err != nil {
		return lr, unanswerable("cannot run %s --version: %s", bin, err)
	}

	files, err := filepath.Glob(filepath.Join(standard, filepath.FromSlash(oracleGlob)))
	if err != nil || len(files) == 0 {
		return lr, unanswerable("no gov-oracles match %s in %s", oracleGlob, standard)
	}
	sort.Strings(files)
	lr.Note = fmt.Sprintf("clerk %s · %d gov-oracles", strings.TrimSpace(string(ver)), len(files))
	for _, f := range files {
		lr.Outcomes = append(lr.Outcomes, gradeOracle(standard, bin, f))
	}
	return lr, nil
}

func gradeOracle(standard, clerk, file string) ruleOutcome {
	o := ruleOutcome{Leg: "catala", Name: strings.TrimSuffix(filepath.Base(file), ".oracle.json")}
	errored := func(format string, a ...any) ruleOutcome {
		o.Status, o.Detail = "ERROR", fmt.Sprintf(format, a...)
		return o
	}
	raw, err := os.ReadFile(file)
	if err != nil {
		return errored("cannot read: %s", err)
	}
	orc, err := oracle.Parse(raw)
	if err != nil {
		return errored("%s", err)
	}

	// Every file the oracle names must be in the standard. An absent one means
	// the rule is not published, so the oracle cannot be answered here.
	names := append([]string{orc.Rule.RuleFile}, orc.Rule.DependsModules...)
	var missing []string
	for _, n := range names {
		if !filepath.IsLocal(filepath.FromSlash(n)) {
			return errored("%q is not a path inside the standard", n)
		}
		if _, err := os.Stat(filepath.Join(standard, filepath.FromSlash(n))); err != nil {
			missing = append(missing, n)
		}
	}
	if len(missing) > 0 {
		o.Status, o.Detail = "UNPUBLISHED RULE", strings.Join(missing, ", ")
		return o
	}
	ruleText, err := os.ReadFile(filepath.Join(standard, filepath.FromSlash(orc.Rule.RuleFile)))
	if err != nil {
		return errored("cannot read %s: %s", orc.Rule.RuleFile, err)
	}
	deps := orc.Rule.DependsModules
	ruleName := path.Base(orc.Rule.RuleFile)
	inputTypes := oracle.ScopeInputTypes(string(ruleText), orc.Rule.Scope)

	switch orc.Rule.ResultKind {
	case "scalar", "verdict":
		var driver string
		if orc.Rule.ResultKind == "verdict" {
			vt := oracle.ScopeOutputTypes(string(ruleText), orc.Rule.Scope)[orc.Rule.ResultField]
			if vt == "" {
				return errored("scope %s declares no output %s in %s", orc.Rule.Scope, orc.Rule.ResultField, orc.Rule.RuleFile)
			}
			driver, err = oracle.BuildVerdictDriver(orc.Cases, orc.Rule.Scope, orc.Rule.ResultField, vt, inputTypes)
		} else {
			driver, err = oracle.BuildDriver(orc.Cases, orc.Rule.Scope, orc.Rule.ResultField, inputTypes)
		}
		if err != nil {
			return errored("%s", err)
		}
		out, passed, err := clerkProject(standard, clerk, deps, ruleName, string(ruleText)+"\n"+driver, "test")
		if err != nil {
			return errored("%s", err)
		}
		// The same predicate as oracle_verify.py and check-catala-contract.sh.
		if passed && strings.Contains(out, "ALL TESTS PASSED") {
			o.Status, o.Detail = "GREEN", fmt.Sprintf("%d case(s) reproduced", len(orc.Cases))
			return o
		}
		o.Status, o.Detail = "RED", "clerk: "+clerkFailureLines(out)
		return o

	case "per_heir":
		var red []string
		for _, c := range orc.Cases {
			driver, err := oracle.BuildPerHeirDriver(c, orc.Rule.Scope, orc.Rule.ListField, inputTypes)
			if err != nil {
				return errored("%s", err)
			}
			out, _, err := clerkProject(standard, clerk, deps, ruleName, string(ruleText)+"\n"+driver, "run", ruleName, "-s", "OraclePerHeirDriver", "-F", "json")
			if err != nil {
				return errored("%s", err)
			}
			perBranch, err := oracle.ParseMoneyList(out, "per_member")
			if err != nil {
				return errored("case %s: %s (clerk: %s)", c.Label, err, clerkFailureLines(out))
			}
			var counts []int64
			if orc.Rule.RepeatBy != nil {
				counts, err = repeatCounts(c, *orc.Rule.RepeatBy)
				if err != nil {
					return errored("case %s: %s", c.Label, err)
				}
			}
			computed, err := oracle.ExpandPerHeir(perBranch, counts)
			if err != nil {
				return errored("case %s: %s", c.Label, err)
			}
			claimed := make([]int64, len(c.ExpectedPerHeir))
			for i, n := range c.ExpectedPerHeir {
				if claimed[i], err = oracle.ToPence(n.String()); err != nil {
					return errored("case %s: %s", c.Label, err)
				}
			}
			ok, detail, err := oracle.JudgePerHeir(computed, claimed, c.Expect)
			if err != nil {
				return errored("case %s: %s", c.Label, err)
			}
			if !ok {
				red = append(red, fmt.Sprintf("%s [%s]: %s", c.Label, c.Expect, detail))
			}
		}
		if len(red) > 0 {
			o.Status, o.Detail = "RED", strings.Join(red, "; ")
			return o
		}
		o.Status, o.Detail = "GREEN", fmt.Sprintf("%d per-heir case(s) reproduced", len(orc.Cases))
		return o
	}
	return errored("unknown result_kind %q", orc.Rule.ResultKind)
}

// clerkProject builds a throwaway clerk project -- the contract modules and a
// copy of the rule with the driver appended, keeping filenames because a
// Catala module name is its filename -- and runs `clerk start` then the given
// clerk command. The driver lives in the rule's own module because
// cross-module sub-scope calls do not resolve in clerk 1.2.0.
func clerkProject(standard, clerk string, deps []string, ruleName, ruleWithDriver string, args ...string) (string, bool, error) {
	work, err := os.MkdirTemp("", "inherit-oracle-")
	if err != nil {
		return "", false, err
	}
	defer os.RemoveAll(work)
	for _, d := range deps {
		data, err := os.ReadFile(filepath.Join(standard, filepath.FromSlash(d)))
		if err != nil {
			return "", false, fmt.Errorf("cannot read %s: %s", d, err)
		}
		if err := os.WriteFile(filepath.Join(work, path.Base(d)), data, 0o644); err != nil {
			return "", false, err
		}
	}
	if err := os.WriteFile(filepath.Join(work, ruleName), []byte(ruleWithDriver), 0o644); err != nil {
		return "", false, err
	}
	start := exec.Command(clerk, "start")
	start.Dir = work
	_ = start.Run() // tolerated, as oracle_verify.py does: clerk test reports a real failure
	cmd := exec.Command(clerk, args...)
	cmd.Dir = work
	out, err := cmd.CombinedOutput()
	if err != nil {
		if _, isExit := err.(*exec.ExitError); !isExit {
			return string(out), false, fmt.Errorf("cannot run clerk: %s", err)
		}
		return string(out), false, nil
	}
	return string(out), true, nil
}

func repeatCounts(c oracle.Case, key string) ([]int64, error) {
	for _, kv := range c.Inputs {
		if kv.Key == key {
			return oracle.IntList(kv.Value)
		}
	}
	return nil, fmt.Errorf("lacks repeat_by input %q", key)
}

// clerkFailureLines keeps the lines of clerk output that say what failed.
func clerkFailureLines(out string) string {
	var keep []string
	for _, l := range strings.Split(out, "\n") {
		for _, k := range []string{"FAILED", "Assertion", "rror", "OracleVerdict"} {
			if strings.Contains(l, k) {
				keep = append(keep, strings.TrimSpace(l))
				break
			}
		}
	}
	if len(keep) == 0 {
		return "no ALL TESTS PASSED"
	}
	if len(keep) > 6 {
		keep = append(keep[:6], "…")
	}
	return strings.Join(keep, " | ")
}
