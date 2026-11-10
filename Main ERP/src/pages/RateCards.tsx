import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calculator,
  CheckCircle2,
  Layers,
  MapPin,
  Package,
  Percent,
  Pencil,
  Plus,
  Tags,
  Timer,
  Truck,
  Zap,
} from "lucide-react";
import { rateCardsApi } from "../api/endpoints";
import type { RateRule, RateRulePayload, ServiceType } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { useToast } from "../components/ui/Toast";
import { formatCurrency, formatDate } from "../lib/format";

type FormState = Omit<RateRulePayload, "serviceType"> & { serviceType: ServiceType };

const emptyForm: FormState = {
  serviceType: "STANDARD",
  fromZone: "ANY",
  toZone: "ANY",
  baseCharge: 40,
  perKgRate: 20,
  minCharge: 40,
  fuelPercent: 9,
  codPercent: 3,
  insurancePercent: 0.5,
  gstPercent: 18,
  estimatedDays: 3,
  active: true,
};

const TEAL = "focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15";

const SERVICE_STYLE: Record<ServiceType, { pill: string; gradient: string; icon: ReactNode; ring: string }> = {
  STANDARD: {
    pill: "bg-sky-500/12 text-sky-600 ring-1 ring-sky-500/35",
    gradient: "bg-gradient-to-br from-[#0ea5e9] to-[#38bdf8]",
    icon: <Package className="h-5 w-5" />,
    ring: "ring-sky-500/50",
  },
  EXPRESS: {
    pill: "bg-violet-500/12 text-violet-600 ring-1 ring-violet-500/35",
    gradient: "bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa]",
    icon: <Zap className="h-5 w-5" />,
    ring: "ring-violet-500/50",
  },
  SURFACE: {
    pill: "bg-slate-500/12 text-slate-600 ring-1 ring-slate-400/35",
    gradient: "bg-gradient-to-br from-[#475569] to-[#64748b]",
    icon: <Truck className="h-5 w-5" />,
    ring: "ring-slate-400/55",
  },
};

function SectionLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="mb-2 mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
      <span className="text-[#0e8f8a]">{icon}</span>
      {children}
    </p>
  );
}

