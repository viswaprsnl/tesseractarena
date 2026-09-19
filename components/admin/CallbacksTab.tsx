"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  Phone,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Clock,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

// Callback outcomes we surface on the admin dashboard. Values match the
// server's CallbackOutcome union so the round-trip through the sheet
// stays clean. "addressed" is a legacy value (from the previous version
// of this route) — treated as "Booked" for display so old rows still
// render meaningfully.
type Outcome = "pending" | "booked" | "enquiry" | "no_answer" | "not_now" | "addressed";
type ResolvedOutcome = Exclude<Outcome, "pending">;

interface CallbackRow {
  rowIndex: number;
  name: string;
  phone: string;
  requestedAt: string;
  status: Outcome;
  addressedAt: string;
}

function formatIST(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return format(toZonedTime(d, "Asia/Kolkata"), "d MMM yyyy · h:mm a");
  } catch {
    return iso;
  }
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 10 ? digits : raw;
}

// The 5-way dropdown the staff picks from. First entry is the default
// state a fresh row lands in (raised by /api/callback), the remaining
// four are the outcome buckets. "addressed" is not in the picker — it
// only exists to render legacy rows, and picking a real outcome will
// migrate the row to one of the four modern buckets.
const STATUS_OPTIONS: {
  value: Outcome;
  label: string;
  className: string;
}[] = [
  {
    value: "pending",
    label: "Callback",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  },
  {
    value: "booked",
    label: "Booked",
    className: "bg-green-500/20 text-green-400 border-green-500/40",
  },
  {
    value: "enquiry",
    label: "Enquiry",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  },
  {
    value: "no_answer",
    label: "No answer",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  },
  {
    value: "not_now",
    label: "Not now",
    className: "bg-muted/40 text-muted-foreground border-white/10",
  },
];

// Pick the tailwind class that colors the status pill matching the
// current option. Legacy "addressed" is displayed as "Booked" style
// (green) — same reasoning as the enum comment above.
function classFor(status: Outcome): string {
  if (status === "addressed") {
    return "bg-green-500/20 text-green-400 border-green-500/40";
  }
  return (
    STATUS_OPTIONS.find((o) => o.value === status)?.className ??
    "bg-muted/30 text-muted-foreground border-white/10"
  );
}

