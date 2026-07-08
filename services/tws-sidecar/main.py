"""Local TWS/IB Gateway sidecar for Edge market data (Phase 1: read-only)."""

from __future__ import annotations

import json
import os
import queue
import re
import threading
import time
import uuid
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from ib_insync import IB, LimitOrder, MarketOrder, Option, Stock
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env.local", override=True)
load_dotenv(ROOT / ".env", override=True)

TWS_HOST = os.environ.get("TWS_HOST", "127.0.0.1")
TWS_PORT = int(os.environ.get("TWS_PORT", "4002"))
TWS_CLIENT_ID = int(os.environ.get("TWS_CLIENT_ID", "77"))
TWS_READONLY = os.environ.get("TWS_READONLY", "true").lower() != "false"
TWS_ACCOUNT_ID = os.environ.get("TWS_ACCOUNT_ID", "").strip()
SIDECAR_PORT = int(os.environ.get("TWS_SIDECAR_PORT", "8765"))
TWS_SIDECAR_SECRET = os.environ.get("TWS_SIDECAR_SECRET", "").strip()
EDGE_SIDECAR_SECRET_HEADER = "X-Edge-Sidecar-Secret"

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

SIDECAR_VERSION = "0.2.0"
SIDECAR_STARTED_AT_MS = int(time.time() * 1000)
SIDECAR_INSTANCE_ID = os.environ.get("EDGE_INSTANCE_ID", "").strip() or str(uuid.uuid4())
TWS_MANAGED_BY = os.environ.get("TWS_MANAGED_BY", "standalone").strip() or "standalone"


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    yield
    _set_connection_state("shutdown")
    _reset_ib_connection()


app = FastAPI(title="Edge TWS Sidecar", version=SIDECAR_VERSION, lifespan=_lifespan)


@app.middleware("http")
async def _sidecar_secret_middleware(request: Request, call_next):
    if not _sidecar_secret_allowed(request.url.path, request.headers):
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)


def _sidecar_secret_allowed(path: str, headers: Any) -> bool:
    if not TWS_SIDECAR_SECRET:
        return True
    if path == "/health":
        return True
    provided = headers.get(EDGE_SIDECAR_SECRET_HEADER, "")
    return provided == TWS_SIDECAR_SECRET

_lock = threading.Lock()
_ib: IB | None = None
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
_quote_subscriptions: dict[str, Any] = {}
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

PRIORITY_HIGH = 0
PRIORITY_QUOTES = 1
PRIORITY_OPTIONS = 2

# Worker wait defaults — callers may override per job.
DEFAULT_IB_JOB_WAIT_SEC = 15.0
RECONNECT_IB_JOB_WAIT_SEC = 20.0
WORKER_WEDGE_MS = 30_000

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
_active_client_id: int | None = None
_last_ib_error_code: int | None = None
_last_ib_error_message: str | None = None
_subscriptions_lost = False
_restart_required = False
_ib_handlers_attached = False
_reconnect_thread: threading.Thread | None = None


class IbWorkerTimeoutError(TimeoutError):
    """Raised when an IB worker job exceeds its wait budget."""


def _set_recovery_phase(phase: str, message: str | None = None) -> None:
    global _recovery_phase, _recovery_started_at, _recovery_updated_at, _recovery_message, _reconnect_paused
    now = _now_ms()
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


def _set_connection_state(state: str) -> None:
    global _connection_state
    with _supervisor_lock:
        _connection_state = state


def _set_connection_state_locked(state: str) -> None:
    global _connection_state
    _connection_state = state


def _record_ib_error(error_code: int, error_message: str) -> None:
    global _last_ib_error_code, _last_ib_error_message, _subscriptions_lost, _restart_required
    with _supervisor_lock:
        _last_ib_error_code = error_code
        _last_ib_error_message = error_message
        lowered = error_message.lower()
        if error_code == 1100:
            _set_connection_state_locked("gateway_disconnected")
            _set_recovery_phase("failed", error_message)
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


def _on_ib_error(req_id: int, error_code: int, error_string: str, contract) -> None:
    _record_ib_error(error_code, error_string or "")


def _on_ib_disconnected() -> None:
    _set_connection_state("gateway_disconnected")


def _attach_ib_handlers(ib: IB) -> None:
    global _ib_handlers_attached
    if _ib_handlers_attached:
        return
    ib.errorEvent += _on_ib_error
    ib.disconnectedEvent += _on_ib_disconnected
    _ib_handlers_attached = True


def _resubscribe_quote_symbols(ib: IB) -> None:
    with _quote_sub_lock:
        symbols = list(_quote_subscriptions.keys())
        _quote_subscriptions.clear()
    if not symbols:
        return
    _ensure_quote_subscriptions(ib, symbols)


def _ib_worker() -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    while True:
        _priority, _seq, job_id, job_name, fn = _ib_jobs.get()
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


threading.Thread(target=_ib_worker, name="tws-ib-worker", daemon=True).start()


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
        raise IbWorkerTimeoutError(f"IB worker timed out waiting for {job_name}")
    finally:
        with _worker_lock:
            _queue_depth = max(0, _queue_depth - 1)


class QuotesRequest(BaseModel):
    symbols: list[str] = Field(min_length=1, max_length=100)


class WarmupRequest(BaseModel):
    symbols: list[str] = Field(default_factory=list, max_length=50)


def _now_ms() -> int:
    return int(time.time() * 1000)


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if num != num:
        return None
    return num


def _expiration_to_yyyymmdd(expiration: str) -> str:
    raw = expiration.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return raw.replace("-", "")
    if re.fullmatch(r"\d{8}", raw):
        return raw
    raise ValueError(f"Invalid expiration format: {expiration}")


def _expiration_from_yyyymmdd(raw: str) -> str:
    if len(raw) == 8 and raw.isdigit():
        return f"{raw[0:4]}-{raw[4:6]}-{raw[6:8]}"
    return raw


def _build_occ_symbol(
    underlying: str, expiration_yyyymmdd: str, right: str, strike: float
) -> str:
    yymmdd = expiration_yyyymmdd[2:]
    strike_part = str(int(round(strike * 1000))).zfill(8)
    return f"{underlying}{yymmdd}{right}{strike_part}"


