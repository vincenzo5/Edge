"""Regression tests for TWS sidecar account cache helpers."""

from __future__ import annotations

import importlib
import sys
import unittest
from unittest import mock
from pathlib import Path

SIDECAR_DIR = Path(__file__).resolve().parent
if str(SIDECAR_DIR) not in sys.path:
    sys.path.insert(0, str(SIDECAR_DIR))

main = importlib.import_module("main")


class ExecutionMappingTests(unittest.TestCase):
    def setUp(self) -> None:
        with main._account_lock:
            main._account_executions.clear()

    class _Contract:
        def __init__(self, **kwargs) -> None:
            for key, value in kwargs.items():
                setattr(self, key, value)

    class _Execution:
        def __init__(self, **kwargs) -> None:
            for key, value in kwargs.items():
                setattr(self, key, value)

    class _Commission:
        def __init__(self, **kwargs) -> None:
            for key, value in kwargs.items():
                setattr(self, key, value)

    class _Fill:
        def __init__(self, contract, execution, commission_report=None) -> None:
            self.contract = contract
            self.execution = execution
            self.commissionReport = commission_report

    def test_map_execution_from_fill_stock(self) -> None:
        fill = self._Fill(
            contract=self._Contract(conId=1, symbol="AAPL", secType="STK"),
            execution=self._Execution(
                execId="e1",
                side="BOT",
                shares=10,
                price=150.0,
                orderRef="ref-1",
            ),
        )
        mapped = main._map_execution_from_fill(fill)
        self.assertEqual(mapped["execId"], "e1")
        self.assertEqual(mapped["orderRef"], "ref-1")
        self.assertEqual(mapped["contract"]["conId"], 1)
        self.assertEqual(mapped["contract"]["secType"], "STK")

    def test_map_execution_from_fill_option(self) -> None:
        fill = self._Fill(
            contract=self._Contract(
                conId=2,
                symbol="AAPL",
                secType="OPT",
                strike=200.0,
                right="C",
                lastTradeDateOrContractMonth="20260718",
                localSymbol="AAPL  260718C00200000",
            ),
            execution=self._Execution(execId="e2", side="SLD", shares=1, price=2.5),
        )
        mapped = main._map_execution_from_fill(fill)
        self.assertEqual(mapped["contract"]["strike"], 200.0)
        self.assertEqual(mapped["contract"]["right"], "C")

    def test_upsert_execution_dedupes_by_exec_id(self) -> None:
        fill = self._Fill(
            contract=self._Contract(conId=1, symbol="AAPL", secType="STK"),
            execution=self._Execution(execId="e1", side="BOT", shares=10, price=150.0),
        )
        with main._account_lock:
            main._upsert_execution(main._map_execution_from_fill(fill))
            self.assertEqual(len(main._account_executions), 1)
            self.assertIsNone(main._account_executions[0].get("commission"))

            commission_fill = self._Fill(
                contract=self._Contract(conId=1, symbol="AAPL", secType="STK"),
                execution=self._Execution(execId="e1", side="BOT", shares=10, price=150.0),
                commission_report=self._Commission(commission=1.0, currency="USD", realizedPNL=50.0),
            )
            main._upsert_execution(
                main._map_execution_from_fill(commission_fill, commission_report=commission_fill.commissionReport)
            )
            self.assertEqual(len(main._account_executions), 1)
            self.assertEqual(main._account_executions[0]["commission"], 1.0)
            self.assertEqual(main._account_executions[0]["realizedPNL"], 50.0)


class EphemeralAccountIdTests(unittest.TestCase):
    class _Ib:
        def __init__(self, managed: list[str]) -> None:
            self._managed = managed

        def managedAccounts(self) -> list[str]:
            return self._managed

    def test_ephemeral_uses_live_account_pin_not_paper(self) -> None:
        with mock.patch.object(main, "TWS_ACCOUNT_ID", "DUP586813"), mock.patch.object(
            main, "TWS_LIVE_ACCOUNT_ID", "U25026894"
        ):
            account_id = main._resolve_ephemeral_account_id(self._Ib(["DUP586813"]))
        self.assertEqual(account_id, "U25026894")

    def test_ephemeral_falls_back_to_managed_when_live_pin_unset(self) -> None:
        with mock.patch.object(main, "TWS_ACCOUNT_ID", "DUP586813"), mock.patch.object(
            main, "TWS_LIVE_ACCOUNT_ID", ""
        ):
            account_id = main._resolve_ephemeral_account_id(self._Ib(["U25026894"]))
        self.assertEqual(account_id, "U25026894")


