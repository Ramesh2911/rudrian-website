import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rudrian Logistics Solutions",
    short_name: "Rudrian",
    description:
      "Book shipments, track parcels live and manage deliveries across India with Rudrian Logistics Solutions.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFF",
    theme_color: "#12B2AA",
    icons: [
      { src: "/logo-trimmed.jpeg", sizes: "1181x509", type: "image/jpeg", purpose: "any" },
      { src: "/icon.jpeg", sizes: "448x448", type: "image/jpeg", purpose: "any" },
    ],
  };
}
