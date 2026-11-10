import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, MapPin, Phone, Truck } from "lucide-react";
import { locationsApi, ridersApi } from "../api/endpoints";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function RidersPage() {
  const [locationId, setLocationId] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["riders", "list", locationId],
    queryFn: () => ridersApi.list(locationId || undefined),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => locationsApi.list({ all: true }),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      {/* Command bar */}
      <section className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b4a46] via-[#0e6b64] to-[#0b1220] p-6 text-white shadow-lift">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.3),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="rise relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5EEAD4]">Field force</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">Riders</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              Field riders, vehicle details and today's workload across hubs.
            </p>
            <p className="mt-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              {items.length} rider{items.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur sm:w-60">
            <Select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              aria-label="Filter riders by location"
              className="border-white/20 bg-white/90 text-ink"
            >
              <option value="">All locations</option>
              {(locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      {/* Rider cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card">
          <EmptyState
            title="No riders found"
            description="Add staff with the RIDER role to see them here."
            icon={<Truck className="h-6 w-6" />}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((r, i) => {
            const done = r.deliveredToday;
            const open = r.pendingToday;
            const todaysTotal = done + open;
            const pct = todaysTotal > 0 ? Math.min(100, Math.round((done / todaysTotal) * 100)) : 0;
            return (
              <Link key={r.id} to={`/riders/${r.id}`} className="group block h-full">
                <Card
                  className="rise h-full transition-all duration-300 hover:-translate-y-1 hover:border-[#12b2aa]/40 hover:shadow-lift"
                  style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-sm font-extrabold text-white shadow-soft transition-transform duration-300 group-hover:-rotate-6">
                        {initials(r.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                        <p className="inline-flex items-center gap-1 text-xs text-muted">
                          <Phone className="h-3 w-3" />
                          {r.phone ?? "-"}
                        </p>
                      </div>
                    </div>
                    <Badge tone={r.status === "ACTIVE" ? "emerald" : "gray"}>{r.status}</Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-page px-2.5 py-1 text-[11px] font-medium text-body">
                      <MapPin className="h-3 w-3 text-[#0e8f8a]" />
                      {r.location?.name ?? "No location"}
                    </span>
                    {r.vehicle ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-page px-2.5 py-1 text-[11px] font-medium text-body">
                        <Truck className="h-3 w-3 text-[#0e8f8a]" />
                        {r.vehicle.vehicleType}
                        {r.vehicle.vehicleNumber ? ` · ${r.vehicle.vehicleNumber}` : ""}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-[#0e8f8a]">{done}</p>
                      <p className="text-[10px] tracking-wide text-muted uppercase">Delivered</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#b45309]">{open}</p>
                      <p className="text-[10px] tracking-wide text-muted uppercase">Pending</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-ink">{r.totalTasks}</p>
                      <p className="text-[10px] tracking-wide text-muted uppercase">Total</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-muted">
                      <span className="uppercase tracking-wider">Today's progress</span>
                      <span className="text-[#0b7a75]">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-page">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#12b2aa] to-[#5EEAD4] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <span className="mt-3 grid h-7 w-7 place-items-center justify-self-end rounded-full bg-[#12b2aa]/10 text-[#0e8f8a] opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
