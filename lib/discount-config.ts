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
// ("all") or scoped to this package. Ties broken by highest rupees-off.
export function pickActiveDiscount(
  discounts: Discount[],
  sessionDate: string,
  packageType: PackageType,
  base: number
): Discount | null {
  const eligible = discounts.filter(
    (d) =>
      d.active &&
      (d.appliesTo === "all" || d.appliesTo === packageType) &&
      d.startsOn <= sessionDate &&
      d.endsOn >= sessionDate
  );
  if (eligible.length === 0) return null;

  return eligible.reduce((best, d) =>
    discountAmount(base, d) > discountAmount(base, best) ? d : best
  );
}

export function formatDiscountBadge(discount: Discount): string {
  if (discount.type === "percent") return `${discount.value}% off`;
  return `₹${discount.value.toLocaleString("en-IN")} off`;
}
