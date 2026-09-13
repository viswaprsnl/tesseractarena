"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Cake,
  Users,
  Clock,
  Check,
  MessageCircle,
  Loader2,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/booking/DatePicker";
import { TimeSlotGrid } from "@/components/booking/TimeSlotGrid";
import {
  BIRTHDAY_PACKAGES,
  BIRTHDAY_ADDONS,
  BIRTHDAY_ADVANCE_PERCENT,
  birthdayAdvance,
  whatsappBirthdayLink,
  type BirthdayPackage,
  type BirthdayPackageId,
} from "@/data/birthday";
import type { TimeSlot } from "@/lib/booking-types";
import { formatTimeDisplay } from "@/lib/booking-config";

// A self-contained birthday booking wizard. It reuses the shared DatePicker
// and TimeSlotGrid so the picker UX matches the rest of the site, and it
// posts to /api/birthday to create the row, then to /api/payments/create to
// launch Razorpay. Payment success routes to /book/confirmation same as the
// standard flow.

interface BirthdayState {
  step: 1 | 2 | 3 | 4 | 5;
  packageId: BirthdayPackageId;
  selectedDate: string | null;
  selectedSlot: string | null;
  selectedSlotDisplay: string | null;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  birthdayKidName: string;
  birthdayKidAge: string; // Kept as string until submit — the Input is easier that way.
  guestCount: string;
  specialRequests: string;
  addonQty: Record<string, number>;
  availableSlots: TimeSlot[];
  loadingSlots: boolean;
  submitting: boolean;
  error: string | null;
}

// window.Razorpay is already declared as `any` in
// components/booking/PaymentStep.tsx; redeclaring it here (with a stricter
// type) would fail TypeScript's "duplicate global augmentation" check on
// production builds. We just consume it via that existing declaration.

// Parses "extra-kid:2,custom-cake:1" → { "extra-kid": 2, "custom-cake": 1 }.
// Unknown add-on IDs are ignored so URL-tampering can't inject phantom items.
function parseAddonsParam(raw: string | null): Record<string, number> {
  if (!raw) return {};
  const valid = new Set(BIRTHDAY_ADDONS.map((a) => a.id));
  const out: Record<string, number> = {};
  for (const part of raw.split(",")) {
    const [id, qtyStr] = part.split(":");
    if (!id || !valid.has(id)) continue;
    const qty = Math.max(0, Math.min(24, parseInt(qtyStr || "1", 10) || 0));
    if (qty > 0) out[id] = qty;
  }
  return out;
}