def _get_ib() -> IB:
    global _ib, _last_connect_error, _active_client_id, _restart_required, _subscriptions_lost
    with _lock:
        if _ib is not None and _ib.isConnected():
            return _ib
        if _ib is not None:
            try:
                _ib.disconnect()
            except Exception:  # noqa: BLE001
                pass
            _ib = None
        _set_connection_state("api_connecting")
        last_exc: Exception | None = None
        for offset in range(4):
            client_id = TWS_CLIENT_ID + offset
            ib = IB()
            try:
                ib.connect(
                    TWS_HOST,
                    TWS_PORT,
                    clientId=client_id,
                    readonly=TWS_READONLY,
                    timeout=4,
                )
                _attach_ib_handlers(ib)
                _ib = ib
                _active_client_id = client_id
                _last_connect_error = None
                _restart_required = False
                _set_connection_state("connected")
                _setup_account_subscriptions(ib)
                if _subscriptions_lost:
                    _resubscribe_quote_symbols(ib)
                    _subscriptions_lost = False
                return ib
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                msg = str(exc)
                _last_connect_error = msg
                if "client id is already in use" in msg.lower() or "326" in msg:
                    _set_connection_state("client_id_stuck")
                    _restart_required = True
                try:
                    ib.disconnect()
                except Exception:  # noqa: BLE001
                    pass
        _set_connection_state("failed")
        if last_exc is not None:
            raise last_exc
        raise RuntimeError("Unable to connect to IB Gateway")


def _reset_ib_connection() -> None:
    """Drop stale IB socket and quote subscriptions so the next connect is fresh."""
    global _ib, _account_subscriptions_active, _account_summary_updated_at, _ib_handlers_attached, _active_client_id
    with _lock:
        if _ib is not None:
            try:
                if _ib.isConnected():
                    _ib.disconnect()
            except Exception:  # noqa: BLE001
                pass
            _ib = None
    _ib_handlers_attached = False
    _active_client_id = None
    with _quote_sub_lock:
        _quote_subscriptions.clear()
    with _account_lock:
        _account_subscriptions_active = False
        _account_summary.clear()
        _account_summary_updated_at = 0
        _account_portfolio.clear()
        _account_values.clear()
        _account_pnl.clear()
        _account_orders.clear()
        _account_executions.clear()
        _account_positions_raw.clear()


def _reconnect_ib() -> dict[str, Any]:
    global _subscriptions_lost, _last_connect_error, _restart_required
    _set_recovery_phase("reconnecting", "Resetting IB connection")
    _set_connection_state("reconnecting")
    _reset_ib_connection()
    try:
        ib = _get_ib()
        if _subscriptions_lost:
            _set_recovery_phase("reconnecting", "Resubscribing market data")
            _resubscribe_quote_symbols(ib)
            _subscriptions_lost = False
        _set_recovery_phase("connected", "Gateway connected")
    except Exception as exc:  # noqa: BLE001
        _last_connect_error = str(exc)
        msg = str(exc).lower()
        if "client id is already in use" in msg or "326" in msg:
            _set_connection_state("client_id_stuck")
            _restart_required = True
        else:
            _set_connection_state("failed")
        _set_recovery_phase("failed", str(exc))
    return _status_payload()


def _status_payload() -> dict[str, Any]:
    connected = _read_gateway_connected()
    diagnostics = _worker_diagnostics()
    warnings: list[str] = []
    with _supervisor_lock:
        connection_state = _connection_state
        active_client_id = _active_client_id
        last_ib_error_code = _last_ib_error_code
        last_ib_error_message = _last_ib_error_message
        subscriptions_lost = _subscriptions_lost
        restart_required = _restart_required
    worker_wedged = bool(diagnostics.get("workerWedged"))
    if worker_wedged:
        warnings.append("Sidecar IB worker wedged — reconnect or restart sidecar")
    if restart_required or connection_state == "client_id_stuck":
        warnings.append(
            "API client ID stuck — restart sidecar or IB Gateway, or change TWS_CLIENT_ID"
        )
    if subscriptions_lost:
        warnings.append("Market data subscriptions lost — resubscribing")
    if not connected:
        if _last_connect_error:
            warnings.append(_last_connect_error)
        else:
            warnings.append(
                f"Not connected to IB Gateway at {TWS_HOST}:{TWS_PORT}. "
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
        "host": TWS_HOST,
        "port": TWS_PORT,
        "clientId": TWS_CLIENT_ID,
        "readOnly": TWS_READONLY,
        "brokerageEnabled": True,
        "message": _last_connect_error,
        "warnings": warnings,
        "diagnostics": diagnostics,
    }


def _resolve_stock(symbol: str):
    sym = symbol.strip().upper()
    cached = _contract_cache.get(sym)
    if cached is not None:
        return cached
    ib = _get_ib()
    contract = Stock(sym, "SMART", "USD")
    qualified = ib.qualifyContracts(contract)
    if not qualified:
        raise HTTPException(status_code=404, detail=f"Could not resolve stock {sym}")
    resolved = qualified[0]
    _contract_cache[sym] = resolved
    return resolved


def _get_secdef_chains(sym: str, stock) -> list[Any]:
    with _secdef_cache_lock:
        cached = _secdef_cache.get(sym)
        if cached and (time.time() - cached[0]) < SECDEF_CACHE_TTL_SEC:
            return cached[1]
    ib = _get_ib()
    chains = ib.reqSecDefOptParams(stock.symbol, "", stock.secType, stock.conId) or []
    with _secdef_cache_lock:
        _secdef_cache[sym] = (time.time(), chains)
    return chains


def _resolve_spot_for_chain(ib: IB, stock, strike_window: dict[str, Any] | None) -> float | None:
    if strike_window and strike_window.get("spot") is not None:
        spot = _safe_float(strike_window.get("spot"))
        if spot is not None and spot > 0:
            return spot
    return _spot_from_stock(ib, stock)


def _map_bar(bar) -> dict[str, Any]:
    ts = bar.date
    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        t_ms = int(ts.timestamp() * 1000)
    else:
        raw = str(ts)
        if re.fullmatch(r"\d{8}", raw):
            parsed = datetime.strptime(raw, "%Y%m%d")
        elif re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
            parsed = datetime.strptime(raw, "%Y-%m-%d")
        else:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        t_ms = int(parsed.timestamp() * 1000)
    return {
        "t": t_ms,
        "o": _safe_float(bar.open),
        "h": _safe_float(bar.high),
        "l": _safe_float(bar.low),
        "c": _safe_float(bar.close),
        "v": _safe_float(bar.volume),
    }


