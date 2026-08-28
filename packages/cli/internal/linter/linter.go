package linter

import (
	"encoding/json"
	"fmt"
	"time"
)

// Warning represents a single lint warning.
type Warning struct {
	Rule    string `json:"rule"`
	Path    string `json:"path"`
	Message string `json:"message"`
}

// LintResult is the complete output of a lint run.
type LintResult struct {
	Warnings []Warning `json:"warnings"`
	Total    int       `json:"total"`
}

// Lint parses the document and runs all lint rules, returning the result.
func Lint(document []byte) (*LintResult, error) {
	var doc map[string]any
	if err := json.Unmarshal(document, &doc); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	var warnings []Warning
	warnings = append(warnings, checkOrphanedReferences(doc)...)
	warnings = append(warnings, checkEmptyDescriptions(doc)...)
	warnings = append(warnings, checkEmptyPeople(doc)...)
	warnings = append(warnings, checkMissingValuation(doc)...)
	warnings = append(warnings, checkStaleExport(doc)...)

	return &LintResult{
		Warnings: warnings,
		Total:    len(warnings),
	}, nil
}

// ---------------------------------------------------------------------------
// Rule: orphaned-reference
// ---------------------------------------------------------------------------

// referenceField describes a single reference to check.
type referenceField struct {
	arrayKey  string // top-level array in the document
	fieldKey  string // field within each element that holds the ID reference
	pathTmpl  string // JSON path template (use %d for index)
}

var referenceFields = []referenceField{
	// estate.testatorPersonId — handled separately (scalar, not array)

	// bequests — uses beneficiaryId (references people or organisations)
	{arrayKey: "bequests", fieldKey: "beneficiaryId"},

	// executors
	{arrayKey: "executors", fieldKey: "personId"},

	// guardians — personId is the guardian, childPersonId is the ward
	{arrayKey: "guardians", fieldKey: "personId"},
	{arrayKey: "guardians", fieldKey: "childPersonId"},

	// kinships use fromPersonId / toPersonId
	{arrayKey: "kinships", fieldKey: "fromPersonId"},
	{arrayKey: "kinships", fieldKey: "toPersonId"},

	// proxyAuthorisations use proxyPersonId / testatorPersonId
	{arrayKey: "proxyAuthorisations", fieldKey: "proxyPersonId"},
	{arrayKey: "proxyAuthorisations", fieldKey: "testatorPersonId"},

	// spaces — propertyId references properties array
	{arrayKey: "spaces", fieldKey: "propertyId"},

	// valuations — entityId references any entity
	{arrayKey: "valuations", fieldKey: "entityId"},
}

// collectAllEntityIDs gathers every `id` value from every array of objects in
// the document. This forms the universe of known identifiers.
func collectAllEntityIDs(doc map[string]any) map[string]bool {
	ids := make(map[string]bool)

	// Single estate object
	if estate, ok := doc["estate"].(map[string]any); ok {
		if id, ok := estate["id"].(string); ok && id != "" {
			ids[id] = true
		}
	}

	// All top-level arrays — collect id from each element
	for _, val := range doc {
		arr, ok := val.([]any)
		if !ok {
			continue
		}
		for _, item := range arr {
			obj, ok := item.(map[string]any)
			if !ok {
				continue
			}
			if id, ok := obj["id"].(string); ok && id != "" {
				ids[id] = true
			}
		}
	}
	return ids
}

func checkOrphanedReferences(doc map[string]any) []Warning {
	knownIDs := collectAllEntityIDs(doc)
	var warnings []Warning

	// Check estate.testatorPersonId
	if estate, ok := doc["estate"].(map[string]any); ok {
		if ref, ok := estate["testatorPersonId"].(string); ok && ref != "" {
			if !knownIDs[ref] {
				warnings = append(warnings, Warning{
					Rule:    "orphaned-reference",
					Path:    "/estate/testatorPersonId",
					Message: fmt.Sprintf("%q not found in any entity", ref),
				})
			}
		}
	}

	// Check all configured reference fields in arrays
	for _, rf := range referenceFields {
		arr, ok := doc[rf.arrayKey].([]any)
		if !ok {
			continue
		}
		for i, item := range arr {
			obj, ok := item.(map[string]any)
			if !ok {
				continue
			}
			ref, ok := obj[rf.fieldKey].(string)
			if !ok || ref == "" {
				continue
			}
			if !knownIDs[ref] {
				warnings = append(warnings, Warning{
					Rule:    "orphaned-reference",
					Path:    fmt.Sprintf("/%s/%d/%s", rf.arrayKey, i, rf.fieldKey),
					Message: fmt.Sprintf("%q not found in any entity", ref),
				})
			}
		}
	}

	// Check relationships — partners is a nested array with personId
	if rels, ok := doc["relationships"].([]any); ok {
		for i, item := range rels {
			obj, ok := item.(map[string]any)
			if !ok {
				continue
			}
			partners, ok := obj["partners"].([]any)
			if !ok {
				continue
			}
			for j, partner := range partners {
				p, ok := partner.(map[string]any)
				if !ok {
					continue
				}
				ref, ok := p["personId"].(string)
				if !ok || ref == "" {
					continue
				}
				if !knownIDs[ref] {
					warnings = append(warnings, Warning{
						Rule:    "orphaned-reference",
						Path:    fmt.Sprintf("/relationships/%d/partners/%d/personId", i, j),
						Message: fmt.Sprintf("%q not found in any entity", ref),
					})
				}
			}
		}
	}

	return warnings
}