class AccountCacheTests(unittest.TestCase):
    def setUp(self) -> None:
        with main._account_lock:
            main._account_positions_raw.clear()
            main._account_portfolio.clear()
            main._account_executions.clear()

    def test_executions_cache_is_list(self) -> None:
        self.assertIsInstance(main._account_executions, list)

    def test_merge_positions_prefers_portfolio_market_data(self) -> None:
        key = 12345
        with main._account_lock:
            main._account_positions_raw[key] = {
                "account": "U123",
                "contract": {"symbol": "HOOD", "conId": key},
                "position": 700.0,
                "avgCost": 103.10,
                "updatedAt": 1,
            }
            main._account_portfolio[key] = {
                "account": "U123",
                "contract": {"symbol": "HOOD", "conId": key},
                "position": 700.0,
                "averageCost": 103.10,
                "marketPrice": 108.02,
                "marketValue": 75614.0,
                "unrealizedPNL": 3441.0,
                "updatedAt": 2,
            }

        rows = main._merge_positions()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["contract"]["symbol"], "HOOD")
        self.assertEqual(rows[0]["marketPrice"], 108.02)
        self.assertEqual(rows[0]["unrealizedPNL"], 3441.0)

    def test_merge_positions_market_price_none_when_portfolio_missing(self) -> None:
        key = 67890
        with main._account_lock:
            main._account_positions_raw[key] = {
                "account": "U123",
                "contract": {"symbol": "HOOD", "conId": key},
                "position": 700.0,
                "avgCost": 103.10,
                "updatedAt": 1,
            }

        rows = main._merge_positions()
        self.assertEqual(len(rows), 1)
        self.assertIsNone(rows[0]["marketPrice"])
        self.assertIsNone(rows[0]["unrealizedPNL"])

    def test_merge_ephemeral_position_rows_prefers_portfolio_market_data(self) -> None:
        portfolio_rows = [
            {
                "account": "U123",
                "contract": {"symbol": "HOOD", "conId": 12345},
                "position": 700.0,
                "avgCost": 103.10,
                "marketPrice": 108.02,
                "marketValue": 75614.0,
                "unrealizedPNL": 3441.0,
                "updatedAt": 2,
            }
        ]
        raw_rows = [
            {
                "account": "U123",
                "contract": {"symbol": "HOOD", "conId": 12345},
                "position": 700.0,
                "avgCost": 103.10,
                "updatedAt": 1,
            }
        ]
        rows = main._merge_ephemeral_position_rows(portfolio_rows, raw_rows)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["marketPrice"], 108.02)
        self.assertEqual(rows[0]["unrealizedPNL"], 3441.0)


