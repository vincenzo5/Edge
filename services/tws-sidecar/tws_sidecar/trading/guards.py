"""TWS sidecar — trading guards."""

from __future__ import annotations

from fastapi import HTTPException
from ib_insync import IB

from tws_sidecar.runtime.connections import _resolve_connection_id


def _require_trading_enabled(connection_id: str | None = None) -> str:
    _require_brokerage_enabled()
    return _resolve_connection_id(connection_id=connection_id)


def _validate_account_id(ib: IB, account_id: str) -> str:
    normalized = account_id.strip()
    managed = list(ib.managedAccounts() or [])
    if normalized not in managed:
        raise HTTPException(
            status_code=400,
            detail=f"accountId {normalized!r} not in managed accounts: {managed}",
        )
    return normalized


def _require_brokerage_enabled() -> None:
    return
