import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  CornerUpLeft,
  RefreshCcw,
  RotateCcw,
  Route,
  Search,
  ShieldAlert,
} from "lucide-react";
import { ndrApi } from "../api/endpoints";
import type { NdrAction, NdrReason, NdrRow } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";
import { Select } from "../components/ui/Select";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Textarea } from "../components/ui/Textarea";
import { useToast } from "../components/ui/Toast";
import { formatDateTime, titleCase } from "../lib/format";

const REASONS: NdrReason[] = [
  "CUSTOMER_UNAVAILABLE",
  "WRONG_ADDRESS",
  "RESCHEDULED",
  "REFUSED",
  "DAMAGE",
  "ADDRESS_UNTRACEABLE",
  "OTHER",
];

const ACTIONS: { value: NdrAction; label: string; hint: string; icon: ReactNode }[] = [
  {
    value: "REATTEMPT",
    label: "Schedule reattempt",
    hint: "Shipment goes back out for delivery",
    icon: <RotateCcw className="h-4 w-4" />,
  },
  {
    value: "RETURN",
    label: "Return to sender",
    hint: "Shipment moves to RETURNED",
    icon: <CornerUpLeft className="h-4 w-4" />,
  },
  {
    value: "REROUTE",
    label: "Reroute via hub",
    hint: "Shipment goes back in transit",
    icon: <Route className="h-4 w-4" />,
  },
];

function reasonTone(reason: NdrReason | string): string {
  switch (reason) {
    case "CUSTOMER_UNAVAILABLE":
    case "ADDRESS_UNTRACEABLE":
    case "RESCHEDULED":
      return "bg-[#f59e0b]/10 text-[#b45309]";
    case "WRONG_ADDRESS":
    case "REFUSED":
    case "DAMAGE":
      return "bg-danger-bg text-danger";
    default:
      return "bg-page text-body ring-1 ring-line";
  }
}

function actionTone(action: NdrAction | string): string {
  switch (action) {
    case "REATTEMPT":
      return "bg-[#12b2aa]/12 text-[#0b7a75]";
    case "RETURN":
      return "bg-danger-bg text-danger";
    case "REROUTE":
      return "bg-indigo-500/10 text-indigo-600";
    default:
      return "bg-page text-body ring-1 ring-line";
  }
}

function actionIcon(action: NdrAction | string) {
  if (action === "RETURN") return <CornerUpLeft className="h-3 w-3" />;
  if (action === "REROUTE") return <Route className="h-3 w-3" />;
  return <RotateCcw className="h-3 w-3" />;
}

