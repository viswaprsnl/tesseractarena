"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { XCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function CancelContent() {
  const params = useSearchParams();
  const bookingId = params.get("id");
  const [status, setStatus] = useState<"confirm" | "cancelling" | "cancelled" | "error">("confirm");
  const [errorMsg, setErrorMsg] = useState("");

  const handleCancel = async () => {
    if (!bookingId) return;
    setStatus("cancelling");

    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("cancelled");
      } else {
        setErrorMsg(data.error || "Failed to cancel");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (!bookingId) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 text-center max-w-md">
          <XCircle size={64} className="mx-auto mb-6 text-destructive" />
          <h2 className="text-2xl font-bold mb-3">Invalid Link</h2>
          <p className="text-muted-foreground text-sm">
            This cancellation link is invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-12 text-center max-w-md"
      >
        {status === "confirm" && (
          <>
            <XCircle size={64} className="mx-auto mb-6 text-amber-400" />
            <h2 className="text-2xl font-bold mb-3">Cancel Booking?</h2>
            <p className="text-muted-foreground text-sm mb-2">
              Booking ID: <span className="text-primary font-bold">{bookingId}</span>
            </p>
            <p className="text-muted-foreground text-sm mb-8">
              This will free up your time slot for other players. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleCancel}
                className="w-full bg-destructive/80 hover:bg-destructive text-white"
              >
                Yes, Cancel My Booking
              </Button>
              <Link
                href="/"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full justify-center border-white/20 hover:bg-white/5"
                )}
              >
                Keep My Booking
              </Link>
            </div>
          </>
        )}

        {status === "cancelling" && (
          <>
            <Loader2 size={64} className="mx-auto mb-6 text-primary animate-spin" />
            <h2 className="text-2xl font-bold">Cancelling...</h2>
          </>
        )}

        {status === "cancelled" && (
          <>
            <CheckCircle2 size={64} className="mx-auto mb-6 text-primary" />
            <h2 className="text-2xl font-bold mb-3">Booking Cancelled</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your booking <span className="text-primary font-bold">{bookingId}</span> has
              been cancelled and the time slot is now available.
            </p>
            <Link
              href="/book"
              className={cn(
                buttonVariants(),
                "w-full justify-center bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              Book a New Session
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={64} className="mx-auto mb-6 text-destructive" />
            <h2 className="text-2xl font-bold mb-3">Error</h2>
            <p className="text-muted-foreground text-sm mb-6">{errorMsg}</p>
            <Button onClick={() => setStatus("confirm")} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Try Again
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  );
}
