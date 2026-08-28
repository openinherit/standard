package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"testing"
)

func TestInitEstate(t *testing.T) {
	var buf bytes.Buffer
	code := ExecuteInit(false, &buf)
	if code != 0 {
		t.Fatalf("expected exit code 0, got %d", code)
	}

	var doc map[string]any
	if err := json.Unmarshal(buf.Bytes(), &doc); err != nil {
		t.Fatalf("output is not valid JSON: %v", err)
	}
	if doc["$schema"] != "https://openinherit.org/v3/schema.json" {
		t.Errorf("expected estate $schema, got %v", doc["$schema"])
	}
	if doc["schemaVersion"] == nil {
		t.Error("expected schemaVersion")
	}
	if doc["estate"] == nil {
		t.Error("expected estate field")
	}
	if doc["people"] == nil {
		t.Error("expected people field")
	}

	// Validate the generated document passes validation
	tmpFile := writeTemp(t, buf.Bytes())
	out, vcode := runValidate(t, tmpFile, true)
	if vcode != 0 {
		t.Errorf("generated estate doc fails validation: %s", out)
	}
}

func TestInitCatalogue(t *testing.T) {
	var buf bytes.Buffer
	code := ExecuteInit(true, &buf)
	if code != 0 {
		t.Fatalf("expected exit code 0, got %d", code)
	}

	var doc map[string]any
	if err := json.Unmarshal(buf.Bytes(), &doc); err != nil {
		t.Fatalf("output is not valid JSON: %v", err)
	}
	if doc["$schema"] != "https://openinherit.org/v3/catalogue.json" {
		t.Errorf("expected catalogue $schema, got %v", doc["$schema"])
	}
	if doc["assets"] == nil {
		t.Error("expected assets field")
	}

	// Validate the generated document passes validation
	tmpFile := writeTemp(t, buf.Bytes())
	out, vcode := runValidate(t, tmpFile, true)
	if vcode != 0 {
		t.Errorf("generated catalogue doc fails validation: %s", out)
	}
}

func TestInitEstateWithJurisdiction(t *testing.T) {
	jurisdictionKeys := []string{
		"england-wales", "scotland", "us-estate", "ireland",
		"canada", "australia-nz", "japan", "india",
	}
	for _, j := range jurisdictionKeys {
		t.Run(j, func(t *testing.T) {
			var buf bytes.Buffer
			code := ExecuteInitNonInteractive("estate", j, "Test Person", true, &buf)
			if code != 0 {
				t.Fatalf("exit code %d for %s", code, j)
			}
			var doc map[string]any
			if err := json.Unmarshal(buf.Bytes(), &doc); err != nil {
				t.Fatalf("invalid JSON for %s: %v", j, err)
			}
			if j != "none" {
				exts, ok := doc["extensions"].([]any)
				if !ok || len(exts) == 0 {
					t.Errorf("expected extensions for %s", j)
				}
			}
			tmpFile := writeTemp(t, buf.Bytes())
			out, vcode := runValidate(t, tmpFile, true)
			if vcode != 0 {
				t.Errorf("validation failed for %s: %s", j, out)
			}
		})
	}
}

func TestInitFull(t *testing.T) {
	var buf bytes.Buffer
	code := ExecuteInitFull("Test Person", "england-wales", &buf)
	if code != 0 {
		t.Fatalf("exit code %d", code)
	}
	var doc map[string]any
	if err := json.Unmarshal(buf.Bytes(), &doc); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	people, ok := doc["people"].([]any)
	if !ok || len(people) < 4 {
		t.Errorf("expected 4+ people in full mode, got %d", len(people))
	}
	trusts, ok := doc["trusts"].([]any)
	if !ok || len(trusts) == 0 {
		t.Error("expected trusts in full mode")
	}
	tmpFile := writeTemp(t, buf.Bytes())
	out, vcode := runValidate(t, tmpFile, true)
	if vcode != 0 {
		t.Errorf("validation failed: %s", out)
	}
}

func TestInitNone(t *testing.T) {
	var buf bytes.Buffer
	code := ExecuteInitNonInteractive("estate", "none", "Test Person", true, &buf)
	if code != 0 {
		t.Fatalf("exit code %d", code)
	}
	var doc map[string]any
	if err := json.Unmarshal(buf.Bytes(), &doc); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	exts, _ := doc["extensions"].([]any)
	if len(exts) != 0 {
		t.Errorf("expected no extensions for none, got %d", len(exts))
	}
}

func writeTemp(t *testing.T, data []byte) string {
	t.Helper()
	f := t.TempDir() + "/doc.json"
	if err := os.WriteFile(f, data, 0644); err != nil {
		t.Fatal(err)
	}
	return f
}
