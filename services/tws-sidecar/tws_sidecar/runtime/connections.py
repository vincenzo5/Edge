"""TWS sidecar — IB connection lifecycle."""

from __future__ import annotations


import asyncio
from typing import Any

from fastapi import HTTPException
from ib_insync import IB

from tws_sidecar import config
from tws_sidecar.util import now_ms
from tws_sidecar.runtime.supervisor import (
    _attach_ib_handlers,
    _maybe_schedule_auto_reconnect,
    _read_gateway_connected,
    _record_ib_error,
    _reset_auto_reconnect_attempts,
    _resubscribe_quote_symbols,
    _set_connection_state,
    _set_connection_state_locked,
    _set_recovery_phase,
    _touch_connection_observation,
    _worker_diagnostics,
)
from tws_sidecar.runtime.resolve import runtime_callable
from tws_sidecar.runtime.worker import run_on_ib_thread
from tws_sidecar.account.cache import _setup_account_subscriptions
import tws_sidecar.runtime.state as state_mod
from tws_sidecar.runtime.state import *

def _resolve_connection_id(
    connection_id: str | None = None,
    environment: str | None = None,
) -> str:
    if connection_id and connection_id.strip():
        normalized = connection_id.strip()
        if normalized not in config._CONNECTION_SPECS:
            raise HTTPException(status_code=400, detail=f"Unknown connectionId {normalized!r}")
        return normalized
    if environment and environment.strip().lower() == "live":
        return config.IB_LIVE_CONNECTION_ID
    return config.PRIMARY_CONNECTION_ID

def _connect_ib_to(host: str, port: int, client_id: int) -> IB:
    last_exc: Exception | None = None
    for offset in range(4):
        candidate_id = client_id + offset
        ib = IB()
        try:
            ib.connect(
                host,
                port,
                clientId=candidate_id,
                readonly=config.TWS_READONLY,
                timeout=4,
            )
            return ib
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            try:
                ib.disconnect()
            except Exception:  # noqa: BLE001
                pass
    if last_exc is not None:
        raise last_exc
    raise RuntimeError("Unable to connect to IB Gateway")


def _debug_agent_log(hypothesis_id: str, location: str, message: str, data: dict[str, Any]) -> None:
    return


def _get_ib_for_connection(connection_id: str) -> IB:
    if connection_id == config.PRIMARY_CONNECTION_ID:
        return _get_ib()
    spec = config._CONNECTION_SPECS[connection_id]
    with _lock:
        existing = _ib_extra.get(connection_id)
        if existing is not None and existing.isConnected():
            return existing
        if existing is not None:
            try:
                existing.disconnect()
            except Exception:  # noqa: BLE001
                pass
        _debug_agent_log(
            "H2",
            "main.py:_get_ib_for_connection",
            "connect_attempt",
            {
                "connectionId": connection_id,
                "host": spec["host"],
                "port": spec["port"],
                "clientId": spec["client_id"],
            },
        )
        try:
            ib = _connect_ib_to(str(spec["host"]), int(spec["port"]), int(spec["client_id"]))
            _attach_ib_handlers(ib, connection_id)
            _ib_extra[connection_id] = ib
            _extra_connect_errors[connection_id] = None
            _debug_agent_log(
                "H2",
                "main.py:_get_ib_for_connection",
                "connect_success",
                {"connectionId": connection_id, "port": spec["port"]},
            )
            return ib
        except Exception as exc:  # noqa: BLE001
            _extra_connect_errors[connection_id] = str(exc)
            _debug_agent_log(
                "H1",
                "main.py:_get_ib_for_connection",
                "connect_failed",
                {
                    "connectionId": connection_id,
                    "port": spec["port"],
                    "error": str(exc),
                },
            )
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Not connected to IB Gateway at {spec['host']}:{spec['port']} "
                    f"for {connection_id} ({exc})"
                ),
            ) from exc


