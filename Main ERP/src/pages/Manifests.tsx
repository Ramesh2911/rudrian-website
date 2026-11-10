import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Boxes, Eye, Plus, Truck } from "lucide-react";
import { manifestsApi } from "../api/endpoints";
import type { Manifest, ManifestStatus } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Badge } from "../components/ui/Badge";
import { formatDate } from "../lib/format";

const STATUS_TONE: Record<ManifestStatus, "emerald" | "sky" | "amber" | "indigo"> = {
  OPEN: "emerald",
  IN_TRANSIT: "sky",
  CLOSED: "amber",
  RECEIVED: "indigo",
};

const STATUSES: ManifestStatus[] = ["OPEN", "IN_TRANSIT", "CLOSED", "RECEIVED"];

const COLUMNS: DataTableColumn<Manifest>[] = [
  {
    key: "manifest",
    header: "Manifest",
    sortValue: (m) => m.manifestNumber,
    render: (m) => (
      <span className="font-mono text-xs font-bold text-ink transition-colors group-hover:text-[#0b7a75]">
        {m.manifestNumber}
      </span>
    ),
  },
  {
    key: "route",
    header: "Route",
    sortValue: (m) => m.fromLocation?.name ?? "",
    render: (m) => (
      <span className="flex items-center gap-1.5 whitespace-nowrap text-ink">
        {m.fromLocation?.name ?? "-"}
        <ArrowRight className="h-3 w-3 shrink-0 text-[#12b2aa]" aria-hidden="true" />
        {m.toLocation?.name ?? "-"}
      </span>
    ),
  },
  {
    key: "vehicle",
    header: "Vehicle",
    sortValue: (m) => m.vehicleNumber ?? "",
    render: (m) =>
      m.vehicleNumber ? (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink">
          <Truck className="h-3.5 w-3.5 text-[#0e8f8a]" />
          {m.vehicleNumber}
        </span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "driver",
    header: "Driver",
    render: (m) =>
      m.driverName ? (
        <span>
          <span className="block font-medium text-ink">{m.driverName}</span>
          {m.driverPhone ? <span className="block text-[11px] text-muted">{m.driverPhone}</span> : null}
        </span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    key: "parcels",
    header: "Parcels",
    align: "right",
    sortValue: (m) => m.scannedCount,
    render: (m) => (
      <span className="rounded-full bg-[#12b2aa]/10 px-2.5 py-0.5 text-xs font-bold text-[#0b7a75]">
        {m.scannedCount}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (m) => <Badge tone={STATUS_TONE[m.status] ?? "slate"}>{m.status.replace(/_/g, " ")}</Badge>,
  },
  {
    key: "created",
    header: "Created",
    align: "right",
    sortValue: (m) => m.createdAt,
    render: (m) => <span className="text-xs text-body">{formatDate(m.createdAt)}</span>,
  },
  {
    key: "actions",
    header: "",
    align: "right",
    render: (m) => (
      <Link
        to={`/manifests/${m.id}`}
        onClick={(e) => e.stopPropagation()}
        aria-label={`View manifest ${m.manifestNumber}`}
        title="View details"
        className="inline-grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-line bg-card text-muted transition hover:border-[#12b2aa]/40 hover:bg-[#12b2aa]/10 hover:text-[#0e8f8a] hover:shadow-soft"
      >
        <Eye className="h-4 w-4" />
      </Link>
    ),
  },
];

export function ManifestsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["manifests", "list", { page, status }],
    queryFn: () => manifestsApi.list({ page, limit: 15, status: status || undefined }),
  });

  const chips: { value: string; label: string }[] = [
    { value: "", label: "All" },
    ...STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5EEAD4]">Line-haul</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">Manifests</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              Bag parcels into line-haul manifests between hubs and branches.
            </p>
            {data ? (
              <p className="mt-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                {data.meta.total.toLocaleString("en-IN")} manifests
              </p>
            ) : null}
          </div>
          <Link
            to="/manifests/new"
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-ink shadow-lift transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(0,0,0,0.5)]"
          >
            <Plus className="h-4 w-4 text-[#0e8f8a]" />
            New manifest
          </Link>
        </div>
      </section>

      {/* Toolbar + table */}
      <Card padded={false}>
        <div className="flex gap-2 overflow-x-auto border-b border-line p-4 pb-3">
          {chips.map((chip) => {
            const active = status === chip.value;
            return (
              <button
                key={chip.value || "all"}
                type="button"
                onClick={() => {
                  setStatus(chip.value);
                  setPage(1);
                }}
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

        <DataTable
          columns={COLUMNS}
          rows={data?.items ?? []}
          rowKey={(m) => m.id}
          loading={isLoading}
          skeletonRows={6}
          minWidth="min-w-[920px]"
          onRowClick={(m) => navigate(`/manifests/${m.id}`)}
          empty={
            <EmptyState
              title="No manifests yet"
              description="Create a manifest to move parcels between locations."
              icon={<Boxes className="h-6 w-6" />}
              action={
                <Link to="/manifests/new">
                  <Button size="sm" className="cursor-pointer" icon={<Plus className="h-4 w-4" />}>
                    New manifest
                  </Button>
                </Link>
              }
            />
          }
          pagination={
            data
              ? {
                  page: data.meta.page,
                  totalPages: data.meta.totalPages,
                  total: data.meta.total,
                  onPage: setPage,
                }
              : undefined
          }
        />
      </Card>

      {/* Helper strip */}
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-card px-4 py-3 text-xs text-muted shadow-sm">
        <Boxes className="h-3.5 w-3.5 shrink-0 text-[#0e8f8a]" />
        Click any row or the eye icon to open a manifest and add parcels by AWB.
      </div>
    </div>
  );
}
