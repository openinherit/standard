package org.openinherit.sdk;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class Validator {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final JsonSchema ESTATE_SCHEMA;
    private static final JsonSchema CATALOGUE_SCHEMA;

    // Catalogue $schema URI used for auto-detection
    private static final String CATALOGUE_SCHEMA_URI = "https://openinherit.org/v3/catalogue.json";

    static {
        try {
            JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);

            try (InputStream estateStream = Validator.class.getResourceAsStream("/inherit-v3-bundled.json")) {
                if (estateStream == null) {
                    throw new IllegalStateException("inherit-v3-bundled.json not found on classpath");
                }
                JsonNode estateNode = MAPPER.readTree(estateStream);
                ESTATE_SCHEMA = factory.getSchema(estateNode);
            }

            try (InputStream catalogueStream = Validator.class.getResourceAsStream("/catalogue-v3-bundled.json")) {
                if (catalogueStream == null) {
                    throw new IllegalStateException("catalogue-v3-bundled.json not found on classpath");
                }
                JsonNode catalogueNode = MAPPER.readTree(catalogueStream);
                CATALOGUE_SCHEMA = factory.getSchema(catalogueNode);
            }
        } catch (Exception e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    /**
     * Validates an INHERIT document, auto-detecting whether it is an estate or catalogue
     * document by inspecting the {@code $schema} field. Defaults to estate mode if the
     * field is absent or does not match the catalogue URI.
     *
     * <p>This performs Level 1 (JSON Schema) validation only. The returned
     * {@link ValidationResult#conformanceLevel()} will be 0 if schema validation
     * fails, or 1 if it passes.
     *
     * @param jsonDocument the INHERIT document as a JSON string
     * @return a {@link ValidationResult} describing whether the document is valid
     */
    public static ValidationResult validate(String jsonDocument) {
        try {
            JsonNode doc = MAPPER.readTree(jsonDocument);
            String schemaUri = doc.path("$schema").asText("");
            if (CATALOGUE_SCHEMA_URI.equals(schemaUri)) {
                return runValidation(doc, CATALOGUE_SCHEMA, "catalogue");
            } else {
                return runValidation(doc, ESTATE_SCHEMA, "estate");
            }
        } catch (Exception e) {
            List<ValidationResult.ValidationError> errors = List.of(
                new ValidationResult.ValidationError("$", "Failed to parse JSON: " + e.getMessage())
            );
            return new ValidationResult(false, "estate", errors, ValidationResult.DISCLAIMER, 0);
        }
    }

    /**
     * Validates an INHERIT document against the catalogue schema, regardless of the
     * {@code $schema} field present in the document.
     *
     * @param jsonDocument the INHERIT catalogue document as a JSON string
     * @return a {@link ValidationResult} describing whether the document is valid
     */
    public static ValidationResult validateCatalogue(String jsonDocument) {
        try {
            JsonNode doc = MAPPER.readTree(jsonDocument);
            return runValidation(doc, CATALOGUE_SCHEMA, "catalogue");
        } catch (Exception e) {
            List<ValidationResult.ValidationError> errors = List.of(
                new ValidationResult.ValidationError("$", "Failed to parse JSON: " + e.getMessage())
            );
            return new ValidationResult(false, "catalogue", errors, ValidationResult.DISCLAIMER, 0);
        }
    }

    /**
     * Validates an INHERIT document against the estate schema, regardless of the
     * {@code $schema} field present in the document.
     *
     * @param jsonDocument the INHERIT estate document as a JSON string
     * @return a {@link ValidationResult} describing whether the document is valid
     */
    public static ValidationResult validateEstate(String jsonDocument) {
        try {
            JsonNode doc = MAPPER.readTree(jsonDocument);
            return runValidation(doc, ESTATE_SCHEMA, "estate");
        } catch (Exception e) {
            List<ValidationResult.ValidationError> errors = List.of(
                new ValidationResult.ValidationError("$", "Failed to parse JSON: " + e.getMessage())
            );
            return new ValidationResult(false, "estate", errors, ValidationResult.DISCLAIMER, 0);
        }
    }

    /**
     * Performs Level 2 validation on an INHERIT estate document.
     *
     * <p>Level 2 first runs Level 1 (JSON Schema) validation. If that passes,
     * it additionally checks that all UUID cross-references between entities
     * resolve to an actual entity in the document. For example, if
     * {@code estate.testatorPersonId} is "abc-123", there must be a person
     * with {@code id: "abc-123"} in the {@code people} array.
     *
     * <p>The returned {@link ValidationResult#conformanceLevel()} will be:
     * <ul>
     *   <li>0 — Level 1 (schema) validation failed</li>
     *   <li>1 — Level 1 passed but Level 2 (referential integrity) failed</li>
     *   <li>2 — Both levels passed</li>
     * </ul>
     *
     * @param jsonDocument the INHERIT estate document as a JSON string
     * @return a {@link ValidationResult} describing the outcome
     */
    public static ValidationResult validateLevel2(String jsonDocument) {
        JsonNode doc;
        try {
            doc = MAPPER.readTree(jsonDocument);
        } catch (Exception e) {
            List<ValidationResult.ValidationError> errors = List.of(
                new ValidationResult.ValidationError("$", "Failed to parse JSON: " + e.getMessage())
            );
            return new ValidationResult(false, "estate", errors, ValidationResult.DISCLAIMER, 0);
        }

        // Determine schema mode (only estate supports Level 2)
        String schemaUri = doc.path("$schema").asText("");
        String mode = CATALOGUE_SCHEMA_URI.equals(schemaUri) ? "catalogue" : "estate";
        JsonSchema schema = CATALOGUE_SCHEMA_URI.equals(schemaUri) ? CATALOGUE_SCHEMA : ESTATE_SCHEMA;

        // Level 1: schema validation
        ValidationResult level1 = runValidation(doc, schema, mode);
        if (!level1.valid()) {
            // conformanceLevel is already 0 from runValidation when there are errors
            return level1;
        }

        // Level 2: referential integrity
        List<ValidationResult.ValidationError> refErrors = ReferenceChecker.check(doc);
        if (!refErrors.isEmpty()) {
            return new ValidationResult(false, mode, refErrors, ValidationResult.DISCLAIMER, 1);
        }

        return new ValidationResult(true, mode, List.of(), ValidationResult.DISCLAIMER, 2);
    }

    private static ValidationResult runValidation(JsonNode doc, JsonSchema schema, String mode) {
        Set<ValidationMessage> messages = schema.validate(doc);
        List<ValidationResult.ValidationError> errors = new ArrayList<>();
        for (ValidationMessage msg : messages) {
            String path = msg.getInstanceLocation().toString();
            String message = msg.getMessage();
            errors.add(new ValidationResult.ValidationError(path, message));
        }
        boolean valid = errors.isEmpty();
        int conformanceLevel = valid ? 1 : 0;
        return new ValidationResult(valid, mode, errors, ValidationResult.DISCLAIMER, conformanceLevel);
    }
}
