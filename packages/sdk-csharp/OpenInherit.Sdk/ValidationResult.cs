namespace OpenInherit.Sdk;

/// <summary>
/// Conformance level constants for INHERIT validation.
/// </summary>
public static class ConformanceLevel
{
    /// <summary>Level 1 (JSON Schema) validation failed.</summary>
    public const int Failed = 0;
    /// <summary>The document passed JSON Schema validation.</summary>
    public const int Level1 = 1;
    /// <summary>The document passed both schema and referential integrity checks.</summary>
    public const int Level2 = 2;
}

/// <summary>
/// The outcome of validating an INHERIT document against the bundled schema.
/// </summary>
public record ValidationResult(
    bool Valid,
    string SchemaMode,
    int ConformanceLevel,
    IReadOnlyList<ValidationError> Errors,
    string Disclaimer
);

/// <summary>
/// A single validation error, with a JSON Pointer path and a human-readable message.
/// </summary>
public record ValidationError(string Path, string Message, int Level = 1);
