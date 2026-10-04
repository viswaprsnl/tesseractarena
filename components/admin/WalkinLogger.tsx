"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTodayISTString, withGST, GST_PERCENT } from "@/lib/booking-config";
import type { PackageType } from "@/lib/booking-types";

// Walk-in auto-fill prices. These are per-head ex-GST base rates
// aligned with the current Anvio catalogue (City Z / Station Zarya /
// Revolta are all ₹1,599 Solo, with the 10%/15% squad/party tier
// discounts from the online flow baked in). Values match
// calculateSessionPrice() so a walk-in and an online booking for the
// same group look like-for-like in the Revenue sheet.
//
// Kept local to the walk-in form on purpose — lib/booking-config's
// PRICING constants are the legacy fallback for /api/bookings when a
// game id doesn't match, which runs at different numbers (1499/1199/
// 999) and shouldn't be touched without a wider review.
const WALKIN_BASE_PRICE: Record<Extract<PackageType, "solo" | "squad" | "party">, number> = {
  solo: 1599,
  squad: 1439, // 1599 × 0.9 — matches PerPersonPackageType squad tier
  party: 1359, // 1599 × 0.85 — matches party tier
};
import type { GroupType, PaymentMethod } from "@/lib/revenue-config";

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 25] as const;

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
  // Once staff manually picks a discount (preset or custom), stop
  // auto-overriding it on group / date changes. Prevents the "I set
  // it to 10% and then changed the group and it jumped back to 25%"
  // frustration.
  const [discountTouched, setDiscountTouched] = useState(false);
  // Same idea for the price field: once staff has overtyped it,
  // changing the player count or group shouldn't wipe their value.
  const [priceTouched, setPriceTouched] = useState(false);
  // Auto-apply site-wide discount (e.g. the October opening offer) so
  // walk-ins match what customers see online. Fetched once per form
  // open per date — same /api/discounts the booking page uses. Only
  // auto-apply (code-less) campaigns come back; coupon-gated discounts
  // are never auto-pulled here.
  const [autoDiscountLabel, setAutoDiscountLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    fetch(`/api/discounts?date=${formDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        type D = { label: string; type: "percent" | "flat"; value: number; appliesTo: "all" | "solo" | "squad" | "party" };
        const list: D[] = Array.isArray(data?.discounts) ? data.discounts : [];
        // Pick the biggest percent discount for this group OR site-wide.
        const eligible = list.filter(
          (d) => d.appliesTo === "all" || d.appliesTo === formGroup
        );
        const bestPercent = eligible
          .filter((d) => d.type === "percent")
          .reduce<D | null>((best, d) => (!best || d.value > best.value ? d : best), null);
        if (bestPercent) {
          setAutoDiscountLabel(`${bestPercent.label} (${bestPercent.value}%)`);
          // Honour the staff's manual choice if they've already clicked.
          if (!discountTouched) {
            setDiscountMode("preset");
            setDiscountPct(bestPercent.value);
          }
        } else {
          setAutoDiscountLabel(null);
          if (!discountTouched && discountMode === "preset") setDiscountPct(0);
        }
      })
      .catch(() => {
        /* silent: staff can still enter discount by hand */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, formDate, formGroup]);

  // Auto-fill the "List price" field (ex-GST base × players × GST) when
  // staff hasn't overtyped it. Guarded by priceTouched so a manual
  // override survives further group / player tweaks.
  useEffect(() => {
    if (priceTouched) return;
    const perPerson = WALKIN_BASE_PRICE[formGroup];
    const baseTotal = perPerson * Math.max(1, formPlayers);
    setFormRevenue(String(withGST(baseTotal)));
  }, [formGroup, formPlayers, priceTouched]);

  // Everything below treats formRevenue as INC-GST — what the customer
  // actually paid at the counter. Discount reduces that gross figure.
  // Ex-GST base + GST portion are derived so the Revenue sheet (and
  // downstream reports) still store ex-GST like Sheet1 bookings do.
  const grossRevenue = Number(formRevenue) || 0;
  const effectivePct =
    discountMode === "preset"
      ? discountPct
      : Math.max(0, Math.min(100, parseFloat(customDiscountPct) || 0));
  const discountAmount = useMemo(
    () => Math.round((grossRevenue * effectivePct) / 100),
    [grossRevenue, effectivePct]
  );
  const netRevenueIncGST = Math.max(0, grossRevenue - discountAmount);
  // Derive the ex-GST base from the inc-GST net. GST is the remainder
  // so the two always sum back to the inc-GST amount — no rounding
  // mismatches that leave the Revenue sheet off by a rupee.
  const netRevenueExGST = Math.round(netRevenueIncGST / (1 + GST_PERCENT / 100));
  const netGSTAmount = Math.max(0, netRevenueIncGST - netRevenueExGST);

  const reset = () => {
    setFormDate(today);
    setFormGroup("squad");
    setFormPlayers(2);
    setFormPayment("upi");
    setFormNotes("");
    setDiscountPct(0);
    setCustomDiscountPct("");
    setDiscountMode("preset");
    setDiscountTouched(false);
    setPriceTouched(false);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFlash(null);
    // Audit trail folded into notes: discount %, GST portion collected,
    // and inc-GST total so the row self-documents. The /api/admin/
    // revenue endpoint stores the ex-GST base in the `revenue` column
    // so walk-in rows match Sheet1 bookings — both are ex-GST revenue
    // for Anvio royalty / finance reporting.
    const noteParts: string[] = [];
    if (formNotes) noteParts.push(formNotes);
    if (effectivePct > 0) {
      noteParts.push(`${effectivePct}% rep discount (₹${discountAmount} off ₹${grossRevenue} gross)`);
    }
    noteParts.push(`GST ₹${netGSTAmount} collected · ₹${netRevenueIncGST} total`);
    const notesForRow = noteParts.join(" · ");
    try {
      const res = await fetch(`/api/admin/revenue?pin=${pin}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          source: "walkin",
          groupType: formGroup,
          players: formPlayers,
          // ex-GST base — same semantics as Sheet1 bookings so revenue
          // reports sum like-for-like.
          revenue: netRevenueExGST,
          paymentMethod: formPayment,
          notes: notesForRow,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save walk-in");
      } else {
        const suffix =
          effectivePct > 0 ? ` (after ${effectivePct}% off)` : "";
        setFlash(
          `Logged: ${formGroup} × ${formPlayers} · ₹${netRevenueIncGST.toLocaleString("en-IN")} collected${suffix}`
        );
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
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                List price ₹ <span className="text-amber-400/80">(before discount)</span>
              </label>
              <Input
                type="number"
                min="0"
                value={formRevenue}
                onChange={(e) => {
                  setFormRevenue(e.target.value);
                  setPriceTouched(true);
                }}
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
            {autoDiscountLabel && (
              <p className="text-[11px] text-amber-300">
                Auto-applied: <strong>{autoDiscountLabel}</strong> — matches
                the online booking flow. Override below if the counter
                customer isn&apos;t eligible.
              </p>
            )}
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
                        setDiscountTouched(true);
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
                  onClick={() => {
                    setDiscountMode("custom");
                    setDiscountTouched(true);
                  }}
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
                onChange={(e) => {
                  setCustomDiscountPct(e.target.value);
                  setDiscountTouched(true);
                }}
                placeholder="e.g. 25"
                className="bg-card/60 border-white/10 text-xs h-8"
              />
            )}
          </div>

          {/* Final-amount summary. "Collect from customer" is the big
              headline number — the one the counter staff should type
              into UPI / tell the customer to pay. The ex-GST + GST
              split is secondary and sits below for audit purposes. */}
          {grossRevenue > 0 && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 sm:p-4">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-primary mb-1">
                    Collect from customer (incl. GST)
                  </p>
                  {effectivePct > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Was <span className="line-through">₹{grossRevenue.toLocaleString("en-IN")}</span>
                      {" "}· {effectivePct}% off saves ₹{discountAmount.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-primary leading-none">
                  ₹{netRevenueIncGST.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-muted-foreground space-y-0.5">
                <div className="flex justify-between">
                  <span>Ex-GST revenue (sheet column F)</span>
                  <span>₹{netRevenueExGST.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST @ {GST_PERCENT}% (remitted to govt)</span>
                  <span>₹{netGSTAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={submit}
              disabled={busy || grossRevenue <= 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8"
            >
              <Plus size={12} className="mr-1" />
              {busy
                ? "Saving…"
                : `Log walk-in (₹${netRevenueIncGST.toLocaleString("en-IN")} collected)`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
