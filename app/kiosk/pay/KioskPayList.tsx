"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";

// Shape mirrors what /api/kiosk/bookings returns (we extended it to
// include amount / amountPaid / balanceDue for this page). Not
// imported from a shared types file because the kiosk roster isn't
// typed centrally yet and I don't want to add a cross-cutting change
// alongside the feature work.
interface RosterEntry {
  bookingId: string;
  name: string;
  timeSlot: string;
  timeDisplay: string;
  partySize: number;
  amount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
}

const REFRESH_MS = 20_000;

export function KioskPayList() {
  const [bookings, setBookings] = useState<RosterEntry[]>([]);
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/kiosk/bookings", { cache: "no-store" });
      if (res.status === 401) {
        // Session expired — redirect to /kiosk for a fresh PIN.
        window.location.href = "/kiosk";
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
        setDate(data.date || "");
      } else {
        setError(data.error || "Failed to load bookings");
      }
    } catch {
      setError("Network error — check connection");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const int = setInterval(load, REFRESH_MS);
    return () => clearInterval(int);
  }, [load]);

  // Only bookings that still owe a balance belong here; the staff on
  // this tablet doesn't need to see fully-paid ones. Sort by soonest
  // slot first so morning sessions bubble to the top.
  const unpaid = bookings
    .filter((b) => b.balanceDue > 0 && b.paymentStatus !== "pay_at_center-paid")
    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

  const dateDisplay = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar — matches /kiosk's visual style so staff feels the two
          tablets are "the same app, different surface". */}
      <div className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">
            <span className="gradient-text">Tesseract Arena</span>
            <span className="text-muted-foreground"> · Payments</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dateDisplay}
            {" · "}
            {unpaid.length} outstanding
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border/60 hover:bg-secondary/40 text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <Link
            href="/kiosk"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border/60 hover:bg-secondary/40 text-sm transition-colors"
          >
            <ArrowLeft size={14} />
            Check-in
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6">
        <h2 className="font-heading text-lg font-bold mb-1">
          Collect balance
        </h2>
        <p className="text-xs text-muted-foreground mb-5">
          Tap a booking to open the payment QR. Customer scans with
          their phone and pays via UPI / card / wallet.
        </p>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Loading bookings…
            </span>
          </div>
        )}

        {error && !loading && (
          <div className="glass-card p-4 mb-5 border-destructive/30 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {!loading && !error && unpaid.length === 0 && (
          <div className="glass-card p-10 text-center">
            <CheckCircle2
              size={44}
              className="text-green-400 mx-auto mb-3"
              strokeWidth={1.5}
            />
            <p className="font-heading text-lg font-bold mb-1">
              Nothing outstanding
            </p>
            <p className="text-sm text-muted-foreground">
              Every booking today is fully paid. Nice.
            </p>
          </div>
        )}

        <div className="grid gap-3">
          {unpaid.map((b) => {
            const balanceIncGST = Math.round(b.balanceDue * 1.18);
            return (
              <Link
                key={b.bookingId}
                href={`/kiosk/pay/${encodeURIComponent(b.bookingId)}`}
                className="glass-card p-4 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold truncate">{b.name}</p>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {b.bookingId}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} className="text-primary/70" />
                      {b.timeDisplay}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={11} className="text-primary/70" />
                      {b.partySize} players
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Balance due
                  </p>
                  <p className="text-xl font-bold text-primary">
                    ₹{balanceIncGST.toLocaleString("en-IN")}
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