def _map_ticker_quote(symbol: str, ticker) -> dict[str, Any]:
    last = _safe_float(getattr(ticker, "last", None))
    bid = _safe_float(getattr(ticker, "bid", None))
    ask = _safe_float(getattr(ticker, "ask", None))
    close = _safe_float(getattr(ticker, "close", None))
    price = last if last is not None else close
    change = _safe_float(getattr(ticker, "change", None)) or (
        (price - close) if price is not None and close not in (None, 0) else None
    )
    change_percent = None
    if change is not None and close not in (None, 0):
        change_percent = (change / close) * 100
    return {
        "symbol": symbol,
        "shortName": getattr(ticker.contract, "localSymbol", None) or symbol,
        "exchange": getattr(ticker.contract, "primaryExchange", None)
        or getattr(ticker.contract, "exchange", None),
        "price": price,
        "change": change,
        "changePercent": change_percent,
        "volume": _safe_float(getattr(ticker, "volume", None)),
        "updatedAt": _now_ms(),
    }


def _map_option_contract(
    underlying: str,
    expiration: str,
    contract,
    ticker,
) -> dict[str, Any] | None:
    strike = _safe_float(getattr(contract, "strike", None))
    right = getattr(contract, "right", None)
    if strike is None or strike <= 0 or right not in ("C", "P"):
        return None
    opt_type = "call" if right == "C" else "put"
    maturity = getattr(contract, "lastTradeDateOrContractMonth", "") or ""
    maturity_yyyymmdd = maturity if len(maturity) == 8 else _expiration_to_yyyymmdd(expiration)
    bid = _safe_float(ticker.bid)
    ask = _safe_float(ticker.ask)
    last = _safe_float(ticker.last)
    mark = (bid + ask) / 2 if bid is not None and ask is not None else last
    greeks = getattr(ticker, "modelGreeks", None)
    return {
        "contractSymbol": _build_occ_symbol(underlying, maturity_yyyymmdd, right, strike),
        "underlying": underlying,
        "type": opt_type,
        "expiration": _expiration_from_yyyymmdd(maturity_yyyymmdd),
        "strike": strike,
        "bid": bid,
        "ask": ask,
        "last": last,
        "mark": mark,
        "volume": _safe_float(ticker.volume),
        "openInterest": _safe_float(getattr(ticker, "openInterest", None)),
        "impliedVolatility": _safe_float(getattr(greeks, "impliedVol", None) if greeks else None),
        "delta": _safe_float(getattr(greeks, "delta", None) if greeks else None),
        "gamma": _safe_float(getattr(greeks, "gamma", None) if greeks else None),
        "theta": _safe_float(getattr(greeks, "theta", None) if greeks else None),
        "vega": _safe_float(getattr(greeks, "vega", None) if greeks else None),
        "updatedAt": _now_ms(),
    }


def _ticker_has_data(ticker) -> bool:
    if getattr(ticker, "modelGreeks", None) is not None:
        return True
    for field in ("bid", "ask", "last", "close"):
        val = _safe_float(getattr(ticker, field, None))
        if val is not None and val > 0:
            return True
    return False


def _spot_from_stock(ib: IB, stock) -> float | None:
    try:
        bars = ib.reqHistoricalData(
            stock,
            endDateTime="",
            durationStr="1 D",
            barSizeSetting="1 day",
            whatToShow="TRADES",
            useRTH=True,
            formatDate=1,
        )
        if bars:
            return _safe_float(bars[-1].close)
    except Exception:  # noqa: BLE001
        pass
    ticker = ib.reqMktData(stock, "", False, False)
    ib.sleep(0.35)
    spot = _safe_float(ticker.last) or _safe_float(ticker.close)
    ib.cancelMktData(stock)
    return spot


