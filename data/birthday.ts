// Birthday-party pricing — flat per-kid model (Option B, 2026-11-05).
//
// Previously three tiers (Essentials/Plus/Ultimate) with fixed group caps
// and bundled extras. The new model is ONE flat per-kid rate with every
// tier-level perk (lounge, themed decor, morning buyout) available as an
// optional add-on. Simpler to quote, respects the "per-kid cost should
// never exceed the equivalent solo gameplay cost (~₹2,098)" rule at every
// group size, and matches the per-game simplification shipped at the same
// time. Legacy package IDs (birthday-essentials/plus/ultimate) are kept
// in the type union (lib/booking-types.ts) so historical sheet rows
// still parse.
//
// Prices are market-anchored against Enter Totem Bangalore (₹1,099-₹1,600/
// kid free-roam VR birthday floor) — the flat ₹1,499/kid sits in that band
// while leaving room for decor + lounge upgrades.

export type BirthdayPackageId = "standard";

export interface BirthdayAddon {
  id: string;
  label: string;
  price: number;
  unit: "flat" | "per-kid";
  description: string;
  // When true, this add-on bumps the slot-block requirement by 1 (so the
  // server reserves the extra consecutive slot needed for the longer
  // format). Currently only the morning-buyout add-on sets this.
  extendsSlots?: boolean;
}

export interface BirthdayPackage {
  id: BirthdayPackageId;
  name: string;
  // Flat per-kid rate, ex-GST. Session total is pricePerKid × guestCount.
  pricePerKid: number;
  minKids: number;
  maxKids: number;
  // Baseline duration — a party books this many consecutive 1-hour slots
  // unless the morning-buyout add-on bumps it.
  baseSlotsBlocked: number;
  durationLabel: string;
  tagline: string;
  includes: string[];
}

// One package, one rate. Everything else is an add-on.
export const BIRTHDAY_PACKAGES: BirthdayPackage[] = [
  {
    id: "standard",
    name: "Birthday Party",
    pricePerKid: 1499,
    minKids: 8,
    maxKids: 24,
    baseSlotsBlocked: 2,
    durationLabel: "2 hr · 1 Anvio + 1 HeroZone per kid",
    tagline:
      "One flat per-kid rate, every perk à la carte. Build the party your kid actually wants.",
    includes: [
      "₹1,499 per kid (ex-GST) — minimum 8, up to 24 across staggered waves",
      "1 Anvio rotation + 1 HeroZone rotation per kid (our host picks age-appropriate titles)",
      "2-hour arena block for the whole party",
      "Dedicated party host for the whole booking",
      "Basic table decor — balloons + banner at the party bay",
      "All safety gear + waiver assistance for every guest",
    ],
  },
];

// Add-on catalogue. Order is the display order on the landing page and
// in the wizard. Trimmed on 2026-11-12 to the two things parents
// actually ask for: a branded cake and food. Decor, lounge, morning
// buyout and favor bags were dropped to keep the party a simple
// flat-rate-plus-two-extras decision.
export const BIRTHDAY_ADDONS: BirthdayAddon[] = [
  {
    id: "food-combo",
    label: "Food combo — pizza + burger + fries + drink",
    price: 300,
    unit: "per-kid",
    description:
      "A full meal for every kid, served at the party bay. Special requests (veg / Jain, allergies, extra items) are accepted and charged accordingly — the team confirms any extra cost with you before the party.",
  },
  {
    id: "custom-cake",
    label: "Branded custom cake",
    price: 1999,
    unit: "flat",
    description:
      "Themed birthday cake baked to order by our bakery partner. BYO cake is welcome too — no extra fee.",
  },
];

// Percentage of total collected as the online advance to hold the slot.
// Rest paid at the arena on the day. Unchanged from the tiered model.
export const BIRTHDAY_ADVANCE_PERCENT = 25;

export function birthdayAdvance(total: number): number {
  return Math.round((total * BIRTHDAY_ADVANCE_PERCENT) / 100);
}

// Compute the slots a booking needs based on the baseline + whether the
// morning-buyout add-on is in the list. Keep this as a pure function so
// both the client and /api/birthday can derive the same answer.
export function birthdayRequiredSlots(
  pkg: BirthdayPackage,
  addonIds: string[]
): number {
  const addonExtends = BIRTHDAY_ADDONS.some(
    (a) => a.extendsSlots && addonIds.includes(a.id)
  );
  // Morning buyout bumps the block to 3 hours (3 slots) from the
  // baseline 2. If baseline is already larger (shouldn't happen with
  // the current single package but future-proof), keep the baseline.
  return addonExtends ? Math.max(pkg.baseSlotsBlocked, 3) : pkg.baseSlotsBlocked;
}

// Re-exported for backward compatibility with older imports. New code
// should import WHATSAPP_NUMBER from lib/contact.ts directly.
export { WHATSAPP_NUMBER } from "@/lib/contact";
import { WHATSAPP_NUMBER as _WA } from "@/lib/contact";

export function whatsappBirthdayLink(pkg?: BirthdayPackage): string {
  const base = `https://wa.me/${_WA}`;
  const msg = pkg
    ? `Hi! I'd like to book a ${pkg.name} at Tesseract Arena. Can you help me with dates?`
    : `Hi! I'd like to plan a birthday party at Tesseract Arena. Can you share options?`;
  return `${base}?text=${encodeURIComponent(msg)}`;
}
