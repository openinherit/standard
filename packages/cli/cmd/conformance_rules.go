package cmd

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"slices"
	"sort"

	"github.com/cedar-policy/cedar-go"
	"github.com/cedar-policy/cedar-go/types"
	xast "github.com/cedar-policy/cedar-go/x/exp/ast"
	"github.com/cedar-policy/cedar-go/x/exp/schema"
	"github.com/cedar-policy/cedar-go/x/exp/schema/validate"
)

// The Cedar request->decision fixtures, standard-relative.
const cedarDecisionsRel = "tests/cedar/service-eligibility/decisions.json"

// cannotAnswer is a reason the rules check could not be carried out. It is
// exit 2 and never a pass.
type cannotAnswer struct{ msg string }

func (e *cannotAnswer) Error() string { return e.msg }

func unanswerable(format string, a ...any) error {
	return &cannotAnswer{fmt.Sprintf(format, a...)}
}

// ruleOutcome is one graded unit: a gov-oracle (Catala) or a request (Cedar).
type ruleOutcome struct {
	Leg    string `json:"leg"`
	Name   string `json:"name"`
	Status string `json:"status"` // GREEN | RED | UNPUBLISHED RULE
	Detail string `json:"detail,omitempty"`
}

type rulesLegResult struct {
	Leg      string        `json:"leg"`
	Note     string        `json:"note,omitempty"`
	Outcomes []ruleOutcome `json:"outcomes"`
	Error    string        `json:"error,omitempty"` // set when the leg could not answer
}

type rulesResult struct {
	Verdict    string           `json:"verdict"`
	Standard   string           `json:"standard"`
	Green      int              `json:"green"`
	Red        int              `json:"red"`
	Unanswered int              `json:"unanswered"`
	Legs       []rulesLegResult `json:"legs"`
	Disclaimer string           `json:"disclaimer"`
}

var (
	conformanceRulesFlag    bool
	conformanceStandardFlag string
	conformanceLegFlag      string
	conformanceClerkFlag    string
)

func init() {
	conformanceCmd.Flags().BoolVar(&conformanceRulesFlag, "rules", false, "Check the standard's own published rules instead of the schema kit")
	conformanceCmd.Flags().StringVar(&conformanceStandardFlag, "standard", ".", "With --rules: root of the standard (holds catala/, cedar/, tests/)")
	conformanceCmd.Flags().StringVar(&conformanceLegFlag, "leg", "all", "With --rules: all, catala or cedar")
	conformanceCmd.Flags().StringVar(&conformanceClerkFlag, "clerk", "clerk", "With --rules: the Catala clerk binary (1.2.0)")
}

// ExecuteConformanceRules is the testable entry point for `conformance --rules`.
// Exit codes: 0 every published answer reproduced; 1 at least one differs
// (proven, whatever else could not run); 2 something could not be answered.
func ExecuteConformanceRules(standard, leg, clerk string, jsonOutput bool, w io.Writer) int {
	res := rulesResult{Standard: standard, Disclaimer: Disclaimer, Legs: []rulesLegResult{}}
	var legs []string
	switch leg {
	case "all":
		legs = []string{"catala", "cedar"}
	case "catala", "cedar":
		legs = []string{leg}
	default:
		res.Legs = append(res.Legs, rulesLegResult{Leg: leg, Error: fmt.Sprintf("unknown leg %q (want all, catala or cedar)", leg)})
		res.Unanswered++
	}
	for _, l := range legs {
		var lr rulesLegResult
		var err error
		switch l {
		case "catala":
			lr, err = runCatalaLeg(standard, clerk)
		case "cedar":
			lr, err = runCedarLeg(standard)
		}
		lr.Leg = l
		if lr.Outcomes == nil {
			lr.Outcomes = []ruleOutcome{}
		}
		if err != nil {
			var ca *cannotAnswer
			if !errors.As(err, &ca) {
				err = &cannotAnswer{err.Error()}
			}
			lr.Error = err.Error()
			res.Unanswered++
		}
		for _, o := range lr.Outcomes {
			switch o.Status {
			case "GREEN":
				res.Green++
			case "RED":
				res.Red++
			default:
				res.Unanswered++
			}
		}
		res.Legs = append(res.Legs, lr)
	}

	code := 0
	res.Verdict = "RULES CONFORMANT"
	if res.Red > 0 {
		code, res.Verdict = 1, "RULES NOT CONFORMANT"
	} else if res.Unanswered > 0 {
		code, res.Verdict = 2, "CANNOT ANSWER"
	}

	if jsonOutput {
		out, _ := json.MarshalIndent(res, "", "  ")
		fmt.Fprintln(w, string(out))
		return code
	}
	fmt.Fprintf(w, "Standard: %s\n", standard)
	for _, lr := range res.Legs {
		fmt.Fprintf(w, "\n[%s]\n", lr.Leg)
		if lr.Note != "" {
			fmt.Fprintf(w, "  %s\n", lr.Note)
		}
		for _, o := range lr.Outcomes {
			mark := map[string]string{"GREEN": "✓", "RED": "✗"}[o.Status]
			if mark == "" {
				mark = "?"
			}
			fmt.Fprintf(w, "  %s %-16s %s", mark, o.Status, o.Name)
			if o.Detail != "" {
				fmt.Fprintf(w, " — %s", o.Detail)
			}
			fmt.Fprintln(w)
		}
		if lr.Error != "" {
			fmt.Fprintf(w, "  Error: %s\n", lr.Error)
		}
	}
	fmt.Fprintf(w, "\nVerdict: %s (%d reproduced, %d differ, %d not answered)\n", res.Verdict, res.Green, res.Red, res.Unanswered)
	fmt.Fprintf(w, "\nNote: %s\n", Disclaimer)
	return code
}

