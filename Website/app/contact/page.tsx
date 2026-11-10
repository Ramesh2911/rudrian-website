import type { Metadata } from "next";
import { ContactClient } from "./ContactClient";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Contact ${COMPANY.short} for sales, partnerships and shipment support — office in ${COMPANY.address.city}, ${COMPANY.address.region} ${COMPANY.address.postal}.`,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: `Contact us · ${COMPANY.short}`,
    description: `Sales, partnerships and shipment support — office in ${COMPANY.address.city}, ${COMPANY.address.region}.`,
    url: "/contact",
    images: ["/opengraph-image.jpeg"],
    siteName: "Rudrian Logistics Solutions",
    type: "website",
  },
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: `Contact ${COMPANY.short}`,
  url: "https://swiftlogix.in/contact",
  mainEntity: {
    "@type": "Organization",
    name: COMPANY.short,
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
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "08:00",
        closes: "22:00",
      },
    ],
  },
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <BreadcrumbJsonLd items={[{ name: "Contact", path: "/contact" }]} />
      <ContactClient />
    </>
  );
}
