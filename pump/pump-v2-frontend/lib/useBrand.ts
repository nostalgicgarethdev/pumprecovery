"use client";

import { useEffect, useState } from "react";
import { FALLBACK_BRAND, envBrand, cleanHost } from "./brand";

/**
 * Client hook for the display brand. SSR-safe initial value (env or fallback,
 * matching the server render to avoid hydration mismatch), then upgrades to the
 * live URL-bar hostname after mount when no explicit NEXT_PUBLIC_BRAND is set.
 */
export function useBrand(): string {
  const [brand, setBrand] = useState<string>(() => envBrand() || FALLBACK_BRAND);
  useEffect(() => {
    if (envBrand()) return; // explicit override wins
    const h = cleanHost(window.location?.hostname);
    if (h) setBrand(h);
  }, []);
  return brand;
}
