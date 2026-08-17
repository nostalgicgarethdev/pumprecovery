"use client";

import { useEffect } from "react";
import { DEFAULT_REFERRER } from "@/constants/venues";

/**
 * Self-registers this deploy with the shared backend's mirror index (powers
 * stacc.show). Fire-and-forget, once per session — the browser attaches the
 * Origin header, so the backend learns this mirror's domain, and we report the
 * mirror's configured top-level referrer so stacc.show can attribute earnings.
 */
export function MirrorPing() {
  useEffect(() => {
    try {
      const KEY = "mirror-pinged-v1";
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
      const base = process.env.NEXT_PUBLIC_CLIENT_API_URL;
      if (!base) return;
      fetch(`${base}/mirrors/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultReferrer: DEFAULT_REFERRER.toBase58() }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