export function BirthdayWizard() {
  const router = useRouter();
  const search = useSearchParams();
  const requested = (search.get("package") || "plus") as BirthdayPackageId;
  const initialPkg = BIRTHDAY_PACKAGES.find((p) => p.id === requested)
    ? requested
    : "plus";
  const initialAddons = parseAddonsParam(search.get("addons"));

  const [state, setState] = useState<BirthdayState>({
    step: 1,
    packageId: initialPkg,
    selectedDate: null,
    selectedSlot: null,
    selectedSlotDisplay: null,
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    birthdayKidName: "",
    birthdayKidAge: "",
    guestCount: "",
    specialRequests: "",
    addonQty: initialAddons,
    availableSlots: [],
    loadingSlots: false,
    submitting: false,
    error: null,
  });

  const pkg = BIRTHDAY_PACKAGES.find((p) => p.id === state.packageId)!;

  // Compute total including add-ons.
  const addonTotal = BIRTHDAY_ADDONS.reduce((sum, def) => {
    const qty = state.addonQty[def.id] ?? 0;
    if (qty <= 0) return sum;
    return sum + (def.unit === "per-kid" ? def.price * qty : def.price);
  }, 0);
  const total = pkg.price + addonTotal;
  const advance = birthdayAdvance(total);

  // Fetch slots when date changes.
  useEffect(() => {
    if (!state.selectedDate) return;
    setState((s) => ({ ...s, loadingSlots: true, availableSlots: [] }));
    fetch(`/api/bookings/slots?date=${state.selectedDate}`)
      .then((r) => r.json())
      .then((d) => {
        setState((s) => ({
          ...s,
          availableSlots: d.slots || [],
          loadingSlots: false,
          error: d.error || null,
        }));
      })
      .catch(() =>
        setState((s) => ({
          ...s,
          loadingSlots: false,
          error: "Failed to load slots",
        }))
      );
  }, [state.selectedDate]);

  const goto = (step: BirthdayState["step"]) =>
    setState((s) => ({ ...s, step, error: null }));

  const setAddonQty = (id: string, qty: number) =>
    setState((s) => ({
      ...s,
      addonQty: { ...s.addonQty, [id]: Math.max(0, qty) },
    }));

  const canContinue = (() => {
    switch (state.step) {
      case 1:
        return true;
      case 2:
        return !!state.selectedDate;
      case 3:
        return !!state.selectedSlot;
      case 4: {
        const guests = Number(state.guestCount || 0);
        const age = Number(state.birthdayKidAge || 0);
        return (
          state.parentName.trim().length >= 2 &&
          /@/.test(state.parentEmail) &&
          state.parentPhone.replace(/\D/g, "").length >= 10 &&
          state.birthdayKidName.trim().length >= 1 &&
          age >= 6 && age <= 18 &&
          guests >= 1 &&
          guests <= pkg.maxKids + (state.addonQty["extra-kid"] || 0)
        );
      }
      default:
        return true;
    }
  })();

  const startPayment = async () => {
    setState((s) => ({ ...s, submitting: true, error: null }));
    try {
      const res = await fetch("/api/birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.parentName.trim(),
          email: state.parentEmail.trim(),
          phone: state.parentPhone.replace(/\D/g, ""),
          date: state.selectedDate,
          timeSlot: state.selectedSlot,
          packageId: state.packageId,
          birthdayKidName: state.birthdayKidName.trim(),
          birthdayKidAge: Number(state.birthdayKidAge),
          guestCount: Number(state.guestCount),
          addons: Object.entries(state.addonQty)
            .filter(([, qty]) => qty > 0)
            .map(([id, qty]) => ({ id, qty })),
          specialRequests: state.specialRequests.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setState((s) => ({
          ...s,
          submitting: false,
          error: data.error || "Booking failed",
        }));
        return;
      }
      const { bookingId } = data.booking;

      // Create Razorpay order
      const payRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const payData = await payRes.json();
      if (!payData.orderId) {
        setState((s) => ({
          ...s,
          submitting: false,
          error: "Failed to create payment order",
        }));
        return;
      }

      setState((s) => ({ ...s, submitting: false }));

      const options: Record<string, unknown> = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: payData.amount,
        currency: payData.currency,
        name: "Tesseract Arena",
        description: `Birthday: ${pkg.name} — ${bookingId}`,
        order_id: payData.orderId,
        prefill: payData.prefill,
        theme: { color: "#6C3BFF" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, bookingId }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              router.push(
                `/book/confirmation?id=${bookingId}&amount=${total}&date=${state.selectedDate}&time=${state.selectedSlotDisplay}&players=${state.guestCount}&package=${pkg.name}&payment=paid&advance=${advance}`
              );
            } else {
              setState((s) => ({
                ...s,
                error: "Payment verification failed",
              }));
            }
          } catch {
            setState((s) => ({
              ...s,
              error: "Payment verification failed",
            }));
          }
        },
        modal: {
          ondismiss: () =>
            setState((s) => ({
              ...s,
              error:
                "Payment cancelled. Your booking is still held — retry from your confirmation email or start again.",
            })),
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setState((s) => ({
        ...s,
        submitting: false,
        error: "Something went wrong. Please try again.",
      }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto pt-24 pb-16 px-4">
      <script
        async
        src="https://checkout.razorpay.com/v1/checkout.js"
      />

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`h-1 rounded-full flex-1 max-w-16 transition-colors ${
              state.step >= n ? "bg-primary" : "bg-secondary"
            }`}
          />
        ))}
      </div>

      {state.step > 1 && (
        <button
          onClick={() => goto((state.step - 1) as BirthdayState["step"])}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>
      )}

      {state.error && (
        <div className="glass-card p-4 mb-6 border border-destructive/30 text-sm text-destructive text-center">
          {state.error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1 — Package overview / switch */}
        {state.step === 1 && (
          <motion.div
            key="pkg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2 className="font-heading text-lg text-center mb-2">
              You picked{" "}
              <span className="gradient-text font-bold">{pkg.name}</span>
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-6">
              Change your mind? Pick a different tier below.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              {BIRTHDAY_PACKAGES.map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    setState((s) => ({ ...s, packageId: p.id }))
                  }
                  className={`glass-card p-4 text-left transition-all ${
                    p.id === state.packageId
                      ? "border-primary/40 glow-violet"
                      : "hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-heading text-sm font-bold">
                      {p.name}
                    </span>
                    {p.id === state.packageId && (
                      <Check size={14} className="text-primary" />
                    )}
                  </div>
                  <p className="text-lg font-bold">
                    ₹{p.price.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    up to {p.maxKids} · {p.durationLabel}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={() => goto(2)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Continue with {pkg.name}
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2 — Date */}
        {state.step === 2 && (
          <motion.div
            key="date"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <DatePicker
              selectedDate={state.selectedDate}
              onSelectDate={(date) => {
                setState((s) => ({
                  ...s,
                  selectedDate: date,
                  selectedSlot: null,
                  selectedSlotDisplay: null,
                }));
                goto(3);
              }}
            />
          </motion.div>
        )}

        {/* STEP 3 — Time slot */}
        {state.step === 3 && state.selectedDate && (
          <motion.div
            key="time"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <p className="text-xs text-muted-foreground text-center mb-3">
              {pkg.name} needs <strong>{pkg.slotsBlocked}</strong> back-to-back
              slots starting from your chosen time.
            </p>
            <TimeSlotGrid
              date={state.selectedDate}
              slots={state.availableSlots}
              selectedSlot={state.selectedSlot}
              isLoading={state.loadingSlots}
              onSelectSlot={(slot, displayTime) => {
                setState((s) => ({
                  ...s,
                  selectedSlot: slot,
                  selectedSlotDisplay: displayTime,
                }));
                goto(4);
              }}
            />
          </motion.div>
        )}

        {/* STEP 4 — Details + add-ons */}
        {state.step === 4 && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="font-heading text-lg font-bold mb-4">
                Birthday details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Birthday kid&apos;s name</Label>
                  <Input
                    value={state.birthdayKidName}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        birthdayKidName: e.target.value,
                      }))
                    }
                    placeholder="e.g. Aarav"
                    className="bg-card/60 border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Turning</Label>
                  <Input
                    type="number"
                    min="6"
                    max="18"
                    value={state.birthdayKidAge}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        birthdayKidAge: e.target.value,
                      }))
                    }
                    placeholder="Age (6–18)"
                    className="bg-card/60 border-white/10"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>How many kids in total?</Label>
                  <Input
                    type="number"
                    min="1"
                    max={pkg.maxKids + (state.addonQty["extra-kid"] || 0)}
                    value={state.guestCount}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        guestCount: e.target.value,
                      }))
                    }
                    placeholder={`Up to ${pkg.maxKids} without add-ons`}
                    className="bg-card/60 border-white/10"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {pkg.name} includes up to {pkg.maxKids} kids.
                    {Number(state.guestCount) > pkg.maxKids &&
                    !state.addonQty["extra-kid"]
                      ? " Add the “Extra kid over cap” add-on below to bring more."
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-heading text-lg font-bold mb-4">
                Parent contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Your name</Label>
                  <Input
                    value={state.parentName}
                    onChange={(e) =>
                      setState((s) => ({ ...s, parentName: e.target.value }))
                    }
                    placeholder="Full name"
                    className="bg-card/60 border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Mobile</Label>
                  <Input
                    value={state.parentPhone}
                    onChange={(e) =>
                      setState((s) => ({ ...s, parentPhone: e.target.value }))
                    }
                    placeholder="10 digits"
                    className="bg-card/60 border-white/10"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={state.parentEmail}
                    onChange={(e) =>
                      setState((s) => ({ ...s, parentEmail: e.target.value }))
                    }
                    placeholder="parent@email.com"
                    className="bg-card/60 border-white/10"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-heading text-lg font-bold mb-4">
                Add-ons (optional)
              </h3>
              <div className="space-y-2">
                {BIRTHDAY_ADDONS.map((a) => {
                  const qty = state.addonQty[a.id] ?? 0;
                  return (
                    <div
                      key={a.id}
                      className="glass-card p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {a.label}{" "}
                          <span className="text-xs text-muted-foreground font-normal">
                            · ₹{a.price.toLocaleString("en-IN")}{" "}
                            {a.unit === "per-kid" ? "/ kid" : "flat"}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setAddonQty(a.id, qty - 1)}
                          className="w-7 h-7 rounded bg-secondary hover:bg-primary/20 text-sm"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm">{qty}</span>
                        <button
                          onClick={() => setAddonQty(a.id, qty + 1)}
                          className="w-7 h-7 rounded bg-secondary hover:bg-primary/20 text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Anything else we should know?</Label>
              <Textarea
                value={state.specialRequests}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    specialRequests: e.target.value,
                  }))
                }
                placeholder="Dietary notes, allergies, theme requests, arrival time, etc."
                className="bg-card/60 border-white/10 mt-1"
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={() => goto(5)}
                disabled={!canContinue}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Review &amp; pay
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 5 — Review + pay */}
        {state.step === 5 && (
          <motion.div
            key="pay"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2 className="font-heading text-lg font-bold text-center mb-6">
              Confirm your party
            </h2>
            <BirthdaySummary
              pkg={pkg}
              state={state}
              addonTotal={addonTotal}
              total={total}
              advance={advance}
            />
            <div className="mt-6 space-y-3">
              <Button
                size="lg"
                onClick={startPayment}
                disabled={state.submitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {state.submitting ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <CreditCard size={16} className="mr-2" />
                )}
                Pay ₹{advance.toLocaleString("en-IN")} advance online
              </Button>
              <a
                href={whatsappBirthdayLink(pkg)}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-green-500/40 text-green-400 hover:bg-green-500/10"
                >
                  <MessageCircle size={14} className="mr-2" />
                  Prefer WhatsApp? Chat with us instead
                </Button>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BirthdaySummary({
  pkg,
  state,
  addonTotal,
  total,
  advance,
}: {
  pkg: BirthdayPackage;
  state: BirthdayState;
  addonTotal: number;
  total: number;
  advance: number;
}) {
  return (
    <div className="glass-card p-5 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Package</span>
        <span className="font-medium">{pkg.name}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">
          <Users size={12} className="inline mr-1" /> Kids
        </span>
        <span className="font-medium">{state.guestCount} of up to {pkg.maxKids}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">
          <Cake size={12} className="inline mr-1" /> Birthday
        </span>
        <span className="font-medium">
          {state.birthdayKidName || "—"} · turning {state.birthdayKidAge || "?"}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">
          <Clock size={12} className="inline mr-1" /> When
        </span>
        <span className="font-medium">
          {state.selectedDate} · {formatTimeDisplay(state.selectedSlot || "")}
        </span>
      </div>
      <hr className="border-white/10" />
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{pkg.name}</span>
        <span>₹{pkg.price.toLocaleString("en-IN")}</span>
      </div>
      {addonTotal > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Add-ons</span>
          <span>₹{addonTotal.toLocaleString("en-IN")}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Total</span>
        <span className="font-bold text-lg">
          ₹{total.toLocaleString("en-IN")}
        </span>
      </div>
      <hr className="border-white/10" />
      <div className="flex items-center justify-between">
        <span className="text-primary">Pay online now ({BIRTHDAY_ADVANCE_PERCENT}% advance)</span>
        <span className="font-bold text-primary">
          ₹{advance.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Balance at the arena</span>
        <span className="text-muted-foreground">
          ₹{(total - advance).toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}
