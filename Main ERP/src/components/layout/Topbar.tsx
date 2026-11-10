import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Building2, CircleUserRound, LogOut, Menu } from "lucide-react";
import type { AuthUser } from "../../api/types";
import { notificationsApi } from "../../api/endpoints";
import { titleCase } from "../../lib/format";

type Props = {
  title: string;
  user: AuthUser | null;
  onMenu: () => void;
  onLogout: () => void;
};

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function Topbar({ title, user, onMenu, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data: recent } = useQuery({
    queryKey: ["notifications", "badge"],
    queryFn: () => notificationsApi.list({ limit: 100 }),
    refetchInterval: 60_000,
    retry: false,
  });

  const newCount = recent
    ? recent.items.filter((n) => Date.now() - new Date(n.createdAt).getTime() <= DAY_MS).length
    : 0;
  const badge = newCount > 9 ? "9+" : newCount > 0 ? String(newCount) : null;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-card/85 px-4 shadow-[0_1px_0_rgba(15,23,42,0.03),0_8px_24px_-16px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:px-6">
      <button type="button" onClick={onMenu} className="rounded-xl p-2 text-body hover:bg-page lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight text-ink">{title}</h1>
        <p className="hidden truncate text-[11px] text-muted sm:block">Rudrian Operations Console</p>
      </div>
      {user?.location ? (
        <span className="hidden items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1.5 text-xs font-medium text-body sm:inline-flex">
          <Building2 className="h-3.5 w-3.5 text-[#0e8f8a]" />
          {user.location.name}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => navigate("/notifications")}
        className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-line bg-card text-body transition hover:border-[#12b2aa]/40 hover:text-[#0e8f8a] hover:shadow-soft"
        aria-label={badge ? `Notifications (${newCount} new)` : "Notifications"}
      >
        <Bell className="h-4.5 w-4.5" />
        {badge ? (
          <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white ring-2 ring-card">
            {badge}
          </span>
        ) : null}
      </button>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-card px-2 py-1.5 transition hover:border-[#12b2aa]/40 hover:shadow-soft"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-[11px] font-bold text-white shadow-soft">
            {initials(user?.name)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-semibold text-ink">{user?.name ?? "User"}</span>
            <span className="block text-[10px] text-muted">{user ? titleCase(user.role) : ""}</span>
          </span>
        </button>
        {open ? (
          <div className="rise absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
            <div className="flex items-center gap-3 border-b border-line bg-page/60 px-4 py-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-sm font-bold text-white shadow-soft">
                {initials(user?.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-xs text-muted">{user?.email ?? user?.phone}</p>
                {user ? (
                  <span className="mt-1 inline-flex rounded-full bg-[#12b2aa]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0b7a75]">
                    {titleCase(user.role)}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/profile");
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left text-sm text-body transition-colors hover:bg-page hover:text-ink"
            >
              <CircleUserRound className="h-4 w-4 text-muted" />
              My Profile
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 border-t border-line px-4 py-3 text-left text-sm text-danger transition-colors hover:bg-danger-bg"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