def _fetch_option_chain(
    sym: str,
    expiration: str,
    expiration_yyyymmdd: str,
    strike_window: dict[str, Any] | None,
) -> dict[str, Any]:
    warnings: list[str] = []
    stock = _resolve_stock(sym)
    ib = _get_ib()
    chains = _get_secdef_chains(sym, stock)
    strikes: set[float] = set()
    trading_class = None
    exchange = "SMART"
    for chain in chains or []:
        if expiration_yyyymmdd in (chain.expirations or []):
            trading_class = chain.tradingClass or trading_class
            exchange = chain.exchange or exchange
            for strike in chain.strikes or []:
                val = _safe_float(strike)
                if val is not None and val > 0:
                    strikes.add(val)
    if not strikes:
        return {
            "chain": {"underlying": sym, "expiration": expiration, "contracts": []},
            "warnings": ["TWS returned no strikes for expiration"],
        }

    spot = _resolve_spot_for_chain(ib, stock, strike_window)
    selected = _select_strikes(sorted(strikes), strike_window, spot)
    option_specs = [
        Option(
            sym,
            expiration_yyyymmdd,
            strike,
            right,
            exchange,
            tradingClass=trading_class,
        )
        for strike in selected
        for right in ("C", "P")
    ]
    if not option_specs:
        return {
            "chain": {"underlying": sym, "expiration": expiration, "contracts": []},
            "warnings": ["No option contracts selected for strike window"],
        }

    qualified = ib.qualifyContracts(*option_specs)
    if not qualified:
        return {
            "chain": {"underlying": sym, "expiration": expiration, "contracts": []},
            "warnings": ["TWS could not qualify selected option contracts"],
        }

    tickers = [ib.reqMktData(opt, "106", False, False) for opt in qualified]
    wait_budget = min(8.0, 1.0 + 0.12 * len(qualified))
    deadline = time.time() + wait_budget
    while time.time() < deadline:
        ib.sleep(0.1)
        ready = sum(1 for ticker in tickers if _ticker_has_data(ticker))
        if ready >= max(1, len(tickers) // 2):
            break

    contracts: list[dict[str, Any]] = []
    for resolved_opt, ticker in zip(qualified, tickers, strict=True):
        mapped = _map_option_contract(sym, expiration, resolved_opt, ticker)
        if mapped:
            contracts.append(mapped)
        ib.cancelMktData(resolved_opt)

    contracts.sort(key=lambda row: (row["strike"], row["type"]))
    if not contracts:
        warnings.append("TWS returned no option contracts with market data")
    elif any(not _ticker_has_data(ticker) for ticker in tickers):
        warnings.append("Some option contracts returned without live market data")
    return {
        "chain": {"underlying": sym, "expiration": expiration, "contracts": contracts},
        "warnings": warnings,
    }


def _select_strikes(
    all_strikes: list[float], strike_window: dict[str, Any] | None, spot: float | None
) -> list[float]:
    if not strike_window or strike_window.get("mode") == "full":
        return sorted(all_strikes)
    count = int(strike_window.get("count") or 20)
    window_spot = strike_window.get("spot", spot)
    if window_spot is None:
        mid = len(all_strikes) // 2
        half = (count + 1) // 2
        start = max(0, mid - half)
        return sorted(all_strikes)[start : start + count]
    ranked = sorted(all_strikes, key=lambda s: abs(s - float(window_spot)))
    return ranked[:count]


def _ensure_quote_subscriptions(ib: IB, symbols: list[str]) -> None:
    with _quote_sub_lock:
        for sym in symbols:
            if sym in _quote_subscriptions:
                continue
            try:
                resolved = _resolve_stock(sym)
                ticker = ib.reqMktData(resolved, "", False, False)
                _quote_subscriptions[sym] = ticker
            except Exception:  # noqa: BLE001
                continue


def _read_cached_quotes(symbols: list[str]) -> dict[str, Any]:
    quotes_out: list[dict[str, Any]] = []
    missing: list[str] = []
    with _quote_sub_lock:
        for sym in symbols:
            ticker = _quote_subscriptions.get(sym)
            if ticker is None:
                missing.append(sym)
                continue
            quotes_out.append(_map_ticker_quote(sym, ticker))
    return {"quotes": quotes_out, "missingSymbols": missing}


def _fetch_quotes(symbols: list[str]) -> dict[str, Any]:
    ib = _get_ib()
    _ensure_quote_subscriptions(ib, symbols)
    payload = _read_cached_quotes(symbols)
    if payload["missingSymbols"]:
        _ensure_quote_subscriptions(ib, payload["missingSymbols"])
        payload = _read_cached_quotes(symbols)
    return payload


def _map_contract(contract) -> dict[str, Any]:
    return {
        "conId": getattr(contract, "conId", None),
        "symbol": getattr(contract, "symbol", None),
        "secType": getattr(contract, "secType", None),
        "currency": getattr(contract, "currency", None),
        "exchange": getattr(contract, "exchange", None),
        "primaryExchange": getattr(contract, "primaryExchange", None),
        "lastTradeDateOrContractMonth": getattr(
            contract, "lastTradeDateOrContractMonth", None
        ),
        "strike": _safe_float(getattr(contract, "strike", None)),
        "right": getattr(contract, "right", None),
        "multiplier": getattr(contract, "multiplier", None),
        "localSymbol": getattr(contract, "localSymbol", None),
    }


def _portfolio_key(contract) -> int:
    con_id = getattr(contract, "conId", None)
    if con_id is not None:
        return int(con_id)
    return hash(
        (
            getattr(contract, "symbol", ""),
            getattr(contract, "secType", ""),
            getattr(contract, "lastTradeDateOrContractMonth", ""),
            getattr(contract, "strike", 0),
            getattr(contract, "right", ""),
        )
    )


def _resolve_account_id(ib: IB) -> str:
    global _managed_accounts, _account_id
    if TWS_ACCOUNT_ID:
        _account_id = TWS_ACCOUNT_ID
        return TWS_ACCOUNT_ID
    accounts = ib.managedAccounts() or []
    _managed_accounts = list(accounts)
    if not accounts:
        raise RuntimeError("No managed IB accounts available")
    _account_id = accounts[0]
    return accounts[0]


def _on_update_portfolio(item) -> None:
    contract = item.contract
    key = _portfolio_key(contract)
    with _account_lock:
        _account_portfolio[key] = {
            "account": item.account,
            "contract": _map_contract(contract),
            "position": _safe_float(item.position),
            "marketPrice": _safe_float(item.marketPrice),
            "marketValue": _safe_float(item.marketValue),
            "averageCost": _safe_float(item.averageCost),
            "unrealizedPNL": _safe_float(item.unrealizedPNL),
            "realizedPNL": _safe_float(item.realizedPNL),
            "updatedAt": _now_ms(),
        }


def _cache_account_value(
    key: str | None,
    value: Any,
    currency: str | None,
    account_name: str | None,
) -> None:
    if key is None or value is None:
        return
    with _account_lock:
        bucket = _account_values.setdefault(currency or "BASE", {})
        bucket[key] = {
            "value": value,
            "currency": currency,
            "account": account_name,
            "updatedAt": _now_ms(),
        }
        if key in (
            "NetLiquidation",
            "BuyingPower",
            "AvailableFunds",
            "ExcessLiquidity",
            "InitMarginReq",
            "MaintMarginReq",
            "Leverage",
            "DayTradesRemaining",
            "GrossPositionValue",
            "TotalCashValue",
            "SettledCash",
            "Cushion",
            "EquityWithLoanValue",
            "UnrealizedPnL",
            "RealizedPnL",
        ):
            _account_summary[key] = {
                "tag": key,
                "value": value,
                "currency": currency,
                "account": account_name,
            }
            global _account_summary_updated_at
            _account_summary_updated_at = _now_ms()


def _on_update_account_value(account_value) -> None:
    _cache_account_value(
        getattr(account_value, "tag", None),
        getattr(account_value, "value", None),
        getattr(account_value, "currency", None),
        getattr(account_value, "account", None),
    )


def _on_pnl(pnl) -> None:
    with _account_lock:
        _account_pnl.clear()
        _account_pnl.update(
            {
                "account": getattr(pnl, "account", None),
                "dailyPnL": _safe_float(getattr(pnl, "dailyPnL", None)),
                "unrealizedPnL": _safe_float(getattr(pnl, "unrealizedPnL", None)),
                "realizedPnL": _safe_float(getattr(pnl, "realizedPnL", None)),
                "updatedAt": _now_ms(),
            }
        )


def _on_open_order(trade) -> None:
    order = trade.order
    order_id = getattr(order, "orderId", None)
    if order_id is None:
        return
    contract = trade.contract
    with _account_lock:
        _account_orders[int(order_id)] = _map_order(order, contract)


def _on_order_status(trade) -> None:
    _on_open_order(trade)


def _map_execution_from_fill(fill, commission_report=None) -> dict[str, Any]:
    contract = getattr(fill, "contract", None)
    execution = getattr(fill, "execution", None)
    commission = commission_report or getattr(fill, "commissionReport", None)
    mapped_contract = _map_contract(contract) if contract else {}
    return {
        "execId": getattr(execution, "execId", None) if execution else None,
        "time": str(getattr(execution, "time", "")) if execution else None,
        "account": getattr(execution, "acctNumber", None) if execution else None,
        "side": getattr(execution, "side", None) if execution else None,
        "shares": _safe_float(getattr(execution, "shares", None)) if execution else None,
        "price": _safe_float(getattr(execution, "price", None)) if execution else None,
        "cumQty": _safe_float(getattr(execution, "cumQty", None)) if execution else None,
        "avgPrice": _safe_float(getattr(execution, "avgPrice", None)) if execution else None,
        "orderId": getattr(execution, "orderId", None) if execution else None,
        "permId": getattr(execution, "permId", None) if execution else None,
        "orderRef": getattr(execution, "orderRef", None) if execution else None,
        "exchange": getattr(execution, "exchange", None) if execution else None,
        "symbol": mapped_contract.get("symbol"),
        "secType": mapped_contract.get("secType"),
        "contract": mapped_contract,
        "commission": _safe_float(getattr(commission, "commission", None))
        if commission
        else None,
        "commissionCurrency": getattr(commission, "currency", None) if commission else None,
        "realizedPNL": _safe_float(getattr(commission, "realizedPNL", None))
        if commission
        else None,
        "updatedAt": _now_ms(),
    }


def _upsert_execution(mapped: dict[str, Any]) -> None:
    exec_id = mapped.get("execId")
    if exec_id:
        for index, existing in enumerate(_account_executions):
            if existing.get("execId") == exec_id:
                merged = {**existing, **mapped}
                _account_executions[index] = merged
                return
    _account_executions.append(mapped)
    if len(_account_executions) > 200:
        _account_executions[:] = _account_executions[-200:]


def _on_exec_details(trade, fill) -> None:
    with _account_lock:
        _upsert_execution(_map_execution_from_fill(fill))


def _on_commission_report(trade, fill, report) -> None:
    with _account_lock:
        _upsert_execution(_map_execution_from_fill(fill, commission_report=report))


def _map_order(order, contract) -> dict[str, Any]:
    return {
        "orderId": getattr(order, "orderId", None),
        "permId": getattr(order, "permId", None),
        "clientId": getattr(order, "clientId", None),
        "account": getattr(order, "account", None),
        "action": getattr(order, "action", None),
        "totalQuantity": _safe_float(getattr(order, "totalQuantity", None)),
        "orderType": getattr(order, "orderType", None),
        "lmtPrice": _safe_float(getattr(order, "lmtPrice", None)),
        "auxPrice": _safe_float(getattr(order, "auxPrice", None)),
        "tif": getattr(order, "tif", None),
        "status": getattr(order, "status", None),
        "filled": _safe_float(getattr(order, "filled", None)),
        "remaining": _safe_float(getattr(order, "remaining", None)),
        "avgFillPrice": _safe_float(getattr(order, "avgFillPrice", None)),
        "lastFillPrice": _safe_float(getattr(order, "lastFillPrice", None)),
        "whyHeld": getattr(order, "whyHeld", None),
        "symbol": getattr(contract, "symbol", None),
        "secType": getattr(contract, "secType", None),
        "conId": getattr(contract, "conId", None),
        "updatedAt": _now_ms(),
    }


def _setup_account_subscriptions(ib: IB) -> None:
    global _account_subscriptions_active, _managed_accounts, _account_id, _account_summary_updated_at
    if _account_subscriptions_active:
        return
    account = _resolve_account_id(ib)
    _managed_accounts = list(ib.managedAccounts() or [account])

    ib.updatePortfolioEvent += _on_update_portfolio
    ib.accountValueEvent += _on_update_account_value
    ib.pnlEvent += _on_pnl
    ib.openOrderEvent += _on_open_order
    ib.orderStatusEvent += _on_order_status
    ib.execDetailsEvent += _on_exec_details
    ib.commissionReportEvent += _on_commission_report

    try:
        # ib.reqAccountUpdates() waits for accountDownloadEnd and can hang on
        # live/read-only Gateway sessions. The client call only sends the
        # subscription request; updateAccountValue/updatePortfolio events fill
        # the caches as IB delivers them.
        ib.client.reqAccountUpdates(True, account)
    except Exception:  # noqa: BLE001
        pass
    try:
        ib.reqPnL(account)
    except Exception:  # noqa: BLE001
        pass
    try:
        ib.reqAccountSummary()
        for item in ib.accountSummary():
            _on_update_account_value(item)
        _account_summary_updated_at = _now_ms()
    except Exception:  # noqa: BLE001
        pass
    if not TWS_READONLY:
        try:
            ib.client.reqOpenOrders()
            for trade in ib.openTrades():
                _on_open_order(trade)
        except Exception:  # noqa: BLE001
            pass
    try:
        for pos in ib.positions():
            key = _portfolio_key(pos.contract)
            with _account_lock:
                _account_positions_raw[key] = {
                    "account": pos.account,
                    "contract": _map_contract(pos.contract),
                    "position": _safe_float(pos.position),
                    "avgCost": _safe_float(pos.avgCost),
                    "updatedAt": _now_ms(),
                }
    except Exception:  # noqa: BLE001
        pass

    try:
        _seed_portfolio_market_data(ib)
    except Exception:  # noqa: BLE001
        pass

    _account_subscriptions_active = True


def _seed_portfolio_market_data(ib: IB) -> None:
    """Synchronously fill _account_portfolio so cold loads include MKT/PnL."""
    try:
        for item in ib.portfolio():
            _on_update_portfolio(item)
    except Exception:  # noqa: BLE001
        pass

    with _account_lock:
        keys_needing_price = [
            key
            for key in _account_positions_raw
            if _account_portfolio.get(key, {}).get("marketPrice") is None
        ]
        raw_snapshots = {
            key: dict(_account_positions_raw.get(key, {})) for key in keys_needing_price
        }

    for key, raw in raw_snapshots.items():
        position = _safe_float(raw.get("position"))
        if not position:
            continue
        contract_info = raw.get("contract") or {}
        symbol = (contract_info.get("symbol") or "").strip().upper()
        if not symbol:
            continue
        try:
            con_id = contract_info.get("conId")
            if con_id:
                from ib_insync import Contract

                contract = Contract(conId=int(con_id), symbol=symbol)
                qualified = ib.qualifyContracts(contract)
                contract = qualified[0] if qualified else Stock(symbol, "SMART", "USD")
            else:
                contract = Stock(symbol, "SMART", "USD")
                qualified = ib.qualifyContracts(contract)
                if not qualified:
                    continue
                contract = qualified[0]
            ticker = ib.reqMktData(contract, "", False, False)
            ib.sleep(0.4)
            price = _safe_float(getattr(ticker, "last", None)) or _safe_float(
                getattr(ticker, "close", None)
            )
            ib.cancelMktData(contract)
            if price is None:
                continue
            avg_cost = _safe_float(raw.get("avgCost")) or 0.0
            with _account_lock:
                existing = _account_portfolio.get(key, {})
                _account_portfolio[key] = {
                    "account": raw.get("account") or existing.get("account"),
                    "contract": contract_info,
                    "position": position,
                    "marketPrice": price,
                    "marketValue": price * position,
                    "averageCost": existing.get("averageCost") or avg_cost,
                    "unrealizedPNL": (price - avg_cost) * position,
                    "realizedPNL": existing.get("realizedPNL"),
                    "updatedAt": _now_ms(),
                }
        except Exception:  # noqa: BLE001
            continue


def _merge_positions() -> list[dict[str, Any]]:
    with _account_lock:
        keys = set(_account_positions_raw.keys()) | set(_account_portfolio.keys())
        rows: list[dict[str, Any]] = []
        for key in keys:
            raw = _account_positions_raw.get(key, {})
            portfolio = _account_portfolio.get(key, {})
            contract = portfolio.get("contract") or raw.get("contract") or {}
            position = portfolio.get("position")
            if position is None:
                position = raw.get("position")
            if position in (None, 0):
                continue
            rows.append(
                {
                    "account": portfolio.get("account") or raw.get("account"),
                    "contract": contract,
                    "position": position,
                    "avgCost": portfolio.get("averageCost") or raw.get("avgCost"),
                    "marketPrice": portfolio.get("marketPrice"),
                    "marketValue": portfolio.get("marketValue"),
                    "unrealizedPNL": portfolio.get("unrealizedPNL"),
                    "realizedPNL": portfolio.get("realizedPNL"),
                    "updatedAt": max(
                        portfolio.get("updatedAt") or 0, raw.get("updatedAt") or 0
                    ),
                }
            )
        rows.sort(
            key=lambda row: abs(_safe_float(row.get("marketValue")) or 0),
            reverse=True,
        )
        return rows


def _account_status_payload() -> dict[str, Any]:
    connected = _ib is not None and _ib.isConnected()
    with _account_lock:
        return {
            "enabled": True,
            "connected": connected and _account_subscriptions_active,
            "accountId": _account_id,
            "managedAccounts": list(_managed_accounts),
            "summaryUpdatedAt": _account_summary_updated_at or None,
            "readOnly": TWS_READONLY,
            "timestamp": _now_ms(),
        }


def _account_summary_payload() -> dict[str, Any]:
    with _account_lock:
        tags = dict(_account_summary)
        pnl = dict(_account_pnl)
        updated_at = _account_summary_updated_at
    return {
        "accountId": _account_id,
        "tags": tags,
        "pnl": pnl,
        "updatedAt": updated_at or _now_ms(),
    }


def _account_stream_payload() -> dict[str, Any]:
    return {
        "type": "update",
        "status": _account_status_payload(),
        "summary": _account_summary_payload(),
        "positions": _merge_positions(),
        "pnl": dict(_account_pnl),
        "orders": list(_account_orders.values()),
        "executions": list(_account_executions)[-50:],
        "meta": {"source": "tws", "asOf": _now_ms(), "streaming": True},
    }


class WhatIfRequest(BaseModel):
    symbol: str = Field(min_length=1)
    action: str = Field(pattern="^(BUY|SELL)$")
    quantity: float = Field(gt=0)
    orderType: str = Field(default="LMT", pattern="^(LMT|MKT)$")
    limitPrice: float | None = None


def _require_brokerage_enabled() -> None:
    return


@app.get("/health")
def health() -> dict[str, Any]:
    """Control-plane liveness — never touches the IB worker queue."""
    return {
        "ok": True,
        "timestamp": _now_ms(),
        "startedAt": SIDECAR_STARTED_AT_MS,
        "version": SIDECAR_VERSION,
        "pid": os.getpid(),
        "instanceId": SIDECAR_INSTANCE_ID,
        "managedBy": TWS_MANAGED_BY,
        "host": TWS_HOST,
        "port": TWS_PORT,
        "clientId": TWS_CLIENT_ID,
        "sidecarPort": SIDECAR_PORT,
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


@app.get("/control/recovery")
def control_recovery_status() -> dict[str, Any]:
    return _status_payload()


def _start_async_reconnect() -> dict[str, Any]:
    global _reconnect_thread

    def runner() -> None:
        try:
            _reconnect_ib()
        except Exception as exc:  # noqa: BLE001
            _set_recovery_phase("failed", str(exc))

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
            PRIORITY_HIGH,
            job_name="reconnect",
            wait_sec=RECONNECT_IB_JOB_WAIT_SEC,
        )
        result["accepted"] = True
        result["inProgress"] = recovery.get("phase") == "reconnecting"
        return result
    except IbWorkerTimeoutError:
        return _start_async_reconnect()
    except Exception as exc:  # noqa: BLE001
        _set_recovery_phase("failed", str(exc))
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/warmup")
def warmup(body: WarmupRequest) -> dict[str, Any]:
    symbols = sorted({s.strip().upper() for s in body.symbols if s.strip()})

    def work():
        warmed: list[str] = []
        subscribed: list[str] = []
        try:
            ib = _get_ib()
            for sym in symbols:
                try:
                    _resolve_stock(sym)
                    warmed.append(sym)
                except HTTPException:
                    continue
                except Exception:  # noqa: BLE001
                    continue
            if symbols:
                try:
                    _ensure_quote_subscriptions(ib, symbols)
                    subscribed = [sym for sym in symbols if sym in _quote_subscriptions]
                except Exception:  # noqa: BLE001
                    subscribed = []
            return {
                "warmed": warmed,
                "subscribed": subscribed,
                "timestamp": _now_ms(),
            }
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, PRIORITY_HIGH)


