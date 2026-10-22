// Package oracle generates the Catala drivers that re-run a published
// gov-oracle (tests/oracles/*.oracle.json) through its published rule.
//
// It is a port of the driver generation in scripts/oracle_verify.py, the
// harness the standard's own CI runs, and is held to it byte for byte by
// TestDriversMatchOracleVerifyPy: the CLI and that harness must assert the same
// thing. Where the Python accepts an input this package cannot render
// unambiguously, this package refuses it rather than guess.
package oracle

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/big"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

// KV is one rule input, in the order the oracle lists it.
type KV struct {
	Key   string
	Value json.RawMessage
}

// Case is one oracle case.
type Case struct {
	Label           string
	Inputs          []KV
	ExpectedMoney   json.RawMessage // expected_money, or the legacy expected_money_gbp
	ExpectedVerdict json.RawMessage
	ExpectedPerHeir []json.Number // expected_per_heir_gbp
	Expect          string        // per_heir: match | wrong_split
}

// Rule names the rule an oracle runs.
type Rule struct {
	RuleFile       string   `json:"rule_file"`
	Scope          string   `json:"scope"`
	ResultField    string   `json:"result_field"`
	ResultKind     string   `json:"result_kind"`
	ListField      string   `json:"list_field"`
	RepeatBy       *string  `json:"repeat_by"`
	DependsModules []string `json:"depends_modules"`
}

// Oracle is a parsed tests/oracles/*.oracle.json.
type Oracle struct {
	Rule     Rule
	Cases    []Case
	Currency string
}

// Parse reads an oracle, applying oracle_verify.py's defaults.
func Parse(raw []byte) (*Oracle, error) {
	var top struct {
		Rule     *Rule             `json:"rule"`
		Cases    []json.RawMessage `json:"cases"`
		Currency string            `json:"currency"`
	}
	if err := json.Unmarshal(raw, &top); err != nil {
		return nil, fmt.Errorf("not valid JSON: %w", err)
	}
	if top.Rule == nil || top.Rule.RuleFile == "" || top.Rule.Scope == "" {
		return nil, fmt.Errorf("oracle.rule must set rule_file + scope")
	}
	if len(top.Cases) == 0 {
		return nil, fmt.Errorf("oracle has no cases (would vacuously pass)")
	}
	o := &Oracle{Rule: *top.Rule, Currency: top.Currency}
	if o.Rule.ResultField == "" {
		o.Rule.ResultField = "verdict"
	}
	if o.Rule.ResultKind == "" {
		o.Rule.ResultKind = "scalar"
	}
	if o.Rule.ListField == "" {
		o.Rule.ListField = "per_member_amounts"
	}
	if o.Currency == "" {
		o.Currency = "GBP"
	}
	switch o.Currency {
	case "GBP", "EUR", "USD":
	default:
		return nil, fmt.Errorf("unsupported currency %q (expected one of EUR, GBP, USD)", o.Currency)
	}
	for i, rc := range top.Cases {
		c, err := parseCase(rc)
		if err != nil {
			return nil, fmt.Errorf("case %d: %w", i, err)
		}
		o.Cases = append(o.Cases, c)
	}
	return o, nil
}

func parseCase(raw json.RawMessage) (Case, error) {
	var m map[string]json.RawMessage
	if err := json.Unmarshal(raw, &m); err != nil {
		return Case{}, err
	}
	var c Case
	if l, ok := m["label"]; ok {
		if err := json.Unmarshal(l, &c.Label); err != nil {
			return c, fmt.Errorf("label: %w", err)
		}
	}
	in, ok := m["inputs"]
	if !ok {
		return c, fmt.Errorf("case %q has no inputs", c.Label)
	}
	kvs, err := orderedObject(in)
	if err != nil {
		return c, fmt.Errorf("case %q inputs: %w", c.Label, err)
	}
	c.Inputs = kvs
	if v, ok := m["expected_money"]; ok {
		c.ExpectedMoney = v
	} else if v, ok := m["expected_money_gbp"]; ok {
		c.ExpectedMoney = v
	}
	c.ExpectedVerdict = m["expected_verdict"]
	if v, ok := m["expected_per_heir_gbp"]; ok {
		d := json.NewDecoder(bytes.NewReader(v))
		d.UseNumber()
		if err := d.Decode(&c.ExpectedPerHeir); err != nil {
			return c, fmt.Errorf("case %q expected_per_heir_gbp: %w", c.Label, err)
		}
	}
	c.Expect = "match"
	if v, ok := m["expect"]; ok {
		if err := json.Unmarshal(v, &c.Expect); err != nil {
			return c, fmt.Errorf("case %q expect: %w", c.Label, err)
		}
	}
	return c, nil
}

