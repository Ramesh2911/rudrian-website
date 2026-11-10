import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Globe,
  Headphones,
  Mail,
  MapPin,
  MapPinned,
  MessageSquare,
  PackageCheck,
  Phone,
  Printer,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Warehouse,
} from "lucide-react";
import { TrackSearchBox } from "@/components/TrackSearchBox";
import { SectionHeading } from "@/components/SectionHeading";
import { ServiceCard } from "@/components/ServiceCard";
import { TestimonialCard } from "@/components/TestimonialCard";
import { StatItem } from "@/components/StatItem";
import { Card } from "@/components/Card";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/StaggerGroup";
import { Ticker } from "@/components/motion/Ticker";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "Rudrian Logistics Solutions — Courier & Logistics Tracking",
    description:
      "Book shipments, track parcels live across 19,000+ pin codes and get OTP-secured delivery proof.",
    url: "/",
    images: ["/opengraph-image.jpeg"],
    siteName: "Rudrian Logistics Solutions",
    type: "website",
  },
};

const services = [
  {
    icon: Truck,
    title: "Logistics & Transportation",
    description:
      "Dependable, efficient and secure movement of goods — planned routes, professional handling and on-time delivery.",
  },
  {
    icon: PackageCheck,
    title: "Doorstep Pickup & Delivery",
    description:
      "We collect shipments directly from your location and deliver to the recipient's doorstep, end to end.",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Secure Packaging",
    description:
      "Proper care at every step — protective packaging and careful handling to minimise the risk of damage.",
  },
  {
    icon: Warehouse,
    title: "Warehousing & Supply Chain",
    description:
      "Storage and supply chain solutions that keep your inventory moving and your business stocked.",
  },
  {
    icon: ShoppingCart,
    title: "E-commerce Shipping",
    description:
      "Shipping solutions built for online sellers — fast dispatch, COD support and returns handled for you.",
  },
  {
    icon: Globe,
    title: "Domestic & International",
    description:
      "Pan-India and international shipping through an extensive delivery network that crosses boundaries.",
  },
  {
    icon: Briefcase,
    title: "Customized Business Logistics",
    description:
      "Tailored logistics programs designed around your volumes, destinations and delivery commitments.",
  },
];

const steps = [
  {
    title: "Book",
    description:
      "Create a booking in under 2 minutes with pickup address, pin codes and parcel details. Get instant charges.",
  },
  {
    title: "Pickup",
    description:
      "A Rudrian rider arrives at your door — usually within 2 hours — scans the label and shares the AWB.",
  },
  {
    title: "In-Transit",
    description:
      "Follow every hub scan on the live map. Get WhatsApp and SMS alerts at each milestone.",
  },
  {
    title: "Delivered",
    description:
      "OTP-secured proof of delivery, e-receipt and instant COD remittance (where applicable).",
  },
];

const features = [
  {
    icon: MapPinned,
    title: "Live tracking",
    description:
      "Hub-level scans on a live map, refreshed in real time. Share a tracking link with your customer in one tap.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp alerts",
    description:
      "Automatic milestone messages on WhatsApp and SMS — fewer WISMO tickets, happier buyers.",
  },
  {
    icon: Printer,
    title: "Thermal labels",
    description:
      "Print-ready 4×6 thermal labels with scannable barcodes that work with any printer.",
  },
  {
    icon: ShieldCheck,
    title: "OTP-secured POD",
    description:
      "Delivery is only completed when the receiver shares the OTP. Signed and time-stamped proof for every order.",
  },
];

const testimonials = [
  {
    quote:
      "We moved 40,000 orders a month to Rudrian and cut our RTO rate by 31%. The live dashboard is the first thing my team opens every morning.",
    name: "Ananya Rao",
    role: "Head of Ops",
    company: "Kaveri Skincare, Bengaluru",
  },
  {
    quote:
      "COD remittance used to take a week. With Rudrian it lands in two days, with reconciliation that matches our books line for line.",
    name: "Rohit Mehta",
    role: "Founder",
    company: "Mehta Electricals, Jaipur",
  },
  {
    quote:
      "Our WISMO tickets dropped by half after we switched on WhatsApp milestone alerts — and support replies within four working hours, every time.",
    name: "Sarah Fernandes",
    role: "CX Lead",
    company: "Urban Ladder Partners, Mumbai",
  },
];

