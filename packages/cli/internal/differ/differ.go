// Package differ implements schema-aware diffing of INHERIT documents.
// Entities are matched by their "id" field, not by array position.
package differ

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

// ChangeType describes the nature of a change.
type ChangeType string

const (
	Added    ChangeType = "added"
	Removed  ChangeType = "removed"
	Modified ChangeType = "modified"
)

// EntityChange describes a change to a single entity or value.
type EntityChange struct {
	Type       ChangeType    `json:"type"`
	EntityType string        `json:"entityType"`           // e.g. "people", "bequests"
	ID         string        `json:"id"`
	Name       string        `json:"name,omitempty"`       // human-readable name if available
	Fields     []FieldChange `json:"fields,omitempty"`     // for Modified
	OldValue   any           `json:"oldValue,omitempty"`   // for Added/Removed, full entity
	NewValue   any           `json:"newValue,omitempty"`
}

// FieldChange describes a single field that changed within a modified entity.
type FieldChange struct {
	Path     string `json:"path"`
	OldValue any    `json:"oldValue"`
	NewValue any    `json:"newValue"`
}

// DiffResult is the complete output of a diff operation.
type DiffResult struct {
	Changes      []EntityChange `json:"changes"`
	Summary      string         `json:"summary"`
	TotalChanges int            `json:"totalChanges"`
}

// JSONOutput is the structured JSON output for --json flag.
type JSONOutput struct {
	Changes      map[string]*EntityTypeChanges `json:"changes"`
	Summary      string                        `json:"summary"`
	TotalChanges int                           `json:"totalChanges"`
}

// EntityTypeChanges groups changes by entity type.
type EntityTypeChanges struct {
	Added    []any          `json:"added"`
	Removed  []any          `json:"removed"`
	Modified []EntityChange `json:"modified"`
}

// metadataFields are ignored by default.
var metadataFields = map[string]bool{
	"exportedAt":       true,
	"generator":        true,
	"lastModifiedAt":   true,
	"applicationState": true,
	"conformance":      true,
}

// entityArrayKeys are the top-level arrays matched by id.
var entityArrayKeys = []string{
	"people",
	"kinships",
	"relationships",
	"properties",
	"assets",
	"liabilities",
	"bequests",
	"trusts",
	"executors",
	"guardians",
	"wishes",
	"documents",
	"nonprobateTransfers",
	"proxyAuthorisations",
	"extensions",
	"assetCollections",
	"valuations",
	"lifetimeTransfers",
	"insurancePolicies",
	"notifications",
	"pets",
	"acknowledgements",
	"subscriptions",
	"spaces",
	"organisations",
	"events",
}

// scalarKeys are top-level keys compared as plain values (not entity arrays).
var scalarKeys = map[string]bool{
	"schemaVersion": true,
	"$schema":       true,
	"@context":      true,
}

// Diff compares two INHERIT documents and returns the differences.
// includeMetadata controls whether metadata fields are included in the diff.
func Diff(oldDoc, newDoc []byte, includeMetadata bool) (*DiffResult, error) {
	var oldMap, newMap map[string]any
	if err := json.Unmarshal(oldDoc, &oldMap); err != nil {
		return nil, fmt.Errorf("invalid JSON in old document: %w", err)
	}
	if err := json.Unmarshal(newDoc, &newMap); err != nil {
		return nil, fmt.Errorf("invalid JSON in new document: %w", err)
	}

	var changes []EntityChange

	// Compare scalar top-level keys
	for key := range scalarKeys {
		oldVal := oldMap[key]
		newVal := newMap[key]
		if !valuesEqual(oldVal, newVal) {
			changes = append(changes, EntityChange{
				Type:       Modified,
				EntityType: key,
				ID:         key,
				Fields: []FieldChange{
					{Path: key, OldValue: oldVal, NewValue: newVal},
				},
			})
		}
	}

	// Compare estate object field-by-field
	estateChanges := diffEstateObject(oldMap, newMap, includeMetadata)
	changes = append(changes, estateChanges...)

	// Compare each entity array by ID
	for _, arrayKey := range entityArrayKeys {
		arrChanges := diffEntityArray(arrayKey, oldMap, newMap, includeMetadata)
		changes = append(changes, arrChanges...)
	}

	// Sort changes for deterministic output: by entity type then by change type
	sort.Slice(changes, func(i, j int) bool {
		if changes[i].EntityType != changes[j].EntityType {
			return changes[i].EntityType < changes[j].EntityType
		}
		return string(changes[i].Type) < string(changes[j].Type)
	})

	result := &DiffResult{
		Changes:      changes,
		TotalChanges: len(changes),
		Summary:      buildSummary(changes),
	}
	return result, nil
}

