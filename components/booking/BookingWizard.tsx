"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useBooking } from "@/hooks/use-booking";
import { calculatePrice } from "@/lib/booking-config";
import { StepIndicator } from "./StepIndicator";
import { DatePicker } from "./DatePicker";
import { TimeSlotGrid } from "./TimeSlotGrid";
import { PackageSelector } from "./PackageSelector";
import { PersonalDetailsForm } from "./PersonalDetailsForm";
import { PaymentStep } from "./PaymentStep";
import { BookingSummary } from "./BookingSummary";

export function BookingWizard() {
  const router = useRouter();
  const { state, dispatch } = useBooking();

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

  // Step 1: Date selected
  const handleDateSelect = (date: string) => {
    dispatch({ type: "SET_DATE", date });
    fetchSlots(date);
    dispatch({ type: "NEXT_STEP" });
  };

  // Step 2: Slot selected
  const handleSlotSelect = (time: string, displayTime: string) => {
    dispatch({ type: "SET_SLOT", slot: time, displayTime });
    dispatch({ type: "NEXT_STEP" });
  };

  // Step 3: Package confirmed (auto-advance via button)
  const handlePackageConfirm = () => {
    const amount = calculatePrice(state.packageType, state.partySize);
    dispatch({ type: "SET_AMOUNT", amount });
    dispatch({ type: "NEXT_STEP" });
  };

  // Step 4: Details submitted
  const handleDetailsSubmit = (details: {
    name: string;
    email: string;
    phone: string;
    gamePreference: string;
    specialRequests?: string;
  }) => {
    dispatch({
      type: "SET_DETAILS",
      details: {
        ...details,
        specialRequests: details.specialRequests || "",
      },
    });
    const amount = calculatePrice(state.packageType, state.partySize);
    dispatch({ type: "SET_AMOUNT", amount });
    dispatch({ type: "NEXT_STEP" });
  };

  // Step 5: Pay at center
  const handlePayAtCenter = async () => {
    if (!state.personalDetails || !state.selectedDate || !state.selectedSlot) return;

    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const res = await fetch("/api/bookings", {
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
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/book/confirmation?id=${data.booking.bookingId}&amount=${data.booking.amount}&date=${state.selectedDate}&time=${state.selectedSlotDisplay}&players=${state.partySize}&package=${state.packageType}&payment=pay_at_center`);
      } else {
        dispatch({ type: "SET_ERROR", error: data.error || "Booking failed" });
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "Something went wrong. Please try again." });
    }
    dispatch({ type: "SET_LOADING", loading: false });
  };

  // Step 5: Pay online via Razorpay
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
        }),
      });

      const bookingData = await bookingRes.json();
      if (!bookingData.success) {
        dispatch({ type: "SET_ERROR", error: bookingData.error || "Booking failed" });
        dispatch({ type: "SET_LOADING", loading: false });
        return;
      }

      const bookingId = bookingData.booking.bookingId;
      const amount = bookingData.booking.amount;

      // 2. Create Razorpay order
      const payRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, amount }),
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
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              router.push(`/book/confirmation?id=${bookingId}&amount=${amount}&date=${state.selectedDate}&time=${state.selectedSlotDisplay}&players=${state.partySize}&package=${state.packageType}&payment=paid`);
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

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator currentStep={state.step} />

      {/* Back button */}
      {state.step > 1 && (
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
            {state.step === 1 && (
              <DatePicker
                key="date"
                selectedDate={state.selectedDate}
                onSelectDate={handleDateSelect}
              />
            )}
            {state.step === 2 && state.selectedDate && (
              <div key="time">
                <TimeSlotGrid
                  date={state.selectedDate}
                  slots={state.availableSlots}
                  selectedSlot={state.selectedSlot}
                  isLoading={state.isLoading}
                  onSelectSlot={handleSlotSelect}
                />
              </div>
            )}
            {state.step === 3 && (
              <div key="package">
                <PackageSelector
                  partySize={state.partySize}
                  packageType={state.packageType}
                  onPartySizeChange={(size) =>
                    dispatch({ type: "SET_PARTY_SIZE", size })
                  }
                  onPackageChange={(pkg) =>
                    dispatch({ type: "SET_PACKAGE", pkg })
                  }
                />
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handlePackageConfirm}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-2.5 rounded-lg font-medium transition-colors glow-violet"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
            {state.step === 4 && (
              <PersonalDetailsForm
                key="details"
                onSubmit={handleDetailsSubmit}
                initialValues={state.personalDetails}
              />
            )}
            {state.step === 5 && (
              <PaymentStep
                key="payment"
                state={state}
                onPayAtCenter={handlePayAtCenter}
                onPayOnline={handlePayOnline}
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
