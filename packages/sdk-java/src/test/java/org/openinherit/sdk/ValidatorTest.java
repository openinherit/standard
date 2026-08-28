package org.openinherit.sdk;

import org.junit.jupiter.api.Test;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class ValidatorTest {

    private static final Path FIXTURES = Path.of("..", "..", "examples", "fixtures");

    @Test
    void validEnglishEstate() throws IOException {
        String json = Files.readString(FIXTURES.resolve("english-family-estate.json"));
        ValidationResult result = Validator.validate(json);
        assertTrue(result.valid(), "expected valid");
        assertEquals("estate", result.schemaMode());
        assertTrue(result.errors().isEmpty());
        assertTrue(result.disclaimer().contains("informational"));
    }

    @Test
    void validMinimalEstate() throws IOException {
        String json = Files.readString(FIXTURES.resolve("minimal-estate.json"));
        ValidationResult result = Validator.validate(json);
        assertTrue(result.valid());
    }

    @Test
    void validCatalogue() throws IOException {
        String json = Files.readString(FIXTURES.resolve("catalogue-only.json"));
        ValidationResult result = Validator.validate(json);
        assertTrue(result.valid(), "expected valid, errors: " + result.errors());
        assertEquals("catalogue", result.schemaMode());
    }

    @Test
    void invalidMissingRequired() {
        String json = "{\"not\": \"an inherit document\"}";
        ValidationResult result = Validator.validate(json);
        assertFalse(result.valid());
        assertFalse(result.errors().isEmpty());
    }

    @Test
    void invalidCatalogueMissingAssets() {
        String json = "{\"$schema\": \"https://openinherit.org/v3/catalogue.json\"}";
        ValidationResult result = Validator.validate(json);
        assertFalse(result.valid());
    }

    @Test
    void explicitCatalogueMode() {
        String json = "{\"assets\": []}";
        ValidationResult result = Validator.validateCatalogue(json);
        assertTrue(result.valid());
        assertEquals("catalogue", result.schemaMode());
    }

    @Test
    void disclaimerAlwaysPresent() {
        ValidationResult result = Validator.validate("{}");
        assertNotNull(result.disclaimer());
        assertTrue(result.disclaimer().startsWith("Validation results"));
    }

    // --- Level 2 (referential integrity) tests ---

    @Test
    void level2ValidEstate() throws IOException {
        String json = Files.readString(FIXTURES.resolve("english-family-estate.json"));
        ValidationResult result = Validator.validateLevel2(json);
        assertTrue(result.valid(), "expected valid, errors: " + result.errors());
        assertEquals(2, result.conformanceLevel());
    }

    @Test
    void level2BrokenReferences() throws IOException {
        String json = Files.readString(FIXTURES.resolve("broken-references.json"));
        ValidationResult result = Validator.validateLevel2(json);
        assertTrue(result.conformanceLevel() < 2, "expected conformanceLevel < 2 for broken references");
        assertTrue(result.errors().stream().anyMatch(e -> e.level() == 2),
            "expected at least one Level 2 error");
    }

    @Test
    void level2OnlyAfterLevel1() {
        ValidationResult result = Validator.validateLevel2("{\"not\":\"valid\"}");
        assertEquals(0, result.conformanceLevel());
        assertTrue(result.errors().stream().noneMatch(e -> e.level() == 2),
            "Level 2 errors should not be present when Level 1 fails");
    }

    @Test
    void level1DefaultConformanceLevel() throws IOException {
        String json = Files.readString(FIXTURES.resolve("english-family-estate.json"));
        ValidationResult result = Validator.validate(json);
        assertEquals(1, result.conformanceLevel());
    }
}
