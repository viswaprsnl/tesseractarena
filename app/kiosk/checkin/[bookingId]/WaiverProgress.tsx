"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Gamepad2 } from "lucide-react";

// Right-hand rail on the check-in page. Polls the single-booking
// waiver endpoint every few seconds while the customers scan the QR
// and sign on their phones, and paints filled circles as each waiver
// lands in the sheet. Once signed >= partySize, flips the whole card
// to a "Ready to play" state.

interface WaiverProgressProps {
  bookingId: string;
  initialSigned: number;
  totalPlayers: number;
  gamePreference: string;
}

const POLL_MS = 5_000;

export function WaiverProgress({
  bookingId,
  initialSigned,
  totalPlayers,
  gamePreference,
}: WaiverProgressProps) {
  const [signed, setSigned] = useState(initialSigned);
  const [status, setStatus] = useState<"pending" | "partial" | "ready">(
    initialSigned === 0
      ? "pending"
      : initialSigned >= totalPlayers
      ? "ready"
      : "partial"
  );
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/kiosk/waivers/${encodeURIComponent(bookingId)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setSigned(data.waiversSigned || 0);
        setStatus(data.status || "pending");
      }
    } catch {
      // Silent — next tick tries again
    }
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    check();
    const t = setInterval(check, POLL_MS);
    return () => clearInterval(t);
  }, [check]);

  const slots = Array.from({ length: totalPlayers }, (_, i) => i < signed);
  const isReady = status === "ready";

  return (
    <div className="glass-card p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg font-bold">Waiver progress</h2>
        {loading && (
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        )}
      </div>

      <div
        className={`p-5 rounded-xl border ${
          isReady
            ? "bg-green-500/10 border-green-500/40"
            : "bg-secondary/40 border-white/10"
        } mb-4`}
      >
        <p
          className={`text-3xl font-bold mb-1 ${
            isReady ? "text-green-400" : ""
          }`}
        >
          {signed} <span className="text-lg text-muted-foreground">/</span>{" "}
          {totalPlayers}
        </p>
        <p
          className={`text-xs uppercase tracking-wider ${
            isReady ? "text-green-400" : "text-muted-foreground"
          }`}
        >
          {isReady ? "Ready to play" : "Waivers signed"}
        </p>
      </div>

      {/* Per-player status circles. Previously these were empty / check
          icons with no number, which read as decorative dots at a glance.
          Numbered circles ("1", "2", …) make it obvious each one maps to
          one player; the number swaps to a check once their waiver lands.
          "Players" caption above anchors the whole row. */}
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        Players
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {slots.map((filled, i) => (
          <div
            key={i}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border transition-colors ${
              filled
                ? "bg-green-500/20 text-green-400 border-green-500/40"
                : "bg-secondary/60 text-muted-foreground border-white/10"
            }`}
            aria-label={
              filled ? `Player ${i + 1} signed` : `Player ${i + 1} pending`
            }
            title={
              filled ? `Player ${i + 1} — signed` : `Player ${i + 1} — pending`
            }
          >
            {filled ? <CheckCircle2 size={18} /> : i + 1}
          </div>
        ))}
      </div>

      {gamePreference && (
        <div className="pt-4 border-t border-white/10 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Gamepad2 size={12} className="text-primary" />
            <span>Game: {formatGamePreference(gamePreference)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function formatGamePreference(id: string): string {
  // The sentinel "decide-at-venue" means the customer deferred their
  // game choice at booking time. On the kiosk check-in page they're
  // visibly here, so "Staff pick" matches the kiosk booking-form copy
  // and reads as a cue to the counter team.
  if (id === "decide-at-venue") return "Staff pick";
  // Fallback — id will look like a slug (city-z, station-zarya, birthday
  // labels like "Birthday: Aria (age 8)" fall through and print as-is).
  if (id.includes(" ")) return id;
  return id
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