// diffEstateObject compares the "estate" top-level object field-by-field.
func diffEstateObject(oldMap, newMap map[string]any, includeMetadata bool) []EntityChange {
	oldEstate, _ := oldMap["estate"].(map[string]any)
	newEstate, _ := newMap["estate"].(map[string]any)

	if oldEstate == nil && newEstate == nil {
		return nil
	}

	// Collect all field keys
	keys := make(map[string]bool)
	for k := range oldEstate {
		keys[k] = true
	}
	for k := range newEstate {
		keys[k] = true
	}

	var fields []FieldChange
	for k := range keys {
		if !includeMetadata && metadataFields[k] {
			continue
		}
		oldVal := oldEstate[k]
		newVal := newEstate[k]
		if !valuesEqual(oldVal, newVal) {
			fields = append(fields, FieldChange{
				Path:     "estate." + k,
				OldValue: oldVal,
				NewValue: newVal,
			})
		}
	}

	if len(fields) == 0 {
		return nil
	}

	// Sort fields for deterministic output
	sort.Slice(fields, func(i, j int) bool {
		return fields[i].Path < fields[j].Path
	})

	return []EntityChange{{
		Type:       Modified,
		EntityType: "estate",
		ID:         "estate",
		Fields:     fields,
	}}
}

// diffEntityArray compares two entity arrays, matching entries by "id".
func diffEntityArray(arrayKey string, oldMap, newMap map[string]any, includeMetadata bool) []EntityChange {
	oldArr := toEntitySlice(oldMap[arrayKey])
	newArr := toEntitySlice(newMap[arrayKey])

	oldByID := indexByID(oldArr)
	newByID := indexByID(newArr)

	var changes []EntityChange

	// Find removed (in old, not in new)
	for id, oldEntity := range oldByID {
		if _, exists := newByID[id]; !exists {
			changes = append(changes, EntityChange{
				Type:       Removed,
				EntityType: arrayKey,
				ID:         id,
				Name:       entityName(oldEntity),
				OldValue:   oldEntity,
			})
		}
	}

	// Find added (in new, not in old)
	for id, newEntity := range newByID {
		if _, exists := oldByID[id]; !exists {
			changes = append(changes, EntityChange{
				Type:       Added,
				EntityType: arrayKey,
				ID:         id,
				Name:       entityName(newEntity),
				NewValue:   newEntity,
			})
		}
	}

	// Find modified (in both, but different)
	for id, oldEntity := range oldByID {
		newEntity, exists := newByID[id]
		if !exists {
			continue
		}
		fields := diffObjects(oldEntity, newEntity, "", includeMetadata)
		if len(fields) > 0 {
			changes = append(changes, EntityChange{
				Type:       Modified,
				EntityType: arrayKey,
				ID:         id,
				Name:       entityName(newEntity),
				Fields:     fields,
			})
		}
	}

	return changes
}

// diffObjects recursively compares two maps and returns changed fields.
func diffObjects(oldObj, newObj map[string]any, prefix string, includeMetadata bool) []FieldChange {
	keys := make(map[string]bool)
	for k := range oldObj {
		keys[k] = true
	}
	for k := range newObj {
		keys[k] = true
	}

	var fields []FieldChange
	for k := range keys {
		if !includeMetadata && metadataFields[k] {
			continue
		}
		path := k
		if prefix != "" {
			path = prefix + "." + k
		}
		oldVal := oldObj[k]
		newVal := newObj[k]
		if !valuesEqual(oldVal, newVal) {
			fields = append(fields, FieldChange{
				Path:     path,
				OldValue: oldVal,
				NewValue: newVal,
			})
		}
	}

	sort.Slice(fields, func(i, j int) bool {
		return fields[i].Path < fields[j].Path
	})

	return fields
}

// BuildJSONOutput converts a DiffResult into the structured JSON output format.
func BuildJSONOutput(result *DiffResult) *JSONOutput {
	out := &JSONOutput{
		Changes:      make(map[string]*EntityTypeChanges),
		Summary:      result.Summary,
		TotalChanges: result.TotalChanges,
	}

	for _, ch := range result.Changes {
		et := ch.EntityType
		if out.Changes[et] == nil {
			out.Changes[et] = &EntityTypeChanges{
				Added:    []any{},
				Removed:  []any{},
				Modified: []EntityChange{},
			}
		}
		switch ch.Type {
		case Added:
			out.Changes[et].Added = append(out.Changes[et].Added, ch.NewValue)
		case Removed:
			out.Changes[et].Removed = append(out.Changes[et].Removed, ch.OldValue)
		case Modified:
			out.Changes[et].Modified = append(out.Changes[et].Modified, ch)
		}
	}

	return out
}

// BuildPatch generates an RFC 6902 JSON Patch array from a DiffResult.
// This is a best-effort patch — it may not be directly applicable to all
// INHERIT documents due to entity-by-id matching.
func BuildPatch(result *DiffResult) []map[string]any {
	var ops []map[string]any
	for _, ch := range result.Changes {
		switch ch.Type {
		case Added:
			ops = append(ops, map[string]any{
				"op":    "add",
				"path":  "/" + ch.EntityType + "/-",
				"value": ch.NewValue,
			})
		case Removed:
			ops = append(ops, map[string]any{
				"op":   "remove",
				"path": "/" + ch.EntityType + "/" + ch.ID,
			})
		case Modified:
			for _, f := range ch.Fields {
				ops = append(ops, map[string]any{
					"op":    "replace",
					"path":  "/" + strings.ReplaceAll(f.Path, ".", "/"),
					"value": f.NewValue,
				})
			}
		}
	}
	if ops == nil {
		ops = []map[string]any{}
	}
	return ops
}

