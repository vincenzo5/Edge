"""TWS sidecar — control plane routes."""

from __future__ import annotations

from tws_sidecar import config
from tws_sidecar.app import app


import asyncio
import threading
from typing import Any

from fastapi import HTTPException

from tws_sidecar.runtime.connections import _reconnect_ib, _status_payload
from tws_sidecar.runtime.supervisor import _set_recovery_phase
from tws_sidecar.runtime.worker import IbWorkerTimeoutError, run_on_ib_thread
from tws_sidecar.runtime.state import *
@app.get("/control/recovery")
def control_recovery_status() -> dict[str, Any]:
    return _status_payload()


def _start_async_reconnect() -> dict[str, Any]:
    global _reconnect_thread

    def runner() -> None:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            _reconnect_ib()
        except Exception as exc:  # noqa: BLE001
            _set_recovery_phase("failed", str(exc))
        finally:
            loop.close()

    with _recovery_lock:
        if _reconnect_thread is not None and _reconnect_thread.is_alive():
            payload = _status_payload()
            payload["accepted"] = True
            payload["inProgress"] = True
            return payload
    thread = threading.Thread(target=runner, name="tws-reconnect", daemon=True)
    _reconnect_thread = thread
    thread.start()
    payload = _status_payload()
    payload["accepted"] = True
    payload["inProgress"] = True
    return payload


def _start_async_reconnect() -> dict[str, Any]:
    global _reconnect_thread

    def runner() -> None:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            _reconnect_ib()
        except Exception as exc:  # noqa: BLE001
            _set_recovery_phase("failed", str(exc))
        finally:
            loop.close()

    with _recovery_lock:
        if _reconnect_thread is not None and _reconnect_thread.is_alive():
            payload = _status_payload()
            payload["accepted"] = True
            payload["inProgress"] = True
            return payload
    thread = threading.Thread(target=runner, name="tws-reconnect", daemon=True)
    _reconnect_thread = thread
    thread.start()
    payload = _status_payload()
    payload["accepted"] = True
    payload["inProgress"] = True
    return payload


@app.post("/control/reconnect")
def control_reconnect() -> dict[str, Any]:
    diagnostics = _worker_diagnostics()
    recovery = diagnostics.get("recovery") or {}
    if recovery.get("phase") == "reconnecting":
        payload = _status_payload()
        payload["accepted"] = True
        payload["inProgress"] = True
        return payload

    # When the IB worker is wedged, never queue reconnect behind the stuck job.
    if diagnostics.get("workerWedged"):
        return _start_async_reconnect()

    def work():
        return _reconnect_ib()

    try:
        result = run_on_ib_thread(
            work,
            config.PRIORITY_HIGH,
            job_name="reconnect",
            wait_sec=config.RECONNECT_IB_JOB_WAIT_SEC,
        )
        result["accepted"] = True
        result["inProgress"] = recovery.get("phase") == "reconnecting"
        return result
    except IbWorkerTimeoutError:
        return _start_async_reconnect()
    except Exception as exc:  # noqa: BLE001
        _set_recovery_phase("failed", str(exc))
        raise HTTPException(status_code=503, detail=str(exc)) from exc
