"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

// Polls /api/kiosk/bookings every few seconds and watches for THIS
// bookingId's balanceDue to drop to 0. When it does, swap the UI to
// a big "Paid ✓" so staff knows to send the customer in. Deliberately
// not using SSE / websockets — the kiosk already polls the roster,
// so another lightweight poll here keeps the plumbing simple.

const POLL_MS = 4_000;

interface Props {
  bookingId: string;
}

export function KioskPayPoll({ bookingId }: Props) {
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/kiosk/bookings", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const row = (data.bookings || []).find(
          (b: { bookingId: string }) => b.bookingId === bookingId
        );
        if (row && row.balanceDue === 0 && !cancelled) {
          setPaid(true);
        }
      } catch {
        // Transient network blip — try again next tick.
      }
    };
    check();
    const int = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(int);
    };
  }, [bookingId]);

  if (paid) {
    return (
      <div className="glass-card p-5 border-green-500/40 bg-green-500/5">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2
            size={28}
            className="text-green-400 shrink-0"
            strokeWidth={1.5}
          />
          <p className="font-heading text-xl font-bold text-green-400">
            Payment received
          </p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Balance cleared. Customer can head in.
        </p>
        <Link
          href="/kiosk/pay"
          className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Back to payments list
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 size={14} className="animate-spin" />
      Waiting for payment…
    </div>
  );
}
