"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CreditCard,
  Download,
  Package,
  Printer,
  QrCode,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input, Select, Textarea } from "@/components/Input";
import { Stepper } from "@/components/Stepper";
import { useToast } from "@/components/Toast";
import { ApiError, apiFetch } from "@/lib/api";
import { RazorpayDismissedError, loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";
import type {
  BookingRequest,
  BookingResponse,
  ParcelCategory,
  PaymentMethod,
  QuoteResponse,
  ServiceType,
} from "@/lib/types";
import { cx, formatINR } from "@/lib/utils";

const STEPS = ["Sender", "Receiver", "Parcel", "Service & Charges", "Payment", "Confirmation"];

interface PartyForm {
  name: string;
  phone: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
}

interface ParcelForm {
  category: ParcelCategory;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  physicalWeight: string;
  declaredValue: string;
  codAmount: string;
}

type Errors = Record<string, string>;

const emptyParty: PartyForm = { name: "", phone: "", address: "", pincode: "", city: "", state: "" };

const emptyParcel: ParcelForm = {
  category: "GENERAL",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  physicalWeight: "",
  declaredValue: "1000",
  codAmount: "0",
};

const categoryOptions = [
  { value: "DOCUMENT", label: "Document" },
  { value: "GENERAL", label: "General parcel" },
  { value: "FRAGILE", label: "Fragile" },
  { value: "LIQUID", label: "Liquid" },
  { value: "ELECTRONICS", label: "Electronics" },
];

const stateOptions = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi NCT",
  "Goa",
  "Gujarat",
  "Haryana",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
].map((state) => ({ value: state, label: state }));

const serviceOptions: Array<{
  value: ServiceType;
  label: string;
  description: string;
  icon: typeof Zap;
}> = [
  {
    value: "STANDARD",
    label: "Standard",
    description: "Balanced speed and cost for everyday shipments",
    icon: Truck,
  },
  {
    value: "EXPRESS",
    label: "Express",
    description: "Priority handling for time-critical parcels",
    icon: Zap,
  },
  {
    value: "SURFACE",
    label: "Surface",
    description: "Economical ground transport for heavier loads",
    icon: Package,
  },
];

const paymentOptions: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
  icon: typeof CreditCard;
}> = [
  {
    value: "RAZORPAY",
    label: "Pay online",
    description: "UPI, cards, netbanking & wallets via Razorpay",
    icon: CreditCard,
  },
  {
    value: "UPI_QR",
    label: "UPI QR code",
    description: "Scan a QR at pickup and pay instantly",
    icon: QrCode,
  },
  {
    value: "COD",
    label: "Cash on delivery",
    description: "Collect payment from the receiver at doorstep",
    icon: Banknote,
  },
];

function validatePhone(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ""));
}

function validatePincode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

function positiveNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function nonNegativeNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function validateParty(party: PartyForm, prefix: "sender" | "receiver", errors: Errors): void {
  if (!party.name.trim()) errors[`${prefix}.name`] = "Full name is required";
  if (!validatePhone(party.phone)) errors[`${prefix}.phone`] = "Enter a valid 10-digit mobile number";
  if (party.address.trim().length < 10)
    errors[`${prefix}.address`] = "Enter a complete address (min. 10 characters)";
  if (!validatePincode(party.pincode)) errors[`${prefix}.pincode`] = "Pincode must be 6 digits";
  if (!party.city.trim()) errors[`${prefix}.city`] = "City is required";
  if (!party.state.trim()) errors[`${prefix}.state`] = "State is required";
}

