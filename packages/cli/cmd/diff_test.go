package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// minimalDoc is a minimal valid INHERIT document for use in diff tests.
const minimalDoc = `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]}
  ]
}`

// writeDiffFixture writes content to a temp file and returns its path.
func writeDiffFixture(t *testing.T, content string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "doc.json")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("writeDiffFixture: %v", err)
	}
	return path
}

// runDiff calls ExecuteDiff and returns (output, exitCode).
func runDiff(t *testing.T, oldFile, newFile, level string, jsonOutput, includeMetadata bool) (string, int) {
	t.Helper()
	var buf bytes.Buffer
	code := ExecuteDiff(oldFile, newFile, level, jsonOutput, includeMetadata, &buf)
	return buf.String(), code
}

// ---------------------------------------------------------------------------
// Test 1: identical documents → exit code 0
// ---------------------------------------------------------------------------

func TestDiffIdentical(t *testing.T) {
	f := writeDiffFixture(t, minimalDoc)
	out, code := runDiff(t, f, f, "summary", false, false)
	if code != 0 {
		t.Errorf("expected code 0 for identical docs, got %d: %s", code, out)
	}
	if out != "No changes.\n" {
		t.Errorf("expected 'No changes.', got %q", out)
	}
}

// ---------------------------------------------------------------------------
// Test 2: added entity → exit code 1, addition shown
// ---------------------------------------------------------------------------

func TestDiffAddedPerson(t *testing.T) {
	withExtra := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]},
    {"id": "p0000000-0000-4000-a000-000000000002", "givenName": "Jane", "familyName": "Smith", "roles": ["beneficiary"]}
  ]
}`
	oldFile := writeDiffFixture(t, minimalDoc)
	newFile := writeDiffFixture(t, withExtra)

	out, code := runDiff(t, oldFile, newFile, "summary", false, false)
	if code != 1 {
		t.Errorf("expected code 1 for added person, got %d: %s", code, out)
	}
	if out == "" || out == "No changes.\n" {
		t.Errorf("expected non-empty diff output, got %q", out)
	}

	// Detail level should show the addition
	outDetail, codeDetail := runDiff(t, oldFile, newFile, "detail", false, false)
	if codeDetail != 1 {
		t.Errorf("expected code 1 in detail mode, got %d", codeDetail)
	}
	if len(outDetail) == 0 {
		t.Error("expected detail output, got empty string")
	}
	// Should contain a "+" indicating addition
	found := false
	for _, line := range bytes.Split([]byte(outDetail), []byte("\n")) {
		if len(line) > 0 && line[0] == '+' {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("detail output missing '+' line for addition: %s", outDetail)
	}
}

// ---------------------------------------------------------------------------
// Test 3: removed entity → exit code 1, removal shown
// ---------------------------------------------------------------------------

func TestDiffRemovedAsset(t *testing.T) {
	withAsset := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]}
  ],
  "assets": [
    {"id": "a0000000-0000-4000-a000-000000000001", "name": "Savings account", "category": "bank_account", "estimatedValue": 50000}
  ]
}`
	oldFile := writeDiffFixture(t, withAsset)
	newFile := writeDiffFixture(t, minimalDoc)

	out, code := runDiff(t, oldFile, newFile, "summary", false, false)
	if code != 1 {
		t.Errorf("expected code 1 for removed asset, got %d: %s", code, out)
	}
	if out == "No changes.\n" {
		t.Error("expected diff output showing removal, got 'No changes.'")
	}

	// Detail level should show the removal
	outDetail, _ := runDiff(t, oldFile, newFile, "detail", false, false)
	found := false
	for _, line := range bytes.Split([]byte(outDetail), []byte("\n")) {
		if len(line) > 0 && line[0] == '-' {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("detail output missing '-' line for removal: %s", outDetail)
	}
}

// ---------------------------------------------------------------------------
// Test 4: modified entity → exit code 1, changed fields shown
// ---------------------------------------------------------------------------

