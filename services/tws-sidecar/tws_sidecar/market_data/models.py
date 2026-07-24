"""TWS sidecar — market data request models."""

from __future__ import annotations

from pydantic import BaseModel, Field

class QuotesRequest(BaseModel):
    symbols: list[str] = Field(min_length=1, max_length=100)
    connectionId: str | None = None


class WarmupRequest(BaseModel):
    symbols: list[str] = Field(default_factory=list, max_length=50)
    connectionId: str | None = None
