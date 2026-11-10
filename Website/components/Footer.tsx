import Link from "next/link";
import { BriefcaseBusiness, Camera, Mail, MapPin, Phone, ThumbsUp, X } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/motion/Reveal";

const productLinks = [
  { href: "/#services", label: "Logistics & Transportation" },
  { href: "/#services", label: "Doorstep Pickup & Delivery" },
  { href: "/#services", label: "Safe & Secure Packaging" },
  { href: "/#services", label: "Warehousing & Supply Chain" },
  { href: "/#services", label: "E-commerce Shipping" },
  { href: "/#services", label: "Domestic & International" },
  { href: "/#services", label: "Customized Business Logistics" },
];

const companyLinks = [
  { href: "/about", label: "About Rudrian" },
  { href: "/contact", label: "Partner with us" },
  { href: "/contact", label: "Careers" },
  { href: "/contact", label: "Press & Media" },
];

const supportLinks = [
  { href: "/track", label: "Track a shipment" },
  { href: "/support", label: "Raise a ticket" },
  { href: "/support", label: "FAQs & help centre" },
  { href: "/contact", label: "Contact us" },
];

const socials = [
  { href: "https://twitter.com", label: "Rudrian on X (Twitter)", Icon: X },
  { href: "https://linkedin.com", label: "Rudrian on LinkedIn", Icon: BriefcaseBusiness },
  { href: "https://instagram.com", label: "Rudrian on Instagram", Icon: Camera },
  { href: "https://facebook.com", label: "Rudrian on Facebook", Icon: ThumbsUp },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-card">
      <div className="container-page py-14 lg:py-16">
        <Reveal className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-body">
            Rudrian Logistics Solutions moves 2 million+ parcels a year across India — live
            tracking, doorstep pickups and OTP-secured delivery, all from one dashboard.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noreferrer"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-line text-body transition-all duration-200 hover:border-brand/40 hover:bg-brand-50 hover:text-brand"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Products">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Products</h3>
            <ul className="mt-4 space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-body transition-colors hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Company</h3>
            <ul className="mt-4 space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-body transition-colors hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Support">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Support</h3>
            <ul className="mt-4 space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-body transition-colors hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-5 space-y-2.5 text-sm text-body">
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{COMPANY.phone}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{COMPANY.email}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  {COMPANY.address.street},
                  <br />
                  {COMPANY.address.city}, {COMPANY.address.region} {COMPANY.address.postal}
                </span>
              </li>
            </ul>
          </nav>
        </Reveal>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-5 text-xs text-muted sm:flex-row">
          <p>© {year} {COMPANY.name}. All rights reserved.</p>
          <p className="tracking-wide">GSTIN 29AABCS1234F1Z5 · Logistics - Think Different</p>
        </div>
      </div>
    </footer>
  );
}
