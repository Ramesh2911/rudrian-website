import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "./components/layout/AppShell";
import { Skeleton } from "./components/ui/Skeleton";
import { useToast } from "./components/ui/Toast";
import { connectErpSocket, disconnectErpSocket } from "./lib/socket";
import { getAccessToken } from "./api/client";
import { useAuth } from "./store/auth";
import { DashboardPage } from "./pages/Dashboard";
import { HrmsPage } from "./pages/Hrms";
import { LocationsPage } from "./pages/Locations";
import { LoginPage } from "./pages/Login";
import { ForgotPasswordPage } from "./pages/ForgotPassword";
import { ManifestDetailPage } from "./pages/ManifestDetail";
import { ManifestsPage } from "./pages/Manifests";
import { NewManifestPage } from "./pages/NewManifest";
import { NewShipmentPage } from "./pages/NewShipment";
import { NdrPage } from "./pages/Ndr";
import { NotificationsPage } from "./pages/Notifications";
import { NotFoundPage } from "./pages/NotFound";
import { PosPage } from "./pages/Pos";
import { ProfilePage } from "./pages/Profile";
import { RateCardsPage } from "./pages/RateCards";
import { RiderDetailPage } from "./pages/RiderDetail";
import { RidersPage } from "./pages/Riders";
import { ShipmentDetailPage } from "./pages/ShipmentDetail";
import { ShipmentsPage } from "./pages/Shipments";
import { StaffPage } from "./pages/Staff";
import { TicketDetailPage } from "./pages/TicketDetail";
import { TicketsPage } from "./pages/Tickets";

function BootGate() {
  const bootstrapped = useAuth((s) => s.bootstrapped);
  const user = useAuth((s) => s.user);
  const bootstrap = useAuth((s) => s.bootstrap);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    const socket = connectErpSocket(token);
    if (!socket) return;
    const onBooking = (payload: { awbNumber?: string; dest?: string }) => {
      toast.info(`New booking ${payload?.awbNumber ?? ""} ${payload?.dest ? `to ${payload.dest}` : ""}`.trim());
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["shipments"] });
    };
    socket.on("booking:new", onBooking);
    return () => {
      socket.off("booking:new", onBooking);
      disconnectErpSocket();
    };
  }, [bootstrapped, user, navigate, queryClient, toast]);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="shipments" element={<ShipmentsPage />} />
        <Route path="shipments/new" element={<NewShipmentPage />} />
        <Route path="shipments/:id" element={<ShipmentDetailPage />} />
        <Route path="manifests" element={<ManifestsPage />} />
        <Route path="manifests/new" element={<NewManifestPage />} />
        <Route path="manifests/:id" element={<ManifestDetailPage />} />
        <Route path="riders" element={<RidersPage />} />
        <Route path="riders/:id" element={<RiderDetailPage />} />
        <Route path="pos" element={<PosPage />} />
        <Route path="ndr" element={<NdrPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="hrms" element={<HrmsPage />} />
        <Route path="rate-cards" element={<RateCardsPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const bootstrapped = useAuth((s) => s.bootstrapped);
  const user = useAuth((s) => s.user);

  return (
    <Routes>
      <Route path="/login" element={bootstrapped && user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/forgot-password"
        element={bootstrapped && user ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />
      <Route path="/*" element={<BootGate />} />
    </Routes>
  );
}
