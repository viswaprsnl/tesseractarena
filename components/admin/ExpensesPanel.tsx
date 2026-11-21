"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTodayISTString } from "@/lib/booking-config";
import { EXPENSE_CATEGORIES, formatIndianFull, STAFF_EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from "@/lib/revenue-config";

const field = "h-9 rounded-md bg-card/60 border border-white/10 px-2 text-xs";

// Expense log for one month. Staff add day-to-day costs (wages, party
// supplies, food partner) and see their own entries; the owner sees all.
// Feeds profit in Owner → Overview.
export function ExpensesPanel({ pin, isOwner }: { pin: string; isOwner: boolean }) {
  const categories = isOwner ? (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]) : STAFF_EXPENSE_CATEGORIES;
  const today = getTodayISTString();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [loaded, setLoaded] = useState<{ month: string; expenses: Expense[] } | null>(null);
  const [draft, setDraft] = useState({ date: today, category: "food" as ExpenseCategory, amount: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const q = `pin=${encodeURIComponent(pin)}`;

  useEffect(() => {
    let live = true;
    fetch(`/api/admin/expenses?${q}&month=${month}`)
      .then((r) => r.json())
      .then((d) => live && setLoaded({ month, expenses: d.expenses ?? [] }))
      .catch(() => live && setError("Failed to load expenses"));
    return () => {
      live = false;
    };
  }, [q, month, version]);

  const expenses = loaded?.month === month ? loaded.expenses : null;
  const total = expenses?.reduce((s, e) => s + e.amount, 0) ?? 0;
  const byCategory = Object.entries(
    (expenses ?? []).reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + e.amount }), {})
  ).sort((a, b) => b[1] - a[1]);

  const add = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/expenses?${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, amount: Number(draft.amount) }),
    }).catch(() => null);
    if (res?.ok) {
      setDraft((d) => ({ ...d, amount: "", note: "" }));
      setVersion((v) => v + 1);
    } else setError("Couldn't save — check the amount and date.");
    setBusy(false);
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/expenses?${q}&id=${id}`, { method: "DELETE" }).catch(() => null);
    setVersion((v) => v + 1);
  };

  return (
    <section className="glass-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-bold">{isOwner ? "Expenses" : "Expenses added by staff"}</h3>
        <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className={`${field} w-40`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-[auto_1fr_auto_1fr_auto] gap-2">
        <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={field} />
        <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ExpenseCategory })} className={field}>
          {categories.map((id) => (
            <option key={id} value={id}>{EXPENSE_CATEGORIES[id]}</option>
          ))}
        </select>
        <Input type="number" min={1} placeholder="₹ amount" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} className={`${field} sm:w-28`} />
        <Input placeholder="Note, e.g. TA-BDAY01 · 20 combos" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className={field} />
        <Button onClick={add} disabled={busy || !(Number(draft.amount) > 0)} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9">
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Add"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {!expenses ? (
        <Loader2 className="animate-spin text-primary mx-auto" size={20} />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full bg-red-500/15 text-red-300 px-2 py-0.5">Total {formatIndianFull(total)}</span>
            {byCategory.map(([c, v]) => (
              <span key={c} className="rounded-full bg-secondary/60 px-2 py-0.5">
                {EXPENSE_CATEGORIES[c as ExpenseCategory]} {formatIndianFull(v)}
              </span>
            ))}
          </div>
          <ul className="divide-y divide-white/5 text-xs">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <span className="text-muted-foreground w-20 shrink-0">{e.date.slice(5)}</span>
                <span className="w-36 shrink-0">{EXPENSE_CATEGORIES[e.category]}</span>
                <span className="flex-1 min-w-0 truncate text-muted-foreground">{e.note}</span>
                <span className="tabular-nums">{formatIndianFull(e.amount)}</span>
                <button onClick={() => remove(e.id)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Delete expense">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
            {expenses.length === 0 && <li className="py-3 text-muted-foreground">No expenses logged this month.</li>}
          </ul>
        </>
      )}
    </section>
  );
}
