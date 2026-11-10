import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";
import { COMPANY } from "@/lib/company";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://swiftlogix.in"),
  title: {
    default: "Rudrian Logistics Solutions — Courier & Logistics Tracking",
    template: "%s · Rudrian Logistics Solutions",
  },
  description:
    "Ship anywhere in India with live parcel tracking — express delivery, surface transport, COD, reverse logistics and fulfilment from one dashboard.",
  keywords: [
    "courier tracking",
    "AWB tracking",
    "parcel delivery India",
    "logistics software",
    "COD delivery",
    "Rudrian Logistics Solutions",
    "Rudrian",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Rudrian Logistics Solutions",
    title: "Rudrian Logistics Solutions — Courier & Logistics Tracking",
    description:
      "Book shipments, track parcels live across 19,000+ pin codes and get OTP-secured delivery proof.",
    url: "https://swiftlogix.in",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rudrian Logistics Solutions — Courier & Logistics Tracking",
    description:
      "Book shipments, track parcels live across 19,000+ pin codes and get OTP-secured delivery proof.",
  },
  robots: { index: true, follow: true },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://swiftlogix.in/#organization",
      name: "Rudrian Logistics Solutions",
      url: "https://swiftlogix.in",
      logo: {
        "@type": "ImageObject",
        url: "https://swiftlogix.in/logo.jpeg",
        width: 1181,
        height: 509,
      },
      email: COMPANY.email,
      telephone: COMPANY.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: COMPANY.address.street,
        addressLocality: COMPANY.address.city,
        postalCode: COMPANY.address.postal,
        addressRegion: COMPANY.address.region,
        addressCountry: COMPANY.address.country,
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: COMPANY.phone,
          contactType: "customer support",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://swiftlogix.in/#website",
      url: "https://swiftlogix.in",
      name: "Rudrian Logistics Solutions",
      publisher: { "@id": "https://swiftlogix.in/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://swiftlogix.in/track/{search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#12B2AA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-page font-sans text-body">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <ToastProvider>
          <Navbar />
          <main id="main-content" className="flex min-h-[70vh] flex-col">
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
