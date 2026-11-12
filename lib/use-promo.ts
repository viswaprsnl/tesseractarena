"use client";

import { useEffect, useState } from "react";

// The site-wide promo currently live in the Discounts sheet, as the
// marketing surfaces (top offer bar, hero price chip) need to see it.
// Single source of truth: /api/discounts, the same endpoint the booking
// flow uses, so pausing or ending a discount row in Admin → Discounts
// hides the banner and hero chip automatically — no code edit, no
// date constants to keep in lockstep.
export interface LivePromo {
  id: string;
  label: string;
  type: "percent" | "flat";
  value: number;
}

// Rupees off `base` — mirrors discountAmount() in lib/discount-config
// (percent rounds DOWN) so the price shown in marketing copy matches
// what checkout actually charges.
export function promoAmountOff(base: number, promo: LivePromo): number {
  if (promo.type === "percent") return Math.floor((base * promo.value) / 100);
  return Math.min(promo.value, base);
}

// Module-level cache so the bar and the chip share ONE fetch per page
// load (each fetch is a Google Sheets read — we're quota-sensitive).
let inflight: Promise<LivePromo | null> | null = null;

function fetchLivePromo(): Promise<LivePromo | null> {
  if (inflight) return inflight;
  const todayIST = new Date()
    .toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
    .slice(0, 10);
  inflight = fetch(`/api/discounts?date=${todayIST}`, { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      const list: Array<LivePromo & { appliesTo: string }> = Array.isArray(
        data?.discounts
      )
        ? data.discounts
        : [];
      // Only site-wide / regular-booking promos belong in marketing
      // surfaces; birthday-only scopes shouldn't light up the home page.
      const eligible = list.filter(
        (d) => d.appliesTo === "all" || d.appliesTo === "standard"
      );
      if (!eligible.length) return null;
      // Best deal by rupees-off on the ₹899 entry price.
      return eligible.reduce((best, d) =>
        promoAmountOff(899, d) > promoAmountOff(899, best) ? d : best
      );
    })
    .catch(() => null);
  return inflight;
}

// Returns null while loading, when nothing is live, or on fetch
// failure — so a marketing surface never advertises a discount it
// can't confirm.
export function useLivePromo(): LivePromo | null {
  const [promo, setPromo] = useState<LivePromo | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchLivePromo().then((p) => {
      if (!cancelled) setPromo(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return promo;
}
