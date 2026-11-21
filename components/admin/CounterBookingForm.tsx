"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { availableGames } from "@/data/games";
import { usePricing } from "@/hooks/use-pricing";
import { formatTimeDisplay, getSlotsForDate, withGST } from "@/lib/booking-config";
import { COLLECTED_VIA, DECIDE_AT_VENUE_ID, type CollectedVia } from "@/lib/booking-types";
import { gamePrice, maxGamePrice } from "@/lib/pricing";
import { EventFields, field, Labeled, newEventDraft, useOps, type EventDraft } from "./EventFields";

type Kind = "walkin" | "phone" | "birthday" | "corporate";

const KINDS: { id: Kind; label: string; hours: number; minPeople: number }[] = [
  { id: "walkin", label: "Walk-in", hours: 1, minPeople: 1 },
  { id: "phone", label: "Phone booking", hours: 1, minPeople: 1 },
  { id: "birthday", label: "Birthday", hours: 2, minPeople: 8 },
  { id: "corporate", label: "Corporate", hours: 3, minPeople: 4 },
];

// Staff-created bookings: counter walk-ins, phone bookings and birthday /
// event blocks of several hours. They land in the same bookings sheet as
// online ones (so they hold their slots) and any money taken is recorded
// with its payment method. Amounts here are what the customer pays (incl.
// GST); the server stores them ex-GST like every other booking.
export function CounterBookingForm({
  pin,
  date,
  onSaved,
}: {
  pin: string;
  date: string;
  onSaved: () => void;
}) {
  const pricing = usePricing();
  const ops = useOps(pin);
  // Set for birthday / corporate: those are priced from the menu, not typed.
  const [event, setEvent] = useState<EventDraft | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("walkin");
  const [form, setForm] = useState({
    date,
    timeSlot: "",
    hours: 1,
    name: "",
    phone: "",
    email: "",
    partySize: 2,
    game: DECIDE_AT_VENUE_ID,
    method: "upi" as CollectedVia,
    notes: "",
  });
  // null = follow the computed default; a string = staff typed over it.
  const [total, setTotal] = useState<string | null>(null);
  const [received, setReceived] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ date: string; slots: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    let live = true;
    fetch(`/api/bookings/slots?date=${form.date}`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        const taken = (d.slots ?? []).filter((s: { status: string }) => s.status === "booked");
        setBooked({ date: form.date, slots: taken.map((s: { time: string }) => s.time) });
      })
      .catch(() => live && setBooked({ date: form.date, slots: [] }));
    return () => {
      live = false;
    };
  }, [open, form.date]);

  const perHead = form.game === DECIDE_AT_VENUE_ID
    ? maxGamePrice(pricing)
    : gamePrice(pricing, form.game);
  const listTotal = withGST(perHead * form.partySize);
  const totalValue = total ?? String(listTotal);
  const receivedValue = received ?? (kind === "walkin" && !event ? totalValue : "0");
  const takenSlots = booked?.date === form.date ? booked.slots : [];
  const slots = getSlotsForDate(form.date);

  const pickKind = (k: Kind) => {
    const def = KINDS.find((x) => x.id === k)!;
    setKind(k);
    set("hours", def.hours);
    set("partySize", Math.max(form.partySize, def.minPeople));
    setEvent(k === "birthday" || k === "corporate" ? newEventDraft(k, ops, pricing) : null);
    setTotal(null);
    setReceived(null);
  };

  const reset = () => {
    setForm((f) => ({ ...f, timeSlot: "", name: "", phone: "", email: "", notes: "" }));
    setTotal(null);
    setReceived(null);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event ? {
          pin,
          action: "save_event",
          ...event,
          date: form.date,
          timeSlot: form.timeSlot,
          slots: form.hours,
          name: form.name,
          phone: form.phone,
          email: form.email,
          partySize: form.partySize,
          notes: form.notes,
          receivedInclGst: Number(receivedValue) || 0,
          method: form.method,
        } : {
          pin,
          action: "create",
          source: kind,
          date: form.date,
          timeSlot: form.timeSlot,
          slots: form.hours,
          name: form.name,
          phone: form.phone,
          email: form.email,
          partySize: form.partySize,
          gamePreference: form.game,
          totalInclGst: Number(totalValue) || 0,
          receivedInclGst: Number(receivedValue) || 0,
          method: form.method,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.requiresOwnerPin
            ? "More than 20% below list price — needs the owner to make this booking."
            : data.details?.fieldErrors
            ? `Check: ${Object.keys(data.details.fieldErrors).join(", ")}`
            : data.error || "Failed to save"
        );
      } else {
        reset();
        if (event) setEvent(newEventDraft(event.kind, ops, pricing));
        onSaved();
      }
    } catch {
      setError("Failed to save");
    }
    setBusy(false);
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
        <Plus size={14} className="mr-1" /> New booking (walk-in · phone · birthday · corporate)
      </Button>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => pickKind(k.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                kind === k.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Labeled label="Date">
          <Input type="date" value={form.date} onChange={(e) => e.target.value && set("date", e.target.value)} className={field} />
        </Labeled>
        <Labeled label="Start time">
          <select value={form.timeSlot} onChange={(e) => set("timeSlot", e.target.value)} className={field}>
            <option value="">Pick…</option>
            {slots.map((s) => (
              <option key={s} value={s} disabled={takenSlots.includes(s)}>
                {formatTimeDisplay(s)}
                {takenSlots.includes(s) ? " · booked" : ""}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Hours blocked">
          <Input type="number" min={1} max={8} value={form.hours} onChange={(e) => set("hours", Number(e.target.value) || 1)} className={field} />
        </Labeled>
        <Labeled label={kind === "birthday" ? "Kids playing" : "Players"}>
          <Input type="number" min={1} max={40} value={form.partySize} onChange={(e) => set("partySize", Number(e.target.value) || 1)} className={field} />
        </Labeled>
        <Labeled label="Name">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} className={field} />
        </Labeled>
        <Labeled label="Phone">
          <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91" className={field} />
        </Labeled>
        <Labeled label="Email (optional)">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={field} />
        </Labeled>
        {!event && (
          <Labeled label="Game">
            <select value={form.game} onChange={(e) => set("game", e.target.value)} className={field}>
              <option value={DECIDE_AT_VENUE_ID}>Decide at counter</option>
              {availableGames.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} · ₹{gamePrice(pricing, g.id)}
                </option>
              ))}
            </select>
          </Labeled>
        )}
        {!event && (
          <Labeled label={`Total ₹ incl. GST (list ₹${listTotal.toLocaleString("en-IN")})`}>
            <Input type="number" min={0} value={totalValue} onChange={(e) => setTotal(e.target.value)} className={field} />
          </Labeled>
        )}
        <Labeled label="Received now ₹">
          <Input type="number" min={0} value={receivedValue} onChange={(e) => setReceived(e.target.value)} className={field} />
        </Labeled>
        <Labeled label="Paid by">
          <select value={form.method} onChange={(e) => set("method", e.target.value as CollectedVia)} className={field}>
            {(Object.keys(COLLECTED_VIA) as CollectedVia[]).map((m) => (
              <option key={m} value={m}>
                {COLLECTED_VIA[m]}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Notes">
          <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={kind === "birthday" ? "Kid's name, age, cake message" : ""} className={field} />
        </Labeled>
      </div>

      {event && (
        <EventFields draft={event} onChange={setEvent} partySize={form.partySize} paidInclGst={Number(receivedValue) || 0} ops={ops} pricing={pricing} />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        onClick={submit}
        disabled={busy || !form.timeSlot || !form.name.trim() || form.phone.replace(/\D/g, "").length < 10}
        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
      >
        {busy && <Loader2 size={14} className="animate-spin mr-1" />}
        Save {KINDS.find((k) => k.id === kind)!.label.toLowerCase()}
      </Button>
    </div>
  );
}
