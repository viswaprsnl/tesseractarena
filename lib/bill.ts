import crypto from "crypto";
import type { BookingRow } from "./booking-types";
import type { Ops } from "./ops-config";

// Bills are shared as an unguessable link: /bill/<id>?t=<hmac>. Rendered
// on request from the booking, so nothing is stored. Signed with BILL_SECRET,
// or the existing Razorpay secret so no new setting is needed.
const secret = () => process.env.BILL_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
const sign = (bookingId: string) =>
  crypto.createHmac("sha256", `bill:${secret()}`).update(bookingId).digest("hex").slice(0, 24);

export function billUrl(origin: string, bookingId: string): string | null {
  return secret() ? `${origin}/bill/${bookingId}?t=${sign(bookingId)}` : null;
}

export function verifyBill(bookingId: string, token: string): boolean {
  if (!secret() || token.length !== 24) return false;
  return crypto.timingSafeEqual(Buffer.from(sign(bookingId)), Buffer.from(token));
}

export function billMessage(b: BookingRow, url: string, ops: Ops): string {
  return [
    `Hi ${b.name.split(" ")[0]}, thanks for playing at Tesseract Arena! 🎮`,
    `Your bill for ${b.bookingId}: ${url}`,
    ops.reviewLink && `\nHad fun? A 30-second Google review helps us a lot:\n${ops.reviewLink}`,
    "\nSee you again soon!",
  ]
    .filter(Boolean)
    .join("\n");
}