export function RateCardsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RateRule | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [svcFilter, setSvcFilter] = useState<"" | ServiceType>("");

  const { data, isLoading } = useQuery({
    queryKey: ["rate-cards"],
    queryFn: () => rateCardsApi.list(),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: RateRulePayload = {
        serviceType: form.serviceType,
        fromZone: form.fromZone || "ANY",
        toZone: form.toZone || "ANY",
        baseCharge: Number(form.baseCharge),
        perKgRate: Number(form.perKgRate),
        minCharge: Number(form.minCharge),
        fuelPercent: Number(form.fuelPercent),
        codPercent: Number(form.codPercent),
        insurancePercent: Number(form.insurancePercent),
        gstPercent: Number(form.gstPercent),
        estimatedDays: Number(form.estimatedDays),
        active: form.active,
      };
      if (editing) return rateCardsApi.update(editing.id, payload);
      return rateCardsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Rate rule updated" : "Rate rule created");
      setOpen(false);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["rate-cards"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save rule"),
  });

  const setNum = (key: keyof FormState, value: string) =>
    setForm({ ...form, [key]: Number(value) } as FormState);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (r: RateRule) => {
    setEditing(r);
    setForm({
      serviceType: r.serviceType,
      fromZone: r.fromZone,
      toZone: r.toZone,
      baseCharge: r.baseCharge,
      perKgRate: r.perKgRate,
      minCharge: r.minCharge,
      fuelPercent: r.fuelPercent,
      codPercent: r.codPercent,
      insurancePercent: r.insurancePercent,
      gstPercent: r.gstPercent,
      estimatedDays: r.estimatedDays,
      active: r.active,
    });
    setOpen(true);
  };

  const rules = data?.rules ?? [];
  const zones = data?.zones ?? [];

  const filtered = useMemo(
    () => (svcFilter ? rules.filter((r) => r.serviceType === svcFilter) : rules),
    [rules, svcFilter],
  );

  const stats = useMemo(() => {
    const active = rules.filter((r) => r.active).length;
    const avgBase = rules.length
      ? Math.round(rules.reduce((s, r) => s + r.baseCharge, 0) / rules.length)
      : 0;
    const services = new Set(rules.map((r) => r.serviceType)).size;
    return { total: rules.length, active, avgBase, services };
  }, [rules]);

  const quotePreview = useMemo(() => {
    const sub = Number(form.baseCharge) + Number(form.perKgRate);
    const withFuel = sub * (1 + Number(form.fuelPercent) / 100);
    const inclGst = withFuel * (1 + Number(form.gstPercent) / 100);
    return Number.isFinite(inclGst) ? Math.round(inclGst) : 0;
  }, [form.baseCharge, form.perKgRate, form.fuelPercent, form.gstPercent]);

  const zoneOptions = (current: string): { value: string; label: string }[] => {
    const opts = zones.map((z) => ({ value: z.code, label: `${z.code} — ${z.name}` }));
    if (current && current !== "ANY" && !opts.some((o) => o.value === current)) {
      opts.unshift({ value: current, label: current });
    }
    return [{ value: "ANY", label: "ANY — all zones" }, ...opts];
  };

  const columns: DataTableColumn<RateRule>[] = [
    {
      key: "service",
      header: "Service",
      sortValue: (r) => r.serviceType,
      render: (r) => {
        const style = SERVICE_STYLE[r.serviceType] ?? SERVICE_STYLE.STANDARD;
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${style.pill}`}>
            {style.icon}
            {r.serviceType}
          </span>
        );
      },
    },
    {
      key: "zones",
      header: "Zones",
      cellClassName: "min-w-[170px]",
      sortValue: (r) => `${r.fromZone}→${r.toZone}`,
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="rounded-md bg-page px-1.5 py-0.5 font-mono text-ink ring-1 ring-line">{r.fromZone}</span>
          <span className="text-[#0e8f8a]">→</span>
          <span className="rounded-md bg-page px-1.5 py-0.5 font-mono text-ink ring-1 ring-line">{r.toZone}</span>
        </div>
      ),
    },
    {
      key: "base",
      header: "Base",
      align: "right",
      sortValue: (r) => r.baseCharge,
      render: (r) => <span className="font-bold text-ink">{formatCurrency(r.baseCharge)}</span>,
    },
    {
      key: "perKg",
      header: "Per kg",
      align: "right",
      sortValue: (r) => r.perKgRate,
      render: (r) => <span className="text-body">{formatCurrency(r.perKgRate)}</span>,
    },
    {
      key: "min",
      header: "Min",
      align: "right",
      sortValue: (r) => r.minCharge,
      render: (r) => <span className="text-body">{formatCurrency(r.minCharge)}</span>,
    },
    {
      key: "gst",
      header: "GST",
      align: "right",
      sortValue: (r) => r.gstPercent,
      render: (r) => <span className="text-xs text-body">{r.gstPercent}%</span>,
    },
    {
      key: "cod",
      header: "COD %",
      align: "right",
      sortValue: (r) => r.codPercent,
      render: (r) => <span className="text-xs text-body">{r.codPercent}%</span>,
    },
    {
      key: "eta",
      header: "ETA",
      align: "center",
      sortValue: (r) => r.estimatedDays,
      render: (r) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#12b2aa]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#0b7a75]">
          <Timer className="h-3 w-3" />
          {r.estimatedDays}d
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => (r.active ? 1 : 0),
      render: (r) =>
        r.active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success ring-1 ring-[#16a34a]/30">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-slate-500/12 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-400/35">
            Inactive
          </span>
        ),
    },
    {
      key: "updated",
      header: "Updated",
      align: "right",
      sortValue: (r) => r.updatedAt,
      render: (r) => <span className="text-xs text-body">{formatDate(r.updatedAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 cursor-pointer transition hover:border-[#12b2aa]! hover:text-[#0b7a75]"
          onClick={(e) => {
            e.stopPropagation();
            openEdit(r);
          }}
          icon={<Pencil className="h-3.5 w-3.5" />}
        >
          Edit
        </Button>
      ),
    },
  ];

  const statCards: {
    label: string;
    value: string;
    sub: string;
    icon: ReactNode;
    gradient: string;
  }[] = [
    {
      label: "Rate rules",
      value: String(stats.total),
      sub: "Pricing combinations",
      icon: <Tags className="h-5 w-5" />,
      gradient: "bg-gradient-to-br from-[#2563eb] to-[#4f46e5]",
    },
    {
      label: "Active",
      value: String(stats.active),
      sub: `${stats.total - stats.active} inactive`,
      icon: <CheckCircle2 className="h-5 w-5" />,
      gradient: "bg-gradient-to-br from-[#16a34a] to-[#4ade80]",
    },
    {
      label: "Service types",
      value: `${stats.services}/3`,
      sub: "Standard · Express · Surface",
      icon: <Layers className="h-5 w-5" />,
      gradient: "bg-gradient-to-br from-[#f59e0b] to-[#fbbf24]",
    },
    {
      label: "Avg base charge",
      value: formatCurrency(stats.avgBase),
      sub: "Across all rules",
      icon: <Calculator className="h-5 w-5" />,
      gradient: "bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF]",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Command bar */}
      <section className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#059669] to-[#0b1220] p-6 text-white shadow-lift">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(52,211,153,0.3),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="rise relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6ee7b7]">Pricing</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">Rate cards</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              Pricing rules by service type and zone pair.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Tags className="h-3.5 w-3.5 text-[#6ee7b7]" />
                {data ? `${rules.length} rules` : "—"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                <MapPin className="h-3.5 w-3.5 text-[#6ee7b7]" />
                {data ? `${zones.length} zones` : "—"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-ink shadow-lift transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(0,0,0,0.5)]"
          >
            <Plus className="h-4 w-4 text-[#059669]" />
            New rule
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-[24px] opacity-[0.08] transition-transform duration-300 group-hover:scale-125 ${s.gradient}`}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">{s.label}</p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-ink">{s.value}</p>
                <p className="mt-1 truncate text-[11px] text-body">{s.sub}</p>
              </div>
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-soft transition-transform duration-300 group-hover:-rotate-6 ${s.gradient}`}
              >
                {s.icon}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Zones strip */}
      {zones.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {zones.map((z, i) => (
            <div
              key={z.id}
              className={`group relative overflow-hidden rounded-2xl border border-line bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift rise`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-[22px] bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF] opacity-[0.1] transition-transform duration-300 group-hover:scale-125"
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex rounded-lg bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-soft">
                    {z.code}
                  </span>
                  <p className="mt-2 truncate text-sm font-semibold text-ink">{z.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{z.pincodeCount} pincodes</p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF] text-white shadow-soft transition-transform duration-300 group-hover:-rotate-6">
                  <MapPin className="h-4.5 w-4.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Rules table */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#16a34a] to-[#4ade80] text-white shadow-soft">
              <Tags className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Pricing rules</h2>
              <p className="text-[11px] text-muted">
                {isLoading ? "Loading…" : `${filtered.length} of ${rules.length} rules`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["", "STANDARD", "EXPRESS", "SURFACE"] as const).map((s) => {
              const active = svcFilter === s;
              const style = s ? SERVICE_STYLE[s] : null;
              return (
                <button
                  key={s || "all"}
                  type="button"
                  onClick={() => setSvcFilter(s)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/20 ${
                    active
                      ? "bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_10px_22px_-14px_rgba(18,178,170,0.9)]"
                      : "border border-line bg-card text-body hover:border-[#12b2aa]/45 hover:text-[#0b7a75]"
                  }`}
                >
                  {style ? style.icon : null}
                  {s || "All"}
                </button>
              );
            })}
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          loading={isLoading}
          skeletonRows={6}
          minWidth="min-w-[1180px]"
          onRowClick={(r) => openEdit(r)}
          empty={
            <EmptyState
              title="No rate rules"
              description="Create your first pricing rule to start quoting shipments."
              icon={<Tags className="h-6 w-6" />}
              action={
                <Button size="sm" className="cursor-pointer" onClick={openCreate}>
                  New rule
                </Button>
              }
            />
          }
        />
      </Card>

      {/* New / edit rule modal */}
      <Modal
        open={open}
        title={editing ? "Edit rate rule" : "New rate rule"}
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" className="cursor-pointer" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="rate-rule-form"
              className="shine cursor-pointer bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_12px_26px_-14px_rgba(18,178,170,0.8)] hover:-translate-y-0.5"
              loading={save.isPending}
            >
              {editing ? "Save changes" : "Create rule"}
            </Button>
          </>
        }
      >
        <form id="rate-rule-form" className="space-y-4" onSubmit={onSubmit}>
          <div className="flex items-center gap-3 rounded-2xl border border-[#12b2aa]/25 bg-gradient-to-r from-[#12b2aa]/10 to-transparent p-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-white shadow-soft">
              <Tags className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">
                {editing ? "Update pricing rule" : "New pricing rule"}
              </p>
              <p className="text-xs text-muted">Service, zones and charges go over the API.</p>
            </div>
          </div>

          {/* Service type cards */}
          <div>
            <SectionLabel icon={<Zap className="h-3.5 w-3.5" />}>Service type</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {(["STANDARD", "EXPRESS", "SURFACE"] as ServiceType[]).map((s) => {
                const style = SERVICE_STYLE[s];
                const active = form.serviceType === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, serviceType: s })}
                    className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border p-3 transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/20 ${
                      active ? "border-[#12b2aa] bg-[#12b2aa]/[0.07] shadow-soft" : "border-line hover:bg-page"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-xl text-white ${
                        active ? style.gradient : "bg-page text-muted ring-1 ring-line"
                      } ${active ? "shadow-soft" : ""}`}
                    >
                      {style.icon}
                    </span>
                    <span className={`text-xs font-bold ${active ? "text-[#0b7a75]" : "text-body"}`}>
                      {s}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zones */}
          <div>
            <SectionLabel icon={<MapPin className="h-3.5 w-3.5" />}>Zones (from rate-card zones)</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="From zone"
                required
                value={form.fromZone || "ANY"}
                onChange={(e) => setForm({ ...form, fromZone: e.target.value })}
                className={TEAL}
              >
                {zoneOptions(form.fromZone ?? "").map((o) => (
                  <option key={`from-${o.value}`} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Select
                label="To zone"
                required
                value={form.toZone || "ANY"}
                onChange={(e) => setForm({ ...form, toZone: e.target.value })}
                className={TEAL}
              >
                {zoneOptions(form.toZone ?? "").map((o) => (
                  <option key={`to-${o.value}`} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Charges */}
          <div>
            <SectionLabel icon={<Calculator className="h-3.5 w-3.5" />}>Charges</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Base charge"
                required
                type="number"
                min="0"
                step="any"
                value={form.baseCharge}
                onChange={(e) => setNum("baseCharge", e.target.value)}
                className={TEAL}
              />
              <Input
                label="Per kg rate"
                required
                type="number"
                min="0"
                step="any"
                value={form.perKgRate}
                onChange={(e) => setNum("perKgRate", e.target.value)}
                className={TEAL}
              />
              <Input
                label="Min charge"
                required
                type="number"
                min="0"
                step="any"
                value={form.minCharge}
                onChange={(e) => setNum("minCharge", e.target.value)}
                className={TEAL}
              />
            </div>
          </div>

          {/* Surcharges & delivery */}
          <div>
            <SectionLabel icon={<Percent className="h-3.5 w-3.5" />}>Surcharges, tax & delivery</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Fuel %"
                type="number"
                min="0"
                max="100"
                step="any"
                value={form.fuelPercent}
                onChange={(e) => setNum("fuelPercent", e.target.value)}
                className={TEAL}
              />
              <Input
                label="COD %"
                type="number"
                min="0"
                max="100"
                step="any"
                value={form.codPercent}
                onChange={(e) => setNum("codPercent", e.target.value)}
                className={TEAL}
              />
              <Input
                label="Insurance %"
                type="number"
                min="0"
                max="100"
                step="any"
                value={form.insurancePercent}
                onChange={(e) => setNum("insurancePercent", e.target.value)}
                className={TEAL}
              />
              <Input
                label="GST %"
                type="number"
                min="0"
                max="100"
                step="any"
                value={form.gstPercent}
                onChange={(e) => setNum("gstPercent", e.target.value)}
                className={TEAL}
              />
              <Input
                label="Estimated days"
                type="number"
                min="1"
                max="30"
                value={form.estimatedDays}
                onChange={(e) => setNum("estimatedDays", e.target.value)}
                className={TEAL}
              />
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink">Active</p>
                <div className="flex h-10 items-center gap-3 rounded-xl border border-line bg-card px-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.active}
                    onClick={() => setForm({ ...form, active: !form.active })}
                    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/25 ${
                      form.active
                        ? "bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a]"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        form.active ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-bold text-body">
                    {form.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Live quote preview */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b4a46] to-[#0b1220] p-4 text-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.35),transparent)]"
            />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5EEAD4]">
                  Quote preview · first kg
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  ≈ {formatCurrency(quotePreview)}
                </p>
                <p className="mt-0.5 text-[11px] text-white/60">
                  base + per kg + {form.fuelPercent}% fuel + {form.gstPercent}% GST
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-xs font-semibold">
                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  Min {formatCurrency(Number(form.minCharge))}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  <Timer className="mr-1 inline h-3 w-3" />
                  {form.estimatedDays} days
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                  COD {form.codPercent}%
                </span>
              </div>
            </div>
          </div>

          <button type="submit" className="hidden">
            Save
          </button>
        </form>
      </Modal>
    </div>
  );
}