def _map_contract_details(symbol: str, resolved, details) -> dict[str, Any]:
    contract = getattr(details, "contract", resolved)
    return {
        "symbol": symbol.strip().upper(),
        "conid": getattr(contract, "conId", None) or getattr(resolved, "conId", None),
        "secType": getattr(contract, "secType", None),
        "exchange": getattr(contract, "exchange", None),
        "primaryExchange": getattr(contract, "primaryExchange", None)
        or getattr(resolved, "primaryExchange", None),
        "companyName": getattr(details, "longName", None)
        or getattr(contract, "symbol", None),
        "industry": getattr(details, "industry", None),
        "category": getattr(details, "category", None),
        "subcategory": getattr(details, "subcategory", None),
    }


@app.get("/contract")
def contract(symbol: str = Query(min_length=1)) -> dict[str, Any]:
    def work():
        try:
            resolved = _resolve_stock(symbol)
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return {
            "symbol": symbol.strip().upper(),
            "conid": resolved.conId,
            "exchange": getattr(resolved, "primaryExchange", None)
            or getattr(resolved, "exchange", None),
            "companyName": getattr(resolved, "longName", None)
            or getattr(resolved, "symbol", None),
        }

    return run_on_ib_thread(work)


@app.get("/contracts/details")
def contract_details(symbol: str = Query(min_length=1)) -> dict[str, Any]:
    def work():
        sym = symbol.strip().upper()
        try:
            ib = _get_ib()
            stock = Stock(sym, "SMART", "USD")
            details_list = ib.reqContractDetails(stock) or []
            if not details_list:
                resolved = _resolve_stock(sym)
                return _map_contract_details(sym, resolved, resolved)
            return _map_contract_details(sym, stock, details_list[0])
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, PRIORITY_HIGH)


