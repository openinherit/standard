package openinherit

import (
	"bytes"
	"encoding/json"
	"strings"
	"sync"

	"github.com/openinherit/sdk-go/schemas"
	"github.com/santhosh-tekuri/jsonschema/v6"
)

const (
	schemaURIEstate    = "https://openinherit.org/v3/schema.json"
	schemaURICatalogue = "https://openinherit.org/v3/catalogue.json"
)

// compiled schema cache — compiled once, reused across calls.
var (
	once           sync.Once
	estateSchema   *jsonschema.Schema
	catalogueSchema *jsonschema.Schema
	initErr        error
)

func initSchemas() error {
	once.Do(func() {
		estateDoc, err := jsonschema.UnmarshalJSON(bytes.NewReader(schemas.EstateBundled))
		if err != nil {
			initErr = err
			return
		}
		catDoc, err := jsonschema.UnmarshalJSON(bytes.NewReader(schemas.CatalogueBundled))
		if err != nil {
			initErr = err
			return
		}

		c := jsonschema.NewCompiler()
		if err := c.AddResource(schemaURIEstate, estateDoc); err != nil {
			initErr = err
			return
		}
		if err := c.AddResource(schemaURICatalogue, catDoc); err != nil {
			initErr = err
			return
		}

		estateSchema, err = c.Compile(schemaURIEstate)
		if err != nil {
			initErr = err
			return
		}
		catalogueSchema, err = c.Compile(schemaURICatalogue)
		if err != nil {
			initErr = err
			return
		}
	})
	return initErr
}

// Validate validates an INHERIT document, auto-detecting estate or catalogue mode.
// Detection is based on the presence of the "estate" or "assets" top-level key.
// If neither is present, estate mode is tried first, then catalogue.
func Validate(document []byte) (*ValidationResult, error) {
	mode := detectMode(document)
	switch mode {
	case "catalogue":
		return ValidateCatalogue(document)
	default:
		return ValidateEstate(document)
	}
}

// ValidateCatalogue validates a document in catalogue mode.
func ValidateCatalogue(document []byte) (*ValidationResult, error) {
	if err := initSchemas(); err != nil {
		return nil, err
	}
	inst, err := jsonschema.UnmarshalJSON(bytes.NewReader(document))
	if err != nil {
		return nil, err
	}
	return runValidation(catalogueSchema, inst, "catalogue"), nil
}

// ValidateEstate validates a document in estate mode.
func ValidateEstate(document []byte) (*ValidationResult, error) {
	if err := initSchemas(); err != nil {
		return nil, err
	}
	inst, err := jsonschema.UnmarshalJSON(bytes.NewReader(document))
	if err != nil {
		return nil, err
	}
	return runValidation(estateSchema, inst, "estate"), nil
}

// detectMode inspects the document's $schema field to pick a schema mode.
func detectMode(document []byte) string {
	var top map[string]json.RawMessage
	if err := json.Unmarshal(document, &top); err != nil {
		return "estate"
	}
	if raw, ok := top["$schema"]; ok {
		var uri string
		if json.Unmarshal(raw, &uri) == nil && uri == schemaURICatalogue {
			return "catalogue"
		}
	}
	return "estate"
}

// runValidation validates inst against sch and returns a ValidationResult.
func runValidation(sch *jsonschema.Schema, inst any, mode string) *ValidationResult {
	err := sch.Validate(inst)
	if err == nil {
		return &ValidationResult{
			Valid:            true,
			SchemaMode:       mode,
			ConformanceLevel: ConformanceLevel1,
			Errors:           []ValidationError{},
			Disclaimer:       Disclaimer,
		}
	}

	verr, ok := err.(*jsonschema.ValidationError)
	if !ok {
		return &ValidationResult{
			Valid:            false,
			SchemaMode:       mode,
			ConformanceLevel: ConformanceFailed,
			Errors: []ValidationError{
				{Path: "/", Message: err.Error(), Level: 1},
			},
			Disclaimer: Disclaimer,
		}
	}

	var errs []ValidationError
	collectErrors(verr, &errs)

	return &ValidationResult{
		Valid:            false,
		SchemaMode:       mode,
		ConformanceLevel: ConformanceFailed,
		Errors:           errs,
		Disclaimer:       Disclaimer,
	}
}

// collectErrors flattens a ValidationError tree into a slice of ValidationError values.
func collectErrors(verr *jsonschema.ValidationError, out *[]ValidationError) {
	if len(verr.Causes) == 0 {
		path := "/" + strings.Join(verr.InstanceLocation, "/")
		// verr.Error() uses the built-in default printer; safe with no printer arg.
		*out = append(*out, ValidationError{
			Path:    path,
			Message: verr.Error(),
			Level:   1,
		})
		return
	}
	for _, cause := range verr.Causes {
		collectErrors(cause, out)
	}
}
