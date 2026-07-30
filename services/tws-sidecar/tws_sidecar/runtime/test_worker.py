"""Tests for IB worker enqueue helpers."""

from __future__ import annotations

import importlib
import sys
import threading
import time
import unittest
from pathlib import Path

SIDECAR_DIR = Path(__file__).resolve().parents[1]
if str(SIDECAR_DIR) not in sys.path:
    sys.path.insert(0, str(SIDECAR_DIR))

worker = importlib.import_module("tws_sidecar.runtime.worker")


class EnqueueOnIbThreadTests(unittest.TestCase):
    def test_enqueue_runs_without_blocking_caller(self) -> None:
        done = threading.Event()

        def work() -> str:
            done.set()
            return "ok"

        started = time.time()
        worker.enqueue_on_ib_thread(work, job_name="enqueue_test")
        elapsed = time.time() - started
        self.assertLess(elapsed, 0.5)
        self.assertTrue(done.wait(timeout=2.0))


if __name__ == "__main__":
    unittest.main()