export function CallbacksTab({ pin }: { pin: string }) {
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const fetchCallbacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/callbacks?pin=${encodeURIComponent(pin)}`);
      const data = await res.json();
      if (res.ok) {
        setCallbacks(data.callbacks || []);
      } else {
        setError(data.error || "Failed to load callbacks");
      }
    } catch {
      setError("Failed to load callbacks");
    }
    setLoading(false);
  }, [pin]);

  useEffect(() => {
    fetchCallbacks();
  }, [fetchCallbacks]);

  // Single mutation entry point — the dropdown handler decides whether
  // to resolve (writes outcome + timestamp) or reopen (clears them).
  const changeStatus = async (row: CallbackRow, next: Outcome) => {
    if (next === row.status) return;
    setUpdating(row.rowIndex);
    setError(null);
    try {
      const body =
        next === "pending"
          ? { pin, action: "reopen", rowIndex: row.rowIndex }
          : {
              pin,
              action: "resolve",
              rowIndex: row.rowIndex,
              outcome: next as ResolvedOutcome,
            };
      const res = await fetch("/api/admin/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchCallbacks();
      } else {
        setError(data.error || "Failed to update callback");
      }
    } catch {
      setError("Failed to update callback");
    }
    setUpdating(null);
  };

  const pendingCount = callbacks.filter((c) => c.status === "pending").length;
  const resolvedCount = callbacks.length - pendingCount;
  const visible = showResolved
    ? callbacks
    : callbacks.filter((c) => c.status === "pending");

  // Tally by outcome (excluding pending, since that's the primary
  // "Pending" tile). Shown only once at least one row has been resolved.
  const byOutcome = STATUS_OPTIONS.filter((o) => o.value !== "pending").map(
    (opt) => ({
      ...opt,
      count: callbacks.filter(
        (c) => c.status === opt.value || (opt.value === "booked" && c.status === "addressed")
      ).length,
    })
  );

  return (
    <div>
      {/* Summary + controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="glass-card px-4 py-3 flex items-center gap-3">
            <Phone size={16} className="text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Pending
              </p>
              <p className="text-lg font-bold">{pendingCount}</p>
            </div>
          </div>
          <div className="glass-card px-4 py-3 flex items-center gap-3">
            <CheckCircle2 size={16} className="text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Resolved
              </p>
              <p className="text-lg font-bold">{resolvedCount}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResolved((v) => !v)}
            className="px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showResolved ? "Hide resolved" : "Show resolved"}
          </button>
          <button
            onClick={fetchCallbacks}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Outcome tally — only shown when there are any resolved rows */}
      {resolvedCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 text-xs">
          {byOutcome.map((o) => (
            <span
              key={o.value}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${o.className}`}
            >
              {o.label}: {o.count}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="glass-card p-3 mb-4 border-destructive/30 text-sm text-destructive text-center">
          {error}
        </div>
      )}

      {loading && callbacks.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading callbacks…
        </div>
      ) : visible.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <Phone size={28} className="mx-auto mb-3 text-primary/50" />
          <p className="text-sm">
            {pendingCount === 0
              ? "No pending callbacks. All caught up."
              : "No callbacks match the current filter."}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {/* Table header — desktop only. No separate Actions column;
              the phone is tap-to-call inline and Status is a dropdown. */}
          <div className="hidden md:grid grid-cols-[1.3fr_1fr_1.5fr_1fr] gap-3 px-4 py-3 border-b border-white/10 text-[10px] uppercase tracking-wider text-muted-foreground">
            <div>Requested</div>
            <div>Name</div>
            <div>Phone</div>
            <div>Status</div>
          </div>

          <div className="divide-y divide-white/5">
            {visible.map((cb) => {
              const isBusy = updating === cb.rowIndex;
              const digits = normalizePhone(cb.phone);
              const isPending = cb.status === "pending";
              return (
                <div
                  key={cb.rowIndex}
                  className={`grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1.5fr_1fr] gap-3 px-4 py-3 items-start md:items-center ${
                    isPending ? "" : "opacity-80"
                  }`}
                >
                  {/* Requested */}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider md:hidden mb-0.5">
                      Requested
                    </p>
                    <p className="text-sm flex items-center gap-1.5">
                      <Clock size={12} className="text-primary md:hidden" />
                      {formatIST(cb.requestedAt)}
                    </p>
                    {cb.addressedAt && !isPending && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        resolved {formatIST(cb.addressedAt)}
                      </p>
                    )}
                  </div>

                  {/* Name */}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider md:hidden mb-0.5">
                      Name
                    </p>
                    <p className="text-sm">
                      {cb.name || (
                        <span className="text-muted-foreground italic text-xs">
                          not provided
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Phone — tap-to-call anchor with a small WhatsApp icon
                      link inline. No separate action column. */}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider md:hidden mb-0.5">
                      Phone
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:+${digits}`}
                        className="text-sm font-mono text-primary hover:underline"
                      >
                        {cb.phone}
                      </a>
                      <a
                        href={`https://wa.me/${digits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open WhatsApp chat"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/30 transition-colors"
                      >
                        <WhatsAppIcon size={12} />
                      </a>
                    </div>
                  </div>

                  {/* Status — dropdown that writes to the sheet on change.
                      Default option ("Callback") means the row is still
                      pending; picking any other option resolves it. */}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider md:hidden mb-0.5">
                      Status
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        value={cb.status === "addressed" ? "booked" : cb.status}
                        onChange={(e) =>
                          changeStatus(cb, e.target.value as Outcome)
                        }
                        disabled={isBusy}
                        className={`text-xs font-medium rounded-lg border px-2.5 py-1.5 outline-none cursor-pointer transition-colors disabled:opacity-50 ${classFor(cb.status)}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option
                            key={opt.value}
                            value={opt.value}
                            className="bg-background text-foreground"
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {isBusy && (
                        <Loader2 size={12} className="animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
