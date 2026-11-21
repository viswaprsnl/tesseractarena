import { ADVANCE_PER_PERSON } from "./booking-config";
import { isBirthdayPackage, type PackageType } from "./booking-types";
import { allGames, availableGames, type Game } from "@/data/games";
import {
  BIRTHDAY_ADDONS,
  BIRTHDAY_ADVANCE_PERCENT,
  BIRTHDAY_PACKAGES,
  type BirthdayAddon,
  type BirthdayPackage,
} from "@/data/birthday";

// Single source of truth for every customer-facing price. Code holds the
// defaults (data/games.ts, data/birthday.ts, ADVANCE_PER_PERSON); the owner
// overrides any of them from the admin Pricing tab, which stores a partial
// copy of this shape under the "pricing" key of the Settings sheet.
// Every amount is ex-GST rupees. Client-safe — no server imports here.
export interface Pricing {
  games: Record<string, number>; // per-person price by game id
  advancePerPerson: number;
  birthdayPerKid: number;
  birthdayAdvancePercent: number;
  birthdayAddons: Record<string, number>; // add-on price by id
}

export const DEFAULT_PRICING: Pricing = {
  games: Object.fromEntries(allGames.map((g) => [g.id, g.pricePerPerson])),
  advancePerPerson: ADVANCE_PER_PERSON,
  birthdayPerKid: BIRTHDAY_PACKAGES[0].pricePerKid,
  birthdayAdvancePercent: BIRTHDAY_ADVANCE_PERCENT,
  birthdayAddons: Object.fromEntries(BIRTHDAY_ADDONS.map((a) => [a.id, a.price])),
};

const isPrice = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

function pickPrices(defaults: Record<string, number>, raw: unknown) {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(defaults).map(([id, d]) => [id, isPrice(src[id]) ? src[id] : d])
  );
}

// Merge stored overrides onto the defaults. Unknown keys and bad values
// are ignored, so a hand-edited sheet cell can never break checkout.
export function resolvePricing(raw: unknown): Pricing {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Pricing, unknown>>;
  const num = (v: unknown, d: number) => (isPrice(v) ? v : d);
  return {
    games: pickPrices(DEFAULT_PRICING.games, o.games),
    advancePerPerson: num(o.advancePerPerson, DEFAULT_PRICING.advancePerPerson),
    birthdayPerKid: num(o.birthdayPerKid, DEFAULT_PRICING.birthdayPerKid),
    birthdayAdvancePercent: Math.min(100, num(o.birthdayAdvancePercent, DEFAULT_PRICING.birthdayAdvancePercent)),
    birthdayAddons: pickPrices(DEFAULT_PRICING.birthdayAddons, o.birthdayAddons),
  };
}

export function gamePrice(p: Pricing, gameId: string): number {
  return p.games[gameId] ?? 0;
}

// "Decide at venue" holds the slot at the priciest bookable game.
export function maxGamePrice(p: Pricing): number {
  return Math.max(...availableGames.map((g) => gamePrice(p, g.id)));
}

export function withGamePrices(games: Game[], p: Pricing): Game[] {
  return games.map((g) => ({ ...g, pricePerPerson: gamePrice(p, g.id) }));
}

export function sessionAdvance(p: Pricing, partySize: number, total: number): number {
  return Math.min(p.advancePerPerson * partySize, total);
}

export function birthdayAdvanceOf(p: Pricing, total: number): number {
  return Math.round((total * p.birthdayAdvancePercent) / 100);
}

// Ex-GST amount charged online to hold a booking.
export function advanceDue(
  p: Pricing,
  b: { package: PackageType; partySize: number; amount: number }
): number {
  return isBirthdayPackage(b.package)
    ? birthdayAdvanceOf(p, b.amount)
    : sessionAdvance(p, b.partySize, b.amount);
}

export function birthdayCatalog(p: Pricing): { pkg: BirthdayPackage; addons: BirthdayAddon[] } {
  return {
    pkg: { ...BIRTHDAY_PACKAGES[0], pricePerKid: p.birthdayPerKid },
    addons: BIRTHDAY_ADDONS.map((a) => ({ ...a, price: p.birthdayAddons[a.id] ?? a.price })),
  };
}
