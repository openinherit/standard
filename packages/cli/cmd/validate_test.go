package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func fixturesDir() string {
	return filepath.Join("..", "..", "..", "examples", "fixtures")
}

func TestValidateValidEstate(t *testing.T) {
	out, code := runValidate(t, filepath.Join(fixturesDir(), "english-family-estate.json"), false)
	if code != 0 {
		t.Errorf("expected exit code 0, got %d\noutput: %s", code, out)
	}
}

func TestValidateValidEstateJSON(t *testing.T) {
	out, code := runValidate(t, filepath.Join(fixturesDir(), "english-family-estate.json"), true)
	if code != 0 {
		t.Fatalf("expected exit code 0, got %d", code)
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, out)
	}
	if result["valid"] != true {
		t.Errorf("expected valid=true, got %v", result["valid"])
	}
	if result["schemaMode"] != "estate" {
		t.Errorf("expected schemaMode=estate, got %v", result["schemaMode"])
	}
	if _, ok := result["disclaimer"]; !ok {
		t.Error("expected disclaimer field")
	}
}

func TestValidateInvalidDocument(t *testing.T) {
	tmpFile := filepath.Join(t.TempDir(), "invalid.json")
	os.WriteFile(tmpFile, []byte(`{"not":"valid"}`), 0644)
	_, code := runValidate(t, tmpFile, false)
	if code != 1 {
		t.Errorf("expected exit code 1, got %d", code)
	}
}

func TestValidateMissingFile(t *testing.T) {
	_, code := runValidate(t, "/nonexistent/file.json", false)
	if code != 2 {
		t.Errorf("expected exit code 2, got %d", code)
	}
}

func TestValidateCatalogueAutoDetect(t *testing.T) {
	out, code := runValidate(t, filepath.Join(fixturesDir(), "catalogue-only.json"), true)
	if code != 0 {
		t.Errorf("expected exit code 0, got %d\noutput: %s", code, out)
	}
	var result map[string]any
	json.Unmarshal([]byte(out), &result)
	if result["schemaMode"] != "catalogue" {
		t.Errorf("expected schemaMode=catalogue, got %v", result["schemaMode"])
	}
}

func runValidate(t *testing.T, file string, jsonOutput bool) (string, int) {
	t.Helper()
	var buf bytes.Buffer
	code := ExecuteValidate(file, jsonOutput, false, "", "1", &buf)
	return buf.String(), code
}

func runValidateWithLevel(t *testing.T, file string, jsonOutput bool, level string) (string, int) {
	t.Helper()
	var buf bytes.Buffer
	code := ExecuteValidate(file, jsonOutput, false, "", level, &buf)
	return buf.String(), code
}

func TestValidateLevel2Valid(t *testing.T) {
	out, code := runValidateWithLevel(t, filepath.Join(fixturesDir(), "english-family-estate.json"), true, "2")
	if code != 0 {
		t.Errorf("expected exit code 0, got %d\noutput: %s", code, out)
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, out)
	}
	if result["valid"] != true {
		t.Errorf("expected valid=true, got %v", result["valid"])
	}
	// conformanceLevel should be 2
	cl, ok := result["conformanceLevel"].(float64)
	if !ok {
		t.Fatalf("conformanceLevel field missing or wrong type: %v", result["conformanceLevel"])
	}
	if int(cl) != 2 {
		t.Errorf("expected conformanceLevel=2, got %v", cl)
	}
}

func TestValidateLevel2BrokenRefs(t *testing.T) {
	out, code := runValidateWithLevel(t, filepath.Join(fixturesDir(), "broken-references.json"), true, "2")
	if code != 1 {
		t.Errorf("expected exit code 1, got %d\noutput: %s", code, out)
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, out)
	}
	if result["valid"] != false {
		t.Errorf("expected valid=false, got %v", result["valid"])
	}
	// Should have level-2 errors
	errors, ok := result["errors"].([]any)
	if !ok || len(errors) == 0 {
		t.Fatalf("expected errors array, got: %v", result["errors"])
	}
	hasLevel2 := false
	for _, e := range errors {
		if errMap, ok := e.(map[string]any); ok {
			if lvl, ok := errMap["level"].(float64); ok && int(lvl) == 2 {
				hasLevel2 = true
			}
		}
	}
	if !hasLevel2 {
		t.Errorf("expected at least one Level 2 error in output")
	}
}

func TestValidateLevel1DefaultBehaviour(t *testing.T) {
	// --level 1 (default) should not run refs — conformanceLevel stays at 1 for valid docs.
	out, code := runValidateWithLevel(t, filepath.Join(fixturesDir(), "english-family-estate.json"), true, "1")
	if code != 0 {
		t.Errorf("expected exit code 0, got %d\noutput: %s", code, out)
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, out)
	}
	cl, ok := result["conformanceLevel"].(float64)
	if !ok {
		t.Fatalf("conformanceLevel field missing or wrong type: %v", result["conformanceLevel"])
	}
	if int(cl) != 1 {
		t.Errorf("expected conformanceLevel=1 for --level 1, got %v", cl)
	}
}

func TestValidateLevel2InvalidLevel(t *testing.T) {
	out, code := runValidateWithLevel(t, filepath.Join(fixturesDir(), "english-family-estate.json"), false, "3")
	if code != 2 {
		t.Errorf("expected exit code 2 for invalid level, got %d\noutput: %s", code, out)
	}
}