// orderedObject decodes a JSON object keeping its key order: the generated
// driver lists inputs in the order the oracle does, as oracle_verify.py does.
func orderedObject(raw json.RawMessage) ([]KV, error) {
	d := json.NewDecoder(bytes.NewReader(raw))
	tok, err := d.Token()
	if err != nil || tok != json.Delim('{') {
		return nil, fmt.Errorf("not a JSON object")
	}
	var out []KV
	for d.More() {
		k, err := d.Token()
		if err != nil {
			return nil, err
		}
		var v json.RawMessage
		if err := d.Decode(&v); err != nil {
			return nil, err
		}
		out = append(out, KV{Key: k.(string), Value: v})
	}
	return out, nil
}

// --- literals ----------------------------------------------------------------

var (
	moneyRE   = regexp.MustCompile(`^(-?)(\d+)(?:\.(\d*))?$`)
	isoDateRE = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
	enumRE    = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)
)

// scalarText is a JSON string's content or a JSON number's text.
func scalarText(v json.RawMessage) (string, error) {
	var s string
	if err := json.Unmarshal(v, &s); err == nil {
		return s, nil
	}
	var n json.Number
	d := json.NewDecoder(bytes.NewReader(v))
	d.UseNumber()
	if err := d.Decode(&n); err == nil {
		return n.String(), nil
	}
	return "", fmt.Errorf("expected a money string or number, got %s", v)
}

// FormatMoney renders an amount thousands-separated with no currency marker:
// whole units as n,nnn and up to two decimal places as n,nnn.dd.
func FormatMoney(value string) (string, error) {
	s := strings.TrimSpace(strings.ReplaceAll(value, ",", ""))
	m := moneyRE.FindStringSubmatch(s)
	if m == nil {
		return "", fmt.Errorf("non-numeric money value in oracle: %q", value)
	}
	whole, err := strconv.ParseInt(m[2], 10, 64)
	if err != nil {
		return "", fmt.Errorf("money value out of range: %q", value)
	}
	sign := m[1]
	if whole == 0 && !strings.Contains(s, ".") {
		sign = ""
	}
	out := sign + group(whole)
	if strings.Contains(s, ".") {
		frac := m[3]
		if len(frac) > 2 {
			return "", fmt.Errorf("money value has more than 2 decimal places: %q", value)
		}
		out += "." + frac + strings.Repeat("0", 2-len(frac))
	}
	return out, nil
}

func group(n int64) string {
	s := strconv.FormatInt(n, 10)
	var b strings.Builder
	for i, r := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(r)
	}
	return b.String()
}

// MoneyLiteral renders an amount as a Catala money literal ($n,nnn[.dd]).
func MoneyLiteral(v json.RawMessage) (string, error) {
	s, err := scalarText(v)
	if err != nil {
		return "", err
	}
	f, err := FormatMoney(s)
	if err != nil {
		return "", err
	}
	return "$" + f, nil
}

// InputLiteral renders one rule input as Catala: an ISO date string as
// |YYYY-MM-DD|, a boolean, {"enum": "C"} as the bare constructor, an integer
// list as [a; b], and anything else as money.
func InputLiteral(v json.RawMessage) (string, error) {
	t := bytes.TrimSpace(v)
	if len(t) == 0 || string(t) == "null" {
		return "", fmt.Errorf("no value to render")
	}
	switch t[0] {
	case '"':
		var s string
		if err := json.Unmarshal(t, &s); err != nil {
			return "", err
		}
		if d := strings.TrimSpace(s); isoDateRE.MatchString(d) {
			if _, err := time.Parse("2006-01-02", d); err != nil {
				return "", fmt.Errorf("not a calendar date: %q", s)
			}
			return "|" + d + "|", nil
		}
	case 't', 'f':
		var b bool
		if err := json.Unmarshal(t, &b); err != nil {
			return "", err
		}
		return strconv.FormatBool(b), nil
	case '{':
		var e map[string]json.RawMessage
		if err := json.Unmarshal(t, &e); err != nil {
			return "", err
		}
		var name string
		if err := json.Unmarshal(e["enum"], &name); err != nil || !enumRE.MatchString(strings.TrimSpace(name)) {
			return "", fmt.Errorf("enum input must be {\"enum\": \"<Constructor>\"} with an identifier, got %s", t)
		}
		return strings.TrimSpace(name), nil
	case '[':
		ns, err := IntList(t)
		if err != nil {
			return "", err
		}
		parts := make([]string, len(ns))
		for i, n := range ns {
			parts[i] = strconv.FormatInt(n, 10)
		}
		return "[" + strings.Join(parts, "; ") + "]", nil
	}
	return MoneyLiteral(t)
}

