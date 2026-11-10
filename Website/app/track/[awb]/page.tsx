import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes, LifeBuoy, MapPin, Package, Truck } from "lucide-react";
import { ApiErrorState } from "@/components/ApiErrorState";
import { StatusBadge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Timeline } from "@/components/Timeline";
import { TrackSearchBox } from "@/components/TrackSearchBox";
import { LiveTracker } from "./LiveTracker";
import { ApiError } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/utils";
import type { TrackingDetails } from "@/lib/types";


interface TrackPageProps {
  params: Promise<{ awb: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { awb } = await params;
  const decoded = decodeURIComponent(awb).toUpperCase();
  return {
    title: `Track shipment ${decoded}`.slice(0, 60),
    description: `Live tracking status, scan history and delivery details for Rudrian AWB ${decoded}.`,
    alternates: { canonical: `/track/${encodeURIComponent(decoded)}` },
    // Server-renders sender/receiver PII — never index.
    robots: { index: false, follow: true },
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function fetchTracking(awb: string): Promise<TrackingDetails> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/public/track/${encodeURIComponent(awb)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiError(
      "We could not reach Rudrian servers. Please check your connection and try again.",
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as { error?: { message?: unknown } }).error?.message === "string"
        ? ((payload as { error: { message: string } }).error.message)
        : response.status === 404
          ? `No shipment found with AWB ${awb}. Please check the number and try again.`
          : "Tracking is temporarily unavailable. Please try again in a few moments.";
    throw new ApiError(message, response.status);
  }

  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return (payload as { data: TrackingDetails }).data;
  }
  return payload as TrackingDetails;
}

const serviceLabels: Record<string, string> = {
  STANDARD: "Standard Delivery",
  EXPRESS: "Express Delivery",
  SURFACE: "Surface Transport",
};

function RouteNode({
  icon: Icon,
  title,
  subtitle,
  highlight = false,
}: {
  icon: typeof Package;
  title: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          highlight ? "bg-brand text-white shadow-[0_8px_18px_-8px_rgba(18,178,170,0.7)]" : "bg-brand-50 text-brand"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-ink">{title}</span>
        <span className="block truncate text-xs text-muted">{subtitle}</span>
      </span>
    </div>
  );
}

export default async function TrackDetailPage({ params }: TrackPageProps) {
  const { awb } = await params;
  const decoded = decodeURIComponent(awb).trim().toUpperCase();

  let details: TrackingDetails;
  try {
    details = await fetchTracking(decoded);
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Tracking is temporarily unavailable.";
    return (
      <div className="container-page py-16 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Tracking</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
            Shipment {decoded}
          </h1>
        </div>
        <div className="mx-auto mt-8 max-w-2xl">
          <ApiErrorState title="Unable to load tracking" message={message} />
        </div>
        <div className="mx-auto mt-8 max-w-2xl">
          <TrackSearchBox size="md" initialAwb={decoded} />
        </div>
      </div>
    );
  }

  const { sender, receiver, currentLocation, originLocation, destLocation, parcel, charges } =
    details;
  const isDelivered = details.status === "DELIVERED";
  const serviceLabel = serviceLabels[details.serviceType] ?? details.serviceType;

  return (
    <div className="container-page py-12 lg:py-16">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
            Shipment tracking
          </p>
          <h1 className="mt-2 font-mono text-2xl font-extrabold tracking-wider text-ink sm:text-3xl">
            {details.awbNumber}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-body">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-page px-3 py-1 font-medium">
              <Package className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              {serviceLabel}
            </span>
            <span>
              Booked {formatDate(details.createdAt)}
              {details.deliveredAt ? ` · Delivered ${formatDate(details.deliveredAt)}` : ""}
            </span>
          </div>
        </div>
        <StatusBadge status={details.status} className="px-3 py-1.5 text-sm" />
      </div>

      {/* Route */}
      <Card className="mt-6 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <RouteNode
            icon={MapPin}
            title={originLocation?.name ?? sender.city}
            subtitle={originLocation?.type ?? "Origin"}
          />
          <div className="hidden h-0.5 flex-1 rounded-full bg-gradient-to-r from-brand/60 via-brand/30 to-line sm:block" />
          <RouteNode
            icon={Truck}
            title={currentLocation?.name ?? (isDelivered ? destLocation?.name ?? receiver.city : "In transit")}
            subtitle={currentLocation?.type ?? (isDelivered ? "Destination" : "Current hub")}
            highlight={!isDelivered}
          />
          <div className="hidden h-0.5 flex-1 rounded-full bg-line sm:block" />
          <RouteNode
            icon={Package}
            title={destLocation?.name ?? receiver.city}
            subtitle={destLocation?.type ?? "Destination"}
          />
        </div>
        {details.estimatedDelivery && !isDelivered ? (
          <p className="mt-4 border-t border-line pt-4 text-sm text-body">
            Estimated delivery:{" "}
            <span className="font-semibold text-ink">{formatDate(details.estimatedDelivery)}</span>
          </p>
        ) : null}
      </Card>

      <div className="mt-6">
        <LiveTracker awbNumber={details.awbNumber} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-bold text-ink">Scan history</h2>
          <p className="mt-1 text-sm text-body">
            Every hub scan recorded for this shipment, newest first.
          </p>
          <div className="mt-6">
            {details.timeline.length > 0 ? (
              <Timeline events={details.timeline} currentStatus={details.status} />
            ) : (
              <p className="rounded-xl bg-page px-4 py-8 text-center text-sm text-muted">
                No scans recorded yet. Updates appear as soon as the parcel is picked up.
              </p>
            )}
          </div>
        </Card>

        {/* Side column */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-bold text-ink">Sender &amp; receiver</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-page p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">From</p>
                <p className="mt-1.5 text-sm font-bold text-ink">{sender.name}</p>
                <p className="mt-0.5 text-xs text-body">{sender.phone}</p>
                <p className="mt-1 text-xs leading-relaxed text-body">
                  {sender.address}, {sender.city} — {sender.pincode}
                </p>
              </div>
              <div className="rounded-xl bg-brand-50/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand">To</p>
                <p className="mt-1.5 text-sm font-bold text-ink">{receiver.name}</p>
                <p className="mt-0.5 text-xs text-body">{receiver.phone}</p>
                <p className="mt-1 text-xs leading-relaxed text-body">
                  {receiver.address}, {receiver.city} — {receiver.pincode}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-ink">
              <Boxes className="h-4 w-4 text-brand" aria-hidden="true" />
              Package details
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-body">Service</dt>
                <dd className="font-semibold text-ink">{serviceLabel}</dd>
              </div>
              {parcel?.category ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body">Category</dt>
                  <dd className="font-semibold text-ink">{parcel.category}</dd>
                </div>
              ) : null}
              {parcel?.physicalWeight ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body">Weight</dt>
                  <dd className="font-semibold text-ink">{parcel.physicalWeight} kg</dd>
                </div>
              ) : null}
              {parcel?.lengthCm && parcel?.widthCm && parcel?.heightCm ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body">Dimensions</dt>
                  <dd className="font-semibold text-ink">
                    {parcel.lengthCm} × {parcel.widthCm} × {parcel.heightCm} cm
                  </dd>
                </div>
              ) : null}
              {parcel?.codAmount ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body">COD amount</dt>
                  <dd className="font-semibold text-ink">{formatINR(parcel.codAmount)}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-body">AWB</dt>
                <dd className="font-mono text-xs font-bold tracking-wide text-ink">
                  {details.awbNumber}
                </dd>
              </div>
            </dl>
          </Card>

          {charges ? (
            <Card>
              <h2 className="text-base font-bold text-ink">Charges</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body">Base charge</dt>
                  <dd className="font-semibold text-ink">{formatINR(charges.baseCharge)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body">Fuel surcharge</dt>
                  <dd className="font-semibold text-ink">{formatINR(charges.fuelSurcharge)}</dd>
                </div>
                {charges.codCharge > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-body">COD charge</dt>
                    <dd className="font-semibold text-ink">{formatINR(charges.codCharge)}</dd>
                  </div>
                ) : null}
                {charges.insuranceCharge > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-body">Insurance</dt>
                    <dd className="font-semibold text-ink">
                      {formatINR(charges.insuranceCharge)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body">GST</dt>
                  <dd className="font-semibold text-ink">{formatINR(charges.gstAmount)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
                  <dt className="text-sm font-bold text-ink">Total</dt>
                  <dd className="text-base font-extrabold text-ink">{formatINR(charges.total)}</dd>
                </div>
              </dl>
            </Card>
          ) : null}

          <Card className="bg-brand-50/60">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-ink">
              <LifeBuoy className="h-4 w-4 text-brand" aria-hidden="true" />
              Need help with this shipment?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-body">
              Facing a delay, damage or address issue? Raise a ticket and our support team
              will respond within 4 working hours.
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Link
                href={`/support?awb=${encodeURIComponent(details.awbNumber)}`}
                className="btn btn-primary w-full"
              >
                Raise a ticket
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/book" className="btn btn-secondary w-full">
                Book another shipment
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
