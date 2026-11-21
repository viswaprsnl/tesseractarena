"use client";

import { useEffect, useState } from "react";
import { addMonths, format, getDay, getDaysInMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getTodayISTString, withGST } from "@/lib/booking-config";
import { COLLECTED_VIA } from "@/lib/booking-types";
import {
  EXPENSE_CATEGORIES,
  formatIndianCompact,
  formatIndianFull,
  type CalendarDay,
  type ExpenseCategory,
} from "@/lib/revenue-config";

interface Totals {
  sessions: number;
  players: number;
  booked: number;
  received: number;
  expenses: number;
  byMethod: Record<string, number>;
  bySource: Record<string, { sessions: number; booked: number }>;
  byCategory: Record<string, number>;
}

interface CalendarData {
  key: string;
  role: "owner" | "staff";
  days: CalendarDay[];
  totals: Totals;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LABELS: Record<string, string> = {
  ...COLLECTED_VIA,
  unrecorded: "Unrecorded", website: "Website", kiosk: "Kiosk", walkin: "Walk-in",
  phone: "Phone", birthday: "Birthday", corporate: "Corporate",
};

// Month grid on the Bookings tab: plays and money received per day, with
// month totals. Clicking a day opens it in the day view below. Money is
// shown incl. GST (what actually landed in the till / bank); profit uses
// the ex-GST figure since GST is owed to the government.
export function MonthCalendar({
  pin,
  selectedDate,
  onSelect,
  refreshKey,
}: {
  pin: string;
  selectedDate: string;
  onSelect: (date: string) => void;
  refreshKey: number;
}) {
  const [month, setMonth] = useState(selectedDate.slice(0, 7));
  const [data, setData] = useState<CalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `${month}|${refreshKey}|${pin}`;

  useEffect(() => {
    let live = true;
    fetch(`/api/admin/calendar?month=${month}&pin=${encodeURIComponent(pin)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!live) return;
        if (!r.ok) setError(body.error || "Failed to load calendar");
        else {
          setError(null);
          setData({ key, ...body });
        }
      })
      .catch(() => live && setError("Failed to load calendar"));
    return () => {
      live = false;
    };
  }, [key, month, pin]);

  const loading = data?.key !== key && !error;
  const first = new Date(`${month}-01T00:00:00`);
  const lead = (getDay(first) + 6) % 7; // Monday-first grid
  const byDate = new Map(data?.days.map((d) => [d.date, d]));
  const maxSessions = Math.max(1, ...(data?.days.map((d) => d.sessions) ?? [0]));
  const today = getTodayISTString();
  const t = data?.totals;
  const isOwner = data?.role === "owner";
  const shift = (n: number) => setMonth(format(addMonths(first, n), "yyyy-MM"));

  return (
    <section className="glass-card p-4 sm:p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} className="p-2 rounded-lg hover:bg-secondary" aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <h2 className="font-heading text-base tracking-wider flex items-center gap-2">
          {format(first, "MMMM yyyy")}
          {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
        </h2>
        <button onClick={() => shift(1)} className="p-2 rounded-lg hover:bg-secondary" aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>

      {error && <p className="text-xs text-destructive text-center">{error}</p>}

      {t && (
        <div className={`grid gap-2 text-center ${isOwner ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1"}`}>
          <Tile label="Plays" value={`${t.sessions}`} sub={`${t.players} players`} />
          {isOwner && (
            <>
              <Tile label="Received" value={formatIndianFull(withGST(t.received))} sub="incl. GST" />
              <Tile label="Booked value" value={formatIndianFull(withGST(t.booked))} sub="incl. GST" />
              <Tile
                label="Profit"
                value={formatIndianFull(t.received - t.expenses)}
                sub={`after ${formatIndianCompact(t.expenses)} expenses`}
                tone={t.received - t.expenses >= 0 ? "text-green-400" : "text-red-400"}
              />
            </>
          )}
        </div>
      )}

      {t && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {Object.entries(t.byMethod).map(([m, v]) => (
            <Chip key={m} label={LABELS[m] ?? m} value={formatIndianCompact(withGST(v))} />
          ))}
          {Object.entries(t.bySource).map(([s, v]) => (
            <Chip key={s} label={LABELS[s] ?? s} value={`${v.sessions} plays`} />
          ))}
          {isOwner &&
            Object.entries(t.byCategory).map(([c, v]) => (
              <Chip
                key={c}
                label={EXPENSE_CATEGORIES[c as ExpenseCategory] ?? c}
                value={`−${formatIndianCompact(v)}`}
                tone="text-red-400"
              />
            ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground text-center">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: getDaysInMonth(first) }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const d = byDate.get(date);
          const heat = d ? 0.08 + (0.35 * d.sessions) / maxSessions : 0;
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              style={heat ? { backgroundColor: `rgb(108 59 255 / ${heat})` } : undefined}
              className={`min-h-14 sm:min-h-16 rounded-lg border p-1 text-left flex flex-col justify-between transition-colors hover:border-primary/60 ${
                date === selectedDate ? "border-primary" : "border-white/5"
              } ${date === today ? "ring-1 ring-accent" : ""}`}
            >
              <span className="text-[11px] font-medium">{i + 1}</span>
              {d && (d.sessions > 0 || d.received > 0) && (
                <span className="text-[10px] leading-tight">
                  <span className="block">
                    {d.sessions}
                    <span className="hidden sm:inline"> {d.sessions === 1 ? "play" : "plays"}</span>
                  </span>
                  {isOwner && <span className="block text-green-400">{formatIndianCompact(withGST(d.received))}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Tile({ label, value, sub, tone = "" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function Chip({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <span className="rounded-full bg-secondary/60 px-2 py-0.5">
      {label} <span className={`tabular-nums ${tone}`}>{value}</span>
    </span>
  );
}
