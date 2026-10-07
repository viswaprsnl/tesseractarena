"use client";

import { useState } from "react";
import Script from "next/script";
import { CheckCircle2, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

// Client-side half of the balance-pay page. Loads Razorpay checkout
// lazily, creates the order via /api/payments/balance/create, opens
// the checkout sheet with the balance amount pre-filled, and verifies
// via /api/payments/balance/verify on success.
//
// On success we flip local UI state to "paid" rather than redirecting
// — the Tab-2 kiosk screen polls the booking and will advance itself
// when it sees balanceDue=0, so there's nothing for this phone-screen
// to redirect to.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

interface Props {
  bookingId: string;
  balanceIncGST: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export function BalancePayClient({
  bookingId,
  balanceIncGST,
  customerName,
  customerEmail,
  customerPhone,
}: Props) {
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setProcessing(true);
    setError(null);
    try {
      // 1. Create the Razorpay order server-side (amount derived
      //    from the sheet, not from the client — a tampered client
      //    cannot short-pay).
      const createRes = await fetch("/api/payments/balance/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || "Could not start the payment");
      }

      // 2. Open Razorpay checkout. The script must be loaded by this
      //    point — the <Script> tag at page render requests it with
      //    lazyOnload strategy; typical mobile networks have it ready
      //    well before the user taps.
      if (typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Payment gateway is still loading — please try again");
      }

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id: createData.orderId,
          amount: createData.amount,
          currency: createData.currency,
          name: "Tesseract Arena",
          description: `Balance for ${bookingId}`,
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
          theme: { color: "#6C3BFF" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch("/api/payments/balance/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingId,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                reject(new Error(verifyData.error || "Verification failed"));
                return;
              }
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              // User closed the Razorpay sheet without paying — not an
              // error, just reset the UI so they can try again.
              reject(new Error("Payment cancelled"));
            },
          },
        });
        rzp.open();
      });

      setPaid(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      // "Payment cancelled" is a user action, not a system error —
      // don't show it as a red banner.
      if (message !== "Payment cancelled") {
        setError(message);
      }
    } finally {
      setProcessing(false);
    }
  };

  if (paid) {
    return (
      <div className="glass-card p-6 text-center border-green-500/30 bg-green-500/5">
        <CheckCircle2
          size={44}
          className="text-green-400 mx-auto mb-3"
          strokeWidth={1.5}
        />
        <p className="font-heading text-xl font-bold mb-1 text-green-400">
          Payment received
        </p>
        <p className="text-sm text-muted-foreground">
          Thanks — you&apos;re all set. Please show this screen to the counter
          staff if they ask.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      {error && (
        <div className="glass-card p-3 mb-3 border-destructive/30 text-sm text-destructive text-center">
          {error}
        </div>
      )}

      <Button
        onClick={handlePay}
        disabled={processing}
        className="w-full h-12 text-base font-semibold"
      >
        {processing ? (
          <>
            <Loader2 className="animate-spin mr-2" size={18} />
            Opening payment…
          </>
        ) : (
          <>Pay ₹{balanceIncGST.toLocaleString("en-IN")} now</>
        )}
      </Button>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70 mt-3">
        <Shield size={11} />
        Secured by Razorpay
      </div>
    </>
  );
}
