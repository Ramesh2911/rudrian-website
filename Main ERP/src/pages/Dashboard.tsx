import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  Boxes,
  IndianRupee,
  LayoutGrid,
  PackageCheck,
  PackagePlus,
  Ticket,
  Timer,
  Truck,
  Wallet,
} from "lucide-react";
import { dashboardApi } from "../api/endpoints";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { useToast } from "../components/ui/Toast";
import { formatCurrency, formatNumber } from "../lib/format";
import { canSee } from "../lib/rbac";
import { useAuth } from "../store/auth";

const GRADIENTS = {
  brand: "bg-gradient-to-br from-[#2563eb] to-[#4f46e5]",
  violet: "bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]",
  green: "bg-gradient-to-br from-[#16a34a] to-[#4ade80]",
  amber: "bg-gradient-to-br from-[#f59e0b] to-[#fbbf24]",
  red: "bg-gradient-to-br from-[#dc2626] to-[#f87171]",
  orange: "bg-gradient-to-br from-[#f97316] to-[#fb923c]",
  teal: "bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF]",
  sky: "bg-gradient-to-br from-[#0ea5e9] to-[#38bdf8]",
} as const;

type GradientKey = keyof typeof GRADIENTS;

const ACTIONS: { to: string; label: string; icon: typeof Boxes; section: string }[] = [
  { to: "/shipments/new", label: "Book a shipment", icon: PackagePlus, section: "shipments" },
  { to: "/pos", label: "Counter booking & ledger", icon: Wallet, section: "pos" },
  { to: "/manifests", label: "Create a manifest", icon: Boxes, section: "manifests" },
  { to: "/ndr", label: "Resolve NDR cases", icon: LayoutGrid, section: "ndr" },
  { to: "/riders", label: "Assign riders", icon: Truck, section: "riders" },
  { to: "/notifications", label: "Notification logs", icon: Bell, section: "notifications" },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  label,
  value,
  icon,
  gradient,
  sub,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  gradient: GradientKey;
  sub?: string;
}) {
  const grad = GRADIENTS[gradient];
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-[28px] opacity-[0.08] transition-transform duration-300 group-hover:scale-125 ${grad}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
          {sub ? (
            <p className="mt-1.5 inline-flex rounded-full bg-page px-2 py-0.5 text-[11px] font-medium text-body">
              {sub}
            </p>
          ) : null}
        </div>
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-soft transition-transform duration-300 group-hover:-rotate-6 ${grad}`}
        >
          {icon}
        </span>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const user = useAuth((s) => s.user);
  const toast = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: dashboardApi.stats,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (isError) toast.error("Could not load dashboard stats");
  }, [isError, toast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-line bg-card">
        <EmptyState
          title="Failed to load dashboard"
          description="Something went wrong while fetching network statistics."
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="cursor-pointer text-sm font-medium text-brand"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const max = Math.max(1, ...data.trend.map((t) => t.count));
  const peak = data.trend.find((t) => t.count === max);
  const trendTotal = data.trend.reduce((sum, t) => sum + t.count, 0);
  const role = user?.role;
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "there";
  const dateLabel = new Date(data.date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <section className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b4a46] via-[#0e6b64] to-[#0b1220] p-6 text-white shadow-lift sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.3),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(123,192,67,0.18),transparent)] blob-drift"
          style={{ animationDelay: "-8s" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="rise relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5EEAD4]">
              {dateLabel}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting()}, {firstName}
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
              Here's your network snapshot — {formatNumber(data.todayBookings)} bookings today
              with {formatNumber(data.inTransit)} parcels moving across hubs.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 backdrop-blur">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  Today's bookings
                </span>
                <span className="block text-lg font-bold">{formatNumber(data.todayBookings)}</span>
              </span>
              <span className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 backdrop-blur">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  Revenue today
                </span>
                <span className="block text-lg font-bold">{formatCurrency(data.revenueToday)}</span>
              </span>
              <span className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 backdrop-blur">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  Delivered today
                </span>
                <span className="block text-lg font-bold">{formatNumber(data.deliveredToday)}</span>
              </span>
            </div>
          </div>
          {canSee(role, "shipments") ? (
            <Link
              to="/shipments/new"
              className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-ink shadow-lift transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(0,0,0,0.5)]"
            >
              <PackagePlus className="h-4 w-4 text-[#0e8f8a]" />
              New booking
            </Link>
          ) : null}
        </div>
      </section>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's bookings"
          value={formatNumber(data.todayBookings)}
          icon={<PackagePlus className="h-5 w-5" />}
          gradient="brand"
          sub={`${formatNumber(data.totalBookings)} all time`}
        />
        <StatCard
          label="In transit"
          value={formatNumber(data.inTransit)}
          icon={<Truck className="h-5 w-5" />}
          gradient="violet"
          sub={`${formatNumber(data.outForDelivery)} out for delivery`}
        />
        <StatCard
          label="Delivered"
          value={formatNumber(data.delivered)}
          icon={<PackageCheck className="h-5 w-5" />}
          gradient="green"
          sub={`${formatNumber(data.deliveredToday)} today`}
        />
        <StatCard
          label="Revenue today"
          value={formatCurrency(data.revenueToday)}
          icon={<IndianRupee className="h-5 w-5" />}
          gradient="amber"
        />
        <StatCard
          label="NDR open"
          value={formatNumber(data.ndr)}
          icon={<Timer className="h-5 w-5" />}
          gradient="red"
          sub={`${formatNumber(data.pendingPod)} pending POD`}
        />
        <StatCard
          label="Open tickets"
          value={formatNumber(data.openTickets)}
          icon={<Ticket className="h-5 w-5" />}
          gradient="orange"
        />
        <StatCard
          label="Riders active"
          value={formatNumber(data.ridersActive)}
          icon={<Truck className="h-5 w-5" />}
          gradient="teal"
          sub={`${formatNumber(data.openManifests)} open manifests`}
        />
        <StatCard
          label="Pending leaves"
          value={formatNumber(data.pendingLeaves)}
          icon={<Wallet className="h-5 w-5" />}
          gradient="sky"
        />
      </div>

      {/* Trend + quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Booking trend</h2>
              <p className="text-xs text-muted">Last 7 days · {formatNumber(trendTotal)} total bookings</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#12b2aa]/10 px-2.5 py-1 text-xs font-semibold text-[#0b7a75]">
                <Truck className="h-3.5 w-3.5" />
                Daily volume
              </span>
              {peak ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-page px-2.5 py-1 text-xs font-medium text-body">
                  Peak · {formatNumber(peak.count)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-line" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-line" />
            <div className="flex h-52 items-end gap-2 sm:gap-3">
              {data.trend.map((t, i) => {
                const height = Math.max(8, Math.round((t.count / max) * 150));
                const d = new Date(t.day + "T00:00:00");
                const label = d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit" });
                const isPeak = t.count === max;
                return (
                  <div key={t.day} className="flex flex-1 flex-col items-center gap-2">
                    <span className={`text-[11px] font-bold ${isPeak ? "text-[#0b7a75]" : "text-ink"}`}>
                      {t.count}
                    </span>
                    <div
                      className={`rise w-full cursor-pointer rounded-t-xl transition-opacity hover:opacity-80 ${
                        isPeak
                          ? "bg-gradient-to-t from-[#0e8f8a] to-[#5EEAD4] shadow-[0_10px_22px_-10px_rgba(18,178,170,0.7)]"
                          : "bg-gradient-to-t from-[#12b2aa]/75 to-[#5EEAD4]/60"
                      }`}
                      style={{ height, animationDelay: `${i * 60}ms` }}
                      title={`${t.day}: ${t.count} bookings`}
                    />
                    <span className="text-[10px] text-muted">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-ink">Quick actions</h2>
          <p className="mt-0.5 text-xs text-muted">Jump straight into a workflow</p>
          <div className="mt-4 grid gap-2">
            {ACTIONS.filter((a) => canSee(role, a.section)).map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  className="group flex items-center gap-3 rounded-xl border border-line bg-page/60 px-3.5 py-3 transition hover:border-[#12b2aa]/40 hover:bg-card hover:shadow-soft"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#0e8f8a] shadow-soft ring-1 ring-line transition group-hover:ring-[#12b2aa]/30">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-ink">{a.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-[#0e8f8a]" />
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-page px-3 py-2.5 text-xs text-muted">
            <Boxes className="h-3.5 w-3.5 shrink-0" />
            {formatNumber(data.openManifests)} manifests open across hubs
          </div>
        </Card>
      </div>
    </div>
  );
}