class EphemeralPnLTests(unittest.TestCase):
    def test_ephemeral_pnl_reads_existing_subscription(self) -> None:
        pnl_obj = mock.MagicMock()
        pnl_obj.dailyPnL = 125.5
        pnl_obj.unrealizedPnL = 500.0
        pnl_obj.realizedPnL = -25.0
        ib = mock.MagicMock()
        ib.pnl.return_value = [pnl_obj]
        with mock.patch.object(main, "_resolve_ephemeral_account_id", return_value="U123"):
            payload = main._ephemeral_pnl(ib)
        self.assertEqual(payload["account"], "U123")
        self.assertEqual(payload["dailyPnL"], 125.5)
        self.assertEqual(payload["unrealizedPnL"], 500.0)
        ib.reqPnL.assert_not_called()

    def test_ephemeral_pnl_subscribes_when_missing(self) -> None:
        pnl_obj = mock.MagicMock()
        pnl_obj.dailyPnL = 10.0
        pnl_obj.unrealizedPnL = 20.0
        pnl_obj.realizedPnL = 0.0
        ib = mock.MagicMock()
        ib.pnl.side_effect = [[], [pnl_obj]]
        with mock.patch.object(main, "_resolve_ephemeral_account_id", return_value="U123"):
            payload = main._ephemeral_pnl(ib)
        self.assertEqual(payload["dailyPnL"], 10.0)
        ib.reqPnL.assert_called_once_with("U123")
        ib.cancelPnL.assert_called_once_with("U123")

    def test_ephemeral_pnl_persistent_connection_keeps_subscription(self) -> None:
        pnl_obj = mock.MagicMock()
        pnl_obj.dailyPnL = 15.0
        pnl_obj.unrealizedPnL = 30.0
        pnl_obj.realizedPnL = 0.0
        ib = mock.MagicMock()
        ib.pnl.return_value = [pnl_obj]
        with mock.patch.object(main, "_resolve_ephemeral_account_id", return_value="U123"):
            with mock.patch.object(main, "_ensure_extra_account_subscriptions") as ensure:
                payload = main._ephemeral_pnl(ib, main.IB_LIVE_CONNECTION_ID)
        self.assertEqual(payload["dailyPnL"], 15.0)
        ensure.assert_called_once_with(ib, main.IB_LIVE_CONNECTION_ID)
        ib.cancelPnL.assert_not_called()


class EphemeralPositionMarketDataTests(unittest.TestCase):
    def test_seed_ephemeral_position_market_data_fills_missing_pnl(self) -> None:
        ib = mock.MagicMock()
        ticker = mock.MagicMock()
        ticker.last = 25.5
        ticker.close = None
        ib.qualifyContracts.return_value = [mock.MagicMock()]
        ib.reqMktData.return_value = ticker
        rows = main._seed_ephemeral_position_market_data(
            ib,
            [
                {
                    "account": "U123",
                    "contract": {"symbol": "BRUN", "conId": 999},
                    "position": 1400.0,
                    "avgCost": 24.91,
                }
            ],
        )
        self.assertEqual(rows[0]["marketPrice"], 25.5)
        self.assertEqual(rows[0]["unrealizedPNL"], (25.5 - 24.91) * 1400.0)


class HealthEndpointTests(unittest.TestCase):
    def test_health_includes_ownership_fields(self) -> None:
        body = main.health()
        self.assertTrue(body.get("ok"))
        self.assertIn("pid", body)
        self.assertIn("instanceId", body)
        self.assertIn("managedBy", body)
        self.assertEqual(body["managedBy"], main.TWS_MANAGED_BY)

    def test_status_includes_paper_and_live_connections(self) -> None:
        body = main._status_payload()
        connections = body.get("connections")
        self.assertIsInstance(connections, dict)
        self.assertIn(main.PRIMARY_CONNECTION_ID, connections)
        self.assertIn(main.IB_LIVE_CONNECTION_ID, connections)
        paper = connections[main.PRIMARY_CONNECTION_ID]
        live = connections[main.IB_LIVE_CONNECTION_ID]
        self.assertEqual(paper["connectionId"], main.PRIMARY_CONNECTION_ID)
        self.assertEqual(live["connectionId"], main.IB_LIVE_CONNECTION_ID)
        self.assertEqual(paper["port"], main.TWS_PAPER_PORT)
        self.assertEqual(live["port"], main.TWS_LIVE_PORT)
        self.assertIn("gatewayConnected", paper)
        self.assertIn("gatewayConnected", live)
        for row in (paper, live):
            self.assertIn("connectionState", row)
            self.assertIn("observationConfidence", row)
            self.assertIn("observedAt", row)
            self.assertIn("subscriptionsLost", row)