// ---------------------------------------------------------------------------
// Rule: empty-description
// ---------------------------------------------------------------------------

func checkEmptyDescriptions(doc map[string]any) []Warning {
	var warnings []Warning
	for arrayKey, val := range doc {
		arr, ok := val.([]any)
		if !ok {
			continue
		}
		for i, item := range arr {
			obj, ok := item.(map[string]any)
			if !ok {
				continue
			}
			desc, hasDesc := obj["description"]
			if !hasDesc {
				continue
			}
			if s, ok := desc.(string); ok && s == "" {
				warnings = append(warnings, Warning{
					Rule:    "empty-description",
					Path:    fmt.Sprintf("/%s/%d/description", arrayKey, i),
					Message: "description field is present but empty",
				})
			}
		}
	}
	return warnings
}

// ---------------------------------------------------------------------------
// Rule: empty-people
// ---------------------------------------------------------------------------

func checkEmptyPeople(doc map[string]any) []Warning {
	_, hasEstate := doc["estate"]
	if !hasEstate {
		return nil
	}
	people, ok := doc["people"].([]any)
	if !ok {
		// people key is missing entirely — also a problem
		if _, exists := doc["people"]; exists {
			return []Warning{{
				Rule:    "empty-people",
				Path:    "/people",
				Message: "people array is empty but estate is present",
			}}
		}
		return nil
	}
	if len(people) == 0 {
		return []Warning{{
			Rule:    "empty-people",
			Path:    "/people",
			Message: "people array is empty but estate is present",
		}}
	}
	return nil
}

// ---------------------------------------------------------------------------
// Rule: missing-valuation
// ---------------------------------------------------------------------------

func checkMissingValuation(doc map[string]any) []Warning {
	var warnings []Warning

	// Collect all entityIds present in valuations
	valuatedIDs := make(map[string]bool)
	if valuations, ok := doc["valuations"].([]any); ok {
		for _, item := range valuations {
			obj, ok := item.(map[string]any)
			if !ok {
				continue
			}
			if eid, ok := obj["entityId"].(string); ok && eid != "" {
				valuatedIDs[eid] = true
			}
		}
	}

	// Check assets that have estimatedValue
	assets, ok := doc["assets"].([]any)
	if !ok {
		return nil
	}
	for i, item := range assets {
		obj, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if _, hasEV := obj["estimatedValue"]; !hasEV {
			continue
		}
		id, ok := obj["id"].(string)
		if !ok || id == "" {
			continue
		}
		if !valuatedIDs[id] {
			warnings = append(warnings, Warning{
				Rule:    "missing-valuation",
				Path:    fmt.Sprintf("/assets/%d/estimatedValue", i),
				Message: fmt.Sprintf("asset %q has estimatedValue but no entry in valuations for this id", id),
			})
		}
	}
	return warnings
}

// ---------------------------------------------------------------------------
// Rule: stale-export
// ---------------------------------------------------------------------------

const staleThreshold = 365 * 24 * time.Hour

func checkStaleExport(doc map[string]any) []Warning {
	raw, ok := doc["exportedAt"].(string)
	if !ok || raw == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		// Not a parseable timestamp — skip
		return nil
	}
	if time.Since(t) > staleThreshold {
		return []Warning{{
			Rule:    "stale-export",
			Path:    "/exportedAt",
			Message: fmt.Sprintf("exportedAt %q is over 1 year old", raw),
		}}
	}
	return nil
}
