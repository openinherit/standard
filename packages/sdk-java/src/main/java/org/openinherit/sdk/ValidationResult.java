package org.openinherit.sdk;

import java.util.List;

public record ValidationResult(
    boolean valid,
    String schemaMode,
    List<ValidationError> errors,
    String disclaimer,
    int conformanceLevel
) {
    /**
     * Represents a single validation error.
     *
     * @param path  JSON path to the failing element
     * @param message human-readable description of the failure
     * @param level  1 = schema error, 2 = referential integrity error
     */
    public record ValidationError(String path, String message, int level) {
        /** Convenience constructor for Level 1 (schema) errors. */
        public ValidationError(String path, String message) {
            this(path, message, 1);
        }
    }

    public static final String DISCLAIMER =
        "Validation results are informational. They verify schema " +
        "conformance and data structure, not legal accuracy or " +
        "completeness. Do not rely on validation results as the " +
        "sole basis for legal or financial decisions.";
}
