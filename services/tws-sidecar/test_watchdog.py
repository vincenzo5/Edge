"""Unit tests for wedge watchdog self-exit."""

from __future__ import annotations

import sys
import threading
import unittest
from pathlib import Path
from typing import Any
from unittest import mock

SIDECAR_DIR = Path(__file__).resolve().parent
if str(SIDECAR_DIR) not in sys.path:
    sys.path.insert(0, str(SIDECAR_DIR))

from tws_sidecar.runtime import watchdog  # noqa: E402


class WedgeWatchdogLoopTests(unittest.TestCase):
    def _run_loop(
        self,
        diagnostics: list[dict[str, Any]],
        *,
        poll_ms: int = 1000,
        exit_after_ms: int = 3000,
        enabled: bool = True,
    ) -> list[int]:
        exit_calls: list[int] = []
        clock = [0.0]
        idx = {"i": 0}

        def monotonic_fn() -> float:
            return clock[0]

        def sleep_fn(seconds: float) -> None:
            clock[0] += seconds

        def diagnostics_fn() -> dict[str, Any]:
            i = min(idx["i"], len(diagnostics) - 1)
            idx["i"] += 1
            return diagnostics[i]

        def exit_fn(code: int) -> None:
            exit_calls.append(code)
            raise SystemExit(code)

        with self.assertRaises(SystemExit):
            watchdog._watchdog_loop(
                diagnostics_fn=diagnostics_fn,
                sleep_fn=sleep_fn,
                monotonic_fn=monotonic_fn,
                exit_fn=exit_fn,
                poll_ms=poll_ms,
                exit_after_ms=exit_after_ms,
                enabled=enabled,
            )
        return exit_calls

    def test_continuous_wedge_exits_once(self) -> None:
        wedged = {"workerWedged": True, "activeJob": "stream_quotes", "activeJobAgeMs": 45000}
        exit_calls = self._run_loop([wedged] * 10, poll_ms=1000, exit_after_ms=3000)
        self.assertEqual(exit_calls, [1])

    def test_wedge_clears_before_threshold_no_exit(self) -> None:
        exit_calls: list[int] = []
        clock = [0.0]
        idx = {"i": 0}
        sequence = [
            {"workerWedged": True, "activeJob": "reconnect", "activeJobAgeMs": 35000},
            {"workerWedged": True, "activeJob": "reconnect", "activeJobAgeMs": 36000},
            {"workerWedged": False, "activeJob": None, "activeJobAgeMs": None},
            {"workerWedged": True, "activeJob": "candles", "activeJobAgeMs": 35000},
        ]

        def monotonic_fn() -> float:
            return clock[0]

        def sleep_fn(seconds: float) -> None:
            clock[0] += seconds
            if idx["i"] >= len(sequence):
                raise SystemExit(0)

        def diagnostics_fn() -> dict[str, Any]:
            value = sequence[min(idx["i"], len(sequence) - 1)]
            idx["i"] += 1
            return value

        def exit_fn(code: int) -> None:
            exit_calls.append(code)

        with self.assertRaises(SystemExit):
            watchdog._watchdog_loop(
                diagnostics_fn=diagnostics_fn,
                sleep_fn=sleep_fn,
                monotonic_fn=monotonic_fn,
                exit_fn=exit_fn,
                poll_ms=1000,
                exit_after_ms=6000,
                enabled=True,
            )
        self.assertEqual(exit_calls, [])

    def test_no_active_job_no_exit(self) -> None:
        exit_calls: list[int] = []
        clock = [0.0]
        polls = {"n": 0}

        def monotonic_fn() -> float:
            return clock[0]

        def sleep_fn(seconds: float) -> None:
            clock[0] += seconds
            polls["n"] += 1
            if polls["n"] >= 5:
                raise SystemExit(0)

        def exit_fn(code: int) -> None:
            exit_calls.append(code)

        with self.assertRaises(SystemExit):
            watchdog._watchdog_loop(
                diagnostics_fn=lambda: {
                    "workerWedged": False,
                    "activeJob": None,
                    "activeJobAgeMs": None,
                },
                sleep_fn=sleep_fn,
                monotonic_fn=monotonic_fn,
                exit_fn=exit_fn,
                poll_ms=500,
                exit_after_ms=2000,
                enabled=True,
            )
        self.assertEqual(exit_calls, [])

    def test_disabled_watchdog_returns_without_exit(self) -> None:
        exit_calls: list[int] = []

        watchdog._watchdog_loop(
            diagnostics_fn=lambda: {"workerWedged": True},
            sleep_fn=lambda _s: None,
            exit_fn=lambda code: exit_calls.append(code),
            enabled=False,
        )
        self.assertEqual(exit_calls, [])

    def test_start_wedge_watchdog_respects_disabled(self) -> None:
        with mock.patch.object(watchdog.config, "TWS_WEDGE_EXIT_ENABLED", False):
            thread = watchdog.start_wedge_watchdog()
        self.assertIsNone(thread)

    def test_start_wedge_watchdog_idempotent(self) -> None:
        watchdog._watchdog_thread = None
        exit_calls: list[int] = []
        clock = [0.0]

        def monotonic_fn() -> float:
            return clock[0]

        def sleep_fn(seconds: float) -> None:
            clock[0] += seconds

        def exit_fn(code: int) -> None:
            exit_calls.append(code)

        first = watchdog.start_wedge_watchdog(
            diagnostics_fn=lambda: {"workerWedged": False},
            sleep_fn=sleep_fn,
            monotonic_fn=monotonic_fn,
            exit_fn=exit_fn,
            poll_ms=100,
            exit_after_ms=60_000,
            enabled=True,
        )
        second = watchdog.start_wedge_watchdog(
            diagnostics_fn=lambda: {"workerWedged": False},
            sleep_fn=sleep_fn,
            monotonic_fn=monotonic_fn,
            exit_fn=exit_fn,
            poll_ms=100,
            exit_after_ms=60_000,
            enabled=True,
        )
        self.assertIsNotNone(first)
        self.assertIs(first, second)
        watchdog._watchdog_thread = None


if __name__ == "__main__":
    unittest.main()
