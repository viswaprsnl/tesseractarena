"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRICING, getTodayISTString } from "@/lib/booking-config";
import type { GroupType, PaymentMethod } from "@/lib/revenue-config";

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20] as const;

interface WalkinLoggerProps {
  pin: string;
  onSaved?: () => void;
}

// Compact walk-in entry form for staff to log counter sessions as they
// happen. Uses the staff PIN — mirrors what the Bookings tab already has
// permission to do. Auto-fills revenue from PRICING × players so staff
// usually just tap Save.
export function WalkinLogger({ pin, onSaved }: WalkinLoggerProps) {
  const today = getTodayISTString();
  const [expanded, setExpanded] = useState(false);
  const [formDate, setFormDate] = useState(today);
  const [formGroup, setFormGroup] = useState<GroupType>("squad");
  const [formPlayers, setFormPlayers] = useState<number>(2);
  const [formRevenue, setFormRevenue] = useState<string>("");
  const [formPayment, setFormPayment] = useState<PaymentMethod>("upi");
  const [formNotes, setFormNotes] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Rep discount applied inline at the walk-in step. Stored as a percent
  // OR a preset (0 = no discount). The gross ticket that goes into the
  // Revenue field is package × players; the discount reduces that at
  // submit-time and gets appended to notes so the trail lands in the
  // Revenue sheet exactly like on-booking discounts on Sheet1.
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [customDiscountPct, setCustomDiscountPct] = useState<string>("");
  const [discountMode, setDiscountMode] = useState<"preset" | "custom">(
    "preset"
  );

  // Auto-fill revenue from package × players. Staff can still overtype
  // for promos or "friend rate" sessions.
  useEffect(() => {
    const perPerson = PRICING[formGroup];
    setFormRevenue(String(perPerson * Math.max(1, formPlayers)));
  }, [formGroup, formPlayers]);

  const grossRevenue = Number(formRevenue) || 0;
  const effectivePct =
    discountMode === "preset"
      ? discountPct
      : Math.max(0, Math.min(100, parseFloat(customDiscountPct) || 0));
  const discountAmount = useMemo(
    () => Math.round((grossRevenue * effectivePct) / 100),
    [grossRevenue, effectivePct]
  );
  const netRevenue = Math.max(0, grossRevenue - discountAmount);

  const reset = () => {
    setFormDate(today);
    setFormGroup("squad");
    setFormPlayers(2);
    setFormPayment("upi");
    setFormNotes("");
    setDiscountPct(0);
    setCustomDiscountPct("");
    setDiscountMode("preset");
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFlash(null);
    // Fold discount into the notes so the audit trail is on the row
    // itself — the /api/admin/revenue endpoint doesn't know about our
    // discount fields, and revenue we log here is the POST-discount
    // amount (matches how the counter treats it).
    const notesWithDiscount =
      effectivePct > 0
        ? `${formNotes ? formNotes + " · " : ""}${effectivePct}% rep discount (₹${discountAmount} off gross ₹${grossRevenue})`
        : formNotes;
    try {
      const res = await fetch(`/api/admin/revenue?pin=${pin}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          source: "walkin",
          groupType: formGroup,
          players: formPlayers,
          revenue: netRevenue,
          paymentMethod: formPayment,
          notes: notesWithDiscount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save walk-in");
      } else {
        const suffix =
          effectivePct > 0 ? ` (after ${effectivePct}% off)` : "";
        setFlash(`Logged: ${formGroup} × ${formPlayers} · ₹${netRevenue.toLocaleString("en-IN")}${suffix}`);
        reset();
        onSaved?.();
        setTimeout(() => setFlash(null), 3000);
      }
    } catch {
      setError("Failed to save walk-in");
    }
    setBusy(false);
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Log a walk-in session</h4>
          <p className="text-[11px] text-muted-foreground">
            For customers who paid at the counter without booking online.
          </p>
        </div>
        <Button
          onClick={() => setExpanded(!expanded)}
          className="bg-secondary hover:bg-secondary/80 text-xs h-8"
        >
          {expanded ? "Hide" : "Open"}
        </Button>
      </div>

      {flash && (
        <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2">
          {flash}
        </div>
      )}

      {expanded && (
        <>
          {error && <div className="text-xs text-destructive">{error}</div>}

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="bg-card/60 border-white/10 text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Group</label>
              <select
                value={formGroup}
                onChange={(e) => setFormGroup(e.target.value as GroupType)}
                className="w-full h-9 rounded-md bg-card/60 border border-white/10 px-2 text-xs"
              >
                <option value="solo">Solo</option>
                <option value="squad">Squad</option>
                <option value="party">Party</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Players</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={formPlayers}
                onChange={(e) => setFormPlayers(Math.max(1, Number(e.target.value) || 1))}
                className="bg-card/60 border-white/10 text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue ₹</label>
              <Input
                type="number"
                min="0"
                value={formRevenue}
                onChange={(e) => setFormRevenue(e.target.value)}
                className="bg-card/60 border-white/10 text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Payment</label>
              <select
                value={formPayment}
                onChange={(e) => setFormPayment(e.target.value as PaymentMethod)}
                className="w-full h-9 rounded-md bg-card/60 border border-white/10 px-2 text-xs"
              >
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="razorpay">Razorpay</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g. birthday"
                className="bg-card/60 border-white/10 text-xs h-9"
              />
            </div>
          </div>

          {/* Discount picker — same preset ladder as the admin bookings
              modal (0/5/10/15/20 %). Custom % lets staff step outside the
              preset ladder up to 100, but the walk-in flow doesn't gate
              on the owner PIN because the revenue amount is entered by
              hand anyway — the discount here is purely bookkeeping. */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[10px] uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Tag size={11} />
                Discount
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DISCOUNT_PRESETS.map((pct) => {
                  const active =
                    discountMode === "preset" && discountPct === pct;
                  return (
                    <button
                      key={pct}
                      onClick={() => {
                        setDiscountMode("preset");
                        setDiscountPct(pct);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                        active
                          ? "bg-amber-500/25 text-amber-200 border border-amber-500/50"
                          : "bg-secondary/60 text-muted-foreground border border-white/10 hover:text-foreground"
                      }`}
                    >
                      {pct === 0 ? "None" : `${pct}%`}
                    </button>
                  );
                })}
                <button
                  onClick={() => setDiscountMode("custom")}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                    discountMode === "custom"
                      ? "bg-amber-500/25 text-amber-200 border border-amber-500/50"
                      : "bg-secondary/60 text-muted-foreground border border-white/10 hover:text-foreground"
                  }`}
                >
                  Custom %
                </button>
              </div>
            </div>
            {discountMode === "custom" && (
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={customDiscountPct}
                onChange={(e) => setCustomDiscountPct(e.target.value)}
                placeholder="e.g. 25"
                className="bg-card/60 border-white/10 text-xs h-8"
              />
            )}
            {effectivePct > 0 && (
              <p className="text-[11px] text-amber-300">
                Gross ₹{grossRevenue.toLocaleString("en-IN")} − ₹
                {discountAmount.toLocaleString("en-IN")} ({effectivePct}%) = <strong>₹{netRevenue.toLocaleString("en-IN")}</strong> logged
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={submit}
              disabled={busy}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8"
            >
              <Plus size={12} className="mr-1" />
              {busy
                ? "Saving…"
                : effectivePct > 0
                ? `Log walk-in (₹${netRevenue.toLocaleString("en-IN")})`
                : "Log walk-in"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
