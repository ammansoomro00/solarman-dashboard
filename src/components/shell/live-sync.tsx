"use client";

import { useRouter } from "next/navigation";
import { createContext, startTransition, useCallback, useContext, useEffect, useRef, useState } from "react";

type SyncStatus = "idle" | "syncing" | "error";

interface LiveSyncValue {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  error: string | null;
  refreshNow: () => Promise<void>;
}

const LiveSyncContext = createContext<LiveSyncValue | null>(null);

export function useLiveSync() {
  const ctx = useContext(LiveSyncContext);
  if (!ctx) throw new Error("useLiveSync must be used inside <LiveSyncProvider>");
  return ctx;
}

/**
 * Asks the server for fresh data on load and then every `intervalMs` while the tab
 * is visible. The server throttles calls to the provider, so this is cheap; the page
 * only re-renders when the server reports new data.
 */
export function LiveSyncProvider({
  children,
  initialSyncedAt,
  initialError,
  intervalMs = 5 * 60_000,
}: {
  children: React.ReactNode;
  initialSyncedAt: string | null;
  initialError: string | null;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<SyncStatus>(initialError ? "error" : "idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(initialSyncedAt ? new Date(initialSyncedAt) : null);
  const [error, setError] = useState<string | null>(initialError);
  const running = useRef(false);

  const sync = useCallback(
    async (manual: boolean) => {
      if (running.current) return;
      running.current = true;
      setStatus("syncing");
      try {
        const res = await fetch("/api/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manual }) });
        const json = (await res.json()) as { changed: boolean; error?: string; lastSyncedAt: string | null };
        if (json.lastSyncedAt) setLastSyncedAt(new Date(json.lastSyncedAt));
        setError(json.error ?? null);
        setStatus(json.error ? "error" : "idle");
        if (json.changed) startTransition(() => router.refresh());
      } catch {
        setError("Can't reach the server. Check your connection.");
        setStatus("error");
      } finally {
        running.current = false;
      }
    },
    [router],
  );

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      void sync(false);
      timer = setInterval(() => void sync(false), intervalMs);
    };
    const stop = () => clearInterval(timer);
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sync, intervalMs]);

  const refreshNow = useCallback(() => sync(true), [sync]);

  return <LiveSyncContext.Provider value={{ status, lastSyncedAt, error, refreshNow }}>{children}</LiveSyncContext.Provider>;
}
