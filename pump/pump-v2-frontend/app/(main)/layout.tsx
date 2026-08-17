import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import NavBar from "@/components/NavBar";
import { Toaster } from "@/components/ui/toaster";
import { brandFromHost } from "@/lib/brand";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  return {
    title: brandFromHost(host),
    description:
      "Launch a coin that is instantly tradeable without having to seed liquidity.",
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-primary`}>
        <NavBar>{children}</NavBar>
        <Toaster />
      </body>
    </html>
  );
}