def _get_ib() -> IB:
    with state_mod._lock:
        existing = state_mod._ib
        if existing is not None and existing.isConnected():
            return existing
        if existing is not None:
            try:
                existing.disconnect()
            except Exception:  # noqa: BLE001
                pass
            state_mod._ib = None
        _set_connection_state("api_connecting")
        last_exc: Exception | None = None
        paper_spec = config._CONNECTION_SPECS[config.PRIMARY_CONNECTION_ID]
        paper_host = str(paper_spec["host"])
        for offset in range(4):
            client_id = config.TWS_CLIENT_ID + offset
            ib = IB()
            try:
                ib.connect(
                    paper_host,
                    config.TWS_PORT,
                    clientId=client_id,
                    readonly=config.TWS_READONLY,
                    timeout=4,
                )
                _attach_ib_handlers(ib, config.PRIMARY_CONNECTION_ID)
                state_mod._ib = ib
                state_mod._active_client_id = client_id
                state_mod._last_connect_error = None
                state_mod._restart_required = False
                _set_connection_state("connected")
                _setup_account_subscriptions(ib)
                if state_mod._subscriptions_lost:
                    _resubscribe_quote_symbols(ib)
                    state_mod._subscriptions_lost = False
                return ib
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                msg = str(exc)
                state_mod._last_connect_error = msg
                if "client id is already in use" in msg.lower() or "326" in msg:
                    _set_connection_state("client_id_stuck")
                    state_mod._restart_required = True
                try:
                    ib.disconnect()
                except Exception:  # noqa: BLE001
                    pass
        _set_connection_state("failed")
        if last_exc is not None:
            raise last_exc
        raise RuntimeError("Unable to connect to IB Gateway")


def _reset_extra_ib_connections() -> None:
    """Drop live/extra IB sockets and their quote subscriptions."""
    global _ib_extra, _extra_connect_errors
    with _lock:
        for ib in _ib_extra.values():
            try:
                if ib.isConnected():
                    ib.disconnect()
            except Exception:  # noqa: BLE001
                pass
        _ib_extra.clear()
        _extra_connect_errors.clear()
    with _account_lock:
        _extra_account_pnl.clear()
        _extra_account_subscriptions_active.clear()
    with _quote_sub_lock:
        for conn_id in list(_quote_subscriptions_by_connection.keys()):
            if conn_id != config.PRIMARY_CONNECTION_ID:
                _quote_subscriptions_by_connection.pop(conn_id, None)


def _reconnect_extra_connections() -> None:
    """Best-effort reconnect for non-primary Gateway sockets (e.g. ib-live)."""
    for connection_id in config._CONNECTION_SPECS:
        if connection_id == config.PRIMARY_CONNECTION_ID:
            continue
        try:
            runtime_callable("_get_ib_for_connection", _get_ib_for_connection)(connection_id)
        except HTTPException:
            pass
        except Exception:  # noqa: BLE001
            pass


def _reset_ib_connection() -> None:
    """Drop stale IB socket and quote subscriptions so the next connect is fresh."""
    with state_mod._lock:
        existing = state_mod._ib
        if existing is not None:
            try:
                if existing.isConnected():
                    existing.disconnect()
            except Exception:  # noqa: BLE001
                pass
            state_mod._ib = None
    state_mod._ib_handlers_attached.clear()
    state_mod._active_client_id = None
    with state_mod._quote_sub_lock:
        state_mod._quote_subscriptions_by_connection.pop(config.PRIMARY_CONNECTION_ID, None)
    _reset_extra_ib_connections()
    with state_mod._account_lock:
        state_mod._account_subscriptions_active = False
        state_mod._account_summary.clear()
        state_mod._account_summary_updated_at = 0
        state_mod._account_portfolio.clear()
        state_mod._account_values.clear()
        state_mod._account_pnl.clear()
        state_mod._account_orders.clear()
        state_mod._account_executions.clear()
        state_mod._account_positions_raw.clear()


def _reconnect_ib() -> dict[str, Any]:
    _set_recovery_phase("reconnecting", "Resetting IB connection")
    _set_connection_state("reconnecting")
    _reset_ib_connection()
    try:
        ib = runtime_callable("_get_ib", _get_ib)()
        if state_mod._subscriptions_lost:
            _set_recovery_phase("reconnecting", "Resubscribing market data")
            _resubscribe_quote_symbols(ib)
            state_mod._subscriptions_lost = False
        _set_recovery_phase("reconnecting", "Reconnecting live Gateway")
        _reconnect_extra_connections()
        _set_recovery_phase("connected", "Gateway connected")
        _reset_auto_reconnect_attempts()
    except Exception as exc:  # noqa: BLE001
        state_mod._last_connect_error = str(exc)
        msg = str(exc).lower()
        if "client id is already in use" in msg or "326" in msg:
            _set_connection_state("client_id_stuck")
            state_mod._restart_required = True
        else:
            _set_connection_state("failed")
        _set_recovery_phase("failed", str(exc))
    return _status_payload()