class SidecarSecretTests(unittest.TestCase):
    def test_secret_helper_allows_health_without_header(self) -> None:
        original = main.TWS_SIDECAR_SECRET
        try:
            main.TWS_SIDECAR_SECRET = "test-secret"
            self.assertTrue(main._sidecar_secret_allowed("/health", {}))
            self.assertFalse(main._sidecar_secret_allowed("/status", {}))
            self.assertTrue(
                main._sidecar_secret_allowed(
                    "/status",
                    {main.EDGE_SIDECAR_SECRET_HEADER: "test-secret"},
                )
            )
        finally:
            main.TWS_SIDECAR_SECRET = original

    def test_secret_helper_allows_all_routes_when_unconfigured(self) -> None:
        original = main.TWS_SIDECAR_SECRET
        try:
            main.TWS_SIDECAR_SECRET = ""
            self.assertTrue(main._sidecar_secret_allowed("/status", {}))
        finally:
            main.TWS_SIDECAR_SECRET = original


class TradingGuardTests(unittest.TestCase):
    def test_require_trading_enabled_allows_live_connection(self) -> None:
        resolved = main._require_trading_enabled(main.IB_LIVE_CONNECTION_ID)
        self.assertEqual(resolved, main.IB_LIVE_CONNECTION_ID)

    def test_resolve_connection_id_maps_environment(self) -> None:
        self.assertEqual(main._resolve_connection_id(environment="live"), main.IB_LIVE_CONNECTION_ID)
        self.assertEqual(main._resolve_connection_id(environment="paper"), main.PRIMARY_CONNECTION_ID)

    def test_resolve_connection_id_accepts_explicit_connections(self) -> None:
        self.assertEqual(main._resolve_connection_id("ib-paper"), main.PRIMARY_CONNECTION_ID)
        self.assertEqual(main._resolve_connection_id("ib-live"), main.IB_LIVE_CONNECTION_ID)

    def test_resolve_connection_id_missing_defaults_to_primary(self) -> None:
        self.assertEqual(main._resolve_connection_id(None), main.PRIMARY_CONNECTION_ID)

    def test_resolve_connection_id_rejects_unknown(self) -> None:
        with self.assertRaises(main.HTTPException) as ctx:
            main._resolve_connection_id("bogus")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Unknown connectionId", ctx.exception.detail)

    def test_build_stock_order_lmt_requires_limit_price(self) -> None:
        with self.assertRaises(main.HTTPException) as ctx:
            main._build_stock_order(
                action="BUY",
                quantity=1,
                order_type="LMT",
                limit_price=None,
                account="DUP586813",
                transmit=True,
            )
        self.assertEqual(ctx.exception.status_code, 400)

    def test_build_stock_order_mkt_sets_transmit(self) -> None:
        order = main._build_stock_order(
            action="buy",
            quantity=2,
            order_type="MKT",
            limit_price=None,
            account="DUP586813",
            transmit=True,
            order_ref="edge-test",
        )
        self.assertEqual(order.action, "BUY")
        self.assertTrue(order.transmit)
        self.assertEqual(order.orderRef, "edge-test")

    def test_build_stock_order_stp_requires_stop_price(self) -> None:
        with self.assertRaises(main.HTTPException) as ctx:
            main._build_stock_order(
                action="BUY",
                quantity=1,
                order_type="STP",
                limit_price=None,
                stop_price=None,
                account="DUP586813",
                transmit=True,
            )
        self.assertEqual(ctx.exception.status_code, 400)

    def test_build_stock_order_stp_sets_aux_price(self) -> None:
        order = main._build_stock_order(
            action="BUY",
            quantity=1,
            order_type="STP",
            limit_price=None,
            stop_price=8.5,
            account="DUP586813",
            transmit=True,
            outside_rth=False,
        )
        self.assertEqual(order.orderType, "STP")
        self.assertEqual(order.auxPrice, 8.5)
        self.assertFalse(order.outsideRth)

    def test_build_stock_order_stp_lmt_sets_both_prices(self) -> None:
        order = main._build_stock_order(
            action="SELL",
            quantity=2,
            order_type="STP LMT",
            limit_price=9.25,
            stop_price=9.0,
            account="DUP586813",
            transmit=True,
        )
        self.assertEqual(order.orderType, "STP LMT")
        self.assertEqual(order.auxPrice, 9.0)
        self.assertEqual(order.lmtPrice, 9.25)

    def test_place_order_request_accepts_stp(self) -> None:
        req = main.PlaceOrderRequest(
            accountId="DUP586813",
            symbol="F",
            action="BUY",
            quantity=1,
            orderType="STP",
            stopPrice=8.5,
        )
        self.assertEqual(req.orderType, "STP")
        self.assertEqual(req.stopPrice, 8.5)

    def test_validate_account_id_rejects_unknown(self) -> None:
        class _FakeIb:
            def managedAccounts(self):
                return ["DUP586813"]

        with self.assertRaises(main.HTTPException) as ctx:
            main._validate_account_id(_FakeIb(), "U999999")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_place_order_request_rejects_invalid_action(self) -> None:
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            main.PlaceOrderRequest(
                accountId="DUP586813",
                symbol="AAPL",
                action="HOLD",
                quantity=1,
                orderType="MKT",
            )


