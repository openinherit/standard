package openinherit

import (
	"os"
	"path/filepath"
	"testing"
)

// TestLevel2ValidEstate checks that a well-formed estate reaches conformance level 2.
func TestLevel2ValidEstate(t *testing.T) {
	doc, err := os.ReadFile(filepath.Join(fixturesDir(), "english-family-estate.json"))
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}
	result, err := ValidateLevel2(doc)
	if err != nil {
		t.Fatalf("ValidateLevel2 error: %v", err)
	}
	if result.ConformanceLevel != ConformanceLevel2 {
		t.Errorf("expected conformanceLevel %d, got %d", ConformanceLevel2, result.ConformanceLevel)
		for _, e := range result.Errors {
			t.Logf("  level=%d %s: %s", e.Level, e.Path, e.Message)
		}
	}
	if !result.Valid {
		t.Errorf("expected valid=true")
	}
}

// TestLevel2BrokenReferences checks that broken refs produce level 2 errors and conformance level 1.
func TestLevel2BrokenReferences(t *testing.T) {
	doc, err := os.ReadFile(filepath.Join(fixturesDir(), "broken-references.json"))
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}
	result, err := ValidateLevel2(doc)
	if err != nil {
		t.Fatalf("ValidateLevel2 error: %v", err)
	}
	// Passed schema (level 1) but failed refs — so conformanceLevel stays at 1.
	if result.ConformanceLevel != ConformanceLevel1 {
		t.Errorf("expected conformanceLevel %d, got %d", ConformanceLevel1, result.ConformanceLevel)
	}
	if result.Valid {
		t.Errorf("expected valid=false (broken references)")
	}
	// Must have level-2 errors
	hasLevel2 := false
	for _, e := range result.Errors {
		if e.Level == 2 {
			hasLevel2 = true
			t.Logf("level-2 error: %s: %s", e.Path, e.Message)
		}
	}
	if !hasLevel2 {
		t.Errorf("expected at least one Level 2 error")
		for _, e := range result.Errors {
			t.Logf("  level=%d %s: %s", e.Level, e.Path, e.Message)
		}
	}
}

// TestLevel2OnlyRunsAfterLevel1 checks that a schema-invalid document gets conformance level 0,
// with no level-2 errors (we short-circuit before ref checking).
func TestLevel2OnlyRunsAfterLevel1(t *testing.T) {
	result, err := ValidateLevel2([]byte(`{"not":"valid"}`))
	if err != nil {
		t.Fatalf("ValidateLevel2 error: %v", err)
	}
	if result.ConformanceLevel != ConformanceFailed {
		t.Errorf("expected conformanceLevel %d, got %d", ConformanceFailed, result.ConformanceLevel)
	}
	// No level-2 errors should be present
	for _, e := range result.Errors {
		if e.Level == 2 {
			t.Errorf("unexpected Level 2 error for schema-invalid document: %s", e.Message)
		}
	}
}

// TestLevel1StillWorksWithConformanceLevel checks that Validate() sets conformanceLevel=1, not 2.
func TestLevel1StillWorksWithConformanceLevel(t *testing.T) {
	doc, err := os.ReadFile(filepath.Join(fixturesDir(), "english-family-estate.json"))
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}
	result, err := Validate(doc)
	if err != nil {
		t.Fatalf("Validate error: %v", err)
	}
	if result.ConformanceLevel != ConformanceLevel1 {
		t.Errorf("Validate() should return conformanceLevel %d, got %d", ConformanceLevel1, result.ConformanceLevel)
	}
	if !result.Valid {
		t.Errorf("expected valid=true")
	}
}

// TestLevel2InvalidJSONShortCircuits checks that invalid JSON is handled before ref checks.
func TestLevel2InvalidJSONShortCircuits(t *testing.T) {
	result, err := ValidateLevel2([]byte(`not json`))
	if err == nil && result == nil {
		t.Fatal("expected an error or result for invalid JSON")
	}
	// Either an error is returned, or conformanceLevel is 0.
	if result != nil && result.ConformanceLevel != ConformanceFailed {
		t.Errorf("expected conformanceLevel %d for invalid JSON, got %d", ConformanceFailed, result.ConformanceLevel)
	}
}

// TestLevel2MinimalEstate checks that a minimal valid estate with no refs also reaches level 2.
func TestLevel2MinimalEstate(t *testing.T) {
	doc, err := os.ReadFile(filepath.Join(fixturesDir(), "minimal-estate.json"))
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}
	result, err := ValidateLevel2(doc)
	if err != nil {
		t.Fatalf("ValidateLevel2 error: %v", err)
	}
	if result.ConformanceLevel != ConformanceLevel2 {
		t.Errorf("expected conformanceLevel %d, got %d", ConformanceLevel2, result.ConformanceLevel)
		for _, e := range result.Errors {
			t.Logf("  level=%d %s: %s", e.Level, e.Path, e.Message)
		}
	}
}

// TestCheckRefsAllValid checks the checkRefs helper directly with a fully valid document.
func TestCheckRefsAllValid(t *testing.T) {
	doc := map[string]any{
		"people": []any{
			map[string]any{"id": "person-1"},
		},
		"bequests": []any{
			map[string]any{
				"id":            "bequest-1",
				"beneficiaryId": "person-1",
			},
		},
	}
	errs := checkRefs(doc, "")
	if len(errs) != 0 {
		t.Errorf("expected no errors, got %d: %v", len(errs), errs)
	}
}

// TestCheckRefsMissingPerson checks that a missing person reference is detected.
func TestCheckRefsMissingPerson(t *testing.T) {
	doc := map[string]any{
		"people": []any{},
		"bequests": []any{
			map[string]any{
				"id":            "bequest-1",
				"beneficiaryId": "missing-person",
			},
		},
	}
	errs := checkRefs(doc, "")
	if len(errs) == 0 {
		t.Errorf("expected errors for missing person reference")
	}
}

// TestCheckRefsArrayRef checks that an array reference field (e.g. beneficiaryPersonIds) is checked.
func TestCheckRefsArrayRef(t *testing.T) {
	doc := map[string]any{
		"people": []any{
			map[string]any{"id": "person-1"},
		},
		"trusts": []any{
			map[string]any{
				"id": "trust-1",
				"beneficiaryPersonIds": []any{"person-1", "missing-person-2"},
			},
		},
	}
	errs := checkRefs(doc, "")
	if len(errs) == 0 {
		t.Errorf("expected errors for missing person in array ref")
	}
	found := false
	for _, e := range errs {
		if e.Level == 2 {
			found = true
		}
	}
	if !found {
		t.Errorf("expected Level 2 errors")
	}
}

// TestCheckRefsExternalIDsSkipped verifies external/non-entity IDs are not checked.
func TestCheckRefsExternalIDsSkipped(t *testing.T) {
	doc := map[string]any{
		"people": []any{
			map[string]any{
				"id":         "person-1",
				"wikidataId": "Q12345",
			},
		},
		"assets": []any{
			map[string]any{
				"id":         "asset-1",
				"referenceId": "external-ref-abc",
				"listingId":   "listing-xyz",
			},
		},
	}
	errs := checkRefs(doc, "")
	if len(errs) != 0 {
		t.Errorf("expected no errors (external IDs should be skipped), got: %v", errs)
	}
}