def _read_connection_connected(connection_id: str) -> bool:
    if connection_id == config.PRIMARY_CONNECTION_ID:
        return _read_gateway_connected()
    with _lock:
        ib = _ib_extra.get(connection_id)
        if ib is None:
            return False
        try:
            return bool(ib.isConnected())
        except Exception:  # noqa: BLE001
            return False


def _connection_status_entry(connection_id: str) -> dict[str, Any]:
    spec = config._CONNECTION_SPECS[connection_id]
    connected = _read_connection_connected(connection_id)
    message: str | None = None
    if connection_id != config.PRIMARY_CONNECTION_ID and not connected:
        message = _extra_connect_errors.get(connection_id)
    observed_at = _connection_observed_at_ms.get(connection_id, now_ms())
    if connected:
        _touch_connection_observation(connection_id, "connected", True)
        observed_at = _connection_observed_at_ms.get(connection_id, observed_at)
    conn_state = _connection_states.get(connection_id)
    if conn_state is None:
        conn_state = "connected" if connected else "gateway_disconnected"
    socket_subs_lost = state_mod._subscriptions_lost if connection_id == config.PRIMARY_CONNECTION_ID else False
    return {
        "connectionId": connection_id,
        "gatewayConnected": connected,
        "apiSessionConnected": connected,
        "gatewaySocketOpen": connected,
        "host": spec["host"],
        "port": spec["port"],
        "clientId": spec["client_id"],
        "message": message,
        "connectionState": conn_state,
        "observationConfidence": "observed",
        "observedAt": observed_at,
        "subscriptionsLost": socket_subs_lost,
        "lastIbErrorCode": _last_ib_error_code if connection_id == config.PRIMARY_CONNECTION_ID else None,
        "lastIbErrorMessage": _last_ib_error_message if connection_id == config.PRIMARY_CONNECTION_ID else None,
    }


def _connections_map() -> dict[str, dict[str, Any]]:
    return {
        config.PRIMARY_CONNECTION_ID: _connection_status_entry(config.PRIMARY_CONNECTION_ID),
        config.IB_LIVE_CONNECTION_ID: _connection_status_entry(config.IB_LIVE_CONNECTION_ID),
    }


def _status_payload() -> dict[str, Any]:
    connected = _read_gateway_connected()
    diagnostics = _worker_diagnostics()
    warnings: list[str] = []
    with state_mod._supervisor_lock:
        connection_state = state_mod._connection_state
        active_client_id = state_mod._active_client_id
        last_ib_error_code = state_mod._last_ib_error_code
        last_ib_error_message = state_mod._last_ib_error_message
        subscriptions_lost = state_mod._subscriptions_lost
        restart_required = state_mod._restart_required
        last_connect_error = state_mod._last_connect_error
    worker_wedged = bool(diagnostics.get("workerWedged"))
    if worker_wedged:
        warnings.append("Sidecar IB worker wedged — reconnect or restart sidecar")
    if restart_required or connection_state == "client_id_stuck":
        warnings.append(
            "API client ID stuck — restart sidecar or IB Gateway, or change config.TWS_CLIENT_ID"
        )
    if subscriptions_lost:
        warnings.append("Market data subscriptions lost — resubscribing")
    if not connected:
        if last_connect_error:
            warnings.append(last_connect_error)
        else:
            warnings.append(
                f"Not connected to IB Gateway at {config.TWS_HOST}:{config.TWS_PORT}. "
                "Enable API access and log in to paper Gateway."
            )
    recovery = diagnostics.get("recovery") or {}
    if recovery.get("phase") == "reconnecting":
        warnings.append(recovery.get("message") or "Reconnect in progress")
    return {
        "configured": True,
        "sidecarReachable": True,
        "gatewayConnected": connected,
        "apiSessionConnected": connected,
        "gatewaySocketOpen": connected,
        "connectionState": connection_state,
        "activeClientId": active_client_id,
        "lastIbErrorCode": last_ib_error_code,
        "lastIbErrorMessage": last_ib_error_message,
        "subscriptionsLost": subscriptions_lost,
        "restartRequired": restart_required or worker_wedged,
        "host": config.TWS_HOST,
        "port": config.TWS_PORT,
        "clientId": config.TWS_CLIENT_ID,
        "readOnly": config.TWS_READONLY,
        "brokerageEnabled": True,
        "message": last_connect_error,
        "warnings": warnings,
        "diagnostics": diagnostics,
        "connections": _connections_map(),
    }

