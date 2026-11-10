import type { Metadata } from "next";
import { TrackClient } from "./TrackClient";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Track a shipment",
  description:
    "Track any Rudrian parcel in real time — enter your AWB number for live hub scans, estimated delivery window and proof of delivery.",
  alternates: { canonical: "/track" },
  openGraph: {
    title: "Track a shipment · Rudrian Logistics Solutions",
    description:
      "Enter your AWB number for live hub scans, estimated delivery window and proof of delivery.",
    url: "/track",
    images: ["/opengraph-image.jpeg"],
    siteName: "Rudrian Logistics Solutions",
    type: "website",
  },
};

export default function TrackPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Track", path: "/track" }]} />
      <TrackClient />
    </>
  );
}
