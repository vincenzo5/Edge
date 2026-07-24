"use client";

import { useEffect } from "react";
import {
  EDGE_LOCAL_ERROR_EVENT,
  type EdgeLocalErrorDetail,
} from "@edge/chart-react/localErrorEvent";
import { reportLocalError } from "@/lib/observability/reportLocalError";

/** Registers browser-level local error reporting for solo observability. */
export default function LocalErrorReporter() {
  useEffect(() => {
    const onEdgeLocalError = (event: Event): void => {
      const detail = (event as CustomEvent<EdgeLocalErrorDetail>).detail;
      if (!detail?.source || !detail.message) return;
      reportLocalError(detail);
    };

    const onError = (event: ErrorEvent): void => {
      reportLocalError({
        source: "window",
        message: event.message || "Uncaught error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    };

    const onRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason;
      reportLocalError({
        source: "unhandledrejection",
        message: reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection"),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    };

    window.addEventListener(EDGE_LOCAL_ERROR_EVENT, onEdgeLocalError);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener(EDGE_LOCAL_ERROR_EVENT, onEdgeLocalError);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
