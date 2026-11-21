"use client";

import { useEffect, useMemo, useState } from "react";
import type { PackageType } from "@/lib/booking-types";
import {
  applyDiscount,
  pickActiveDiscount,
  formatDiscountBadge,
  type Discount,
} from "@/lib/discount-config";
import type { ActiveDiscount } from "@/hooks/use-booking";

// Discount + coupon state for the booking page. Combines the public
// auto-apply campaigns (/api/discounts) with an optionally redeemed
// coupon (/api/discounts/validate) and picks whichever saves the most.
// The server re-validates everything independently on POST — this is
// purely so the customer sees the right price before paying.
export function useDiscount({
  sessionDate,
  packageType,
  baseTotal,
}: {
  sessionDate: string | null;
  packageType: PackageType;
  baseTotal: number;
}) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<Discount | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Auto-apply campaigns, fetched once per session date.
  useEffect(() => {
    if (!sessionDate) return;
    let cancelled = false;
    fetch(`/api/discounts?date=${sessionDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.discounts) setDiscounts(data.discounts);
      })
      .catch(() => {
        // Silently fall back to no-discount pricing.
      });
    return () => {
      cancelled = true;
    };
  }, [sessionDate]);

  // A coupon can be scoped to a date window or a package. Rather than
  // dropping it when the date changes, treat it as inactive (with a
  // reason) — if the customer switches back, it applies again.
  const couponInvalidReason =
    couponApplied && sessionDate
      ? couponApplied.appliesTo !== "all" && couponApplied.appliesTo !== packageType
        ? `Coupon ${couponApplied.code} only applies to the ${couponApplied.appliesTo} package.`
        : couponApplied.startsOn > sessionDate || couponApplied.endsOn < sessionDate
        ? `Coupon ${couponApplied.code} isn't valid for the selected date.`
        : null
      : null;
  const liveCoupon = couponInvalidReason ? null : couponApplied;

  const mergedDiscounts = useMemo(
    () => (liveCoupon ? [...discounts, liveCoupon] : discounts),
    [discounts, liveCoupon]
  );

  const best =
    sessionDate && baseTotal > 0
      ? pickActiveDiscount(
          mergedDiscounts,
          sessionDate,
          packageType,
          baseTotal,
          liveCoupon?.code
        )
      : null;
  const amount = best ? applyDiscount(baseTotal, best) : baseTotal;
  const savings = baseTotal - amount;

  const activeDiscount: ActiveDiscount | null =
    best && savings > 0
      ? {
          id: best.id,
          label: best.label,
          type: best.type,
          value: best.value,
          badge: formatDiscountBadge(best),
          amountOff: savings,
        }
      : null;

  // Only report the coupon to the server when it actually beat every
  // auto-apply campaign.
  const couponWon = !!(best && liveCoupon && best.id === liveCoupon.id);
  const couponCode = couponWon && liveCoupon ? liveCoupon.code || null : null;

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code || !sessionDate) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, date: sessionDate, package: packageType }),
      });
      const data = await res.json();
      if (!res.ok || !data.discount) {
        setCouponApplied(null);
        setCouponError(data.error || "Coupon isn't valid");
      } else {
        setCouponApplied(data.discount as Discount);
        setCouponInput("");
      }
    } catch {
      setCouponError("Something went wrong. Try again.");
    }
    setCouponBusy(false);
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponInput("");
    setCouponError(null);
  };

  return {
    amount,
    savings,
    activeDiscount,
    couponCode,
    coupon: {
      input: couponInput,
      setInput: (v: string) => {
        setCouponInput(v);
        if (couponError) setCouponError(null);
      },
      applied: liveCoupon,
      won: couponWon,
      busy: couponBusy,
      error: couponError ?? couponInvalidReason,
      apply: applyCoupon,
      remove: removeCoupon,
    },
  };
}

export type CouponControls = ReturnType<typeof useDiscount>["coupon"];
