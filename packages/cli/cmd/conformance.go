package cmd

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	"github.com/openinherit/inherit-cli/schemas"
	"github.com/santhosh-tekuri/jsonschema/v6"
	"github.com/santhosh-tekuri/jsonschema/v6/kind"
	"github.com/spf13/cobra"
)

const defaultKitDir = "node_modules/@openinherit/conformance"

type kitRule struct {
	Class        string `json:"class"`
	Keyword      string `json:"keyword"`
	InstancePath string `json:"instancePath"`
}

type kitTest struct {
	File           string   `json:"file"`
	SHA256         string   `json:"sha256"`
	Expected       string   `json:"expected"`
	ExpectedSHA256 string   `json:"expectedSha256"`
	Valid          bool     `json:"valid"`
	SchemaMode     string   `json:"schemaMode"`
	Rule           *kitRule `json:"rule"`
}

type kitManifest struct {
	Version string `json:"version"`
	Schemas []struct {
		File   string `json:"file"`
		SHA256 string `json:"sha256"`
	} `json:"schemas"`
	Tests []kitTest `json:"tests"`
}

type conformanceFailure struct {
	File   string `json:"file"`
	Reason string `json:"reason"`
}

type conformanceResult struct {
	Verdict    string               `json:"verdict"`
	KitVersion string               `json:"kitVersion"`
	Passed     int                  `json:"passed"`
	Failed     int                  `json:"failed"`
	Total      int                  `json:"total"`
	Failures   []conformanceFailure `json:"failures"`
	Disclaimer string               `json:"disclaimer"`
}

var (
	conformanceKitFlag  string
	conformanceJSONFlag bool
)

var conformanceCmd = &cobra.Command{
	Use:   "conformance",
	Short: "Grade this CLI's validator against the INHERIT conformance kit",
	Long: `Run every case in the @openinherit/conformance kit through the same
validator "inherit validate" uses, and print a conformance verdict.

A VALID case must be accepted. An INVALID case must be refused by the rule
the kit declares for it: an error from that JSON Schema keyword at that
instance path. A refusal for any other reason is a miss.

The kit must be the one released with this CLI: its bundled schemas must be
byte-identical to the schemas embedded here, and every file must match the
sha256 in its manifest.

Exit codes:
  0 — CONFORMANT: every case graded as the kit expects
  1 — NOT CONFORMANT: at least one case missed
  2 — the kit cannot be trusted or read (missing, tampered, or from another release)`,
	Args: cobra.NoArgs,
	Run: func(cmd *cobra.Command, args []string) {
		os.Exit(ExecuteConformance(conformanceKitFlag, conformanceJSONFlag, os.Stdout))
	},
}

func init() {
	conformanceCmd.Flags().StringVar(&conformanceKitFlag, "kit", defaultKitDir, "Directory of the conformance kit (holds manifest.json)")
	conformanceCmd.Flags().BoolVar(&conformanceJSONFlag, "json", false, "Output the verdict as JSON")
	rootCmd.AddCommand(conformanceCmd)
}

// ExecuteConformance is the testable entry point for the conformance command.
// Returns exit code: 0=conformant, 1=not conformant, 2=kit unusable.
func ExecuteConformance(kit string, jsonOutput bool, w io.Writer) int {
	fail := func(format string, a ...any) int {
		msg := fmt.Sprintf(format, a...)
		if jsonOutput {
			out, _ := json.Marshal(map[string]any{"error": msg, "kit": kit})
			fmt.Fprintln(w, string(out))
		} else {
			fmt.Fprintf(w, "Error: %s\n", msg)
		}
		return 2
	}

	raw, err := os.ReadFile(filepath.Join(kit, "manifest.json"))
	if err != nil {
		return fail("cannot read the kit manifest: %s", err)
	}
	var m kitManifest
	if err := json.Unmarshal(raw, &m); err != nil {
		return fail("kit manifest is not valid JSON: %s", err)
	}
	if len(m.Tests) == 0 {
		return fail("kit manifest lists no tests")
	}
	if len(m.Schemas) == 0 {
		return fail("kit manifest lists no schemas")
	}

	embedded := map[string][]byte{
		"inherit-v3-bundled.json":   schemas.EstateBundled,
		"catalogue-v3-bundled.json": schemas.CatalogueBundled,
	}
	for _, s := range m.Schemas {
		data, err := readKitFile(kit, s.File, s.SHA256)
		if err != nil {
			return fail("%s", err)
		}
		want, ok := embedded[path.Base(s.File)]
		if !ok {
			return fail("kit schema %s is not one this CLI embeds", s.File)
		}
		if !bytes.Equal(data, want) {
			return fail("kit schema %s differs from the schema this CLI embeds: the kit is from another release", s.File)
		}
	}

	if err := initSchemas(); err != nil {
		return fail("schema init: %s", err)
	}

	res := conformanceResult{KitVersion: m.Version, Total: len(m.Tests), Failures: []conformanceFailure{}, Disclaimer: Disclaimer}
	for _, tc := range m.Tests {
		data, err := readKitFile(kit, tc.File, tc.SHA256)
		if err != nil {
			return fail("%s", err)
		}
		if _, err := readKitFile(kit, tc.Expected, tc.ExpectedSHA256); err != nil {
			return fail("%s", err)
		}
		reason, err := gradeCase(tc, data)
		if err != nil {
			return fail("%s: %s", tc.File, err)
		}
		if reason == "" {
			res.Passed++
		} else {
			res.Failures = append(res.Failures, conformanceFailure{File: tc.File, Reason: reason})
		}
	}
	res.Failed = len(res.Failures)
	res.Verdict = "CONFORMANT"
	if res.Failed > 0 {
		res.Verdict = "NOT CONFORMANT"
	}

	if jsonOutput {
		out, _ := json.MarshalIndent(res, "", "  ")
		fmt.Fprintln(w, string(out))
	} else {
		fmt.Fprintf(w, "Kit:     @openinherit/conformance %s (%s)\n", m.Version, kit)
		for _, f := range res.Failures {
			fmt.Fprintf(w, "  ✗ %s: %s\n", f.File, f.Reason)
		}
		if res.Failed == 0 {
			fmt.Fprintf(w, "Verdict: CONFORMANT (%d/%d)\n", res.Passed, res.Total)
		} else {
			fmt.Fprintf(w, "Verdict: NOT CONFORMANT (%d of %d failed)\n", res.Failed, res.Total)
		}
		fmt.Fprintf(w, "\nNote: %s\n", Disclaimer)
	}
	if res.Failed > 0 {
		return 1
	}
	return 0
}

