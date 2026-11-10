import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Boxes, MapPin, Truck } from "lucide-react";
import { locationsApi, manifestsApi } from "../api/endpoints";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { useToast } from "../components/ui/Toast";

const TEAL_INPUT = "focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15";

function SectionCard({
  step,
  title,
  subtitle,
  icon,
  gradient,
  children,
}: {
  step: number;
  title: string;
  subtitle: string;
  icon: ReactNode;
  gradient: string;
  children: ReactNode;
}) {
  return (
    <Card className="rise">
      <div className="mb-5 flex items-center gap-3.5">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-soft ${gradient}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-page px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
              Step {step}
            </span>
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

export function NewManifestPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["locations", "all"],
    queryFn: () => locationsApi.list({ all: true }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      manifestsApi.create({
        fromLocationId,
        toLocationId,
        vehicleNumber: vehicleNumber || undefined,
        driverName: driverName || undefined,
        driverPhone: driverPhone || undefined,
      }),
    onSuccess: (manifest) => {
      toast.success(`Manifest ${manifest.manifestNumber} created`);
      void queryClient.invalidateQueries({ queryKey: ["manifests"] });
      navigate(`/manifests/${manifest.id}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create manifest"),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!fromLocationId || !toLocationId) {
      toast.error("Select source and destination locations");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <section className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b4a46] via-[#0e6b64] to-[#0b1220] p-6 text-white shadow-lift">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.3),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="rise relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/manifests"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-white/20"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Manifests
            </Link>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">Create a manifest</h2>
            <p className="mt-1.5 max-w-md text-sm text-white/70">
              Define the line-haul route and vehicle — parcels are added by AWB after creation.
            </p>
          </div>
          <ol className="hidden items-center gap-2 sm:flex" aria-hidden="true">
            {["Route", "Vehicle"].map((label, i) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#5EEAD4] text-[10px] font-black text-[#0b1220]">
                  {i + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <form className="space-y-5" onSubmit={onSubmit}>
        <SectionCard
          step={1}
          title="Route"
          subtitle="Source and destination hubs"
          icon={<MapPin className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF]"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="From location"
              value={fromLocationId}
              onChange={(e) => setFromLocationId(e.target.value)}
              required
              placeholder={locationsLoading ? "Loading locations…" : "Select origin"}
              className={TEAL_INPUT}
            >
              {(locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </Select>
            <Select
              label="To location"
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              required
              placeholder={locationsLoading ? "Loading locations…" : "Select destination"}
              className={TEAL_INPUT}
            >
              {(locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </Select>
          </div>
        </SectionCard>

        <SectionCard
          step={2}
          title="Vehicle & driver"
          subtitle="Line-haul transport details (optional)"
          icon={<Truck className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Vehicle number"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="MH 12 AB 1234"
              className={TEAL_INPUT}
            />
            <Input
              label="Driver name"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Driver name"
              className={TEAL_INPUT}
            />
            <Input
              label="Driver phone"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="Phone"
              inputMode="numeric"
              className={TEAL_INPUT}
            />
          </div>
        </SectionCard>

        {/* Note */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-[#12b2aa]/45 bg-[#12b2aa]/[0.06] px-4 py-3">
          <Boxes className="mt-0.5 h-4 w-4 shrink-0 text-[#0e8f8a]" />
          <p className="text-xs leading-relaxed text-body">
            You can add parcels by AWB from the manifest detail screen after creation.
          </p>
        </div>

        {/* Sticky action bar */}
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card/90 px-5 py-4 shadow-lift backdrop-blur">
          <div>
            <p className="text-sm font-semibold text-ink">Ready to create?</p>
            <p className="text-xs text-muted">The manifest opens for parcel scanning right after.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/manifests">
              <Button variant="ghost" type="button" className="cursor-pointer">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="shine cursor-pointer bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_12px_26px_-14px_rgba(18,178,170,0.8)] hover:-translate-y-0.5"
              loading={createMutation.isPending}
              icon={<Boxes className="h-4 w-4" />}
            >
              Create manifest
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
