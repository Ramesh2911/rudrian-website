import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  IndianRupee,
  LockKeyhole,
  PackagePlus,
  ScanLine,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { posApi } from "../api/endpoints";
import type { ClosingRow, LedgerEntry } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { formatCurrency, formatDate, formatDateTime, todayKey } from "../lib/format";

function KpiCard({
  label,
  value,
  icon,
  gradient,
  sub,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  gradient: string;
  sub?: string;
}) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-[24px] opacity-[0.08] transition-transform duration-300 group-hover:scale-125 ${gradient}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-ink">{value}</p>
          {sub ? <p className="mt-1 text-[11px] text-body">{sub}</p> : null}
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

function typePill(type: LedgerEntry["type"]) {
  if (type === "CASH_IN") {
    return (
      <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success">CASH IN</span>
    );
  }
  if (type === "CASH_OUT") {
    return <span className="rounded-full bg-danger-bg px-2.5 py-0.5 text-[11px] font-bold text-danger">CASH OUT</span>;
  }
  return (
    <span className="rounded-full bg-[#f59e0b]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#b45309]">
      {type}
    </span>
  );
}

const LEDGER_COLUMNS: DataTableColumn<LedgerEntry>[] = [
  {
    key: "type",
    header: "Type",
    sortValue: (e) => e.type,
    render: (e) => typePill(e.type),
  },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    sortValue: (e) => e.amount,
    render: (e) => (
      <span
        className={`font-bold ${
          e.type === "CASH_IN" ? "text-success" : e.type === "CASH_OUT" ? "text-danger" : "text-[#b45309]"
        }`}
      >
        {e.type === "CASH_OUT" ? "−" : e.type === "CASH_IN" ? "+" : "±"}
        {formatCurrency(e.amount)}
      </span>
    ),
  },
  {
    key: "description",
    header: "Description",
    cellClassName: "max-w-[280px] truncate text-ink",
    render: (e) => e.description,
  },
  {
    key: "reference",
    header: "Reference",
    render: (e) => <span className="font-mono text-xs">{e.reference ?? "—"}</span>,
  },
  { key: "by", header: "By", render: (e) => e.by ?? "—" },
  {
    key: "at",
    header: "At",
    align: "right",
    sortValue: (e) => e.at,
    render: (e) => <span className="text-xs text-body">{formatDateTime(e.at)}</span>,
  },
];

const CLOSING_COLUMNS: DataTableColumn<ClosingRow>[] = [
  {
    key: "date",
    header: "Date",
    sortValue: (c) => c.date,
    render: (c) => <span className="font-semibold text-ink">{formatDate(c.date)}</span>,
  },
  {
    key: "expected",
    header: "Expected",
    align: "right",
    sortValue: (c) => c.expectedAmount,
    render: (c) => <span className="text-body">{formatCurrency(c.expectedAmount)}</span>,
  },
  {
    key: "closed",
    header: "Closed",
    align: "right",
    sortValue: (c) => c.closedAmount,
    render: (c) => <span className="font-semibold text-ink">{formatCurrency(c.closedAmount)}</span>,
  },
  {
    key: "difference",
    header: "Difference",
    align: "right",
    sortValue: (c) => c.difference,
    render: (c) =>
      c.difference === 0 ? (
        <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-bold text-success">
          {formatCurrency(c.difference)}
        </span>
      ) : (
        <span className="rounded-full bg-[#f59e0b]/10 px-2.5 py-0.5 text-xs font-bold text-[#b45309]">
          {formatCurrency(c.difference)}
        </span>
      ),
  },
  { key: "by", header: "By", render: (c) => c.closedBy ?? "—" },
  {
    key: "remarks",
    header: "Remarks",
    render: (c) => <span className="text-xs text-body">{c.remarks ?? "—"}</span>,
  },
];

