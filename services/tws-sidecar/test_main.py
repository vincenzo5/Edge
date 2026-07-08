"""Regression tests for TWS sidecar account cache helpers."""

from __future__ import annotations

import importlib
import sys
import unittest
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


class HealthEndpointTests(unittest.TestCase):
    def test_health_includes_ownership_fields(self) -> None:
        body = main.health()
        self.assertTrue(body.get("ok"))
        self.assertIn("pid", body)
        self.assertIn("instanceId", body)
        self.assertIn("managedBy", body)
        self.assertEqual(body["managedBy"], main.TWS_MANAGED_BY)


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


if __name__ == "__main__":
    unittest.main()
