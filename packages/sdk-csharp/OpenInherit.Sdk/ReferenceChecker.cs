using System.Text.Json;

namespace OpenInherit.Sdk;

/// <summary>
/// Checks UUID cross-references between entities in an INHERIT document (Level 2 validation).
/// </summary>
internal static class ReferenceChecker
{
    // External identifier fields whose values are NOT entity IDs in this document.
    private static readonly HashSet<string> ExternalIdFields = new(StringComparer.Ordinal)
    {
        "wikidataId",
        "brandWikidataId",
        "listingId",
        "templateId",
        "platformListingId",
        "membershipId",
        "referenceId",
        "taxpayerIdentifier",
        "supersedesNominationId",
    };

    // Top-level collection keys that contain entities with "id" fields.
    private static readonly HashSet<string> EntityCollectionKeys = new(StringComparer.Ordinal)
    {
        "people", "organisations", "properties", "assets", "trusts", "bequests",
        "executors", "guardians", "wishes", "documents", "nonprobateTransfers",
        "proxyAuthorisations", "assetCollections", "valuations", "lifetimeTransfers",
        "kinships", "relationships", "liabilities", "spaces", "pets",
        "insurancePolicies", "notifications", "subscriptions", "acknowledgements", "events",
    };

    // Suffix-based typed reference patterns (longest suffix first to avoid ambiguity).
    private static readonly (string Suffix, string Collection, bool IsArray)[] TypedRefSuffixes =
    {
        ("PersonIds", "people", true),
        ("PersonId",  "people", false),
        ("OrganisationIds", "organisations", true),
        ("OrganisationId",  "organisations", false),
    };

    // Exact field name → collection mapping for singleton and array typed refs.
    private static readonly Dictionary<string, string> SingletonTypedRefs = new(StringComparer.Ordinal)
    {
        { "propertyId",        "properties" },
        { "propertyIds",       "properties" },
        { "assetId",           "assets" },
        { "assetIds",          "assets" },
        { "trustId",           "trusts" },
        { "bequestId",         "bequests" },
        { "petId",             "pets" },
        { "valuationId",       "valuations" },
        { "spaceId",           "spaces" },
        { "assetCollectionId", "assetCollections" },
        { "collectionId",      "assetCollections" },
    };

    // Fields that may reference any entity (polymorphic / generic).
    private static readonly HashSet<string> GenericRefFields = new(StringComparer.Ordinal)
    {
        "entityId",
        "beneficiaryId",
    };

    // -------------------------------------------------------------------------

    /// <summary>
    /// Inspects <paramref name="root"/> for broken UUID cross-references.
    /// Returns a list of <see cref="ValidationError"/> instances with Level = 2.
    /// </summary>
    public static IReadOnlyList<ValidationError> Check(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
            return Array.Empty<ValidationError>();

        var ids = BuildIdSets(root);
        var errors = new List<ValidationError>();

        foreach (var topProp in root.EnumerateObject())
        {
            var key = topProp.Name;
            var val = topProp.Value;

            if (val.ValueKind == JsonValueKind.Array)
            {
                int i = 0;
                foreach (var item in val.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.Object)
                        WalkObject(item, $"/{key}/{i}", ids, errors);
                    i++;
                }
            }
            else if (val.ValueKind == JsonValueKind.Object)
            {
                // e.g. the "estate" object itself
                WalkObject(val, $"/{key}", ids, errors);
            }
        }

