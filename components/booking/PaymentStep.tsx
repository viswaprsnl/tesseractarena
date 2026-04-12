"use client";

import { useState } from "react";
import Script from "next/script";
import { motion } from "framer-motion";
import { CreditCard, Banknote, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingState } from "@/hooks/use-booking";
import { formatTimeDisplay } from "@/lib/booking-config";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

interface PaymentStepProps {
  state: BookingState;
  onPayAtCenter: () => Promise<void>;
  onPayOnline: () => Promise<void>;
}

export function PaymentStep({
  state,
  onPayAtCenter,
  onPayOnline,
}: PaymentStepProps) {
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const handlePayAtCenter = async () => {
    setProcessing(true);
    setSelectedMethod("center");
    try {
      await onPayAtCenter();
    } finally {
      setProcessing(false);
    }
  };

  const handlePayOnline = async () => {
    setProcessing(true);
    setSelectedMethod("online");
    try {
      await onPayOnline();
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
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <h3 className="font-heading text-lg font-bold text-center mb-2">
        Payment
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Total: <span className="text-foreground font-bold text-lg">₹{state.amount.toLocaleString("en-IN")}</span>
      </p>

      {/* Booking summary */}
      <div className="glass-card p-4 mb-6 text-sm space-y-1">
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

      {/* Payment options */}
      <div className="space-y-4">
        <Button
          onClick={handlePayOnline}
          disabled={processing}
          className="w-full h-auto py-4 bg-primary hover:bg-primary/90 text-primary-foreground glow-violet"
        >
          {processing && selectedMethod === "online" ? (
            <Loader2 className="animate-spin mr-2" size={18} />
          ) : (
            <CreditCard className="mr-2" size={18} />
          )}
          <div className="text-left">
            <div className="font-semibold">Pay Online</div>
            <div className="text-xs opacity-80">UPI, Cards, Net Banking via Razorpay</div>
          </div>
        </Button>

        <Button
          onClick={handlePayAtCenter}
          disabled={processing}
          variant="outline"
          className="w-full h-auto py-4 border-white/20 hover:bg-white/5"
        >
          {processing && selectedMethod === "center" ? (
            <Loader2 className="animate-spin mr-2" size={18} />
          ) : (
            <Banknote className="mr-2" size={18} />
          )}
          <div className="text-left">
            <div className="font-semibold">Pay at Center</div>
            <div className="text-xs opacity-60">Reserve now, pay when you arrive</div>
          </div>
        </Button>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-6">
        <Shield size={12} className="text-primary" />
        Secure payment powered by Razorpay
      </p>
    </motion.div>
  );
}
