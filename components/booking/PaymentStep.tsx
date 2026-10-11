"use client";

import { useState } from "react";
import Script from "next/script";
import { motion } from "framer-motion";
import { CreditCard, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingState } from "@/hooks/use-booking";
import {
  formatTimeDisplay,
  calculateAdvance,
  getRefundCutoffHours,
  isWeekend,
  withGST,
  gstOn,
  GST_PERCENT,
} from "@/lib/booking-config";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

interface PaymentStepProps {
  state: BookingState;
  onPayOnline: () => Promise<void>;
  onPayAtCenter?: () => Promise<void>;
  // When false (admin toggle in Settings sheet), the ₹500/head advance
  // requirement is lifted — customers can confirm a booking without
  // paying anything up front, and settle the full amount at the arena.
  // The regular flow then shows ONLY the "Pay at Center" option, no
  // Razorpay button, with copy that makes the deferred payment clear.
  // Kiosk flow is unaffected (customer is already at the counter).
  advanceRequired?: boolean;
}

export function PaymentStep({
  state,
  onPayOnline,
  onPayAtCenter,
  advanceRequired = true,
}: PaymentStepProps) {
  const [processing, setProcessing] = useState(false);

  // All the internal amounts are ex-GST. The customer actually pays these
  // × 1.18 — advance now via Razorpay, balance at the counter.
  const advance = calculateAdvance(state.partySize, state.amount);
  const atCenter = state.amount - advance;
  const gstAmount = gstOn(state.amount);
  const totalWithGST = withGST(state.amount);
  const advanceWithGST = withGST(advance);
  const atCenterWithGST = withGST(atCenter);

  const sessionDate = state.selectedDate || "";
  const cutoffHours = sessionDate ? getRefundCutoffHours(sessionDate) : 6;
  const dayLabel = sessionDate && isWeekend(sessionDate) ? "weekend" : "weekday";

  const handlePayOnline = async () => {
    setProcessing(true);
    try {
      await onPayOnline();
    } finally {
      setProcessing(false);
    }
  };

  const handlePayAtCenter = async () => {
    if (!onPayAtCenter) return;
    setProcessing(true);
    try {
      await onPayAtCenter();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      {/* Razorpay checkout script. Needed in both regular and kiosk
          flows now that kiosk offers "Pay Online" as one of two
          options. */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <h3 className="font-heading text-lg font-bold text-center mb-2">
        {state.isKiosk
          ? "How would you like to pay?"
          : advanceRequired
          ? "Reserve Your Slot"
          : "Confirm Your Booking"}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-6">
        {state.isKiosk ? (
          <>
            Total <span className="text-primary font-bold">₹{totalWithGST.toLocaleString("en-IN")}</span> (incl. GST). Pay online now or at the counter.
          </>
        ) : advanceRequired ? (
          <>
            Pay <span className="text-primary font-bold">₹{advanceWithGST.toLocaleString("en-IN")}</span> advance (incl. GST) to confirm
          </>
        ) : (
          <>
            No advance needed. Pay <span className="text-primary font-bold">₹{totalWithGST.toLocaleString("en-IN")}</span> at the arena when you arrive.
          </>
        )}
      </p>

      {/* Booking summary */}
      <div className="glass-card p-4 mb-4 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span>{state.selectedDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Time</span>
          <span>{state.selectedSlot ? formatTimeDisplay(state.selectedSlot) : ""}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Players</span>
          <span>{state.partySize}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Package</span>
          <span className="capitalize">{state.packageType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Game</span>
          <span>{state.personalDetails?.gamePreference}</span>
        </div>
      </div>

      {/* Payment breakdown — ex-GST subtotal + GST line + inc-GST total.
          Online flow adds advance / balance split; kiosk shows just the
          total (counter collects the whole thing). */}
      <div className="glass-card p-4 mb-6 text-sm space-y-2 border-primary/20">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Session subtotal</span>
          <span>₹{state.amount.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>GST @ {GST_PERCENT}%</span>
          <span>+ ₹{gstAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-white/10">
          <span className="text-muted-foreground">Total (incl. GST)</span>
          <span className="font-semibold">₹{totalWithGST.toLocaleString("en-IN")}</span>
        </div>
        {state.isKiosk || !advanceRequired ? (
          /* Kiosk or no-advance mode: no advance/balance split — the
             customer owes the full amount at the counter either way. */
          <div className="flex justify-between font-bold text-primary pt-2 border-t border-white/10">
            <span>Pay at counter</span>
            <span>₹{totalWithGST.toLocaleString("en-IN")}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between font-bold text-primary pt-2 border-t border-white/10">
              <span>Advance now</span>
              <span>₹{advanceWithGST.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance at center</span>
              <span>₹{atCenterWithGST.toLocaleString("en-IN")}</span>
            </div>
          </>
        )}
      </div>

      {state.isKiosk ? (
        /* Kiosk flow: offer both. "Pay Online" opens Razorpay for the
           FULL ticket (no advance split since customer is already at
           the arena); "Pay at Counter" skips the gateway and routes
           direct to pay_at_center. */
        <div className="space-y-3">
          <Button
            onClick={handlePayOnline}
            disabled={processing}
            className="w-full h-auto py-4 bg-primary hover:bg-primary/90 text-primary-foreground glow-violet"
          >
            {processing ? (
              <Loader2 className="animate-spin mr-2" size={18} />
            ) : (
              <CreditCard className="mr-2" size={18} />
            )}
            <div className="text-left">
              <div className="font-semibold">
                Pay ₹{totalWithGST.toLocaleString("en-IN")} Online Now
              </div>
              <div className="text-xs opacity-80">UPI, Cards, Net Banking · Instant receipt</div>
            </div>
          </Button>
          <Button
            onClick={handlePayAtCenter}
            disabled={processing || !onPayAtCenter}
            className="w-full h-auto py-4 bg-secondary/80 hover:bg-secondary text-foreground border border-white/10"
          >
            {processing ? (
              <Loader2 className="animate-spin mr-2" size={18} />
            ) : null}
            <div className="text-left">
              <div className="font-semibold">Pay at Counter</div>
              <div className="text-xs opacity-80">
                Confirm now, hand over ₹{totalWithGST.toLocaleString("en-IN")} at the till
              </div>
            </div>
          </Button>
        </div>
      ) : advanceRequired ? (
        /* Regular flow with advance required — single big Razorpay
           button for the advance. */
        <Button
          onClick={handlePayOnline}
          disabled={processing}
          className="w-full h-auto py-4 bg-primary hover:bg-primary/90 text-primary-foreground glow-violet"
        >
          {processing ? (
            <Loader2 className="animate-spin mr-2" size={18} />
          ) : (
            <CreditCard className="mr-2" size={18} />
          )}
          <div className="text-left">
            <div className="font-semibold">Pay ₹{advanceWithGST.toLocaleString("en-IN")} Advance Online</div>
            <div className="text-xs opacity-80">Incl. GST · UPI, Cards, Net Banking · Balance at center</div>
          </div>
        </Button>
      ) : (
        /* No-advance experiment — route straight to pay_at_center.
           onPayAtCenter is always wired by the booking wizard when
           the toggle is off; the ?? fallback to onPayOnline is a
           belt-and-braces guard so a wizard that forgot to pass the
           prop still gets to a working submit path. */
        <Button
          onClick={onPayAtCenter ? handlePayAtCenter : handlePayOnline}
          disabled={processing}
          className="w-full h-auto py-4 bg-primary hover:bg-primary/90 text-primary-foreground glow-violet"
        >
          {processing ? (
            <Loader2 className="animate-spin mr-2" size={18} />
          ) : null}
          <div className="text-left">
            <div className="font-semibold">
              Confirm booking · pay ₹{totalWithGST.toLocaleString("en-IN")} at arena
            </div>
            <div className="text-xs opacity-80">
              No advance now · UPI / cash / card accepted at the counter
            </div>
          </div>
        </Button>
      )}

      {/* Cancellation policy — specific to the selected date */}
      <div className="mt-6 p-3 rounded-lg bg-secondary/30 border border-border">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Cancellation policy:</span> Your
          session is on a {dayLabel}, so you get a full refund if you cancel at least{" "}
          <span className="text-foreground">{cutoffHours} hours before</span> your slot.
          Late cancellations and no-shows are non-refundable. Cancel anytime using the
          link in your confirmation email.
        </p>
      </div>

      {/* Razorpay trust badge — only shown when the flow actually
          involves an online payment. With advance OFF and the regular
          flow, no online payment happens here, so the badge would be
          misleading. */}
      {(state.isKiosk || advanceRequired) && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-4">
          <Shield size={12} className="text-primary" />
          Online payments secured by Razorpay
        </p>
      )}
    </motion.div>
  );
}
