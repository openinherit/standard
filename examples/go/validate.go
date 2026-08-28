// validate.go — INHERIT document validator (Go).
//
// Validates an INHERIT JSON document at two conformance levels:
//   - Level 1: JSON Schema validation against the INHERIT v1 root schema
//   - Level 2: Referential integrity (all person/asset IDs referenced elsewhere exist)
//
// Usage:
//   go run validate.go <path-to-inherit-json>
//
// Exit code 0 if Level 2 passes, 1 otherwise.

package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

// ---------------------------------------------------------------------------
// Types — minimal shapes for referential integrity checks
// ---------------------------------------------------------------------------

// InheritDocument represents the top-level structure of an INHERIT JSON file.
type InheritDocument struct {
	Estate    Estate     `json:"estate"`
	People    []Entity   `json:"people"`
	Assets    []Entity   `json:"assets"`
	Bequests  []Bequest  `json:"bequests"`
	Executors []Executor `json:"executors"`
	Guardians []Guardian `json:"guardians"`
}

// Estate holds the estate-level fields relevant to referential integrity.
type Estate struct {
	TestatorPersonID string `json:"testatorPersonId"`
}

// Entity is any object with an id field.
type Entity struct {
	ID string `json:"id"`
}

// Bequest may reference a beneficiary and/or a source asset.
type Bequest struct {
	ID             string `json:"id"`
	BeneficiaryID  string `json:"beneficiaryId,omitempty"`
	SourceAssetID  string `json:"sourceAssetId,omitempty"`
}

// Executor references a person.
type Executor struct {
	ID       string `json:"id"`
	PersonID string `json:"personId"`
}

// Guardian references both a guardian person and a child person.
type Guardian struct {
	ID               string `json:"id"`
	PersonID         string `json:"personId"`
	ChildPersonID    string `json:"childPersonId"`
}

// RefError describes a referential integrity failure.
type RefError struct {
	Path        string
	Message     string
	Explanation string
}

// ---------------------------------------------------------------------------
// Level 1: JSON Schema validation
// ---------------------------------------------------------------------------

func runLevel1(documentPath string) (bool, []string) {
	// Resolve the schema directory relative to the validator location.
	// When run from examples/go/, the schemas are at ../../v1/.
	exePath, err := os.Getwd()
	if err != nil {
		return false, []string{fmt.Sprintf("Could not determine working directory: %v", err)}
	}

	// Try multiple schema directory locations
	schemaDirCandidates := []string{
		filepath.Join(exePath, "..", "..", "v1"),
		filepath.Join(filepath.Dir(documentPath), "..", "..", "v1"),
		filepath.Join(exePath, "v1"),
	}

	var schemaDir string
	for _, candidate := range schemaDirCandidates {
		abs, _ := filepath.Abs(candidate)
		if info, err := os.Stat(abs); err == nil && info.IsDir() {
			schemaDir = abs
			break
		}
	}

	if schemaDir == "" {
		return false, []string{"Could not locate v1/ schema directory. Run from the examples/go/ directory or ensure the schema files are accessible."}
	}

	rootSchemaPath := filepath.Join(schemaDir, "schema.json")
	if _, err := os.Stat(rootSchemaPath); os.IsNotExist(err) {
		return false, []string{fmt.Sprintf("Root schema not found at %s", rootSchemaPath)}
	}

	// Compile the schema using the filesystem loader
	compiler := jsonschema.NewCompiler()

	// Add the schema directory as a resource so $ref resolution works
	schemaURI := "file:///" + filepath.ToSlash(rootSchemaPath)

	schema, err := compiler.Compile(schemaURI)
	if err != nil {
		return false, []string{fmt.Sprintf("Failed to compile schema: %v", err)}
	}

	// Load the document
	docFile, err := os.Open(documentPath)
	if err != nil {
		return false, []string{fmt.Sprintf("Could not open document: %v", err)}
	}
	defer docFile.Close()

	var doc interface{}
	decoder := json.NewDecoder(docFile)
	decoder.UseNumber()
	if err := decoder.Decode(&doc); err != nil {
		return false, []string{fmt.Sprintf("Invalid JSON: %v", err)}
	}

	// Validate
	err = schema.Validate(doc)
	if err == nil {
		return true, nil
	}

	// Extract validation errors
	var errors []string
	if validationErr, ok := err.(*jsonschema.ValidationError); ok {
		for _, detail := range flattenValidationErrors(validationErr, "") {
			errors = append(errors, detail)
		}
	} else {
		errors = append(errors, err.Error())
	}

	return false, errors
}

// flattenValidationErrors recursively extracts human-readable error messages.
func flattenValidationErrors(err *jsonschema.ValidationError, path string) []string {
	var results []string

	currentPath := path
	if err.InstanceLocation != "" {
		currentPath = err.InstanceLocation
	}

	if err.Message != "" && len(err.Causes) == 0 {
		results = append(results, fmt.Sprintf("  Path:    %s\n  Message: %s", currentPath, err.Message))
	}

	for _, cause := range err.Causes {
		results = append(results, flattenValidationErrors(cause, currentPath)...)
	}

	return results
}

// ---------------------------------------------------------------------------
// Level 2: Referential integrity checks
// ---------------------------------------------------------------------------

