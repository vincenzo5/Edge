"""Local TWS/IB Gateway sidecar for Edge — thin entrypoint and test facade."""

from __future__ import annotations

import asyncio
import time

from fastapi import HTTPException
from ib_insync import IB

from tws_sidecar import config
from tws_sidecar.app import app
from tws_sidecar.auth import _sidecar_secret_allowed
import tws_sidecar.runtime.state as state
from tws_sidecar.runtime.worker import IbWorkerTimeoutError, run_on_ib_thread
from tws_sidecar.runtime.supervisor import (
    _active_trading_mutation,
    _attach_ib_handlers,
    _auto_reconnect_backoff_sec,
    _maybe_schedule_auto_reconnect,
    _on_ib_disconnected,
    _record_ib_error,
    _reset_auto_reconnect_attempts,
)
from tws_sidecar.runtime.connections import (
    _connections_map,
    _get_ib,
    _get_ib_for_connection,
    _reconnect_ib,
    _reset_ib_connection,
    _resolve_connection_id,
    _status_payload,
)
from tws_sidecar.mapping import _map_execution_from_fill, _map_order, _upsert_execution
from tws_sidecar.account.cache import (
    _ensure_extra_account_subscriptions,
    _resolve_ephemeral_account_id,
)
from tws_sidecar.account.payloads import (
    _ephemeral_pnl,
    _merge_ephemeral_position_rows,
    _merge_positions,
)
from tws_sidecar.account.pricing import _seed_ephemeral_position_market_data
from tws_sidecar.trading.guards import _require_trading_enabled, _validate_account_id
from tws_sidecar.trading.models import ModifyOrderRequest, PlaceOrderRequest
from tws_sidecar.trading.orders import _apply_order_modify_patch, _build_stock_order
from tws_sidecar.routes.health import health
from tws_sidecar.routes.account import account_status

# Config re-exports for tests patching main.TWS_* etc.
TWS_HOST = config.TWS_HOST
TWS_PORT = config.TWS_PORT
TWS_PAPER_PORT = config.TWS_PAPER_PORT
TWS_LIVE_PORT = config.TWS_LIVE_PORT
TWS_CLIENT_ID = config.TWS_CLIENT_ID
TWS_READONLY = config.TWS_READONLY
TWS_ACCOUNT_ID = config.TWS_ACCOUNT_ID
TWS_LIVE_ACCOUNT_ID = config.TWS_LIVE_ACCOUNT_ID
TWS_SIDECAR_SECRET = config.TWS_SIDECAR_SECRET
EDGE_SIDECAR_SECRET_HEADER = config.EDGE_SIDECAR_SECRET_HEADER
PRIMARY_CONNECTION_ID = config.PRIMARY_CONNECTION_ID
IB_LIVE_CONNECTION_ID = config.IB_LIVE_CONNECTION_ID
TWS_MANAGED_BY = config.TWS_MANAGED_BY
HISTORICAL_DATA_TIMEOUT_SEC = state.HISTORICAL_DATA_TIMEOUT_SEC
DEFAULT_IB_JOB_WAIT_SEC = state.DEFAULT_IB_JOB_WAIT_SEC
RECONNECT_IB_JOB_WAIT_SEC = state.RECONNECT_IB_JOB_WAIT_SEC

# Register remaining HTTP routes on app.
from tws_sidecar.routes import account as _routes_account  # noqa: E402, F401
from tws_sidecar.routes import control as _routes_control  # noqa: E402, F401
from tws_sidecar.routes import health as _routes_health  # noqa: E402, F401
from tws_sidecar.routes import market_data as _routes_market_data  # noqa: E402, F401
from tws_sidecar.routes import trading as _routes_trading  # noqa: E402, F401


def __getattr__(name: str):
    if hasattr(state, name):
        return getattr(state, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> list[str]:
    return sorted(set(globals()) | set(state.__all__))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=config.SIDECAR_PORT)
