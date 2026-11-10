"use client";

import Link from "next/link";
import { Package, ShieldCheck, Truck, Zap } from "lucide-react";
import { Logo } from "@/components/Logo";

const perks = [
  { icon: Zap, text: "Instant quotes and one-tap rebooking" },
  { icon: Package, text: "All your shipments in one dashboard" },
  { icon: Truck, text: "Schedule pickups and print thermal labels" },
  { icon: ShieldCheck, text: "OTP-secured delivery and digital PODs" },
];

export function AuthShell({
  headline,
  subcopy,
  children,
}: {
  headline: string;
  subcopy: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <section className="gradient-pan relative hidden overflow-hidden bg-gradient-to-br from-brand via-[#0E9B95] to-accent px-10 py-16 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_42%),radial-gradient(circle_at_82%_78%,rgba(255,255,255,0.10),transparent_40%)]"
        />
        <Link
          href="/"
          className="relative inline-flex items-center self-start rounded-2xl bg-white px-4 py-3 shadow-lift"
        >
          <Logo className="h-9" />
        </Link>

        <div className="relative max-w-md">
          <p className="text-3xl font-extrabold leading-tight tracking-tight text-white">
            {headline}
          </p>
          <p className="mt-4 text-base leading-relaxed text-white/80">{subcopy}</p>
          <ul className="mt-8 space-y-3.5">
            {perks.map((perk) => (
              <li
                key={perk.text}
                className="flex items-center gap-3 text-sm font-medium text-white/90"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15">
                  <perk.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {perk.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold tracking-wider text-white">
              SLX261031000002
            </span>
            <span className="rounded-full bg-success/90 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
              In transit
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            <span className="h-0.5 flex-1 rounded-full bg-white/40" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <span className="h-0.5 flex-1 rounded-full bg-white/20" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          </div>
          <p className="mt-2.5 text-[11px] text-white/75">
            Whitefield hub → Hyderabad · Out for delivery today by 7 PM
          </p>
        </div>

        <p className="relative text-xs text-white/60">
          Trusted by 12,000+ businesses · 19,000+ pin codes · 98.7% on-time
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8 lg:py-16">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-flex items-center rounded-2xl border border-line bg-card px-4 py-3 shadow-soft lg:hidden"
            aria-label="Rudrian Logistics Solutions home"
          >
            <Logo className="h-9" />
          </Link>
          {children}
        </div>
      </section>
    </div>
  );
}
