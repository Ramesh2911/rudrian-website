import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BellRing,
  Check,
  CheckCheck,
  Clock3,
  MessageSquareText,
  Search,
  Send,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import { notificationsApi } from "../api/endpoints";
import type { NotificationRow, NotifyChannel, NotifyStatus } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";
import { formatDateTime } from "../lib/format";

const TEAL = "focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15";

const STATUS_STYLE: Record<NotifyStatus, { pill: string; icon: ReactNode; gradient: string; ring: string }> = {
  DELIVERED: {
    pill: "bg-success-bg text-success ring-1 ring-[#16a34a]/30",
    icon: <CheckCheck className="h-3 w-3" />,
    gradient: "bg-gradient-to-br from-[#16a34a] to-[#4ade80]",
    ring: "ring-[#16a34a]/55",
  },
  SENT: {
    pill: "bg-sky-500/12 text-sky-600 ring-1 ring-sky-500/35",
    icon: <Check className="h-3 w-3" />,
    gradient: "bg-gradient-to-br from-[#0ea5e9] to-[#38bdf8]",
    ring: "ring-[#0ea5e9]/55",
  },
  QUEUED: {
    pill: "bg-slate-500/12 text-slate-500 ring-1 ring-slate-400/35",
    icon: <Clock3 className="h-3 w-3" />,
    gradient: "bg-gradient-to-br from-[#64748b] to-[#94a3b8]",
    ring: "ring-slate-400/55",
  },
  FAILED: {
    pill: "bg-danger-bg text-danger ring-1 ring-[#dc2626]/30",
    icon: <TriangleAlert className="h-3 w-3" />,
    gradient: "bg-gradient-to-br from-[#dc2626] to-[#f87171]",
    ring: "ring-[#dc2626]/55",
  },
};

const CHANNEL_STYLE: Record<NotifyChannel, { pill: string; gradient: string; icon: ReactNode }> = {
  WHATSAPP: {
    pill: "bg-success-bg text-success ring-1 ring-[#16a34a]/30",
    gradient: "bg-gradient-to-br from-[#16a34a] to-[#4ade80]",
    icon: <MessageSquareText className="h-3.5 w-3.5" />,
  },
  SMS: {
    pill: "bg-sky-500/12 text-sky-600 ring-1 ring-sky-500/35",
    gradient: "bg-gradient-to-br from-[#0ea5e9] to-[#38bdf8]",
    icon: <Smartphone className="h-3.5 w-3.5" />,
  },
};

