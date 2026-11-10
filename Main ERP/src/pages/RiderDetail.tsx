import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  PackageCheck,
  Phone,
  ScanLine,
  Timer,
  Truck,
  Undo2,
  UserRound,
} from "lucide-react";
import { ridersApi } from "../api/endpoints";
import type { RiderTask } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { formatCurrency } from "../lib/format";
import { STATUS_LABELS } from "../lib/rbac";

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function KpiCard({
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
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-ink">{value}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-soft transition-transform duration-300 group-hover:-rotate-6 ${gradient}`}>
          {icon}
        </span>
      </div>
    </Card>
  );
}

const TASK_COLUMNS: DataTableColumn<RiderTask>[] = [
  {
    key: "seq",
    header: "Seq",
    render: (t) => (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-page text-[11px] font-extrabold text-body">
        {t.sequence}
      </span>
    ),
  },
  {
    key: "type",
    header: "Type",
    render: (t) =>
      t.type === "DELIVERY" ? (
        <span className="rounded-full bg-[#12b2aa]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#0b7a75]">
          DELIVERY
        </span>
      ) : (
        <span className="rounded-full bg-[#6366f1]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#4f46e5]">
          {t.type}
        </span>
      ),
  },
  {
    key: "awb",
    header: "AWB",
    sortValue: (t) => t.awbNumber,
    render: (t) => (
      <span className="font-mono text-xs font-bold text-ink transition-colors group-hover:text-[#0b7a75]">
        {t.awbNumber}
      </span>
    ),
  },
  {
    key: "customer",
    header: "Customer",
    render: (t) => (
      <span>
        <span className="block font-medium text-ink">{t.customer.name}</span>
        <span className="block text-[11px] text-muted">{t.customer.phone}</span>
      </span>
    ),
  },
  { key: "city", header: "City", render: (t) => <span className="text-ink">{t.customer.city}</span> },
  {
    key: "shipment",
    header: "Shipment",
    render: (t) => <StatusBadge status={t.shipmentStatus} label={STATUS_LABELS[t.shipmentStatus]} />,
  },
  {
    key: "task",
    header: "Task",
    render: (t) =>
      t.status === "COMPLETED" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success">
          <CheckCircle2 className="h-3 w-3" />
          COMPLETED
        </span>
      ) : t.status === "PENDING" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#f59e0b]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#b45309]">
          <Timer className="h-3 w-3" />
          PENDING
        </span>
      ) : (
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand">
          {t.status}
        </span>
      ),
  },
  {
    key: "cod",
    header: "COD",
    align: "right",
    sortValue: (t) => t.codAmount,
    render: (t) =>
      t.codAmount > 0 ? (
        <span className="rounded-full bg-[#f59e0b]/10 px-2 py-0.5 text-xs font-bold text-[#b45309]">
          {formatCurrency(t.codAmount)}
        </span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
];

export function RiderDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignOpen, setAssignOpen] = useState(false);
  const [awb, setAwb] = useState("");
  const [unassignAwb, setUnassignAwb] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["riders", "tasks", id, date],
    queryFn: () => ridersApi.tasks(id, date),
    enabled: Boolean(id),
  });

  const { data: listData } = useQuery({
    queryKey: ["riders", "list"],
    queryFn: () => ridersApi.list(),
  });
  const rider = listData?.items.find((r) => r.id === id);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["riders"] });
    void queryClient.invalidateQueries({ queryKey: ["shipments"] });
  };

  const assign = useMutation({
    mutationFn: () => ridersApi.assign(id, awb.trim().toUpperCase()),
    onSuccess: (res) => {
      toast.success(`${res.shipment.awbNumber} assigned to rider`);
      setAwb("");
      setAssignOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Assign failed"),
  });

  const unassign = useMutation({
    mutationFn: (targetAwb: string) => ridersApi.unassign(id, targetAwb),
    onSuccess: () => {
      toast.success("Shipment unassigned");
      setUnassignAwb("");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Unassign failed"),
  });

  const tasks: RiderTask[] = data ? [...data.deliveries, ...data.pickups].sort((a, b) => a.sequence - b.sequence) : [];

  const onAssign = (e: FormEvent) => {
    e.preventDefault();
    if (!awb.trim()) return;
    assign.mutate();
  };

  if (isLoading && !rider) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-52 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const columns: DataTableColumn<RiderTask>[] = [
    ...TASK_COLUMNS,
    {
      key: "actions",
      header: "",
      align: "right",
      render: (t) =>
        t.status !== "COMPLETED" ? (
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer text-danger hover:text-danger"
            onClick={(e) => {
              e.stopPropagation();
              setUnassignAwb(t.awbNumber);
              unassign.mutate(t.awbNumber);
            }}
            icon={<Undo2 className="h-3.5 w-3.5" />}
          >
            Unassign
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b4a46] via-[#0e6b64] to-[#0b1220] p-6 text-white shadow-lift sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.3),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(123,192,67,0.18),transparent)] blob-drift"
          style={{ animationDelay: "-8s" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />

        <div className="rise relative">
          <Link
            to="/riders"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Riders
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl font-extrabold shadow-lift ring-1 ring-white/25 backdrop-blur">
                {initials(rider?.name)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-bold tracking-tight">{rider?.name ?? "Rider"}</h2>
                  <span className="inline-flex rounded-full bg-white p-1 shadow-soft">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        rider?.status === "ACTIVE" ? "bg-success-bg text-success" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {rider?.status ?? "—"}
                    </span>
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {rider?.phone ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                      <Phone className="h-3 w-3 text-[#5EEAD4]" />
                      {rider.phone}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                    <MapPin className="h-3 w-3 text-[#5EEAD4]" />
                    {rider?.location?.name ?? "No location"}
                  </span>
                  {rider?.vehicle ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                      <Truck className="h-3 w-3 text-[#5EEAD4]" />
                      {rider.vehicle.vehicleType}
                      {rider.vehicle.vehicleNumber ? ` · ${rider.vehicle.vehicleNumber}` : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:w-52">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Actions</p>
              <Button
                className="shine w-full cursor-pointer bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_10px_22px_-12px_rgba(18,178,170,0.9)]"
                onClick={() => setAssignOpen(true)}
                icon={<ScanLine className="h-4 w-4" />}
              >
                Assign shipment
              </Button>
              <Link
                to="/riders"
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur transition hover:bg-white/20"
              >
                <UserRound className="h-3.5 w-3.5" />
                All riders
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Completed today"
          value={data?.completed ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#16a34a] to-[#4ade80]"
        />
        <KpiCard
          label="Pending today"
          value={data?.pending ?? 0}
          icon={<Timer className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#f59e0b] to-[#fbbf24]"
        />
        <KpiCard
          label="Delivered (rider)"
          value={rider?.deliveredToday ?? 0}
          icon={<PackageCheck className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF]"
        />
        <KpiCard
          label="Total tasks"
          value={rider?.totalTasks ?? 0}
          icon={<Truck className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]"
        />
      </div>

      {/* Run sheet */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#4f46e5] text-white shadow-soft">
              <Truck className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Run sheet</h2>
              <p className="text-[11px] text-muted">
                {data
                  ? `${data.deliveries.length} deliveries · ${data.pickups.length} pickups`
                  : "Loading tasks…"}
              </p>
            </div>
          </div>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="sm:w-44 focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15"
            aria-label="Run sheet date"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={tasks}
            rowKey={(t) => t.id}
            minWidth="min-w-[980px]"
            onRowClick={(t) => navigate(`/shipments/${t.awbNumber}`)}
            empty={
              <EmptyState
                title="No tasks for this day"
                description="Assign a shipment to build the rider's run sheet."
                icon={<PackageCheck className="h-6 w-6" />}
                action={
                  <Button size="sm" className="cursor-pointer" onClick={() => setAssignOpen(true)}>
                    Assign shipment
                  </Button>
                }
              />
            }
          />
        )}
      </Card>

      {/* Assign modal */}
      <Modal
        open={assignOpen}
        title="Assign shipment to rider"
        onClose={() => setAssignOpen(false)}
        footer={
          <>
            <Button variant="secondary" className="cursor-pointer" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              loading={assign.isPending}
              disabled={!awb.trim()}
              onClick={() => assign.mutate()}
            >
              Assign
            </Button>
          </>
        }
      >
        <form onSubmit={onAssign} className="space-y-3">
          <Input
            label="AWB number"
            value={awb}
            onChange={(e) => setAwb(e.target.value)}
            placeholder="e.g. SWL1234567890"
            className="font-mono uppercase focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15"
            required
            minLength={4}
          />
          <p className="rounded-xl border border-dashed border-[#12b2aa]/45 bg-[#12b2aa]/[0.06] px-3 py-2 text-xs text-body">
            The shipment will be marked for pickup or delivery based on its current status.
          </p>
          <button type="submit" className="hidden">
            Submit
          </button>
        </form>
      </Modal>
      {unassignAwb ? <span className="sr-only">{unassignAwb}</span> : null}
    </div>
  );
}