// IntList reads an integer-list input, such as a per_heir oracle's repeat_by.
func IntList(v json.RawMessage) ([]int64, error) {
	var xs []json.RawMessage
	if err := json.Unmarshal(v, &xs); err != nil {
		return nil, fmt.Errorf("not an integer list: %s", v)
	}
	out := make([]int64, len(xs))
	for i, x := range xs {
		n, err := intValue(x)
		if err != nil {
			return nil, err
		}
		out[i] = n
	}
	return out, nil
}

func intValue(x json.RawMessage) (int64, error) {
	s, err := scalarText(x)
	if err != nil {
		return 0, err
	}
	n, err := strconv.ParseInt(strings.TrimSpace(s), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("expected an integer list element, got %s", x)
	}
	return n, nil
}

// --- the rule's declared types ------------------------------------------------

var (
	inputDeclRE  = regexp.MustCompile(`^\s+input\s+(\w+)\s+content\s+(.+?)\s*$`)
	outputDeclRE = regexp.MustCompile(`^\s+output\s+(\w+)\s+content\s+(.+?)\s*$`)
	declScopeRE  = regexp.MustCompile(`^declaration scope (\w+):`)
	certTypeRE   = regexp.MustCompile(`^(?:\w+\.)?Certified\w*$`)
)

func scopeDecls(ruleText, scope string, re *regexp.Regexp) map[string]string {
	types := map[string]string{}
	current := ""
	for _, line := range strings.Split(strings.ReplaceAll(ruleText, "\r\n", "\n"), "\n") {
		if m := declScopeRE.FindStringSubmatch(line); m != nil {
			current = m[1]
			continue
		}
		if line != "" && !strings.ContainsAny(line[:1], " \t\v\f\r") {
			current = ""
			continue
		}
		if current != scope {
			continue
		}
		if d := re.FindStringSubmatch(line); d != nil {
			types[d[1]] = d[2]
		}
	}
	return types
}

// ScopeInputTypes is {input: declared type} for one `declaration scope`.
func ScopeInputTypes(ruleText, scope string) map[string]string {
	return scopeDecls(ruleText, scope, inputDeclRE)
}

// ScopeOutputTypes is {output: declared type} for one `declaration scope`.
func ScopeOutputTypes(ruleText, scope string) map[string]string {
	return scopeDecls(ruleText, scope, outputDeclRE)
}

// WrapCertified wraps a literal as `<Type>.Certified content <literal>` when the
// rule declares the input with a certification enum.
func WrapCertified(literal, declaredType string) string {
	t := strings.TrimSpace(declaredType)
	if certTypeRE.MatchString(t) {
		return t + ".Certified content " + literal
	}
	return literal
}

func record(inputs []KV, types map[string]string) (string, error) {
	parts := make([]string, 0, len(inputs))
	for _, kv := range inputs {
		lit, err := InputLiteral(kv.Value)
		if err != nil {
			return "", fmt.Errorf("input %s: %w", kv.Key, err)
		}
		parts = append(parts, "-- "+kv.Key+": "+WrapCertified(lit, types[kv.Key]))
	}
	return strings.Join(parts, " "), nil
}

// --- drivers -----------------------------------------------------------------

