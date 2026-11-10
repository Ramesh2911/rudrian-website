import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Auth pages are noindex via meta robots; keep them crawlable so the
        // directive is honoured, and block raw-preview paths if added later.
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://swiftlogix.in/sitemap.xml",
    host: "https://swiftlogix.in",
  };
}
