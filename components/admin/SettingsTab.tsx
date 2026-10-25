"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Ghost, Loader2, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Admin controls for app-level flags (not per-booking settings — those
// live on the booking row). The one knob here right now is
// advance_required, which turns the ₹500/head Razorpay advance step on
// or off for online bookings. Owner or staff PIN can flip it; the
// change propagates within ~60s (settings cache TTL) and the booking
// wizard re-reads /api/settings on each mount.

interface SettingsTabProps {
  pin: string;
}

interface SettingsResponse {
  rows: Array<{
    key: string;
    value: string;
    updatedAt: string;
    updatedBy: string;
  }>;
  resolved: {
    advanceRequired: boolean;
    halloweenMode: boolean;
  };
}

export function SettingsTab({ pin }: SettingsTabProps) {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPulse, setSavedPulse] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/settings?pin=${encodeURIComponent(pin)}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Load failed");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [pin]);

  useEffect(() => {
    load();
  }, [load]);

  // Generic PATCH — same shape for every flag, just a different
  // payload key. Avoids repeating the fetch + error + saved-pulse
  // dance per setting.
  const patchSetting = async (payload: Record<string, boolean>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/settings?pin=${encodeURIComponent(pin)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");
      // Pulse the green check for 1.5s so staff get visual feedback
      // that the write succeeded.
      setSavedPulse(true);
      setTimeout(() => setSavedPulse(false), 1500);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleAdvance = (next: boolean) =>
    patchSetting({ advanceRequired: next });
  const toggleHalloween = (next: boolean) =>
    patchSetting({ halloweenMode: next });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading settings…</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-card p-6 border-destructive/30 text-center">
        <p className="text-sm text-destructive mb-3">{error}</p>
        <Button onClick={load} variant="outline" className="text-xs">
          Retry
        </Button>
      </div>
    );
  }

  const advanceRequired = data?.resolved.advanceRequired ?? true;
  const halloweenMode = data?.resolved.halloweenMode ?? false;
  const advanceRow = data?.rows.find((r) => r.key === "advance_required");
  const halloweenRow = data?.rows.find((r) => r.key === "halloween_mode");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <SettingsIcon size={18} className="text-primary" />
        <h2 className="font-heading text-lg font-bold">Settings</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        App-level flags. Changes propagate to the booking site within a minute.
      </p>

      {/* advance_required toggle */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">
              Require advance payment on online bookings
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              When ON (default), customers pay ₹500/head via Razorpay to
              confirm. When OFF, bookings go through without any upfront
              payment — the full amount is collected at the arena.
            </p>
            {advanceRow && (
              <p className="text-[11px] text-muted-foreground/70 mt-2 font-mono">
                Last changed:{" "}
                {new Date(advanceRow.updatedAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                · by {advanceRow.updatedBy}
              </p>
            )}
          </div>

          <button
            onClick={() => toggleAdvance(!advanceRequired)}
            disabled={saving}
            aria-pressed={advanceRequired}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              advanceRequired ? "bg-primary" : "bg-muted"
            } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                advanceRequired ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* State pill — makes current value scannable at a glance */}
        <div className="mt-4 flex items-center gap-2 pt-4 border-t border-white/5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Current state:
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              advanceRequired
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}
          >
            {advanceRequired ? "Advance required" : "No advance — pay at arena"}
          </span>
          {savedPulse && (
            <span className="inline-flex items-center gap-1 text-xs text-green-400">
              <Check size={14} />
              Saved
            </span>
          )}
        </div>

        {/* Warning banner shown ONLY when the toggle is off, so staff
            notice the experiment is live every time they open this
            tab. */}
        {!advanceRequired && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
            <AlertTriangle
              size={14}
              className="text-amber-400 shrink-0 mt-0.5"
            />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <span className="font-semibold text-amber-300">
                Experiment active:
              </span>{" "}
              Bookings don&apos;t require an advance. No-shows have no
              financial penalty, so track booking vs show-up rate daily.
              Flip this back on if abuse spikes.
            </div>
          </div>
        )}
      </div>

      {/* halloween_mode toggle — seasonal decorations overlay the
          customer site when ON. Default OFF. Changes propagate
          within ~60s like every other flag. */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Ghost size={14} className="text-orange-400" />
              Halloween decorations
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              When ON, the public site layers on hanging ghosts, a
              flying ghost, pumpkins, and a distant-lightning flash.
              Decorations only — booking, pricing and admin flows are
              untouched.
            </p>
            {halloweenRow && (
              <p className="text-[11px] text-muted-foreground/70 mt-2 font-mono">
                Last changed:{" "}
                {new Date(halloweenRow.updatedAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                · by {halloweenRow.updatedBy}
              </p>
            )}
          </div>

          <button
            onClick={() => toggleHalloween(!halloweenMode)}
            disabled={saving}
            aria-pressed={halloweenMode}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              halloweenMode ? "bg-orange-500" : "bg-muted"
            } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                halloweenMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 pt-4 border-t border-white/5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Current state:
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              halloweenMode
                ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                : "bg-muted/40 text-muted-foreground border border-white/10"
            }`}
          >
            {halloweenMode ? "Halloween mode ON" : "Off"}
          </span>
        </div>
      </div>

      {error && (
        <div className="glass-card p-3 border-destructive/30 text-xs text-destructive text-center">
          {error}
        </div>
      )}
    </div>
  );
}
