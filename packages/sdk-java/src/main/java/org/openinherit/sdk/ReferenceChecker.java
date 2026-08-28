package org.openinherit.sdk;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Level 2 referential integrity checker for INHERIT estate documents.
 *
 * <p>Walks the parsed document and verifies that every UUID cross-reference
 * field resolves to an actual entity defined in the corresponding entity array.
 * For example, if a bequest has {@code beneficiaryId: "abc-123"}, there must
 * be a person or organisation with {@code id: "abc-123"} in the document.
 */
class ReferenceChecker {

    // Entity arrays to index (must match Python/Go SDK implementations)
    private static final String[] ENTITY_ARRAYS = {
        "people", "organisations", "properties", "assets", "trusts", "bequests",
        "executors", "guardians", "wishes", "documents", "nonprobateTransfers",
        "proxyAuthorisations", "assetCollections", "valuations", "lifetimeTransfers",
        "kinships", "relationships", "liabilities", "spaces", "pets",
        "insurancePolicies", "notifications", "subscriptions", "acknowledgements", "events"
    };

    // Fields that reference external systems — skip these
    private static final Set<String> EXTERNAL_ID_FIELDS = Set.of(
        "wikidataId", "brandWikidataId", "listingId", "templateId",
        "platformListingId", "membershipId", "referenceId",
        "taxpayerIdentifier", "supersedesNominationId"
    );

    private ReferenceChecker() {}

    /**
     * Check all UUID cross-references in the document.
     *
     * @param doc the parsed INHERIT document
     * @return list of Level 2 {@link ValidationResult.ValidationError} objects, empty if all resolve
     */
    static List<ValidationResult.ValidationError> check(JsonNode doc) {
        // Build ID indexes
        Set<String> allIds = new HashSet<>();
        Map<String, Set<String>> perType = new HashMap<>();

        for (String arrayName : ENTITY_ARRAYS) {
            Set<String> ids = new HashSet<>();
            JsonNode array = doc.path(arrayName);
            if (array.isArray()) {
                for (JsonNode item : array) {
                    JsonNode idNode = item.path("id");
                    if (idNode.isTextual()) {
                        String id = idNode.asText();
                        ids.add(id);
                        allIds.add(id);
                    }
                }
            }
            perType.put(arrayName, ids);
        }

        List<ValidationResult.ValidationError> errors = new ArrayList<>();
        walk(doc, "", allIds, perType, errors);
        return errors;
    }

