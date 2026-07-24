"""TWS sidecar — health and status routes."""

from __future__ import annotations

from tws_sidecar.app import app


import os
from typing import Any

from tws_sidecar import config
from tws_sidecar.runtime.connections import _status_payload
from tws_sidecar.util import now_ms
@app.get("/health")
def health() -> dict[str, Any]:
    """Control-plane liveness — never touches the IB worker queue."""
    return {
        "ok": True,
        "timestamp": now_ms(),
        "startedAt": config.SIDECAR_STARTED_AT_MS,
        "version": config.SIDECAR_VERSION,
        "pid": os.getpid(),
        "instanceId": config.SIDECAR_INSTANCE_ID,
        "managedBy": config.TWS_MANAGED_BY,
        "host": config.TWS_HOST,
        "port": config.TWS_PORT,
        "clientId": config.TWS_CLIENT_ID,
        "sidecarPort": config.SIDECAR_PORT,
        "capabilities": {
            "controlRecovery": True,
            "controlReconnect": True,
            "streamQuotes": True,
            "brokerage": True,
        },
    }


@app.get("/status")
def status() -> dict[str, Any]:
    """Non-blocking sidecar + worker diagnostics snapshot."""
    return _status_payload()
