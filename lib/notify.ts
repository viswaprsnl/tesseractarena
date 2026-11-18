import { formatTimeDisplay } from "@/lib/booking-config";
import type { BookingRow } from "@/lib/booking-types";

// Team alerts for new online bookings. Posts to a Discord channel webhook
// (TEAM_DISCORD_WEBHOOK_URL). The transport is isolated in `send()` so a
// WhatsApp provider can be added later without touching call sites.
//
// Contract:
//   - NEVER throws and never blocks a customer's booking: failures are
//     logged and swallowed, and the request is capped at 4s.
//   - No-ops when the env var is unset (local dev, previews).
//   - Autotest bookings are skipped by callers (they pass isAutotest).

const TIMEOUT_MS = 4000;

export type TeamEvent =
  | "created"      // booking row written (may still be pending payment)
  | "paid"         // Razorpay payment captured
  | "birthday";    // birthday request received

const STYLE: Record<TeamEvent, { emoji: string; title: string; color: number }> = {
  created: { emoji: "🆕", title: "New booking", color: 0x3b82f6 },
  paid: { emoji: "✅", title: "Payment received", color: 0x22c55e },
  birthday: { emoji: "🎂", title: "Birthday request", color: 0xa855f7 },
};

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function statusLine(b: BookingRow): string {
  if (b.paymentStatus === "paid") return "💳 Paid online";
  if (b.paymentMethod === "pay_at_center") return "🏪 Pay at center (confirmed)";
  return "⏳ Awaiting Razorpay payment";
}

async function send(payload: unknown): Promise<void> {
  const url = process.env.TEAM_DISCORD_WEBHOOK_URL;
  if (!url) return;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`webhook responded ${res.status}`);
}

export async function notifyTeam(
  event: TeamEvent,
  b: BookingRow,
  extra?: { isAutotest?: boolean }
): Promise<void> {
  if (extra?.isAutotest) return;
  try {
    const s = STYLE[event];
    const total = b.amount + b.gstAmount;
    await send({
      embeds: [
        {
          title: `${s.emoji} ${s.title} — ${b.bookingId}`,
          color: s.color,
          fields: [
            { name: "Customer", value: `${b.name}\n${b.phone}`, inline: true },
            {
              name: "When",
              value: `${b.date}\n${formatTimeDisplay(b.timeSlot)}`,
              inline: true,
            },
            { name: "Players", value: String(b.partySize), inline: true },
            { name: "Game", value: b.gamePreference || b.package, inline: true },
            { name: "Total (incl. GST)", value: inr(total), inline: true },
            { name: "Status", value: statusLine(b), inline: true },
            ...(b.specialRequests
              ? [{ name: "Notes", value: b.specialRequests.slice(0, 300) }]
              : []),
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } catch (err) {
    console.error(
      "notifyTeam failed:",
      err instanceof Error ? err.message : String(err)
    );
  }
}
