import { NavLink } from "react-router-dom";
import {
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  Gauge,
  LayoutGrid,
  MapPin,
  Package,
  Tags,
  Ticket,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import favicon from "../../../assets/favicon.jpeg";
import type { AuthUser } from "../../api/types";
import { canSee } from "../../lib/rbac";

type NavItem = { to: string; label: string; icon: typeof Package; section: string };
type NavGroup = { title: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: Gauge, section: "dashboard" }],
  },
  {
    title: "Operations",
    items: [
      { to: "/shipments", label: "Shipments", icon: Package, section: "shipments" },
      { to: "/manifests", label: "Manifests", icon: Boxes, section: "manifests" },
      { to: "/riders", label: "Riders", icon: Truck, section: "riders" },
      { to: "/pos", label: "Counter / POS", icon: Wallet, section: "pos" },
      { to: "/ndr", label: "NDR", icon: LayoutGrid, section: "ndr" },
      { to: "/tickets", label: "Tickets", icon: Ticket, section: "tickets" },
    ],
  },
  {
    title: "People",
    items: [
      { to: "/staff", label: "Staff", icon: Users, section: "staff" },
      { to: "/hrms", label: "HRMS", icon: CalendarClock, section: "hrms" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { to: "/rate-cards", label: "Rate cards", icon: Tags, section: "rate-cards" },
      { to: "/locations", label: "Locations", icon: MapPin, section: "locations" },
      { to: "/notifications", label: "Notifications", icon: Bell, section: "notifications" },
    ],
  },
];

export function SidebarNav({ user, onNavigate }: { user: AuthUser | null; onNavigate?: () => void }) {
  const role = user?.role;
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {GROUPS.map((group) => {
        const items = group.items.filter((i) => canSee(role, i.section));
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="mb-2 flex items-center gap-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
              {group.title}
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            </p>
            <ul className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-[#12b2aa]/15 to-[#12b2aa]/5 text-[#0b7a75] shadow-[inset_0_0_0_1px_rgba(18,178,170,0.18)]"
                            : "text-body hover:translate-x-0.5 hover:bg-page hover:text-ink"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? (
                            <span
                              aria-hidden="true"
                              className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#12b2aa] to-[#0e8f8a]"
                            />
                          ) : null}
                          <span
                            className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                              isActive
                                ? "bg-white text-[#0e8f8a] shadow-soft"
                                : "text-muted group-hover:bg-white/70 group-hover:text-brand"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {isActive ? (
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#12b2aa]" />
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ user, onClose }: { user: AuthUser | null; onClose?: () => void }) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-line bg-card">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={favicon}
              alt=""
              className="h-9 w-9 rounded-xl shadow-soft ring-1 ring-black/5"
            />
            <div>
              <p className="text-sm font-semibold tracking-tight text-ink">Rudrian</p>
              <p className="text-[10px] tracking-wide text-muted uppercase">Logistics ERP</p>
            </div>
          </div>
          {onClose ? (
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-page lg:hidden" aria-label="Close menu">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      <SidebarNav user={user} onNavigate={onClose} />
      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-page px-3 py-2">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7BC043] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7BC043]" />
          </span>
          <p className="text-[11px] font-medium text-body">All systems operational</p>
        </div>
      </div>
    </aside>
  );
}

export function BrandMark() {
  return <Building2 className="h-4 w-4" />;
}