export function PosPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayKey());
  const [searchAwb, setSearchAwb] = useState("");
  const [closedAmount, setClosedAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["pos", "ledger", date],
    queryFn: () => posApi.ledger({ date }),
  });

  const { data: closings } = useQuery({
    queryKey: ["pos", "closings"],
    queryFn: () => posApi.closings(),
  });

  const { data: searchResult, refetch: searchRefetch, isFetching: searching } = useQuery({
    queryKey: ["pos", "search", searchAwb],
    queryFn: () => posApi.search(searchAwb),
    enabled: false,
  });

  const closeDay = useMutation({
    mutationFn: () =>
      posApi.closeDay({ date, closedAmount: Number(closedAmount), remarks: remarks || undefined }),
    onSuccess: () => {
      toast.success("Day closed successfully");
      setClosedAmount("");
      setRemarks("");
      void queryClient.invalidateQueries({ queryKey: ["pos"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not close day"),
  });

  const totals = data?.totals;
  const diff = totals && closedAmount !== "" ? Number(closedAmount) - totals.expectedClosing : null;

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5EEAD4]">Counter</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">Counter / POS</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              Counter bookings, cash ledger and end-of-day closing.
            </p>
            <p className="mt-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              {formatDate(date)}
            </p>
          </div>
          <Link
            to="/shipments/new"
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-ink shadow-lift transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(0,0,0,0.5)]"
          >
            <PackagePlus className="h-4 w-4 text-[#0e8f8a]" />
            Counter booking
          </Link>
        </div>
      </section>

      {/* Day totals KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !totals ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <KpiCard
              label="Cash in"
              value={formatCurrency(totals.cashIn)}
              sub={`${totals.count} ledger entr${totals.count === 1 ? "y" : "ies"}`}
              icon={<TrendingUp className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-[#16a34a] to-[#4ade80]"
            />
            <KpiCard
              label="Cash out"
              value={formatCurrency(totals.cashOut)}
              icon={<TrendingDown className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-[#dc2626] to-[#f87171]"
            />
            <KpiCard
              label="Adjustments"
              value={formatCurrency(totals.adjustments)}
              icon={<IndianRupee className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-[#f59e0b] to-[#fbbf24]"
            />
            <KpiCard
              label="Expected closing"
              value={formatCurrency(totals.expectedClosing)}
              sub={data?.closing ? "Day already closed" : "Counted cash target"}
              icon={<Wallet className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF]"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Ledger */}
        <Card className="lg:col-span-2" padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-white shadow-soft">
                <BookOpenText className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">Cash ledger</h2>
                <p className="text-[11px] text-muted">
                  {data ? `${data.entries.length} entr${data.entries.length === 1 ? "y" : "ies"}` : "Loading…"}
                </p>
              </div>
            </div>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="sm:w-44 focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15"
              aria-label="Ledger date"
            />
          </div>
          <DataTable
            columns={LEDGER_COLUMNS}
            rows={data?.entries ?? []}
            rowKey={(e) => e.id}
            loading={isLoading}
            skeletonRows={5}
            minWidth="min-w-[780px]"
            empty={
              <EmptyState
                title="No ledger entries"
                description="Counter cash-ins appear here as bookings are made."
                icon={<BookOpenText className="h-6 w-6" />}
              />
            }
          />
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Close the day */}
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-soft ${
                  data?.closing
                    ? "bg-gradient-to-br from-[#16a34a] to-[#4ade80]"
                    : "bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]"
                }`}
              >
                <LockKeyhole className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">Close the day</h2>
                <p className="text-[11px] text-muted">End-of-day cash reconciliation</p>
              </div>
            </div>
            {data?.closing ? (
              <div className="rounded-xl border border-[#16a34a]/25 bg-gradient-to-br from-success-bg to-white p-3.5">
                <p className="inline-flex items-center gap-1.5 text-sm font-bold text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Already closed
                </p>
                <dl className="mt-2.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-body">Expected</dt>
                    <dd className="font-semibold text-ink">{formatCurrency(data.closing.expectedAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-body">Counted</dt>
                    <dd className="font-semibold text-ink">{formatCurrency(data.closing.closedAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-body">Difference</dt>
                    <dd
                      className={`font-bold ${data.closing.difference === 0 ? "text-success" : "text-[#b45309]"}`}
                    >
                      {formatCurrency(data.closing.difference)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-[11px] text-muted">{formatDateTime(data.closing.closedAt)}</p>
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  if (closedAmount === "") return;
                  closeDay.mutate();
                }}
              >
                <Input
                  label="Expected cash"
                  value={formatCurrency(totals?.expectedClosing ?? 0)}
                  readOnly
                  className="bg-page"
                />
                <Input
                  label="Counted cash"
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={closedAmount}
                  onChange={(e) => setClosedAmount(e.target.value)}
                  placeholder="Physical cash counted"
                  className="focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15"
                />
                {diff !== null ? (
                  <p
                    className={`inline-flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                      diff === 0 ? "bg-success-bg text-success" : "bg-[#f59e0b]/10 text-[#b45309]"
                    }`}
                  >
                    <span>Difference</span>
                    <span>{formatCurrency(diff)}</span>
                  </p>
                ) : null}
                <Input
                  label="Remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional notes"
                  className="focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15"
                />
                <Button
                  type="submit"
                  className="shine w-full cursor-pointer bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_12px_26px_-14px_rgba(18,178,170,0.8)] hover:-translate-y-0.5"
                  loading={closeDay.isPending}
                  icon={<LockKeyhole className="h-4 w-4" />}
                >
                  Close day
                </Button>
              </form>
            )}
          </Card>

          {/* AWB quick search */}
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white shadow-soft">
                <ScanLine className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">AWB quick search</h2>
                <p className="text-[11px] text-muted">Fetch a consignment instantly</p>
              </div>
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (!searchAwb.trim()) return;
                void searchRefetch();
              }}
            >
              <Input
                value={searchAwb}
                onChange={(e) => setSearchAwb(e.target.value)}
                placeholder="AWB number"
                className="flex-1 font-mono uppercase focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15"
              />
              <Button
                variant="secondary"
                type="submit"
                className="cursor-pointer"
                loading={searching}
                icon={<Search className="h-4 w-4" />}
                aria-label="Search"
              />
            </form>
            {searchResult ? (
              <Link
                to={`/shipments/${searchResult.awbNumber}`}
                className="group mt-3 block cursor-pointer rounded-xl border border-[#12b2aa]/35 bg-[#12b2aa]/[0.04] p-3.5 transition hover:border-[#12b2aa]/60 hover:shadow-soft"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs font-bold text-[#0b7a75]">{searchResult.awbNumber}</p>
                  <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-[#0e8f8a]" />
                </div>
                <p className="mt-1.5 text-sm font-semibold text-ink">
                  {searchResult.receiver.name} · {searchResult.receiver.city}
                </p>
                <p className="mt-1 text-xs text-body">
                  {searchResult.statusLabel} · COD {formatCurrency(searchResult.parcel.codAmount)} · Total{" "}
                  {formatCurrency(searchResult.charges.total)}
                </p>
              </Link>
            ) : null}
          </Card>
        </div>
      </div>

      {/* Closings history */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#4f46e5] text-white shadow-soft">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Closings history</h2>
              <p className="text-[11px] text-muted">
                {closings ? `${closings.items.length} day${closings.items.length === 1 ? "" : "s"} closed` : "Loading…"}
              </p>
            </div>
          </div>
        </div>
        <DataTable
          columns={CLOSING_COLUMNS}
          rows={closings?.items ?? []}
          rowKey={(c) => c.id}
          loading={!closings}
          skeletonRows={4}
          minWidth="min-w-[820px]"
          onRowClick={(c) => setDate(String(c.date).slice(0, 10))}
          empty={
            <EmptyState
              title="No closings yet"
              description="Closings you submit will be listed here."
              icon={<CheckCircle2 className="h-6 w-6" />}
            />
          }
        />
      </Card>
    </div>
  );
}
