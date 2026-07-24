"""FastAPI application factory and middleware."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from tws_sidecar import config
from tws_sidecar.auth import _sidecar_secret_allowed
from tws_sidecar.runtime.connections import _reset_ib_connection
from tws_sidecar.runtime.supervisor import _set_connection_state


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    yield
    _set_connection_state("shutdown")
    _reset_ib_connection()


app = FastAPI(title="Edge TWS Sidecar", version=config.SIDECAR_VERSION, lifespan=_lifespan)


@app.middleware("http")
async def _sidecar_secret_middleware(request: Request, call_next):
    if not _sidecar_secret_allowed(request.url.path, request.headers):
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)
