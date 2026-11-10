import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Eye, Package, PackagePlus, Search } from "lucide-react";
import { shipmentsApi } from "../api/endpoints";
import type { ShipmentLite, ShipmentStatus } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatCurrency, formatDate } from "../lib/format";
import { canSee } from "../lib/rbac";
import { useAuth } from "../store/auth";

const STATUSES: ShipmentStatus[] = [
  "BOOKED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "NDR",
  "RETURNED",
  "RTS",
  "CANCELLED",
];

const statusLabel = (s: string) => s.replace(/_/g, " ");

const COLUMNS: DataTableColumn<ShipmentLite>[] = [
  {
    key: "awb",
    header: "AWB",
    sortValue: (r) => r.awbNumber,
    render: (r) => (
      <span className="font-mono text-xs font-bold text-ink transition-colors group-hover:text-[#0b7a75]">
        {r.awbNumber}
      </span>
    ),
  },
  {
    key: "route",
    header: "Route",
    render: (r) => (
      <span className="flex items-center gap-1.5 whitespace-nowrap text-ink">
        {r.senderCity}
        <ArrowRight className="h-3 w-3 shrink-0 text-[#12b2aa]" aria-hidden="true" />
        {r.receiverCity}
      </span>
    ),
  },
  {
    key: "receiver",
    header: "Receiver",
    cellClassName: "max-w-[180px] truncate text-ink",
    render: (r) => r.receiverName,
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <StatusBadge status={r.status} label={r.statusLabel} />,
  },
  {
    key: "cod",
    header: "COD",
    align: "right",
    sortValue: (r) => r.codAmount,
    render: (r) =>
      r.codAmount > 0 ? (
        <span className="rounded-full bg-[#f59e0b]/10 px-2 py-0.5 text-xs font-bold text-[#b45309]">
          {formatCurrency(r.codAmount)}
        </span>
      ) : (
        <span className="text-xs font-medium text-muted">Prepaid</span>
      ),
  },
  {
    key: "booked",
    header: "Booked",
    align: "right",
    sortValue: (r) => r.createdAt,
    render: (r) => <span className="text-xs text-body">{formatDate(r.createdAt)}</span>,
  },
  {
    key: "actions",
    header: "",
    align: "right",
    render: (r) => (
      <Link
        to={`/shipments/${r.awbNumber}`}
        onClick={(e) => e.stopPropagation()}
        aria-label={`View shipment ${r.awbNumber}`}
        title="View details"
        className="inline-grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-line bg-card text-muted transition hover:border-[#12b2aa]/40 hover:bg-[#12b2aa]/10 hover:text-[#0e8f8a] hover:shadow-soft"
      >
        <Eye className="h-4 w-4" />
      </Link>
    ),
  },
];

export function ShipmentsPage() {
  const user = useAuth((s) => s.user);
  const canCreate =
    canSee(user?.role, "shipments") &&
    ["SUPER_ADMIN", "BRANCH_MANAGER", "OPERATIONS", "COUNTER_STAFF"].includes(user?.role ?? "");
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get("status") ?? "";
  const search = params.get("search") ?? "";
  const page = Number(params.get("page") ?? "1");
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (searchInput) next.set("search", searchInput);
      else next.delete("search");
      next.set("page", "1");
      setParams(next, { replace: true });
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query = useMemo(
    () => ({ search: search || undefined, status: status || undefined, page, limit: 25 }),
    [search, status, page],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["shipments", "list", query],
    queryFn: () => shipmentsApi.list(query),
  });

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    setParams(next);
  };

  const chips: { value: string; label: string }[] = [
    { value: "", label: "All" },
    ...STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
  ];

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5EEAD4]">
              Consignments
            </p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">Shipments</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              Search, filter and track every consignment in the network.
            </p>
            {data ? (
              <p className="mt-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                {data.meta.total.toLocaleString("en-IN")} shipments
              </p>
            ) : null}
          </div>
          {canCreate ? (
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

      {/* Toolbar + table */}
      <Card padded={false}>
        <div className="space-y-3 border-b border-line p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-muted" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search AWB, sender or receiver name..."
              className="pl-9"
              aria-label="Search shipments"
            />
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {chips.map((chip) => {
              const active = status === chip.value;
              return (
                <button
                  key={chip.value || "all"}
                  type="button"
                  onClick={() => setParam("status", chip.value || null)}
                  className={`cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-transparent bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-soft"
                      : "border-line bg-card text-body hover:border-[#12b2aa]/40 hover:text-[#0b7a75]"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {isError ? (
          <div className="px-4 py-6">
            <EmptyState
              title="Failed to load shipments"
              description="Please try again in a moment."
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
        ) : (
          <DataTable
            columns={COLUMNS}
            rows={data?.items ?? []}
            rowKey={(r) => r.id}
            loading={isLoading}
            skeletonRows={8}
            minWidth="min-w-[860px]"
            onRowClick={(r) => navigate(`/shipments/${r.awbNumber}`)}
            empty={
              <EmptyState
                title="No shipments found"
                description="Try changing the filters or book a new shipment to get started."
                icon={<Package className="h-6 w-6" />}
                action={
                  canCreate ? (
                    <Link to="/shipments/new">
                      <Button size="sm" icon={<PackagePlus className="h-4 w-4" />}>
                        Book shipment
                      </Button>
                    </Link>
                  ) : null
                }
              />
            }
            pagination={
              data
                ? {
                    page: data.meta.page,
                    totalPages: data.meta.totalPages,
                    total: data.meta.total,
                    onPage: (p) => setParam("page", String(p)),
                  }
                : undefined
            }
          />
        )}
      </Card>
    </div>
  );
}
