import "server-only";

import { getCurrentUser } from "@/lib/persistence/auth/getCurrentUser";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";

export function readCronSecret(request: Request): string | null {
  const header =
    request.headers.get("x-edge-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  return header?.trim() || null;
}

export async function resolveCronUserId(request: Request): Promise<string | null> {
  const configuredSecret = process.env.EDGE_CRON_SECRET?.trim();
  if (configuredSecret) {
    const provided = readCronSecret(request);
    if (provided === configuredSecret) {
      return ensureDevAppUser();
    }
  }

  const user = await getCurrentUser();
  if (user) return user.id;

  return null;
}
