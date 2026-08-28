package openinherit

const Disclaimer = "Validation results are informational. They verify schema " +
	"conformance and data structure, not legal accuracy or " +
	"completeness. Do not rely on validation results as the " +
	"sole basis for legal or financial decisions."

// Conformance level constants.
const (
	// ConformanceFailed means Level 1 (schema) validation failed.
	ConformanceFailed = 0
	// ConformanceLevel1 means the document passed JSON Schema validation.
	ConformanceLevel1 = 1
	// ConformanceLevel2 means the document passed both schema and referential integrity checks.
	ConformanceLevel2 = 2
)

// ValidationResult is the outcome of validating an INHERIT document.
type ValidationResult struct {
	Valid             bool              `json:"valid"`
	SchemaMode        string            `json:"schemaMode"`
	ConformanceLevel  int               `json:"conformanceLevel"`
	Errors            []ValidationError `json:"errors"`
	Disclaimer        string            `json:"disclaimer"`
}

// ValidationError describes a single schema or referential integrity violation.
type ValidationError struct {
	Path    string `json:"path"`
	Message string `json:"message"`
	Level   int    `json:"level"`
}
