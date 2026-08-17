import type { Metadata } from "next";
import { REGISTRY_BRAND } from "@/lib/mirrors";
import "./globals.css";

export const metadata: Metadata = {
  title: `${REGISTRY_BRAND} — the stacc/jare show`,
  description:
    "You came for the show. It plays across a few mirrors — this is where to find a live one. Trust them like Piratebay mirrors.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
