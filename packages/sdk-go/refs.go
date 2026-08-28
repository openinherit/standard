package openinherit

import (
	"encoding/json"
	"fmt"
	"strings"
)

// externalIDFields are fields whose values are external identifiers (not entity IDs in this
// document). They must never be resolved against the document's entity collections.
var externalIDFields = map[string]bool{
	"wikidataId":              true,
	"brandWikidataId":         true,
	"listingId":               true,
	"templateId":              true,
	"platformListingId":       true,
	"membershipId":            true,
	"referenceId":             true,
	"taxpayerIdentifier":      true,
	"supersedesNominationId":  true,
}

// entityCollections maps top-level document keys to the logical entity type they contain.
// An entity type is used to resolve typed references (e.g. PersonId → "people").
var entityCollections = map[string]string{
	"people":           "people",
	"organisations":    "organisations",
	"properties":       "properties",
	"assets":           "assets",
	"trusts":           "trusts",
	"bequests":         "bequests",
	"spaces":           "spaces",
	"valuations":       "valuations",
	"assetCollections": "assetCollections",
	"liabilities":      "liabilities",
	"lifetimeTransfers": "lifetimeTransfers",
	"nonprobateTransfers": "nonprobateTransfers",
	"executors":        "executors",
	"guardians":        "guardians",
	"kinships":         "kinships",
	"relationships":    "relationships",
	"wishes":           "wishes",
	"documents":        "documents",
	"proxyAuthorisations": "proxyAuthorisations",
	"insurancePolicies": "insurancePolicies",
}

// typedRefSuffixToCollection maps the suffix of a reference field name to which entity
// collection it must resolve against. The suffix matching is case-sensitive and applied
// to the exact field name (not substring of path).
//
// Rules:
//   - "*PersonId" / "*PersonIds" → people
//   - "*OrganisationId" / "*OrganisationIds" → organisations
//   - "propertyId" / "propertyIds" → properties
//   - "assetId" / "assetIds" → assets
//   - "trustId" → trusts
//   - "bequestId" → bequests
//   - "petId" → pets (currently no pets collection — will produce an error if referenced)
//   - "valuationId" → valuations
//   - "spaceId" → spaces
//   - "assetCollectionId" → assetCollections
//
// The "beneficiaryId" field is a polymorphic reference that may point to a person or
// organisation; it is resolved against the global ID set.
var typedRefSuffixes = []struct {
	suffix     string
	collection string
	isArray    bool
}{
	{"PersonIds", "people", true},
	{"PersonId", "people", false},
	{"OrganisationIds", "organisations", true},
	{"OrganisationId", "organisations", false},
}

// singletonTypedRefs maps exact field names to their target collection.
var singletonTypedRefs = map[string]string{
	"propertyId":        "properties",
	"propertyIds":       "properties",
	"assetId":           "assets",
	"assetIds":          "assets",
	"trustId":           "trusts",
	"bequestId":         "bequests",
	"petId":             "pets",
	"valuationId":       "valuations",
	"spaceId":           "spaces",
	"assetCollectionId": "assetCollections",
	"collectionId":      "assetCollections",
}

// genericRefFields are field names whose referenced entity may be in any collection.
// They are resolved against the full global ID set.
var genericRefFields = map[string]bool{
	"entityId":      true,
	"beneficiaryId": true, // polymorphic: person or organisation
}

// ValidateLevel2 validates an INHERIT document at Level 2 (schema + referential integrity).
//
// Level 2 validation first runs Level 1 (JSON Schema). If Level 1 fails the document is
// returned immediately with ConformanceLevel 0. If Level 1 passes, UUID cross-references
// between entities are checked. A document that passes both checks is returned with
// ConformanceLevel 2. A document that passes Level 1 but has broken references is returned
// with ConformanceLevel 1 and additional Level 2 errors.
func ValidateLevel2(document []byte) (*ValidationResult, error) {
	// Run Level 1 first.
	l1result, err := Validate(document)
	if err != nil {
		return nil, err
	}

	// If Level 1 failed, return immediately — no point checking refs.
	if !l1result.Valid {
		// ConformanceLevel is already ConformanceFailed (0).
		return l1result, nil
	}

	// Level 1 passed. Now check referential integrity.
	var doc map[string]any
	if err := json.Unmarshal(document, &doc); err != nil {
		// Should be unreachable (Level 1 would have caught invalid JSON), but guard anyway.
		return l1result, nil
	}

	refErrors := checkRefs(doc, "")

	if len(refErrors) == 0 {
		l1result.ConformanceLevel = ConformanceLevel2
		return l1result, nil
	}

	// Level 2 failed: document is invalid, conformanceLevel stays at 1.
	l1result.Valid = false
	l1result.Errors = append(l1result.Errors, refErrors...)
	// ConformanceLevel remains ConformanceLevel1 to indicate schema passed but refs failed.
	return l1result, nil
}

// checkRefs walks a decoded INHERIT document and returns Level 2 errors for any
// UUID cross-reference that does not resolve to a known entity.
//
// pathPrefix is used internally for recursion to build human-readable paths.
func checkRefs(doc map[string]any, pathPrefix string) []ValidationError {
	// Build entity ID sets from top-level collections.
	ids := buildIDSets(doc)

	var errs []ValidationError

	// Walk every top-level collection and the estate object for reference fields.
	// We also walk nested objects within those.
	for collectionKey, items := range doc {
		switch v := items.(type) {
		case []any:
			for i, item := range v {
				if obj, ok := item.(map[string]any); ok {
					path := fmt.Sprintf("/%s/%d", collectionKey, i)
					errs = append(errs, walkObject(obj, path, ids)...)
				}
			}
		case map[string]any:
			// e.g. estate object
			path := fmt.Sprintf("/%s", collectionKey)
			errs = append(errs, walkObject(v, path, ids)...)
		}
	}

	return errs
}

