"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useToast } from "@/components/Toast";
import { ApiError, apiFetch, storeSession } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";
import { Reveal } from "@/components/motion/Reveal";

function validatePhone(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ""));
}

function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

interface RegisterErrors {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors: RegisterErrors = {};
    if (!name.trim()) nextErrors.name = "Enter your full name";
    if (!validatePhone(phone)) nextErrors.phone = "Enter a valid 10-digit mobile number";
    if (email.trim() && !validateEmail(email)) nextErrors.email = "Enter a valid email address";
    if (password.length < 8) nextErrors.password = "Password must be at least 8 characters";
    if (confirmPassword !== password) nextErrors.confirmPassword = "Passwords do not match";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const response = await apiFetch<AuthResponse>("/auth/register", {
        method: "POST",
        body: {
          name: name.trim(),
          phone: phone.replace(/\D/g, ""),
          ...(email.trim() ? { email: email.trim() } : {}),
          password,
        },
        token: null,
      });
      storeSession(response.accessToken, response.user);
      toast.success(`Welcome to Rudrian, ${response.user.name.split(" ")[0]}.`);
      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to create your account right now. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      headline="Book your first pickup in under 2 minutes."
      subcopy="Create a free account to book pickups, track parcels live and collect COD with confidence."
    >
      <Reveal from="down" distance={14} duration={0.4}>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-body">
        Free forever for shippers, with no monthly fees.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Input
          label="Full name"
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          placeholder="e.g. Priya Sharma"
        />
        <Input
          label="Mobile number"
          required
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
          error={errors.phone}
          placeholder="10-digit mobile number"
        />
        <Input
          label="Email (optional)"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          hint="Used for invoices and booking confirmations"
        />
        <div className="relative">
          <Input
            label="Password"
            required
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            placeholder="Minimum 8 characters"
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
        <Input
          label="Confirm password"
          required
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
          placeholder="Re-enter your password"
        />

        {formError ? (
          <p
            role="alert"
            className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
          >
            {formError}
          </p>
        ) : null}

        <Button type="submit" loading={submitting} size="lg" fullWidth>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-body">
        Already shipping with us?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        By creating an account you agree to Rudrian&apos;s shipping terms, prohibited
        items policy and privacy practices. Prohibited items include currency, explosives,
        flammable liquids and illegal goods.
      </p>
      </Reveal>
    </AuthShell>
  );
}
