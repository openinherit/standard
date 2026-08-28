package openinherit

import (
	"os"
	"path/filepath"
	"testing"
)

func fixturesDir() string {
	return filepath.Join("..", "..", "examples", "fixtures")
}

func TestValidEnglishEstate(t *testing.T) {
	doc, err := os.ReadFile(filepath.Join(fixturesDir(), "english-family-estate.json"))
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}
	result, err := Validate(doc)
	if err != nil {
		t.Fatalf("validation error: %v", err)
	}
	if !result.Valid {
		t.Errorf("expected valid, got %d errors", len(result.Errors))
		for _, e := range result.Errors {
			t.Logf("  %s: %s", e.Path, e.Message)
		}
	}
	if result.SchemaMode != "estate" {
		t.Errorf("expected schemaMode=estate, got %s", result.SchemaMode)
	}
	if result.Disclaimer == "" {
		t.Error("disclaimer should not be empty")
	}
}

func TestValidMinimalEstate(t *testing.T) {
	doc, err := os.ReadFile(filepath.Join(fixturesDir(), "minimal-estate.json"))
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}
	result, err := Validate(doc)
	if err != nil {
		t.Fatalf("validation error: %v", err)
	}
	if !result.Valid {
		t.Errorf("expected valid, got errors: %v", result.Errors)
	}
}

func TestValidCatalogue(t *testing.T) {
	doc, err := os.ReadFile(filepath.Join(fixturesDir(), "catalogue-only.json"))
	if err != nil {
		t.Fatalf("failed to read fixture: %v", err)
	}
	result, err := Validate(doc)
	if err != nil {
		t.Fatalf("validation error: %v", err)
	}
	if !result.Valid {
		t.Errorf("expected valid, got errors: %v", result.Errors)
	}
	if result.SchemaMode != "catalogue" {
		t.Errorf("expected schemaMode=catalogue, got %s", result.SchemaMode)
	}
}

func TestInvalidDocument(t *testing.T) {
	doc := []byte(`{"not": "an inherit document"}`)
	result, err := Validate(doc)
	if err != nil {
		t.Fatalf("validation error: %v", err)
	}
	if result.Valid {
		t.Error("expected invalid, got valid")
	}
	if len(result.Errors) == 0 {
		t.Error("expected errors")
	}
}

func TestExplicitCatalogueMode(t *testing.T) {
	doc := []byte(`{"assets": []}`)
	result, err := ValidateCatalogue(doc)
	if err != nil {
		t.Fatalf("validation error: %v", err)
	}
	if !result.Valid {
		t.Errorf("expected valid, got errors: %v", result.Errors)
	}
	if result.SchemaMode != "catalogue" {
		t.Errorf("expected schemaMode=catalogue, got %s", result.SchemaMode)
	}
}
