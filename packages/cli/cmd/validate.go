package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"

	"github.com/openinherit/inherit-cli/schemas"
	"github.com/santhosh-tekuri/jsonschema/v6"
	"github.com/spf13/cobra"
)

const (
	schemaURIEstate    = "https://openinherit.org/v3/schema.json"
	schemaURICatalogue = "https://openinherit.org/v3/catalogue.json"
	Disclaimer         = "Validation results are informational only. They verify schema conformance and data structure, not legal accuracy, completeness, or suitability for any purpose. Always consult a qualified legal or financial professional."
)

// compiled schema cache
var (
	schemaOnce      sync.Once
	estateSchema    *jsonschema.Schema
	catalogueSchema *jsonschema.Schema
	schemaInitErr   error
)

func initSchemas() error {
	schemaOnce.Do(func() {
		estateDoc, err := jsonschema.UnmarshalJSON(bytes.NewReader(schemas.EstateBundled))
		if err != nil {
			schemaInitErr = err
			return
		}
		catDoc, err := jsonschema.UnmarshalJSON(bytes.NewReader(schemas.CatalogueBundled))
		if err != nil {
			schemaInitErr = err
			return
		}

		c := jsonschema.NewCompiler()
		if err := c.AddResource(schemaURIEstate, estateDoc); err != nil {
			schemaInitErr = err
			return
		}
		if err := c.AddResource(schemaURICatalogue, catDoc); err != nil {
			schemaInitErr = err
			return
		}

		estateSchema, err = c.Compile(schemaURIEstate)
		if err != nil {
			schemaInitErr = err
			return
		}
		catalogueSchema, err = c.Compile(schemaURICatalogue)
		if err != nil {
			schemaInitErr = err
			return
		}
	})
	return schemaInitErr
}

type validationError struct {
	Path    string `json:"path"`
	Message string `json:"message"`
	Level   int    `json:"level"`
}

type validationResult struct {
	Valid             bool              `json:"valid"`
	SchemaMode        string            `json:"schemaMode"`
	ConformanceLevel  int               `json:"conformanceLevel"`
	File              string            `json:"file,omitempty"`
	Errors            []validationError `json:"errors"`
	ErrorCount        int               `json:"errorCount"`
	Disclaimer        string            `json:"disclaimer"`
}

var (
	validateJSONFlag  bool
	validateQuietFlag bool
	validateModeFlag  string
	validateLevelFlag string
)

var validateCmd = &cobra.Command{
	Use:   "validate <file>",
	Short: "Validate an INHERIT document against the v3 schema",
	Long: `Validate an INHERIT document against the bundled INHERIT v3 JSON Schema.

Auto-detects estate or catalogue mode from the document's $schema field.
Use --mode to override detection.

Conformance levels:
  1 (default) — JSON Schema validation only
  2           — Schema + referential integrity (UUID cross-references must resolve)

Exit codes:
  0 — document is valid
  1 — document is invalid (schema errors found)
  2 — runtime error (file not found, invalid JSON, etc.)`,
	Args: cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		code := ExecuteValidate(args[0], validateJSONFlag, validateQuietFlag, validateModeFlag, validateLevelFlag, os.Stdout)
		os.Exit(code)
	},
}

func init() {
	validateCmd.Flags().BoolVar(&validateJSONFlag, "json", false, "Output results as JSON")
	validateCmd.Flags().BoolVar(&validateQuietFlag, "quiet", false, "No output — exit code only")
	validateCmd.Flags().StringVar(&validateModeFlag, "mode", "", "Force schema mode: estate or catalogue")
	validateCmd.Flags().StringVar(&validateLevelFlag, "level", "1", "Conformance level: 1 (schema) or 2 (schema + refs)")
	rootCmd.AddCommand(validateCmd)
}

