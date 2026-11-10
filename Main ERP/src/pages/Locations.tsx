import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Hash,
  MapPin,
  Network,
  Pencil,
  Phone,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { locationsApi } from "../api/endpoints";
import type { LocationPayload, LocationRow, LocationType } from "../api/types";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";

type FormState = {
  code: string;
  name: string;
  type: LocationType;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  active: boolean;
};

const emptyForm: FormState = {
  code: "",
  name: "",
  type: "HUB",
  address: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  active: true,
};

const TEAL = "focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15";

const TYPE_STYLE: Record<LocationType, { pill: string; gradient: string; icon: ReactNode; ring: string }> = {
  BRANCH: {
    pill: "bg-indigo-500/12 text-indigo-600 ring-1 ring-indigo-500/35",
    gradient: "bg-gradient-to-br from-[#2563eb] to-[#4f46e5]",
    icon: <Building2 className="h-5 w-5" />,
    ring: "ring-[#2563eb]/55",
  },
  HUB: {
    pill: "bg-violet-500/12 text-violet-600 ring-1 ring-violet-500/35",
    gradient: "bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa]",
    icon: <Network className="h-5 w-5" />,
    ring: "ring-[#8b5cf6]/55",
  },
};

export function LocationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | LocationType>("");

  const { data, isLoading } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => locationsApi.list({ all: true }),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: LocationPayload = {
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        phone: form.phone.trim() || undefined,
        active: form.active,
      };
      if (editing) return locationsApi.update(editing.id, payload);
      return locationsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Location updated" : "Location created");
      setOpen(false);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save location"),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (loc: LocationRow) => {
    setEditing(loc);
    setForm({
      code: loc.code,
      name: loc.name,
      type: loc.type,
      address: loc.address ?? "",
      city: loc.city ?? "",
      state: loc.state ?? "",
      pincode: loc.pincode ?? "",
      phone: loc.phone ?? "",
      active: loc.active,
    });
    setOpen(true);
  };

  const locations = data ?? [];

  const stats = useMemo(() => {
    const branches = locations.filter((l) => l.type === "BRANCH").length;
    const hubs = locations.filter((l) => l.type === "HUB").length;
    const staff = locations.reduce((s, l) => s + l.staffCount, 0);
    return { total: locations.length, branches, hubs, staff };
  }, [locations]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return locations.filter((l) => {
      if (typeFilter && l.type !== typeFilter) return false;
      if (!needle) return true;
      return (
        l.name.toLowerCase().includes(needle) ||
        l.code.toLowerCase().includes(needle) ||
        (l.city ?? "").toLowerCase().includes(needle) ||
        (l.pincode ?? "").includes(needle)
      );
    });
  }, [locations, query, typeFilter]);

  const statCards: { label: string; value: string; sub: string; icon: ReactNode; gradient: string }[] = [
    {
      label: "Locations",
      value: String(stats.total),
      sub: "Across the network",
      icon: <MapPin className="h-5 w-5" />,
      gradient: "bg-gradient-to-br from-[#2563eb] to-[#4f46e5]",
    },
    {
      label: "Branches",
      value: String(stats.branches),
      sub: "Customer-facing",
      icon: <Building2 className="h-5 w-5" />,
      gradient: "bg-gradient-to-br from-[#0ea5e9] to-[#38bdf8]",
    },
    {
      label: "Hubs",
      value: String(stats.hubs),
      sub: "Sorting & transfers",
      icon: <Network className="h-5 w-5" />,
      gradient: "bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa]",
    },
    {
      label: "Team strength",
      value: String(stats.staff),
      sub: "Staff assigned",
      icon: <Users className="h-5 w-5" />,
      gradient: "bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF]",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Command bar */}
      <section className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#0b1220] p-6 text-white shadow-lift">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.3),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="rise relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#93c5fd]">Network</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">Locations</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/70">
              Branches and hubs across the network.
            </p>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <MapPin className="h-3.5 w-3.5 text-[#93c5fd]" />
              {data ? `${stats.branches} branches · ${stats.hubs} hubs` : "—"}
            </span>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-ink shadow-lift transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(0,0,0,0.5)]"
          >
            <Plus className="h-4 w-4 text-[#2563eb]" />
            Add location
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-2xl border border-line bg-card p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
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
          </div>
        ))}
      </div>

      {/* Search + type chips */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, code, city or pincode…"
            className={`pl-9 ${TEAL}`}
            aria-label="Search locations"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["", "BRANCH", "HUB"] as const).map((t) => {
            const active = typeFilter === t;
            const style = t ? TYPE_STYLE[t] : null;
            return (
              <button
                key={t || "all"}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/20 ${
                  active
                    ? "bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_10px_22px_-14px_rgba(18,178,170,0.9)]"
                    : "border border-line bg-card text-body hover:border-[#12b2aa]/45 hover:text-[#0b7a75]"
                }`}
              >
                {style ? <span className={active ? "text-white" : "text-muted"}>{style.icon}</span> : null}
                {t || "All"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card">
          <EmptyState
            title="No locations"
            description={
              locations.length === 0
                ? "Add branches and hubs to start routing shipments."
                : "No locations match this search."
            }
            icon={<MapPin className="h-6 w-6" />}
            action={
              locations.length === 0 ? (
                <Button size="sm" className="cursor-pointer" onClick={openCreate}>
                  Add location
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => {
                    setQuery("");
                    setTypeFilter("");
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((loc, i) => {
            const style = TYPE_STYLE[loc.type] ?? TYPE_STYLE.HUB;
            return (
              <div
                key={loc.id}
                className="group relative overflow-hidden rounded-2xl border border-line bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-lift rise"
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${style.gradient.replace("bg-gradient-to-br", "")}`}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-soft transition-transform duration-300 group-hover:-rotate-6 ${style.gradient}`}
                      >
                        {style.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">{loc.name}</p>
                        <p className="mt-0.5 font-mono text-xs font-semibold text-muted">{loc.code}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style.pill}`}
                    >
                      {loc.type}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs text-body">
                    {loc.city || loc.state ? (
                      <p className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                        <span>
                          {loc.city}
                          {loc.state ? `, ${loc.state}` : ""}
                        </span>
                      </p>
                    ) : null}
                    {loc.pincode ? (
                      <p className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5 shrink-0 text-muted" />
                        <span className="font-mono font-semibold">PIN {loc.pincode}</span>
                      </p>
                    ) : null}
                    {loc.phone ? (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-muted" />
                        <span>{loc.phone}</span>
                      </p>
                    ) : null}
                    {loc.latitude !== null && loc.longitude !== null ? (
                      <p className="inline-flex items-center gap-1.5 rounded-full bg-page px-2 py-0.5 font-mono text-[10px] font-semibold text-muted ring-1 ring-line">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#12b2aa]" />
                        {loc.latitude.toFixed(3)}, {loc.longitude.toFixed(3)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
                  <div className="flex items-center gap-2">
                    {loc.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success ring-1 ring-[#16a34a]/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-500/12 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-400/35">
                        Inactive
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-body">
                      <Users className="h-3.5 w-3.5 text-muted" />
                      {loc.staffCount} staff
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0 cursor-pointer transition hover:border-[#12b2aa]! hover:text-[#0b7a75]"
                    onClick={() => openEdit(loc)}
                    icon={<Pencil className="h-3.5 w-3.5" />}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit modal */}
      <Modal
        open={open}
        title={editing ? `Edit ${editing.name}` : "Add location"}
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" className="cursor-pointer" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="location-form"
              className="shine cursor-pointer bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_12px_26px_-14px_rgba(18,178,170,0.8)] hover:-translate-y-0.5"
              loading={save.isPending}
            >
              {editing ? "Save changes" : "Create location"}
            </Button>
          </>
        }
      >
        <form id="location-form" className="space-y-4" onSubmit={onSubmit}>
          <div className="flex items-center gap-3 rounded-2xl border border-[#12b2aa]/25 bg-gradient-to-r from-[#12b2aa]/10 to-transparent p-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#12b2aa] to-[#0e8f8a] text-white shadow-soft">
              <MapPin className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">
                {editing ? "Update location" : "New network location"}
              </p>
              <p className="text-xs text-muted">Code, type and contact go over the API.</p>
            </div>
          </div>

          {/* Type cards */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink">Location type</p>
            <div className="grid grid-cols-2 gap-2">
              {(["BRANCH", "HUB"] as LocationType[]).map((t) => {
                const style = TYPE_STYLE[t];
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/20 ${
                      active ? "border-[#12b2aa] bg-[#12b2aa]/[0.07] shadow-soft" : "border-line hover:bg-page"
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white ${
                        active ? `${style.gradient} shadow-soft` : "bg-page text-muted ring-1 ring-line"
                      }`}
                    >
                      {style.icon}
                    </span>
                    <span>
                      <span className={`block text-sm font-bold ${active ? "text-[#0b7a75]" : "text-ink"}`}>
                        {t}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {t === "BRANCH" ? "Customer-facing counter" : "Sorting & transfer point"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Code"
              required
              minLength={2}
              maxLength={20}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="BLR-01"
              className={`${TEAL} font-mono uppercase`}
            />
            <Input
              label="Name"
              required
              minLength={2}
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={TEAL}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              inputMode="numeric"
              className={TEAL}
            />
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className={TEAL}
            />
            <div className="sm:col-span-2">
              <Input
                label="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                maxLength={300}
                wrapperClassName="sm:col-span-2"
                className={TEAL}
              />
            </div>
            <Input
              label="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className={TEAL}
            />
            <Input
              label="Pincode"
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              inputMode="numeric"
              pattern="\d{6}"
              placeholder="6 digits"
              className={`${TEAL} font-mono`}
            />
          </div>

          {/* Active toggle */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink">Status</p>
            <div className="flex h-10 items-center gap-3 rounded-xl border border-line bg-card px-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.active}
                onClick={() => setForm({ ...form, active: !form.active })}
                className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition focus:outline-none focus:ring-4 focus:ring-[#12b2aa]/25 ${
                  form.active ? "bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    form.active ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
              <span className="text-xs font-bold text-body">
                {form.active ? "Active — accepting shipments" : "Inactive — hidden from booking"}
              </span>
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