function InsightCard({
  label,
  value,
  icon,
  gradient,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  gradient: string;
}) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-[24px] opacity-[0.08] transition-transform duration-300 group-hover:scale-125 ${gradient}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">{value}</p>
        </div>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-soft transition-transform duration-300 group-hover:-rotate-6 ${gradient}`}
        >
          {icon}
        </span>
      </div>
    </Card>
  );
}

export function NdrPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<NdrRow | null>(null);
  const [reason, setReason] = useState<NdrReason>("CUSTOMER_UNAVAILABLE");
  const [action, setAction] = useState<NdrAction>("REATTEMPT");
  const [remarks, setRemarks] = useState("");
  const [nextAttemptDate, setNextAttemptDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["ndr", "list", page],
    queryFn: () => ndrApi.list({ page, limit: 20 }),
  });

  const attempt = useMutation({
    mutationFn: () => {
      if (!target) throw new Error("No shipment selected");
      const shipmentKey = target.id;
      return ndrApi.attempt(shipmentKey, {
        reason,
        action,
        remarks: remarks || undefined,
        nextAttemptDate: nextAttemptDate || undefined,
      });
    },
    onSuccess: () => {
      toast.success("NDR attempt logged");
      setTarget(null);
      setRemarks("");
      setNextAttemptDate("");
      void queryClient.invalidateQueries({ queryKey: ["ndr"] });
      void queryClient.invalidateQueries({ queryKey: ["shipments"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not log attempt"),
  });

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (row) =>
        row.awbNumber.toLowerCase().includes(needle) ||
        row.receiverName.toLowerCase().includes(needle) ||
        row.receiverCity.toLowerCase().includes(needle),
    );
  }, [items, q]);

  const stats = useMemo(() => {
    let reattempt = 0;
    let ret = 0;
    let reroute = 0;
    for (const row of items) {
      const a = row.lastNdr?.action;
      if (a === "REATTEMPT") reattempt += 1;
      else if (a === "RETURN") ret += 1;
      else if (a === "REROUTE") reroute += 1;
    }
    return { reattempt, ret, reroute };
  }, [items]);

  const columns: DataTableColumn<NdrRow>[] = [
    {
      key: "awb",
      header: "AWB",
      sortValue: (row) => row.awbNumber,
      render: (row) => (
        <span className="font-mono text-xs font-bold text-ink">{row.awbNumber}</span>
      ),
    },
    {
      key: "receiver",
      header: "Receiver",
      sortValue: (row) => row.receiverName,
      cellClassName: "min-w-[160px]",
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-ink">{row.receiverName}</p>
          <p className="text-[11px] text-muted">{row.receiverCity}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} label={row.statusLabel} />,
    },
    {
      key: "reason",
      header: "Last reason",
      sortValue: (row) => row.lastNdr?.reason ?? "",
      render: (row) =>
        row.lastNdr ? (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${reasonTone(row.lastNdr.reason)}`}
          >
            {titleCase(row.lastNdr.reason)}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      key: "action",
      header: "Last action",
      sortValue: (row) => row.lastNdr?.action ?? "",
      render: (row) =>
        row.lastNdr ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${actionTone(row.lastNdr.action)}`}
          >
            {actionIcon(row.lastNdr.action)}
            {titleCase(row.lastNdr.action)}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      key: "updated",
      header: "Updated",
      align: "right",
      sortValue: (row) => row.createdAt,
      render: (row) => <span className="text-xs text-body">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0 cursor-pointer transition hover:border-[#12b2aa]! hover:text-[#0b7a75]"
          onClick={(e) => {
            e.stopPropagation();
            setTarget(row);
            setReason("CUSTOMER_UNAVAILABLE");
            setAction("REATTEMPT");
            setRemarks(row.lastNdr?.remarks ?? "");
            setNextAttemptDate("");
          }}
          icon={<RefreshCcw className="h-3.5 w-3.5" />}
        >
          Log attempt
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Command bar */}
      <section className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#431407] via-[#7c2d12] to-[#0b1220] p-6 text-white shadow-lift">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(251,191,36,0.28),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="rise relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fbbf24]">Exceptions</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">NDR control</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              Exception shipments with reattempt, return and reroute actions.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
            <ShieldAlert className="h-4 w-4 text-[#fbbf24]" />
            {data ? data.meta.total : "—"} open
          </span>
        </div>
      </section>

      {/* Insight cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          label="Open exceptions"
          value={data?.meta.total ?? 0}
          icon={<ShieldAlert className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#f59e0b] to-[#fbbf24]"
        />
        <InsightCard
          label="Reattempt planned"
          value={stats.reattempt}
          icon={<RotateCcw className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF]"
        />
        <InsightCard
          label="Return to sender"
          value={stats.ret}
          icon={<CornerUpLeft className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#dc2626] to-[#f87171]"
        />
        <InsightCard
          label="Rerouted via hub"
          value={stats.reroute}
          icon={<Route className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]"
        />
      </div>

      {/* List */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#f97316] text-white shadow-soft">
              <AlertOctagon className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Exception queue</h2>
              <p className="text-[11px] text-muted">
                {isLoading
                  ? "Loading…"
                  : `${filtered.length} of ${items.length} on this page`}
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search AWB, receiver, city…"
              className="pl-9 focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15"
              aria-label="Search exceptions"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.id}
          loading={isLoading}
          skeletonRows={6}
          minWidth="min-w-[900px]"
          onRowClick={(row) => navigate(`/shipments/${row.awbNumber}`)}
          empty={
            <EmptyState
              title="No NDR cases"
              description="All shipments are on track. Exceptions will appear here."
              icon={<AlertOctagon className="h-6 w-6" />}
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

      {/* Log attempt modal */}
      <Modal
        open={Boolean(target)}
        title={target ? `Log attempt · ${target.awbNumber}` : "Log attempt"}
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button variant="secondary" className="cursor-pointer" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              className="shine cursor-pointer bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_12px_26px_-14px_rgba(18,178,170,0.8)] hover:-translate-y-0.5"
              loading={attempt.isPending}
              onClick={() => attempt.mutate()}
            >
              Save attempt
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as NdrReason)}
            className="focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {titleCase(r)}
              </option>
            ))}
          </Select>
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink">Action</p>
            <div className="space-y-2">
              {ACTIONS.map((a) => (
                <label
                  key={a.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    action === a.value
                      ? "border-[#12b2aa] bg-[#12b2aa]/[0.07] shadow-soft"
                      : "border-line hover:bg-page"
                  }`}
                >
                  <input
                    type="radio"
                    name="ndr-action"
                    className="mt-1 accent-[#0e8f8a]"
                    checked={action === a.value}
                    onChange={() => setAction(a.value)}
                  />
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                      action === a.value
                        ? "bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-white"
                        : "bg-page text-muted ring-1 ring-line"
                    }`}
                  >
                    {a.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">{a.label}</span>
                    <span className="block text-xs text-muted">{a.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <Input
            label="Next attempt date"
            type="date"
            value={nextAttemptDate}
            onChange={(e) => setNextAttemptDate(e.target.value)}
            className="focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15"
          />
          <Textarea
            label="Remarks"
            rows={3}
            maxLength={500}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional notes"
            className="focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15"
          />
        </div>
      </Modal>
    </div>
  );
}
