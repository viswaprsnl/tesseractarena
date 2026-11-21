"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { eventBill, FOOD_MENU, resolveOps, type BookingDetails, type CustomItem, type FoodId, type Ops } from "@/lib/ops-config";
import type { Pricing } from "@/lib/pricing";

export const field = "w-full h-9 rounded-md bg-card/60 border border-white/10 px-2 text-xs";
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// Food prices and corporate rate for the signed-in role (staff get no fees).
export function useOps(pin: string): Ops {
  const [ops, setOps] = useState(() => resolveOps({}));
  useEffect(() => {
    fetch(`/api/admin/settings?pin=${encodeURIComponent(pin)}`)
      .then((r) => r.json())
      .then((d) => setOps(resolveOps(d.resolved?.ops)))
      .catch(() => {});
  }, [pin]);
  return ops;
}

export type EventDraft = Required<Pick<BookingDetails, "kind" | "perHead" | "company" | "gstin" | "eaters" | "food" | "custom" | "cake">>;

export function newEventDraft(kind: EventDraft["kind"], ops: Ops, pricing: Pricing): EventDraft {
  return {
    kind,
    perHead: kind === "corporate" ? ops.corporatePerHead : pricing.birthdayPerKid,
    company: "",
    gstin: "",
    eaters: 0,
    food: [],
    custom: [],
    cake: "byo",
  };
}

// Event-only parts of a birthday / corporate booking: price per head, food
// for everyone eating (one headcount, items ticked yes/no), custom items
// with their own GST, cake, and the live bill.
export function EventFields({
  draft,
  onChange,
  partySize,
  paidInclGst,
  ops,
  pricing,
}: {
  draft: EventDraft;
  onChange: (d: EventDraft) => void;
  partySize: number;
  paidInclGst: number;
  ops: Ops;
  pricing: Pricing;
}) {
  const [item, setItem] = useState<CustomItem>({ name: "", qty: 1, price: 0, gst: 5 });
  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => onChange({ ...draft, [k]: v });
  const bill = eventBill(partySize, draft, ops, pricing);
  const total = bill.amount + bill.gst;
  const birthday = draft.kind === "birthday";
  const perPerson = draft.food.reduce((s, id) => s + ops.food[id], 0);
  const cakePrice = pricing.birthdayAddons["custom-cake"] ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Labeled label={birthday ? "Price per kid ₹ (ex-GST)" : "Price per person ₹ (ex-GST)"}>
          <Input type="number" min={0} value={draft.perHead} onChange={(e) => set("perHead", Math.max(0, Number(e.target.value) || 0))} className={field} />
        </Labeled>
        {!birthday && (
          <>
            <Labeled label="Company">
              <Input value={draft.company} onChange={(e) => set("company", e.target.value)} className={field} />
            </Labeled>
            <Labeled label="Company GSTIN (optional)">
              <Input value={draft.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} maxLength={15} className={field} />
            </Labeled>
          </>
        )}
      </div>

      <section className="space-y-2">
        <h4 className="text-xs font-semibold">Food · 5% GST</h4>
        <div className="flex flex-wrap items-end gap-2">
          <Labeled label="People eating">
            <Input type="number" min={0} value={draft.eaters} onChange={(e) => set("eaters", Math.max(0, Number(e.target.value) || 0))} className={`${field} w-28`} />
          </Labeled>
          {FOOD_MENU.map((m) => {
            const on = draft.food.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                onClick={() => set("food", on ? draft.food.filter((x) => x !== m.id) : [...draft.food, m.id as FoodId])}
                className={`h-9 px-3 rounded-full border text-xs ${on ? "border-primary bg-primary/15" : "border-white/10 text-muted-foreground"}`}
              >
                {on ? "✓ " : ""}
                {m.label} · {inr(ops.food[m.id])}/person
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {draft.eaters} × {inr(perPerson)} = {inr(draft.eaters * perPerson)}. Nothing ticked means they bring their own food.
        </p>
        {draft.custom.map((c, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <span>
              {c.name} · {c.qty} × {inr(c.price)} · {c.gst}% GST
            </span>
            <span className="flex items-center gap-2">
              {inr(c.qty * c.price)}
              <button type="button" onClick={() => set("custom", draft.custom.filter((_, j) => j !== i))} aria-label={`Remove ${c.name}`}>
                <X size={14} />
              </button>
            </span>
          </div>
        ))}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
          <Labeled label="Custom item">
            <Input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder="e.g. Garlic bread" className={field} />
          </Labeled>
          <Labeled label="Qty">
            <Input type="number" min={1} value={item.qty} onChange={(e) => setItem({ ...item, qty: Math.max(1, Number(e.target.value) || 1) })} className={field} />
          </Labeled>
          <Labeled label="Unit price ₹">
            <Input type="number" min={0} value={item.price} onChange={(e) => setItem({ ...item, price: Math.max(0, Number(e.target.value) || 0) })} className={field} />
          </Labeled>
          <Labeled label="GST">
            <select value={item.gst} onChange={(e) => setItem({ ...item, gst: Number(e.target.value) as 5 | 18 })} className={field}>
              <option value={5}>5% (food)</option>
              <option value={18}>18% (other)</option>
            </select>
          </Labeled>
          <button
            type="button"
            disabled={!item.name.trim() || !item.price}
            onClick={() => {
              set("custom", [...draft.custom, { ...item, name: item.name.trim() }]);
              setItem({ name: "", qty: 1, price: 0, gst: 5 });
            }}
            className="h-9 rounded-md border border-white/20 text-xs disabled:opacity-40"
          >
            + Add item
          </button>
        </div>
      </section>

      {birthday && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold">Cake</h4>
          <div className="flex flex-wrap gap-2">
            {([["byo", "Bringing their own (free)"], ["custom", `Branded custom cake · ${inr(cakePrice)}`]] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={draft.cake === id}
                onClick={() => set("cake", id)}
                className={`h-9 px-3 rounded-full border text-xs ${draft.cake === id ? "border-primary bg-primary/15" : "border-white/10 text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Basic decor (balloons + banner) is included.</p>
        </section>
      )}

      <dl className="rounded-lg bg-secondary/40 p-3 text-xs grid grid-cols-[1fr_auto] gap-y-1 tabular-nums">
        <dt>
          Play · {partySize} × {inr(draft.perHead)}
        </dt>
        <dd>{inr(bill.play)}</dd>
        {bill.at18 > bill.play && (
          <>
            <dt>Other items</dt>
            <dd>{inr(bill.at18 - bill.play)}</dd>
          </>
        )}
        <dt className="text-muted-foreground">GST 18%</dt>
        <dd className="text-muted-foreground">{inr(bill.gst18)}</dd>
        <dt>Food{bill.cake ? " + cake" : ""}</dt>
        <dd>{inr(bill.at5)}</dd>
        <dt className="text-muted-foreground">GST 5%</dt>
        <dd className="text-muted-foreground">{inr(bill.gst5)}</dd>
        <dt className="font-bold border-t border-white/10 pt-1">Total</dt>
        <dd className="font-bold border-t border-white/10 pt-1">{inr(total)}</dd>
        <dt>Received</dt>
        <dd>{inr(paidInclGst)}</dd>
        <dt className="text-amber-400 font-semibold">Balance</dt>
        <dd className="text-amber-400 font-semibold">{inr(Math.max(0, total - paidInclGst))}</dd>
      </dl>
    </div>
  );
}

export function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
