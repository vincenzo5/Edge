"""TWS sidecar — sidecar auth."""

from __future__ import annotations

from typing import Any

from tws_sidecar import config
from tws_sidecar.runtime.resolve import runtime_attr


def _sidecar_secret_allowed(path: str, headers: Any) -> bool:
    secret = runtime_attr("TWS_SIDECAR_SECRET", config.TWS_SIDECAR_SECRET)
    header_name = runtime_attr("EDGE_SIDECAR_SECRET_HEADER", config.EDGE_SIDECAR_SECRET_HEADER)
    if not secret:
        return True
    if path == "/health":
        return True
    provided = headers.get(header_name, "")
    return provided == secret
