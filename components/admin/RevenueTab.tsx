"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_MONTHLY_COST,
  INVESTMENT_TOTAL,
  aggregateByDay,
  formatIndianCompact,
  formatIndianFull,
  type GroupType,
  type MonthlyCost,
  type PaymentMethod,
  type RevenueEntry,
} from "@/lib/revenue-config";
import { PRICING, getTodayISTString } from "@/lib/booking-config";
import { RevenueChart } from "./RevenueChart";

type RangeKey = "7" | "30" | "90" | "180" | "365";

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: "7", label: "7d", days: 7 },
  { key: "30", label: "30d", days: 30 },
  { key: "90", label: "90d", days: 90 },
  { key: "180", label: "6mo", days: 180 },
  { key: "365", label: "1y", days: 365 },
];

function addDaysStr(base: string, delta: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}

function costForMonth(month: string, overrides: MonthlyCost[]): number {
  return overrides.find((c) => c.month === month)?.cost ?? DEFAULT_MONTHLY_COST;
}

export function RevenueTab({ pin }: { pin: string }) {
  const today = getTodayISTString();
  const [rangeKey, setRangeKey] = useState<RangeKey>("30");
  const rangeDays = RANGE_OPTIONS.find((r) => r.key === rangeKey)!.days;
  const fromDate = addDaysStr(today, -(rangeDays - 1));
  const toDate = today;

  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [costs, setCosts] = useState<MonthlyCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingCost, setSavingCost] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/revenue?pin=${pin}&from=${fromDate}&to=${toDate}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load revenue");
      } else {
        setEntries(data.entries || []);
        setCosts(data.costs || []);
      }
    } catch {
      setError("Failed to load revenue");
    }
    setLoading(false);
  }, [pin, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─────────────── Aggregations for tiles + chart ───────────────

  const dailies = useMemo(
    () => aggregateByDay(entries, fromDate, toDate),
    [entries, fromDate, toDate]
  );

  const thisMonth = monthKeyOf(today);
  const thisMonthEntries = entries.filter((e) => monthKeyOf(e.date) === thisMonth);
  const thisMonthRevenue = thisMonthEntries.reduce((s, e) => s + e.revenue, 0);
  const thisMonthBookingRev = thisMonthEntries
    .filter((e) => e.source === "booking")
    .reduce((s, e) => s + e.revenue, 0);
  const thisMonthWalkinRev = thisMonthEntries
    .filter((e) => e.source === "walkin")
    .reduce((s, e) => s + e.revenue, 0);
  const thisMonthCost = costForMonth(thisMonth, costs);
  const thisMonthProfit = thisMonthRevenue - thisMonthCost;

  // Cumulative net for the entire loaded window; approximates ROI progress
  // once you've been running long enough to select a 6- or 12-month range.
  const rangeRevenue = entries.reduce((s, e) => s + e.revenue, 0);
  const monthsCovered = new Set(dailies.map((d) => monthKeyOf(d.date))).size;
  const rangeCost = [...new Set(dailies.map((d) => monthKeyOf(d.date)))]
    .reduce((s, m) => s + costForMonth(m, costs), 0);
  const rangeNet = rangeRevenue - rangeCost;
  const avgMonthlyProfit = monthsCovered > 0 ? rangeNet / monthsCovered : 0;
  const monthsToROI =
    avgMonthlyProfit > 0 ? Math.ceil(INVESTMENT_TOTAL / avgMonthlyProfit) : null;

  // Mix stats for the summary strip.
  const groupMix = { solo: 0, squad: 0, party: 0 } as Record<GroupType, number>;
  const payMix = { cash: 0, upi: 0, card: 0, razorpay: 0 } as Record<PaymentMethod, number>;
  let bookingSessions = 0;
  let walkinSessions = 0;
  for (const e of thisMonthEntries) {
    groupMix[e.groupType] += 1;
    payMix[e.paymentMethod] += 1;
    if (e.source === "booking") bookingSessions += 1;
    else walkinSessions += 1;
  }

  const dailyBreakEven = thisMonthCost / 30;

  // ─────────────── Walk-in entry form ───────────────

  const [formDate, setFormDate] = useState(today);
  const [formGroup, setFormGroup] = useState<GroupType>("squad");
  const [formPlayers, setFormPlayers] = useState<number>(2);
  const [formRevenue, setFormRevenue] = useState<string>("");
  const [formPayment, setFormPayment] = useState<PaymentMethod>("upi");
  const [formNotes, setFormNotes] = useState<string>("");

  // Auto-fill the revenue field from the package × players so staff usually
  // just tap "Save". They can still overtype to record a promo / friend price.
  useEffect(() => {
    if (editingId) return; // Don't auto-fill while editing an existing row.
    const perPerson = PRICING[formGroup];
    setFormRevenue(String(perPerson * Math.max(1, formPlayers)));
  }, [formGroup, formPlayers, editingId]);

  const resetForm = () => {
    setEditingId(null);
    setFormDate(today);
    setFormGroup("squad");
    setFormPlayers(2);
    setFormRevenue("");
    setFormPayment("upi");
    setFormNotes("");
  };

  const submitWalkin = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        date: formDate,
        source: "walkin",
        groupType: formGroup,
        players: formPlayers,
        revenue: Number(formRevenue) || 0,
        paymentMethod: formPayment,
        notes: formNotes,
      };
      const res = editingId
        ? await fetch(`/api/admin/revenue?pin=${pin}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, ...payload }),
          })
        : await fetch(`/api/admin/revenue?pin=${pin}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save entry");
      } else {
        resetForm();
        await fetchData();
      }
    } catch {
      setError("Failed to save entry");
    }
    setBusy(false);
  };

  const beginEdit = (e: RevenueEntry) => {
    setEditingId(e.id);
    setFormDate(e.date);
    setFormGroup(e.groupType);
    setFormPlayers(e.players);
    setFormRevenue(String(e.revenue));
    setFormPayment(e.paymentMethod);
    setFormNotes(e.notes);
  };

  const deleteWalkin = async (id: string) => {
    if (!confirm("Delete this walk-in entry?")) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/revenue?pin=${pin}&id=${id}`, { method: "DELETE" });
      await fetchData();
    } catch {
      setError("Failed to delete");
    }
    setBusy(false);
  };

  // ─────────────── Monthly cost editor ───────────────

  const [costInput, setCostInput] = useState(String(thisMonthCost));
  useEffect(() => {
    setCostInput(String(thisMonthCost));
  }, [thisMonthCost]);

  const saveCost = async () => {
    const parsed = Number(costInput);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setSavingCost(true);
    try {
      const res = await fetch(`/api/admin/revenue/cost?pin=${pin}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: thisMonth, cost: parsed }),
      });
      if (res.ok) await fetchData();
    } catch {
      setError("Failed to update cost");
    }
    setSavingCost(false);
  };

  // ─────────────── Render ───────────────

  const sortedForList = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h2 className="font-heading text-lg font-bold mb-1">Revenue & ROI Tracker</h2>
        <p className="text-xs text-muted-foreground max-w-xl mx-auto">
          Bookings pull in automatically. Log walk-ins as they happen at the counter.
          Numbers are for {fromDate} → {toDate}.
        </p>
      </div>

      {error && (
        <div className="text-xs text-destructive text-center">{error}</div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="This month revenue" value={formatIndianFull(thisMonthRevenue)} sub={loading ? "…" : `${thisMonthEntries.length} sessions`} />
        <StatTile
          label="This month cost"
          value={formatIndianFull(thisMonthCost)}
          sub={`daily break-even ${formatIndianCompact(dailyBreakEven)}`}
        />
        <StatTile
          label="This month profit"
          value={formatIndianFull(thisMonthProfit)}
          sub={thisMonthProfit >= 0 ? "on plan" : "below break-even"}
          tone={thisMonthProfit >= 0 ? "green" : "red"}
        />
        <StatTile
          label="Est. ROI horizon"
          value={monthsToROI ? `${monthsToROI} mo` : "—"}
          sub={
            monthsToROI
              ? `at ${formatIndianCompact(avgMonthlyProfit)}/mo pace`
              : "need positive months first"
          }
          tone={monthsToROI ? (monthsToROI <= 24 ? "green" : "amber") : undefined}
        />
      </div>

      {/* This-month mix strip */}
      <div className="glass-card p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <MixRow
          label="Source"
          items={[
            { name: "Bookings", value: thisMonthBookingRev, count: bookingSessions, color: "#6C3BFF" },
            { name: "Walk-ins", value: thisMonthWalkinRev, count: walkinSessions, color: "#22c55e" },
          ]}
        />
        <MixRow
          label="Package mix"
          items={[
            { name: "Solo", value: groupMix.solo, color: "#3b82f6" },
            { name: "Squad", value: groupMix.squad, color: "#6C3BFF" },
            { name: "Party", value: groupMix.party, color: "#f59e0b" },
          ]}
          countMode="raw"
        />
        <MixRow
          label="Payment mix"
          items={[
            { name: "Cash", value: payMix.cash, color: "#94a3b8" },
            { name: "UPI", value: payMix.upi, color: "#22c55e" },
            { name: "Card", value: payMix.card, color: "#3b82f6" },
            { name: "Razorpay", value: payMix.razorpay, color: "#6C3BFF" },
          ]}
          countMode="raw"
        />
      </div>

      {/* Monthly cost editor */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Monthly cost for <strong>{thisMonth}</strong>
          </span>
          <Input
            type="number"
            value={costInput}
            onChange={(e) => setCostInput(e.target.value)}
            className="bg-card/60 border-white/10 text-xs h-8 w-32"
          />
          <Button
            onClick={saveCost}
            disabled={savingCost || Number(costInput) === thisMonthCost}
            className="bg-secondary hover:bg-secondary/80 text-xs h-8"
          >
            {savingCost ? "Saving…" : "Save"}
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Falls back to ₹{DEFAULT_MONTHLY_COST.toLocaleString("en-IN")} when unset.
          </span>
        </div>
      </div>

      {/* Walk-in entry form */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">
            {editingId ? "Edit walk-in" : "Log a walk-in session"}
          </h4>
          {editingId && (
            <Button
              onClick={resetForm}
              className="bg-secondary hover:bg-secondary/80 text-xs h-7"
            >
              <X size={12} className="mr-1" /> Cancel edit
            </Button>
          )}
        </div>

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
              placeholder="e.g. birthday party"
              className="bg-card/60 border-white/10 text-xs h-9"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={submitWalkin}
            disabled={busy}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8"
          >
            <Plus size={12} className="mr-1" />
            {editingId ? "Save changes" : "Add walk-in"}
          </Button>
        </div>
      </div>

      {/* Range picker + chart */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">Timeline</span>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`px-2.5 py-1 text-[11px] rounded ${
                rangeKey === r.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <RevenueChart data={dailies} dailyBreakEven={dailyBreakEven} />

      {/* Recent entries table */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-medium mb-3">Recent entries (last 30 in range)</h4>
        {sortedForList.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No entries in this window. Log a walk-in above or wait for bookings to come in.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
            {sortedForList.slice(0, 30).map((e) => {
              const isBooking = e.source === "booking";
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-2 text-xs py-1.5 border-b border-white/5 last:border-b-0"
                >
                  <span className="text-muted-foreground w-20 shrink-0">{e.date}</span>
                  <Badge
                    className={`text-[10px] shrink-0 ${
                      isBooking
                        ? "bg-primary/20 text-primary"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {isBooking ? "Booking" : "Walk-in"}
                  </Badge>
                  <span className="capitalize w-14 shrink-0">{e.groupType}</span>
                  <span className="w-16 shrink-0">{e.players} player{e.players === 1 ? "" : "s"}</span>
                  <span className="capitalize text-muted-foreground w-16 shrink-0">
                    {e.paymentMethod}
                  </span>
                  <span className="flex-1 truncate text-muted-foreground">{e.notes}</span>
                  <span className="font-medium shrink-0">{formatIndianFull(e.revenue)}</span>
                  {!isBooking && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => beginEdit(e)}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => deleteWalkin(e.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "green" | "red" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-400"
      : tone === "red"
      ? "text-red-400"
      : tone === "amber"
      ? "text-amber-400"
      : "";
  return (
    <div className="glass-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

interface MixItem {
  name: string;
  value: number;
  count?: number;
  color: string;
}

function MixRow({
  label,
  items,
  countMode = "money",
}: {
  label: string;
  items: MixItem[];
  countMode?: "money" | "raw";
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </p>
      {total === 0 ? (
        <p className="text-[11px] text-muted-foreground/60">No data yet</p>
      ) : (
        <>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary/50 mb-1.5">
            {items.map((it) => (
              <div
                key={it.name}
                style={{
                  width: `${(it.value / total) * 100}%`,
                  background: it.color,
                }}
                title={`${it.name}: ${it.value}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {items
              .filter((it) => it.value > 0)
              .map((it) => (
                <span key={it.name} className="flex items-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-sm" style={{ background: it.color }} />
                  {it.name}{" "}
                  <span className="text-muted-foreground">
                    {countMode === "money" ? formatIndianCompact(it.value) : it.value}
                  </span>
                </span>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
