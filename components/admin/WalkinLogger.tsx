"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRICING, getTodayISTString } from "@/lib/booking-config";
import type { GroupType, PaymentMethod } from "@/lib/revenue-config";

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

  // Auto-fill revenue from package × players. Staff can still overtype
  // for promos or "friend rate" sessions.
  useEffect(() => {
    const perPerson = PRICING[formGroup];
    setFormRevenue(String(perPerson * Math.max(1, formPlayers)));
  }, [formGroup, formPlayers]);

  const reset = () => {
    setFormDate(today);
    setFormGroup("squad");
    setFormPlayers(2);
    setFormPayment("upi");
    setFormNotes("");
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await fetch(`/api/admin/revenue?pin=${pin}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          source: "walkin",
          groupType: formGroup,
          players: formPlayers,
          revenue: Number(formRevenue) || 0,
          paymentMethod: formPayment,
          notes: formNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save walk-in");
      } else {
        setFlash(`Logged: ${formGroup} × ${formPlayers} · ₹${Number(formRevenue).toLocaleString("en-IN")}`);
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

          <div className="flex justify-end">
            <Button
              onClick={submit}
              disabled={busy}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8"
            >
              <Plus size={12} className="mr-1" />
              {busy ? "Saving…" : "Log walk-in"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