// BuildDriver is the scalar kind: one #[test] scope asserting, per case, that
// the rule's ComputedOrNeedsHuman verdict is Computed and equals the expected
// money.
func BuildDriver(cases []Case, scope, resultField string, types map[string]string) (string, error) {
	var outputs, defs, asserts []string
	for i, c := range cases {
		rec, err := record(c.Inputs, types)
		if err != nil {
			return "", fmt.Errorf("case %q: %w", c.Label, err)
		}
		if c.ExpectedMoney == nil {
			return "", fmt.Errorf("case %q has neither expected_money nor expected_money_gbp", c.Label)
		}
		want, err := MoneyLiteral(c.ExpectedMoney)
		if err != nil {
			return "", fmt.Errorf("case %q: %w", c.Label, err)
		}
		amt, ok := fmt.Sprintf("c%d_amt", i), fmt.Sprintf("c%d_ok", i)
		call := fmt.Sprintf("(output of %s with { %s }).%s", scope, rec, resultField)
		outputs = append(outputs, "  output "+amt+" content money", "  output "+ok+" content boolean")
		defs = append(defs,
			"  definition "+amt+" equals\n    match "+call+" with pattern\n    -- Computed content m: m\n    -- NeedsHuman: $0",
			"  definition "+ok+" equals\n    match "+call+" with pattern\n    -- Computed content m: true\n    -- NeedsHuman: false")
		asserts = append(asserts, "  assertion "+ok+" = true", "  assertion "+amt+" = "+want)
	}
	return "\n# --- generated T032 oracle driver ---\n\n" +
		"```catala\n" +
		"#[test]\n" +
		"declaration scope OracleVerifyDriver:\n" +
		strings.Join(outputs, "\n") +
		"\nscope OracleVerifyDriver:\n" +
		strings.Join(defs, "\n") +
		"\n" +
		strings.Join(asserts, "\n") +
		"\n```\n", nil
}

var scopeSafeRE = regexp.MustCompile(`[^A-Za-z0-9_]+`)

// BuildVerdictDriver is the verdict kind: one #[test] scope per case asserting
// the rule's enum output equals the case's expected_verdict.
func BuildVerdictDriver(cases []Case, scope, resultField, verdictType string, types map[string]string) (string, error) {
	var blocks []string
	for i, c := range cases {
		var expected string
		if err := json.Unmarshal(c.ExpectedVerdict, &expected); err != nil || !enumRE.MatchString(strings.TrimSpace(expected)) {
			return "", fmt.Errorf("case %q: expected_verdict must be a bare enum constructor, got %s", c.Label, c.ExpectedVerdict)
		}
		rec, err := record(c.Inputs, types)
		if err != nil {
			return "", fmt.Errorf("case %q: %w", c.Label, err)
		}
		safe := strings.Trim(scopeSafeRE.ReplaceAllString(c.Label, "_"), "_")
		name := fmt.Sprintf("OracleVerdict_%d_%s", i, safe)
		blocks = append(blocks, "#[test]\n"+
			"declaration scope "+name+":\n"+
			"  output v content "+verdictType+"\n"+
			"scope "+name+":\n"+
			"  definition v equals\n"+
			"    (output of "+scope+" with { "+rec+" })."+resultField+"\n"+
			"  assertion v = "+strings.TrimSpace(expected))
	}
	return "\n# --- generated verdict oracle driver ---\n\n```catala\n" + strings.Join(blocks, "\n\n") + "\n```\n", nil
}

// BuildPerHeirDriver is the per_heir kind: a (non-test) scope exposing the
// rule's per-branch money list for one case, for `clerk run -F json`.
func BuildPerHeirDriver(c Case, scope, listField string, types map[string]string) (string, error) {
	rec, err := record(c.Inputs, types)
	if err != nil {
		return "", fmt.Errorf("case %q: %w", c.Label, err)
	}
	return "\n# --- generated per-heir driver ---\n\n" +
		"```catala\n" +
		"declaration scope OraclePerHeirDriver:\n" +
		"  output per_member content list of money\n" +
		"scope OraclePerHeirDriver:\n" +
		"  definition per_member equals (output of " + scope + " with { " + rec + " })." + listField + "\n" +
		"```\n", nil
}

// --- per-heir judging ----------------------------------------------------------

// ToPence converts an amount to integer pence, rounding half to even.
func ToPence(amount string) (int64, error) {
	r, ok := new(big.Rat).SetString(strings.TrimSpace(strings.ReplaceAll(amount, ",", "")))
	if !ok {
		return 0, fmt.Errorf("not an amount: %q", amount)
	}
	r.Mul(r, big.NewRat(100, 1))
	q, m := new(big.Int).QuoRem(r.Num(), r.Denom(), new(big.Int))
	twice := new(big.Int).Mul(new(big.Int).Abs(m), big.NewInt(2))
	if c := twice.Cmp(r.Denom()); c > 0 || (c == 0 && q.Bit(0) == 1) {
		if m.Sign() < 0 {
			q.Sub(q, big.NewInt(1))
		} else {
			q.Add(q, big.NewInt(1))
		}
	}
	if !q.IsInt64() {
		return 0, fmt.Errorf("amount out of range: %q", amount)
	}
	return q.Int64(), nil
}

