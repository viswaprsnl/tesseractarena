"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  Phone,
  CheckCircle2,
  RotateCcw,
  Loader2,
  RefreshCw,
  Clock,
  Info,
  PhoneOff,
  XCircle,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

// Resolution outcomes we surface on the admin dashboard. Values MUST
// match the server's CallbackOutcome union so the round-trip through the
// sheet stays clean.
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

// Human-readable timestamp anchored to Asia/Kolkata so the admin sees IST
// regardless of their device clock. Empty input → em-dash.
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

// Strip non-digits so the country code the callback form prepends still
// works with tel:/wa.me. Falls back to the raw string if the digit-only
// form is too short to be a real phone number.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 10 ? digits : raw;
}

// Metadata for each resolution outcome — label, badge color, icon.
// Ordered as the 4 buttons appear in the resolve popover.
const RESOLVE_OPTIONS: {
  outcome: ResolvedOutcome;
  label: string;
  icon: typeof Trophy;
  badgeClass: string;
  buttonClass: string;
}[] = [
  {
    outcome: "booked",
    label: "Booked",
    icon: Trophy,
    badgeClass: "bg-green-500/20 text-green-400",
    buttonClass: "bg-green-500/15 text-green-400 hover:bg-green-500/25",
  },
  {
    outcome: "enquiry",
    label: "Enquiry",
    icon: Info,
    badgeClass: "bg-blue-500/20 text-blue-400",
    buttonClass: "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25",
  },
  {
    outcome: "no_answer",
    label: "No answer",
    icon: PhoneOff,
    badgeClass: "bg-amber-500/20 text-amber-400",
    buttonClass: "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",
  },
  {
    outcome: "not_now",
    label: "Not now",
    icon: XCircle,
    badgeClass: "bg-muted/30 text-muted-foreground",
    buttonClass: "bg-secondary/60 text-muted-foreground hover:bg-secondary",
  },
];

// Legacy rows (pre-outcome-buckets) render as a neutral "Addressed" badge
// so the admin still sees they were handled even without a specific
// outcome. Same category is chosen when status arrives unrecognized.
function badgeFor(status: Outcome): { label: string; className: string } {
  if (status === "pending") {
    return { label: "Pending", className: "bg-amber-500/20 text-amber-400" };
  }
  if (status === "addressed") {
    return { label: "Addressed", className: "bg-green-500/20 text-green-400" };
  }
  const match = RESOLVE_OPTIONS.find((o) => o.outcome === status);
  return match
    ? { label: match.label, className: match.badgeClass }
    : { label: status, className: "bg-secondary text-muted-foreground" };
}

export function CallbacksTab({ pin }: { pin: string }) {
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  // Which row currently has its "resolve" chooser open. Only one at a
  // time so the layout doesn't shift with multiple expanded pickers.
  const [resolvingRow, setResolvingRow] = useState<number | null>(null);

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

  const resolveCallback = async (
    row: CallbackRow,
    outcome: ResolvedOutcome
  ) => {
    setUpdating(row.rowIndex);
    try {
      const res = await fetch("/api/admin/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          action: "resolve",
          rowIndex: row.rowIndex,
          outcome,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResolvingRow(null);
        await fetchCallbacks();
      } else {
        setError(data.error || "Failed to update callback");
      }
    } catch {
      setError("Failed to update callback");
    }
    setUpdating(null);
  };

  const reopenCallback = async (row: CallbackRow) => {
    setUpdating(row.rowIndex);
    try {
      const res = await fetch("/api/admin/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          action: "reopen",
          rowIndex: row.rowIndex,
        }),
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

  // Small tally of each outcome for the summary row.
  const byOutcome = RESOLVE_OPTIONS.map((opt) => ({
    ...opt,
    count: callbacks.filter((c) => c.status === opt.outcome).length,
  }));

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

      {/* Outcome tally — only shown when there are any resolved callbacks */}
      {resolvedCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 text-xs">
          {byOutcome.map((o) => (
            <span
              key={o.outcome}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${o.badgeClass}`}
            >
              <o.icon size={11} />
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
          {/* Table header — desktop only */}
          <div className="hidden md:grid grid-cols-[1.3fr_1fr_1.3fr_0.7fr_1.9fr] gap-3 px-4 py-3 border-b border-white/10 text-[10px] uppercase tracking-wider text-muted-foreground">
            <div>Requested</div>
            <div>Name</div>
            <div>Phone</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-white/5">
            {visible.map((cb) => {
              const isBusy = updating === cb.rowIndex;
              const digits = normalizePhone(cb.phone);
              const isPending = cb.status === "pending";
              const isResolving = resolvingRow === cb.rowIndex;
              const badge = badgeFor(cb.status);
              return (
                <div
                  key={cb.rowIndex}
                  className={`grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1.3fr_0.7fr_1.9fr] gap-3 px-4 py-3 items-start md:items-center ${
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

                  {/* Phone */}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider md:hidden mb-0.5">
                      Phone
                    </p>
                    <p className="text-sm font-mono">{cb.phone}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <Badge className={`${badge.className} text-[10px]`}>
                      {badge.label}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <a
                      href={`tel:+${digits}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs"
                    >
                      <Phone size={12} />
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${digits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition-colors text-xs"
                    >
                      <WhatsAppIcon size={12} />
                      WhatsApp
                    </a>

                    {isPending ? (
                      isResolving ? (
                        // Inline picker — click an outcome to write it to
                        // the sheet, or Cancel to fold the picker back.
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {RESOLVE_OPTIONS.map((opt) => (
                            <button
                              key={opt.outcome}
                              onClick={() => resolveCallback(cb, opt.outcome)}
                              disabled={isBusy}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-xs disabled:opacity-50 ${opt.buttonClass}`}
                            >
                              <opt.icon size={12} />
                              {opt.label}
                            </button>
                          ))}
                          <button
                            onClick={() => setResolvingRow(null)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground text-xs"
                          >
                            {isBusy && (
                              <Loader2 size={12} className="animate-spin" />
                            )}
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setResolvingRow(cb.rowIndex)}
                          size="sm"
                          className="bg-primary/15 text-primary hover:bg-primary/25 h-auto py-1.5 px-2.5 text-xs"
                        >
                          <CheckCircle2 size={12} />
                          Resolve
                        </Button>
                      )
                    ) : (
                      <Button
                        onClick={() => reopenCallback(cb)}
                        disabled={isBusy}
                        variant="outline"
                        size="sm"
                        className="h-auto py-1.5 px-2.5 text-xs border-white/10 text-muted-foreground"
                      >
                        {isBusy ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RotateCcw size={12} />
                        )}
                        Reopen
                      </Button>
                    )}
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