function StatusPill({ status }: { status: NotifyStatus }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.QUEUED;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.pill}`}>
      {style.icon}
      {status}
    </span>
  );
}

export function NotificationsPage() {
  const [channel, setChannel] = useState<"" | NotifyChannel>("");
  const [status, setStatus] = useState<"" | NotifyStatus>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<NotificationRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list", { channel, status, search, page }],
    queryFn: () =>
      notificationsApi.list({
        channel: channel || undefined,
        status: status || undefined,
        search: search || undefined,
        page,
        limit: 25,
      }),
  });

  const deliveredQ = useQuery({
    queryKey: ["notifications", "count", "DELIVERED"],
    queryFn: () => notificationsApi.list({ status: "DELIVERED", limit: 1 }),
    select: (d) => d.meta.total,
  });
  const sentQ = useQuery({
    queryKey: ["notifications", "count", "SENT"],
    queryFn: () => notificationsApi.list({ status: "SENT", limit: 1 }),
    select: (d) => d.meta.total,
  });
  const queuedQ = useQuery({
    queryKey: ["notifications", "count", "QUEUED"],
    queryFn: () => notificationsApi.list({ status: "QUEUED", limit: 1 }),
    select: (d) => d.meta.total,
  });
  const failedQ = useQuery({
    queryKey: ["notifications", "count", "FAILED"],
    queryFn: () => notificationsApi.list({ status: "FAILED", limit: 1 }),
    select: (d) => d.meta.total,
  });

  const counts: {
    value: NotifyStatus;
    label: string;
    icon: ReactNode;
    gradient: string;
    ring: string;
    count: number | undefined;
  }[] = [
    { value: "DELIVERED", label: "Delivered", ...STATUS_STYLE.DELIVERED, icon: <CheckCheck className="h-5 w-5" />, count: deliveredQ.data },
    { value: "SENT", label: "Sent", ...STATUS_STYLE.SENT, icon: <Check className="h-5 w-5" />, count: sentQ.data },
    { value: "QUEUED", label: "Queued", ...STATUS_STYLE.QUEUED, icon: <Clock3 className="h-5 w-5" />, count: queuedQ.data },
    { value: "FAILED", label: "Failed", ...STATUS_STYLE.FAILED, icon: <TriangleAlert className="h-5 w-5" />, count: failedQ.data },
  ];

  const grandTotal =
    deliveredQ.data !== undefined &&
    sentQ.data !== undefined &&
    queuedQ.data !== undefined &&
    failedQ.data !== undefined
      ? deliveredQ.data + sentQ.data + queuedQ.data + failedQ.data
      : undefined;

  const rows = data?.items ?? [];

  const columns: DataTableColumn<NotificationRow>[] = useMemo(
    () => [
      {
        key: "channel",
        header: "Channel",
        sortValue: (n) => n.channel,
        render: (n) => {
          const style = CHANNEL_STYLE[n.channel] ?? CHANNEL_STYLE.SMS;
          return (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${style.pill}`}>
              {style.icon}
              {n.channel}
            </span>
          );
        },
      },
      {
        key: "recipient",
        header: "Recipient",
        sortValue: (n) => n.recipient,
        render: (n) => <span className="font-mono text-xs font-semibold text-ink">{n.recipient}</span>,
      },
      {
        key: "template",
        header: "Template",
        sortValue: (n) => n.template,
        cellClassName: "min-w-[200px]",
        render: (n) => (
          <div>
            <span className="inline-flex rounded-md bg-page px-2 py-0.5 font-mono text-[11px] font-bold text-body ring-1 ring-line">
              {n.template}
            </span>
            {n.title ? <p className="mt-1 truncate text-[11px] text-muted">{n.title}</p> : null}
          </div>
        ),
      },
      {
        key: "body",
        header: "Body",
        cellClassName: "max-w-[340px]",
        render: (n) => (
          <p className="truncate text-xs text-ink" title={n.body}>
            {n.body}
          </p>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortValue: (n) => n.status,
        render: (n) => <StatusPill status={n.status} />,
      },
      {
        key: "created",
        header: "Created",
        align: "right",
        sortValue: (n) => n.createdAt,
        render: (n) => <span className="text-xs text-body">{formatDateTime(n.createdAt)}</span>,
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      {/* Command bar */}
      <section className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#052e16] via-[#16a34a] to-[#0b1220] p-6 text-white shadow-lift">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(74,222,128,0.3),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="rise relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#86efac]">Comms</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">Notifications</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              SMS and WhatsApp delivery logs for customer communications.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
            <BellRing className="h-4 w-4 text-[#86efac]" />
            {grandTotal !== undefined ? `${grandTotal.toLocaleString("en-IN")} messages` : "—"}
          </span>
        </div>
      </section>

      {/* Status count cards (clickable API filters) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((c) => {
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
                active ? `border-transparent ring-2 ring-offset-2 ring-offset-page ${c.ring}` : "border-line"
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
                    {c.count === undefined ? "—" : c.count.toLocaleString("en-IN")}
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
              placeholder="Search recipient, template or body…"
              className={`pl-9 ${TEAL}`}
              aria-label="Search notifications"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([
              { value: "", label: "All channels", icon: <Send className="h-3.5 w-3.5" /> },
              { value: "SMS", label: "SMS", icon: <Smartphone className="h-3.5 w-3.5" /> },
              { value: "WHATSAPP", label: "WhatsApp", icon: <MessageSquareText className="h-3.5 w-3.5" /> },
            ] as { value: "" | NotifyChannel; label: string; icon: ReactNode }[]).map((c) => {
              const active = channel === c.value;
              return (
                <button
                  key={c.value || "all"}
                  type="button"
                  onClick={() => {
                    setChannel(c.value);
                    setPage(1);
                  }}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/20 ${
                    active
                      ? "bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_10px_22px_-14px_rgba(18,178,170,0.9)]"
                      : "border border-line bg-card text-body hover:border-[#12b2aa]/45 hover:text-[#0b7a75]"
                  }`}
                >
                  {c.icon}
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(n) => n.id}
          loading={isLoading}
          skeletonRows={8}
          minWidth="min-w-[1040px]"
          onRowClick={(n) => setPreview(n)}
          empty={
            <EmptyState
              title="No notifications"
              description="Outbound SMS and WhatsApp messages will be listed here."
              icon={<BellRing className="h-6 w-6" />}
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

      {/* Message preview modal */}
      <Modal
        open={Boolean(preview)}
        title="Message preview"
        onClose={() => setPreview(null)}
        footer={
          <>
            <Button variant="secondary" className="cursor-pointer" onClick={() => setPreview(null)}>
              Close
            </Button>
            {preview?.status === "FAILED" && preview.error ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-danger-bg px-4 py-2.5 text-sm font-bold text-danger">
                <TriangleAlert className="h-4 w-4" />
                Provider error
              </span>
            ) : null}
          </>
        }
      >
        {preview ? (
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-page p-3.5">
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-soft ${
                    CHANNEL_STYLE[preview.channel]?.gradient ?? CHANNEL_STYLE.SMS.gradient
                  }`}
                >
                  {CHANNEL_STYLE[preview.channel]?.icon ?? CHANNEL_STYLE.SMS.icon}
                </span>
                <div>
                  <p className="font-mono text-sm font-bold text-ink">{preview.recipient}</p>
                  <p className="text-[11px] text-muted">{preview.channel}</p>
                </div>
              </div>
              <StatusPill status={preview.status} />
            </div>

            {/* Chat wallpaper + bubble */}
            <div className="relative overflow-hidden rounded-2xl border border-line bg-[#e7ded3] p-4">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.12)_1px,transparent_0)] [background-size:18px_18px]"
              />
              <div className="relative flex justify-end">
                <div
                  className={`max-w-[85%] rounded-2xl rounded-tr-md px-4 py-3 shadow-soft ${
                    preview.channel === "WHATSAPP"
                      ? "bg-gradient-to-br from-[#dcfce7] to-[#bbf7d0] text-[#14532d]"
                      : "bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe] text-[#1e3a8a]"
                  }`}
                >
                  {preview.title ? <p className="mb-1 text-xs font-bold opacity-80">{preview.title}</p> : null}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{preview.body}</p>
                  <p className="mt-1.5 flex items-center justify-end gap-1 text-[10px] font-semibold opacity-70">
                    {formatDateTime(preview.createdAt)}
                    {preview.status === "DELIVERED" ? (
                      <CheckCheck className="h-3.5 w-3.5" />
                    ) : preview.status === "SENT" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : preview.status === "FAILED" ? (
                      <TriangleAlert className="h-3.5 w-3.5" />
                    ) : (
                      <Clock3 className="h-3.5 w-3.5" />
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Error */}
            {preview.error ? (
              <div className="rounded-xl border border-[#dc2626]/30 bg-danger-bg p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-bold text-danger">
                  <TriangleAlert className="h-4 w-4" />
                  Error
                </p>
                <p className="mt-1 text-xs text-body">{preview.error}</p>
              </div>
            ) : null}

            {/* Meta */}
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-line bg-card p-3">
                <dt className="text-muted">Template</dt>
                <dd className="mt-0.5 font-mono font-bold text-ink">{preview.template}</dd>
              </div>
              <div className="rounded-xl border border-line bg-card p-3">
                <dt className="text-muted">Provider ref</dt>
                <dd className="mt-0.5 font-mono font-bold text-ink">{preview.providerRef ?? "—"}</dd>
              </div>
              <div className="rounded-xl border border-line bg-card p-3">
                <dt className="text-muted">Created</dt>
                <dd className="mt-0.5 font-semibold text-ink">{formatDateTime(preview.createdAt)}</dd>
              </div>
              <div className="rounded-xl border border-line bg-card p-3">
                <dt className="text-muted">Sent at</dt>
                <dd className="mt-0.5 font-semibold text-ink">
                  {preview.sentAt ? formatDateTime(preview.sentAt) : "—"}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
