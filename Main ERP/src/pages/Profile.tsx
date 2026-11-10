import { Building2, LogOut, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { useAuth } from "../store/auth";
import { titleCase } from "../lib/format";

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function ProfilePage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  if (!user) return null;

  const rows: { label: string; value: string; icon: typeof Mail }[] = [
    { label: "Email", value: user.email ?? "—", icon: Mail },
    { label: "Phone", value: user.phone ?? "—", icon: Phone },
    { label: "Role", value: titleCase(user.role), icon: ShieldCheck },
    { label: "Location", value: user.location?.name ?? "—", icon: MapPin },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Hero card */}
      <div className="rise gradient-pan overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#0b4a46] via-[#0e6b64] to-[#0b1220] p-6 text-white shadow-lift sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10 text-xl font-extrabold shadow-lift ring-1 ring-white/20 backdrop-blur">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-2xl font-bold tracking-tight">{user.name}</p>
            <p className="mt-0.5 truncate text-sm text-white/70">{user.email ?? user.phone}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-white/20">
                {titleCase(user.role)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7BC043]/15 px-2.5 py-1 text-[11px] font-semibold text-[#C7F09A] ring-1 ring-[#7BC043]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7BC043]" aria-hidden="true" />
                {titleCase(user.status)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="rise rounded-2xl border border-line bg-card shadow-card" style={{ animationDelay: "80ms" }}>
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">Account details</h2>
          <p className="text-xs text-muted">Your profile as stored in the operations console</p>
        </div>
        <dl className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="flex items-center gap-3 bg-card px-6 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#12b2aa]/10 text-[#0e8f8a]">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">{row.label}</dt>
                  <dd className="truncate text-sm font-semibold text-ink">{row.value}</dd>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-3 bg-card px-6 py-4 sm:col-span-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#12b2aa]/10 text-[#0e8f8a]">
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">User ID</dt>
              <dd className="truncate font-mono text-xs text-body">{user.id}</dd>
            </div>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="rise flex flex-wrap gap-3" style={{ animationDelay: "140ms" }}>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-danger/30 bg-danger-bg px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}
