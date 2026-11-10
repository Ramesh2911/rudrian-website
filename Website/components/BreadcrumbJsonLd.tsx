interface BreadcrumbItem {
  name: string;
  path: string;
}

/** Server-safe BreadcrumbList JSON-LD for a page (home is implied parent). */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const graph = [
    { name: "Home", path: "/" },
    ...items,
  ].map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `https://swiftlogix.in${item.path}`,
  }));

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
