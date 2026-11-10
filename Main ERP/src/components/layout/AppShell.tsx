import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p === "/", title: "Dashboard" },
  { match: (p) => p === "/shipments/new", title: "New booking" },
  { match: (p) => p.startsWith("/shipments/"), title: "Shipment detail" },
  { match: (p) => p === "/shipments", title: "Shipments" },
  { match: (p) => p === "/manifests/new", title: "New manifest" },
  { match: (p) => p.startsWith("/manifests/"), title: "Manifest detail" },
  { match: (p) => p === "/manifests", title: "Manifests" },
  { match: (p) => p.startsWith("/riders/"), title: "Rider detail" },
  { match: (p) => p === "/riders", title: "Riders" },
  { match: (p) => p === "/pos", title: "Counter / POS" },
  { match: (p) => p === "/ndr", title: "NDR control" },
  { match: (p) => p.startsWith("/tickets/"), title: "Ticket detail" },
  { match: (p) => p === "/tickets", title: "Tickets" },
  { match: (p) => p === "/staff", title: "Staff" },
  { match: (p) => p === "/hrms", title: "HRMS" },
  { match: (p) => p === "/rate-cards", title: "Rate cards" },
  { match: (p) => p === "/locations", title: "Locations" },
  { match: (p) => p === "/notifications", title: "Notifications" },
  { match: (p) => p === "/profile", title: "My Profile" },
];

function titleFor(pathname: string): string {
  return TITLES.find((t) => t.match(pathname))?.title ?? "Rudrian ERP";
}

export function AppShell() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-page">
      <div className="fixed inset-y-0 left-0 z-50 hidden lg:block">
        <Sidebar user={user} />
      </div>
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0">
            <Sidebar user={user} onClose={() => setDrawer(false)} />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar title={titleFor(location.pathname)} user={user} onMenu={() => setDrawer(true)} onLogout={() => void logout()} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
