from openinherit.validate import validate

__all__ = ["validate"]
__version__ = "6.0.0"

try:
    from openinherit.models import *  # noqa: F401,F403
except ImportError:
    pass  # Models optional — validation still works without them
