"use client";

import { Suspense, useEffect, useState } from "react";
import {
  LifeBuoy,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Ticket,
  User,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input, Select, Textarea } from "@/components/Input";
import { StatusBadge } from "@/components/Badge";
import { Skeleton } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { ApiError, apiFetch } from "@/lib/api";
import type { Ticket as TicketModel, TicketCategory, TicketResponse } from "@/lib/types";
import { cx, formatDate } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";

const categoryOptions = [
  { value: "DELAY", label: "Delivery delay" },
  { value: "NON_DELIVERY", label: "Non-delivery" },
  { value: "DAMAGED", label: "Parcel damaged" },
  { value: "ADDRESS_CHANGE", label: "Address change" },
  { value: "OTHER", label: "Other" },
];

interface RaiseErrors {
  name?: string;
  phone?: string;
  email?: string;
  subject?: string;
  message?: string;
}

function validatePhone(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ""));
}

function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function slaBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "OPEN":
      return { label: "First response within 4 working hours", className: "text-info" };
    case "IN_PROGRESS":
      return { label: "Resolution in progress · target 24 hours", className: "text-warning" };
    case "RESOLVED":
      return { label: "Resolved · reopen within 7 days if needed", className: "text-success" };
    case "CLOSED":
      return { label: "Closed", className: "text-muted" };
    default:
      return { label: "SLA tracked", className: "text-body" };
  }
}

function roleBadgeClass(role: string): string {
  const normalized = role.toUpperCase();
  if (normalized === "ADMIN" || normalized === "AGENT" || normalized === "SUPPORT") {
    return "bg-brand text-white";
  }
  return "bg-page text-body";
}

function isStaff(role: string): boolean {
  const normalized = role.toUpperCase();
  return normalized === "ADMIN" || normalized === "AGENT" || normalized === "SUPPORT";
}

