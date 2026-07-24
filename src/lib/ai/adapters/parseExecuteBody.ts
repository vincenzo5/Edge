import type { ExecuteToolOptions, PermissionMode } from "@/lib/ai/types";
import { createConfirmationVerifier } from "@/lib/ai/confirmationToken";

const VALID_MODES = new Set<PermissionMode>(["read", "write", "full"]);

export type ParsedExecuteBody = {
  name: string;
  input: unknown;
  permissionMode: PermissionMode;
  confirmationToken?: string;
  executeOptions: ExecuteToolOptions;
};

export function parseExecuteToolBody(body: {
  name?: unknown;
  input?: unknown;
  permissionMode?: unknown;
  confirmed?: unknown;
  confirmationToken?: unknown;
  confirmationValidatedByServer?: unknown;
}): { ok: true; value: ParsedExecuteBody } | { ok: false; error: string } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return { ok: false, error: "Missing tool name" };
  }

  const permissionMode =
    typeof body.permissionMode === "string" &&
    VALID_MODES.has(body.permissionMode as PermissionMode)
      ? (body.permissionMode as PermissionMode)
      : "read";

  const confirmationToken =
    typeof body.confirmationToken === "string" && body.confirmationToken.trim()
      ? body.confirmationToken.trim()
      : undefined;

  if (body.confirmed === true && !confirmationToken) {
    return {
      ok: false,
      error: "confirmationToken required for confirmed tool execution",
    };
  }

  if (body.confirmationValidatedByServer === true) {
    return {
      ok: false,
      error: "confirmationValidatedByServer is not accepted from HTTP requests",
    };
  }

  const executeOptions: ExecuteToolOptions = {
    permissionMode,
    confirmationToken,
    verifyConfirmationToken: confirmationToken ? createConfirmationVerifier() : undefined,
  };

  return {
    ok: true,
    value: {
      name,
      input: body.input ?? {},
      permissionMode,
      confirmationToken,
      executeOptions,
    },
  };
}

export function toolExecuteHttpStatus(code?: string): number {
  if (code === "not_found") return 404;
  if (code === "validation") return 400;
  if (code === "permission_denied" || code === "confirmation_required") return 403;
  return 422;
}