        return errors;
    }

    // -------------------------------------------------------------------------

    private class IdSets
    {
        public HashSet<string> Global { get; } = new(StringComparer.Ordinal);
        public Dictionary<string, HashSet<string>> ByCollection { get; } = new(StringComparer.Ordinal);
    }

    private static IdSets BuildIdSets(JsonElement root)
    {
        var sets = new IdSets();

        foreach (var key in EntityCollectionKeys)
            sets.ByCollection[key] = new HashSet<string>(StringComparer.Ordinal);

        // Include the estate's own id in the global set.
        if (root.TryGetProperty("estate", out var estateEl) &&
            estateEl.ValueKind == JsonValueKind.Object &&
            estateEl.TryGetProperty("id", out var estateId) &&
            estateId.ValueKind == JsonValueKind.String)
        {
            var idVal = estateId.GetString();
            if (!string.IsNullOrEmpty(idVal))
                sets.Global.Add(idVal);
        }

        foreach (var key in EntityCollectionKeys)
        {
            if (!root.TryGetProperty(key, out var col) || col.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var item in col.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) continue;
                if (!item.TryGetProperty("id", out var idEl) || idEl.ValueKind != JsonValueKind.String) continue;
                var id = idEl.GetString();
                if (string.IsNullOrEmpty(id)) continue;

                sets.Global.Add(id);
                sets.ByCollection[key].Add(id);
            }
        }

        return sets;
    }

    private static void WalkObject(JsonElement obj, string path, IdSets ids, List<ValidationError> errors)
    {
        foreach (var prop in obj.EnumerateObject())
        {
            var fieldName = prop.Name;
            var fieldPath = path + "/" + fieldName;
            var val = prop.Value;

            // Skip external identifiers and the entity's own id field.
            if (fieldName == "id" || ExternalIdFields.Contains(fieldName))
                continue;

            switch (val.ValueKind)
            {
                case JsonValueKind.String:
                {
                    var err = CheckStringRef(fieldName, val.GetString()!, fieldPath, ids);
                    if (err is not null) errors.Add(err);
                    break;
                }

                case JsonValueKind.Array:
                {
                    if (IsArrayRefField(fieldName))
                    {
                        int j = 0;
                        foreach (var elem in val.EnumerateArray())
                        {
                            if (elem.ValueKind == JsonValueKind.String)
                            {
                                var err = CheckStringRef(fieldName, elem.GetString()!, $"{fieldPath}/{j}", ids);
                                if (err is not null) errors.Add(err);
                            }
                            j++;
                        }
                    }
                    else
                    {
                        int j = 0;
                        foreach (var elem in val.EnumerateArray())
                        {
                            if (elem.ValueKind == JsonValueKind.Object)
                                WalkObject(elem, $"{fieldPath}/{j}", ids, errors);
                            j++;
                        }
                    }
                    break;
                }

                case JsonValueKind.Object:
                    WalkObject(val, fieldPath, ids, errors);
                    break;
            }
        }
    }

    private static bool IsArrayRefField(string fieldName)
    {
        if (ExternalIdFields.Contains(fieldName)) return false;

        // Exact matches that happen to be arrays ("assetIds", "propertyIds")
        if (SingletonTypedRefs.TryGetValue(fieldName, out _) &&
            fieldName.EndsWith("Ids", StringComparison.Ordinal))
            return true;

        foreach (var (suffix, _, isArray) in TypedRefSuffixes)
        {
            if (isArray && fieldName.EndsWith(suffix, StringComparison.Ordinal))
                return true;
        }

        return false;
    }

    private static ValidationError? CheckStringRef(string fieldName, string value, string path, IdSets ids)
    {
        if (string.IsNullOrEmpty(value)) return null;

        // Generic / polymorphic refs — check global set.
        if (GenericRefFields.Contains(fieldName))
        {
            if (!ids.Global.Contains(value))
                return new ValidationError(path,
                    $"reference \"{value}\" ({fieldName}) does not resolve to any known entity",
                    Level: 2);
            return null;
        }

        // Exact field name → collection.
        if (SingletonTypedRefs.TryGetValue(fieldName, out var exactCollection))
            return CheckAgainstCollection(fieldName, value, path, exactCollection, ids);

        // Suffix-based typed refs.
        foreach (var (suffix, collection, _) in TypedRefSuffixes)
        {
            if (fieldName.EndsWith(suffix, StringComparison.Ordinal))
                return CheckAgainstCollection(fieldName, value, path, collection, ids);
        }

        return null;
    }

    private static ValidationError? CheckAgainstCollection(
        string fieldName, string value, string path, string collection, IdSets ids)
    {
        if (!ids.ByCollection.TryGetValue(collection, out var collectionIds))
        {
            return new ValidationError(path,
                $"reference \"{value}\" ({fieldName}) cannot resolve: collection \"{collection}\" not present in document",
                Level: 2);
        }

        if (!collectionIds.Contains(value))
        {
            return new ValidationError(path,
                $"reference \"{value}\" ({fieldName}) not found in \"{collection}\"",
                Level: 2);
        }

        return null;
    }
}
