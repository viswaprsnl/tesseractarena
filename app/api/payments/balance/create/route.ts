import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/razorpay";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";
import { withGST } from "@/lib/booking-config";

// Create a Razorpay order for the REMAINING balance of a booking that
// already captured an advance. Separate from /api/payments/create so
// the advance flow stays untouched — fewer branches, fewer regressions.
//
// Trust model: client sends only bookingId; the amount is derived
// server-side from the booking row's balanceDue, so a tampered client
// cannot short-pay (sheet still shows the true balance).
//
// Used by:
//   - Customer-facing /book/pay/[bookingId] page they land on after
//     scanning the Tab-2 kiosk QR.

const createBalancePaymentSchema = z.object({
  bookingId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBalancePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { bookingId } = parsed.data;

    const result = await findBookingById(bookingId);
    if (!result) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const b = result.booking;
    // Guard against being asked to charge a balance on a booking that
    // doesn't actually owe anything. The customer page should hide its
    // Pay button in this case too — this is defence in depth.
    if (b.balanceDue <= 0) {
      return NextResponse.json(
        { error: "Nothing to pay", balanceDue: 0 },
        { status: 400 }
      );
    }
    if (b.status === "cancelled") {
      return NextResponse.json(
        { error: "This booking is cancelled" },
        { status: 400 }
      );
    }

    // Balance is stored ex-GST on the sheet (same basis as `amount`),
    // so we gross it up by 18% here — the customer always pays the
    // inc-GST figure at Razorpay, matching the price they saw at
    // booking time.
    const chargeBase = b.balanceDue;
    const chargeWithGST = withGST(chargeBase);

    const order = await createOrder(chargeWithGST, bookingId);

    // Stash the balance order id on the booking row so the webhook
    // can map back cleanly. We overwrite razorpayOrderId here (the
    // original advance order id is historical and already referenced
    // in payment history on Razorpay's side).
    await updateBookingCells(result.rowIndex, {
      razorpayOrderId: order.id,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount, // paise, inc-GST
      currency: order.currency,
      bookingId,
      // So the customer page can show "You owe ₹X" without a second
      // round-trip, and prefill the Razorpay sheet.
      balanceDueExGST: chargeBase,
      balanceDueIncGST: chargeWithGST,
      prefill: {
        name: b.name,
        email: b.email,
        contact: b.phone,
      },
    });
  } catch (error) {
    console.error("Balance payment create failed:", error);
    return NextResponse.json(
      { error: "Failed to create balance order" },
      { status: 500 }
    );
  }
}
