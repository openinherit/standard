package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func runLint(t *testing.T, file string, jsonOutput bool) (string, int) {
	t.Helper()
	var buf bytes.Buffer
	code := ExecuteLint(file, jsonOutput, false, &buf)
	return buf.String(), code
}

func TestLintBrokenReferences(t *testing.T) {
	out, code := runLint(t, filepath.Join(fixturesDir(), "broken-references.json"), true)
	if code != 1 {
		t.Errorf("expected exit code 1 (warnings), got %d\noutput: %s", code, out)
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, out)
	}
	warnings, ok := result["warnings"].([]any)
	if !ok || len(warnings) == 0 {
		t.Errorf("expected orphaned-reference warnings, got none\noutput: %s", out)
	}
	// Verify at least one warning has rule=orphaned-reference
	found := false
	for _, w := range warnings {
		wm, ok := w.(map[string]any)
		if !ok {
			continue
		}
		if wm["rule"] == "orphaned-reference" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected at least one orphaned-reference warning\noutput: %s", out)
	}
}

func TestLintCleanDocument(t *testing.T) {
	out, code := runLint(t, filepath.Join(fixturesDir(), "minimal-estate.json"), false)
	if code != 0 {
		t.Errorf("expected exit code 0 (no warnings), got %d\noutput: %s", code, out)
	}
}

func TestLintMissingFile(t *testing.T) {
	_, code := runLint(t, "/nonexistent/file.json", false)
	if code != 2 {
		t.Errorf("expected exit code 2, got %d", code)
	}
}

func TestLintInvalidJSON(t *testing.T) {
	tmpFile := filepath.Join(t.TempDir(), "bad.json")
	os.WriteFile(tmpFile, []byte(`{not valid json`), 0644)
	_, code := runLint(t, tmpFile, false)
	if code != 2 {
		t.Errorf("expected exit code 2 for invalid JSON, got %d", code)
	}
}

func TestLintEmptyDescription(t *testing.T) {
	doc := `{
		"$schema": "https://openinherit.org/v3/schema.json",
		"exportedAt": "` + time.Now().UTC().Format(time.RFC3339) + `",
		"estate": {
			"id": "est-0001-0000-0000-000000000001",
			"testatorPersonId": "prs-0001-0000-0000-000000000001",
			"status": "planning"
		},
		"people": [
			{
				"id": "prs-0001-0000-0000-000000000001",
				"givenName": "Test",
				"familyName": "Person",
				"description": ""
			}
		]
	}`
	tmpFile := filepath.Join(t.TempDir(), "empty-desc.json")
	os.WriteFile(tmpFile, []byte(doc), 0644)

	out, code := runLint(t, tmpFile, true)
	if code != 1 {
		t.Errorf("expected exit code 1 (warnings), got %d\noutput: %s", code, out)
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, out)
	}
	warnings := result["warnings"].([]any)
	found := false
	for _, w := range warnings {
		wm := w.(map[string]any)
		if wm["rule"] == "empty-description" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected empty-description warning\noutput: %s", out)
	}
}

func TestLintStaleExport(t *testing.T) {
	staleDate := time.Now().UTC().AddDate(-2, 0, 0).Format(time.RFC3339)
	doc := `{
		"$schema": "https://openinherit.org/v3/schema.json",
		"exportedAt": "` + staleDate + `",
		"estate": {
			"id": "est-0001-0000-0000-000000000001",
			"testatorPersonId": "prs-0001-0000-0000-000000000001",
			"status": "planning"
		},
		"people": [
			{
				"id": "prs-0001-0000-0000-000000000001",
				"givenName": "Test",
				"familyName": "Person"
			}
		]
	}`
	tmpFile := filepath.Join(t.TempDir(), "stale.json")
	os.WriteFile(tmpFile, []byte(doc), 0644)

	out, code := runLint(t, tmpFile, true)
	if code != 1 {
		t.Errorf("expected exit code 1 (warnings), got %d\noutput: %s", code, out)
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, out)
	}
	warnings := result["warnings"].([]any)
	found := false
	for _, w := range warnings {
		wm := w.(map[string]any)
		if wm["rule"] == "stale-export" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected stale-export warning\noutput: %s", out)
	}
}

