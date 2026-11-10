import type { Metadata } from "next";
import { SupportClient } from "./SupportClient";
import { FaqSection } from "./FaqSection";
import { faqs } from "./faqs";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Support & Help Centre",
  description:
    "Raise a Rudrian support ticket for delivery delays, damages or address changes, and track ticket status with your phone number.",
  alternates: { canonical: "/support" },
  openGraph: {
    title: "Support & Help Centre · Rudrian Logistics Solutions",
    description:
      "Raise a support ticket for delivery delays, damages or address changes, and track its status with your phone number.",
    url: "/support",
    images: ["/opengraph-image.jpeg"],
    siteName: "Rudrian Logistics Solutions",
    type: "website",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function SupportPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <BreadcrumbJsonLd items={[{ name: "Support", path: "/support" }]} />
      <SupportClient />
      <FaqSection />
    </>
  );
}
