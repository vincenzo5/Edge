"""TWS sidecar — pure utilities."""

from __future__ import annotations

import re
import time
from typing import Any

def now_ms() -> int:
    return int(time.time() * 1000)


def safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if num != num:
        return None
    return num


def expiration_to_yyyymmdd(expiration: str) -> str:
    raw = expiration.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return raw.replace("-", "")
    if re.fullmatch(r"\d{8}", raw):
        return raw
    raise ValueError(f"Invalid expiration format: {expiration}")


def expiration_from_yyyymmdd(raw: str) -> str:
    if len(raw) == 8 and raw.isdigit():
        return f"{raw[0:4]}-{raw[4:6]}-{raw[6:8]}"
    return raw


def build_occ_symbol(
    underlying: str, expiration_yyyymmdd: str, right: str, strike: float
) -> str:
    yymmdd = expiration_yyyymmdd[2:]
    strike_part = str(int(round(strike * 1000))).zfill(8)
    return f"{underlying}{yymmdd}{right}{strike_part}"
