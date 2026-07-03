"use client";

import { useEffect, useState } from "react";

type SessionStatus = {
  persistenceEnabled: boolean;
  authenticated: boolean;
  passphraseRequired: boolean;
};

export function DevPersistenceLoginBanner() {
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/dev-session")
      .then((res) => res.json())
      .then((json: SessionStatus) => {
        if (!cancelled) setStatus(json);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.persistenceEnabled || !status.passphraseRequired || status.authenticated) {
    return null;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/dev-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) {
        setError("Invalid passphrase.");
        return;
      }
      setStatus((current) =>
        current ? { ...current, authenticated: true, passphraseRequired: true } : current,
      );
      setPassphrase("");
    } catch {
      setError("Unable to establish dev session.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-b border-[var(--edge-border-subtle)] bg-[var(--edge-surface-elevated)] px-4 py-2 text-sm text-[var(--edge-text-secondary)]">
      <form className="mx-auto flex max-w-3xl flex-wrap items-center gap-2" onSubmit={onSubmit}>
        <span>Cloud sync requires a dev session passphrase.</span>
        <input
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          className="min-w-[12rem] rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-base)] px-2 py-1 text-[var(--edge-text-primary)]"
          placeholder="Dev passphrase"
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={submitting || passphrase.trim() === ""}
          className="rounded bg-[var(--edge-accent-primary)] px-3 py-1 text-[var(--edge-text-on-accent)] disabled:opacity-50"
        >
          Unlock sync
        </button>
        {error ? <span className="text-[var(--edge-text-danger)]">{error}</span> : null}
      </form>
    </div>
  );
}
