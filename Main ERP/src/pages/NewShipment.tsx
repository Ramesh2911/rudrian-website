import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Navigation, PackagePlus, Plus, Truck } from "lucide-react";
import { shipmentsApi } from "../api/endpoints";
import type { CreateShipmentPayload, ParcelCategory, PaymentMethod, ServiceType, ShipmentDetail } from "../api/types";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { useToast } from "../components/ui/Toast";
import { PrintLabel } from "../components/PrintLabel";

type PartyForm = { name: string; phone: string; address: string; pincode: string; city: string; state: string };

const emptyParty: PartyForm = { name: "", phone: "", address: "", pincode: "", city: "", state: "" };

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

function PartySection({
  step,
  title,
  subtitle,
  icon,
  gradient,
  party,
  onChange,
}: {
  step: number;
  title: string;
  subtitle: string;
  icon: ReactNode;
  gradient: string;
  party: PartyForm;
  onChange: (p: PartyForm) => void;
}) {
  const set = (key: keyof PartyForm, value: string) => onChange({ ...party, [key]: value });
  return (
    <SectionCard step={step} title={title} subtitle={subtitle} icon={icon} gradient={gradient}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" required value={party.name} onChange={(e) => set("name", e.target.value)} placeholder="Name" className={TEAL_INPUT} />
        <Input label="Phone" required value={party.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10-digit phone" inputMode="numeric" className={TEAL_INPUT} />
        <Input
          label="Address"
          required
          className={`sm:col-span-2 ${TEAL_INPUT}`}
          wrapperClassName="sm:col-span-2"
          value={party.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Street, area, landmark"
        />
        <Input label="Pincode" required value={party.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="6-digit pincode" inputMode="numeric" className={TEAL_INPUT} />
        <Input label="City" required value={party.city} onChange={(e) => set("city", e.target.value)} placeholder="City" className={TEAL_INPUT} />
        <Input label="State" value={party.state} onChange={(e) => set("state", e.target.value)} placeholder="State (optional)" className={TEAL_INPUT} />
      </div>
    </SectionCard>
  );
}

export function NewShipmentPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sender, setSender] = useState<PartyForm>(emptyParty);
  const [receiver, setReceiver] = useState<PartyForm>(emptyParty);
  const [category, setCategory] = useState<ParcelCategory>("GENERAL");
  const [lengthCm, setLengthCm] = useState("30");
  const [widthCm, setWidthCm] = useState("20");
  const [heightCm, setHeightCm] = useState("10");
  const [physicalWeight, setPhysicalWeight] = useState("1");
  const [declaredValue, setDeclaredValue] = useState("0");
  const [codAmount, setCodAmount] = useState("0");
  const [serviceType, setServiceType] = useState<ServiceType>("STANDARD");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [created, setCreated] = useState<ShipmentDetail | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: CreateShipmentPayload) => shipmentsApi.create(payload),
    onSuccess: (shipment) => {
      setCreated(shipment);
      toast.success(`Shipment ${shipment.awbNumber} booked`);
      void queryClient.invalidateQueries({ queryKey: ["shipments"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Booking failed"),
  });

  const reset = () => {
    setSender(emptyParty);
    setReceiver(emptyParty);
    setCategory("GENERAL");
    setLengthCm("30");
    setWidthCm("20");
    setHeightCm("10");
    setPhysicalWeight("1");
    setDeclaredValue("0");
    setCodAmount("0");
    setServiceType("STANDARD");
    setPaymentMethod("CASH");
    setCreated(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload: CreateShipmentPayload = {
      sender: { name: sender.name, phone: sender.phone, address: sender.address, pincode: sender.pincode, city: sender.city, state: sender.state || undefined },
      receiver: { name: receiver.name, phone: receiver.phone, address: receiver.address, pincode: receiver.pincode, city: receiver.city, state: receiver.state || undefined },
      parcel: {
        category,
        lengthCm: Number(lengthCm),
        widthCm: Number(widthCm),
        heightCm: Number(heightCm),
        physicalWeight: Number(physicalWeight),
        declaredValue: Number(declaredValue || 0),
        codAmount: Number(codAmount || 0),
      },
      serviceType,
      paymentMethod,
    };
    mutation.mutate(payload);
  };

  if (created) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rise overflow-hidden rounded-3xl border border-line bg-card shadow-lift">
          <div className="gradient-pan relative overflow-hidden bg-gradient-to-br from-[#0b4a46] via-[#0e6b64] to-[#0b1220] p-8 text-center text-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.35),transparent)] blob-drift"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
            />
            <div className="relative">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
                <CheckCircle2 className="h-7 w-7 text-[#C7F09A]" />
              </span>
              <h1 className="mt-4 text-xl font-bold">Booking confirmed</h1>
              <p className="mt-1 text-sm text-white/70">
                Shipment booked and a confirmation notification was queued.
              </p>
              <p className="mt-5 font-mono text-3xl font-extrabold tracking-wider">{created.awbNumber}</p>
              <p className="mt-1.5 text-xs text-white/60">
                {created.originLocation?.name ?? "-"} &rarr; {created.destLocation?.name ?? "-"} &middot;{" "}
                {created.statusLabel}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 p-6">
            <PrintLabel shipment={created} />
            <Button variant="secondary" className="cursor-pointer" onClick={reset} icon={<Plus className="h-4 w-4" />}>
              Book another
            </Button>
            <Button variant="ghost" className="cursor-pointer" onClick={() => navigate(`/shipments/${created.awbNumber}`)}>
              View shipment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5EEAD4]">New consignment</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight">Create a booking</h2>
            <p className="mt-1.5 max-w-md text-sm text-white/70">
              Sender, receiver and parcel details — book a shipment instantly.
            </p>
          </div>
          <ol className="hidden items-center gap-2 sm:flex" aria-hidden="true">
            {["Sender", "Receiver", "Parcel"].map((label, i) => (
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
        <PartySection
          step={1}
          title="Sender"
          subtitle="Pickup details"
          icon={<MapPin className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#12b2aa] to-[#2DD4BF]"
          party={sender}
          onChange={setSender}
        />
        <PartySection
          step={2}
          title="Receiver"
          subtitle="Delivery details"
          icon={<Navigation className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]"
          party={receiver}
          onChange={setReceiver}
        />
        <SectionCard
          step={3}
          title="Parcel & service"
          subtitle="Dimensions, weight and payment options"
          icon={<Truck className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-[#f59e0b] to-[#fbbf24]"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as ParcelCategory)} className={TEAL_INPUT}>
              {(["DOCUMENT", "GENERAL", "FRAGILE", "LIQUID", "ELECTRONICS"] as ParcelCategory[]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input label="Length (cm)" required type="number" min="0.1" step="any" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} className={TEAL_INPUT} />
            <Input label="Width (cm)" required type="number" min="0.1" step="any" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} className={TEAL_INPUT} />
            <Input label="Height (cm)" required type="number" min="0.1" step="any" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className={TEAL_INPUT} />
            <Input label="Weight (kg)" required type="number" min="0.01" step="any" value={physicalWeight} onChange={(e) => setPhysicalWeight(e.target.value)} className={TEAL_INPUT} />
            <Input label="Declared value" type="number" min="0" step="any" value={declaredValue} onChange={(e) => setDeclaredValue(e.target.value)} className={TEAL_INPUT} />
            <Input label="COD amount" type="number" min="0" step="any" value={codAmount} onChange={(e) => setCodAmount(e.target.value)} className={TEAL_INPUT} />
            <Select label="Service type" value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)} className={TEAL_INPUT}>
              <option value="STANDARD">STANDARD</option>
              <option value="EXPRESS">EXPRESS</option>
              <option value="SURFACE">SURFACE</option>
            </Select>
            <Select label="Payment method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className={TEAL_INPUT}>
              <option value="CASH">CASH</option>
              <option value="UPI_QR">UPI_QR</option>
              <option value="RAZORPAY">RAZORPAY</option>
            </Select>
          </div>
        </SectionCard>

        {/* Sticky action bar */}
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card/90 px-5 py-4 shadow-lift backdrop-blur">
          <div>
            <p className="text-sm font-semibold text-ink">Ready to book?</p>
            <p className="text-xs text-muted">Charges are calculated by the rate card at booking.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/shipments">
              <Button variant="ghost" type="button" className="cursor-pointer">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="shine cursor-pointer bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_12px_26px_-14px_rgba(18,178,170,0.8)] hover:-translate-y-0.5"
              loading={mutation.isPending}
              icon={<PackagePlus className="h-4 w-4" />}
            >
              Book shipment
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
