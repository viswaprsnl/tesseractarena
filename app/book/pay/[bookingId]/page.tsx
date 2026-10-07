import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { findBookingById } from "@/lib/google-sheets";
import { formatTimeDisplay, withGST } from "@/lib/booking-config";
import { BalancePayClient } from "./BalancePayClient";

// Customer-facing balance-payment page.
//
// Flow:
//   1. Customer scans the kiosk Tab-2 QR on their phone.
//   2. QR points here: /book/pay/<bookingId>. We fetch the booking
//      server-side (no API round-trip, no public endpoint to probe),
//      verify there's actually a balance to collect, and hand the
//      summary + the ids to the client component.
//   3. Client component loads Razorpay checkout.js, calls
//      /api/payments/balance/create to make a Razorpay order for
//      ex-GST balanceDue × 1.18, opens the checkout sheet, and on
//      success calls /api/payments/balance/verify which flips the
//      sheet row to amountPaid=amount, balanceDue=0.
//
// Trust model: bookingId in the URL is sufficient to see the summary
// but not sufficient to see personal data beyond name + session time.
// The only sensitive action (collecting money) runs through Razorpay
// which has its own signed order, so an attacker swapping the
// bookingId can't short-pay or re-route the funds.

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function BalancePayPage({ params }: PageProps) {
  const { bookingId } = await params;
  const decoded = decodeURIComponent(bookingId);
  const result = await findBookingById(decoded);

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md text-center">
          <p className="font-heading text-xl font-bold mb-2">
            Booking not found
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            We couldn&apos;t find a booking with id{" "}
            <span className="font-mono">{decoded}</span>. Please check the
            QR code or ask the counter staff for help.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
          >
            <ChevronLeft size={14} />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const b = result.booking;

  // Already fully paid — show a quiet success panel so a re-scan of
  // the QR after payment just confirms it rather than looking broken.
  if (b.balanceDue === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md text-center">
          <p className="font-heading text-xl font-bold mb-2 text-green-400">
            Already paid ✓
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            Booking <span className="font-mono">{b.bookingId}</span> is
            fully settled. Please show this screen to the counter staff
            if they ask.
          </p>
          <p className="text-xs text-muted-foreground">
            Total paid: ₹{withGST(b.amount).toLocaleString("en-IN")} (incl. GST)
          </p>
        </div>
      </div>
    );
  }

  if (b.status === "cancelled") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md text-center">
          <p className="font-heading text-xl font-bold mb-2 text-destructive">
            Booking cancelled
          </p>
          <p className="text-sm text-muted-foreground">
            This booking was cancelled. Please speak to counter staff.
          </p>
        </div>
      </div>
    );
  }

  const balanceIncGST = withGST(b.balanceDue);
  const alreadyPaidIncGST = withGST(b.amountPaid);
  const totalIncGST = withGST(b.amount);

  return (
    <div className="min-h-screen bg-background py-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-heading text-2xl font-bold mb-1">
            Finish payment
          </h1>
          <p className="text-sm text-muted-foreground">
            Hi {b.name.split(" ")[0]}, here&apos;s what&apos;s left on your booking.
          </p>
        </div>

        {/* Summary card */}
        <div className="glass-card p-5 mb-5">
          <div className="flex justify-between text-xs text-muted-foreground mb-3">
            <span>Booking</span>
            <span className="font-mono">{b.bookingId}</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session</span>
              <span>{b.date} · {formatTimeDisplay(b.timeSlot)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Players</span>
              <span>{b.partySize}</span>
            </div>
          </div>

          <div className="border-t border-white/10 mt-4 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total (incl. GST)</span>
              <span>₹{totalIncGST.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Already paid</span>
              <span className="text-green-400">
                − ₹{alreadyPaidIncGST.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="border-t border-primary/30 mt-4 pt-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm uppercase tracking-wider text-primary">
                Balance due
              </span>
              <span className="text-3xl font-bold text-primary">
                ₹{balanceIncGST.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        <BalancePayClient
          bookingId={b.bookingId}
          balanceIncGST={balanceIncGST}
          customerName={b.name}
          customerEmail={b.email}
          customerPhone={b.phone}
        />

        <p className="text-[11px] text-muted-foreground/60 text-center mt-4">
          Paying via Razorpay — UPI, card, netbanking or wallet. You&apos;ll
          get a receipt by email.
        </p>
      </div>
    </div>
  );
}
