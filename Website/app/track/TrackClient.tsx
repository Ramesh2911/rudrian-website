"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock, Search, X } from "lucide-react";
import { TrackSearchBox } from "@/components/TrackSearchBox";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { readRecentAwbs, formatDate } from "@/lib/utils";
import type { RecentAwb } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";

export function TrackClient() {
  const router = useRouter();
  const [recent, setRecent] = useState<RecentAwb[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRecent(readRecentAwbs());
    setReady(true);
  }, []);

  function removeRecent(awb: string) {
    setRecent((prev) => prev.filter((entry) => entry.awb !== awb));
    try {
      window.localStorage.setItem(
        "sl_recent_awbs",
        JSON.stringify(
          recent.filter((entry) => entry.awb !== awb).slice(0, 6),
        ),
      );
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <div className="container-page py-16 lg:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Tracking</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Track your parcel
        </h1>
        <p className="mt-4 text-base leading-relaxed text-body">
          Enter your AWB number — for example SLX261031000002 — to see the live status,
          complete scan history and estimated delivery window of your shipment.
        </p>
      </Reveal>

      <Reveal delay={0.12} className="mx-auto mt-10 max-w-2xl">
        <TrackSearchBox size="lg" autoFocus />
      </Reveal>

      <div className="mx-auto mt-14 max-w-2xl">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold text-ink">
              <Clock className="h-4 w-4 text-brand" aria-hidden="true" />
              Recently tracked
            </h2>
            {recent.length > 0 ? (
              <span className="text-xs font-medium text-muted">
                Saved on this device only
              </span>
            ) : null}
          </div>

          {!ready ? (
            <div className="space-y-3 p-6">
              <div className="skeleton h-14 rounded-xl" />
              <div className="skeleton h-14 rounded-xl" />
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              title="No recent shipments yet"
              description="Parcels you track will show up here for quick access on this device."
              icon={<Search className="h-6 w-6" aria-hidden="true" />}
            />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((entry) => (
                <li key={entry.awb}>
                  <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-page sm:px-6">
                    <button
                      type="button"
                      onClick={() => router.push(`/track/${encodeURIComponent(entry.awb)}`)}
                      className="flex min-h-11 flex-1 items-center gap-3 rounded-lg text-left"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-extrabold text-brand">
                        AWB
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-sm font-bold tracking-wide text-ink">
                          {entry.awb}
                        </span>
                        <span className="block text-xs text-muted">
                          Checked {formatDate(entry.at)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecent(entry.awb)}
                      aria-label={`Remove ${entry.awb} from recent tracked shipments`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-bg hover:text-danger"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-line bg-brand-50/60 p-6 text-center">
        <p className="text-sm font-semibold text-ink">Can&apos;t find your AWB number?</p>
        <p className="mt-1 text-sm text-body">
          It&apos;s printed on your receipt and WhatsApp confirmation. Still stuck? Our
          support team can locate any parcel with your phone number.
        </p>
        <Link href="/support" className="btn btn-secondary mt-4">
          Get tracking help
        </Link>
      </div>
    </div>
  );
}
