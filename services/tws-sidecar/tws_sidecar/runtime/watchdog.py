"""TWS sidecar — wedge watchdog (process self-exit for Docker restart)."""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from typing import Any, Callable

from tws_sidecar import config
from tws_sidecar.runtime.supervisor import _worker_diagnostics

logger = logging.getLogger(__name__)

_watchdog_thread: threading.Thread | None = None
_watchdog_lock = threading.Lock()


def _default_exit(code: int) -> None:
    os._exit(code)


def _watchdog_loop(
    *,
    diagnostics_fn: Callable[[], dict[str, Any]] | None = None,
    sleep_fn: Callable[[float], None] | None = None,
    monotonic_fn: Callable[[], float] | None = None,
    exit_fn: Callable[[int], None] | None = None,
    poll_ms: int | None = None,
    exit_after_ms: int | None = None,
    enabled: bool | None = None,
) -> None:
    diag_fn = diagnostics_fn or _worker_diagnostics
    sleep = sleep_fn or time.sleep
    monotonic = monotonic_fn or time.monotonic
    exit_proc = exit_fn or _default_exit
    poll_sec = (poll_ms if poll_ms is not None else config.TWS_WEDGE_POLL_MS) / 1000.0
    threshold_ms = exit_after_ms if exit_after_ms is not None else config.TWS_WEDGE_EXIT_AFTER_MS
    is_enabled = config.TWS_WEDGE_EXIT_ENABLED if enabled is None else enabled

    if not is_enabled:
        return

    wedge_streak_ms = 0.0
    last_poll = monotonic()

    while True:
        sleep(poll_sec)
        now = monotonic()
        elapsed_ms = (now - last_poll) * 1000.0
        last_poll = now

        diagnostics = diag_fn()
        if diagnostics.get("workerWedged"):
            wedge_streak_ms += elapsed_ms
            if wedge_streak_ms >= threshold_ms:
                payload = {
                    "event": "wedge_watchdog_exit",
                    "workerWedged": True,
                    "activeJob": diagnostics.get("activeJob"),
                    "activeJobAgeMs": diagnostics.get("activeJobAgeMs"),
                    "wedgeStreakMs": int(wedge_streak_ms),
                    "exitAfterMs": threshold_ms,
                }
                logger.error(json.dumps(payload))
                exit_proc(1)
        else:
            wedge_streak_ms = 0.0


def start_wedge_watchdog(
    *,
    diagnostics_fn: Callable[[], dict[str, Any]] | None = None,
    sleep_fn: Callable[[float], None] | None = None,
    monotonic_fn: Callable[[], float] | None = None,
    exit_fn: Callable[[int], None] | None = None,
    poll_ms: int | None = None,
    exit_after_ms: int | None = None,
    enabled: bool | None = None,
) -> threading.Thread | None:
    """Start daemon wedge watchdog thread (idempotent). Returns thread or None if disabled."""
    is_enabled = config.TWS_WEDGE_EXIT_ENABLED if enabled is None else enabled
    if not is_enabled:
        return None

    global _watchdog_thread

    def runner() -> None:
        _watchdog_loop(
            diagnostics_fn=diagnostics_fn,
            sleep_fn=sleep_fn,
            monotonic_fn=monotonic_fn,
            exit_fn=exit_fn,
            poll_ms=poll_ms,
            exit_after_ms=exit_after_ms,
            enabled=is_enabled,
        )

    with _watchdog_lock:
        if _watchdog_thread is not None and _watchdog_thread.is_alive():
            return _watchdog_thread
        thread = threading.Thread(target=runner, name="tws-wedge-watchdog", daemon=True)
        _watchdog_thread = thread
        logger.info(
            "wedge_watchdog_started poll_ms=%s exit_after_ms=%s worker_wedge_ms=%s",
            poll_ms if poll_ms is not None else config.TWS_WEDGE_POLL_MS,
            exit_after_ms if exit_after_ms is not None else config.TWS_WEDGE_EXIT_AFTER_MS,
            config.TWS_WORKER_WEDGE_MS,
        )
        thread.start()
        return thread