// standardFile reads a standard-relative path, refusing one that leaves the
// standard.
func standardFile(standard, rel string) ([]byte, error) {
	if rel == "" || !filepath.IsLocal(filepath.FromSlash(rel)) {
		return nil, unanswerable("%q is not a path inside the standard", rel)
	}
	data, err := os.ReadFile(filepath.Join(standard, filepath.FromSlash(rel)))
	if err != nil {
		return nil, unanswerable("cannot read %s: %s", rel, err)
	}
	return data, nil
}

// --- Cedar leg ---------------------------------------------------------------

type cedarCase struct {
	Label     string            `json:"label"`
	Pack      string            `json:"pack"`
	Principal map[string]string `json:"principal"`
	Resource  map[string]string `json:"resource"`
	Expected  string            `json:"expected"`
	Basis     string            `json:"basis"`
}

type cedarDecisions struct {
	Schema        string      `json:"schema"`
	PackDir       string      `json:"packDir"`
	PrincipalType string      `json:"principalType"`
	ResourceType  string      `json:"resourceType"`
	Action        string      `json:"action"`
	Cases         []cedarCase `json:"cases"`
}

// runCedarLeg evaluates every published Cedar pack, as one policy set, against
// the published request->decision fixtures.
func runCedarLeg(standard string) (rulesLegResult, error) {
	var lr rulesLegResult
	raw, err := standardFile(standard, cedarDecisionsRel)
	if err != nil {
		return lr, err
	}
	var d cedarDecisions
	if err := json.Unmarshal(raw, &d); err != nil {
		return lr, unanswerable("%s is not valid JSON: %s", cedarDecisionsRel, err)
	}
	if len(d.Cases) == 0 || d.Schema == "" || d.PackDir == "" || d.PrincipalType == "" || d.ResourceType == "" || d.Action == "" {
		return lr, unanswerable("%s must set schema, packDir, principalType, resourceType, action and at least one case", cedarDecisionsRel)
	}

	schemaSrc, err := standardFile(standard, d.Schema)
	if err != nil {
		return lr, err
	}
	var sch schema.Schema
	sch.SetFilename(d.Schema)
	if err := sch.UnmarshalCedar(schemaSrc); err != nil {
		return lr, unanswerable("schema %s: %s", d.Schema, err)
	}
	resolved, err := sch.Resolve()
	if err != nil {
		return lr, unanswerable("schema %s: %s", d.Schema, err)
	}
	validator := validate.New(resolved, validate.WithStrict())

	// Every *.cedar in packDir is a published pack: all of them are loaded, and
	// all of them must be exercised.
	if !filepath.IsLocal(filepath.FromSlash(d.PackDir)) {
		return lr, unanswerable("packDir %q is not a path inside the standard", d.PackDir)
	}
	matches, err := filepath.Glob(filepath.Join(standard, filepath.FromSlash(d.PackDir), "*.cedar"))
	if err != nil || len(matches) == 0 {
		return lr, unanswerable("no *.cedar packs in %s", d.PackDir)
	}
	sort.Strings(matches)
	ps := cedar.NewPolicySet()
	packOf := map[cedar.PolicyID]string{}
	var packs []string
	for _, m := range matches {
		rel := path.Join(d.PackDir, filepath.Base(m))
		packs = append(packs, rel)
		src, err := os.ReadFile(m)
		if err != nil {
			return lr, unanswerable("cannot read %s: %s", rel, err)
		}
		one, err := cedar.NewPolicySetFromBytes(rel, src)
		if err != nil {
			return lr, unanswerable("%s does not parse: %s", rel, err)
		}
		for id, p := range one.All() {
			if err := validator.Policy(string(id), (*xast.Policy)(p.AST())); err != nil {
				return lr, unanswerable("%s does not validate against %s: %s", rel, d.Schema, err)
			}
			qid := cedar.PolicyID(rel + "#" + string(id))
			ps.Add(qid, p)
			packOf[qid] = rel
		}
	}

	allows := map[string]int{}
	denies := map[string]int{}
	seen := map[string]bool{}
	for i, c := range d.Cases {
		if c.Label == "" || seen[c.Label] {
			return lr, unanswerable("case %d: label missing or repeated (%q)", i, c.Label)
		}
		seen[c.Label] = true
		if c.Expected != "allow" && c.Expected != "deny" {
			return lr, unanswerable("case %s: expected must be allow or deny, got %q", c.Label, c.Expected)
		}
		if c.Basis == "" {
			return lr, unanswerable("case %s: no basis (every expected decision cites why)", c.Label)
		}
		if !slices.Contains(packs, c.Pack) {
			return lr, unanswerable("case %s names pack %q, which is not one of %v", c.Label, c.Pack, packs)
		}

		principal := types.NewEntityUID(types.EntityType(d.PrincipalType), "principal")
		resource := types.NewEntityUID(types.EntityType(d.ResourceType), "resource")
		entities := types.EntityMap{
			principal: {UID: principal, Attributes: stringRecord(c.Principal)},
			resource:  {UID: resource, Attributes: stringRecord(c.Resource)},
		}
		req := types.Request{
			Principal: principal,
			Action:    types.NewEntityUID("Action", types.String(d.Action)),
			Resource:  resource,
			Context:   types.Record{},
		}
		if err := validator.Entities(entities); err != nil {
			return lr, unanswerable("case %s: entities do not conform to %s: %s", c.Label, d.Schema, err)
		}
		if err := validator.Request(req); err != nil {
			return lr, unanswerable("case %s: request does not conform to %s: %s", c.Label, d.Schema, err)
		}

		decision, diag := cedar.Authorize(ps, entities, req)
		if len(diag.Errors) > 0 {
			return lr, unanswerable("case %s: evaluation error: %v", c.Label, diag.Errors[0])
		}
		got := "deny"
		if decision == cedar.Allow {
			got = "allow"
		}
		o := ruleOutcome{Leg: "cedar", Name: c.Pack + " " + c.Label, Status: "GREEN"}
		if got != c.Expected {
			o.Status = "RED"
			o.Detail = fmt.Sprintf("expected %s, decided %s (%s)", c.Expected, got, c.Basis)
		} else if got == "allow" {
			// An allow must be granted by the pack the case names, or the case
			// does not exercise that pack.
			granted := false
			for _, r := range diag.Reasons {
				if packOf[r.PolicyID] == c.Pack {
					granted = true
				}
			}
			if !granted {
				return lr, unanswerable("case %s: allowed, but not by a policy in %s", c.Label, c.Pack)
			}
			allows[c.Pack]++
		} else {
			denies[c.Pack]++
		}
		lr.Outcomes = append(lr.Outcomes, o)
	}

	for _, p := range packs {
		if allows[p] == 0 || denies[p] == 0 {
			return lr, unanswerable("pack %s is not exercised: it needs at least one allow case it grants and one deny case (has %d allow, %d deny)", p, allows[p], denies[p])
		}
	}
	lr.Note = fmt.Sprintf("%d packs, %d requests", len(packs), len(d.Cases))
	return lr, nil
}

func stringRecord(m map[string]string) types.Record {
	rm := types.RecordMap{}
	for k, v := range m {
		rm[types.String(k)] = types.String(v)
	}
	return types.NewRecord(rm)
}
