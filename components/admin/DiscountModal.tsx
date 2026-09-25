"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, X, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookingRow } from "@/lib/booking-types";
import { withGST, gstOn, GST_PERCENT } from "@/lib/booking-config";

// Rep-applied discount modal.
//
// The booking row already knows its CURRENT ex-GST amount and any
// discount that was applied at booking creation (site-wide promo). This
// modal computes an additional rep discount on top and posts to
// /api/admin/bookings action=apply_discount. Preset buttons (5/10/15/20)
// are always available to any staff PIN; a custom % over 20 forces an
// owner-PIN gate before submit.
//
// Two safety nets in the UI:
//   1. Preview shows the exact new subtotal / GST / total / balance so
//      the rep sees what they're committing to.
//   2. Discount can't exceed the current outstanding amount (server
//      also rejects this).

const PRESETS = [5, 10, 15, 20] as const;
const OWNER_GATE_PERCENT = 20;

interface DiscountModalProps {
  booking: BookingRow;
  staffPin: string;
  ownerAuthed: boolean;
  ownerPin: string;
  onClose: () => void;
  onApplied: () => void; // refetch trigger for the parent
}

type Mode = "preset" | "custom-pct" | "custom-rupees";

export function DiscountModal({
  booking,
  staffPin,
  ownerAuthed,
  ownerPin,
  onClose,
  onApplied,
}: DiscountModalProps) {
  const [mode, setMode] = useState<Mode>("preset");
  const [presetPct, setPresetPct] = useState<number>(10);
  const [customPct, setCustomPct] = useState<string>("");
  const [customRupees, setCustomRupees] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [ownerPinInput, setOwnerPinInput] = useState<string>("");
  const [submitting, setSubmitting] = useState<false | "apply" | "clear">(false);
  const [error, setError] = useState<string | null>(null);

  // Effective rep discount in rupees off the CURRENT ex-GST amount.
  const currentAmount = booking.amount;
  const repDiscount = useMemo(() => {
    if (mode === "preset") {
      return Math.round((currentAmount * presetPct) / 100);
    }
    if (mode === "custom-pct") {
      const pct = parseFloat(customPct);
      if (!Number.isFinite(pct) || pct <= 0) return 0;
      return Math.round((currentAmount * pct) / 100);
    }
    const rs = parseFloat(customRupees);
    if (!Number.isFinite(rs) || rs <= 0) return 0;
    return Math.round(rs);
  }, [mode, presetPct, customPct, customRupees, currentAmount]);

  const effectivePct = currentAmount > 0 ? (repDiscount / currentAmount) * 100 : 0;
  const requiresOwner = effectivePct > OWNER_GATE_PERCENT;
  const overLimit = repDiscount >= currentAmount;
  const canSubmit =
    repDiscount > 0 &&
    !overLimit &&
    (!requiresOwner || ownerAuthed || ownerPinInput.length >= 4);

  const newAmount = Math.max(0, currentAmount - repDiscount);
  const newGst = gstOn(newAmount);
  const newTotal = withGST(newAmount);
  const newBalanceDue = Math.max(0, newAmount - booking.amountPaid);
  const customerSaves = withGST(currentAmount) - newTotal;

  const submit = async () => {
    setSubmitting("apply");
    setError(null);
    // Pick the strongest PIN available: owner takes precedence so an
    // owner-authed admin doesn't need to re-type the owner PIN, but a
    // rep applying >20% must have provided one via `ownerPinInput`.
    const pinToUse =
      requiresOwner && !ownerAuthed && ownerPinInput
        ? ownerPinInput
        : ownerAuthed
        ? ownerPin
        : staffPin;
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pinToUse,
          action: "apply_discount",
          bookingId: booking.bookingId,
          discountType: mode === "custom-rupees" ? "flat" : "percent",
          discountValue:
            mode === "preset"
              ? presetPct
              : mode === "custom-pct"
              ? parseFloat(customPct)
              : parseFloat(customRupees),
          reason: reason || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onApplied();
        onClose();
      } else if (res.status === 403 && data.requiresOwnerPin) {
        setError("Owner PIN required for discounts over 20%.");
        setSubmitting(false);
      } else {
        setError(data.error || "Failed to apply discount");
        setSubmitting(false);
      }
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  };

  const clearDiscount = async () => {
    if (!confirm("Reset this booking to its original pre-discount price?")) return;
    setSubmitting("clear");
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: ownerAuthed ? ownerPin : staffPin,
          action: "clear_discount",
          bookingId: booking.bookingId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onApplied();
        onClose();
      } else {
        setError(data.error || "Failed to clear discount");
        setSubmitting(false);
      }
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg glass-card p-6 sm:p-7"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Tag size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold">Apply discount</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {booking.bookingId}
              </p>
            </div>
          </div>

          {/* Current state */}
          <div className="glass-card p-3 mb-4 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current subtotal</span>
              <span>₹{currentAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST @ {GST_PERCENT}%</span>
              <span>+ ₹{gstOn(currentAmount).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-medium pt-1 border-t border-white/10">
              <span>Current total (incl. GST)</span>
              <span>₹{withGST(currentAmount).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Balance outstanding</span>
              <span>₹{withGST(booking.balanceDue).toLocaleString("en-IN")}</span>
            </div>
            {booking.discountAmount > 0 && (
              <div className="flex justify-between text-green-400 pt-1 border-t border-white/10">
                <span>Discount already applied</span>
                <span>− ₹{booking.discountAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>

          {/* Preset row */}
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Quick discount
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((pct) => {
                const active = mode === "preset" && presetPct === pct;
                return (
                  <button
                    key={pct}
                    onClick={() => {
                      setMode("preset");
                      setPresetPct(pct);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-amber-500/25 text-amber-300 border border-amber-500/50"
                        : "bg-secondary/50 text-muted-foreground border border-white/10 hover:text-foreground"
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
              <button
                onClick={() => setMode("custom-pct")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  mode === "custom-pct"
                    ? "bg-amber-500/25 text-amber-300 border border-amber-500/50"
                    : "bg-secondary/50 text-muted-foreground border border-white/10 hover:text-foreground"
                }`}
              >
                Custom %
              </button>
              <button
                onClick={() => setMode("custom-rupees")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  mode === "custom-rupees"
                    ? "bg-amber-500/25 text-amber-300 border border-amber-500/50"
                    : "bg-secondary/50 text-muted-foreground border border-white/10 hover:text-foreground"
                }`}
              >
                Custom ₹
              </button>
            </div>
          </div>

          {mode === "custom-pct" && (
            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                Custom percent
              </label>
              <Input
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={customPct}
                onChange={(e) => setCustomPct(e.target.value)}
                placeholder="e.g. 25"
                className="bg-card/60 border-white/10"
              />
            </div>
          )}
          {mode === "custom-rupees" && (
            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                Custom rupees off (ex-GST)
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                value={customRupees}
                onChange={(e) => setCustomRupees(e.target.value)}
                placeholder="e.g. 500"
                className="bg-card/60 border-white/10"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
              Reason (optional — logged on the booking)
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. birthday goodwill · corporate lead · complaint"
              className="bg-card/60 border-white/10"
              maxLength={200}
            />
          </div>

          {/* Preview */}
          <div className="glass-card p-3 mb-3 border-amber-500/20 text-xs space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-amber-400 mb-1">
              Preview after discount
            </p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-amber-400">
                − ₹{repDiscount.toLocaleString("en-IN")}
                {effectivePct > 0 && ` (${effectivePct.toFixed(1)}%)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New subtotal</span>
              <span>₹{newAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>New GST</span>
              <span>+ ₹{newGst.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-medium pt-1 border-t border-white/10">
              <span>New total</span>
              <span>₹{newTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>New balance</span>
              <span>₹{withGST(newBalanceDue).toLocaleString("en-IN")}</span>
            </div>
            {customerSaves > 0 && (
              <div className="flex justify-between text-green-400 pt-1 border-t border-white/10">
                <span>Customer saves</span>
                <span>₹{customerSaves.toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>

          {overLimit && (
            <div className="glass-card p-2 mb-3 border-destructive/30 text-xs text-destructive text-center flex items-center justify-center gap-1">
              <AlertTriangle size={12} />
              Discount can&apos;t exceed the outstanding amount.
            </div>
          )}

          {requiresOwner && !ownerAuthed && !overLimit && (
            <div className="glass-card p-3 mb-3 border-amber-500/30 text-xs">
              <p className="text-amber-400 mb-2 flex items-center gap-1">
                <AlertTriangle size={12} />
                Owner PIN required — discount is over {OWNER_GATE_PERCENT}%.
              </p>
              <Input
                type="password"
                inputMode="numeric"
                value={ownerPinInput}
                onChange={(e) => setOwnerPinInput(e.target.value)}
                placeholder="Owner PIN"
                className="bg-card/60 border-white/10 text-center tracking-widest"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive text-center mb-3">{error}</p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            {booking.discountAmount > 0 && (
              <Button
                onClick={clearDiscount}
                disabled={!!submitting}
                variant="outline"
                className="border-white/10 text-muted-foreground text-xs"
              >
                {submitting === "clear" ? (
                  <Loader2 size={12} className="animate-spin mr-1" />
                ) : (
                  <RotateCcw size={12} className="mr-1" />
                )}
                Clear existing discount
              </Button>
            )}
            <div className="flex-1" />
            <Button
              onClick={onClose}
              disabled={!!submitting}
              variant="outline"
              className="border-white/10 text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!!submitting || !canSubmit}
              className="bg-amber-500 hover:bg-amber-500/90 text-white disabled:opacity-40"
            >
              {submitting === "apply" ? (
                <Loader2 size={14} className="animate-spin mr-1" />
              ) : (
                <Tag size={14} className="mr-1" />
              )}
              Apply discount
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