// FormatDetail formats the diff result in "detail" level human-readable output.
func FormatDetail(result *DiffResult) string {
	if result.TotalChanges == 0 {
		return "No changes.\n"
	}

	var sb strings.Builder
	for _, ch := range result.Changes {
		switch ch.Type {
		case Added:
			name := ch.Name
			if name != "" {
				fmt.Fprintf(&sb, "+ %s %q (id: %s)\n", ch.EntityType, name, ch.ID)
			} else {
				fmt.Fprintf(&sb, "+ %s (id: %s)\n", ch.EntityType, ch.ID)
			}
		case Removed:
			name := ch.Name
			if name != "" {
				fmt.Fprintf(&sb, "- %s %q (id: %s)\n", ch.EntityType, name, ch.ID)
			} else {
				fmt.Fprintf(&sb, "- %s (id: %s)\n", ch.EntityType, ch.ID)
			}
		case Modified:
			name := ch.Name
			if name != "" {
				fmt.Fprintf(&sb, "~ %s %q (id: %s)\n", ch.EntityType, name, ch.ID)
			} else {
				fmt.Fprintf(&sb, "~ %s (id: %s)\n", ch.EntityType, ch.ID)
			}
			for _, f := range ch.Fields {
				fmt.Fprintf(&sb, "    %s: %s → %s\n", f.Path, formatVal(f.OldValue), formatVal(f.NewValue))
			}
		}
	}
	return sb.String()
}

// buildSummary produces a human-readable summary string from a list of changes.
func buildSummary(changes []EntityChange) string {
	if len(changes) == 0 {
		return "No changes."
	}

	// Count by entity type and change type
	type key struct{ entityType, changeType string }
	counts := make(map[key]int)
	for _, ch := range changes {
		counts[key{ch.EntityType, string(ch.Type)}]++
	}

	// Collect and sort keys for deterministic output
	var parts []string
	seen := make(map[key]bool)
	for _, ch := range changes {
		k := key{ch.EntityType, string(ch.Type)}
		if seen[k] {
			continue
		}
		seen[k] = true
		n := counts[k]
		noun := singularise(ch.EntityType)
		if n != 1 {
			noun = ch.EntityType
		}
		var verb string
		switch ChangeType(ch.Type) {
		case Added:
			verb = "added"
		case Removed:
			verb = "removed"
		case Modified:
			verb = "modified"
		}
		parts = append(parts, fmt.Sprintf("%d %s %s", n, noun, verb))
	}

	return strings.Join(parts, ", ")
}

// singularise returns a simple singular form of an entity type name.
func singularise(s string) string {
	if strings.HasSuffix(s, "ies") {
		return s[:len(s)-3] + "y" // e.g. "properties" → "property"
	}
	if strings.HasSuffix(s, "s") {
		return s[:len(s)-1]
	}
	return s
}

// entityName extracts a human-readable name from an entity map.
func entityName(entity map[string]any) string {
	// Try "name" first
	if name, ok := entity["name"].(string); ok && name != "" {
		return name
	}
	// Try givenName + familyName
	given, _ := entity["givenName"].(string)
	family, _ := entity["familyName"].(string)
	if given != "" || family != "" {
		return strings.TrimSpace(given + " " + family)
	}
	// Try "title"
	if title, ok := entity["title"].(string); ok && title != "" {
		return title
	}
	// Try "wishType"
	if wishType, ok := entity["wishType"].(string); ok && wishType != "" {
		return wishType
	}
	return ""
}

// toEntitySlice converts an any value to a slice of entity maps.
func toEntitySlice(v any) []map[string]any {
	arr, ok := v.([]any)
	if !ok {
		return nil
	}
	result := make([]map[string]any, 0, len(arr))
	for _, item := range arr {
		if m, ok := item.(map[string]any); ok {
			result = append(result, m)
		}
	}
	return result
}

// indexByID builds a map from id → entity. Entities without an id are skipped.
func indexByID(entities []map[string]any) map[string]map[string]any {
	m := make(map[string]map[string]any, len(entities))
	for _, e := range entities {
		if id, ok := e["id"].(string); ok && id != "" {
			m[id] = e
		}
	}
	return m
}

// valuesEqual does a deep equality check via JSON round-trip.
func valuesEqual(a, b any) bool {
	if a == nil && b == nil {
		return true
	}
	aBytes, err := json.Marshal(a)
	if err != nil {
		return false
	}
	bBytes, err := json.Marshal(b)
	if err != nil {
		return false
	}
	return string(aBytes) == string(bBytes)
}

// formatVal returns a compact JSON representation of a value for display.
func formatVal(v any) string {
	if v == nil {
		return "null"
	}
	b, err := json.Marshal(v)
	if err != nil {
		return fmt.Sprintf("%v", v)
	}
	return string(b)
}
