import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { brandFromHost, originFromHost } from "@/lib/brand";
import "./globals.css";
import { SolanaWalletProvider } from "../providers/WalletProvider";
import { LinkedXProvider } from "@/providers/LinkedXProvider";
import { Analytics } from "@vercel/analytics/react";
import { SocketProvider } from "@/providers/SocketProvider";
import { IpfsPrefixProvider } from "@/providers/IpfsPrefixProvider";
import { PriorityFeeProvider } from "@/providers/PriorityFeeProvider";
import { RpcUrlProvider } from "@/providers/RpcUrlProvider";
import { ProfileProvider } from "@/providers/ProfileProvider";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  // Resolve from the request Host so each mirror's OG/Twitter card shows its own
  // domain (not the canonical fallback). Crawlers fetch the real URL.
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  const brand = brandFromHost(host);
  const origin = originFromHost(host, proto);
  const title = `${brand} — Solana bonding-curve launchpad`;
  const desc = `${brand} is an independent, open on-chain token launchpad on Solana where every trade permanently adds Orca liquidity, rewards referrers, and buys & burns. Not affiliated with or endorsed by any other launchpad.`;

  return {
    metadataBase: new URL(origin),
    title,
    description: desc,
    applicationName: brand,
    icons: { icon: "/logo.png" },
    openGraph: {
      title,
      description: desc,
      url: origin,
      siteName: brand,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <SocketProvider>
        <RpcUrlProvider>
          <SolanaWalletProvider>
            <ProfileProvider>
              <PriorityFeeProvider>
                  <IpfsPrefixProvider>
                    <body className={`${inter.className} bg-primary`} suppressHydrationWarning>
                      {children} <Analytics />
                    </body>
                  </IpfsPrefixProvider>
              </PriorityFeeProvider>
            </ProfileProvider>
          </SolanaWalletProvider>
        </RpcUrlProvider>
      </SocketProvider>
    </html>
  );
}
