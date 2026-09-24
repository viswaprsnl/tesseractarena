"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  RefreshCw,
  LogOut,
  Plus,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
} from "lucide-react";

// Staff kiosk landing — runs on the Samsung Tab at the check-in counter.
// Bare page (no site nav; SiteChrome suppresses on /kiosk paths). Flow:
//   1. Staff types the PIN once at the start of shift
//   2. Cookie is set for 24h — every /api/kiosk/* request auto-auths
//   3. Roster of today's bookings renders; auto-refreshes every 25s so
//      new online bookings appear without a manual reload
//   4. Tap a booking tile → check-in page with QR customers scan for
//      their waivers
//   5. "Book an Experience" opens the normal /book flow (walk-ins)

type BookingStatus = "pending" | "partial" | "ready";

interface RosterEntry {
  bookingId: string;
  name: string;
  timeSlot: string;
  timeDisplay: string;
  partySize: number;
  waiversSigned: number;
  package: string;
  gamePreference: string;
  paymentStatus: string;
  status: BookingStatus;
}

const REFRESH_MS = 25_000;

export default function KioskPage() {
  const [authState, setAuthState] = useState<"unknown" | "in" | "out">("unknown");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [bookings, setBookings] = useState<RosterEntry[]>([]);
  const [rosterDate, setRosterDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kiosk/bookings", { cache: "no-store" });
      if (res.status === 401) {
        setAuthState("out");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
        setRosterDate(data.date || "");
        setAuthState("in");
      } else {
        setError(data.error || "Failed to load bookings");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    if (authState !== "in") return;
    const t = setInterval(loadRoster, REFRESH_MS);
    return () => clearInterval(t);
  }, [authState, loadRoster]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setPinError(null);
    try {
      const res = await fetch("/api/kiosk/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok) {
        setPin("");
        setAuthState("in");
        await loadRoster();
      } else {
        setPinError(data.error || "Incorrect PIN");
      }
    } catch {
      setPinError("Network error");
    }
    setSubmitting(false);
  };

  const handleLogout = async () => {
    if (!confirm("Sign out of the kiosk?")) return;
    await fetch("/api/kiosk/session", { method: "DELETE" });
    setBookings([]);
    setAuthState("out");
  };

  if (authState === "unknown") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (authState === "out") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <form
          onSubmit={handlePinSubmit}
          className="glass-card p-8 sm:p-12 w-full max-w-md space-y-6"
        >
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold mb-2">
              <span className="gradient-text">Tesseract Arena</span> Kiosk
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter staff PIN to unlock the check-in tab.
            </p>
          </div>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            className="w-full h-14 rounded-lg bg-card/60 border border-border px-4 text-center text-xl tracking-widest outline-none focus:border-primary/50"
          />
          {pinError && (
            <p className="text-sm text-destructive text-center">{pinError}</p>
          )}
          <button
            type="submit"
            disabled={submitting || pin.length === 0}
            className="w-full h-14 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg transition-colors disabled:opacity-40 glow-violet"
          >
            {submitting ? "Unlocking…" : "Unlock kiosk"}
          </button>
          <p className="text-[11px] text-muted-foreground/70 text-center">
            Session stays open for 24 hours. Sign out from the roster
            when you close for the day.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar — brand, date, refresh, logout */}
      <div className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-lg sm:text-xl font-bold gradient-text tracking-wider">
            TESSERACT ARENA · KIOSK
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rosterDate ? formatDate(rosterDate) : "Today"}
            {" · "}
            {bookings.length} booking{bookings.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadRoster}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-40"
            aria-label="Refresh"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1.5"
            aria-label="Sign out"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        {error && (
          <div className="glass-card p-3 mb-4 border-destructive/30 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Roster — left / main */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold">Check-in</h2>
              <p className="text-xs text-muted-foreground">
                Tap a booking to open the waiver QR
              </p>
            </div>

            {bookings.length === 0 && !loading ? (
              <div className="glass-card p-8 text-center text-muted-foreground">
                <p className="text-sm">
                  No bookings for today yet. Walk-ins can book below.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bookings.map((b) => (
                  <BookingTile key={b.bookingId} booking={b} />
                ))}
              </div>
            )}
          </div>

          {/* Walk-in CTA — right / sidebar */}
          <div>
            <Link
              href="/book?kiosk=1"
              className="glass-card p-6 border-primary/30 hover:border-primary/60 transition-colors flex flex-col items-center justify-center text-center glow-violet"
            >
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-3">
                <Plus size={26} className="text-primary-foreground" />
              </div>
              <p className="font-heading text-lg font-bold mb-1">
                Book an Experience
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Walk-in booking — pick a slot, party size, and game
              </p>
              <div className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                Start booking <ArrowRight size={14} />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingTile({ booking }: { booking: RosterEntry }) {
  const badge = STATUS_BADGES[booking.status];
  return (
    <Link
      href={`/kiosk/checkin/${encodeURIComponent(booking.bookingId)}`}
      className="glass-card p-5 hover:border-primary/40 transition-colors flex items-start gap-3"
    >
      <div className="flex-1 min-w-0">
        <p className="font-heading text-lg font-bold truncate">
          {booking.name || "Guest"}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={11} className="text-primary" />
            {booking.timeDisplay}
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} className="text-primary" />
            {booking.partySize}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-1 font-mono">
          {booking.bookingId}
        </p>
      </div>
      <div className={`text-[10px] px-2 py-1 rounded-full ${badge.className} flex items-center gap-1 shrink-0`}>
        {booking.status === "ready" && <CheckCircle2 size={11} />}
        {badge.label(booking)}
      </div>
    </Link>
  );
}

const STATUS_BADGES: Record<
  BookingStatus,
  { label: (b: RosterEntry) => string; className: string }
> = {
  pending: {
    label: () => "Pending",
    className: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  },
  partial: {
    label: (b) => `${b.waiversSigned}/${b.partySize} signed`,
    className: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  },
  ready: {
    label: () => "Ready",
    className: "bg-green-500/20 text-green-400 border border-green-500/30",
  },
};

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