// readKitFile reads a file named by the manifest, refusing a path that leaves
// the kit and any content whose sha256 is not the one the manifest records.
func readKitFile(kit, rel, wantSHA string) ([]byte, error) {
	if rel == "" || !filepath.IsLocal(filepath.FromSlash(rel)) {
		return nil, fmt.Errorf("kit manifest names %q, which is not a path inside the kit", rel)
	}
	data, err := os.ReadFile(filepath.Join(kit, filepath.FromSlash(rel)))
	if err != nil {
		return nil, fmt.Errorf("cannot read kit file: %s", err)
	}
	sum := sha256.Sum256(data)
	if got := hex.EncodeToString(sum[:]); got != wantSHA {
		return nil, fmt.Errorf("%s: sha256 %s does not match the manifest's %s", rel, got, wantSHA)
	}
	return data, nil
}

// gradeCase returns "" when the case grades as the kit expects, or why not.
// An error means the case itself is malformed.
func gradeCase(tc kitTest, data []byte) (string, error) {
	var sch *jsonschema.Schema
	switch tc.SchemaMode {
	case "estate":
		sch = estateSchema
	case "catalogue":
		sch = catalogueSchema
	default:
		return "", fmt.Errorf("unknown schemaMode %q", tc.SchemaMode)
	}
	inst, err := jsonschema.UnmarshalJSON(bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("invalid JSON: %s", err)
	}
	verr := sch.Validate(inst)

	if tc.Valid {
		if verr != nil {
			return "VALID case refused: " + firstLine(verr.Error()), nil
		}
		return "", nil
	}
	if tc.Rule == nil || tc.Rule.Keyword == "" {
		return "", fmt.Errorf("INVALID case declares no rule")
	}
	if verr == nil {
		return fmt.Sprintf("INVALID case accepted (should be refused by %s at '%s')", tc.Rule.Keyword, tc.Rule.InstancePath), nil
	}
	ve, ok := verr.(*jsonschema.ValidationError)
	if !ok {
		return "", fmt.Errorf("validator error: %s", verr)
	}
	if !refusedBy(ve, inst, tc.Rule.Keyword, tc.Rule.InstancePath) {
		return fmt.Sprintf("refused, but not by its rule (%s at '%s'): %s", tc.Rule.Keyword, tc.Rule.InstancePath, firstLine(ve.Error())), nil
	}
	return "", nil
}

// refusedBy reports whether any error in the tree comes from keyword at the
// JSON Pointer instancePath. Two error shapes from this validator need help:
//   - unevaluatedProperties / additionalProperties are reported as a false
//     schema at the offending property, so the keyword is the last token of
//     the schema location and the object is the property's parent;
//   - propertyNames is validated against the bare key, so the error carries no
//     instance location; it is attributed when the object at instancePath
//     holds the key the error names.
func refusedBy(ve *jsonschema.ValidationError, inst any, keyword, instancePath string) bool {
	switch k := ve.ErrorKind.(type) {
	case *kind.FalseSchema:
		loc := ve.InstanceLocation
		if len(loc) > 0 && lastSchemaToken(ve.SchemaURL) == keyword && jsonPointer(loc[:len(loc)-1]) == instancePath {
			return true
		}
	case *kind.PropertyNames:
		if keyword == "propertyNames" {
			if obj, ok := resolvePointer(inst, instancePath).(map[string]any); ok {
				if _, has := obj[k.Property]; has {
					return true
				}
			}
		}
	default:
		if ve.ErrorKind != nil && slices.Contains(ve.ErrorKind.KeywordPath(), keyword) && jsonPointer(ve.InstanceLocation) == instancePath {
			return true
		}
	}
	for _, c := range ve.Causes {
		if refusedBy(c, inst, keyword, instancePath) {
			return true
		}
	}
	return false
}

func lastSchemaToken(schemaURL string) string {
	_, frag, _ := strings.Cut(schemaURL, "#")
	return frag[strings.LastIndexByte(frag, '/')+1:]
}

// resolvePointer returns the value at a JSON Pointer, or nil.
func resolvePointer(v any, ptr string) any {
	if ptr == "" {
		return v
	}
	for _, tok := range strings.Split(ptr[1:], "/") {
		tok = strings.NewReplacer("~1", "/", "~0", "~").Replace(tok)
		switch node := v.(type) {
		case map[string]any:
			v = node[tok]
		case []any:
			i, err := strconv.Atoi(tok)
			if err != nil || i < 0 || i >= len(node) {
				return nil
			}
			v = node[i]
		default:
			return nil
		}
	}
	return v
}

func jsonPointer(tokens []string) string {
	var b strings.Builder
	for _, t := range tokens {
		b.WriteString("/")
		b.WriteString(strings.NewReplacer("~", "~0", "/", "~1").Replace(t))
	}
	return b.String()
}

func firstLine(s string) string {
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		return s[:i]
	}
	return s
}
