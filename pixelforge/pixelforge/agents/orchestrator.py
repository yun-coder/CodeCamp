"""Multi-agent orchestrator: VLM planning + error recovery + retries.

A thin coordinator that runs the configured workflows in sequence with
graceful error recovery. The orchestrator is a Protocol-conformant object
that workflows can be plugged into.

Phase 3 ships a minimal implementation: ``Orchestrator.run_chain()``
executes a list of ``(name, callable)`` steps, catching ``PixelforgeError``
and either retrying (with backoff) or aborting the chain.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable

from pixelforge.core.timing import PixelforgeError, WorkflowAborted
from pixelforge.core.storage import ProjectStorage
from pixelforge.providers.registry import ProviderRegistry

logger = logging.getLogger(__name__)


@dataclass
class StepResult:
    name: str
    ok: bool
    result: Any = None
    error: str | None = None
    elapsed_seconds: float = 0.0
    attempts: int = 1


@dataclass
class Orchestrator:
    """Coordinates workflow steps with retry + error recovery."""
    storage: ProjectStorage
    providers: ProviderRegistry
    history: list[StepResult] = field(default_factory=list)

    def run_chain(
        self,
        steps: list[tuple[str, Callable[[], Any]]],
        *,
        max_retries: int = 1,
        backoff_seconds: float = 1.0,
    ) -> list[StepResult]:
        """Execute steps sequentially; retry transient failures up to ``max_retries``.

        A step is "transient" if it raises a non-fatal exception. A step that
        raises ``WorkflowAborted`` stops the chain immediately.
        """
        self.history.clear()
        for name, fn in steps:
            result = self._run_step(name, fn, max_retries=max_retries, backoff_seconds=backoff_seconds)
            self.history.append(result)
            if not result.ok and isinstance(result.result, WorkflowAborted):
                logger.warning("Chain aborted at step %s", name)
                break
        return list(self.history)

    def _run_step(
        self,
        name: str,
        fn: Callable[[], Any],
        *,
        max_retries: int,
        backoff_seconds: float,
    ) -> StepResult:
        attempts = 0
        last_error: str | None = None
        start = time.perf_counter()
        while attempts <= max_retries:
            attempts += 1
            try:
                value = fn()
                elapsed = time.perf_counter() - start
                return StepResult(name=name, ok=True, result=value, elapsed_seconds=elapsed, attempts=attempts)
            except WorkflowAborted as exc:
                elapsed = time.perf_counter() - start
                return StepResult(
                    name=name, ok=False, result=exc,
                    error=str(exc), elapsed_seconds=elapsed, attempts=attempts,
                )
            except PixelforgeError as exc:
                last_error = str(exc)
                logger.warning("Step %s failed (attempt %d): %s", name, attempts, exc)
                if attempts > max_retries:
                    break
                time.sleep(backoff_seconds * attempts)
            except Exception as exc:
                last_error = f"{type(exc).__name__}: {exc}"
                logger.exception("Step %s crashed (attempt %d)", name, attempts)
                if attempts > max_retries:
                    break
                time.sleep(backoff_seconds * attempts)
        elapsed = time.perf_counter() - start
        return StepResult(
            name=name, ok=False, error=last_error or "unknown",
            elapsed_seconds=elapsed, attempts=attempts,
        )

    def status(self) -> dict[str, Any]:
        return {
            "history": [
                {
                    "name": r.name, "ok": r.ok, "error": r.error,
                    "elapsed_seconds": r.elapsed_seconds, "attempts": r.attempts,
                }
                for r in self.history
            ],
        }
