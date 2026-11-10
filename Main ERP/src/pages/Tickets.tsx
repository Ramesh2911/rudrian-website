import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle2,
  Clock3,
  Inbox,
  LifeBuoy,
  MessageSquare,
  Search,
  Ticket,
  TriangleAlert,
} from "lucide-react";
import { ticketsApi } from "../api/endpoints";
import type { TicketRow, TicketStatus } from "../api/types";
import { Card } from "../components/ui/Card";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Pagination } from "../components/ui/Pagination";
import { formatDateTime } from "../lib/format";

const STATUSES: { value: "" | TicketStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const STATUS_META: Record<TicketStatus, { pill: string; ring: string; gradient: string }> = {
  OPEN: {
    pill: "bg-sky-500/12 text-sky-600",
    ring: "ring-sky-500/45",
    gradient: "bg-gradient-to-br from-[#0ea5e9] to-[#38bdf8]",
  },
  IN_PROGRESS: {
    pill: "bg-[#f59e0b]/12 text-[#b45309]",
    ring: "ring-[#f59e0b]/50",
    gradient: "bg-gradient-to-br from-[#f59e0b] to-[#fbbf24]",
  },
  RESOLVED: {
    pill: "bg-success-bg text-success",
    ring: "ring-[#16a34a]/45",
    gradient: "bg-gradient-to-br from-[#16a34a] to-[#4ade80]",
  },
  CLOSED: {
    pill: "bg-slate-500/12 text-slate-500",
    ring: "ring-slate-400/50",
    gradient: "bg-gradient-to-br from-[#64748b] to-[#94a3b8]",
  },
};

function priorityPill(priority: string): ReactNode {
  switch (priority) {
    case "URGENT":
      return (
        <span className="inline-flex rounded-full bg-gradient-to-r from-[#dc2626] to-[#f87171] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-[0_6px_14px_-8px_rgba(220,38,38,0.9)]">
          {priority}
        </span>
      );
    case "HIGH":
      return (
        <span className="inline-flex rounded-full bg-[#f59e0b]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#b45309]">
          {priority}
        </span>
      );
    case "NORMAL":
      return (
        <span className="inline-flex rounded-full bg-page px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-body ring-1 ring-line">
          {priority}
        </span>
      );
    default:
      return (
        <span className="inline-flex rounded-full bg-page px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted ring-1 ring-line">
          {priority}
        </span>
      );
  }
}

function StatusPill({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.CLOSED;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.pill}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function TicketsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"" | TicketStatus>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", "list", { status, search, page }],
    queryFn: () =>
      ticketsApi.list({ status: status || undefined, search: search || undefined, page, limit: 20 }),
  });

  const openCount = useQuery({
    queryKey: ["tickets", "count", "OPEN"],
    queryFn: () => ticketsApi.list({ status: "OPEN", limit: 1 }),
    select: (d) => d.meta.total,
  });
  const inProgressCount = useQuery({
    queryKey: ["tickets", "count", "IN_PROGRESS"],
    queryFn: () => ticketsApi.list({ status: "IN_PROGRESS", limit: 1 }),
    select: (d) => d.meta.total,
  });
  const resolvedCount = useQuery({
    queryKey: ["tickets", "count", "RESOLVED"],
    queryFn: () => ticketsApi.list({ status: "RESOLVED", limit: 1 }),
    select: (d) => d.meta.total,
  });
  const closedCount = useQuery({
    queryKey: ["tickets", "count", "CLOSED"],
    queryFn: () => ticketsApi.list({ status: "CLOSED", limit: 1 }),
    select: (d) => d.meta.total,
  });

  const COUNTS: { value: TicketStatus; label: string; icon: ReactNode; gradient: string; count: number | undefined }[] = [
    { value: "OPEN", label: "Open", icon: <Inbox className="h-5 w-5" />, gradient: STATUS_META.OPEN.gradient, count: openCount.data },
    {
      value: "IN_PROGRESS",
      label: "In progress",
      icon: <Clock3 className="h-5 w-5" />,
      gradient: STATUS_META.IN_PROGRESS.gradient,
      count: inProgressCount.data,
    },
    {
      value: "RESOLVED",
      label: "Resolved",
      icon: <CheckCircle2 className="h-5 w-5" />,
      gradient: STATUS_META.RESOLVED.gradient,
      count: resolvedCount.data,
    },
    {
      value: "CLOSED",
      label: "Closed",
      icon: <Archive className="h-5 w-5" />,
      gradient: STATUS_META.CLOSED.gradient,
      count: closedCount.data,
    },
  ];

  const columns: DataTableColumn<TicketRow>[] = [
    {
      key: "ticket",
      header: "Ticket",
      sortValue: (t) => t.ticketNumber,
      render: (t) => (
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[10px] font-bold text-white">
            #
          </span>
          <span className="font-mono text-xs font-bold text-ink">{t.ticketNumber}</span>
          {t._count?.comments ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-page px-1.5 py-0.5 text-[10px] font-bold text-muted ring-1 ring-line">
              <MessageSquare className="h-3 w-3" />
              {t._count.comments}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortValue: (t) => t.name,
      cellClassName: "min-w-[150px]",
      render: (t) => (
        <div>
          <p className="text-sm font-medium text-ink">{t.name}</p>
          <p className="text-[11px] text-muted">{t.phone}</p>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      cellClassName: "max-w-[280px]",
      render: (t) => (
        <div>
          <p className="truncate text-sm text-ink">{t.subject}</p>
          {t.awbNumber ? <p className="font-mono text-[11px] text-muted">{t.awbNumber}</p> : null}
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortValue: (t) => t.priority,
      render: (t) => priorityPill(t.priority),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (t) => t.status,
      render: (t) => <StatusPill status={t.status} />,
    },
    {
      key: "sla",
      header: "SLA",
      sortValue: (t) => (t.slaBreached ? 1 : 0),
      render: (t) =>
        t.slaBreached ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2.5 py-0.5 text-[11px] font-bold text-danger">
            <TriangleAlert className="h-3 w-3" />
            Breached
          </span>
        ) : t.slaDueAt ? (
          <span className="inline-flex rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success">
            On track
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      key: "location",
      header: "Location",
      render: (t) => <span className="text-xs text-body">{t.assignedLocation?.name ?? "—"}</span>,
    },
    {
      key: "created",
      header: "Created",
      align: "right",
      sortValue: (t) => t.createdAt,
      render: (t) => <span className="text-xs text-body">{formatDateTime(t.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Command bar */}
      <section className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b4b] via-[#3730a3] to-[#0b1220] p-6 text-white shadow-lift">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(165,180,252,0.3),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="rise relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a5b4fc]">Support</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">Tickets</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              Customer support cases raised across the network.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
            <LifeBuoy className="h-4 w-4 text-[#a5b4fc]" />
            {data ? data.meta.total : "—"} total
          </span>
        </div>
      </section>

      {/* Status count cards (clickable API filter) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COUNTS.map((c) => {
          const active = status === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => {
                setStatus(active ? "" : c.value);
                setPage(1);
              }}
              className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift focus:outline-none ${
                active ? `border-transparent ring-2 ${c.gradient} ring-offset-2 ring-offset-page` : "border-line"
              }`}
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-[24px] opacity-[0.08] transition-transform duration-300 group-hover:scale-125 ${c.gradient}`}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted">{c.label}</p>
                  <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                    {c.count === undefined ? "—" : c.count}
                  </p>
                </div>
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-soft transition-transform duration-300 group-hover:-rotate-6 ${c.gradient}`}
                >
                  {c.icon}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* List */}
      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ticket, subject, phone or AWB…"
              className="pl-9 focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15"
              aria-label="Search tickets"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUSES.map((s) => {
              const active = status === s.value;
              return (
                <button
                  key={s.value || "all"}
                  type="button"
                  onClick={() => {
                    setStatus(s.value);
                    setPage(1);
                  }}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/20 ${
                    active
                      ? "bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_10px_22px_-14px_rgba(18,178,170,0.9)]"
                      : "border border-line bg-card text-body hover:border-[#12b2aa]/45 hover:text-[#0b7a75]"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(t) => t.id}
          loading={isLoading}
          skeletonRows={6}
          minWidth="min-w-[1120px]"
          onRowClick={(t) => navigate(`/tickets/${t.id}`)}
          empty={
            <EmptyState
              title="No tickets"
              description="Support cases will appear here as they are raised."
              icon={<Ticket className="h-6 w-6" />}
            />
          }
        />
        {data && data.meta.totalPages > 1 ? (
          <div className="px-4 pb-4">
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onPage={setPage}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