export function BookWizard() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [sender, setSender] = useState<PartyForm>(emptyParty);
  const [receiver, setReceiver] = useState<PartyForm>(emptyParty);
  const [parcel, setParcel] = useState<ParcelForm>(emptyParcel);
  const [serviceType, setServiceType] = useState<ServiceType>("STANDARD");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("RAZORPAY");
  const [errors, setErrors] = useState<Errors>({});
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const volumetricWeight = useMemo(() => {
    const l = positiveNumber(parcel.lengthCm);
    const w = positiveNumber(parcel.widthCm);
    const h = positiveNumber(parcel.heightCm);
    if (!l || !w || !h) return 0;
    return Math.round(((l * w * h) / 5000) * 100) / 100;
  }, [parcel.lengthCm, parcel.widthCm, parcel.heightCm]);

  const physicalWeight = positiveNumber(parcel.physicalWeight);
  const billableWeight = Math.max(physicalWeight, volumetricWeight);

  const quoteValid =
    validatePincode(sender.pincode) && validatePincode(receiver.pincode) && billableWeight > 0;

  useEffect(() => {
    if (step !== 3 || !quoteValid) return undefined;
    setQuoteLoading(true);
    setQuoteError(null);
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(() => {
      apiFetch<QuoteResponse>("/public/quote", {
        method: "POST",
        body: {
          originPincode: sender.pincode.trim(),
          destPincode: receiver.pincode.trim(),
          weight: billableWeight,
          serviceType,
          codAmount: nonNegativeNumber(parcel.codAmount),
        },
        token: null,
      })
        .then((data) => {
          setQuote(data);
          setQuoteLoading(false);
        })
        .catch((error: unknown) => {
          setQuote(null);
          setQuoteLoading(false);
          setQuoteError(
            error instanceof ApiError ? error.message : "Unable to fetch a quote right now.",
          );
        });
    }, 450);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [
    step,
    quoteValid,
    sender.pincode,
    receiver.pincode,
    billableWeight,
    serviceType,
    parcel.codAmount,
  ]);

  const goTo = useCallback((nextStep: number) => {
    setErrors({});
    setFormError(null);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  function handleNext(): void {
    const nextErrors: Errors = {};
    if (step === 0) validateParty(sender, "sender", nextErrors);
    if (step === 1) validateParty(receiver, "receiver", nextErrors);
    if (step === 2) {
      if (physicalWeight <= 0) nextErrors.physicalWeight = "Weight must be greater than 0";
      if (positiveNumber(parcel.lengthCm) <= 0) nextErrors.lengthCm = "Length is required";
      if (positiveNumber(parcel.widthCm) <= 0) nextErrors.widthCm = "Width is required";
      if (positiveNumber(parcel.heightCm) <= 0) nextErrors.heightCm = "Height is required";
      if (nonNegativeNumber(parcel.declaredValue) <= 0)
        nextErrors.declaredValue = "Declared value must be greater than 0";
    }
    if (step === 3 && (!quote || quoteLoading)) {
      toast.error("Please wait for the live quote before continuing.");
      return;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    goTo(step + 1);
  }

  async function handleSubmit(): Promise<void> {
    setSubmitting(true);
    setFormError(null);
    const payload: BookingRequest = {
      sender: {
        name: sender.name.trim(),
        phone: sender.phone.replace(/\D/g, ""),
        address: sender.address.trim(),
        pincode: sender.pincode.trim(),
        city: sender.city.trim(),
        state: sender.state.trim(),
      },
      receiver: {
        name: receiver.name.trim(),
        phone: receiver.phone.replace(/\D/g, ""),
        address: receiver.address.trim(),
        pincode: receiver.pincode.trim(),
        city: receiver.city.trim(),
        state: receiver.state.trim(),
      },
      parcel: {
        category: parcel.category,
        lengthCm: positiveNumber(parcel.lengthCm),
        widthCm: positiveNumber(parcel.widthCm),
        heightCm: positiveNumber(parcel.heightCm),
        physicalWeight,
        declaredValue: nonNegativeNumber(parcel.declaredValue),
        codAmount: nonNegativeNumber(parcel.codAmount),
      },
      serviceType,
      paymentMethod,
    };

    try {
      const booking = await apiFetch<BookingResponse>("/public/bookings", {
        method: "POST",
        body: payload,
        token: null,
      });

      if (paymentMethod === "RAZORPAY" && booking.payment) {
        await loadRazorpayScript();
        const payment = await openRazorpayCheckout({
          key: booking.payment.keyId,
          amount: booking.payment.amount,
          currency: booking.payment.currency,
          name: "Rudrian",
          description: `Shipment ${booking.awbNumber}`,
          order_id: booking.payment.orderId,
          prefill: {
            name: payload.receiver.name,
            contact: payload.receiver.phone,
          },
          theme: { color: "#12B2AA" },
        });

        await apiFetch("/public/payments/verify", {
          method: "POST",
          body: {
            orderId: payment.razorpay_order_id,
            paymentId: payment.razorpay_payment_id,
            signature: payment.razorpay_signature,
            awbNumber: booking.awbNumber,
          },
          token: null,
        });
      }

      setResult(booking);
      setStep(5);
      toast.success(
        paymentMethod === "RAZORPAY"
          ? "Payment verified. Your shipment is confirmed."
          : "Your shipment has been booked successfully.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: unknown) {
      if (error instanceof RazorpayDismissedError) {
        setFormError("Payment was cancelled. Your booking is not confirmed — try again when ready.");
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Something went wrong while booking. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetWizard(): void {
    setSender(emptyParty);
    setReceiver(emptyParty);
    setParcel(emptyParcel);
    setServiceType("STANDARD");
    setPaymentMethod("RAZORPAY");
    setQuote(null);
    setQuoteError(null);
    setResult(null);
    setErrors({});
    setFormError(null);
    setStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function downloadLabel(autoPrint = false): void {
    if (!result) return;
    const labelWindow = window.open("", "_blank", "width=480,height=720");
    if (!labelWindow) {
      toast.error("Allow pop-ups to download the label, or use the Print button instead.");
      return;
    }
    const codRow =
      nonNegativeNumber(parcel.codAmount) > 0
        ? `<tr><td>COD amount</td><td>${formatINR(nonNegativeNumber(parcel.codAmount))}</td></tr>`
        : "";
    const gstRow = quote
      ? `<tr><td>GST (18%)</td><td>${formatINR(quote.gstAmount)}</td></tr>
         <tr><td><strong>Total</strong></td><td><strong>${formatINR(quote.total)}</strong></td></tr>`
      : "";
    labelWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Rudrian Label ${result.awbNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #0B1220; background: #eef1f7; display: flex; flex-direction: column; align-items: center; padding: 16px; }
  .label { width: 4in; height: 6in; background: #fff; border: 1px solid #E6EAF2; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #12B2AA; padding-bottom: 8px; }
  .brand { font-size: 20px; font-weight: 800; color: #12B2AA; letter-spacing: -0.5px; }
  .tag { font-size: 9px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; }
  .service { border: 1px solid #E6EAF2; border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 700; }
  .awb { text-align: center; }
  .awb .label-text { font-size: 9px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.5px; }
  .awb .value { font-size: 22px; font-weight: 800; letter-spacing: 2px; margin-top: 2px; }
  .barcode { display: flex; justify-content: center; align-items: flex-end; gap: 1.5px; height: 52px; margin-top: 6px; }
  .barcode span { display: block; background: #0B1220; height: 100%; }
  .route { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .block { border: 1px solid #E6EAF2; border-radius: 10px; padding: 8px 10px; }
  .block h4 { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #94A3B8; margin-bottom: 4px; }
  .block .name { font-size: 12px; font-weight: 700; }
  .block .line { font-size: 10px; color: #475569; line-height: 1.45; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  td { padding: 3px 2px; border-bottom: 1px dashed #E6EAF2; color: #475569; }
  td:last-child { text-align: right; color: #0B1220; font-weight: 600; }
  .foot { margin-top: auto; font-size: 8px; color: #94A3B8; text-align: center; border-top: 1px solid #E6EAF2; padding-top: 6px; }
  .actions { margin: 14px 0; display: flex; gap: 10px; }
  .actions button { padding: 10px 18px; border: 0; border-radius: 10px; background: #12B2AA; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; }
  .actions button.secondary { background: #fff; color: #0B1220; border: 1px solid #E6EAF2; }
  @media print {
    body { background: #fff; padding: 0; }
    .actions { display: none !important; }
    .label { border: none; width: 4in; height: 6in; }
    @page { size: 4in 6in; margin: 0; }
  }
</style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Print label</button>
    <button class="secondary" onclick="window.close()">Close</button>
  </div>
  <div class="label">
    <div class="head">
      <img src="${window.location.origin}/logo-trimmed.jpeg" alt="Rudrian Logistics Solutions" style="height:46px" />
      <div class="service">${serviceOptions.find((s) => s.value === serviceType)?.label ?? serviceType}</div>
    </div>
    <div class="awb">
      <div class="label-text">AWB Tracking Number</div>
      <div class="value">${result.awbNumber}</div>
      <div class="barcode">${buildBarcodeBars(result.awbNumber)}</div>
    </div>
    <div class="route">
      <div class="block">
        <h4>Sender</h4>
        <div class="name">${sender.name}</div>
        <div class="line">${sender.phone}</div>
        <div class="line">${sender.address}, ${sender.city} — ${sender.pincode}</div>
      </div>
      <div class="block">
        <h4>Receiver</h4>
        <div class="name">${receiver.name}</div>
        <div class="line">${receiver.phone}</div>
        <div class="line">${receiver.address}, ${receiver.city} — ${receiver.pincode}</div>
      </div>
    </div>
    <div class="block">
      <h4>Charges</h4>
      <table>
        ${quote ? `<tr><td>Base charge</td><td>${formatINR(quote.baseCharge)}</td></tr>
        <tr><td>Fuel surcharge</td><td>${formatINR(quote.fuelSurcharge)}</td></tr>` : ""}
        ${codRow}
        ${gstRow}
      </table>
    </div>
    <div class="foot">Handle with care · Scan at every hub · Support DEMO · swiftlogix.in</div>
  </div>
</body>
</html>`);
    labelWindow.document.close();
    labelWindow.focus();
    if (autoPrint) {
      labelWindow.addEventListener("load", () => labelWindow.print(), { once: true });
      window.setTimeout(() => labelWindow.print(), 400);
    }
  }

  return (
    <div className="container-page py-12 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">New shipment</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Book a pickup in minutes
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-body sm:text-base">
            Fill in the details below. Charges are calculated live, and a rider is usually
            assigned within 2 hours of booking.
          </p>
        </div>

        <div className="mt-10">
          <Stepper steps={STEPS} current={step} />
        </div>

        <Card className="mt-8 p-5 sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
          {step === 0 ? (
            <PartyStep
              title="Sender details"
              description="Who is shipping? Our rider will arrive at this address for pickup."
              prefix="sender"
              value={sender}
              errors={errors}
              onChange={setSender}
            />
          ) : null}

          {step === 1 ? (
            <PartyStep
              title="Receiver details"
              description="Where is the parcel going? The receiver's phone is used for OTP delivery."
              prefix="receiver"
              value={receiver}
              errors={errors}
              onChange={setReceiver}
            />
          ) : null}

          {step === 2 ? (
            <ParcelStep
              value={parcel}
              errors={errors}
              onChange={setParcel}
              volumetricWeight={volumetricWeight}
              billableWeight={billableWeight}
            />
          ) : null}

          {step === 3 ? (
            <ServiceStep
              serviceType={serviceType}
              onServiceChange={setServiceType}
              quote={quote}
              quoteLoading={quoteLoading}
              quoteError={quoteError}
              volumetricWeight={volumetricWeight}
              billableWeight={billableWeight}
              physicalWeight={physicalWeight}
              codAmount={nonNegativeNumber(parcel.codAmount)}
              quoteValid={quoteValid}
            />
          ) : null}

          {step === 4 ? (
            <div>
              <h2 className="text-xl font-bold text-ink">Payment method</h2>
              <p className="mt-1 text-sm text-body">
                Choose how you&apos;d like to pay for this shipment.
              </p>
              <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Payment method">
                {paymentOptions.map((option) => {
                  const selected = paymentMethod === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPaymentMethod(option.value)}
                      className={cx(
                        "flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200",
                        selected
                          ? "border-brand bg-brand-50 ring-4 ring-brand/10"
                          : "border-line bg-card hover:border-brand/40",
                      )}
                    >
                      <span
                        className={cx(
                          "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                          selected ? "bg-brand text-white" : "bg-page text-brand",
                        )}
                      >
                        <option.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-ink">{option.label}</span>
                        <span className="mt-0.5 block text-xs text-body">{option.description}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={cx(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                          selected ? "border-brand bg-brand" : "border-line",
                        )}
                      >
                        {selected ? <Check className="h-3 w-3 text-white" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {quote ? (
                <div className="mt-6 rounded-xl border border-line bg-page p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-body">Total payable</span>
                    <span className="text-lg font-extrabold text-ink">{formatINR(quote.total)}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    Includes GST. Final amount is confirmed at booking.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 5 && result ? (
            <div className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-bg text-success">
                <Check className="h-8 w-8" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
                Shipment booked successfully
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-body">
                A rider has been assigned and usually reaches the pickup address within
                2 hours. Share the AWB below with your customer for live tracking.
              </p>

              <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-line bg-page p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                  AWB Number
                </p>
                <p className="mt-2 font-mono text-2xl font-extrabold tracking-widest text-ink">
                  {result.awbNumber}
                </p>
                <div
                  aria-hidden="true"
                  className="mx-auto mt-4 flex h-14 items-stretch justify-center gap-[2px]"
                >
                  {buildBarElements(result.awbNumber)}
                </div>
                <p className="mt-2 text-[10px] tracking-[0.3em] text-muted">
                  {result.awbNumber}
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={() => downloadLabel()} variant="secondary">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download label
                </Button>
                <Button
                  onClick={() => {
                    downloadLabel(true);
                  }}
                  variant="secondary"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Print
                </Button>
                <Button
                  onClick={() => router.push(`/track/${encodeURIComponent(result.awbNumber)}`)}
                >
                  Track shipment
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
                Insured up to ₹5,000 · OTP-secured delivery · 24×7 tracking
              </div>

              <button
                type="button"
                onClick={resetWizard}
                className="mt-6 text-sm font-semibold text-brand underline-offset-4 hover:underline"
              >
                Book another shipment
              </button>
            </div>
          ) : null}
            </motion.div>
          </AnimatePresence>

          {formError ? (
            <p role="alert" className="field-error mt-6 rounded-xl bg-danger-bg px-4 py-3 text-sm">
              {formError}
            </p>
          ) : null}

          {step < 5 ? (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
              <Button
                variant="ghost"
                onClick={() => goTo(Math.max(0, step - 1))}
                disabled={step === 0 || submitting}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
              {step === 4 ? (
                <Button onClick={handleSubmit} loading={submitting} size="lg">
                  {paymentMethod === "RAZORPAY" && quote
                    ? `Pay ${formatINR(quote.total)}`
                    : "Confirm booking"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button onClick={handleNext} size="lg">
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function buildBarElements(awb: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let seed = 0;
  for (let i = 0; i < awb.length; i += 1) seed += awb.charCodeAt(i);
  for (let i = 0; i < 48; i += 1) {
    const width = ((seed + i * 7) % 3) + 1;
    const dark = i % 2 === 0;
    elements.push(
      <span
        key={i}
        style={{ width: `${width}px` }}
        className={dark ? "bg-ink" : "bg-transparent"}
      />,
    );
  }
  return elements;
}

function buildBarcodeBars(awb: string): string {
  let seed = 0;
  for (let i = 0; i < awb.length; i += 1) seed += awb.charCodeAt(i);
  let html = "";
  for (let i = 0; i < 48; i += 1) {
    const width = ((seed + i * 7) % 3) + 1;
    const height = 100;
    html += `<span style="width:${width}px;height:${height}%;background:${i % 2 === 0 ? "#0B1220" : "transparent"}"></span>`;
  }
  return html;
}

interface PartyStepProps {
  title: string;
  description: string;
  prefix: "sender" | "receiver";
  value: PartyForm;
  errors: Errors;
  onChange: (party: PartyForm) => void;
}

function PartyStep({ title, description, prefix, value, errors, onChange }: PartyStepProps) {
  function set<K extends keyof PartyForm>(key: K, fieldValue: PartyForm[K]): void {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-body">{description}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          required
          autoComplete="name"
          value={value.name}
          onChange={(event) => set("name", event.target.value)}
          error={errors[`${prefix}.name`]}
          placeholder="e.g. Priya Sharma"
        />
        <Input
          label="Mobile number"
          required
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={value.phone}
          onChange={(event) => set("phone", event.target.value)}
          error={errors[`${prefix}.phone`]}
          placeholder="10-digit mobile"
          hint="Used for OTP delivery and rider updates"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Address"
            required
            autoComplete="street-address"
            value={value.address}
            onChange={(event) => set("address", event.target.value)}
            error={errors[`${prefix}.address`]}
            placeholder="Flat / house no., building, street, area, landmark"
            rows={3}
          />
        </div>
        <Input
          label="Pincode"
          required
          inputMode="numeric"
          maxLength={6}
          autoComplete="postal-code"
          value={value.pincode}
          onChange={(event) => set("pincode", event.target.value.replace(/\D/g, ""))}
          error={errors[`${prefix}.pincode`]}
          placeholder="6-digit pincode"
        />
        <Input
          label="City"
          required
          autoComplete="address-level2"
          value={value.city}
          onChange={(event) => set("city", event.target.value)}
          error={errors[`${prefix}.city`]}
          placeholder="e.g. Bengaluru"
        />
        <div className="sm:col-span-2">
          <Select
            label="State"
            required
            options={[{ value: "", label: "Select your state" }, ...stateOptions]}
            value={value.state}
            onChange={(event) => set("state", event.target.value)}
            error={errors[`${prefix}.state`]}
          />
        </div>
      </div>
    </div>
  );
}

interface ParcelStepProps {
  value: ParcelForm;
  errors: Errors;
  onChange: (parcel: ParcelForm) => void;
  volumetricWeight: number;
  billableWeight: number;
}

function ParcelStep({
  value,
  errors,
  onChange,
  volumetricWeight,
  billableWeight,
}: ParcelStepProps) {
  function set<K extends keyof ParcelForm>(key: K, fieldValue: ParcelForm[K]): void {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-ink">Parcel details</h2>
      <p className="mt-1 text-sm text-body">
        Accurate weight and dimensions avoid invoice adjustments at billing.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Select
          label="Category"
          required
          options={categoryOptions}
          value={value.category}
          onChange={(event) => set("category", event.target.value as ParcelCategory)}
        />
        <Input
          label="Physical weight (kg)"
          required
          type="number"
          min="0.1"
          step="0.1"
          inputMode="decimal"
          value={value.physicalWeight}
          onChange={(event) => set("physicalWeight", event.target.value)}
          error={errors.physicalWeight}
          placeholder="e.g. 2.5"
        />
        <Input
          label="Length (cm)"
          required
          type="number"
          min="1"
          inputMode="decimal"
          value={value.lengthCm}
          onChange={(event) => set("lengthCm", event.target.value)}
          error={errors.lengthCm}
          placeholder="e.g. 30"
        />
        <Input
          label="Width (cm)"
          required
          type="number"
          min="1"
          inputMode="decimal"
          value={value.widthCm}
          onChange={(event) => set("widthCm", event.target.value)}
          error={errors.widthCm}
          placeholder="e.g. 20"
        />
        <Input
          label="Height (cm)"
          required
          type="number"
          min="1"
          inputMode="decimal"
          value={value.heightCm}
          onChange={(event) => set("heightCm", event.target.value)}
          error={errors.heightCm}
          placeholder="e.g. 15"
        />
        <Input
          label="Declared value (₹)"
          required
          type="number"
          min="1"
          inputMode="decimal"
          value={value.declaredValue}
          onChange={(event) => set("declaredValue", event.target.value)}
          error={errors.declaredValue}
          hint="Insured up to this value"
        />
        <div className="sm:col-span-2">
          <Input
            label="COD amount (₹)"
            type="number"
            min="0"
            inputMode="decimal"
            value={value.codAmount}
            onChange={(event) => set("codAmount", event.target.value)}
            hint="Enter 0 if this is not a cash-on-delivery order"
          />
        </div>
      </div>

      {volumetricWeight > 0 ? (
        <div className="mt-6 rounded-xl border border-line bg-page p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-body">
              Volumetric weight (L×W×H ÷ 5000) ={" "}
              <span className="font-semibold text-ink">{volumetricWeight} kg</span>
            </span>
            <span className="text-body">
              Billable weight ={" "}
              <span className="font-bold text-brand">{Math.max(billableWeight, 0)} kg</span>
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            The higher of physical and volumetric weight is used for pricing.
          </p>
        </div>
      ) : null}
    </div>
  );
}

interface ServiceStepProps {
  serviceType: ServiceType;
  onServiceChange: (service: ServiceType) => void;
  quote: QuoteResponse | null;
  quoteLoading: boolean;
  quoteError: string | null;
  volumetricWeight: number;
  billableWeight: number;
  physicalWeight: number;
  codAmount: number;
  quoteValid: boolean;
}

function ServiceStep({
  serviceType,
  onServiceChange,
  quote,
  quoteLoading,
  quoteError,
  volumetricWeight,
  billableWeight,
  physicalWeight,
  codAmount,
  quoteValid,
}: ServiceStepProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-ink">Service &amp; charges</h2>
      <p className="mt-1 text-sm text-body">
        Pick a service level — your quote updates instantly.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Service type">
        {serviceOptions.map((option) => {
          const selected = serviceType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onServiceChange(option.value)}
              className={cx(
                "rounded-xl border p-4 text-left transition-all duration-200",
                selected
                  ? "border-brand bg-brand-50 ring-4 ring-brand/10"
                  : "border-line bg-card hover:border-brand/40",
              )}
            >
              <span
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-xl",
                  selected ? "bg-brand text-white" : "bg-page text-brand",
                )}
              >
                <option.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="mt-3 block text-sm font-bold text-ink">{option.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-body">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-line bg-page p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-body">Billable weight</span>
          <span className="font-bold text-ink">{Math.max(billableWeight, 0)} kg</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>Physical {physicalWeight} kg · Volumetric {volumetricWeight} kg</span>
          {codAmount > 0 ? <span>COD {formatINR(codAmount)}</span> : null}
        </div>
      </div>

      <div className="mt-6" aria-live="polite">
        {quoteLoading ? (
          <div className="rounded-xl border border-line bg-card p-6">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent"
              />
              <span className="text-sm font-semibold text-ink">Calculating your quote…</span>
            </div>
            <div className="mt-4 space-y-2.5">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          </div>
        ) : quoteError ? (
          <div className="rounded-xl border border-danger/25 bg-danger-bg p-5 text-sm">
            <p className="font-semibold text-danger">{quoteError}</p>
            <p className="mt-1 text-body">
              Please check the pin codes and weight, then continue — the quote refreshes
              automatically.
            </p>
          </div>
        ) : quote ? (
          <div className="rounded-xl border border-line bg-card p-5">
            <h3 className="text-sm font-bold text-ink">Charge breakdown</h3>
            <table className="mt-3 w-full text-sm">
              <tbody>
                <tr className="border-b border-line">
                  <td className="py-2.5 text-body">Base charge</td>
                  <td className="py-2.5 text-right font-semibold text-ink">
                    {formatINR(quote.baseCharge)}
                  </td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2.5 text-body">Fuel surcharge</td>
                  <td className="py-2.5 text-right font-semibold text-ink">
                    {formatINR(quote.fuelSurcharge)}
                  </td>
                </tr>
                {quote.codCharge > 0 ? (
                  <tr className="border-b border-line">
                    <td className="py-2.5 text-body">COD charge</td>
                    <td className="py-2.5 text-right font-semibold text-ink">
                      {formatINR(quote.codCharge)}
                    </td>
                  </tr>
                ) : null}
                {quote.insuranceCharge > 0 ? (
                  <tr className="border-b border-line">
                    <td className="py-2.5 text-body">Insurance</td>
                    <td className="py-2.5 text-right font-semibold text-ink">
                      {formatINR(quote.insuranceCharge)}
                    </td>
                  </tr>
                ) : null}
                <tr className="border-b border-line">
                  <td className="py-2.5 text-body">GST (18%)</td>
                  <td className="py-2.5 text-right font-semibold text-ink">
                    {formatINR(quote.gstAmount)}
                  </td>
                </tr>
                <tr>
                  <td className="pt-3 text-base font-bold text-ink">Total</td>
                  <td className="pt-3 text-right text-base font-extrabold text-brand">
                    {formatINR(quote.total)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">
              Estimated delivery in {quote.estimatedDays} day{quote.estimatedDays === 1 ? "" : "s"}.
            </p>
          </div>
        ) : !quoteValid ? (
          <div className="rounded-xl border border-line bg-page p-5 text-sm text-muted">
            Go back and complete the sender/receiver pin codes and parcel weight to see live
            charges.
          </div>
        ) : null}
      </div>
    </div>
  );
}
