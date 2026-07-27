"""TWS sidecar — IB worker thread and job dispatch."""

from __future__ import annotations

import asyncio
import queue
import threading
import time
import uuid

from tws_sidecar.runtime.state import *


class IbWorkerTimeoutError(TimeoutError):
    """Raised when an IB worker job exceeds its wait budget."""


def _pump_ib_loop(loop: asyncio.AbstractEventLoop, idle_sec: float = 0.05) -> None:
    """Let ib_insync process socket callbacks so Gateway sessions stay alive between jobs."""
    try:
        loop.run_until_complete(asyncio.sleep(idle_sec))
    except Exception:  # noqa: BLE001
        pass


def _ib_worker() -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    while True:
        try:
            _priority, _seq, job_id, job_name, fn = _ib_jobs.get(timeout=0.05)
        except queue.Empty:
            _pump_ib_loop(loop)
            continue
        with _abandoned_job_ids_lock:
            if job_id in _abandoned_job_ids:
                _abandoned_job_ids.discard(job_id)
                _ib_jobs.task_done()
                continue
        with _worker_lock:
            global _active_job_name, _active_job_started_at, _last_worker_error
            _active_job_name = job_name
            _active_job_started_at = time.time()
            _last_worker_error = None
        try:
            result = fn()
            with _ib_results_lock:
                _ib_results[job_id] = (True, result)
        except Exception as exc:  # noqa: BLE001
            with _ib_results_lock:
                _ib_results[job_id] = (False, exc)
            with _worker_lock:
                _last_worker_error = str(exc)
        finally:
            with _worker_lock:
                _active_job_name = None
                _active_job_started_at = None
                _last_completed_job = job_name
                _last_completed_at = time.time()
            _ib_jobs.task_done()
            _pump_ib_loop(loop, 0)


def run_on_ib_thread(
    fn,
    priority: int = PRIORITY_HIGH,
    *,
    job_name: str = "ib_job",
    wait_sec: float = DEFAULT_IB_JOB_WAIT_SEC,
):
    global _ib_job_seq, _queue_depth
    job_id = str(uuid.uuid4())
    with _ib_job_seq_lock:
        _ib_job_seq += 1
        seq = _ib_job_seq
    with _worker_lock:
        _queue_depth += 1
    _ib_jobs.put((priority, seq, job_id, job_name, fn))
    deadline = time.time() + wait_sec
    try:
        while time.time() < deadline:
            with _ib_results_lock:
                if job_id in _ib_results:
                    ok, value = _ib_results.pop(job_id)
                    if ok:
                        return value
                    raise value
            time.sleep(0.01)
        with _abandoned_job_ids_lock:
            _abandoned_job_ids.add(job_id)
        raise IbWorkerTimeoutError(f"IB worker timed out waiting for {job_name}")
    finally:
        with _worker_lock:
            _queue_depth = max(0, _queue_depth - 1)


threading.Thread(target=_ib_worker, name="tws-ib-worker", daemon=True).start()
