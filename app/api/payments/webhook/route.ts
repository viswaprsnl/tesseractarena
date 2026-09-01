import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import {
  findBookingById,
  findBookingByOrderId,
  updateBookingCells,
} from "@/lib/google-sheets";

// Razorpay may retry the same event on non-2xx. Every handler below is
// designed to be idempotent — replaying a "payment.captured" event on an
// already-paid booking is a no-op that still returns 200 so Razorpay stops
// retrying.

interface RazorpayEntity {
  id: string;
  order_id?: string;
  amount?: number;
  status?: string;
  method?: string;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
}

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: { entity?: RazorpayEntity };
    order?: { entity?: RazorpayEntity };
    refund?: { entity?: RazorpayEntity };
  };
}

// Resolve a Razorpay event to our internal booking. Prefers notes.bookingId
// (set on the order at creation), falls back to matching the razorpayOrderId
// column in the sheet.
async function resolveBooking(event: RazorpayWebhookPayload) {
  const payment = event.payload?.payment?.entity;
  const order = event.payload?.order?.entity;

  const notesBookingId =
    payment?.notes?.bookingId || order?.notes?.bookingId;
  if (notesBookingId) {
    const hit = await findBookingById(notesBookingId);
    if (hit) return hit;
  }
  const orderId = payment?.order_id || order?.id;
  if (orderId) {
    return findBookingByOrderId(orderId);
  }
  return null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const hit = await resolveBooking(event);
    // Unknown booking is not a Razorpay problem — 200 so Razorpay stops
    // retrying, log it for our own investigation.
    if (!hit) {
      console.warn(
        "Razorpay webhook — could not map to a booking",
        event.event,
        event.payload?.payment?.entity?.id
      );
      return NextResponse.json({ ok: true, matched: false });
    }

    const payment = event.payload?.payment?.entity;

    switch (event.event) {
      case "payment.captured":
      case "order.paid": {
        // Only flip pending → paid; never overwrite a manual admin state.
        if (hit.booking.paymentStatus === "paid") {
          return NextResponse.json({ ok: true, already: "paid" });
        }
        const updates: Record<string, string> = {
          paymentStatus: "paid",
          status: "confirmed",
        };
        if (payment?.id) updates.razorpayPaymentId = payment.id;
        if (payment?.order_id) updates.razorpayOrderId = payment.order_id;
        await updateBookingCells(hit.rowIndex, updates);
        return NextResponse.json({ ok: true, updated: "paid" });
      }

      case "payment.failed": {
        // Leave the row in pending — customer can retry. We only tag the
        // Razorpay ids so support can trace what happened.
        if (payment?.id || payment?.order_id) {
          const updates: Record<string, string> = {};
          if (payment?.id) updates.razorpayPaymentId = payment.id;
          if (payment?.order_id) updates.razorpayOrderId = payment.order_id;
          await updateBookingCells(hit.rowIndex, updates);
        }
        return NextResponse.json({ ok: true, noted: "failed" });
      }

      case "refund.processed":
      case "refund.created": {
        if (hit.booking.status === "cancelled") {
          return NextResponse.json({ ok: true, already: "cancelled" });
        }
        await updateBookingCells(hit.rowIndex, {
          status: "cancelled",
          paymentStatus: "refunded",
        });
        return NextResponse.json({ ok: true, updated: "refunded" });
      }

      default:
        // Any other event type (payment.authorized, etc.) — acknowledge
        // and move on. Add specific handling when a business case comes up.
        return NextResponse.json({ ok: true, event: event.event });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Razorpay webhook handler error:", message);
    // Return 500 so Razorpay retries — transient sheet-write failure should
    // not silently drop a payment update.
    return NextResponse.json(
      { error: "Handler failed", details: message },
      { status: 500 }
    );
  }
}