func TestDiffModifiedBequest(t *testing.T) {
	oldDoc := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]}
  ],
  "bequests": [
    {"id": "b0000000-0000-4000-a000-000000000001", "title": "Residuary estate", "beneficiaryId": "p0000000-0000-4000-a000-000000000001", "sharePercentage": 50}
  ]
}`
	newDoc := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]}
  ],
  "bequests": [
    {"id": "b0000000-0000-4000-a000-000000000001", "title": "Residuary estate", "beneficiaryId": "p0000000-0000-4000-a000-000000000002", "sharePercentage": 25}
  ]
}`
	oldFile := writeDiffFixture(t, oldDoc)
	newFile := writeDiffFixture(t, newDoc)

	out, code := runDiff(t, oldFile, newFile, "summary", false, false)
	if code != 1 {
		t.Errorf("expected code 1 for modified bequest, got %d: %s", code, out)
	}

	outDetail, _ := runDiff(t, oldFile, newFile, "detail", false, false)
	// Should contain "~" for modification
	found := false
	for _, line := range bytes.Split([]byte(outDetail), []byte("\n")) {
		if len(line) > 0 && line[0] == '~' {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("detail output missing '~' line for modification: %s", outDetail)
	}
	// Should mention the changed fields
	if !bytes.Contains([]byte(outDetail), []byte("sharePercentage")) {
		t.Errorf("detail output should mention sharePercentage: %s", outDetail)
	}
	if !bytes.Contains([]byte(outDetail), []byte("beneficiaryId")) {
		t.Errorf("detail output should mention beneficiaryId: %s", outDetail)
	}
}

// ---------------------------------------------------------------------------
// Test 5: metadata-only diff → exit code 0 (ignored by default)
// ---------------------------------------------------------------------------

func TestDiffMetadataIgnored(t *testing.T) {
	docWithMeta := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "exportedAt": "2026-01-01T00:00:00Z",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]}
  ]
}`
	docWithDifferentMeta := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "exportedAt": "2026-06-01T12:00:00Z",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-06-01T12:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]}
  ]
}`
	oldFile := writeDiffFixture(t, docWithMeta)
	newFile := writeDiffFixture(t, docWithDifferentMeta)

	out, code := runDiff(t, oldFile, newFile, "summary", false, false)
	if code != 0 {
		t.Errorf("expected code 0 when only metadata differs, got %d: %s", code, out)
	}
}

// ---------------------------------------------------------------------------
// Test 6: metadata included → exit code 1
// ---------------------------------------------------------------------------

func TestDiffMetadataIncluded(t *testing.T) {
	docWithMeta := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]}
  ]
}`
	docWithDifferentMeta := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-06-01T12:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]}
  ]
}`
	oldFile := writeDiffFixture(t, docWithMeta)
	newFile := writeDiffFixture(t, docWithDifferentMeta)

	out, code := runDiff(t, oldFile, newFile, "summary", false, true /* includeMetadata */)
	if code != 1 {
		t.Errorf("expected code 1 when metadata is included and differs, got %d: %s", code, out)
	}
}

// ---------------------------------------------------------------------------
// Test 7: missing file → exit code 2
// ---------------------------------------------------------------------------

func TestDiffMissingFile(t *testing.T) {
	f := writeDiffFixture(t, minimalDoc)
	_, code := runDiff(t, f, "/nonexistent/path/doc.json", "summary", false, false)
	if code != 2 {
		t.Errorf("expected code 2 for missing file, got %d", code)
	}
}

func TestDiffMissingOldFile(t *testing.T) {
	f := writeDiffFixture(t, minimalDoc)
	_, code := runDiff(t, "/nonexistent/path/doc.json", f, "summary", false, false)
	if code != 2 {
		t.Errorf("expected code 2 for missing old file, got %d", code)
	}
}

// ---------------------------------------------------------------------------
// Test 8: JSON output → parseable JSON with expected structure
// ---------------------------------------------------------------------------