@app.get("/candles")
def candles(
    symbol: str = Query(min_length=1),
    interval: str = Query(default="1d"),
    range: str = Query(default="1mo", alias="range"),
    before: int | None = None,
    barCount: int | None = None,
    sessionMode: str = Query(default="regular"),
) -> dict[str, Any]:
    use_rth = sessionMode.strip().lower() != "extended"

    def work():
        sym = symbol.strip().upper()
        bar_size = INTERVAL_TO_BAR.get(interval, "1 day")
        duration = RANGE_TO_DURATION.get(range, "1 M")
        if before is not None and barCount is not None:
            duration = f"{max(barCount, 1)} D"
        try:
            resolved = _resolve_stock(sym)
            ib = _get_ib()
            end_dt = ""
            if before is not None:
                end_dt = datetime.fromtimestamp(before / 1000, tz=timezone.utc).strftime(
                    "%Y%m%d %H:%M:%S UTC"
                )
            bars = ib.reqHistoricalData(
                resolved,
                endDateTime=end_dt,
                durationStr=duration,
                barSizeSetting=bar_size,
                whatToShow="TRADES",
                useRTH=use_rth,
                formatDate=1,
            )
            mapped = [_map_bar(bar) for bar in bars if _map_bar(bar)["c"] is not None]
            return {
                "symbol": sym,
                "interval": interval,
                "candles": mapped,
                "hasMore": len(mapped) > 0,
                "sessionMode": "extended" if not use_rth else "regular",
            }
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work)


