import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-page flex flex-1 items-center justify-center py-24">
      <div className="mx-auto max-w-lg text-center">
        <p className="bg-gradient-to-r from-brand to-accent bg-clip-text text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          This page is lost in transit
        </h1>
        <p className="mt-3 text-base leading-relaxed text-body">
          The page you are looking for either moved to a new hub or never existed. If you
          were tracking a parcel, your AWB number is still your best route.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/track" className="btn btn-primary w-full sm:w-auto">
            <Search className="h-4 w-4" aria-hidden="true" />
            Track a shipment
          </Link>
          <Link href="/" className="btn btn-secondary w-full sm:w-auto">
            Back to home
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