// ExecuteValidate is the testable entry point for the validate command.
// Returns exit code: 0=valid, 1=invalid, 2=error.
func ExecuteValidate(file string, jsonOutput, quiet bool, mode, level string, w io.Writer) int {
	// Validate level flag.
	if level != "1" && level != "2" {
		if !quiet {
			if jsonOutput {
				errOut, _ := json.Marshal(map[string]any{
					"error": fmt.Sprintf("unknown level %q — must be 1 or 2", level),
				})
				fmt.Fprintln(w, string(errOut))
			} else {
				fmt.Fprintf(w, "Error: unknown level %q — must be 1 or 2\n", level)
			}
		}
		return 2
	}

	// Read the document
	data, err := os.ReadFile(file)
	if err != nil {
		if !quiet {
			if jsonOutput {
				errOut, _ := json.Marshal(map[string]any{
					"error": fmt.Sprintf("cannot read file: %s", err),
					"file":  file,
				})
				fmt.Fprintln(w, string(errOut))
			} else {
				fmt.Fprintf(w, "Error: cannot read file: %s\n", err)
			}
		}
		return 2
	}

	// Detect or force schema mode
	schemaMode := mode
	if schemaMode == "" {
		schemaMode = detectSchemaMode(data)
	}
	if schemaMode != "estate" && schemaMode != "catalogue" {
		if !quiet {
			if jsonOutput {
				errOut, _ := json.Marshal(map[string]any{
					"error": fmt.Sprintf("unknown mode %q — must be estate or catalogue", schemaMode),
				})
				fmt.Fprintln(w, string(errOut))
			} else {
				fmt.Fprintf(w, "Error: unknown mode %q — must be estate or catalogue\n", schemaMode)
			}
		}
		return 2
	}

	// Init schemas
	if err := initSchemas(); err != nil {
		if !quiet {
			if jsonOutput {
				errOut, _ := json.Marshal(map[string]any{
					"error": fmt.Sprintf("schema init error: %s", err),
				})
				fmt.Fprintln(w, string(errOut))
			} else {
				fmt.Fprintf(w, "Error: schema init: %s\n", err)
			}
		}
		return 2
	}

	// Parse document
	inst, err := jsonschema.UnmarshalJSON(bytes.NewReader(data))
	if err != nil {
		if !quiet {
			if jsonOutput {
				errOut, _ := json.Marshal(map[string]any{
					"error": fmt.Sprintf("invalid JSON: %s", err),
					"file":  file,
				})
				fmt.Fprintln(w, string(errOut))
			} else {
				fmt.Fprintf(w, "Error: invalid JSON: %s\n", err)
			}
		}
		return 2
	}

	// Level 1: schema validation
	var sch *jsonschema.Schema
	if schemaMode == "catalogue" {
		sch = catalogueSchema
	} else {
		sch = estateSchema
	}

	result := runValidation(sch, inst, schemaMode, file)

	// Level 2: referential integrity (only runs if Level 1 passed)
	if level == "2" && result.Valid {
		var doc map[string]any
		if jsonErr := json.Unmarshal(data, &doc); jsonErr == nil {
			refErrs := checkDocumentRefs(doc)
			if len(refErrs) > 0 {
				result.Valid = false
				result.Errors = append(result.Errors, refErrs...)
				result.ErrorCount = len(result.Errors)
				// ConformanceLevel stays at 1 — passed schema but failed refs.
			} else {
				result.ConformanceLevel = 2
			}
		}
	}

	if quiet {
		if result.Valid {
			return 0
		}
		return 1
	}

	if jsonOutput {
		out, _ := json.MarshalIndent(result, "", "  ")
		fmt.Fprintln(w, string(out))
	} else {
		printHuman(w, result)
	}

	if result.Valid {
		return 0
	}
	return 1
}

func detectSchemaMode(data []byte) string {
	var top map[string]json.RawMessage
	if err := json.Unmarshal(data, &top); err != nil {
		return "estate"
	}
	if raw, ok := top["$schema"]; ok {
		var uri string
		if json.Unmarshal(raw, &uri) == nil && uri == schemaURICatalogue {
			return "catalogue"
		}
	}
	return "estate"
}

func runValidation(sch *jsonschema.Schema, inst any, mode, file string) validationResult {
	err := sch.Validate(inst)
	if err == nil {
		return validationResult{
			Valid:            true,
			SchemaMode:       mode,
			ConformanceLevel: 1,
			File:             file,
			Errors:           []validationError{},
			ErrorCount:       0,
			Disclaimer:       Disclaimer,
		}
	}

	verr, ok := err.(*jsonschema.ValidationError)
	if !ok {
		return validationResult{
			Valid:            false,
			SchemaMode:       mode,
			ConformanceLevel: 0,
			File:             file,
			Errors: []validationError{
				{Path: "/", Message: err.Error(), Level: 1},
			},
			ErrorCount: 1,
			Disclaimer: Disclaimer,
		}
	}

	var errs []validationError
	collectValidationErrors(verr, &errs)
	return validationResult{
		Valid:            false,
		SchemaMode:       mode,
		ConformanceLevel: 0,
		File:             file,
		Errors:           errs,
		ErrorCount:       len(errs),
		Disclaimer:       Disclaimer,
	}
}

func collectValidationErrors(verr *jsonschema.ValidationError, out *[]validationError) {
	if len(verr.Causes) == 0 {
		path := "/" + strings.Join(verr.InstanceLocation, "/")
		*out = append(*out, validationError{
			Path:    path,
			Message: verr.Error(),
			Level:   1,
		})
		return
	}
	for _, cause := range verr.Causes {
		collectValidationErrors(cause, out)
	}
}

func printHuman(w io.Writer, result validationResult) {
	if result.File != "" {
		fmt.Fprintf(w, "File:   %s\n", result.File)
	}
	fmt.Fprintf(w, "Mode:   %s\n", result.SchemaMode)
	fmt.Fprintf(w, "Level:  %d\n", result.ConformanceLevel)
	if result.Valid {
		fmt.Fprintln(w, "Result: VALID")
	} else {
		fmt.Fprintf(w, "Result: INVALID (%d error(s))\n", result.ErrorCount)
		for _, e := range result.Errors {
			fmt.Fprintf(w, "  • [L%d] %s: %s\n", e.Level, e.Path, e.Message)
		}
	}
	fmt.Fprintf(w, "\nNote: %s\n", Disclaimer)
}
