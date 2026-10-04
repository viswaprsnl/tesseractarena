"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useBooking } from "@/hooks/use-booking";
import {
  calculatePrice,
  calculateSessionPrice,
  getTodayISTString,
  formatTimeDisplay,
} from "@/lib/booking-config";
import type { PerPersonPackageType } from "@/lib/booking-types";
import { allGames, availableGames } from "@/data/games";
import { DECIDE_AT_VENUE_ID } from "./PackageSelector";
import { StepIndicator } from "./StepIndicator";
import { DatePicker } from "./DatePicker";
import { TimeSlotGrid } from "./TimeSlotGrid";
import { PackageSelector } from "./PackageSelector";
import { PersonalDetailsForm } from "./PersonalDetailsForm";
import { PaymentStep } from "./PaymentStep";
import { BookingSummary } from "./BookingSummary";

export function BookingWizard({
  preselectedGame,
  isKiosk = false,
}: {
  preselectedGame?: string;
  isKiosk?: boolean;
}) {
  const router = useRouter();
  // Seed selectedGame on the first render so step 3 already shows the
  // /games modal's choice ticked when the user arrives. Seed isKiosk so
  // downstream components (PackageSelector pricing display, PaymentStep
  // button) can branch without extra prop drilling.
  const { state, dispatch } = useBooking({
    initialGame: preselectedGame,
    initialKiosk: isKiosk,
  });

  // Kiosk mode: today's date is forced. The customer is at the counter
  // right now — they're booking for today, not next week. We still show
  // step 1 (Date & Time), but with the date pre-selected and locked, so
  // the time-slot pane appears immediately alongside and the customer
  // only has to tap a slot.
  useEffect(() => {
    if (!isKiosk) return;
    const today = getTodayISTString();
    dispatch({ type: "SET_DATE", date: today });
    fetchSlots(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKiosk]);

  // Fetch slots when date is selected
  const fetchSlots = async (date: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const res = await fetch(`/api/bookings/slots?date=${date}`);
      const data = await res.json();
      if (data.slots) {
        dispatch({ type: "SET_SLOTS", slots: data.slots });
      } else {
        dispatch({ type: "SET_ERROR", error: data.error || "Failed to load slots" });
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "Failed to load available slots" });
    }
    dispatch({ type: "SET_LOADING", loading: false });
  };

  // Step 1 is now "Date & Time" — DatePicker and TimeSlotGrid render
  // side by side. Picking a date fetches slots and populates the right
  // pane; picking a slot advances straight to step 3 (Package), skipping
  // the old step 2. state.step=2 is never reached in the new flow but
  // the type union keeps it around for safe GO_TO_STEP calls elsewhere.
  const handleDateSelect = (date: string) => {
    dispatch({ type: "SET_DATE", date });
    fetchSlots(date);
    // No NEXT_STEP here — we stay on step 1 so the time grid appears
    // beside the calendar.
  };

  const handleSlotSelect = (time: string, displayTime: string) => {
    dispatch({ type: "SET_SLOT", slot: time, displayTime });
    dispatch({ type: "GO_TO_STEP", step: 3 });
  };

  // Step 3: Package confirmed (auto-advance via button)
  const handlePackageConfirm = () => {
    // Price is derived from the chosen game — perHead × tier × partySize.
    // Falls back to the legacy per-package pricing if no game is set (only
    // possible on stale state; UI blocks Continue without a game).
    // "Decide at venue" uses the highest ex-GST game price as the ceiling —
    // customer sees the upper-bound; staff adjusts at the counter based on
    // the title they actually play.
    const isDecideAtVenue = state.selectedGame === DECIDE_AT_VENUE_ID;
    const game = allGames.find((g) => g.id === state.selectedGame);
    const perPersonPkg = state.packageType as PerPersonPackageType;
    const priceBasis = isDecideAtVenue
      ? Math.max(...availableGames.map((g) => g.pricePerPerson))
      : game?.pricePerPerson;
    const base = priceBasis
      ? calculateSessionPrice(priceBasis, perPersonPkg, state.partySize)
      : calculatePrice(state.packageType, state.partySize);
    const amount = state.discount ? base - state.discount.amountOff : base;
    dispatch({ type: "SET_AMOUNT", amount });
    dispatch({ type: "NEXT_STEP" });
  };

  // Step 4: Details submitted. gamePreference is not a form field anymore —
  // it comes from state.selectedGame (picked in step 3) and gets injected
  // here so the downstream POST body still carries it.
  const handleDetailsSubmit = (details: {
    name: string;
    email: string;
    phone: string;
    specialRequests?: string;
  }) => {
    dispatch({
      type: "SET_DETAILS",
      details: {
        ...details,
        gamePreference: state.selectedGame || "",
        specialRequests: details.specialRequests || "",
      },
    });
    // Same calc as handlePackageConfirm — "Decide at venue" uses the
    // max-priced Available game as the ceiling.
    const isDecideAtVenueDetail = state.selectedGame === DECIDE_AT_VENUE_ID;
    const game = allGames.find((g) => g.id === state.selectedGame);
    const perPersonPkg = state.packageType as PerPersonPackageType;
    const priceBasis = isDecideAtVenueDetail
      ? Math.max(...availableGames.map((g) => g.pricePerPerson))
      : game?.pricePerPerson;
    const base = priceBasis
      ? calculateSessionPrice(priceBasis, perPersonPkg, state.partySize)
      : calculatePrice(state.packageType, state.partySize);
    const amount = state.discount ? base - state.discount.amountOff : base;
    dispatch({ type: "SET_AMOUNT", amount });
    dispatch({ type: "NEXT_STEP" });
  };

  // Step 5: Pay advance online via Razorpay
  const handlePayOnline = async () => {
    if (!state.personalDetails || !state.selectedDate || !state.selectedSlot) return;

    dispatch({ type: "SET_LOADING", loading: true });
    try {
      // 1. Create booking
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.personalDetails.name,
          email: state.personalDetails.email,
          phone: state.personalDetails.phone,
          date: state.selectedDate,
          timeSlot: state.selectedSlot,
          partySize: state.partySize,
          package: state.packageType,
          gamePreference: state.personalDetails.gamePreference,
          paymentMethod: "razorpay",
          specialRequests: state.personalDetails.specialRequests,
          // Only sent when the customer redeemed a coupon that actually
          // beat the auto-apply pool. Server re-validates independently.
          ...(state.couponCode ? { couponCode: state.couponCode } : {}),
        }),
      });

      const bookingData = await bookingRes.json();
      if (!bookingData.success) {
        dispatch({ type: "SET_ERROR", error: bookingData.error || "Booking failed" });
        dispatch({ type: "SET_LOADING", loading: false });
        return;
      }

      const bookingId = bookingData.booking.bookingId;
      // Total session cost — displayed on the confirmation page. The advance
      // Razorpay actually charges is derived server-side from bookingId, so
      // no amount is sent here to keep the client tamper-proof.
      const amount = bookingData.booking.amount;

      // 2. Create Razorpay order. In kiosk mode we charge the full
      // ticket (customer is already at the counter — the advance /
      // balance split only exists for remote bookings). payFull=true
      // tells both create and verify to use booking.amount instead of
      // calculateAdvance().
      const payRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, payFull: state.isKiosk }),
      });

      const payData = await payRes.json();
      if (!payData.orderId) {
        dispatch({ type: "SET_ERROR", error: "Failed to create payment order" });
        dispatch({ type: "SET_LOADING", loading: false });
        return;
      }

      dispatch({ type: "SET_LOADING", loading: false });

      // 3. Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: payData.amount,
        currency: payData.currency,
        name: "Tesseract Arena",
        description: `VR Session - ${bookingId}`,
        order_id: payData.orderId,
        prefill: payData.prefill,
        theme: { color: "#6C3BFF" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // 4. Verify payment
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                bookingId,
                payFull: state.isKiosk,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              // Advance paid depends on whether this was a full-payment
              // kiosk flow or the regular ₹500/head advance online.
              const advancePaid = state.isKiosk
                ? amount
                : Math.min(500 * state.partySize, amount);
              router.push(`/book/confirmation?id=${bookingId}&amount=${amount}&date=${state.selectedDate}&time=${state.selectedSlotDisplay}&players=${state.partySize}&package=${state.packageType}&payment=paid&advance=${advancePaid}`);
            } else {
              dispatch({ type: "SET_ERROR", error: "Payment verification failed" });
            }
          } catch {
            dispatch({ type: "SET_ERROR", error: "Payment verification failed" });
          }
        },
        modal: {
          ondismiss: () => {
            dispatch({ type: "SET_ERROR", error: "Payment cancelled. Your slot is reserved — you can try again or pay at the center." });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      dispatch({ type: "SET_ERROR", error: "Something went wrong. Please try again." });
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  // Kiosk pay-at-counter flow. No Razorpay round-trip: just create the
  // booking with paymentMethod="pay_at_center" and route the customer
  // to the confirmation screen. The /api/bookings route already fires
  // customer + arena emails on pay-at-center at create time, so this
  // path is final the moment the sheet write returns.
  const handlePayAtCenter = async () => {
    if (!state.personalDetails || !state.selectedDate || !state.selectedSlot) return;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.personalDetails.name,
          email: state.personalDetails.email,
          phone: state.personalDetails.phone,
          date: state.selectedDate,
          timeSlot: state.selectedSlot,
          partySize: state.partySize,
          package: state.packageType,
          gamePreference: state.personalDetails.gamePreference,
          paymentMethod: "pay_at_center",
          specialRequests: state.personalDetails.specialRequests,
          ...(state.couponCode ? { couponCode: state.couponCode } : {}),
        }),
      });
      const bookingData = await bookingRes.json();
      if (!bookingData.success) {
        dispatch({
          type: "SET_ERROR",
          error: bookingData.error || "Could not confirm the booking. Please ask the counter staff.",
        });
        dispatch({ type: "SET_LOADING", loading: false });
        return;
      }
      const bookingId = bookingData.booking.bookingId;
      const amount = bookingData.booking.amount;
      const timeDisplay = state.selectedSlotDisplay || formatTimeDisplay(state.selectedSlot);
      router.push(
        `/book/confirmation?id=${bookingId}&amount=${amount}&date=${state.selectedDate}&time=${encodeURIComponent(timeDisplay)}&players=${state.partySize}&package=${state.packageType}&payment=pay_at_center&advance=0`
      );
    } catch {
      dispatch({ type: "SET_ERROR", error: "Something went wrong. Please try again or ask the counter staff." });
      dispatch({ type: "SET_LOADING", loading: false });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator currentStep={state.step} />

      {/* Back button. In kiosk mode we skip step 1 (date is forced to
          today), so "Back" from step 2 would land on an empty date
          picker. Gate the back button to steps 3+ in kiosk mode. */}
      {state.step > (state.isKiosk ? 2 : 1) && (
        <button
          onClick={() => dispatch({ type: "PREV_STEP" })}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>
      )}

      {/* Error message */}
      {state.error && (
        <div className="glass-card p-4 mb-6 border-destructive/30 text-sm text-destructive text-center">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {(state.step === 1 || state.step === 2) && (
              <div key="date-time" className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
                <div className="lg:col-span-3">
                  <DatePicker
                    selectedDate={state.selectedDate}
                    onSelectDate={handleDateSelect}
                  />
                </div>
                <div className="lg:col-span-2">
                  {state.selectedDate ? (
                    <TimeSlotGrid
                      date={state.selectedDate}
                      slots={state.availableSlots}
                      selectedSlot={state.selectedSlot}
                      isLoading={state.isLoading}
                      onSelectSlot={handleSlotSelect}
                    />
                  ) : (
                    // Empty-state placeholder for the right column so the
                    // layout doesn't collapse before a date is picked.
                    <div className="glass-card p-6 text-center text-sm text-muted-foreground min-h-[220px] flex items-center justify-center">
                      Pick a date on the calendar to see available time slots.
                    </div>
                  )}
                </div>
              </div>
            )}
            {state.step === 3 && (
              <div key="package">
                <PackageSelector
                  partySize={state.partySize}
                  packageType={state.packageType}
                  sessionDate={state.selectedDate}
                  selectedGame={state.selectedGame}
                  onPartySizeChange={(size) =>
                    dispatch({ type: "SET_PARTY_SIZE", size })
                  }
                  onPackageChange={(pkg) =>
                    dispatch({ type: "SET_PACKAGE", pkg })
                  }
                  onGameChange={(gameId) =>
                    dispatch({ type: "SET_GAME", gameId })
                  }
                  onDiscountChange={(discount) =>
                    dispatch({ type: "SET_DISCOUNT", discount })
                  }
                  onCouponChange={(code) =>
                    dispatch({ type: "SET_COUPON_CODE", code })
                  }
                  isKiosk={state.isKiosk}
                />
                <div className="flex flex-col items-center gap-2 mt-6">
                  <button
                    onClick={handlePackageConfirm}
                    disabled={!state.selectedGame}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-2.5 rounded-lg font-medium transition-colors glow-violet disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary"
                  >
                    Continue
                  </button>
                  {!state.selectedGame && (
                    <p className="text-[11px] text-muted-foreground">
                      Pick a game above to see pricing and continue.
                    </p>
                  )}
                </div>
              </div>
            )}
            {state.step === 4 && (
              <PersonalDetailsForm
                key="details"
                onSubmit={handleDetailsSubmit}
                initialValues={
                  state.personalDetails
                    ? {
                        name: state.personalDetails.name,
                        email: state.personalDetails.email,
                        phone: state.personalDetails.phone,
                        specialRequests: state.personalDetails.specialRequests,
                      }
                    : null
                }
              />
            )}
            {state.step === 5 && (
              <PaymentStep
                key="payment"
                state={state}
                onPayOnline={handlePayOnline}
                onPayAtCenter={handlePayAtCenter}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar summary */}
        <div className="hidden lg:block">
          <BookingSummary state={state} />
        </div>
      </div>
    </div>
  );
}
