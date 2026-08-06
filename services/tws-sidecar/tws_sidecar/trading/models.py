"""TWS sidecar — trading request models."""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator

TIF_PATTERN = "^(DAY|GTC|IOC|OPG)$"
ORDER_TYPE_PATTERN = "^(LMT|MKT|STP|STP LMT|TRAIL|TRAIL LIMIT|MOC|LOC)$"


class WhatIfRequest(BaseModel):
    symbol: str = Field(min_length=1)
    action: str = Field(pattern="^(BUY|SELL)$")
    quantity: float = Field(gt=0)
    orderType: str = Field(default="LMT", pattern=ORDER_TYPE_PATTERN)
    limitPrice: float | None = None
    stopPrice: float | None = None
    trailPercent: float | None = None
    outsideRth: bool = False
    connectionId: str | None = None

    @model_validator(mode="after")
    def validate_prices(self) -> "WhatIfRequest":
        order_type = self.orderType.upper()
        if order_type == "LMT" and self.limitPrice is None:
            raise ValueError("limitPrice required for LMT orders")
        if order_type == "STP" and self.stopPrice is None:
            raise ValueError("stopPrice required for STP orders")
        if order_type == "STP LMT":
            if self.stopPrice is None:
                raise ValueError("stopPrice required for STP LMT orders")
            if self.limitPrice is None:
                raise ValueError("limitPrice required for STP LMT orders")
        return self


class PlaceOrderRequest(BaseModel):
    accountId: str = Field(min_length=1)
    symbol: str = Field(min_length=1)
    action: str = Field(pattern="^(BUY|SELL)$")
    quantity: float = Field(gt=0)
    orderType: str = Field(default="LMT", pattern=ORDER_TYPE_PATTERN)
    limitPrice: float | None = None
    stopPrice: float | None = None
    trailPercent: float | None = None
    outsideRth: bool = False
    allOrNone: bool = False
    usePriceMgmtAlgo: bool = False
    tif: str = Field(default="DAY", pattern=TIF_PATTERN)
    orderRef: str | None = None
    connectionId: str | None = None

    @model_validator(mode="after")
    def validate_prices(self) -> "PlaceOrderRequest":
        order_type = self.orderType.upper()
        if order_type == "LMT" and self.limitPrice is None:
            raise ValueError("limitPrice required for LMT orders")
        if order_type == "STP" and self.stopPrice is None:
            raise ValueError("stopPrice required for STP orders")
        if order_type == "STP LMT":
            if self.stopPrice is None:
                raise ValueError("stopPrice required for STP LMT orders")
            if self.limitPrice is None:
                raise ValueError("limitPrice required for STP LMT orders")
        if order_type == "LOC" and self.limitPrice is None:
            raise ValueError("limitPrice required for LOC orders")
        if order_type == "TRAIL" and self.stopPrice is None and self.trailPercent is None:
            raise ValueError(
                "stopPrice (trail amount) or trailPercent required for TRAIL orders"
            )
        if order_type == "TRAIL LIMIT":
            if self.stopPrice is None and self.trailPercent is None:
                raise ValueError(
                    "stopPrice (trail amount) or trailPercent required for TRAIL LIMIT orders"
                )
            if self.limitPrice is None:
                raise ValueError("limitPrice required for TRAIL LIMIT orders")
        return self


class ModifyOrderRequest(BaseModel):
    accountId: str = Field(min_length=1)
    quantity: float | None = Field(default=None, gt=0)
    limitPrice: float | None = Field(default=None, gt=0)
    stopPrice: float | None = Field(default=None, gt=0)
    tif: str | None = Field(default=None, pattern=TIF_PATTERN)
    connectionId: str | None = None

    @model_validator(mode="after")
    def require_at_least_one_patch(self) -> "ModifyOrderRequest":
        if (
            self.quantity is None
            and self.limitPrice is None
            and self.stopPrice is None
            and self.tif is None
        ):
            raise ValueError(
                "At least one of quantity, limitPrice, stopPrice, or tif is required"
            )
        return self


class BracketStopLegRequest(BaseModel):
    mode: str = Field(default="fixed", pattern="^(fixed|trail)$")
    stopPrice: float | None = None
    trailAmount: float | None = None
    trailPercent: float | None = None


class BracketOrderRequest(BaseModel):
    accountId: str = Field(min_length=1)
    symbol: str = Field(min_length=1)
    action: str = Field(pattern="^(BUY|SELL)$")
    quantity: float = Field(gt=0)
    orderType: str = Field(
        default="MKT",
        pattern="^(MKT|LMT|STP|STP LMT)$",
    )
    limitPrice: float | None = None
    stopPrice: float | None = None
    trailPercent: float | None = None
    stopLeg: BracketStopLegRequest
    takeProfitPrice: float | None = Field(default=None, gt=0)
    takeProfitQuantity: float | None = Field(default=None, gt=0)
    stopQuantity: float | None = Field(default=None, gt=0)
    outsideRth: bool = False
    tif: str = Field(default="DAY", pattern="^(DAY|GTC)$")
    allOrNone: bool = False
    usePriceMgmtAlgo: bool = False
    orderRef: str | None = None
    connectionId: str | None = None

    @model_validator(mode="after")
    def validate_entry_prices(self) -> "BracketOrderRequest":
        order_type = self.orderType.upper()
        if order_type == "LMT" and self.limitPrice is None:
            raise ValueError("limitPrice required for LMT entry orders")
        if order_type == "STP" and self.stopPrice is None:
            raise ValueError("stopPrice required for STP entry orders")
        if order_type == "STP LMT":
            if self.stopPrice is None:
                raise ValueError("stopPrice required for STP LMT entry orders")
            if self.limitPrice is None:
                raise ValueError("limitPrice required for STP LMT entry orders")
        tp_qty = self.takeProfitQuantity if self.takeProfitQuantity is not None else self.quantity
        stop_qty = self.stopQuantity if self.stopQuantity is not None else self.quantity
        if tp_qty > self.quantity:
            raise ValueError("takeProfitQuantity cannot exceed entry quantity")
        if stop_qty > self.quantity:
            raise ValueError("stopQuantity cannot exceed entry quantity")
        return self


class ProtectiveOcoRequest(BaseModel):
    accountId: str = Field(min_length=1)
    symbol: str = Field(min_length=1)
    action: str = Field(pattern="^(BUY|SELL)$")
    quantity: float = Field(gt=0)
    stopLeg: BracketStopLegRequest
    takeProfitPrice: float | None = Field(default=None, gt=0)
    takeProfitQuantity: float | None = Field(default=None, gt=0)
    stopQuantity: float | None = Field(default=None, gt=0)
    outsideRth: bool = False
    tif: str = Field(default="DAY", pattern="^(DAY|GTC)$")
    orderRef: str | None = None
    connectionId: str | None = None

    @model_validator(mode="after")
    def validate_quantities(self) -> "ProtectiveOcoRequest":
        tp_qty = self.takeProfitQuantity if self.takeProfitQuantity is not None else self.quantity
        stop_qty = self.stopQuantity if self.stopQuantity is not None else self.quantity
        if tp_qty > self.quantity:
            raise ValueError("takeProfitQuantity cannot exceed quantity")
        if stop_qty > self.quantity:
            raise ValueError("stopQuantity cannot exceed quantity")
        return self
