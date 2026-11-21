"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PRICING, resolvePricing, type Pricing } from "@/lib/pricing";

// Live prices from the admin Pricing tab. Renders with the code defaults
// first, then swaps in the stored prices; one fetch per page load. The
// server recomputes every amount, so a stale value here can't undercharge.
let request: Promise<Pricing> | null = null;

export function usePricing(): Pricing {
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  useEffect(() => {
    request ??= fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => resolvePricing(d.pricing))
      .catch(() => DEFAULT_PRICING);
    let live = true;
    request.then((p) => live && setPricing(p));
    return () => {
      live = false;
    };
  }, []);
  return pricing;
}