var (
	braceRE      = regexp.MustCompile(`\{[^{}]*\}`)
	moneyTokenRE = regexp.MustCompile(`\$\s*([\d,]+(?:\.\d+)?)`)
)

// ParseMoneyList extracts the money list printed for field from clerk output,
// in pence: clerk's -F json object first, then the pretty `field = [ $a; $b ]`
// form. A field that is not there is an error, never an empty list.
func ParseMoneyList(text, field string) ([]int64, error) {
	for _, m := range braceRE.FindAllString(text, -1) {
		d := json.NewDecoder(strings.NewReader(m))
		d.UseNumber()
		var obj map[string]any
		if d.Decode(&obj) != nil {
			continue
		}
		list, ok := obj[field].([]any)
		if !ok {
			continue
		}
		out := make([]int64, 0, len(list))
		for _, v := range list {
			n, ok := v.(json.Number)
			if !ok {
				return nil, fmt.Errorf("field %q holds a non-number: %v", field, v)
			}
			p, err := ToPence(n.String())
			if err != nil {
				return nil, err
			}
			out = append(out, p)
		}
		return out, nil
	}
	idx := strings.Index(text, field)
	if idx == -1 {
		return nil, fmt.Errorf("field %q not found in rule output", field)
	}
	after := text[idx:]
	start := strings.Index(after, "[")
	if start == -1 {
		return nil, fmt.Errorf("no bracketed money list after field %q", field)
	}
	end := strings.Index(after[start:], "]")
	if end == -1 {
		return nil, fmt.Errorf("no bracketed money list after field %q", field)
	}
	var out []int64
	for _, m := range moneyTokenRE.FindAllStringSubmatch(after[start:start+end+1], -1) {
		p, err := ToPence(m[1])
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, nil
}

// ExpandPerHeir repeats each branch amount by its branch size. A nil counts
// list means the amounts are already one per heir.
func ExpandPerHeir(perBranch, counts []int64) ([]int64, error) {
	if counts == nil {
		return append([]int64(nil), perBranch...), nil
	}
	if len(perBranch) != len(counts) {
		return nil, fmt.Errorf("list length %d != repeat_by length %d", len(perBranch), len(counts))
	}
	var out []int64
	for i, a := range perBranch {
		for range counts[i] {
			out = append(out, a)
		}
	}
	return out, nil
}

// JudgePerHeir compares the computed and claimed per-heir multisets. "match"
// passes iff they are equal; "wrong_split" passes iff sum and count are
// conserved but the split differs. A wrong_split case that does not conserve
// sum and count does not test what it claims to, and is an error.
func JudgePerHeir(computed, claimed []int64, expect string) (bool, string, error) {
	same := multiset(computed) == multiset(claimed)
	switch expect {
	case "match":
		if same {
			return true, "multiset equal", nil
		}
		return false, fmt.Sprintf("multiset differs: computed %s, claimed %s", pounds(computed), pounds(claimed)), nil
	case "wrong_split":
		if sum(computed) != sum(claimed) || len(computed) != len(claimed) {
			return false, "", fmt.Errorf("wrong_split case is not sum+count conserving (not the C1 property)")
		}
		if same {
			return false, "split unexpectedly matched", nil
		}
		return true, "split correctly caught as differing", nil
	}
	return false, "", fmt.Errorf("unknown expect value: %q", expect)
}

// pounds renders pence amounts as [£a, £b].
func pounds(xs []int64) string {
	parts := make([]string, len(xs))
	for i, p := range xs {
		parts[i] = fmt.Sprintf("£%s.%02d", group(p/100), p%100)
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func multiset(xs []int64) string {
	s := append([]int64(nil), xs...)
	sort.Slice(s, func(i, j int) bool { return s[i] < s[j] })
	return fmt.Sprint(s)
}

func sum(xs []int64) int64 {
	var t int64
	for _, x := range xs {
		t += x
	}
	return t
}
