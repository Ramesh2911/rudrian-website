"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cx } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  push: (tone: ToastTone, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const toneStyles: Record<ToastTone, { wrapper: string; icon: ReactNode }> = {
  success: {
    wrapper: "border-success/25 bg-success-bg",
    icon: <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />,
  },
  error: {
    wrapper: "border-danger/25 bg-danger-bg",
    icon: <XCircle className="h-5 w-5 text-danger" aria-hidden="true" />,
  },
  info: {
    wrapper: "border-info/25 bg-info-bg",
    icon: (
      <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-info text-[10px] font-bold text-white">
        i
      </span>
    ),
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current;
      nextId.current += 1;
      setItems((prev) => [...prev.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-stretch gap-2.5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cx(
              "pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-lift backdrop-blur-sm",
              toneStyles[item.tone].wrapper,
            )}
          >
            <span className="mt-0.5 shrink-0">{toneStyles[item.tone].icon}</span>
            <p className="flex-1 text-sm font-medium leading-snug text-ink">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-black/5 hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
