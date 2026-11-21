"use client";

import Script from "next/script";
import { format } from "date-fns";
import {
  CalendarDays,
  Clock,
  Users,
  Gamepad2,
  Check,
  CreditCard,
  Loader2,
  Shield,
  Tag,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getRefundCutoffHours,
  isWeekend,
  withGST,
  gstOn,
  GST_PERCENT,
} from "@/lib/booking-config";
import type { ActiveDiscount } from "@/hooks/use-booking";
import { usePricing } from "@/hooks/use-pricing";
import { sessionAdvance } from "@/lib/pricing";
import type { CouponControls } from "@/hooks/use-discount";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export interface PanelChecklist {
  when: boolean;
  game: boolean;
  details: boolean;
}

interface BookingPanelProps {
  date: string | null;
  slotDisplay: string | null;
  partySize: number;
  gameLabel: string | null;
  isDecideAtVenue: boolean;
  baseTotal: number; // ex-GST, before discount
  amount: number; // ex-GST, after discount
  discount: ActiveDiscount | null;
  coupon: CouponControls;
  checklist: PanelChecklist;
  isKiosk: boolean;
  advanceRequired: boolean;
  processing: boolean;
  error: string | null;
  onPrimary: () => void; // pay online / confirm (or jump to what's missing)
  onPayAtCounter: () => void; // kiosk only
}