class TradingModifyTests(unittest.TestCase):
    def test_map_order_includes_order_ref(self) -> None:
        class _Order:
            orderId = 7
            permId = 99
            clientId = 1
            account = "DUP586813"
            action = "BUY"
            totalQuantity = 1
            orderType = "LMT"
            lmtPrice = 10.0
            auxPrice = None
            tif = "DAY"
            status = "Submitted"
            filled = 0
            remaining = 1
            avgFillPrice = None
            lastFillPrice = None
            whyHeld = None
            orderRef = "edge-intent-abc"

        class _Contract:
            symbol = "F"
            secType = "STK"
            conId = 123

        mapped = main._map_order(_Order(), _Contract())
        self.assertEqual(mapped["orderRef"], "edge-intent-abc")
        self.assertEqual(mapped["status"], "Submitted")

    def test_map_order_reads_status_from_trade_order_status(self) -> None:
        class _Order:
            orderId = 8
            permId = 100
            clientId = 1
            account = "DUP586813"
            action = "BUY"
            totalQuantity = 1
            orderType = "LMT"
            lmtPrice = 1.0
            auxPrice = None
            tif = "GTC"
            orderRef = "edge-intent-xyz"

        class _OrderStatus:
            status = "Submitted"
            filled = 0
            remaining = 1
            avgFillPrice = 0.0
            lastFillPrice = 0.0
            whyHeld = ""

        class _Contract:
            symbol = "F"
            secType = "STK"
            conId = 123

        class _Trade:
            order = _Order()
            contract = _Contract()
            orderStatus = _OrderStatus()

        trade = _Trade()
        mapped = main._map_order(trade.order, trade.contract, trade)
        self.assertEqual(mapped["status"], "Submitted")
        self.assertEqual(mapped["filled"], 0.0)
        self.assertEqual(mapped["remaining"], 1.0)

    def test_modify_order_request_requires_patch_field(self) -> None:
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            main.ModifyOrderRequest(accountId="DUP586813")

    def test_apply_order_modify_patch_updates_lmt_price(self) -> None:
        class _Order:
            orderType = "LMT"
            totalQuantity = 1
            lmtPrice = 10.0
            tif = "DAY"

        order = _Order()
        body = main.ModifyOrderRequest(
            accountId="DUP586813",
            limitPrice=12.5,
        )
        main._apply_order_modify_patch(order, body)
        self.assertEqual(order.lmtPrice, 12.5)

    def test_apply_order_modify_patch_rejects_limit_on_mkt(self) -> None:
        class _Order:
            orderType = "MKT"
            totalQuantity = 1
            tif = "DAY"

        body = main.ModifyOrderRequest(
            accountId="DUP586813",
            limitPrice=12.5,
        )
        with self.assertRaises(main.HTTPException) as ctx:
            main._apply_order_modify_patch(_Order(), body)
        self.assertEqual(ctx.exception.status_code, 400)


    def test_apply_order_modify_patch_updates_stp_aux_price(self) -> None:
        class _Order:
            orderType = "STP"
            totalQuantity = 1
            auxPrice = 8.0
            tif = "DAY"

        order = _Order()
        body = main.ModifyOrderRequest(
            accountId="DUP586813",
            stopPrice=8.75,
        )
        main._apply_order_modify_patch(order, body)
        self.assertEqual(order.auxPrice, 8.75)

    def test_apply_order_modify_patch_rejects_stop_on_mkt(self) -> None:
        class _Order:
            orderType = "MKT"
            totalQuantity = 1
            tif = "DAY"

        body = main.ModifyOrderRequest(
            accountId="DUP586813",
            stopPrice=8.75,
        )
        with self.assertRaises(main.HTTPException) as ctx:
            main._apply_order_modify_patch(_Order(), body)
        self.assertEqual(ctx.exception.status_code, 400)


