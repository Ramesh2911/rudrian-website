import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  Phone,
  RefreshCw,
  Truck,
  UserRound,
} from "lucide-react";
import { shipmentsApi } from "../api/endpoints";
import type { ShipmentStatus } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { StatusBadge } from "../components/ui/StatusBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Textarea } from "../components/ui/Textarea";
import { useToast } from "../components/ui/Toast";
import { PrintLabel } from "../components/PrintLabel";
import { formatCurrency, formatDateTime } from "../lib/format";
import { SHIPMENT_TRANSITIONS, STATUS_LABELS } from "../lib/rbac";

const JOURNEY: ShipmentStatus[] = ["BOOKED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

function PartyCard({
  title,
  subtitle,
  icon,
  gradient,
  party,
}: {
  title: string;
  subtitle: string;
  icon: typeof Package;
  gradient: string;
  party: { name: string; phone: string; address: string; pincode: string; city: string; state?: string | null };
}) {
  const Icon = icon;
  return (
    <Card className="rise">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-soft ${gradient}`}>
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <p className="text-[11px] text-muted">{subtitle}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-page px-2.5 py-1 text-[11px] font-medium text-body">
          <Phone className="h-3 w-3 text-[#0e8f8a]" />
          {party.phone}
        </span>
      </div>
      <p className="text-[15px] font-semibold text-ink">{party.name}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-body">{party.address}</p>
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#12b2aa]/[0.07] px-2.5 py-1 text-xs font-semibold text-[#0b7a75]">
        <MapPin className="h-3 w-3" />
        {party.city} · {party.pincode}
        {party.state ? ` · ${party.state}` : ""}
      </p>
    </Card>
  );
}

export function ShipmentDetailPage() {
  const { id = "" } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusOpen, setStatusOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<ShipmentStatus | "">("");
  const [remarks, setRemarks] = useState("");
  const [copied, setCopied] = useState(false);
  const [podOpen, setPodOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shipments", "detail", id],
    queryFn: () => shipmentsApi.get(id),
    enabled: Boolean(id),
  });

  const nextOptions = useMemo(() => (data ? SHIPMENT_TRANSITIONS[data.status] ?? [] : []), [data]);

  const statusMutation = useMutation({
    mutationFn: () =>
      shipmentsApi.updateStatus(id, {
        status: nextStatus as ShipmentStatus,
        remarks: remarks || undefined,
      }),
    onSuccess: () => {
      toast.success("Shipment status updated");
      setStatusOpen(false);
      setNextStatus("");
      setRemarks("");
      void queryClient.invalidateQueries({ queryKey: ["shipments"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Status update failed"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-line bg-card">
        <EmptyState
          title="Shipment not found"
          description={`We could not find a shipment for "${id}".`}
          action={
            <Link to="/shipments">
              <Button variant="secondary" size="sm" className="cursor-pointer" icon={<ArrowLeft className="h-4 w-4" />}>
                Back to shipments
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const copyAwb = async () => {
    try {
      await navigator.clipboard.writeText(data.awbNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.info(data.awbNumber);
    }
  };

  const journeyIdx = JOURNEY.indexOf(data.status);
  const stepDone = (step: ShipmentStatus, i: number) =>
    journeyIdx >= 0 ? i <= journeyIdx : step === "BOOKED" || data.timeline.some((t) => t.status === step);

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
            to="/shipments"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-white/20"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Shipments
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-mono text-3xl font-extrabold tracking-wider sm:text-4xl">
                  {data.awbNumber}
                </h2>
                <button
                  type="button"
                  onClick={() => void copyAwb()}
                  aria-label="Copy AWB number"
                  title={copied ? "Copied" : "Copy AWB"}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-white/20 bg-white/10 transition hover:bg-white/20"
                >
                  {copied ? <Check className="h-4 w-4 text-[#C7F09A]" /> : <Copy className="h-4 w-4" />}
                </button>
                <span className="inline-flex rounded-full bg-white p-1 shadow-soft">
                  <StatusBadge status={data.status} label={data.statusLabel} />
                </span>
              </div>

              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/75">
                <span className="font-medium text-white">{data.originLocation?.name ?? "-"}</span>
                <ArrowRight className="h-4 w-4 text-[#5EEAD4]" aria-hidden="true" />
                <span className="font-medium text-white">{data.destLocation?.name ?? "-"}</span>
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {data.serviceType}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {data.bookingSource}
                </span>
                {data.currentLocation ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                    <MapPin className="h-3 w-3 text-[#5EEAD4]" />
                    {data.currentLocation.name}
                  </span>
                ) : null}
                {data.rider ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                    <UserRound className="h-3 w-3 text-[#5EEAD4]" />
                    {data.rider.name}
                  </span>
                ) : null}
                {data.hasOtp ? (
                  <span className="rounded-full border border-[#7BC043]/40 bg-[#7BC043]/15 px-3 py-1 text-xs font-semibold text-[#C7F09A]">
                    OTP enabled
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:w-52">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Actions</p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full cursor-pointer"
                onClick={() => void copyAwb()}
                icon={<Copy className="h-3.5 w-3.5" />}
              >
                {copied ? "Copied" : "Copy AWB"}
              </Button>
              <div className="[&>button]:w-full">
                <PrintLabel shipment={data} />
              </div>
              {nextOptions.length > 0 ? (
                <Button
                  size="sm"
                  className="shine w-full cursor-pointer bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_10px_22px_-12px_rgba(18,178,170,0.9)]"
                  onClick={() => {
                    setNextStatus("");
                    setRemarks("");
                    setStatusOpen(true);
                  }}
                  icon={<RefreshCw className="h-3.5 w-3.5" />}
                >
                  Update status
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Journey stepper */}
      <Card className="rise" style={{ animationDelay: "60ms" }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">Shipment journey</h3>
          <span className="rounded-full bg-[#12b2aa]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0b7a75]">
            {data.timeline.length} update{data.timeline.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-x-auto pb-1">
          <ol className="flex min-w-[600px] items-center">
            {JOURNEY.map((step, i) => {
              const done = stepDone(step, i);
              const current = journeyIdx === i;
              const nextDone = i < JOURNEY.length - 1 && stepDone(JOURNEY[i + 1], i + 1);
              return (
                <li key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold transition-all ${
                        done
                          ? "bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-white shadow-soft"
                          : "border-2 border-line bg-card text-muted"
                      } ${current ? "ring-4 ring-[#12b2aa]/25" : ""}`}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span
                      className={`whitespace-nowrap text-xs font-semibold ${done ? "text-ink" : "text-muted"}`}
                    >
                      {STATUS_LABELS[step] ?? step}
                    </span>
                  </div>
                  {i < JOURNEY.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={`mx-3 h-1 flex-1 rounded-full ${nextDone || done ? "bg-gradient-to-r from-[#12b2aa] to-[#5EEAD4]" : "bg-line"}`}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      {/* Party + parcel */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PartyCard
          title="Sender"
          subtitle="Pickup details"
          icon={MapPin}
          gradient="bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF]"
          party={data.sender}
        />
        <PartyCard
          title="Receiver"
          subtitle="Delivery details"
          icon={Navigation}
          gradient="bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]"
          party={data.receiver}
        />
        <Card className="rise" style={{ animationDelay: "80ms" }}>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] text-white shadow-soft">
              <Package className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ink">Parcel &amp; charges</h3>
              <p className="text-[11px] text-muted">{data.parcel.category}</p>
            </div>
          </div>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-body">Dimensions</dt>
              <dd className="font-medium text-ink">
                {data.parcel.lengthCm} × {data.parcel.widthCm} × {data.parcel.heightCm} cm
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body">Chargeable wt</dt>
              <dd className="font-medium text-ink">{data.parcel.chargeableWeight} kg</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body">Base</dt>
              <dd className="text-ink">{formatCurrency(data.charges.baseCharge)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body">Fuel</dt>
              <dd className="text-ink">{formatCurrency(data.charges.fuelSurcharge)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body">COD</dt>
              <dd className="text-ink">{formatCurrency(data.charges.codCharge)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body">Insurance</dt>
              <dd className="text-ink">{formatCurrency(data.charges.insuranceCharge)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body">GST</dt>
              <dd className="text-ink">{formatCurrency(data.charges.gstAmount)}</dd>
            </div>
            <div className="mt-3 flex justify-between rounded-xl bg-gradient-to-r from-[#0b4a46] to-[#0e6b64] px-3.5 py-2.5 text-white shadow-soft">
              <dt className="text-sm font-semibold">Total</dt>
              <dd className="text-sm font-extrabold">{formatCurrency(data.charges.total)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Timeline + side cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#4f46e5] text-white shadow-soft">
                <ClipboardList className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">Tracking timeline</h3>
                <p className="text-[11px] text-muted">Latest first</p>
              </div>
            </div>
          </div>
          {data.timeline.length === 0 ? (
            <p className="text-sm text-muted">No updates yet.</p>
          ) : (
            <ol className="relative ml-3 space-y-5 border-l-2 border-[#12b2aa]/25">
              {[...data.timeline].reverse().map((t, i) => (
                <li
                  key={`${t.status}-${t.at}-${i}`}
                  className={`rise pl-5 ${i === 0 ? "rounded-xl bg-page/80 p-3 shadow-soft" : ""}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[7px] mt-1 h-3 w-3 rounded-full border-2 border-card ${
                      i === 0
                        ? "bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] ring-4 ring-[#12b2aa]/20"
                        : "bg-[#12b2aa]/70"
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={t.status} label={t.statusLabel} />
                    <span className="text-xs text-muted">{formatDateTime(t.at)}</span>
                    {i === 0 ? (
                      <span className="rounded-full bg-[#12b2aa]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0b7a75]">
                        Latest
                      </span>
                    ) : null}
                  </div>
                  {t.location ? (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-body">
                      <MapPin className="h-3 w-3 text-[#0e8f8a]" />
                      {t.location}
                      {t.locationType ? ` (${t.locationType})` : ""}
                    </p>
                  ) : null}
                  {t.remarks ? <p className="mt-1 text-sm text-body">{t.remarks}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#16a34a] to-[#4ade80] text-white shadow-soft">
                <PackageCheck className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">Proof of delivery</h3>
                <p className="text-[11px] text-muted">Photo &amp; signature</p>
              </div>
            </div>
            {data.pod ? (
              <div className="space-y-3">
                {data.pod.photoUrl ? (
                  <button
                    type="button"
                    className="group relative block w-full cursor-pointer overflow-hidden rounded-xl border border-line"
                    onClick={() => setPodOpen(true)}
                    aria-label="View POD photo full size"
                  >
                    <img src={data.pod.photoUrl} alt="POD" className="h-40 w-full object-cover transition duration-300 group-hover:scale-105" />
                    <span className="absolute right-2 bottom-2 grid h-8 w-8 place-items-center rounded-lg bg-ink/60 text-white backdrop-blur transition group-hover:bg-ink/80">
                      <Eye className="h-4 w-4" />
                    </span>
                  </button>
                ) : null}
                {data.pod.signatureUrl ? (
                  <img src={data.pod.signatureUrl} alt="Signature" className="h-20 rounded-xl border border-line bg-white object-contain" />
                ) : null}
                <p className="text-sm text-body">
                  Received by <span className="font-semibold text-ink">{data.pod.recipientName ?? "-"}</span>
                </p>
                {data.pod.otpVerified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-bold text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    OTP verified
                  </span>
                ) : null}
                <p className="text-xs text-muted">{formatDateTime(data.pod.capturedAt)}</p>
                {data.pod.notes ? <p className="text-sm text-body">{data.pod.notes}</p> : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-page/60 px-4 py-6 text-center">
                <p className="text-sm font-medium text-body">POD not captured yet</p>
                <p className="mt-0.5 text-xs text-muted">The rider app captures it at handover.</p>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0ea5e9] to-[#38bdf8] text-white shadow-soft">
                <CalendarClock className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">Key timestamps</h3>
                <p className="text-[11px] text-muted">Journey milestones</p>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                { label: "Booked", value: data.createdAt, icon: Package },
                { label: "Picked up", value: data.pickedUpAt, icon: Truck },
                { label: "Out for delivery", value: data.outForDeliveryAt, icon: Navigation },
                { label: "Delivered", value: data.deliveredAt, icon: CheckCircle2 },
              ].map((row) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${row.value ? "bg-page/70" : ""}`}
                  >
                    <dt className="flex items-center gap-2 text-xs font-medium text-body">
                      <Icon className={`h-3.5 w-3.5 ${row.value ? "text-[#0e8f8a]" : "text-muted"}`} />
                      {row.label}
                    </dt>
                    <dd className={`text-xs ${row.value ? "font-semibold text-ink" : "text-muted"}`}>
                      {row.value ? formatDateTime(row.value) : "—"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </Card>
        </div>
      </div>

      <Modal
        open={statusOpen}
        title="Update shipment status"
        onClose={() => setStatusOpen(false)}
        footer={
          <>
            <Button variant="secondary" className="cursor-pointer" onClick={() => setStatusOpen(false)}>
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              loading={statusMutation.isPending}
              disabled={!nextStatus}
              onClick={() => statusMutation.mutate()}
            >
              Update status
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Next status"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value as ShipmentStatus)}
            placeholder="Select status"
            required
          >
            {nextOptions.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          {nextStatus === "DELIVERED" ? (
            <p className="rounded-xl bg-warning-bg px-3 py-2 text-xs text-warning">
              Delivery OTP is handled by the rider app at handover. Marking delivered here records a manual POD event.
            </p>
          ) : null}
          <Textarea label="Remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes for the timeline" maxLength={500} />
        </div>
      </Modal>

      <Modal open={podOpen} title="Proof of delivery" onClose={() => setPodOpen(false)} size="lg">
        {data.pod?.photoUrl ? <img src={data.pod.photoUrl} alt="POD full" className="w-full rounded-xl" /> : null}
      </Modal>

      <button type="button" className="sr-only" onClick={() => navigate("/shipments")}>
        Back
      </button>
    </div>
  );
}
