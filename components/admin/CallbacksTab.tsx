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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface CallbackRow {
  rowIndex: number;
  name: string;
  phone: string;
  requestedAt: string;
  status: "pending" | "addressed";
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

// Strip the country code the callback form pre-pends and format the rest
// as a tap-friendly link. Falls back to the raw string if it's shorter
// than 10 digits.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 10 ? digits : raw;
}

export function CallbacksTab({ pin }: { pin: string }) {
  const [callbacks, setCallbacks] = useState<CallbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddressed, setShowAddressed] = useState(false);

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

  const handleAction = async (
    row: CallbackRow,
    action: "mark_addressed" | "mark_pending"
  ) => {
    setUpdating(row.rowIndex);
    try {
      const res = await fetch("/api/admin/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, action, rowIndex: row.rowIndex }),
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
  const addressedCount = callbacks.filter((c) => c.status === "addressed").length;
  const visible = showAddressed
    ? callbacks
    : callbacks.filter((c) => c.status === "pending");

  return (
    <div>
      {/* Summary + refresh */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-3 flex items-center gap-3">
            <Phone size={16} className="text-primary" />
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
                Addressed
              </p>
              <p className="text-lg font-bold">{addressedCount}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddressed((v) => !v)}
            className="px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAddressed ? "Hide addressed" : "Show addressed"}
          </button>
          <button
            onClick={fetchCallbacks}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <RefreshCw
              size={12}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

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
          <div className="hidden md:grid grid-cols-[1.4fr_1fr_1.4fr_0.6fr_1.6fr] gap-3 px-4 py-3 border-b border-white/10 text-[10px] uppercase tracking-wider text-muted-foreground">
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
              return (
                <div
                  key={cb.rowIndex}
                  className={`grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.4fr_0.6fr_1.6fr] gap-3 px-4 py-3 items-center ${
                    isPending ? "" : "opacity-70"
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
                    {cb.addressedAt && (
                      <p className="text-[10px] text-green-400/80 mt-0.5">
                        addressed {formatIST(cb.addressedAt)}
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
                    {isPending ? (
                      <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">
                        Pending
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                        Addressed
                      </Badge>
                    )}
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
                      <Button
                        onClick={() => handleAction(cb, "mark_addressed")}
                        disabled={isBusy}
                        size="sm"
                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30 h-auto py-1.5 px-2.5 text-xs"
                      >
                        {isBusy ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        Mark addressed
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleAction(cb, "mark_pending")}
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
