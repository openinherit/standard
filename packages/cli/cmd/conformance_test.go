package cmd

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func kitDir() string {
	return filepath.Join("..", "..", "conformance")
}

// copyKit copies the published kit into a temp dir so a test can break it.
func copyKit(t *testing.T) string {
	t.Helper()
	dst := t.TempDir()
	err := filepath.WalkDir(kitDir(), func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(kitDir(), p)
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		data, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		return os.WriteFile(target, data, 0o644)
	})
	if err != nil {
		t.Fatal(err)
	}
	return dst
}

func readJSON(t *testing.T, path string) map[string]any {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var v map[string]any
	if err := json.Unmarshal(data, &v); err != nil {
		t.Fatal(err)
	}
	return v
}

func writeJSON(t *testing.T, path string, v any) {
	t.Helper()
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
}

func fileSHA(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

// rehash rewrites the manifest's sha256 for every test, so a test can change
// a fixture without the change being caught as tampering.
func rehash(t *testing.T, kit string) {
	t.Helper()
	m := readJSON(t, filepath.Join(kit, "manifest.json"))
	for _, raw := range m["tests"].([]any) {
		tc := raw.(map[string]any)
		tc["sha256"] = fileSHA(t, filepath.Join(kit, tc["file"].(string)))
		tc["expectedSha256"] = fileSHA(t, filepath.Join(kit, tc["expected"].(string)))
	}
	writeJSON(t, filepath.Join(kit, "manifest.json"), m)
}

func runConformance(t *testing.T, kit string, jsonOut bool) (string, int) {
	t.Helper()
	var buf bytes.Buffer
	code := ExecuteConformance(kit, jsonOut, &buf)
	return buf.String(), code
}

func TestConformancePublishedKitIsConformant(t *testing.T) {
	out, code := runConformance(t, kitDir(), false)
	if code != 0 {
		t.Fatalf("expected exit 0, got %d\n%s", code, out)
	}
	m := readJSON(t, filepath.Join(kitDir(), "manifest.json"))
	n := len(m["tests"].([]any))
	want := "CONFORMANT (" + itoa(n) + "/" + itoa(n) + ")"
	if !strings.Contains(out, want) {
		t.Errorf("expected %q in output\n%s", want, out)
	}
}

func TestConformanceJSONVerdict(t *testing.T) {
	out, code := runConformance(t, kitDir(), true)
	if code != 0 {
		t.Fatalf("expected exit 0, got %d\n%s", code, out)
	}
	var v map[string]any
	if err := json.Unmarshal([]byte(out), &v); err != nil {
		t.Fatalf("not JSON: %v\n%s", err, out)
	}
	if v["verdict"] != "CONFORMANT" {
		t.Errorf("verdict = %v", v["verdict"])
	}
	if v["failed"].(float64) != 0 || v["passed"] != v["total"] {
		t.Errorf("counts wrong: %v", v)
	}
	if v["kitVersion"] == "" || v["kitVersion"] == nil {
		t.Error("kitVersion missing")
	}
}

func TestConformanceValidCaseRefusedIsAMiss(t *testing.T) {
	kit := copyKit(t)
	p := filepath.Join(kit, "estate", "valid", "minimal-estate.json")
	doc := readJSON(t, p)
	doc["notAField"] = true // closed world: the schema refuses it
	writeJSON(t, p, doc)
	rehash(t, kit)

	out, code := runConformance(t, kit, false)
	if code != 1 {
		t.Fatalf("expected exit 1, got %d\n%s", code, out)
	}
	if !strings.Contains(out, "NOT CONFORMANT") || !strings.Contains(out, "estate/valid/minimal-estate.json") {
		t.Errorf("expected the failing case named\n%s", out)
	}
}

func TestConformanceInvalidCaseAcceptedIsAMiss(t *testing.T) {
	kit := copyKit(t)
	// Overwrite an INVALID case with a VALID document: it is now accepted.
	src, _ := os.ReadFile(filepath.Join(kit, "estate", "valid", "minimal-estate.json"))
	os.WriteFile(filepath.Join(kit, "estate", "invalid", "bad-uuid.json"), src, 0o644)
	rehash(t, kit)

	out, code := runConformance(t, kit, false)
	if code != 1 || !strings.Contains(out, "estate/invalid/bad-uuid.json") {
		t.Fatalf("expected exit 1 naming bad-uuid, got %d\n%s", code, out)
	}
}

// Each case is refused for the right reason in the published kit; moving its
// declared rule elsewhere must turn it into a miss. The closed-world and
// propertyNames cases cover the two error shapes refusedBy special-cases.
func TestConformanceRefusedForTheWrongRuleIsAMiss(t *testing.T) {
	cases := []struct {
		file, field, value string
	}{
		{"estate/invalid/bad-uuid.json", "instancePath", "/estate/status"},
		{"estate/invalid/bad-uuid.json", "keyword", "enum"},
		{"estate/invalid/closed-world-root.json", "instancePath", "/estate"},
		{"estate/invalid/closed-world-root.json", "keyword", "additionalProperties"},
		{"estate/invalid/closed-world-person.json", "instancePath", "/people"},
		{"estate/invalid/x-inherit-bad-key.json", "instancePath", ""},
		{"estate/invalid/x-inherit-bad-key.json", "keyword", "pattern"},
	}
	for _, c := range cases {
		t.Run(c.file+" "+c.field+"="+c.value, func(t *testing.T) {
			kit := copyKit(t)
			m := readJSON(t, filepath.Join(kit, "manifest.json"))
			found := false
			for _, raw := range m["tests"].([]any) {
				tc := raw.(map[string]any)
				if tc["file"] == c.file {
					tc["rule"].(map[string]any)[c.field] = c.value
					found = true
				}
			}
			if !found {
				t.Fatalf("%s is not in the kit", c.file)
			}
			writeJSON(t, filepath.Join(kit, "manifest.json"), m)

			out, code := runConformance(t, kit, false)
			if code != 1 || !strings.Contains(out, c.file+": refused, but not by its rule") {
				t.Fatalf("expected exit 1 naming %s, got %d\n%s", c.file, code, out)
			}
		})
	}
}

func TestConformanceTamperedFixtureFailsClosed(t *testing.T) {
	kit := copyKit(t)
	p := filepath.Join(kit, "estate", "valid", "minimal-estate.json")
	data, _ := os.ReadFile(p)
	os.WriteFile(p, append(data, '\n'), 0o644) // manifest not updated

	out, code := runConformance(t, kit, false)
	if code != 2 || !strings.Contains(out, "sha256") {
		t.Fatalf("expected exit 2 on sha256 mismatch, got %d\n%s", code, out)
	}
}

func TestConformanceTamperedExpectedFailsClosed(t *testing.T) {
	kit := copyKit(t)
	p := filepath.Join(kit, "expected", "bad-uuid.expected.json")
	data, _ := os.ReadFile(p)
	os.WriteFile(p, append(data, '\n'), 0o644)

	_, code := runConformance(t, kit, false)
	if code != 2 {
		t.Fatalf("expected exit 2 on expected-file sha256 mismatch, got %d", code)
	}
}

func TestConformanceSchemaSkewFailsClosed(t *testing.T) {
	kit := copyKit(t)
	p := filepath.Join(kit, "schemas", "inherit-v3-bundled.json")
	data, _ := os.ReadFile(p)
	os.WriteFile(p, append(data, '\n'), 0o644)
	m := readJSON(t, filepath.Join(kit, "manifest.json"))
	for _, raw := range m["schemas"].([]any) {
		s := raw.(map[string]any)
		s["sha256"] = fileSHA(t, filepath.Join(kit, s["file"].(string)))
	}
	writeJSON(t, filepath.Join(kit, "manifest.json"), m)

	out, code := runConformance(t, kit, false)
	if code != 2 || !strings.Contains(out, "embed") {
		t.Fatalf("expected exit 2 naming the schema skew, got %d\n%s", code, out)
	}
}

func TestConformanceMissingKitFailsClosed(t *testing.T) {
	_, code := runConformance(t, t.TempDir(), false)
	if code != 2 {
		t.Fatalf("expected exit 2 for a dir with no manifest, got %d", code)
	}
}

func TestConformanceEmptyManifestFailsClosed(t *testing.T) {
	kit := copyKit(t)
	m := readJSON(t, filepath.Join(kit, "manifest.json"))
	m["tests"] = []any{}
	writeJSON(t, filepath.Join(kit, "manifest.json"), m)

	_, code := runConformance(t, kit, false)
	if code != 2 {
		t.Fatalf("expected exit 2 for a manifest with no tests, got %d", code)
	}
}

func itoa(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}

func TestConformanceManifestMustCoverBothSchemas(t *testing.T) {
	kit := copyKit(t)
	m := readJSON(t, filepath.Join(kit, "manifest.json"))
	s := m["schemas"].([]any)
	m["schemas"] = []any{s[0], s[0]} // the catalogue schema is never checked
	writeJSON(t, filepath.Join(kit, "manifest.json"), m)

	out, code := runConformance(t, kit, false)
	if code != 2 || !strings.Contains(out, "does not list") {
		t.Fatalf("expected exit 2 naming the unlisted schema, got %d\n%s", code, out)
	}
}

func TestConformanceExpectedFileMustAgreeWithManifest(t *testing.T) {
	kit := copyKit(t)
	p := filepath.Join(kit, "expected", "bad-uuid.expected.json")
	e := readJSON(t, p)
	e["valid"] = true // the manifest still says false
	writeJSON(t, p, e)
	rehash(t, kit)

	out, code := runConformance(t, kit, false)
	if code != 2 || !strings.Contains(out, "bad-uuid.expected.json") {
		t.Fatalf("expected exit 2 naming the disagreeing expected file, got %d\n%s", code, out)
	}
}

func TestConformanceMissNamesWhatWasRefused(t *testing.T) {
	kit := copyKit(t)
	p := filepath.Join(kit, "estate", "valid", "minimal-estate.json")
	doc := readJSON(t, p)
	doc["notAField"] = true
	writeJSON(t, p, doc)
	rehash(t, kit)

	out, _ := runConformance(t, kit, false)
	if !strings.Contains(out, "/notAField") {
		t.Fatalf("expected the refused location in the reason\n%s", out)
	}
}
