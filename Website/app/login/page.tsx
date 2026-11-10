import type { Metadata } from "next";
import { LoginPage } from "./LoginPage";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Rudrian account to book shipments, track parcels and manage COD remittances.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginRoute() {
  return <LoginPage />;
}