    private static void walk(
            JsonNode node,
            String path,
            Set<String> allIds,
            Map<String, Set<String>> perType,
            List<ValidationResult.ValidationError> errors) {

        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String key = entry.getKey();
                JsonNode value = entry.getValue();
                String childPath = path + "/" + key;

                if (EXTERNAL_ID_FIELDS.contains(key)) {
                    continue;
                }

                if (value.isTextual() && (key.endsWith("Id") || key.equals("testatorPersonId"))) {
                    checkId(key, value.asText(), childPath, allIds, perType, errors);
                } else if (value.isArray() && (key.endsWith("Ids") || key.endsWith("PersonIds") || key.endsWith("OrganisationIds") || key.endsWith("AssetIds"))) {
                    checkArrayIds(key, value, childPath, perType, errors);
                } else {
                    walk(value, childPath, allIds, perType, errors);
                }
            }
        } else if (node.isArray()) {
            int i = 0;
            for (JsonNode item : node) {
                walk(item, path + "/" + i, allIds, perType, errors);
                i++;
            }
        }
    }

    private static void checkId(
            String fieldName,
            String value,
            String path,
            Set<String> allIds,
            Map<String, Set<String>> perType,
            List<ValidationResult.ValidationError> errors) {

        if (fieldName.equals("testatorPersonId") || fieldName.endsWith("PersonId")) {
            if (!perType.getOrDefault("people", Set.of()).contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any person.",
                    2
                ));
            }
            return;
        }

        if (fieldName.endsWith("OrganisationId")) {
            if (!perType.getOrDefault("organisations", Set.of()).contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any organisation.",
                    2
                ));
            }
            return;
        }

        if (fieldName.equals("propertyId") || fieldName.endsWith("PropertyId")) {
            if (!perType.getOrDefault("properties", Set.of()).contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any property.",
                    2
                ));
            }
            return;
        }

        if (fieldName.equals("assetId")) {
            if (!perType.getOrDefault("assets", Set.of()).contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any asset.",
                    2
                ));
            }
            return;
        }

        if (fieldName.equals("trustId") || fieldName.endsWith("TrustId")) {
            if (!perType.getOrDefault("trusts", Set.of()).contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any trust.",
                    2
                ));
            }
            return;
        }

        if (fieldName.equals("bequestId") || fieldName.endsWith("BequestId")) {
            if (!perType.getOrDefault("bequests", Set.of()).contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any bequest.",
                    2
                ));
            }
            return;
        }

        if (fieldName.equals("petId") || fieldName.endsWith("PetId")) {
            if (!perType.getOrDefault("pets", Set.of()).contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any pet.",
                    2
                ));
            }
            return;
        }

        if (fieldName.equals("valuationId") || fieldName.endsWith("ValuationId")) {
            if (!perType.getOrDefault("valuations", Set.of()).contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any valuation.",
                    2
                ));
            }
            return;
        }

        if (fieldName.equals("assetCollectionId") || fieldName.endsWith("AssetCollectionId")) {
            if (!perType.getOrDefault("assetCollections", Set.of()).contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any asset collection.",
                    2
                ));
            }
            return;
        }

        if (fieldName.equals("spaceId") || fieldName.endsWith("SpaceId")) {
            if (!perType.getOrDefault("spaces", Set.of()).contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any space.",
                    2
                ));
            }
            return;
        }

        if (fieldName.equals("entityId")) {
            if (!allIds.contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any entity.",
                    2
                ));
            }
            return;
        }

        if (fieldName.equals("beneficiaryId")) {
            Set<String> peopleIds = perType.getOrDefault("people", Set.of());
            Set<String> orgIds = perType.getOrDefault("organisations", Set.of());
            if (!peopleIds.contains(value) && !orgIds.contains(value)) {
                errors.add(new ValidationResult.ValidationError(
                    path,
                    "Reference '" + value + "' in '" + fieldName + "' does not resolve to any person or organisation.",
                    2
                ));
            }
        }
    }

    private static void checkArrayIds(
            String fieldName,
            JsonNode values,
            String path,
            Map<String, Set<String>> perType,
            List<ValidationResult.ValidationError> errors) {

        if (fieldName.endsWith("PersonIds")) {
            Set<String> peopleIds = perType.getOrDefault("people", Set.of());
            int i = 0;
            for (JsonNode v : values) {
                if (v.isTextual() && !peopleIds.contains(v.asText())) {
                    errors.add(new ValidationResult.ValidationError(
                        path + "/" + i,
                        "Reference '" + v.asText() + "' in '" + fieldName + "[" + i + "]' does not resolve to any person.",
                        2
                    ));
                }
                i++;
            }
            return;
        }

        if (fieldName.endsWith("OrganisationIds")) {
            Set<String> orgIds = perType.getOrDefault("organisations", Set.of());
            int i = 0;
            for (JsonNode v : values) {
                if (v.isTextual() && !orgIds.contains(v.asText())) {
                    errors.add(new ValidationResult.ValidationError(
                        path + "/" + i,
                        "Reference '" + v.asText() + "' in '" + fieldName + "[" + i + "]' does not resolve to any organisation.",
                        2
                    ));
                }
                i++;
            }
            return;
        }

        if (fieldName.endsWith("AssetIds") || fieldName.equals("assetIds")) {
            Set<String> assetIds = perType.getOrDefault("assets", Set.of());
            int i = 0;
            for (JsonNode v : values) {
                if (v.isTextual() && !assetIds.contains(v.asText())) {
                    errors.add(new ValidationResult.ValidationError(
                        path + "/" + i,
                        "Reference '" + v.asText() + "' in '" + fieldName + "[" + i + "]' does not resolve to any asset.",
                        2
                    ));
                }
                i++;
            }
        }
    }
}
