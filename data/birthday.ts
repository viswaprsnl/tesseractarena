// Birthday-party package definitions used by both the /birthday landing page
// and the /birthday/book wizard. Prices are market-anchored against
// Enter Totem Bangalore (₹1,099-₹1,600/kid free-roam VR birthday floor),
// Anvio Bengaluru (₹1,399+ adult play), and Dubai/US ceilings (₹4-7k/kid).
// Sits above Smaaash arcade tier, matches Enter Totem free-roam VR floor
// with an Anvio premium justification.

export type BirthdayPackageId = "essentials" | "plus" | "ultimate";

export interface BirthdayAddon {
  id: string;
  label: string;
  price: number;
  unit: "flat" | "per-kid";
  description: string;
}

export interface BirthdayPackage {
  id: BirthdayPackageId;
  name: string;
  price: number;
  maxKids: number;
  durationLabel: string;
  slotsBlocked: number;
  popular?: boolean;
  tagline: string;
  includes: string[];
}

export const BIRTHDAY_PACKAGES: BirthdayPackage[] = [
  {
    id: "essentials",
    name: "Party Essentials",
    price: 10999,
    maxKids: 8,
    durationLabel: "90 min · 2 HeroZone rotations",
    slotsBlocked: 3,
    tagline: "The clean fun one — full 8-player squad, back-to-back VR.",
    includes: [
      "Up to 8 kids in the arena",
      "90 min · 2 × 30-min HeroZone rotations (same title)",
      "Choice of any Available HeroZone game",
      "Dedicated party host",
      "Basic table decor — balloons + banner at the party bay",
      "All safety gear + waiver assistance",
    ],
  },
  {
    id: "plus",
    name: "Party Plus",
    price: 18999,
    maxKids: 12,
    durationLabel: "2 hr · 2 HeroZone + 1 Anvio rotation per kid",
    slotsBlocked: 3,
    popular: true,
    tagline: "Our most-booked — mixed HeroZone + Anvio in a private lounge.",
    includes: [
      "Up to 12 kids across 2 staggered waves",
      "2 hr · each kid gets 2 HeroZone + 1 Anvio 30-min rotation",
      "Two HeroZone titles + one Anvio title from the Available library",
      "Themed party decorations",
      "Private lounge access for cake-cutting",
      "Dedicated event host",
      "Host-shot party photos shared on WhatsApp",
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate Party",
    price: 32999,
    maxKids: 16,
    durationLabel: "3 hr morning buyout · 3 rotations per kid",
    slotsBlocked: 5,
    tagline: "The full experience — full-venue morning buyout, mixed lineup.",
    includes: [
      "Up to 16 kids across 2 staggered waves",
      "3 hr morning buyout (10 AM-1 PM weekends) — no other bookings share the arena",
      "3 rotations per kid across HeroZone + Anvio titles",
      "Any 3 titles from the Available library",
      "Premium themed decoration setup",
      "Private lounge for the entire booking",
      "Dedicated event host",
      "Host-shot party photos shared on WhatsApp",
      "Priority cancellation / rebooking window",
    ],
  },
];

export const BIRTHDAY_ADDONS: BirthdayAddon[] = [
  {
    id: "extra-kid",
    label: "Extra kid over cap",
    price: 1299,
    unit: "per-kid",
    description: "Bring one more friend beyond the package's max. Priced to reflect the incremental rotation slot they take.",
  },
  {
    id: "custom-cake",
    label: "Branded custom cake",
    price: 1999,
    unit: "flat",
    description: "Themed birthday cake baked to order by our bakery partner. BYO cake is welcome too — no extra fee.",
  },
  {
    id: "party-favors",
    label: "Party favor bags",
    price: 250,
    unit: "per-kid",
    description: "Take-home goodie bag for each kid.",
  },
  // Removed: "Professional photographer" add-on — pulled out until the
  // photographer partnership is actually lined up so we don't offer
  // something we can't deliver.
];

// Percentage of package price collected as an online advance to hold the
// slot. Rest is settled at the arena on the day of the party. Raised from
// 20% to 25% to better absorb late-cancellation risk on higher-ticket
// packages.
export const BIRTHDAY_ADVANCE_PERCENT = 25;

export function birthdayAdvance(total: number): number {
  return Math.round((total * BIRTHDAY_ADVANCE_PERCENT) / 100);
}

// ---------------------------------------------------------------------------
// Launch pricing — "Founding families rate"
// ---------------------------------------------------------------------------
// A 15% introductory discount on Essentials + Plus for parties whose date
// falls within the launch window below. Meant to seed the first wave of
// bookings and word-of-mouth before the arena has any local reference
// customers to lean on. Ultimate is intentionally excluded — it's the
// aspirational premium tier and shouldn't be discounted.
//
// Dates are in Asia/Kolkata (see getTodayISTString). Window inclusive on
// both ends. To end the promotion early, set LAUNCH_PRICING_END to a past
// date and the discount silently stops applying everywhere.

export const LAUNCH_PRICING_START = "2026-09-12";
export const LAUNCH_PRICING_END = "2026-11-11";
export const LAUNCH_DISCOUNT_PERCENT = 15;
const LAUNCH_ELIGIBLE_IDS: BirthdayPackageId[] = ["essentials", "plus"];

// A YYYY-MM-DD Asia/Kolkata date is inside the launch window.
export function isLaunchWindow(dateISO: string): boolean {
  return dateISO >= LAUNCH_PRICING_START && dateISO <= LAUNCH_PRICING_END;
}

// Effective price for a package given the party date. When no date is
// picked yet (landing page cards), we fall back to "today" so the launch
// price shows as long as the promo is live.
export function getEffectivePackagePrice(
  pkg: BirthdayPackage,
  partyDateISO: string | null,
  todayISO: string
): { price: number; originalPrice: number; isLaunchPrice: boolean } {
  const dateForCheck = partyDateISO ?? todayISO;
  const eligible = LAUNCH_ELIGIBLE_IDS.includes(pkg.id);
  if (isLaunchWindow(dateForCheck) && eligible) {
    return {
      price: Math.round((pkg.price * (100 - LAUNCH_DISCOUNT_PERCENT)) / 100),
      originalPrice: pkg.price,
      isLaunchPrice: true,
    };
  }
  return { price: pkg.price, originalPrice: pkg.price, isLaunchPrice: false };
}

// Re-exported for backward compatibility with older imports. New code
// should import WHATSAPP_NUMBER from lib/contact.ts directly.
export { WHATSAPP_NUMBER } from "@/lib/contact";
import { WHATSAPP_NUMBER as _WA } from "@/lib/contact";

export function whatsappBirthdayLink(pkg?: BirthdayPackage): string {
  const base = `https://wa.me/${_WA}`;
  const msg = pkg
    ? `Hi! I'd like to book the ${pkg.name} birthday package at Tesseract Arena. Can you help me with dates?`
    : `Hi! I'd like to plan a birthday party at Tesseract Arena. Can you share options?`;
  return `${base}?text=${encodeURIComponent(msg)}`;
}
