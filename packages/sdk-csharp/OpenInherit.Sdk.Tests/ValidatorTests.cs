using OpenInherit.Sdk;

namespace OpenInherit.Sdk.Tests;

public class ValidatorTests
{
    // From bin/Debug/net9.0/ we need to reach examples/fixtures.
    // bin/Debug/net9.0 is 3 dirs inside OpenInherit.Sdk.Tests/, which is 3 dirs inside
    // packages/sdk-csharp/ → packages/ → standard/ → then examples/fixtures.
    // Total: 6 levels up from AppContext.BaseDirectory.
    private static readonly string FixturesDir = Path.GetFullPath(
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "..", "examples", "fixtures")
    );

    [Fact]
    public void ValidEnglishEstate_PassesValidation()
    {
        var json = File.ReadAllText(Path.Combine(FixturesDir, "english-family-estate.json"));
        var result = Validator.Validate(json);
        Assert.True(result.Valid, $"Expected valid but got errors: {string.Join("; ", result.Errors.Select(e => $"{e.Path}: {e.Message}"))}");
        Assert.Equal("estate", result.SchemaMode);
        Assert.Empty(result.Errors);
        Assert.Contains("informational", result.Disclaimer);
    }

    [Fact]
    public void ValidMinimalEstate_PassesValidation()
    {
        var json = File.ReadAllText(Path.Combine(FixturesDir, "minimal-estate.json"));
        var result = Validator.Validate(json);
        Assert.True(result.Valid, $"Expected valid but got errors: {string.Join("; ", result.Errors.Select(e => $"{e.Path}: {e.Message}"))}");
    }

    [Fact]
    public void ValidCatalogue_PassesValidation()
    {
        var json = File.ReadAllText(Path.Combine(FixturesDir, "catalogue-only.json"));
        var result = Validator.Validate(json);
        Assert.True(result.Valid, $"Expected valid but got errors: {string.Join("; ", result.Errors.Select(e => $"{e.Path}: {e.Message}"))}");
        Assert.Equal("catalogue", result.SchemaMode);
    }

    [Fact]
    public void InvalidDocument_MissingRequired_FailsValidation()
    {
        var result = Validator.Validate("{\"not\": \"an inherit document\"}");
        Assert.False(result.Valid);
        Assert.NotEmpty(result.Errors);
    }

    [Fact]
    public void InvalidCatalogue_MissingAssets_FailsValidation()
    {
        var result = Validator.Validate("{\"$schema\": \"https://openinherit.org/v3/catalogue.json\"}");
        Assert.False(result.Valid);
    }

    [Fact]
    public void ExplicitCatalogueMode_EmptyAssets_IsValid()
    {
        var result = Validator.ValidateCatalogue("{\"assets\": []}");
        Assert.True(result.Valid, $"Expected valid but got errors: {string.Join("; ", result.Errors.Select(e => $"{e.Path}: {e.Message}"))}");
        Assert.Equal("catalogue", result.SchemaMode);
    }

    [Fact]
    public void DisclaimerAlwaysPresent_EvenOnInvalidDocument()
    {
        var result = Validator.Validate("{}");
        Assert.NotNull(result.Disclaimer);
        Assert.StartsWith("Validation results", result.Disclaimer);
    }

    [Fact]
    public void Level2ValidEstate_PassesReferentialIntegrity()
    {
        var json = File.ReadAllText(Path.Combine(FixturesDir, "english-family-estate.json"));
        var result = Validator.ValidateLevel2(json);
        Assert.True(result.Valid, $"Expected valid but got errors: {string.Join("; ", result.Errors.Select(e => $"{e.Path}: {e.Message}"))}");
        Assert.Equal(2, result.ConformanceLevel);
    }

    [Fact]
    public void Level2BrokenReferences_FailsReferentialIntegrity()
    {
        var json = File.ReadAllText(Path.Combine(FixturesDir, "broken-references.json"));
        var result = Validator.ValidateLevel2(json);
        Assert.True(result.ConformanceLevel < 2);
        Assert.Contains(result.Errors, e => e.Level == 2);
    }

    [Fact]
    public void Level2OnlyAfterLevel1_SchemaFailSkipsRefs()
    {
        var result = Validator.ValidateLevel2("{\"not\":\"valid\"}");
        Assert.Equal(0, result.ConformanceLevel);
        Assert.DoesNotContain(result.Errors, e => e.Level == 2);
    }

    [Fact]
    public void Level1Default_ConformanceLevel1()
    {
        var json = File.ReadAllText(Path.Combine(FixturesDir, "english-family-estate.json"));
        var result = Validator.Validate(json);
        Assert.Equal(1, result.ConformanceLevel);
    }
}