func TestDiffJSONOutput(t *testing.T) {
	withExtra := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]},
    {"id": "p0000000-0000-4000-a000-000000000002", "givenName": "Jane", "familyName": "Smith", "roles": ["beneficiary"]}
  ]
}`
	oldFile := writeDiffFixture(t, minimalDoc)
	newFile := writeDiffFixture(t, withExtra)

	out, code := runDiff(t, oldFile, newFile, "summary", true /* jsonOutput */, false)
	if code != 1 {
		t.Errorf("expected code 1 for added person, got %d", code)
	}

	// Must be valid JSON
	var parsed map[string]any
	if err := json.Unmarshal([]byte(out), &parsed); err != nil {
		t.Fatalf("JSON output is not valid JSON: %v\nOutput: %s", err, out)
	}

	// Must have expected top-level keys
	if _, ok := parsed["changes"]; !ok {
		t.Error("JSON output missing 'changes' field")
	}
	if _, ok := parsed["summary"]; !ok {
		t.Error("JSON output missing 'summary' field")
	}
	if _, ok := parsed["totalChanges"]; !ok {
		t.Error("JSON output missing 'totalChanges' field")
	}

	// totalChanges must be > 0
	totalChanges, ok := parsed["totalChanges"].(float64)
	if !ok || totalChanges <= 0 {
		t.Errorf("expected totalChanges > 0, got %v", parsed["totalChanges"])
	}
}

func TestDiffJSONOutputNoChanges(t *testing.T) {
	f := writeDiffFixture(t, minimalDoc)
	out, code := runDiff(t, f, f, "summary", true /* jsonOutput */, false)
	if code != 0 {
		t.Errorf("expected code 0 for identical docs with JSON output, got %d", code)
	}

	var parsed map[string]any
	if err := json.Unmarshal([]byte(out), &parsed); err != nil {
		t.Fatalf("JSON output is not valid JSON: %v\nOutput: %s", err, out)
	}
	totalChanges, _ := parsed["totalChanges"].(float64)
	if totalChanges != 0 {
		t.Errorf("expected totalChanges=0 for identical docs, got %v", totalChanges)
	}
}

// ---------------------------------------------------------------------------
// Test 9: patch level output
// ---------------------------------------------------------------------------

func TestDiffPatchOutput(t *testing.T) {
	withExtra := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]},
    {"id": "p0000000-0000-4000-a000-000000000002", "givenName": "Jane", "familyName": "Smith", "roles": ["beneficiary"]}
  ]
}`
	oldFile := writeDiffFixture(t, minimalDoc)
	newFile := writeDiffFixture(t, withExtra)

	out, code := runDiff(t, oldFile, newFile, "patch", false, false)
	if code != 1 {
		t.Errorf("expected code 1 for patch with changes, got %d", code)
	}

	// Must be a valid JSON array
	var patch []map[string]any
	if err := json.Unmarshal([]byte(out), &patch); err != nil {
		t.Fatalf("patch output is not valid JSON array: %v\nOutput: %s", err, out)
	}
	if len(patch) == 0 {
		t.Error("expected at least one patch operation, got empty array")
	}
	// Each operation must have "op" and "path"
	for i, op := range patch {
		if _, ok := op["op"]; !ok {
			t.Errorf("patch op[%d] missing 'op' field", i)
		}
		if _, ok := op["path"]; !ok {
			t.Errorf("patch op[%d] missing 'path' field", i)
		}
	}
}

// ---------------------------------------------------------------------------
// Test 10: entity matched by ID (not position)
// ---------------------------------------------------------------------------

func TestDiffEntityMatchedByID(t *testing.T) {
	// Same two people, but in reversed order in newDoc
	// If matched by position, both would appear "modified"
	// If matched by ID, there should be no changes
	docOrderA := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]},
    {"id": "p0000000-0000-4000-a000-000000000002", "givenName": "Jane", "familyName": "Smith", "roles": ["beneficiary"]}
  ]
}`
	docOrderB := `{
  "$schema": "https://openinherit.org/v3/schema.json",
  "schemaVersion": "6.0.0",
  "estate": {
    "id": "e0000000-0000-4000-a000-000000000001",
    "testatorPersonId": "p0000000-0000-4000-a000-000000000001",
    "status": "planning",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "domicile": {"country": "GB", "subdivision": "GB-ENG", "legalSystems": ["common_law"], "name": "England"}
  },
  "people": [
    {"id": "p0000000-0000-4000-a000-000000000002", "givenName": "Jane", "familyName": "Smith", "roles": ["beneficiary"]},
    {"id": "p0000000-0000-4000-a000-000000000001", "givenName": "James", "familyName": "Ashford", "roles": ["testator"]}
  ]
}`
	oldFile := writeDiffFixture(t, docOrderA)
	newFile := writeDiffFixture(t, docOrderB)

	out, code := runDiff(t, oldFile, newFile, "summary", false, false)
	if code != 0 {
		t.Errorf("expected code 0 when same entities in different order (matched by ID), got %d: %s", code, out)
	}
}

// ---------------------------------------------------------------------------
// Test 11: invalid JSON → exit code 2
// ---------------------------------------------------------------------------

func TestDiffInvalidJSON(t *testing.T) {
	badJSON := `{ this is not valid JSON }`
	f := writeDiffFixture(t, minimalDoc)
	bad := writeDiffFixture(t, badJSON)

	_, code := runDiff(t, f, bad, "summary", false, false)
	if code != 2 {
		t.Errorf("expected code 2 for invalid JSON, got %d", code)
	}
}
