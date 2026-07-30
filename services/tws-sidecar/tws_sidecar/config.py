"""TWS sidecar — configuration."""

from __future__ import annotations

import os
import time
import uuid
from pathlib import Path

from dotenv import load_dotenv

# Host: services/tws-sidecar/tws_sidecar/config.py → repo root is parents[3].
# Container: /app/tws_sidecar/config.py → parents[1] is /app (dotenv optional).
_cfg_path = Path(__file__).resolve()
ROOT = _cfg_path.parents[3] if len(_cfg_path.parents) > 3 else _cfg_path.parents[1]
load_dotenv(ROOT / ".env.local", override=False)
load_dotenv(ROOT / ".env", override=False)

_DEFAULT_HOST = "127.0.0.1"
_LEGACY_TWS_HOST = os.environ.get("TWS_HOST", _DEFAULT_HOST)
TWS_PAPER_HOST = os.environ.get("TWS_PAPER_HOST", _LEGACY_TWS_HOST).strip() or _DEFAULT_HOST
TWS_LIVE_HOST = os.environ.get("TWS_LIVE_HOST", _LEGACY_TWS_HOST).strip() or _DEFAULT_HOST
# Paper-host alias for health/status top-level fields and test patches on main.TWS_HOST.
TWS_HOST = TWS_PAPER_HOST
TWS_PAPER_PORT = int(os.environ.get("TWS_PAPER_PORT", os.environ.get("TWS_PORT", "4002")))
TWS_LIVE_PORT = int(os.environ.get("TWS_LIVE_PORT", "4001"))
TWS_PAPER_CLIENT_ID = int(
    os.environ.get("TWS_PAPER_CLIENT_ID", os.environ.get("TWS_CLIENT_ID", "77"))
)
TWS_LIVE_CLIENT_ID = int(os.environ.get("TWS_LIVE_CLIENT_ID", str(TWS_PAPER_CLIENT_ID + 1)))
TWS_PORT = TWS_PAPER_PORT
TWS_CLIENT_ID = TWS_PAPER_CLIENT_ID
TWS_READONLY = os.environ.get("TWS_READONLY", "true").lower() != "false"
TWS_ACCOUNT_ID = os.environ.get("TWS_ACCOUNT_ID", "").strip()
TWS_LIVE_ACCOUNT_ID = os.environ.get("TWS_LIVE_ACCOUNT_ID", "").strip()
SIDECAR_PORT = int(os.environ.get("TWS_SIDECAR_PORT", "8765"))
TWS_SIDECAR_BIND = os.environ.get("TWS_SIDECAR_BIND", _DEFAULT_HOST).strip() or _DEFAULT_HOST
TWS_SIDECAR_SECRET = os.environ.get("TWS_SIDECAR_SECRET", "").strip()
EDGE_SIDECAR_SECRET_HEADER = "X-Edge-Sidecar-Secret"

PRIMARY_CONNECTION_ID = "ib-paper"
IB_LIVE_CONNECTION_ID = "ib-live"
_CONNECTION_SPECS: dict[str, dict[str, int | str]] = {
    PRIMARY_CONNECTION_ID: {
        "host": TWS_PAPER_HOST,
        "port": TWS_PAPER_PORT,
        "client_id": TWS_PAPER_CLIENT_ID,
    },
    IB_LIVE_CONNECTION_ID: {
        "host": TWS_LIVE_HOST,
        "port": TWS_LIVE_PORT,
        "client_id": TWS_LIVE_CLIENT_ID,
    },
}

SIDECAR_VERSION = "0.2.0"
SIDECAR_STARTED_AT_MS = int(time.time() * 1000)
SIDECAR_INSTANCE_ID = os.environ.get("EDGE_INSTANCE_ID", "").strip() or str(uuid.uuid4())
TWS_MANAGED_BY = os.environ.get("TWS_MANAGED_BY", "standalone").strip() or "standalone"

PRIORITY_HIGH = 0
PRIORITY_QUOTES = 1
PRIORITY_OPTIONS = 2
DEFAULT_IB_JOB_WAIT_SEC = 15.0
RECONNECT_IB_JOB_WAIT_SEC = 20.0
HISTORICAL_DATA_TIMEOUT_SEC = 12.0

INTERVAL_TO_BAR = {
    "1m": "1 min",
    "5m": "5 mins",
    "15m": "15 mins",
    "30m": "30 mins",
    "1h": "1 hour",
    "2h": "2 hours",
    "1d": "1 day",
    "1wk": "1 week",
    "1mo": "1 month",
}

RANGE_TO_DURATION = {
    "1d": "1 D",
    "5d": "5 D",
    "1mo": "1 M",
    "3mo": "3 M",
    "6mo": "6 M",
    "1y": "1 Y",
    "2y": "2 Y",
    "5y": "5 Y",
    "ytd": "1 Y",
    "max": "10 Y",
}
