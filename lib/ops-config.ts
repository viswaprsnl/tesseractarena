import { allGames } from "@/data/games";
import type { BookingRow } from "./booking-types";
import type { Pricing } from "./pricing";

// Owner-only business settings, stored under the "ops" key of the Settings
// sheet and never served to the public site (unlike Pricing). Client-safe.
export interface Ops {
  food: Record<FoodId, number>; // per person, ex-GST
  corporatePerHead: number; // ex-GST, 2 games each
  anvioPercent: number; // % of the list price incl. GST, per player
  heroZonePerPlay: number; // ₹ per player per game
  birthdayAnvioPerKid: number; // ₹ per kid; 0 = use anvioPercent
  reviewLink: string; // Google review link sent with bills
}

export const FOOD_MENU = [
  { id: "combo", label: "Combo: pizza + fries + drink" },
  { id: "pasta", label: "Pasta" },
] as const;
export type FoodId = (typeof FOOD_MENU)[number]["id"];

export const DEFAULT_OPS: Ops = {
  food: { combo: 200, pasta: 300 },
  corporatePerHead: 1599,
  anvioPercent: 10,
  heroZonePerPlay: 110,
  birthdayAnvioPerKid: 0,
  reviewLink: "",
};

export function resolveOps(raw: unknown): Ops {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : d);
  const food = (o.food && typeof o.food === "object" ? o.food : {}) as Record<string, unknown>;
  return {
    food: { combo: num(food.combo, DEFAULT_OPS.food.combo), pasta: num(food.pasta, DEFAULT_OPS.food.pasta) },
    corporatePerHead: num(o.corporatePerHead, DEFAULT_OPS.corporatePerHead),
    anvioPercent: num(o.anvioPercent, DEFAULT_OPS.anvioPercent),
    heroZonePerPlay: num(o.heroZonePerPlay, DEFAULT_OPS.heroZonePerPlay),
    birthdayAnvioPerKid: num(o.birthdayAnvioPerKid, DEFAULT_OPS.birthdayAnvioPerKid),
    reviewLink: typeof o.reviewLink === "string" ? o.reviewLink.trim() : "",
  };
}

// Extra per-booking data that doesn't fit Sheet1's fixed columns. Stored as
// JSON in the Details sheet (see lib/details-sheets.ts).
export type EventKind = "birthday" | "corporate";
export interface CustomItem {
  name: string;
  qty: number;
  price: number; // per unit, ex-GST
  gst: 5 | 18;
}
export interface BookingDetails {
  kind?: EventKind;
  perHead?: number; // play price per kid / person, ex-GST
  company?: string;
  gstin?: string;
  eaters?: number;
  food?: FoodId[];
  custom?: CustomItem[];
  cake?: "byo" | "custom";
  games?: Record<string, number>; // game id → players who played it
  invoiceNo?: string;
  completedAt?: string;
}

// Play and "other" items at 18% GST; food and cake at 5%.
export function eventBill(partySize: number, d: BookingDetails, ops: Ops, pricing: Pricing) {
  const play = partySize * (d.perHead ?? (d.kind === "corporate" ? ops.corporatePerHead : pricing.birthdayPerKid));
  const custom = d.custom ?? [];
  const line = (rate: 5 | 18) => custom.filter((c) => c.gst === rate).reduce((s, c) => s + c.qty * c.price, 0);
  const menu = (d.eaters ?? 0) * (d.food ?? []).reduce((s, id) => s + (ops.food[id] ?? 0), 0);
  const cake = d.kind === "birthday" && d.cake === "custom" ? pricing.birthdayAddons["custom-cake"] ?? 0 : 0;
  const at18 = play + line(18);
  const at5 = menu + cake + line(5);
  const gst18 = Math.round(at18 * 0.18);
  const gst5 = Math.round(at5 * 0.05);
  return { play, menu, cake, at18, at5, gst18, gst5, amount: at18 + at5, gst: gst18 + gst5 };
}

// Platform is fixed per title (₹1,199+ titles are Anvio), so a price change
// in the Pricing tab never moves a game between platforms.
const ANVIO = new Set(allGames.filter((g) => g.pricePerPerson >= 1199).map((g) => g.id));
export const platformOf = (gameId: string) => (ANVIO.has(gameId) ? "Anvio" : "HeroZone");

// What the platform charges us for `players` plays of one game.
export function gameFee(gameId: string, players: number, ops: Ops, pricing: Pricing, birthday = false): number {
  if (platformOf(gameId) === "HeroZone") return players * ops.heroZonePerPlay;
  if (birthday && ops.birthdayAnvioPerKid) return players * ops.birthdayAnvioPerKid;
  return Math.round((players * (pricing.games[gameId] ?? 0) * 1.18 * ops.anvioPercent) / 100);
}

// Food sold is passed through to the food partner, so it isn't ticket revenue.
export const isEvent = (b: Pick<BookingRow, "source">) => b.source === "birthday" || b.source === "corporate";
