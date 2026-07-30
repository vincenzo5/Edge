"""TWS sidecar — shared mutable runtime state."""

from __future__ import annotations

import queue
import threading
from typing import Any

from ib_insync import IB

from tws_sidecar import config

_lock = threading.Lock()
_ib: IB | None = None
_ib_extra: dict[str, IB] = {}
_extra_connect_errors: dict[str, str | None] = {}
_last_connect_error: str | None = None
_contract_cache: dict[str, Any] = {}
_secdef_cache: dict[str, tuple[float, list[Any]]] = {}
_secdef_cache_lock = threading.Lock()
SECDEF_CACHE_TTL_SEC = 300.0
_ib_jobs: queue.PriorityQueue[tuple[int, int, str, str, Any]] = queue.PriorityQueue()
_ib_job_seq = 0
_ib_job_seq_lock = threading.Lock()
_ib_results: dict[str, tuple[bool, Any]] = {}
_ib_results_lock = threading.Lock()
_quote_subscriptions_by_connection: dict[str, dict[str, Any]] = {}
_quote_sub_lock = threading.Lock()
_account_lock = threading.Lock()
_account_subscriptions_active = False
_account_id: str | None = None
_managed_accounts: list[str] = []
_account_summary: dict[str, dict[str, Any]] = {}
_account_summary_updated_at: int = 0
_account_portfolio: dict[int, dict[str, Any]] = {}
_account_values: dict[str, dict[str, Any]] = {}
_account_pnl: dict[str, Any] = {}
_account_orders: dict[int, dict[str, Any]] = {}
_account_executions: list[dict[str, Any]] = []
_account_positions_raw: dict[int, dict[str, Any]] = {}
_extra_account_pnl: dict[str, dict[str, Any]] = {}
_extra_account_subscriptions_active: set[str] = set()

PRIORITY_HIGH = 0
PRIORITY_QUOTES = 1
PRIORITY_OPTIONS = 2

# Worker wait defaults — callers may override per job.
DEFAULT_IB_JOB_WAIT_SEC = 15.0
RECONNECT_IB_JOB_WAIT_SEC = 20.0
WORKER_WEDGE_MS = config.TWS_WORKER_WEDGE_MS
# Keep below DEFAULT_IB_JOB_WAIT_SEC so reqHistoricalData releases the worker before HTTP waiters expire.
HISTORICAL_DATA_TIMEOUT_SEC = 12.0

_worker_lock = threading.Lock()
_active_job_name: str | None = None
_active_job_started_at: float | None = None
_last_completed_job: str | None = None
_last_completed_at: float | None = None
_last_worker_error: str | None = None
_queue_depth = 0

_recovery_lock = threading.Lock()
_recovery_phase = "idle"  # idle | reconnecting | connected | failed
_recovery_started_at: int | None = None
_recovery_updated_at: int | None = None
_recovery_message: str | None = None
_reconnect_paused = False

# Connection supervisor — tracks IB API session lifecycle independently of HTTP liveness.
_supervisor_lock = threading.Lock()
_connection_state = "idle"
_connection_observed_at_ms: dict[str, int] = {}
_connection_states: dict[str, str] = {}
_active_client_id: int | None = None
_last_ib_error_code: int | None = None
_last_ib_error_message: str | None = None
_subscriptions_lost = False
_restart_required = False
_ib_handlers_attached: set[str] = set()
_reconnect_thread: threading.Thread | None = None

# Bounded auto-reconnect supervisor — triggered on Gateway disconnect / IB errors.
_auto_reconnect_lock = threading.Lock()
_auto_reconnect_thread: threading.Thread | None = None
_auto_reconnect_attempt = 0
_auto_reconnect_max_attempts = 5
_auto_reconnect_backoff_base_sec = 2.0
_auto_reconnect_backoff_max_sec = 30.0
_TRADING_MUTATION_JOB_TOKENS = ("place_order", "modify_order", "cancel_order", "whatif")

_abandoned_job_ids: set[str] = set()
_abandoned_job_ids_lock = threading.Lock()
_fire_and_forget_job_ids: set[str] = set()
_fire_and_forget_job_ids_lock = threading.Lock()

__all__ = [
    name
    for name, value in globals().items()
    if not name.startswith("__")
]
