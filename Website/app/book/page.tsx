import type { Metadata } from "next";
import { BookWizard } from "./BookWizard";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Book a shipment",
  description:
    "Book a Rudrian Logistics Solutions pickup in minutes — instant quotes, live tracking and OTP-secured delivery across India.",
  alternates: { canonical: "/book" },
  openGraph: {
    title: "Book a shipment · Rudrian Logistics Solutions",
    description:
      "Instant quotes, live tracking and OTP-secured delivery across India. Book a pickup in minutes.",
    url: "/book",
    images: ["/opengraph-image.jpeg"],
    siteName: "Rudrian Logistics Solutions",
    type: "website",
  },
};

export default function BookPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Book a shipment", path: "/book" }]} />
      <BookWizard />
    </>
  );
}
