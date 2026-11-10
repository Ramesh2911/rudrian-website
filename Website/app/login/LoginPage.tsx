"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useToast } from "@/components/Toast";
import { ApiError, apiFetch, storeSession } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";
import { Reveal } from "@/components/motion/Reveal";

export function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) nextErrors.identifier = "Enter your email or mobile number";
    if (!password) nextErrors.password = "Enter your password";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const response = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: { identifier: identifier.trim(), password },
        token: null,
      });
      storeSession(response.accessToken, response.user);
      toast.success(`Welcome back, ${response.user.name.split(" ")[0]}.`);
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to sign you in right now. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      headline="Welcome back to Rudrian."
      subcopy="Track parcels, manage bookings and download invoices from one dashboard."
    >
      <Reveal from="down" distance={14} duration={0.4}>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Sign in to your account
      </h1>
      <p className="mt-2 text-sm text-body">
        Use the email or mobile number linked to your Rudrian account.
      </p>

      <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-xs font-medium leading-relaxed text-brand">
        Rider &amp; staff log in via their dedicated apps — this portal is for customers and
        shippers.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Input
          label="Email or mobile number"
          required
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          error={errors.identifier}
          placeholder="you@company.com or 9876543210"
        />
        <div className="relative">
          <Input
            label="Password"
            required
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            placeholder="Enter your password"
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-[31px] grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-page hover:text-ink"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>

        {formError ? (
          <p
            role="alert"
            className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
          >
            {formError}
          </p>
        ) : null}

        <Button type="submit" loading={submitting} size="lg" fullWidth>
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-body">
        New to Rudrian?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-muted">
        Prefer to browse first?{" "}
        <Link href="/track" className="underline-offset-4 hover:text-brand hover:underline">
          Track a shipment
        </Link>{" "}
        without signing in.
      </p>
      </Reveal>
    </AuthShell>
  );
}
