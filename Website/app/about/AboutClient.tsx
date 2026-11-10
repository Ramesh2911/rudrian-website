import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Globe,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Timer,
  Truck,
  Warehouse,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { ServiceCard } from "@/components/ServiceCard";
import { Card } from "@/components/Card";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/StaggerGroup";
import { Ticker } from "@/components/motion/Ticker";
import { COMPANY } from "@/lib/company";

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

const reachCities = [
  "Kolkata",
  "Chinsurah",
  "Burdwan",
  "Howrah",
  "Haldia",
  "Siliguri",
  "Durgapur",
  "Asansol",
  "Malda",
  "Kharagpur",
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Chennai",
  "Hyderabad",
  "Guwahati",
];

const reasons = [
  "Reliable and professional logistics support",
  "Safe packaging and secure shipment handling",
  "Doorstep pickup facilities",
  "Pan-India and international delivery network",
  "Express delivery solutions",
  "Customized shipping services for businesses",
  "Commitment to customer satisfaction and operational efficiency",
];

export function AboutClient() {
  return (
    <>
      {/* Hero */}
      <section className="gradient-pan relative overflow-hidden bg-gradient-to-br from-brand via-brand-dark to-[#0b1220] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(123,192,67,0.35),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div className="container-page relative py-16 lg:py-24">
          <Reveal>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] backdrop-blur">
              About us
            </span>
            <p className="mt-5 max-w-3xl text-sm font-semibold uppercase tracking-wider text-white/70">
              {COMPANY.name}
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Moving Businesses Forward,{" "}
              <span className="bg-gradient-to-r from-white via-[#d7fff7] to-[#bff5d0] bg-clip-text text-transparent">
                Connecting Opportunities.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              A logistics and transportation company dedicated to reliable, efficient and
              secure shipping — simplifying operations for businesses through dependable
              transportation, professional handling and seamless delivery services.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/book" className="btn btn-lg shine bg-white text-ink hover:bg-white/90">
                Book a shipment
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                className="btn btn-lg border border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20"
              >
                Talk to our team
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="container-page scroll-mt-24 py-16 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal from="left">
            <SectionHeading
              align="left"
              eyebrow="Who we are"
              title="About Rudrian Logistics"
              description={COMPANY.tagline}
            />
            <p className="mt-5 text-base leading-relaxed text-body">
              <strong className="text-ink">{COMPANY.name}</strong> is a logistics and
              transportation company dedicated to providing reliable, efficient, and secure
              shipping solutions. We aim to simplify logistics operations for businesses
              through dependable transportation, professional handling, and seamless
              delivery services.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {["Pan-India network", "International shipping", "Doorstep pickup", "Express delivery"].map(
                (chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-dark"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {chip}
                  </span>
                ),
              )}
            </div>
          </Reveal>

          <Reveal from="right">
            <Card className="relative overflow-hidden p-8">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-brand/15 to-accent/15"
              />
              <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-brand">
                Our purpose
              </p>
              <p className="relative mt-4 text-xl font-semibold leading-relaxed text-ink sm:text-2xl">
                “Logistics is more than moving shipments — it’s about building trust,
                connecting opportunities, and supporting business growth.”
              </p>
              <div className="relative mt-6 grid grid-cols-3 gap-4 border-t border-line pt-6">
                <div>
                  <p className="text-2xl font-extrabold text-ink">2M+</p>
                  <p className="mt-1 text-xs text-muted">Parcels a year</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-ink">19K+</p>
                  <p className="mt-1 text-xs text-muted">Pin codes</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-ink">98.7%</p>
                  <p className="mt-1 text-xs text-muted">On-time</p>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Our Services */}
      <section id="services" className="scroll-mt-24 border-y border-line bg-card py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="What we do"
            title="Our Services"
            description="Comprehensive logistics solutions designed to meet diverse business and individual shipping requirements."
          />
          <StaggerGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((service) => (
              <StaggerItem key={service.title}>
                <ServiceCard icon={service.icon} title={service.title} description={service.description} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Nationwide & International Reach */}
      <section id="reach" className="scroll-mt-24 py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="Our network"
            title="Nationwide & International Reach"
            description="We connect businesses and customers through an extensive delivery network, offering Pan-India and international shipping solutions — making transportation and shipment movement accessible, efficient and dependable across geographical boundaries."
          />
          <Reveal className="mt-12 overflow-hidden rounded-2xl border border-line bg-card py-5">
            <Ticker duration={32}>
              {reachCities.map((city) => (
                <span
                  key={city}
                  className="mx-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-body"
                >
                  <MapPin className="h-4 w-4 text-brand" aria-hidden="true" />
                  {city}
                </span>
              ))}
            </Ticker>
          </Reveal>
          <StaggerGroup className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Pan-India delivery", detail: "19,000+ pin codes covered" },
              { label: "International shipping", detail: "Cross-border reach, handled end to end" },
              { label: "Hub-to-door network", detail: "Scanned at every checkpoint" },
            ].map((item) => (
              <StaggerItem key={item.label}>
                <Card hover className="p-6 text-center">
                  <p className="text-base font-bold text-ink">{item.label}</p>
                  <p className="mt-1.5 text-sm text-body">{item.detail}</p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Safe Packaging */}
      <section id="packaging" className="scroll-mt-24 border-y border-line bg-card py-16 lg:py-24">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal from="left">
            <SectionHeading
              align="left"
              eyebrow="Handled with care"
              title="Safe Packaging & Secure Handling"
              description="Every shipment deserves proper care. We prioritize safe packaging and careful handling to minimize the risk of damage during transportation — ensuring shipments are protected throughout their journey, from pickup to final delivery."
            />
          </Reveal>
          <Reveal from="right">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Package, title: "Protective packaging", text: "Right material for every parcel type" },
                { icon: ShieldCheck, title: "Damage minimised", text: "Careful handling at each scan point" },
                { icon: Truck, title: "Safe transit", text: "Secured loading, hub-to-hub checks" },
                { icon: PackageCheck, title: "Secure delivery", text: "OTP-verified handover at the door" },
              ].map((item) => (
                <Card key={item.title} hover className="p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand">
                    <item.icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
                  </span>
                  <p className="mt-4 text-sm font-bold text-ink">{item.title}</p>
                  <p className="mt-1 text-sm text-body">{item.text}</p>
                </Card>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Fast Delivery + Doorstep Pickup */}
      <section id="delivery" className="scroll-mt-24 py-16 lg:py-24">
        <div className="container-page grid gap-6 lg:grid-cols-2">
          <Reveal from="left" className="h-full">
            <Card className="relative flex h-full flex-col overflow-hidden p-8">
              <div
                aria-hidden="true"
                className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-brand/15 to-accent/15"
              />
              <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-brand text-white">
                <Timer className="h-6 w-6" aria-hidden="true" strokeWidth={1.9} />
              </span>
              <p className="relative mt-5 text-xs font-bold uppercase tracking-[0.18em] text-brand">
                Fast &amp; Reliable Delivery
              </p>
              <h2 className="relative mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                1-day delivery in{" "}
                <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
                  Kolkata &amp; Burdwan
                </span>
              </h2>
              <p className="relative mt-4 text-base leading-relaxed text-body">
                We understand the importance of time in business. With our express delivery
                services, we help businesses maintain smooth operations and meet their
                delivery commitments — dependable, on schedule, every shipment.
              </p>
              <div className="relative mt-auto flex items-center gap-4 pt-6 text-sm font-semibold text-ink">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-brand" aria-hidden="true" /> Express dispatch
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden="true" /> On-time focus
                </span>
              </div>
            </Card>
          </Reveal>

          <Reveal from="right" className="h-full">
            <Card className="relative flex h-full flex-col overflow-hidden p-8">
              <div
                aria-hidden="true"
                className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-violet/15 to-info/15"
              />
              <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-violet text-white">
                <PackageCheck className="h-6 w-6" aria-hidden="true" strokeWidth={1.9} />
              </span>
              <p className="relative mt-5 text-xs font-bold uppercase tracking-[0.18em] text-violet">
                Doorstep Pickup Convenience
              </p>
              <h2 className="relative mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                We come to you
              </h2>
              <p className="relative mt-4 text-base leading-relaxed text-body">
                We make shipping easier with convenient doorstep pickup facilities. Our team
                collects shipments directly from your location, reducing the hassle of
                transportation and making the entire shipping process simpler and more
                convenient.
              </p>
              <div className="relative mt-auto flex flex-wrap gap-3 pt-6">
                <Link href="/book" className="btn btn-primary btn-sm">
                  Schedule a pickup
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/track" className="btn btn-secondary btn-sm">
                  Track a shipment
                </Link>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Why Choose */}
      <section id="why" className="scroll-mt-24 border-y border-line bg-card py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="The difference"
            title="Why Choose Rudrian Logistics?"
            description="Reliable support, secure handling and a network built to keep your business moving forward."
          />
          <StaggerGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map((reason) => (
              <StaggerItem key={reason}>
                <Card hover className="flex h-full items-start gap-3.5 p-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success-bg text-success">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" strokeWidth={2.1} />
                  </span>
                  <p className="pt-1.5 text-sm font-semibold leading-relaxed text-ink">{reason}</p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Commitment */}
      <section id="commitment" className="scroll-mt-24 py-16 lg:py-24">
        <div className="container-page">
          <Reveal>
            <div className="gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-[#13203a] to-[#0b1220] px-8 py-14 text-center text-white sm:px-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(18,178,170,0.4),transparent)] blob-drift"
              />
              <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-[#5EEAD4]">
                Our Commitment
              </p>
              <h2 className="relative mx-auto mt-4 max-w-3xl text-2xl font-extrabold leading-snug tracking-tight sm:text-3xl">
                At Rudrian Logistics, we believe logistics is more than moving shipments —
                it’s about building trust, connecting opportunities, and supporting
                business growth.
              </h2>
              <p className="relative mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70">
                We continuously strive to deliver dependable solutions that help our clients
                move forward with confidence.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Contact strip */}
      <section id="contact-strip" className="scroll-mt-24 border-t border-line bg-card py-16 lg:py-20">
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
          <Reveal className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/contact" className="btn btn-primary btn-lg shine">
              Contact our team
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/book" className="btn btn-secondary btn-lg">
              Book a shipment
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
