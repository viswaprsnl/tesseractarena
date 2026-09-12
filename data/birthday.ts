// Birthday-party package definitions used by both the /birthday landing page
// and the /birthday/book wizard. Numbers are placeholders for launch — swap
// in real ones once the arena's first parties are running.

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
    price: 5999,
    maxKids: 6,
    durationLabel: "1 hour · 2 rotations",
    slotsBlocked: 2,
    tagline: "The quick fun one — small squad, full-throttle VR.",
    includes: [
      "Up to 6 kids in the arena",
      "1 hour · 2 x 30-min VR rotations",
      "Choice of any Available game",
      "Dedicated party host",
      "Basic table decor at the party bay",
      "All safety gear + waiver assistance",
    ],
  },
  {
    id: "plus",
    name: "Party Plus",
    price: 9999,
    maxKids: 10,
    durationLabel: "90 min · 3 rotations",
    slotsBlocked: 3,
    popular: true,
    tagline: "Our most-booked — decor, dedicated host, room to breathe.",
    includes: [
      "Up to 10 kids in the arena",
      "90 min · 3 VR rotations",
      "Two games from the Available library",
      "Themed party decorations",
      "Private lounge access for cake-cutting",
      "Dedicated event host + photographer moments",
      "Digital highlight clip after the party",
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate Party",
    price: 15999,
    maxKids: 16,
    durationLabel: "2 hours + private lounge",
    slotsBlocked: 3,
    tagline: "The full experience — bigger group, longer play, less to organise.",
    includes: [
      "Up to 16 kids in the arena",
      "2 hours · unlimited game rotations within the window",
      "Any 3 games from the Available library",
      "Premium themed decoration setup",
      "Private lounge for the entire booking",
      "Custom-frosted cake included",
      "Party favors for every kid",
      "Professional photo highlights",
      "Priority cancellation/rebooking window",
    ],
  },
];

export const BIRTHDAY_ADDONS: BirthdayAddon[] = [
  {
    id: "extra-kid",
    label: "Extra kid over cap",
    price: 500,
    unit: "per-kid",
    description: "Bring one more friend beyond the package's max.",
  },
  {
    id: "custom-cake",
    label: "Branded custom cake",
    price: 1499,
    unit: "flat",
    description: "Themed birthday cake baked to order (available on Essentials/Plus).",
  },
  {
    id: "party-favors",
    label: "Party favor bags",
    price: 200,
    unit: "per-kid",
    description: "Take-home goodie bag for each kid.",
  },
];

// Percentage of package price collected as an online advance to hold the
// slot. Rest is settled at the arena on the day of the party.
export const BIRTHDAY_ADVANCE_PERCENT = 20;

export function birthdayAdvance(total: number): number {
  return Math.round((total * BIRTHDAY_ADVANCE_PERCENT) / 100);
}

// Re-exported for backward compatibility with older imports. New code
// should import WHATSAPP_NUMBER from lib/contact.ts directly.
export { WHATSAPP_NUMBER } from "@/lib/contact";
import { WHATSAPP_NUMBER as _WA } from "@/lib/contact";

export function whatsappBirthdayLink(pkg?: BirthdayPackage): string {
  const base = `https://wa.me/${_WA}`;
  const msg = pkg
    ? `Hi! I'd like to book the ${pkg.name} birthday package (₹${pkg.price.toLocaleString(
        "en-IN"
      )}) at Tesseract Arena. Can you help me with dates?`
    : `Hi! I'd like to plan a birthday party at Tesseract Arena. Can you share options?`;
  return `${base}?text=${encodeURIComponent(msg)}`;
}
