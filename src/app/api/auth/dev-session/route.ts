import { NextResponse } from "next/server";

import {
  clearDevSession,
  establishDevSession,
  isDevPassphraseRequired,
} from "@/lib/persistence/auth/devSession";
import { getCurrentUser, isPersistenceEnabled } from "@/lib/persistence/auth/getCurrentUser";

export const runtime = "nodejs";

async function resolveDevSessionUser() {
  let user = await getCurrentUser();
  if (user || isDevPassphraseRequired()) {
    return user;
  }
  return establishDevSession({ bootstrap: true });
}

export async function GET() {
  if (!isPersistenceEnabled()) {
    return NextResponse.json({
      persistenceEnabled: false,
      authenticated: false,
      passphraseRequired: false,
    });
  }

  const user = await resolveDevSessionUser();
  return NextResponse.json({
    persistenceEnabled: true,
    authenticated: user != null,
    passphraseRequired: isDevPassphraseRequired(),
    user: user
      ? { id: user.id, email: user.email, displayName: user.displayName }
      : null,
  });
}

export async function POST(request: Request) {
  if (!isPersistenceEnabled()) {
    return NextResponse.json(
      { error: "Persistence is not configured." },
      { status: 503 },
    );
  }

  let body: { passphrase?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const passphrase = typeof body.passphrase === "string" ? body.passphrase : "";
  const user = await establishDevSession({ passphrase });
  if (!user) {
    return NextResponse.json({ error: "Invalid dev session passphrase." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, displayName: user.displayName },
  });
}

export async function DELETE() {
  await clearDevSession();
  return NextResponse.json({ ok: true });
}
