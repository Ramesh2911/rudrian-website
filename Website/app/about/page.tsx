import type { Metadata } from "next";
import { AboutClient } from "./AboutClient";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "About us",
  description: `${COMPANY.name} — logistics and transportation company providing reliable, efficient and secure shipping solutions: doorstep pickup, safe packaging, Pan-India and international delivery.`,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About us · ${COMPANY.short}`,
    description: COMPANY.tagline,
    url: "/about",
    images: ["/opengraph-image.jpeg"],
    siteName: "Rudrian Logistics Solutions",
    type: "website",
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `About ${COMPANY.short}`,
  url: "https://swiftlogix.in/about",
  description: `${COMPANY.name} is a logistics and transportation company dedicated to providing reliable, efficient, and secure shipping solutions.`,
  mainEntity: {
    "@type": "Organization",
    name: COMPANY.name,
    alternateName: COMPANY.short,
    slogan: COMPANY.tagline,
    url: "https://swiftlogix.in",
    telephone: COMPANY.phone,
    email: COMPANY.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.address.street,
      addressLocality: COMPANY.address.city,
      postalCode: COMPANY.address.postal,
      addressRegion: COMPANY.address.region,
      addressCountry: COMPANY.address.country,
    },
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <BreadcrumbJsonLd items={[{ name: "About", path: "/about" }]} />
      <AboutClient />
    </>
  );
}