function SupportInner() {
  const toast = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<TicketCategory>("DELAY");
  const [awbNumber, setAwbNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [raiseErrors, setRaiseErrors] = useState<RaiseErrors>({});
  const [raising, setRaising] = useState(false);
  const [raiseError, setRaiseError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<TicketModel | null>(null);

  // Read ?awb= on the client only — keeps the page statically server-renderable.
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get("awb");
    if (preset) setAwbNumber(preset.toUpperCase());
  }, []);

  const [trackId, setTrackId] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [trackErrors, setTrackErrors] = useState<{ ticketId?: string; phone?: string }>({});
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackedTicket, setTrackedTicket] = useState<TicketModel | null>(null);

  async function handleRaise(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors: RaiseErrors = {};
    if (!name.trim()) nextErrors.name = "Your name is required";
    if (!validatePhone(phone)) nextErrors.phone = "Enter a valid 10-digit mobile number";
    if (email.trim() && !validateEmail(email)) nextErrors.email = "Enter a valid email address";
    if (!subject.trim()) nextErrors.subject = "Add a short subject line";
    if (message.trim().length < 15) nextErrors.message = "Describe the issue in at least 15 characters";
    setRaiseErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setRaising(true);
    setRaiseError(null);
    try {
      const response = await apiFetch<TicketResponse>("/public/tickets", {
        method: "POST",
        body: {
          name: name.trim(),
          phone: phone.replace(/\D/g, ""),
          ...(email.trim() ? { email: email.trim() } : {}),
          category,
          ...(awbNumber.trim() ? { awbNumber: awbNumber.trim().toUpperCase() } : {}),
          subject: subject.trim(),
          message: message.trim(),
        },
        token: null,
      });
      setCreatedTicket(response.ticket);
      toast.success(`Ticket ${response.ticket.ticketNumber} created — we'll reply within 4 working hours.`);
      setSubject("");
      setMessage("");
    } catch (error: unknown) {
      setRaiseError(
        error instanceof ApiError ? error.message : "Unable to create the ticket right now.",
      );
    } finally {
      setRaising(false);
    }
  }

  async function handleTrack(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors: { ticketId?: string; phone?: string } = {};
    if (!trackId.trim()) nextErrors.ticketId = "Ticket ID or number is required";
    if (!validatePhone(trackPhone)) nextErrors.phone = "Enter the 10-digit phone used to raise the ticket";
    setTrackErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setTracking(true);
    setTrackError(null);
    setTrackedTicket(null);
    try {
      const query = new URLSearchParams({ phone: trackPhone.replace(/\D/g, "") });
      const response = await apiFetch<TicketResponse>(
        `/public/tickets/${encodeURIComponent(trackId.trim())}?${query.toString()}`,
        { token: null },
      );
      setTrackedTicket(response.ticket);
    } catch (error: unknown) {
      setTrackError(
        error instanceof ApiError
          ? error.message
          : "Unable to fetch the ticket right now. Please try again.",
      );
    } finally {
      setTracking(false);
    }
  }

  const sla = trackedTicket ? slaBadge(trackedTicket.status) : null;
  const comments = trackedTicket?.comments ?? [];

  return (
    <div className="container-page py-12 lg:py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Support</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          How can we help?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-body">
          Raise a ticket about a delivery and our team will respond within 4 working hours,
          or check the status of an existing ticket with your phone number.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {/* Raise a ticket */}
        <Reveal from="up" delay={0.05}>
        <Card className="h-full p-6 sm:p-8">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-ink">
            <LifeBuoy className="h-5 w-5 text-brand" aria-hidden="true" />
            Raise a ticket
          </h2>
          <p className="mt-1.5 text-sm text-body">
            Tell us what happened — delays, damages and address issues are handled first.
          </p>

          <form onSubmit={handleRaise} className="mt-6 space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Your name"
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                error={raiseErrors.name}
              />
              <Input
                label="Mobile number"
                required
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                error={raiseErrors.phone}
              />
            </div>
            <Input
              label="Email (optional)"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={raiseErrors.email}
              hint="We'll CC you on every update"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                required
                options={categoryOptions}
                value={category}
                onChange={(event) => setCategory(event.target.value as TicketCategory)}
              />
              <Input
                label="AWB number (optional)"
                value={awbNumber}
                onChange={(event) => setAwbNumber(event.target.value.toUpperCase())}
                placeholder="e.g. SLX261031000002"
              />
            </div>
            <Input
              label="Subject"
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              error={raiseErrors.subject}
              placeholder="e.g. Parcel delayed at Hyderabad hub for 3 days"
            />
            <Textarea
              label="Message"
              required
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              error={raiseErrors.message}
              placeholder="Describe the issue, including dates and any tracking milestones you've already seen."
            />

            {raiseError ? (
              <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
                {raiseError}
              </p>
            ) : null}

            <Button type="submit" loading={raising} fullWidth>
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit ticket
            </Button>
          </form>

          {createdTicket ? (
            <div className="mt-6 rounded-xl border border-success/25 bg-success-bg p-4" role="status">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-success">
                <Ticket className="h-4 w-4" aria-hidden="true" />
                Ticket {createdTicket.ticketNumber} created
              </p>
              <p className="mt-1.5 text-sm text-body">
                Save this ticket ID — you can check progress any time using the panel beside.
              </p>
            </div>
          ) : null}
        </Card>
        </Reveal>

        {/* Track a ticket */}
        <Reveal from="up" delay={0.15} className="space-y-6">
          <Card className="p-6 sm:p-8">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-ink">
              <Search className="h-5 w-5 text-brand" aria-hidden="true" />
              Track my ticket
            </h2>
            <p className="mt-1.5 text-sm text-body">
              Enter the ticket ID and the phone number used while raising it.
            </p>

            <form onSubmit={handleTrack} className="mt-6 space-y-4" noValidate>
              <Input
                label="Ticket ID"
                required
                value={trackId}
                onChange={(event) => setTrackId(event.target.value)}
                error={trackErrors.ticketId}
                placeholder="e.g. TKT-2026-00123"
              />
              <Input
                label="Phone number"
                required
                type="tel"
                inputMode="numeric"
                value={trackPhone}
                onChange={(event) => setTrackPhone(event.target.value)}
                error={trackErrors.phone}
              />
              {trackError ? (
                <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
                  {trackError}
                </p>
              ) : null}
              <Button type="submit" variant="secondary" loading={tracking} fullWidth>
                Check status
              </Button>
            </form>
          </Card>

          {trackedTicket ? (
            <Card className="p-6" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold tracking-wide text-ink">
                    {trackedTicket.ticketNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Raised {formatDate(trackedTicket.createdAt)}
                  </p>
                </div>
                <StatusBadge status={trackedTicket.status} />
              </div>

              {trackedTicket.subject ? (
                <p className="mt-4 text-sm font-semibold text-ink">{trackedTicket.subject}</p>
              ) : null}
              {trackedTicket.message ? (
                <p className="mt-1.5 text-sm leading-relaxed text-body">{trackedTicket.message}</p>
              ) : null}
              {trackedTicket.awbNumber ? (
                <p className="mt-2 text-xs text-muted">Related AWB: {trackedTicket.awbNumber}</p>
              ) : null}

              {sla ? (
                <p
                  className={cx(
                    "mt-4 inline-flex items-center gap-1.5 rounded-full bg-page px-3 py-1.5 text-xs font-semibold",
                    sla.className,
                  )}
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {sla.label}
                </p>
              ) : null}

              <h3 className="mt-6 border-t border-line pt-5 text-sm font-bold text-ink">
                Conversation
              </h3>
              {comments.length === 0 ? (
                <p className="mt-3 rounded-xl bg-page px-4 py-6 text-center text-sm text-muted">
                  No replies yet — you&apos;ll get an update as soon as an agent responds.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {comments.map((comment, index) => {
                    const staff = isStaff(comment.role);
                    return (
                      <li
                        key={`${comment.createdAt}-${index}`}
                        className={cx(
                          "rounded-xl border p-4",
                          staff ? "border-brand/25 bg-brand-50/70" : "border-line bg-page",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cx(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                              roleBadgeClass(comment.role),
                            )}
                          >
                            <User className="h-3 w-3" aria-hidden="true" />
                            {comment.role}
                          </span>
                          <span className="text-xs font-semibold text-ink">{comment.author}</span>
                          <span className="ml-auto text-[11px] text-muted">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-body">{comment.message}</p>
                        {comment.visibility && comment.visibility !== "PUBLIC" ? (
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-warning">
                            {comment.visibility.toLowerCase()} note
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          ) : (
            <Card className="flex flex-col items-center px-6 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand">
                <MessageSquare className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-bold text-ink">No ticket loaded</h3>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-body">
                Track a ticket and its status, response timeline and full conversation with
                our support team appear here.
              </p>
            </Card>
          )}
        </Reveal>
      </div>
    </div>
  );
}

export function SupportClient() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-12">
          <div className="mx-auto max-w-2xl text-center">
            <Skeleton className="mx-auto h-4 w-24 rounded-full" />
            <Skeleton className="mx-auto mt-3 h-10 w-64" />
            <Skeleton className="mx-auto mt-3 h-5 w-full max-w-md" />
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
            <Skeleton className="h-[560px] rounded-2xl" />
            <Skeleton className="h-[560px] rounded-2xl" />
          </div>
        </div>
      }
    >
      <SupportInner />
    </Suspense>
  );
}
