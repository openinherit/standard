package cmd

import (
	"fmt"
	"strings"
)

// externalIDFields are field names whose values are external identifiers
// and must not be resolved against the document's entity collections.
var externalIDFields = map[string]bool{
	"wikidataId":             true,
	"brandWikidataId":        true,
	"listingId":              true,
	"templateId":             true,
	"platformListingId":      true,
	"membershipId":           true,
	"referenceId":            true,
	"taxpayerIdentifier":     true,
	"supersedesNominationId": true,
}

// entityCollections maps top-level document keys to the logical entity type they contain.
var entityCollections = map[string]string{
	"people":              "people",
	"organisations":       "organisations",
	"properties":          "properties",
	"assets":              "assets",
	"trusts":              "trusts",
	"bequests":            "bequests",
	"spaces":              "spaces",
	"valuations":          "valuations",
	"assetCollections":    "assetCollections",
	"liabilities":         "liabilities",
	"lifetimeTransfers":   "lifetimeTransfers",
	"nonprobateTransfers": "nonprobateTransfers",
	"executors":           "executors",
	"guardians":           "guardians",
	"kinships":            "kinships",
	"relationships":       "relationships",
	"wishes":              "wishes",
	"documents":           "documents",
	"proxyAuthorisations": "proxyAuthorisations",
	"insurancePolicies":   "insurancePolicies",
}

// typedRefSuffixes maps field name suffixes to their target collection.
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

// genericRefFields are polymorphic reference field names resolved against the global ID set.
var genericRefFields = map[string]bool{
	"entityId":      true,
	"beneficiaryId": true,
}

// refIDSets holds per-collection and global ID sets built from the document.
type refIDSets struct {
	global       map[string]bool
	byCollection map[string]map[string]bool
}

// buildRefIDSets scans the top-level document and builds ID lookup sets.
func buildRefIDSets(doc map[string]any) refIDSets {
	sets := refIDSets{
		global:       make(map[string]bool),
		byCollection: make(map[string]map[string]bool),
	}
	for collectionKey := range entityCollections {
		sets.byCollection[collectionKey] = make(map[string]bool)
	}
	// Add the estate object's own id.
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

// checkDocumentRefs walks a decoded INHERIT document and returns Level 2 errors
// for any UUID cross-reference that does not resolve to a known entity.
func checkDocumentRefs(doc map[string]any) []validationError {
	ids := buildRefIDSets(doc)
	var errs []validationError

	for collectionKey, items := range doc {
		switch v := items.(type) {
		case []any:
			for i, item := range v {
				if obj, ok := item.(map[string]any); ok {
					path := fmt.Sprintf("/%s/%d", collectionKey, i)
					errs = append(errs, walkRefObject(obj, path, ids)...)
				}
			}
		case map[string]any:
			path := fmt.Sprintf("/%s", collectionKey)
			errs = append(errs, walkRefObject(v, path, ids)...)
		}
	}
	return errs
}

// walkRefObject recursively walks an object checking reference fields.
func walkRefObject(obj map[string]any, path string, ids refIDSets) []validationError {
	var errs []validationError
	for fieldName, value := range obj {
		fieldPath := path + "/" + fieldName
		if externalIDFields[fieldName] || fieldName == "id" {
			continue
		}
		switch v := value.(type) {
		case string:
			if refErr := checkRefString(fieldName, v, fieldPath, ids); refErr != nil {
				errs = append(errs, *refErr)
			}
		case []any:
			if isRefArrayField(fieldName) {
				for j, elem := range v {
					if s, ok := elem.(string); ok {
						elemPath := fmt.Sprintf("%s/%d", fieldPath, j)
						if refErr := checkRefString(fieldName, s, elemPath, ids); refErr != nil {
							errs = append(errs, *refErr)
						}
					}
				}
			} else {
				for j, elem := range v {
					if nested, ok := elem.(map[string]any); ok {
						nestedPath := fmt.Sprintf("%s/%d", fieldPath, j)
						errs = append(errs, walkRefObject(nested, nestedPath, ids)...)
					}
				}
			}
		case map[string]any:
			errs = append(errs, walkRefObject(v, fieldPath, ids)...)
		}
	}
	return errs
}

// isRefArrayField returns true if the field is a known array-of-IDs reference field.
func isRefArrayField(fieldName string) bool {
	if externalIDFields[fieldName] {
		return false
	}
	if strings.HasSuffix(fieldName, "Ids") {
		return true
	}
	for _, tr := range typedRefSuffixes {
		if tr.isArray && strings.HasSuffix(fieldName, tr.suffix) {
			return true
		}
	}
	return false
}

// checkRefString resolves a single reference string value.
func checkRefString(fieldName, value, path string, ids refIDSets) *validationError {
	if value == "" {
		return nil
	}
	if genericRefFields[fieldName] {
		if !ids.global[value] {
			return &validationError{
				Path:    path,
				Message: fmt.Sprintf("reference %q (%s) does not resolve to any known entity", value, fieldName),
				Level:   2,
			}
		}
		return nil
	}
	if collection, ok := singletonTypedRefs[fieldName]; ok {
		return checkRefAgainstCollection(fieldName, value, path, collection, ids)
	}
	for _, tr := range typedRefSuffixes {
		if strings.HasSuffix(fieldName, tr.suffix) {
			return checkRefAgainstCollection(fieldName, value, path, tr.collection, ids)
		}
	}
	return nil
}

// checkRefAgainstCollection checks whether value exists in the named collection.
func checkRefAgainstCollection(fieldName, value, path, collection string, ids refIDSets) *validationError {
	collectionIDs, known := ids.byCollection[collection]
	if !known {
		return &validationError{
			Path:    path,
			Message: fmt.Sprintf("reference %q (%s) cannot resolve: collection %q not present in document", value, fieldName, collection),
			Level:   2,
		}
	}
	if !collectionIDs[value] {
		return &validationError{
			Path:    path,
			Message: fmt.Sprintf("reference %q (%s) not found in %q", value, fieldName, collection),
			Level:   2,
		}
	}
	return nil
}