// idSets holds per-collection and global ID sets built from the document.
type idSets struct {
	global        map[string]bool
	byCollection  map[string]map[string]bool
}

// buildIDSets scans the top-level document and builds ID lookup sets.
func buildIDSets(doc map[string]any) idSets {
	sets := idSets{
		global:       make(map[string]bool),
		byCollection: make(map[string]map[string]bool),
	}

	for collectionKey := range entityCollections {
		sets.byCollection[collectionKey] = make(map[string]bool)
	}

	// Also add the estate object's own id.
	if estate, ok := doc["estate"].(map[string]any); ok {
		if id, ok := estate["id"].(string); ok && id != "" {
			sets.global[id] = true
		}
	}

	for collectionKey := range entityCollections {
		items, ok := doc[collectionKey].([]any)
		if !ok {
			continue
		}
		for _, item := range items {
			obj, ok := item.(map[string]any)
			if !ok {
				continue
			}
			id, ok := obj["id"].(string)
			if !ok || id == "" {
				continue
			}
			sets.global[id] = true
			sets.byCollection[collectionKey][id] = true
		}
	}

	return sets
}

// walkObject recursively walks an object, checking any reference fields.
func walkObject(obj map[string]any, path string, ids idSets) []ValidationError {
	var errs []ValidationError

	for fieldName, value := range obj {
		fieldPath := path + "/" + fieldName

		// Skip external identifiers.
		if externalIDFields[fieldName] {
			continue
		}

		// Skip the entity's own "id" field.
		if fieldName == "id" {
			continue
		}

		switch v := value.(type) {
		case string:
			if refErr := checkStringRef(fieldName, v, fieldPath, ids); refErr != nil {
				errs = append(errs, *refErr)
			}
		case []any:
			// Could be an array reference field (e.g. beneficiaryPersonIds) or a nested array.
			if isArrayRefField(fieldName) {
				for j, elem := range v {
					if s, ok := elem.(string); ok {
						elemPath := fmt.Sprintf("%s/%d", fieldPath, j)
						if refErr := checkStringRef(fieldName, s, elemPath, ids); refErr != nil {
							errs = append(errs, *refErr)
						}
					}
				}
			} else {
				// Recurse into array of objects.
				for j, elem := range v {
					if nested, ok := elem.(map[string]any); ok {
						nestedPath := fmt.Sprintf("%s/%d", fieldPath, j)
						errs = append(errs, walkObject(nested, nestedPath, ids)...)
					}
				}
			}
		case map[string]any:
			errs = append(errs, walkObject(v, fieldPath, ids)...)
		}
	}

	return errs
}

// isArrayRefField returns true if the field name is a known array reference field.
func isArrayRefField(fieldName string) bool {
	if externalIDFields[fieldName] {
		return false
	}
	if _, ok := singletonTypedRefs[fieldName]; ok {
		// "assetIds", "propertyIds" are in singletonTypedRefs with collection mappings
		// but are treated as arrays here.
		return strings.HasSuffix(fieldName, "Ids") || fieldName == "assetIds" || fieldName == "propertyIds"
	}
	for _, tr := range typedRefSuffixes {
		if tr.isArray && strings.HasSuffix(fieldName, tr.suffix) {
			return true
		}
	}
	return false
}

// checkStringRef checks a single string value that is a reference field.
// Returns nil if the field is not a reference field or if the reference resolves.
func checkStringRef(fieldName, value, path string, ids idSets) *ValidationError {
	if value == "" {
		return nil
	}

	// Generic / polymorphic refs — check global set.
	if genericRefFields[fieldName] {
		if !ids.global[value] {
			return &ValidationError{
				Path:    path,
				Message: fmt.Sprintf("reference %q (%s) does not resolve to any known entity", value, fieldName),
				Level:   2,
			}
		}
		return nil
	}

	// Singleton typed refs (exact field name match).
	if collection, ok := singletonTypedRefs[fieldName]; ok {
		// assetIds and propertyIds are arrays — their string elements are handled by the array loop.
		// But if we arrive here it means the field is a scalar, which is valid per schema.
		return checkAgainstCollection(fieldName, value, path, collection, ids)
	}

	// Suffix-based typed refs.
	for _, tr := range typedRefSuffixes {
		if strings.HasSuffix(fieldName, tr.suffix) {
			return checkAgainstCollection(fieldName, value, path, tr.collection, ids)
		}
	}

	return nil
}

// checkAgainstCollection checks whether value exists in the named collection's ID set.
// If the collection does not exist in the document at all, the reference is always broken.
func checkAgainstCollection(fieldName, value, path, collection string, ids idSets) *ValidationError {
	collectionIDs, known := ids.byCollection[collection]
	if !known {
		// Collection doesn't exist in this document at all.
		return &ValidationError{
			Path:    path,
			Message: fmt.Sprintf("reference %q (%s) cannot resolve: collection %q not present in document", value, fieldName, collection),
			Level:   2,
		}
	}
	if !collectionIDs[value] {
		return &ValidationError{
			Path:    path,
			Message: fmt.Sprintf("reference %q (%s) not found in %q", value, fieldName, collection),
			Level:   2,
		}
	}
	return nil
}
