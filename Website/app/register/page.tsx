import type { Metadata } from "next";
import { RegisterPage } from "./RegisterPage";

export const metadata: Metadata = {
  title: "Create account",
  description:
    "Create a free Rudrian Logistics Solutions account to book courier pickups, track parcels live and collect cash on delivery across India.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: true },
};

export default function RegisterRoute() {
  return <RegisterPage />;
}
