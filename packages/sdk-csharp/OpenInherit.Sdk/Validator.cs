using System.Reflection;
using System.Text.Json;
using Json.Schema;

namespace OpenInherit.Sdk;

/// <summary>
/// Validates INHERIT documents against bundled JSON schemas (Draft 2020-12).
/// Schemas are embedded as resources so no file-system access is required at runtime.
/// </summary>
public static class Validator
{
    private const string CatalogueSchemaUri = "https://openinherit.org/v3/catalogue.json";

    /// <summary>
    /// Legal disclaimer that accompanies every validation result.
    /// </summary>
    public const string Disclaimer =
        "Validation results are informational. They verify schema " +
        "conformance and data structure, not legal accuracy or " +
        "completeness. Do not rely on validation results as the " +
        "sole basis for legal or financial decisions.";

    private static readonly Lazy<JsonSchema> EstateSchema =
        new(() => LoadEmbeddedSchema("inherit-v3-bundled.json"));

    private static readonly Lazy<JsonSchema> CatalogueSchema =
        new(() => LoadEmbeddedSchema("catalogue-v3-bundled.json"));

    /// <summary>
    /// Validates a JSON document, auto-detecting whether it is an estate or catalogue
    /// by inspecting its <c>$schema</c> property.
    /// </summary>
    public static ValidationResult Validate(string jsonDocument)
    {
        var mode = DetectMode(jsonDocument);
        return DoValidate(jsonDocument, mode);
    }

    /// <summary>
    /// Validates a JSON document as an INHERIT catalogue regardless of its <c>$schema</c> property.
    /// </summary>
    public static ValidationResult ValidateCatalogue(string jsonDocument)
        => DoValidate(jsonDocument, "catalogue");

    /// <summary>
    /// Validates a JSON document as an INHERIT estate regardless of its <c>$schema</c> property.
    /// </summary>
    public static ValidationResult ValidateEstate(string jsonDocument)
        => DoValidate(jsonDocument, "estate");

    /// <summary>
    /// Validates a JSON document at Level 2 (schema + referential integrity).
    /// First runs Level 1 (JSON Schema); if that fails the result has ConformanceLevel 0.
    /// If Level 1 passes, UUID cross-references between entities are checked.
    /// A document that passes both gets ConformanceLevel 2; one that passes Level 1 but has
    /// broken references stays at ConformanceLevel 1 with additional Level 2 errors.
    /// </summary>
    public static ValidationResult ValidateLevel2(string jsonDocument)
    {
        // Run Level 1 first.
        var mode = DetectMode(jsonDocument);
        var l1 = DoValidate(jsonDocument, mode);

        // If Level 1 failed, return immediately — no point checking refs.
        if (!l1.Valid)
            return l1;

        // Level 1 passed. Now check referential integrity.
        JsonDocument parsedDoc;
        try
        {
            parsedDoc = JsonDocument.Parse(jsonDocument);
        }
        catch
        {
            // Should be unreachable (Level 1 caught invalid JSON), but guard anyway.
            return l1;
        }

        using (parsedDoc)
        {
            var refErrors = ReferenceChecker.Check(parsedDoc.RootElement);

            if (refErrors.Count == 0)
            {
                return l1 with { ConformanceLevel = ConformanceLevel.Level2 };
            }

            // Level 2 failed: document is invalid, ConformanceLevel stays at 1.
            var allErrors = new List<ValidationError>(l1.Errors);
            allErrors.AddRange(refErrors);
            return l1 with { Valid = false, Errors = allErrors };
        }
    }

    // -------------------------------------------------------------------------

    private static string DetectMode(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("$schema", out var schemaProp)
                && schemaProp.GetString() == CatalogueSchemaUri)
            {
                return "catalogue";
            }
        }
        catch
        {
            // Unparseable JSON — fall through; the validation step will surface the error.
        }
        return "estate";
    }

    private static ValidationResult DoValidate(string jsonDocument, string mode)
    {
        var schema = mode == "catalogue" ? CatalogueSchema.Value : EstateSchema.Value;

        JsonDocument parsedDoc;
        try
        {
            parsedDoc = JsonDocument.Parse(jsonDocument);
        }
        catch (JsonException ex)
        {
            return new ValidationResult(
                Valid: false,
                SchemaMode: mode,
                ConformanceLevel: ConformanceLevel.Failed,
                Errors: new[] { new ValidationError("/", $"Invalid JSON: {ex.Message}") },
                Disclaimer: Disclaimer
            );
        }

        using (parsedDoc)
        {
            var options = new EvaluationOptions
            {
                OutputFormat = OutputFormat.List
            };

            var result = schema.Evaluate(parsedDoc.RootElement, options);

            var errors = new List<ValidationError>();
            if (!result.IsValid)
            {
                // ToList() mutates result in-place, flattening the hierarchy so that
                // every failed leaf node appears in result.Details.
                result.ToList();

                foreach (var detail in result.Details ?? [])
                {
                    if (detail.IsValid || detail.Errors is null) continue;
                    var path = detail.InstanceLocation.ToString();
                    foreach (var kvp in detail.Errors)
                    {
                        errors.Add(new ValidationError(path, kvp.Value));
                    }
                }

                // Fallback: capture top-level errors if Details yielded nothing.
                if (errors.Count == 0 && result.Errors is not null)
                {
                    var path = result.InstanceLocation.ToString();
                    foreach (var kvp in result.Errors)
                    {
                        errors.Add(new ValidationError(path, kvp.Value));
                    }
                }

                // Last-resort sentinel so Errors is never empty on an invalid result.
                if (errors.Count == 0)
                {
                    errors.Add(new ValidationError("/", "Validation failed (no detailed error messages available)."));
                }
            }

            return new ValidationResult(
                Valid: result.IsValid,
                SchemaMode: mode,
                ConformanceLevel: result.IsValid ? ConformanceLevel.Level1 : ConformanceLevel.Failed,
                Errors: errors,
                Disclaimer: Disclaimer
            );
        }
    }

    private static JsonSchema LoadEmbeddedSchema(string resourceFileName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        // MSBuild replaces hyphens with underscores in embedded resource names.
        var normalized = resourceFileName.Replace("-", "_");
        var resourceName = assembly
            .GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith(resourceFileName, StringComparison.OrdinalIgnoreCase)
                              || n.EndsWith(normalized, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException(
                $"Embedded resource '{resourceFileName}' not found. " +
                $"Available: {string.Join(", ", assembly.GetManifestResourceNames())}");

        using var stream = assembly.GetManifestResourceStream(resourceName)!;
        using var reader = new StreamReader(stream);
        var json = reader.ReadToEnd();

        // Use a fresh local SchemaRegistry so that sub-schema $id URIs from this
        // bundled file do not collide with those from the other bundled file in the
        // global registry when both schemas are loaded in the same process.
        var buildOptions = new BuildOptions
        {
            SchemaRegistry = new SchemaRegistry()
        };
        return JsonSchema.FromText(json, buildOptions);
    }
}
