import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import logo from "../../assets/logo-trimmed.jpeg";
import { useAuth } from "../store/auth";
import { useToast } from "../components/ui/Toast";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

const STATS = [
  { value: "2M+", label: "Parcels delivered" },
  { value: "19,000+", label: "Pin codes covered" },
  { value: "98.7%", label: "On-time delivery" },
];

const TEAL_INPUT =
  "focus:border-[#12b2aa]! focus:ring-4 focus:ring-[#12b2aa]/15";

export function LoginPage() {
  const user = useAuth((s) => s.user);
  const login = useAuth((s) => s.login);
  const status = useAuth((s) => s.status);
  const toast = useToast();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(identifier.trim(), password);
      toast.success("Welcome back to Rudrian ERP");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="gradient-pan relative hidden overflow-hidden bg-gradient-to-br from-[#07131f] via-[#0b4a46] to-[#07131f] px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.18),transparent)] blob-drift"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 right-[-6%] h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(123,192,67,0.12),transparent)] blob-drift"
          style={{ animationDelay: "-7s" }}
        />

        <div className="rise relative rounded-2xl bg-white p-3 shadow-lift self-start">
          <img src={logo} alt="Rudrian Logistics Solutions" className="h-12 w-auto" />
        </div>

        <div className="relative max-w-md">
          <p
            className="rise text-4xl font-extrabold leading-tight tracking-tight text-white"
            style={{ animationDelay: "100ms" }}
          >
            Logistics — Think Different
          </p>
          <p
            className="rise mt-4 text-sm leading-relaxed text-white/70"
            style={{ animationDelay: "180ms" }}
          >
            One console for shipments, manifests, riders, NDR and COD reconciliation —
            the operations team behind every Rudrian parcel.
          </p>

          {/* Live network visual */}
          <div
            className="rise relative mt-8 h-52 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md"
            style={{ animationDelay: "260ms" }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:22px_22px]"
            />
            <svg viewBox="0 0 420 208" className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
              <path
                d="M50 168 C 130 92, 210 196, 330 56"
                stroke="#2DD4BF"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.6"
                className="map-route"
              />
              <circle cx="50" cy="168" r="6" fill="#2DD4BF" />
              <circle cx="50" cy="168" r="13" fill="#2DD4BF" opacity="0.18" className="map-node-ring" />
              <circle cx="330" cy="56" r="6" fill="#7BC043" />
              <circle
                cx="330"
                cy="56"
                r="13"
                fill="#7BC043"
                opacity="0.18"
                className="map-node-ring"
                style={{ animationDelay: "-1.3s" }}
              />
              <circle cx="180" cy="140" r="7" fill="#5EEAD4" />
              <circle
                cx="180"
                cy="140"
                r="16"
                fill="#5EEAD4"
                opacity="0.2"
                className="map-node-ring"
                style={{ animationDelay: "-0.6s" }}
              />
              <circle r="4.5" fill="#ffffff" stroke="#2DD4BF" strokeWidth="2">
                <animateMotion dur="5s" repeatCount="indefinite" path="M50 168 C 130 92, 210 196, 330 56" />
              </circle>
            </svg>

            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1220]/70 px-3 py-2 shadow-lift backdrop-blur">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#7BC043]" />
              <span className="text-[11px] font-semibold text-white">
                Hub scan · Whitefield
              </span>
              <span className="text-[10px] text-white/50">just now</span>
            </div>
            <div
              className="float-soft absolute bottom-4 right-4 rounded-xl border border-white/10 bg-[#0b1220]/70 px-3 py-2 shadow-lift backdrop-blur"
            >
              <span className="text-[11px] font-semibold text-white">
                Delivered with OTP · 4:42 PM
              </span>
            </div>
          </div>

          {/* Trust stats */}
          <div
            className="rise mt-6 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5 py-4"
            style={{ animationDelay: "360ms" }}
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="px-3 text-center">
                <p className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[11px] text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="rise relative text-xs text-white/45" style={{ animationDelay: "460ms" }}>
          Rudrian Logistics Solutions · Internal console
        </p>
      </section>

      {/* Form panel */}
      <section className="relative flex items-center justify-center bg-page px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="rise mb-6 flex justify-center lg:hidden">
            <div className="rounded-2xl border border-line bg-card p-3 shadow-soft">
              <img src={logo} alt="Rudrian Logistics Solutions" className="h-11 w-auto" />
            </div>
          </div>

          <div
            className="rise rounded-2xl border border-line bg-card p-6 shadow-card sm:p-8"
            style={{ animationDelay: "60ms" }}
          >
            <h1 className="text-xl font-semibold text-ink">Sign in to the console</h1>
            <p className="mt-1 text-sm text-body">
              Use your staff email or phone to access the operations console.
            </p>

            <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
              <Input
                label="Email or phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter email or phone"
                autoComplete="username"
                required
                className={TEAL_INPUT}
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  wrapperClassName="relative"
                  className={`pr-10 ${TEAL_INPUT}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-[26px] grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-page hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <div className="-mt-2 flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#0e8f8a] transition-colors hover:text-[#0b6661] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                className="shine w-full bg-gradient-to-r from-[#12b2aa] to-[#0e8f8a] text-white shadow-[0_12px_26px_-14px_rgba(18,178,170,0.8)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(18,178,170,0.9)]"
                loading={busy || status === "loading"}
                icon={<LockKeyhole className="h-4 w-4" />}
              >
                Sign in
              </Button>
            </form>
          </div>

          <p className="rise mt-6 text-center text-xs text-muted" style={{ animationDelay: "360ms" }}>
            Rudrian Logistics Solutions · Internal console
          </p>
        </div>
      </section>
    </div>
  );
}
