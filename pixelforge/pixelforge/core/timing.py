"""Timing, error, and progress utilities."""
from __future__ import annotations

import logging
import time
from functools import wraps
from typing import Any, Callable, TypeVar

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


class PixelforgeError(RuntimeError):
    """Base class for pixelforge errors."""


class ProviderUnavailable(PixelforgeError):
    """Raised when a Provider is required but not configured."""


class WorkflowAborted(PixelforgeError):
    """Raised when a workflow step fails and recovery is impossible."""


def run_with_timing(name: str | None = None) -> Callable[[F], F]:
    """Decorator: log elapsed time and surface unhandled exceptions.

    Replaces the small ``SAMAgent`` wrapper that lived in sam-agent-tool —
    every Provider / workflow step can opt into it.
    """
    def deco(fn: F) -> F:
        label = name or f"{fn.__module__}.{fn.__qualname__}"

        @wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            start = time.perf_counter()
            logger.info("▶ %s", label)
            try:
                result = fn(*args, **kwargs)
            except Exception as exc:
                elapsed = round(time.perf_counter() - start, 3)
                logger.error("✗ %s failed in %ss: %s", label, elapsed, exc)
                raise
            elapsed = round(time.perf_counter() - start, 3)
            logger.info("✓ %s in %ss", label, elapsed)
            return result

        return wrapper  # type: ignore[return-value]

    return deco