class ReconnectResetTests(unittest.TestCase):
    def setUp(self) -> None:
        main._reset_ib_connection()

    def test_reset_clears_extra_connections(self) -> None:
        mock_ib = mock.MagicMock()
        mock_ib.isConnected.return_value = True
        main._ib_extra["ib-live"] = mock_ib
        main._reset_ib_connection()
        mock_ib.disconnect.assert_called_once()
        self.assertEqual(len(main._ib_extra), 0)

    @mock.patch.object(main, "_get_ib_for_connection")
    @mock.patch.object(main, "_get_ib")
    def test_reconnect_ib_attempts_extra_connections(
        self,
        mock_get_ib: mock.MagicMock,
        mock_get_extra: mock.MagicMock,
    ) -> None:
        mock_get_ib.return_value = mock.MagicMock()
        mock_get_ib.return_value.isConnected.return_value = True
        main._reconnect_ib()
        mock_get_extra.assert_any_call("ib-live")


class AutoReconnectSupervisorTests(unittest.TestCase):
    def setUp(self) -> None:
        main._reset_auto_reconnect_attempts()
        with main._auto_reconnect_lock:
            main._auto_reconnect_thread = None
        with main._recovery_lock:
            main._recovery_phase = "idle"
            main._recovery_message = None

    def tearDown(self) -> None:
        main._reset_auto_reconnect_attempts()
        with main._auto_reconnect_lock:
            main._auto_reconnect_thread = None

    def test_backoff_caps_at_thirty_seconds(self) -> None:
        self.assertEqual(main._auto_reconnect_backoff_sec(1), 2.0)
        self.assertEqual(main._auto_reconnect_backoff_sec(2), 4.0)
        self.assertEqual(main._auto_reconnect_backoff_sec(3), 8.0)
        self.assertEqual(main._auto_reconnect_backoff_sec(10), 30.0)

    def test_status_includes_auto_reconnect_diagnostics(self) -> None:
        with main._auto_reconnect_lock:
            main._auto_reconnect_attempt = 2
        body = main._status_payload()
        recovery = body["diagnostics"]["recovery"]
        self.assertEqual(recovery["autoReconnectAttempt"], 2)
        self.assertEqual(recovery["autoReconnectMaxAttempts"], 5)

    @mock.patch.object(main, "_reconnect_ib")
    @mock.patch.object(main, "_active_trading_mutation", return_value=False)
    @mock.patch.object(main.time, "sleep", return_value=None)
    def test_record_ib_error_1100_schedules_auto_reconnect(
        self,
        _mock_sleep: mock.MagicMock,
        _mock_trading: mock.MagicMock,
        mock_reconnect: mock.MagicMock,
    ) -> None:
        def reconnect_with_worker_loop() -> dict[str, bool]:
            self.assertFalse(main.asyncio.get_event_loop().is_closed())
            return {"gatewayConnected": True}

        mock_reconnect.side_effect = reconnect_with_worker_loop
        main._record_ib_error(1100, "Connectivity lost")
        with main._auto_reconnect_lock:
            thread = main._auto_reconnect_thread
        self.assertIsNotNone(thread)
        thread.join(timeout=2.0)
        mock_reconnect.assert_called()
        self.assertEqual(main._auto_reconnect_attempt, 0)

    @mock.patch.object(main, "_maybe_schedule_auto_reconnect")
    def test_on_ib_disconnected_schedules_auto_reconnect(
        self,
        mock_schedule: mock.MagicMock,
    ) -> None:
        main._on_ib_disconnected()
        mock_schedule.assert_called_once()


class ConnectionRoutingEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from fastapi.testclient import TestClient

        cls.client = TestClient(main.app)

    def test_account_trades_rejects_unknown_connection_id(self) -> None:
        response = self.client.get("/account/trades?connectionId=bogus")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unknown connectionId", response.json()["detail"])

    def test_account_status_rejects_unknown_connection_id(self) -> None:
        response = self.client.get("/account/status?connectionId=bogus")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unknown connectionId", response.json()["detail"])

    def test_stream_account_rejects_unknown_connection_id(self) -> None:
        response = self.client.get("/stream/account?connectionId=bogus")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unknown connectionId", response.json()["detail"])

    def test_quotes_rejects_unknown_connection_id(self) -> None:
        response = self.client.post("/quotes", json={"symbols": ["AAPL"], "connectionId": "bogus"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unknown connectionId", response.json()["detail"])

    def test_candles_rejects_unknown_connection_id(self) -> None:
        response = self.client.get(
            "/candles?symbol=AAPL&interval=1d&range=1mo&connectionId=bogus"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unknown connectionId", response.json()["detail"])

    def test_stream_quotes_rejects_unknown_connection_id(self) -> None:
        response = self.client.get("/stream/quotes?symbols=AAPL&connectionId=bogus")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unknown connectionId", response.json()["detail"])


class AccountStatusWarmCacheTests(unittest.TestCase):
    def setUp(self) -> None:
        main._ib = None
        with main._account_lock:
            main._managed_accounts.clear()
            main._account_id = ""
            main._account_subscriptions_active = False

    def test_primary_account_status_uses_warm_cache_without_ib_queue(self) -> None:
        with main._account_lock:
            main._managed_accounts[:] = ["DUP586813"]
            main._account_id = "DUP586813"
            main._account_subscriptions_active = True

        with mock.patch.object(main, "run_on_ib_thread") as run_on_ib_thread:
            body = main.account_status(connectionId="ib-paper")

        self.assertEqual(body["managedAccounts"], ["DUP586813"])
        self.assertEqual(body["accountId"], "DUP586813")
        run_on_ib_thread.assert_not_called()


class HistoricalDataTimeoutTests(unittest.TestCase):
    def test_historical_timeout_is_below_default_ib_job_wait(self) -> None:
        self.assertLess(main.HISTORICAL_DATA_TIMEOUT_SEC, main.DEFAULT_IB_JOB_WAIT_SEC)


class ContractCharacterizationTests(unittest.TestCase):
    """Frozen HTTP contract shapes — must pass unchanged through refactor."""

    REQUIRED_HEALTH_KEYS = frozenset(
        {
            "ok",
            "timestamp",
            "startedAt",
            "version",
            "pid",
            "instanceId",
            "managedBy",
            "host",
            "port",
            "clientId",
            "sidecarPort",
            "capabilities",
        }
    )

    REQUIRED_STATUS_KEYS = frozenset(
        {
            "configured",
            "sidecarReachable",
            "gatewayConnected",
            "connectionState",
            "diagnostics",
            "connections",
            "warnings",
        }
    )

    REQUIRED_CAPABILITY_KEYS = frozenset(
        {"controlRecovery", "controlReconnect", "streamQuotes", "brokerage"}
    )

    def test_health_contract_shape(self) -> None:
        body = main.health()
        self.assertTrue(set(body.keys()) >= self.REQUIRED_HEALTH_KEYS)
        caps = body["capabilities"]
        self.assertTrue(set(caps.keys()) >= self.REQUIRED_CAPABILITY_KEYS)

    def test_status_contract_shape(self) -> None:
        body = main._status_payload()
        self.assertTrue(set(body.keys()) >= self.REQUIRED_STATUS_KEYS)
        diagnostics = body["diagnostics"]
        self.assertIn("recovery", diagnostics)
        self.assertIn("workerWedged", diagnostics)
        self.assertIn("queueDepth", diagnostics)

    def test_connections_map_has_paper_and_live(self) -> None:
        connections = main._connections_map()
        self.assertEqual(
            set(connections.keys()),
            {main.PRIMARY_CONNECTION_ID, main.IB_LIVE_CONNECTION_ID},
        )


if __name__ == "__main__":
    unittest.main()