const timelineMock = [
  { label: "Picked up", place: "Koramangala, Bengaluru", done: true },
  { label: "Arrived at hub", place: "Whitefield Sorting Centre", done: true },
  { label: "In transit", place: "On the way to Hyderabad", done: true },
  { label: "Out for delivery", place: "Pending", done: false },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="blob-drift absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(18,178,170,0.14),transparent)]" />
          <div
            className="blob-drift absolute right-[-8%] top-32 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(79,70,229,0.12),transparent)]"
            style={{ animationDelay: "-6s" }}
          />
          <div
            className="blob-drift absolute left-[-6%] top-64 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(14,165,233,0.10),transparent)]"
            style={{ animationDelay: "-12s" }}
          />
        </div>

        <div className="container-page pb-20 pt-16 sm:pt-24 lg:pb-28 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal from="none" delay={0}>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-1.5 text-xs font-semibold text-body shadow-soft">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
                Trusted by 12,000+ businesses across India
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Ship anywhere.
                <br />
                <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
                  Track everything.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-body sm:text-lg">
                Book a pickup, see honest upfront charges and follow every parcel on a live
                map. Rudrian delivers across 19,000+ pin codes with one dashboard for
                bookings, COD remittances and invoices.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.32} className="mx-auto mt-10 max-w-2xl">
            <TrackSearchBox size="lg" autoFocus />
            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/book" className="btn btn-secondary shine w-full sm:w-auto">
                Book a shipment
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/support" className="btn btn-ghost w-full sm:w-auto">
                Need help with a delivery?
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="border-y border-line bg-card">
          <div className="container-page grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
            <StatItem to={2} suffix="M+" label="Parcels delivered" />
            <StatItem to={19} suffix="K+" label="Pin codes covered" />
            <StatItem to={98.7} suffix="%" decimals={1} label="On-time delivery" />
            <StatItem value="24×7" label="Live tracking & alerts" />
          </div>
        </div>
      </section>

      {/* Coverage ticker */}
      <div className="border-b border-line bg-page py-4">
        <div className="flex items-center gap-6">
          <span className="hidden shrink-0 pl-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted sm:block sm:pl-6 lg:pl-8">
            Delivering to
          </span>
          <Ticker duration={45} className="flex-1">
            {[
              "Mumbai",
              "Delhi NCR",
              "Bengaluru",
              "Hyderabad",
              "Chennai",
              "Pune",
              "Kolkata",
              "Ahmedabad",
              "Jaipur",
              "Lucknow",
              "Kochi",
              "Chandigarh",
              "Indore",
              "Coimbatore",
              "Surat",
              "Nagpur",
            ].map((city) => (
              <span
                key={city}
                className="text-xs font-semibold uppercase tracking-wider text-muted"
              >
                {city}
              </span>
            ))}
          </Ticker>
        </div>
      </div>

      {/* Services */}
      <section id="services" className="container-page scroll-mt-24 py-20 lg:py-28">
        <SectionHeading
          eyebrow="Services"
          title="Everything your shipment needs, under one roof"
          description="From transportation and doorstep pickup to safe packaging, warehousing and e-commerce shipping — end-to-end logistics for businesses of every size."
        />
        <StaggerGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <StaggerItem key={service.title}>
              <ServiceCard {...service} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 border-y border-line bg-card py-20 lg:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="How it works"
            title="From booking to doorstep in four steps"
            description="Every handoff is scanned on the app and shared with your customer automatically — no calls or spreadsheets to chase."
          />
          <StaggerGroup as="ol" className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <StaggerItem key={step.title} as="li" className="relative">
                <div className="card h-full p-6">
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent text-sm font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(18,178,170,0.7)]"
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-body">{step.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container-page scroll-mt-24 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Why Rudrian"
              title="Fewer “where is my order?” calls"
              description="Every parcel gets a shareable live tracking page, proactive alerts and delivery proof you can stand behind."
            />
            <ul className="mt-8 space-y-5">
              {features.map((feature) => (
                <li key={feature.title} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand">
                    <feature.icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ink">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-body">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Reveal delay={0.15} className="mt-8">
              <Link href="/book" className="btn btn-primary shine">
                Start shipping
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>

          <Reveal from="right" distance={28} className="relative" >
            {/* Map-style visual */}
            <Card className="relative overflow-hidden p-0">
              <div className="border-b border-line bg-page/60 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Live network view
                </p>
              </div>
              <div className="relative h-72 bg-[linear-gradient(180deg,#F8FAFF_0%,#EEF3FC_100%)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#D7E0F0_1px,transparent_0)] [background-size:22px_22px]" />
                <svg viewBox="0 0 400 280" className="absolute inset-0 h-full w-full" fill="none">
                  <path
                    d="M60 210 C 130 120, 210 250, 300 90"
                    stroke="#12B2AA"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.65"
                    className="map-route"
                  />
                  <circle cx="60" cy="210" r="7" fill="#12B2AA" />
                  <circle cx="60" cy="210" r="13" fill="#12B2AA" opacity="0.18" className="map-node-ring" />
                  <circle cx="300" cy="90" r="7" fill="#7BC043" />
                  <circle
                    cx="300"
                    cy="90"
                    r="13"
                    fill="#7BC043"
                    opacity="0.18"
                    className="map-node-ring"
                    style={{ animationDelay: "-1.3s" }}
                  />
                  <circle cx="186" cy="167" r="9" fill="#16A34A" />
                  <circle cx="186" cy="167" r="18" fill="#16A34A" opacity="0.2" className="map-node-ring" style={{ animationDelay: "-0.6s" }} />
                  <circle cx="186" cy="167" r="28" fill="#16A34A" opacity="0.1" />
                  {/* Parcel moving along the route */}
                  <circle r="5" fill="#0E8F8A" stroke="#ffffff" strokeWidth="2">
                    <animateMotion
                      dur="5s"
                      repeatCount="indefinite"
                      path="M60 210 C 130 120, 210 250, 300 90"
                    />
                  </circle>
                </svg>
                <span className="absolute bottom-[22%] left-[8%] rounded-lg bg-card px-2.5 py-1 text-[10px] font-bold text-ink shadow-soft">
                  Bengaluru
                </span>
                <span className="absolute right-[10%] top-[18%] rounded-lg bg-card px-2.5 py-1 text-[10px] font-bold text-ink shadow-soft">
                  Hyderabad
                </span>
                <span className="float-soft absolute left-[42%] top-[52%] rounded-lg bg-success-bg px-2.5 py-1 text-[10px] font-bold text-success shadow-soft">
                  In transit
                </span>
              </div>
            </Card>

            {/* Phone mock */}
            <Card className="absolute -bottom-8 -right-2 hidden w-64 p-4 shadow-lift sm:block lg:-right-8">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand">
                  <PackageCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">Parcel update</p>
                  <p className="text-[10px] text-muted">Rudrian · just now</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-body">
                Your parcel <span className="font-bold text-ink">SLX261031000002</span> departed
                Whitefield hub and is on the way to Hyderabad.
              </p>
              <div className="mt-3 space-y-2">
                {timelineMock.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span
                      className={
                        item.done
                          ? "h-2 w-2 shrink-0 rounded-full bg-success"
                          : "h-2 w-2 shrink-0 rounded-full bg-line"
                      }
                    />
                    <span
                      className={
                        item.done
                          ? "text-[11px] font-semibold text-ink"
                          : "text-[11px] font-semibold text-muted"
                      }
                    >
                      {item.label}
                    </span>
                    <span className="ml-auto truncate text-[10px] text-muted">{item.place}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="absolute -left-2 -top-6 hidden w-52 items-center gap-3 p-3.5 shadow-lift sm:flex lg:-left-8">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success-bg text-success">
                <BadgeCheck className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-bold text-ink">Delivered with OTP</p>
                <p className="text-[10px] text-muted">POD captured · 4:42 PM</p>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="scroll-mt-24 border-y border-line bg-card py-20 lg:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="Customer stories"
            title="Businesses that ship with Rudrian"
            description="What operators and founders say after moving their deliveries to Rudrian."
          />
          <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <StaggerItem key={testimonial.name}>
                <TestimonialCard {...testimonial} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Contact strip */}
      <section id="contact" className="scroll-mt-24 border-t border-line bg-page py-16 lg:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="Contact us"
            title="Let’s Connect. Let’s Grow Together."
            description={COMPANY.name}
          />
          <StaggerGroup className="mt-10 grid gap-4 sm:grid-cols-3">
            <StaggerItem>
              <Card hover className="h-full p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand">
                  <MapPin className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
                </span>
                <p className="mt-4 text-sm font-bold text-ink">Registered / Office Address</p>
                <p className="mt-2 text-sm leading-relaxed text-body">{COMPANY.address.full}</p>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card hover className="h-full p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand">
                  <Mail className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
                </span>
                <p className="mt-4 text-sm font-bold text-ink">Email</p>
                <p className="mt-2 text-lg font-bold text-ink">{COMPANY.email}</p>
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card hover className="h-full p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand">
                  <Phone className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
                </span>
                <p className="mt-4 text-sm font-bold text-ink">Phone</p>
                <p className="mt-2 text-lg font-bold text-ink">{COMPANY.phone}</p>
              </Card>
            </StaggerItem>
          </StaggerGroup>
          <Reveal className="mt-8 text-center">
            <Link href="/contact" className="btn btn-primary shine">
              Talk to our team
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-20 lg:py-28">
          <div className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-[#0E9B95] to-accent px-6 py-14 text-center shadow-[0_24px_60px_-24px_rgba(18,178,170,0.55)] sm:px-12 lg:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_85%_75%,rgba(255,255,255,0.12),transparent_40%)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <Headphones className="mx-auto h-10 w-10 text-white/80" aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Start shipping today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              Free live tracking pages, upfront charges and human support Monday to
              Saturday — no contracts or minimum volumes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/book"
                className="btn shine w-full bg-white text-brand shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-white/95 sm:w-auto"
              >
                Book a shipment
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                className="btn w-full border border-white/40 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:w-auto"
              >
                Talk to sales
              </Link>
            </div>
            <p className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-white/75">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Every shipment insured up to ₹5,000 at no extra cost
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
