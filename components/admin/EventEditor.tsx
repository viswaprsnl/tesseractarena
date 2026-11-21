"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePricing } from "@/hooks/use-pricing";
import { formatTimeDisplay, inclGst } from "@/lib/booking-config";
import type { BookingRow } from "@/lib/booking-types";
import type { BookingDetails } from "@/lib/ops-config";
import { EventFields, field, Labeled, newEventDraft, useOps, type EventDraft } from "./EventFields";

// Edit an existing birthday / corporate booking: people, food, cake, price.
// Food can change during the party; the bill and balance follow.
export function EventEditor({
  pin,
  booking,
  details,
  onClose,
  onSaved,
}: {
  pin: string;
  booking: BookingRow;
  details: BookingDetails;
  onClose: () => void;
  onSaved: () => void;
}) {
  const pricing = usePricing();
  const ops = useOps(pin);
  const kind = details.kind ?? (booking.source === "corporate" ? "corporate" : "birthday");
  const [draft, setDraft] = useState<EventDraft>(() => ({ ...newEventDraft(kind, ops, pricing), ...details, kind }));
  const [partySize, setPartySize] = useState(booking.partySize);
  const [notes, setNotes] = useState(booking.specialRequests);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const post = (payload: Record<string, unknown>) =>
    fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, bookingId: booking.bookingId, ...payload }),
    }).then(async (r) => ({ ok: r.ok, ...(await r.json()) }));

  const save = async () => {
    setBusy(true);
    const { bookingId, date, timeSlot, slots, name, phone, email } = booking;
    const res = await post({
      action: "save_event", ...draft, bookingId, date, timeSlot, slots: slots || 2, name, phone, email, partySize, notes,
    }).catch(() => ({ ok: false, error: "Save failed" }));
    setBusy(false);
    if (res.ok) onSaved();
    else setMessage(res.requiresOwnerPin ? "More than 20% below list price needs the owner." : res.error || "Save failed");
  };

  const sendLink = async () => {
    setBusy(true);
    const res = await post({ action: "payment_link" }).catch(() => ({ ok: false, error: "Couldn't create the link" }));
    setBusy(false);
    setMessage(res.ok ? `Razorpay sent a ₹${res.amount.toLocaleString("en-IN")} payment link to the customer: ${res.url}` : res.error);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label={`Event ${booking.bookingId}`}>
      <div className="glass-card w-full max-w-3xl p-4 sm:p-5 space-y-4 my-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold">
              {booking.bookingId} · {kind === "birthday" ? "Birthday" : "Corporate"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {booking.name} · {booking.phone} · {booking.date} {formatTimeDisplay(booking.timeSlot)} · {booking.slots || 2}h blocked
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Labeled label={kind === "birthday" ? "Kids playing" : "Players"}>
            <Input type="number" min={1} value={partySize} onChange={(e) => setPartySize(Math.max(1, Number(e.target.value) || 1))} className={field} />
          </Labeled>
          <div className="col-span-1 sm:col-span-3">
            <Labeled label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
            </Labeled>
          </div>
        </div>
        <EventFields draft={draft} onChange={setDraft} partySize={partySize} paidInclGst={inclGst(booking, booking.amountPaid)} ops={ops} pricing={pricing} />
        {message && <p className="text-xs text-muted-foreground break-all">{message}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={busy} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
            {busy && <Loader2 size={14} className="animate-spin mr-1" />}
            Save changes
          </Button>
          {booking.balanceDue > 0 && (
            <Button onClick={sendLink} disabled={busy} variant="outline" className="border-white/20 text-xs">
              Send Razorpay link for the balance
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Save first if you changed anything — the link is for the saved balance.</p>
      </div>
    </div>
  );
}
