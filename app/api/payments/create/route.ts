import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/razorpay";
import { findBookingById, updateBookingCells } from "@/lib/google-sheets";
import { calculateAdvance, withGST } from "@/lib/booking-config";
import { isBirthdayPackage } from "@/lib/booking-types";
import { birthdayAdvance } from "@/data/birthday";

// The client sends only the bookingId. The amount to charge is derived
// server-side from the booking row so a tampered client cannot short-pay
// or over-charge. `payFull` opts into charging the whole inc-GST ticket
// instead of just the advance — used by the kiosk / counter flow where
// there's no point splitting across advance + at-center. Client-settable
// because paying MORE isn't a fraud risk (the only direction we need to
// defend against is pay-less, which the server-side advance derivation
// already blocks).
const createPaymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().positive().optional(),
  payFull: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { bookingId, payFull } = parsed.data;

    // Verify booking exists
    const result = await findBookingById(bookingId);
    if (!result) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (result.booking.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "Payment already completed" },
        { status: 400 }
      );
    }

    // Charge either the advance (regular online booking) or the full
    // ticket (kiosk / counter opt-in via payFull). Regular sessions
    // collect ₹500/person (capped at total); birthday packages collect
    // BIRTHDAY_ADVANCE_PERCENT of the flat package total.
    //
    // All chargeBase amounts here are ex-GST — that's what the sheet
    // records so the Anvio royalty and revenue reports stay clean. The
    // customer pays 18% GST on top, which is what Razorpay actually
    // charges via the order.
    const chargeBase = payFull
      ? result.booking.amount
      : isBirthdayPackage(result.booking.package)
      ? birthdayAdvance(result.booking.amount)
      : calculateAdvance(result.booking.partySize, result.booking.amount);
    const chargeWithGST = withGST(chargeBase);

    // Create Razorpay order (customer-facing gross).
    const order = await createOrder(chargeWithGST, bookingId);

    // Update booking with order ID
    await updateBookingCells(result.rowIndex, {
      razorpayOrderId: order.id,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId,
      prefill: {
        name: result.booking.name,
        email: result.booking.email,
        contact: result.booking.phone,
      },
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}
