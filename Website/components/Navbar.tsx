"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { clearSession, getStoredUser } from "@/lib/api";
import type { AuthUser } from "@/lib/types";
import { cx } from "@/lib/utils";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/track", label: "Track" },
  { href: "/book", label: "Book a shipment" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function handleSignOut() {
    clearSession();
    setUser(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className={cx(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-line bg-card/80 shadow-soft backdrop-blur-xl"
          : "border-b border-transparent bg-page/60 backdrop-blur-md",
      )}
    >
      <nav aria-label="Primary" className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="Rudrian Logistics Solutions home">
          <Logo priority />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "relative rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
                    active ? "text-brand" : "text-body hover:bg-page hover:text-ink",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-lg bg-brand-50"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="relative">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <span className="max-w-[160px] truncate text-sm font-semibold text-ink">
                Hi, {user.name.split(" ")[0]}
              </span>
              <button type="button" onClick={handleSignOut} className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
          )}
          <Link href="/book" className="btn btn-primary btn-sm shine">
            Book a shipment
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-card text-ink transition-colors hover:border-brand/40 hover:text-brand lg:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </nav>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-card lg:hidden"
          >
            <ul className="container-page flex flex-col gap-1 py-4">
              {navLinks.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "block rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors",
                        active ? "bg-brand-50 text-brand" : "text-ink hover:bg-page",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="container-page flex flex-col gap-2 pb-5">
              {user ? (
                <button type="button" onClick={handleSignOut} className="btn btn-secondary w-full">
                  Sign out ({user.name})
                </button>
              ) : (
                <Link href="/login" className="btn btn-secondary w-full">
                  Sign in
                </Link>
              )}
              <Link href="/book" className="btn btn-primary w-full">
                Book a shipment
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
