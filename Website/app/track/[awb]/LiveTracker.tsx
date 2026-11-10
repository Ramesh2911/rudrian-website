"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { RefreshCw } from "lucide-react";

type ConnectionMode = "connecting" | "live" | "polling";

interface LiveTrackerProps {
  awbNumber: string;
}

export function LiveTracker({ awbNumber }: LiveTrackerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<ConnectionMode>("connecting");
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let pollId: number | null = null;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

    function markRefresh() {
      if (disposed) return;
      setLastRefresh(
        new Date().toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      router.refresh();
    }

    function startPolling() {
      if (disposed || pollId !== null) return;
      setMode("polling");
      pollId = window.setInterval(markRefresh, 15_000);
    }

    try {
      const socket = io(socketUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        reconnectionAttempts: 3,
      });

      socket.on("connect", () => {
        if (disposed) return;
        setMode("live");
        if (pollId !== null) {
          window.clearInterval(pollId);
          pollId = null;
        }
        socket.emit("track:subscribe", { awb: awbNumber });
      });

      socket.on("shipment:update", markRefresh);

      socket.on("connect_error", () => {
        if (!disposed) startPolling();
      });

      socket.io.on("reconnect_failed", () => {
        if (!disposed) startPolling();
      });

      const connectWatchdog = window.setTimeout(() => {
        if (!disposed && !socket.connected) startPolling();
      }, 6000);

      return () => {
        disposed = true;
        window.clearTimeout(connectWatchdog);
        if (pollId !== null) window.clearInterval(pollId);
        socket.off("shipment:update", markRefresh);
        socket.close();
      };
    } catch {
      startPolling();
      return () => {
        disposed = true;
        if (pollId !== null) window.clearInterval(pollId);
      };
    }
  }, [awbNumber, router]);

  const label =
    mode === "live"
      ? "Live tracking active"
      : mode === "polling"
        ? "Auto-refresh every 15s"
        : "Connecting to live feed";

  const dotClass =
    mode === "live"
      ? "bg-success animate-ping"
      : mode === "polling"
        ? "bg-warning animate-pulse"
        : "bg-muted animate-pulse";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-soft">
      <div className="inline-flex items-center gap-2.5">
        <span className="relative inline-flex h-2.5 w-2.5">
          <span
            aria-hidden="true"
            className={`absolute inline-flex h-full w-full rounded-full ${dotClass}`}
          />
          <span
            aria-hidden="true"
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              mode === "live" ? "bg-success" : mode === "polling" ? "bg-warning" : "bg-muted"
            }`}
          />
        </span>
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="sr-only" aria-live="polite">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {lastRefresh ? (
          <span className="text-xs text-muted">Updated {lastRefresh}</span>
        ) : null}
        <button
          type="button"
          onClick={() => router.refresh()}
          className="btn btn-ghost btn-sm"
          aria-label="Refresh tracking status now"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </button>
      </div>
    </div>
  );
}