func TestLintEmptyPeople(t *testing.T) {
	doc := `{
		"$schema": "https://openinherit.org/v3/schema.json",
		"exportedAt": "` + time.Now().UTC().Format(time.RFC3339) + `",
		"estate": {
			"id": "est-0001-0000-0000-000000000001",
			"status": "planning"
		},
		"people": []
	}`
	tmpFile := filepath.Join(t.TempDir(), "empty-people.json")
	os.WriteFile(tmpFile, []byte(doc), 0644)

	out, code := runLint(t, tmpFile, true)
	if code != 1 {
		t.Errorf("expected exit code 1 (warnings), got %d\noutput: %s", code, out)
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, out)
	}
	warnings := result["warnings"].([]any)
	found := false
	for _, w := range warnings {
		wm := w.(map[string]any)
		if wm["rule"] == "empty-people" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected empty-people warning\noutput: %s", out)
	}
}

func TestLintMissingValuation(t *testing.T) {
	doc := `{
		"$schema": "https://openinherit.org/v3/schema.json",
		"exportedAt": "` + time.Now().UTC().Format(time.RFC3339) + `",
		"estate": {
			"id": "est-0001-0000-0000-000000000001",
			"testatorPersonId": "prs-0001-0000-0000-000000000001",
			"status": "planning"
		},
		"people": [
			{
				"id": "prs-0001-0000-0000-000000000001",
				"givenName": "Test",
				"familyName": "Person"
			}
		],
		"assets": [
			{
				"id": "ast-0001-0000-0000-000000000001",
				"assetType": "property",
				"estimatedValue": { "amount": 500000, "currency": "GBP" }
			}
		],
		"valuations": []
	}`
	tmpFile := filepath.Join(t.TempDir(), "missing-val.json")
	os.WriteFile(tmpFile, []byte(doc), 0644)

	out, code := runLint(t, tmpFile, true)
	if code != 1 {
		t.Errorf("expected exit code 1 (warnings), got %d\noutput: %s", code, out)
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("output is not valid JSON: %v\noutput: %s", err, out)
	}
	warnings := result["warnings"].([]any)
	found := false
	for _, w := range warnings {
		wm := w.(map[string]any)
		if wm["rule"] == "missing-valuation" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected missing-valuation warning\noutput: %s", out)
	}
}

func TestLintMissingFileJSON(t *testing.T) {
	out, code := runLint(t, "/nonexistent/file.json", true)
	if code != 2 {
		t.Errorf("expected exit code 2, got %d", code)
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		t.Fatalf("expected JSON error output, got: %s", out)
	}
	if _, ok := result["error"]; !ok {
		t.Errorf("expected error field in JSON output")
	}
}

func TestLintQuietMode(t *testing.T) {
	// Clean document — quiet, no output, exit 0
	var buf bytes.Buffer
	code := ExecuteLint(filepath.Join(fixturesDir(), "minimal-estate.json"), false, true, &buf)
	if code != 0 {
		t.Errorf("expected exit code 0 in quiet mode for clean document, got %d", code)
	}
	if buf.Len() != 0 {
		t.Errorf("expected no output in quiet mode, got: %s", buf.String())
	}
}

func TestLintHumanOutput(t *testing.T) {
	staleDate := time.Now().UTC().AddDate(-2, 0, 0).Format(time.RFC3339)
	doc := `{
		"$schema": "https://openinherit.org/v3/schema.json",
		"exportedAt": "` + staleDate + `",
		"estate": {
			"id": "est-0001-0000-0000-000000000001",
			"testatorPersonId": "prs-0001-0000-0000-000000000001",
			"status": "planning"
		},
		"people": [
			{
				"id": "prs-0001-0000-0000-000000000001",
				"givenName": "Test",
				"familyName": "Person"
			}
		]
	}`
	tmpFile := filepath.Join(t.TempDir(), "human-test.json")
	os.WriteFile(tmpFile, []byte(doc), 0644)

	out, code := runLint(t, tmpFile, false)
	if code != 1 {
		t.Errorf("expected exit code 1, got %d", code)
	}
	// Human output should contain the rule name
	if len(out) == 0 {
		t.Error("expected non-empty human output")
	}
}
