"""TWS sidecar — connection supervisor and auto-reconnect."""

from __future__ import annotations


import asyncio
import threading
import time
from typing import Any

from ib_insync import IB

from tws_sidecar import config
from tws_sidecar.util import now_ms
from tws_sidecar.runtime.resolve import runtime_attr, runtime_callable
import tws_sidecar.runtime.state as state_mod
from tws_sidecar.runtime.state import *
from tws_sidecar.runtime.worker import run_on_ib_thread

def _set_recovery_phase(phase: str, message: str | None = None) -> None:
    global _recovery_phase, _recovery_started_at, _recovery_updated_at, _recovery_message, _reconnect_paused
    now = now_ms()
    with _recovery_lock:
        if phase == "reconnecting" and _recovery_phase == "idle":
            _recovery_started_at = now
        _recovery_phase = phase
        _recovery_updated_at = now
        if message is not None:
            _recovery_message = message
        _reconnect_paused = phase == "reconnecting"


def _worker_diagnostics() -> dict[str, Any]:
    with _worker_lock:
        active_name = _active_job_name
        active_started = _active_job_started_at
        last_completed = _last_completed_job
        last_completed_at = _last_completed_at
        last_error = _last_worker_error
        depth = _queue_depth
    active_age_ms = None
    wedged = False
    if active_name and active_started is not None:
        active_age_ms = int((time.time() - active_started) * 1000)
        wedged = active_age_ms >= WORKER_WEDGE_MS
    with _recovery_lock:
        recovery = {
            "phase": _recovery_phase,
            "startedAt": _recovery_started_at,
            "updatedAt": _recovery_updated_at,
            "message": _recovery_message,
            "pausedStreams": _reconnect_paused,
            "autoReconnectAttempt": runtime_attr("_auto_reconnect_attempt", _auto_reconnect_attempt),
            "autoReconnectMaxAttempts": _auto_reconnect_max_attempts,
        }
    return {
        "queueDepth": depth,
        "activeJob": active_name,
        "activeJobAgeMs": active_age_ms,
        "workerWedged": wedged,
        "lastCompletedJob": last_completed,
        "lastCompletedAt": int(last_completed_at * 1000) if last_completed_at else None,
        "lastWorkerError": last_error,
        "recovery": recovery,
    }


def _read_gateway_connected() -> bool:
    ib = _ib
    if ib is None:
        return False
    try:
        return bool(ib.isConnected())
    except Exception:  # noqa: BLE001
        return False


def _touch_connection_observation(connection_id: str, state: str, connected: bool) -> None:
    global _connection_observed_at_ms, _connection_states
    _connection_observed_at_ms[connection_id] = now_ms()
    _connection_states[connection_id] = "connected" if connected else state


def _set_connection_state(state: str) -> None:
    global _connection_state
    with _supervisor_lock:
        _connection_state = state
        connected = state == "connected"
        _touch_connection_observation(config.PRIMARY_CONNECTION_ID, state, connected)


def _set_connection_state_locked(state: str) -> None:
    global _connection_state
    _connection_state = state
    _touch_connection_observation(
        config.PRIMARY_CONNECTION_ID,
        state,
        state == "connected",
    )


def _active_trading_mutation() -> bool:
    with _worker_lock:
        active_name = _active_job_name
    if not active_name:
        return False
    lowered = active_name.lower()
    return any(token in lowered for token in _TRADING_MUTATION_JOB_TOKENS)


def _sleep(seconds: float) -> None:
    import sys

    main_mod = sys.modules.get("main")
    if main_mod is not None:
        sleep_fn = getattr(getattr(main_mod, "time", None), "sleep", None)
        if sleep_fn is not None:
            sleep_fn(seconds)
            return
    time.sleep(seconds)


def _auto_reconnect_backoff_sec(attempt: int) -> float:
    delay = _auto_reconnect_backoff_base_sec * (2 ** max(attempt - 1, 0))
    return min(delay, _auto_reconnect_backoff_max_sec)


def _reset_auto_reconnect_attempts() -> None:
    with state_mod._auto_reconnect_lock:
        state_mod._auto_reconnect_attempt = 0