export function BookingPanel({
  date,
  slotDisplay,
  partySize,
  gameLabel,
  isDecideAtVenue,
  baseTotal,
  amount,
  discount,
  coupon,
  checklist,
  isKiosk,
  advanceRequired,
  processing,
  error,
  onPrimary,
  onPayAtCounter,
}: BookingPanelProps) {
  const pricing = usePricing();
  const ready = checklist.when && checklist.game && checklist.details;
  const doneCount = [checklist.when, checklist.game, checklist.details].filter(Boolean).length;

  const total = withGST(amount);
  const advance = sessionAdvance(pricing, partySize, amount);
  const advanceWithGST = withGST(advance);
  const balanceWithGST = withGST(amount - advance);
  const payAllAtCounter = isKiosk || !advanceRequired;

  const missing = [
    !checklist.when && "date & time",
    !checklist.game && "game",
    !checklist.details && "your details",
  ].filter(Boolean) as string[];

  const primaryLabel = !ready
    ? `Add ${missing.join(", ").replace(/, ([^,]*)$/, " & $1")}`
    : isKiosk
    ? `Pay ${inr(total)} online now`
    : advanceRequired
    ? `Pay ${inr(advanceWithGST)} & lock my slot`
    : `Confirm booking · pay ${inr(total)} at arena`;

  const cutoffHours = date ? getRefundCutoffHours(date) : null;
  const showOnlinePayment = isKiosk || advanceRequired;

  return (
    <div className="glass-card p-5 space-y-4 text-sm">
      {showOnlinePayment && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs tracking-wider uppercase text-muted-foreground">
          Your session
        </h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">{doneCount}/3 ready</span>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden" aria-hidden>
        <div
          className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-500"
          style={{ width: `${(doneCount / 3) * 100}%` }}
        />
      </div>

      <ul className="space-y-2.5">
        <Row icon={CalendarDays} done={!!date}>
          {date ? format(new Date(date + "T00:00:00"), "EEE, d MMM") : "Pick a date"}
        </Row>
        <Row icon={Clock} done={!!slotDisplay}>
          {slotDisplay ?? "Pick a time"}
        </Row>
        <Row icon={Users} done>
          {partySize} {partySize === 1 ? "player" : "players"}
        </Row>
        <Row icon={Gamepad2} done={!!gameLabel}>
          {gameLabel ?? "Pick a game"}
        </Row>
      </ul>

      <div className="border-t border-white/10 pt-3 space-y-1.5">
        {baseTotal === 0 ? (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total</span>
            <span className="text-muted-foreground">Pick a game to see price</span>
          </div>
        ) : (
          <>
            <Line label={`${partySize} × per person (excl. GST)`} value={inr(baseTotal)} muted />
            {discount && (
              <Line
                label={`${discount.label} (${discount.badge})`}
                value={`− ${inr(discount.amountOff)}`}
                className="text-green-400"
              />
            )}
            <Line label={`GST @ ${GST_PERCENT}%`} value={`+ ${inr(gstOn(amount))}`} muted />
            <div className="flex justify-between items-baseline pt-1.5 border-t border-white/10">
              <span className="text-muted-foreground">
                {isDecideAtVenue ? "Up to" : "Total"}
              </span>
              <span className={`font-bold text-xl tabular-nums ${discount ? "text-green-400" : ""}`}>
                {inr(total)}
              </span>
            </div>
            {payAllAtCounter ? (
              <p className="text-[11px] text-muted-foreground pt-1">
                {isKiosk
                  ? "Pay online now or hand it over at the counter."
                  : "No advance needed — pay at the arena (UPI, card or cash)."}
              </p>
            ) : (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 mt-1 space-y-1">
                <Line label="Due now (advance)" value={inr(advanceWithGST)} className="font-semibold text-primary" />
                <Line label="Balance at the arena" value={inr(balanceWithGST)} muted />
              </div>
            )}
          </>
        )}
      </div>

      {date && baseTotal > 0 && <CouponField coupon={coupon} savings={discount?.amountOff ?? 0} />}

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Button
          type="button"
          onClick={onPrimary}
          disabled={processing}
          className={`w-full h-12 text-sm font-semibold ${
            ready
              ? "bg-primary hover:bg-primary/90 text-primary-foreground glow-violet"
              : "bg-secondary/70 hover:bg-secondary text-muted-foreground"
          }`}
        >
          {processing ? (
            <Loader2 className="animate-spin mr-2" size={18} />
          ) : ready && showOnlinePayment ? (
            <CreditCard className="mr-2" size={18} />
          ) : null}
          {primaryLabel}
        </Button>
        {isKiosk && ready && (
          <Button
            type="button"
            onClick={onPayAtCounter}
            disabled={processing}
            className="w-full h-12 bg-secondary/80 hover:bg-secondary text-foreground border border-white/10"
          >
            Pay {inr(total)} at the counter
          </Button>
        )}
      </div>

      <ul className="space-y-1.5 text-[11px] text-muted-foreground">
        {cutoffHours !== null && (
          <li className="flex gap-2">
            <Check size={12} className="text-primary shrink-0 mt-0.5" />
            <span>
              Free cancellation up to {cutoffHours}h before your slot
              {date ? ` (${isWeekend(date) ? "weekend" : "weekday"} rule)` : ""}. Late cancellations and
              no-shows aren&apos;t refundable.
            </span>
          </li>
        )}
        <li className="flex gap-2">
          <Check size={12} className="text-primary shrink-0 mt-0.5" />
          <span>Private session — the arena is only your group during the slot.</span>
        </li>
        {showOnlinePayment && (
          <li className="flex gap-2">
            <Shield size={12} className="text-primary shrink-0 mt-0.5" />
            <span>UPI, cards & net banking · secured by Razorpay</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function Row({
  icon: Icon,
  done,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className={`flex items-center gap-2.5 ${done ? "" : "text-muted-foreground/60"}`}>
      <Icon size={14} className={done ? "text-primary shrink-0" : "shrink-0"} />
      <span className="truncate">{children}</span>
    </li>
  );
}

function Line({
  label,
  value,
  muted,
  className = "",
}: {
  label: string;
  value: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between gap-3 text-xs ${muted ? "text-muted-foreground" : ""} ${className}`}>
      <span className="truncate">{label}</span>
      <span className="tabular-nums shrink-0">{value}</span>
    </div>
  );
}

function CouponField({ coupon, savings }: { coupon: CouponControls; savings: number }) {
  if (coupon.applied) {
    return (
      <div className="flex items-start justify-between gap-2 rounded-lg border border-white/10 p-2.5">
        <div className="flex items-start gap-2 min-w-0 text-xs">
          <Tag size={14} className={`shrink-0 mt-0.5 ${coupon.won ? "text-green-400" : "text-amber-400"}`} />
          {coupon.won ? (
            <p>
              <span className="font-mono tracking-wider text-green-400">{coupon.applied.code}</span>{" "}
              <span className="text-muted-foreground">applied — saving {inr(savings)}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">
              <span className="font-mono tracking-wider text-amber-400">{coupon.applied.code}</span> is valid, but
              a live offer is giving you a bigger discount, so we&apos;re using that.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={coupon.remove}
          className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Remove coupon"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <details className="group" open={!!coupon.error || !!coupon.input}>
      <summary className="text-xs text-primary cursor-pointer list-none hover:underline underline-offset-4 w-fit">
        Have a coupon code?
      </summary>
      <div className="flex gap-2 mt-2">
        <Input
          value={coupon.input}
          onChange={(e) => coupon.setInput(e.target.value.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              coupon.apply();
            }
          }}
          placeholder="ENTER CODE"
          aria-label="Coupon code"
          maxLength={24}
          className="bg-card/60 border-white/10 text-xs h-9 uppercase tracking-wider font-mono"
          disabled={coupon.busy}
        />
        <Button
          type="button"
          onClick={coupon.apply}
          disabled={!coupon.input.trim() || coupon.busy}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 px-4 shrink-0"
        >
          {coupon.busy ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
        </Button>
      </div>
      {coupon.error && <p className="text-[11px] text-destructive mt-2">{coupon.error}</p>}
    </details>
  );
}