func runLevel2(documentPath string) (bool, []RefError) {
	data, err := os.ReadFile(documentPath)
	if err != nil {
		return false, []RefError{{
			Path:    "/",
			Message: fmt.Sprintf("Could not read file: %v", err),
		}}
	}

	var doc InheritDocument
	if err := json.Unmarshal(data, &doc); err != nil {
		return false, []RefError{{
			Path:    "/",
			Message: fmt.Sprintf("Could not parse JSON: %v", err),
		}}
	}

	var errors []RefError

	// Build lookup sets
	personIDs := make(map[string]bool)
	for _, p := range doc.People {
		personIDs[p.ID] = true
	}
	assetIDs := make(map[string]bool)
	for _, a := range doc.Assets {
		assetIDs[a.ID] = true
	}

	// estate.testatorPersonId must reference a person
	if !personIDs[doc.Estate.TestatorPersonID] {
		errors = append(errors, RefError{
			Path:        "/estate/testatorPersonId",
			Message:     fmt.Sprintf("Person %q not found in people array.", doc.Estate.TestatorPersonID),
			Explanation: "The testator identified in the estate record must exist as a person in the people array.",
		})
	}

	// bequest.beneficiaryId must reference a person (when present)
	for i, b := range doc.Bequests {
		if b.BeneficiaryID != "" && !personIDs[b.BeneficiaryID] {
			errors = append(errors, RefError{
				Path:        fmt.Sprintf("/bequests/%d/beneficiaryId", i),
				Message:     fmt.Sprintf("Person %q not found in people array.", b.BeneficiaryID),
				Explanation: fmt.Sprintf("Bequest %q references a beneficiary that does not exist in the people array.", b.ID),
			})
		}
		if b.SourceAssetID != "" && !assetIDs[b.SourceAssetID] {
			errors = append(errors, RefError{
				Path:        fmt.Sprintf("/bequests/%d/sourceAssetId", i),
				Message:     fmt.Sprintf("Asset %q not found in assets array.", b.SourceAssetID),
				Explanation: fmt.Sprintf("Bequest %q references a source asset that does not exist in the assets array.", b.ID),
			})
		}
	}

	// executor.personId must reference a person
	for i, e := range doc.Executors {
		if !personIDs[e.PersonID] {
			errors = append(errors, RefError{
				Path:        fmt.Sprintf("/executors/%d/personId", i),
				Message:     fmt.Sprintf("Person %q not found in people array.", e.PersonID),
				Explanation: fmt.Sprintf("Executor %q references a person that does not exist in the people array.", e.ID),
			})
		}
	}

	// guardian.personId and guardian.childPersonId must reference people
	for i, g := range doc.Guardians {
		if !personIDs[g.PersonID] {
			errors = append(errors, RefError{
				Path:        fmt.Sprintf("/guardians/%d/personId", i),
				Message:     fmt.Sprintf("Person %q not found in people array.", g.PersonID),
				Explanation: fmt.Sprintf("Guardian %q references a guardian person that does not exist in the people array.", g.ID),
			})
		}
		if !personIDs[g.ChildPersonID] {
			errors = append(errors, RefError{
				Path:        fmt.Sprintf("/guardians/%d/childPersonId", i),
				Message:     fmt.Sprintf("Person %q not found in people array.", g.ChildPersonID),
				Explanation: fmt.Sprintf("Guardian %q references a child person that does not exist in the people array.", g.ID),
			})
		}
	}

	return len(errors) == 0, errors
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: go run validate.go <path-to-inherit-json>\n")
		fmt.Fprintf(os.Stderr, "Example: go run validate.go ../fixtures/minimal-estate.json\n")
		os.Exit(1)
	}

	filePath := os.Args[1]
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: Could not resolve path: %v\n", err)
		os.Exit(1)
	}

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "ERROR: File not found: %s\n", absPath)
		os.Exit(1)
	}

	fmt.Printf("Validating: %s\n\n", absPath)
	fmt.Println(strings.Repeat("=", 60))

	// ---- Level 1: JSON Schema ----
	fmt.Println("\nLevel 1: JSON Schema Validation")
	fmt.Println(strings.Repeat("-", 60))

	level1Pass, level1Errors := runLevel1(absPath)

	if level1Pass {
		fmt.Println("  PASS — Document conforms to the INHERIT v1 root schema.")
		fmt.Println()
	} else {
		fmt.Println("  FAIL — Schema validation errors:")
		fmt.Println()
		for _, e := range level1Errors {
			fmt.Println(e)
			fmt.Println()
		}
		fmt.Println(strings.Repeat("=", 60))
		fmt.Println("\nConformance level achieved: 0")
		fmt.Println("The document does not pass JSON Schema validation.")
		os.Exit(1)
	}

	// ---- Level 2: Referential integrity ----
	fmt.Println("Level 2: Referential Integrity Checks")
	fmt.Println(strings.Repeat("-", 60))

	level2Pass, level2Errors := runLevel2(absPath)

	if level2Pass {
		fmt.Println("  PASS — All cross-references resolve correctly.")
		fmt.Println()
	} else {
		fmt.Println("  FAIL — Referential integrity errors:")
		fmt.Println()
		for _, e := range level2Errors {
			fmt.Printf("  Path:        %s\n", e.Path)
			fmt.Printf("  Message:     %s\n", e.Message)
			fmt.Printf("  Explanation: %s\n", e.Explanation)
			fmt.Println()
		}
		fmt.Println(strings.Repeat("=", 60))
		fmt.Println("\nConformance level achieved: 1")
		fmt.Println("The document passes schema validation but has broken cross-references.")
		os.Exit(1)
	}

	// ---- Summary ----
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("\nConformance level achieved: 2")
	fmt.Println("The document passes schema validation and referential integrity checks.")
}