@app.post("/quotes")
def quotes(body: QuotesRequest) -> dict[str, Any]:
    symbols = sorted({s.strip().upper() for s in body.symbols if s.strip()})

    def work():
        try:
            return _fetch_quotes(symbols)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, PRIORITY_QUOTES)


@app.get("/options/expirations")
def option_expirations(underlying: str = Query(min_length=1)) -> dict[str, Any]:
    def work():
        sym = underlying.strip().upper()
        warnings: list[str] = []
        try:
            stock = _resolve_stock(sym)
            chains = _get_secdef_chains(sym, stock)
            expirations: set[str] = set()
            for chain in chains:
                for raw in chain.expirations or []:
                    if len(raw) == 8 and raw.isdigit():
                        expirations.add(_expiration_from_yyyymmdd(raw))
            rows = [{"underlying": sym, "expiration": exp} for exp in sorted(expirations)]
            if not rows:
                warnings.append("TWS returned no option expirations")
            return {"expirations": rows, "warnings": warnings}
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, PRIORITY_OPTIONS)


@app.get("/options/chain")
def option_chain(
    underlying: str = Query(min_length=1),
    expiration: str = Query(min_length=8),
    strikeWindow: str | None = None,
) -> dict[str, Any]:
    window: dict[str, Any] | None = None
    if strikeWindow:
        try:
            window = json.loads(strikeWindow)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid strikeWindow JSON") from exc

    def work():
        sym = underlying.strip().upper()
        expiration_yyyymmdd = _expiration_to_yyyymmdd(expiration)
        try:
            return _fetch_option_chain(sym, expiration, expiration_yyyymmdd, window)
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, PRIORITY_OPTIONS)


@app.get("/stream/quotes")
def stream_quotes(symbols: str = Query(min_length=1)) -> StreamingResponse:
    symbol_list = sorted({s.strip().upper() for s in symbols.split(",") if s.strip()})
    if not symbol_list:
        raise HTTPException(status_code=400, detail="No symbols provided")

    def event_generator():
        primed = False
        while True:
            with _recovery_lock:
                paused = _reconnect_paused
            if paused:
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "error",
                            "message": "Reconnect in progress",
                            "recoverable": True,
                            "code": "reconnecting",
                        }
                    )
                    + "\n\n"
                )
                time.sleep(1)
                continue
            try:
                payload = run_on_ib_thread(
                    lambda: _fetch_quotes(symbol_list),
                    PRIORITY_QUOTES,
                    job_name="stream_quotes",
                )
                event_type = "snapshot" if not primed else "update"
                primed = True
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": event_type,
                            "quotes": payload["quotes"],
                            "meta": {
                                "source": "tws",
                                "asOf": _now_ms(),
                                "streaming": True,
                            },
                        }
                    )
                    + "\n\n"
                )
            except Exception as exc:  # noqa: BLE001
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "error",
                            "message": str(exc),
                            "recoverable": True,
                        }
                    )
                    + "\n\n"
                )
            time.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/account/status")