def _auto_reconnect_supervisor() -> None:
    while True:
        with state_mod._auto_reconnect_lock:
            if state_mod._auto_reconnect_attempt >= state_mod._auto_reconnect_max_attempts:
                _set_recovery_phase(
                    "failed",
                    f"Auto-reconnect stopped after {state_mod._auto_reconnect_max_attempts} attempts",
                )
                return
        while runtime_callable("_active_trading_mutation", _active_trading_mutation)():
            _sleep(1.0)
        with state_mod._auto_reconnect_lock:
            state_mod._auto_reconnect_attempt += 1
            attempt = state_mod._auto_reconnect_attempt
        delay = _auto_reconnect_backoff_sec(attempt)
        _sleep(delay)
        if runtime_callable("_active_trading_mutation", _active_trading_mutation)():
            continue
        try:
            from tws_sidecar.runtime.connections import _reconnect_ib as default_reconnect

            reconnect_fn = runtime_callable("_reconnect_ib", default_reconnect)
            payload = run_on_ib_thread(
                reconnect_fn,
                PRIORITY_HIGH,
                job_name="auto_reconnect",
                wait_sec=RECONNECT_IB_JOB_WAIT_SEC,
            )
            if payload.get("gatewayConnected"):
                _reset_auto_reconnect_attempts()
                return
        except Exception as exc:  # noqa: BLE001
            _set_recovery_phase("failed", str(exc))
        with state_mod._auto_reconnect_lock:
            if state_mod._auto_reconnect_attempt >= state_mod._auto_reconnect_max_attempts:
                _set_recovery_phase(
                    "failed",
                    f"Auto-reconnect stopped after {state_mod._auto_reconnect_max_attempts} attempts",
                )
                return


def _maybe_schedule_auto_reconnect() -> None:
    if _read_gateway_connected():
        _reset_auto_reconnect_attempts()
        return
    with state_mod._auto_reconnect_lock:
        if state_mod._auto_reconnect_attempt >= state_mod._auto_reconnect_max_attempts:
            return
        if state_mod._auto_reconnect_thread is not None and state_mod._auto_reconnect_thread.is_alive():
            return
        if state_mod._reconnect_thread is not None and state_mod._reconnect_thread.is_alive():
            return
        with state_mod._recovery_lock:
            if state_mod._recovery_phase == "reconnecting":
                return
    thread = threading.Thread(
        target=_auto_reconnect_supervisor,
        name="tws-auto-reconnect",
        daemon=True,
    )
    with state_mod._auto_reconnect_lock:
        state_mod._auto_reconnect_thread = thread
    import sys

    main_mod = sys.modules.get("main")
    if main_mod is not None:
        main_mod.__dict__.pop("_auto_reconnect_thread", None)
    thread.start()


def _record_ib_error(error_code: int, error_message: str) -> None:
    global _last_ib_error_code, _last_ib_error_message, _subscriptions_lost, _restart_required
    with _supervisor_lock:
        _last_ib_error_code = error_code
        _last_ib_error_message = error_message
        lowered = error_message.lower()
        if error_code == 1100:
            _set_connection_state_locked("gateway_disconnected")
            _set_recovery_phase("failed", error_message)
            _maybe_schedule_auto_reconnect()
        elif error_code == 1101:
            _subscriptions_lost = True
            _set_connection_state_locked("connected")
        elif error_code == 1102:
            _subscriptions_lost = False
            _set_connection_state_locked("connected")
        elif error_code == 326 or "client id is already in use" in lowered:
            _set_connection_state_locked("client_id_stuck")
            _restart_required = True
        elif error_code in (502, 504):
            _set_connection_state_locked("gateway_disconnected")
            _maybe_schedule_auto_reconnect()


def _on_ib_error(req_id: int, error_code: int, error_string: str, contract) -> None:
    _record_ib_error(error_code, error_string or "")


def _on_ib_disconnected() -> None:
    _set_connection_state("gateway_disconnected")
    runtime_callable("_maybe_schedule_auto_reconnect", _maybe_schedule_auto_reconnect)()


def _attach_ib_handlers(ib: IB, connection_id: str | None = None) -> None:
    conn_key = connection_id or config.PRIMARY_CONNECTION_ID
    if conn_key in _ib_handlers_attached:
        return
    ib.errorEvent += _on_ib_error
    ib.disconnectedEvent += _on_ib_disconnected
    _ib_handlers_attached.add(conn_key)


def _resubscribe_quote_symbols(ib: IB) -> None:
    with _quote_sub_lock:
        primary_subs = _quote_subscriptions_by_connection.get(config.PRIMARY_CONNECTION_ID, {})
        symbols = list(primary_subs.keys())
        primary_subs.clear()
    if not symbols:
        return
    from tws_sidecar.market_data.quotes import _ensure_quote_subscriptions

    _ensure_quote_subscriptions(ib, symbols, config.PRIMARY_CONNECTION_ID)
