"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input, Textarea } from "@/components/Input";
import { useToast } from "@/components/Toast";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/StaggerGroup";
import { COMPANY } from "@/lib/company";

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validatePhone(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ""));
}

interface ContactCardItem {
  icon: typeof Phone;
  title: string;
  lines: string[];
  href?: string;
  hrefLabel?: string;
}

const contactCards: ContactCardItem[] = [
  {
    icon: Phone,
    title: "Support hotline",
    lines: [COMPANY.phone, COMPANY.hours.customerCare],
  },
  {
    icon: Mail,
    title: "Email us",
    lines: [COMPANY.email],
  },
  {
    icon: MapPin,
    title: "Registered office",
    lines: [COMPANY.address.street, `${COMPANY.address.city}, ${COMPANY.address.region} ${COMPANY.address.postal}`],
  },
  {
    icon: Clock,
    title: "Working hours",
    lines: [
      `Customer care: ${COMPANY.hours.customerCare}`,
      `Live shipment support: ${COMPANY.hours.liveSupport}`,
    ],
  },
];

export function ContactClient() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = "Your name is required";
    if (!validateEmail(email)) nextErrors.email = "Enter a valid email address";
    if (phone.trim() && !validatePhone(phone)) nextErrors.phone = "Enter a valid 10-digit mobile number";
    if (!subject.trim()) nextErrors.subject = "Add a short subject line";
    if (message.trim().length < 15)
      nextErrors.message = "Tell us a bit more (at least 15 characters)";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      toast.success("Thanks for reaching out — we'll reply within one business day.");
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    }, 700);
  }

  return (
    <div className="container-page py-12 lg:py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Contact</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Talk to the Rudrian team
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-body">
          Sales, partnerships and delivery issues — support replies within 4 working
          hours, sales enquiries within one business day.
        </p>
      </Reveal>

      <StaggerGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {contactCards.map((card) => (
          <StaggerItem key={card.title}>
            <Card hover className="h-full p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand">
                <card.icon className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
              </span>
              <h2 className="mt-4 text-sm font-bold text-ink">{card.title}</h2>
              <ul className="mt-2 space-y-1">
                {card.lines.map((line) => (
                  <li key={line} className="text-sm text-body">
                    {card.href && line === card.lines[0] ? (
                      <a
                        href={card.href}
                        aria-label={card.hrefLabel}
                        className="font-semibold text-brand transition-colors hover:text-brand-dark"
                      >
                        {line}
                      </a>
                    ) : (
                      line
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        <Card className="p-6 sm:p-8 lg:col-span-3">
          <h2 className="text-lg font-bold text-ink">Send us a message</h2>
          <p className="mt-1.5 text-sm text-body">
            For delivery issues, include your AWB number so we can pull up the scan history
            immediately.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Your name"
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                error={errors.name}
              />
              <Input
                label="Work email"
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={errors.email}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Phone (optional)"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                error={errors.phone}
              />
              <Input
                label="Subject"
                required
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                error={errors.subject}
                placeholder="e.g. Bulk shipping for our D2C brand"
              />
            </div>
            <Textarea
              label="Message"
              required
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              error={errors.message}
              placeholder="Share your monthly volume, destinations and any context we should know."
            />
            <Button type="submit" loading={submitting} size="lg">
              <Send className="h-4 w-4" aria-hidden="true" />
              Send message
            </Button>
          </form>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden p-0">
            <div className="relative h-64 bg-[linear-gradient(180deg,#F8FAFF_0%,#E9EFFB_100%)]">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#D7E0F0_1px,transparent_0)] [background-size:20px_20px]"
              />
              <svg
                viewBox="0 0 320 256"
                aria-hidden="true"
                className="absolute inset-0 h-full w-full"
                fill="none"
              >
                <path
                  d="M40 200 C 90 160, 120 190, 160 128 C 200 66, 240 96, 288 56"
                  stroke="#12B2AA"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.5"
                  className="map-route"
                />
                <circle cx="160" cy="128" r="10" fill="#12B2AA" />
                <circle cx="160" cy="128" r="22" fill="#12B2AA" opacity="0.16" className="map-node-ring" />
                <circle cx="160" cy="128" r="36" fill="#12B2AA" opacity="0.08" />
              </svg>
              <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-card/95 p-3.5 shadow-card backdrop-blur">
                <p className="text-xs font-bold text-ink">Rudrian registered office</p>
                <p className="mt-0.5 text-xs leading-relaxed text-body">
                  {COMPANY.address.city}, {COMPANY.address.region} {COMPANY.address.postal}
                  <br />
                  India
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs leading-relaxed text-muted">
                Visiting without an appointment? Front-desk hours are {COMPANY.hours.frontDesk}.
                Parcel drop-offs are not accepted at the office.
              </p>
            </div>
          </Card>

          <Card className="bg-brand-50/60 p-6">
            <h3 className="text-sm font-bold text-ink">Need tracking help instead?</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-body">
              Most delivery questions are answered instantly on the tracking page or our
              support centre.
            </p>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <Link href="/track" className="btn btn-primary btn-sm">
                Track a shipment
              </Link>
              <Link href="/support" className="btn btn-secondary btn-sm">
                Raise a ticket
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
