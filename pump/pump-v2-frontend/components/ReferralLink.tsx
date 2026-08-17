"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { captureReferral } from "@/constants/venues";
import { getBrandOrigin } from "@/lib/brand";

/**
 * Surfaces the connected wallet's referral link on every page (lives in the
 * global NavBar). Anyone who opens the link lands with `?ref=<wallet>`, which
 * `captureReferral()` persists to localStorage so the 3-deep referral tree pays
 * this wallet on the referred user's trades.
 *
 * Uses the connected wallet (`useWallet().publicKey`) — NOT the logged-in
 * profile address — so the link appears the instant a wallet connects, with no
 * sign-in required (a referral link needs only the wallet, not auth).
 *
 * Deep-links to whatever page you're currently on: the link is built from the
 * live URL (path + existing query params), with `ref` set to your wallet. So
 * sharing from a coin page (root-level /<mintId>) sends people straight to that
 * coin with your ref attached. `usePathname()` recomputes it on client-side nav.
 *
 * Also calls `captureReferral()` on mount so an inbound `?ref=` is captured on
 * ANY page the visitor lands on (not just at trade time).
 */
export function ReferralLink() {
  const { publicKey } = useWallet();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  // Capture an inbound ?ref= on whatever page the visitor lands on.
  useEffect(() => {
    captureReferral();
  }, []);

  const address = publicKey?.toBase58();

  // Build a deep link to the CURRENT page with our ref attached. Recomputes on
  // route change (pathname dep) and reads the live URL for query params.
  const buildLink = useCallback(() => {
    if (!address) return "";
    if (typeof window === "undefined") return `${getBrandOrigin()}/?ref=${address}`;
    const url = new URL(window.location.href);
    url.searchParams.set("ref", address); // replace any inbound ref with ours
    return url.toString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, pathname]);

  if (!publicKey) return null;

  const link = buildLink();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <button
      onClick={copy}
      title={link}
      className={
        "text-sm font-bold " +
        (copied
          ? "text-green-400"
          : "text-yellow-400 hover:underline hover:text-yellow-300")
      }
    >
      {copied ? "[ref link copied!]" : "[refer & earn]"}
    </button>
  );
}
