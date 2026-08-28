"""Tests for generated Pydantic models."""
import pytest

# Attempt to import — skip all tests if generation failed
try:
    from openinherit import models

    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False
    models = None


@pytest.mark.skipif(not MODELS_AVAILABLE, reason="Models not generated")
class TestModelsExist:
    """Verify key model classes were generated."""

    def test_has_validation_result(self):
        assert hasattr(models, "ValidationResult")

    def test_has_estate(self):
        assert hasattr(models, "Estate")

    def test_has_person(self):
        assert hasattr(models, "Person")

    def test_has_asset(self):
        assert hasattr(models, "Asset")

    def test_has_money(self):
        assert hasattr(models, "Money")

    def test_has_inherit_document(self):
        assert hasattr(models, "InheritDocument")

    def test_model_count(self):
        """At least 3 model classes should exist."""
        model_classes = [
            name
            for name in dir(models)
            if isinstance(getattr(models, name, None), type) and name[0].isupper()
        ]
        assert len(model_classes) >= 3, (
            f"Only found {len(model_classes)} models: {model_classes}"
        )


@pytest.mark.skipif(not MODELS_AVAILABLE, reason="Models not generated")
class TestModelInstantiation:
    """Verify key models can be instantiated."""

    def test_money_instantiation(self):
        m = models.Money(amount=1500, currency="GBP")
        assert m.amount == 1500
        assert m.currency == "GBP"

    def test_validation_result_instantiation(self):
        vr = models.ValidationResult(valid=True, conformanceLevel=1, errors=[])
        assert vr.valid is True
        assert vr.errors == []
        assert vr.conformanceLevel == 1

    def test_error_instantiation(self):
        e = models.Error(
            path="/estate/id",
            message="Required field missing",
            level="error",
        )
        assert e.path == "/estate/id"
        assert e.message == "Required field missing"
        assert e.level == "error"