def account_status() -> dict[str, Any]:
    _require_brokerage_enabled()

    def work():
        try:
            _get_ib()
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return _account_status_payload()

    return run_on_ib_thread(work, PRIORITY_HIGH)


@app.get("/account/summary")
def account_summary() -> dict[str, Any]:
    _require_brokerage_enabled()

    def work():
        try:
            ib = _get_ib()
            if _account_summary_updated_at == 0:
                try:
                    ib.reqAccountSummary()
                    for item in ib.accountSummary():
                        _on_update_account_value(item)
                except Exception:  # noqa: BLE001
                    pass
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return _account_summary_payload()

    return run_on_ib_thread(work, PRIORITY_HIGH)


@app.get("/account/positions")
def account_positions() -> dict[str, Any]:
    _require_brokerage_enabled()

    def work():
        try:
            ib = _get_ib()
            for pos in ib.positions():
                key = _portfolio_key(pos.contract)
                with _account_lock:
                    _account_positions_raw[key] = {
                        "account": pos.account,
                        "contract": _map_contract(pos.contract),
                        "position": _safe_float(pos.position),
                        "avgCost": _safe_float(pos.avgCost),
                        "updatedAt": _now_ms(),
                    }
            _seed_portfolio_market_data(ib)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        return {"positions": _merge_positions(), "updatedAt": _now_ms()}

    return run_on_ib_thread(work, PRIORITY_HIGH)


@app.get("/account/pnl")
def account_pnl() -> dict[str, Any]:
    _require_brokerage_enabled()

    def work():
        try:
            _get_ib()
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        with _account_lock:
            payload = dict(_account_pnl)
        payload.setdefault("updatedAt", _now_ms())
        return payload

    return run_on_ib_thread(work, PRIORITY_HIGH)


@app.get("/account/orders")
def account_orders() -> dict[str, Any]:
    _require_brokerage_enabled()

    def work():
        try:
            ib = _get_ib()
            if not TWS_READONLY:
                ib.client.reqOpenOrders()
                for trade in ib.openTrades():
                    _on_open_order(trade)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        with _account_lock:
            orders = list(_account_orders.values())
        return {"orders": orders, "updatedAt": _now_ms()}

    return run_on_ib_thread(work, PRIORITY_HIGH)


@app.get("/account/trades")
def account_trades() -> dict[str, Any]:
    _require_brokerage_enabled()

    def work():
        try:
            ib = _get_ib()
            ib.reqExecutions()
            ib.sleep(1.5)
            fills = list(ib.fills())
            mapped = [_map_execution_from_fill(fill) for fill in fills]
            if len(mapped) > 200:
                mapped = mapped[-200:]
            with _account_lock:
                _account_executions.clear()
                for row in mapped:
                    _account_executions.append(row)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        with _account_lock:
            executions = list(_account_executions)[-100:]
        return {"executions": executions, "updatedAt": _now_ms()}

    return run_on_ib_thread(work, PRIORITY_HIGH)


@app.post("/account/whatif")
def account_whatif(body: WhatIfRequest) -> dict[str, Any]:
    _require_brokerage_enabled()
    if TWS_READONLY:
        raise HTTPException(
            status_code=403,
            detail="What-if preview requires TWS_READONLY=false for the IB API session.",
        )

    def work():
        sym = body.symbol.strip().upper()
        action = body.action.upper()
        try:
            ib = _get_ib()
            contract = _resolve_stock(sym)
            if body.orderType.upper() == "MKT":
                order = MarketOrder(action, body.quantity)
            else:
                if body.limitPrice is None:
                    raise HTTPException(
                        status_code=400, detail="limitPrice required for LMT orders"
                    )
                order = LimitOrder(action, body.quantity, body.limitPrice)
            order.account = _resolve_account_id(ib)
            order.transmit = False
            state = ib.whatIfOrder(contract, order)
            return {
                "symbol": sym,
                "action": action,
                "quantity": body.quantity,
                "orderType": body.orderType.upper(),
                "limitPrice": body.limitPrice,
                "initMarginChange": _safe_float(getattr(state, "initMarginChange", None)),
                "maintMarginChange": _safe_float(getattr(state, "maintMarginChange", None)),
                "equityWithLoanChange": _safe_float(
                    getattr(state, "equityWithLoanChange", None)
                ),
                "commission": _safe_float(getattr(state, "commission", None)),
                "minCommission": _safe_float(getattr(state, "minCommission", None)),
                "maxCommission": _safe_float(getattr(state, "maxCommission", None)),
                "warningText": getattr(state, "warningText", None),
                "updatedAt": _now_ms(),
            }
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return run_on_ib_thread(work, PRIORITY_HIGH)


@app.get("/stream/account")
def stream_account() -> StreamingResponse:
    _require_brokerage_enabled()

    def event_generator():
        primed = False
        while True:
            with _recovery_lock:
                paused = _reconnect_paused
            if paused:
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "error",
                            "message": "Reconnect in progress",
                            "recoverable": True,
                            "code": "reconnecting",
                        }
                    )
                    + "\n\n"
                )
                time.sleep(1)
                continue
            try:
                payload = run_on_ib_thread(
                    lambda: (_get_ib(), _account_stream_payload())[1],
                    PRIORITY_HIGH,
                    job_name="stream_account",
                )
                if not primed:
                    payload = {**payload, "type": "snapshot"}
                    primed = True
                yield "data: " + json.dumps(payload) + "\n\n"
            except Exception as exc:  # noqa: BLE001
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "error",
                            "message": str(exc),
                            "recoverable": True,
                        }
                    )
                    + "\n\n"
                )
            time.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=SIDECAR_PORT, log_level="info")
