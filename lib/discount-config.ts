import type { PackageType } from "./booking-types";

export type DiscountType = "percent" | "flat";
export type DiscountScope = "all" | PackageType;

export interface Discount {
  id: string;
  label: string;
  type: DiscountType;
  value: number;
  appliesTo: DiscountScope;
  startsOn: string;
  endsOn: string;
  active: boolean;
  // Optional coupon gate. Empty string / undefined means the discount is
  // auto-applied to every eligible booking (site-wide campaign, current
  // behaviour). A non-empty code means the customer must enter this code
  // in the booking flow for the discount to be considered. Stored
  // upper-cased so validation is case-insensitive.
  code?: string;
}

// Normalise a raw coupon input (from admin form or customer entry). We
// upper-case + trim so "hello" and "  HELLO " compare equal. Never
// invent characters — this only normalises whitespace/case.
export function normalizeCode(raw: string | undefined | null): string {
  return (raw || "").trim().toUpperCase();
}

export function hasCoupon(d: Discount): boolean {
  return normalizeCode(d.code) !== "";
}

// Rupees-off equivalent for any discount+base combo. Percent discounts are
// rounded DOWN to whole rupees so the customer never sees fractional paise,
// and never rounds in the customer's favour past what the admin configured.
export function discountAmount(base: number, discount: Discount): number {
  if (discount.type === "percent") {
    return Math.floor((base * discount.value) / 100);
  }
  return Math.min(discount.value, base);
}

export function applyDiscount(base: number, discount: Discount): number {
  return Math.max(0, base - discountAmount(base, discount));
}

// Pick the discount that gives the best price for this package on this date.
// A campaign is eligible when it's active, in-window, and either site-wide
// ("all") or scoped to this package. Coupon-gated discounts (those with a
// `code`) are only eligible when `redeemedCode` matches — otherwise they
// stay hidden so an auto-apply campaign can't be accidentally beaten by an
// un-redeemed coupon. Ties broken by highest rupees-off.
export function pickActiveDiscount(
  discounts: Discount[],
  sessionDate: string,
  packageType: PackageType,
  base: number,
  redeemedCode?: string | null
): Discount | null {
  const enteredCode = normalizeCode(redeemedCode);
  const eligible = discounts.filter((d) => {
    if (!d.active) return false;
    if (d.appliesTo !== "all" && d.appliesTo !== packageType) return false;
    if (d.startsOn > sessionDate || d.endsOn < sessionDate) return false;
    const couponCode = normalizeCode(d.code);
    if (couponCode) {
      // Coupon-gated: only in the pool if the customer entered the code.
      return couponCode === enteredCode;
    }
    // Auto-apply campaign.
    return true;
  });
  if (eligible.length === 0) return null;

  return eligible.reduce((best, d) =>
    discountAmount(base, d) > discountAmount(base, best) ? d : best
  );
}

export function formatDiscountBadge(discount: Discount): string {
  if (discount.type === "percent") return `${discount.value}% off`;
  return `₹${discount.value.toLocaleString("en-IN")} off`;
}
