"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, CalendarDays, Gamepad2, UserRound } from "lucide-react";
import { useBooking } from "@/hooks/use-booking";
import { useDiscount } from "@/hooks/use-discount";
import {
  calculateSessionPrice,
  getTodayISTString,
  formatTimeDisplay,
  withGST,
} from "@/lib/booking-config";
import { DECIDE_AT_VENUE_ID } from "@/lib/booking-types";
import { allGames } from "@/data/games";
import { usePricing } from "@/hooks/use-pricing";
import { gamePrice, maxGamePrice, sessionAdvance } from "@/lib/pricing";
import { trackEvent, partySizeBucket } from "@/lib/analytics";
import { DatePicker } from "./DatePicker";
import { TimeSlotGrid } from "./TimeSlotGrid";
import { GamePicker } from "./GamePicker";
import { BookingPanel } from "./BookingPanel";
import {
  EMPTY_DETAILS,
  TURNSTILE_SITEKEY,
  detailsSchema,
  type Details,
} from "./details-schema";

// The details form pulls in Turnstile; it's below the fold on every
// viewport, so load it separately to keep the first paint light.
const PersonalDetailsForm = dynamic(
  () => import("./PersonalDetailsForm").then((m) => m.PersonalDetailsForm),
  { loading: () => <div className="h-56 rounded-xl bg-secondary/30 animate-pulse" />, ssr: false }
);

type SectionId = "when" | "game" | "details";

const isDesktop = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

function scrollToEl(el: HTMLElement | null, offset = 96) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}

export function BookingWizard({
  preselectedGame,
  isKiosk = false,
}: {
  preselectedGame?: string;
  isKiosk?: boolean;
}) {
  const router = useRouter();
  const { state, dispatch } = useBooking({
    initialGame: preselectedGame,
    initialKiosk: isKiosk,
  });

  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  // Flips true the first time the customer taps Pay with something
  // missing — from then on every outstanding field error is shown.
  const [attempted, setAttempted] = useState(false);
  const [processing, setProcessing] = useState(false);

  const sectionRefs = {
    when: useRef<HTMLElement | null>(null),
    game: useRef<HTMLElement | null>(null),
    details: useRef<HTMLElement | null>(null),
  };
  const timeSlotRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // ── Derived pricing ────────────────────────────────────────────────
  const isDecideAtVenue = state.selectedGame === DECIDE_AT_VENUE_ID;
  const game = allGames.find((g) => g.id === state.selectedGame) ?? null;
  const pricing = usePricing();
  // "Decide at venue" holds the slot at the priciest game, like the server.
  const perPerson = isDecideAtVenue ? maxGamePrice(pricing) : game ? gamePrice(pricing, game.id) : 0;
  const baseTotal = perPerson ? calculateSessionPrice(perPerson, state.partySize) : 0;
  const { amount, activeDiscount, couponCode, coupon } = useDiscount({
    sessionDate: state.selectedDate,
    packageType: state.packageType,
    baseTotal,
  });
  const gameLabel = isDecideAtVenue
    ? isKiosk
      ? "Staff pick at the counter"
      : "Decide at the arena"
    : game?.title ?? null;

  // ── Completeness ───────────────────────────────────────────────────
  const needsTurnstile = !isKiosk && !!TURNSTILE_SITEKEY;
  const whenDone = !!state.selectedDate && !!state.selectedSlot;
  const gameDone = !!state.selectedGame && baseTotal > 0;
  const detailsValid = detailsSchema.safeParse(details).success;
  const detailsDone = detailsValid && (!needsTurnstile || !!turnstileToken);
  const ready = whenDone && gameDone && detailsDone;
  const firstMissing: SectionId | null = !whenDone
    ? "when"
    : !gameDone
    ? "game"
    : !detailsDone
    ? "details"
    : null;

  // ── Settings: is the online advance enforced right now? ────────────
  // Defaults to true so a settings outage never silently drops the advance.
  const [advanceRequired, setAdvanceRequired] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data.advanceRequired === "boolean") {
          setAdvanceRequired(data.advanceRequired);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Slots ──────────────────────────────────────────────────────────
  const fetchSlots = async (date: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const res = await fetch(`/api/bookings/slots?date=${date}`);
      const data = await res.json();
      if (data.slots) {
        dispatch({ type: "SET_SLOTS", slots: data.slots });
      } else {
        dispatch({ type: "SET_ERROR", error: data.error || "Failed to load slots" });
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "Failed to load available slots" });
    }
    dispatch({ type: "SET_LOADING", loading: false });
  };

  // Land on today's availability, and count the funnel entry.
  useEffect(() => {
    trackEvent("funnel_landed_book", { is_kiosk: isKiosk });
    if (state.selectedDate) return;
    const today = getTodayISTString();
    dispatch({ type: "SET_DATE", date: today });
    fetchSlots(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kiosk: a walk-in almost always wants the next slot — pick it for them
  // once, as soon as today's slots arrive. They can still change it.
  const didKioskAutoPick = useRef(false);
  useEffect(() => {
    if (!isKiosk || didKioskAutoPick.current || state.selectedSlot) return;
    const earliest = state.availableSlots.find((s) => s.status === "available");
    if (!earliest) return;
    didKioskAutoPick.current = true;
    dispatch({ type: "SET_SLOT", slot: earliest.time, displayTime: earliest.displayTime });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKiosk, state.availableSlots]);

  const handleDateSelect = (date: string) => {
    dispatch({ type: "SET_DATE", date });
    fetchSlots(date);
    trackEvent("funnel_date_picked", { is_kiosk: isKiosk });
    // On phones the slots stack under the calendar — bring them into view.
    if (!isDesktop()) requestAnimationFrame(() => scrollToEl(timeSlotRef.current, 80));
  };

  const handleSlotSelect = (time: string, displayTime: string) => {
    dispatch({ type: "SET_SLOT", slot: time, displayTime });
    trackEvent("funnel_slot_picked", { is_kiosk: isKiosk });
    // Guide phones to the next thing still missing. On desktop the
    // sections are visible enough that jumping would feel jarring.
    if (!isDesktop() && !gameDone) {
      requestAnimationFrame(() => scrollToEl(sectionRefs.game.current));
    }
  };

  const handleGameChange = (gameId: string) => {
    dispatch({ type: "SET_GAME", gameId });
    trackEvent("funnel_game_picked", {
      game_id: gameId,
      decide_at_venue: gameId === DECIDE_AT_VENUE_ID,
    });
  };

  // ── Funnel milestones ──────────────────────────────────────────────
  // There's no "Continue" click any more, so the old step events fire the
  // first time each milestone is reached. Event names are unchanged so the
  // GA4 funnel keeps working.
  const firedPackage = useRef(false);
  useEffect(() => {
    if (firedPackage.current || !whenDone || !gameDone) return;
    firedPackage.current = true;
    trackEvent("funnel_package_confirmed", {
      party_size: partySizeBucket(state.partySize),
      package: state.packageType,
      decide_at_venue: isDecideAtVenue,
      has_discount: !!activeDiscount,
      amount_bucket:
        amount < 2000 ? "lt_2k" : amount < 5000 ? "2k_5k" : amount < 10000 ? "5k_10k" : "gt_10k",
    });
  }, [whenDone, gameDone, state.partySize, state.packageType, isDecideAtVenue, activeDiscount, amount]);

  const firedDetails = useRef(false);
  useEffect(() => {
    if (firedDetails.current || !detailsDone) return;
    firedDetails.current = true;
    trackEvent("funnel_details_submitted", {
      is_kiosk: isKiosk,
      has_special_requests: !!details.specialRequests?.trim(),
    });
  }, [detailsDone, isKiosk, details.specialRequests]);

  // ── Booking submission ─────────────────────────────────────────────
  const createBooking = async (paymentMethod: "razorpay" | "pay_at_center") => {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: details.name.trim(),
        email: details.email.trim(),
        phone: details.phone.trim(),
        date: state.selectedDate,
        timeSlot: state.selectedSlot,
        partySize: state.partySize,
        package: state.packageType,
        gamePreference: state.selectedGame || "",
        paymentMethod,
        specialRequests: details.specialRequests?.trim() || "",
        // Only when the coupon beat every auto-apply campaign; the server
        // re-validates independently.
        ...(couponCode ? { couponCode } : {}),
        ...(turnstileToken ? { turnstileToken } : {}),
        // Kiosk bookings are exempt from the server's no-advance rewrite.
        ...(isKiosk ? { isKiosk: true } : {}),
      }),
    });
    return res.json();
  };

  const fail = (error: string) => {
    dispatch({ type: "SET_ERROR", error });
    setProcessing(false);
  };

  const handlePayOnline = async () => {
    trackEvent("funnel_pay_online_clicked", { is_kiosk: isKiosk });
    setProcessing(true);
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const bookingData = await createBooking("razorpay");
      if (!bookingData.success) return fail(bookingData.error || "Booking failed");

      const bookingId: string = bookingData.booking.bookingId;
      const total: number = bookingData.booking.amount;
      trackEvent("funnel_booking_created", { payment_method: "razorpay", is_kiosk: isKiosk });

      // Kiosk charges the full ticket; online charges the advance. The
      // amount is derived server-side from bookingId (tamper-proof).
      const payRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, payFull: isKiosk }),
      });
      const payData = await payRes.json();
      if (!payData.orderId) return fail("Failed to create payment order");

      setProcessing(false);
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: payData.amount,
        currency: payData.currency,
        name: "Tesseract Arena",
        description: `VR Session - ${bookingId}`,
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
              body: JSON.stringify({ ...response, bookingId, payFull: isKiosk }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
              dispatch({ type: "SET_ERROR", error: "Payment verification failed" });
              return;
            }
            // The server decides what was charged; fall back to the full
            // amount only if an older deploy didn't return it.
            const advancePaid: number = verifyData.amountPaid ?? total;
            trackEvent("funnel_payment_verified", {
              is_kiosk: isKiosk,
              party_size: partySizeBucket(state.partySize),
            });
            router.push(
              `/book/confirmation?id=${bookingId}&amount=${total}&date=${state.selectedDate}&time=${state.selectedSlotDisplay}&players=${state.partySize}&package=${state.packageType}&payment=paid&advance=${advancePaid}`
            );
          } catch {
            dispatch({ type: "SET_ERROR", error: "Payment verification failed" });
          }
        },
        modal: {
          ondismiss: () => {
            trackEvent("funnel_payment_cancelled");
            dispatch({
              type: "SET_ERROR",
              error: "Payment cancelled. Your slot is reserved — you can try again or pay at the center.",
            });
          },
        },
      });
      rzp.open();
    } catch {
      fail("Something went wrong. Please try again.");
    }
  };

  const handlePayAtCenter = async () => {
    trackEvent("funnel_pay_at_center_clicked", { is_kiosk: isKiosk });
    setProcessing(true);
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const bookingData = await createBooking("pay_at_center");
      if (!bookingData.success) {
        return fail(bookingData.error || "Could not confirm the booking. Please ask the counter staff.");
      }
      const bookingId = bookingData.booking.bookingId;
      const total = bookingData.booking.amount;
      trackEvent("funnel_booking_created", { payment_method: "pay_at_center", is_kiosk: isKiosk });
      const timeDisplay = state.selectedSlotDisplay || formatTimeDisplay(state.selectedSlot!);
      router.push(
        `/book/confirmation?id=${bookingId}&amount=${total}&date=${state.selectedDate}&time=${encodeURIComponent(timeDisplay)}&players=${state.partySize}&package=${state.packageType}&payment=pay_at_center&advance=0`
      );
    } catch {
      fail("Something went wrong. Please try again or ask the counter staff.");
    }
  };

  // One button for everything: if something's missing, take the customer
  // straight to it; otherwise pay (or confirm, when no advance is needed).
  const handlePrimary = () => {
    if (processing) return;
    if (firstMissing) {
      setAttempted(true);
      scrollToEl(sectionRefs[firstMissing].current);
      return;
    }
    if (isKiosk || advanceRequired) handlePayOnline();
    else handlePayAtCenter();
  };

  // ── Mobile sticky bar ──────────────────────────────────────────────
  // Shown on phones until the summary panel itself scrolls into view
  // (at which point it would just duplicate the panel's button).
  const [panelVisible, setPanelVisible] = useState(false);
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), {
      threshold: 0.15,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const showStickyBar = !panelVisible;

  // Hides the global "Call me back" FAB while the sticky bar is up, so it
  // doesn't sit on top of the bar's button (rule lives in globals.css).
  useEffect(() => {
    document.body.classList.toggle("has-booking-sticky-cta", showStickyBar);
    return () => document.body.classList.remove("has-booking-sticky-cta");
  }, [showStickyBar]);

  const total = withGST(amount);
  const dueNow = isKiosk || !advanceRequired ? total : withGST(sessionAdvance(pricing, state.partySize, amount));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8 items-start">
        <div className="space-y-6">
          <Section
            id="when"
            ref={sectionRefs.when}
            icon={CalendarDays}
            title={isKiosk ? "Your slot today" : "When are you coming?"}
            done={whenDone}
            recap={
              whenDone && state.selectedDate
                ? `${format(new Date(state.selectedDate + "T00:00:00"), "EEE, d MMM")} · ${state.selectedSlotDisplay}`
                : null
            }
            hint={attempted && !whenDone ? "Pick a date and a time slot" : null}
          >
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6 md:gap-8">
              <DatePicker selectedDate={state.selectedDate} onSelectDate={handleDateSelect} />
              <div ref={timeSlotRef} className="scroll-mt-24">
                {state.selectedDate ? (
                  <TimeSlotGrid
                    date={state.selectedDate}
                    slots={state.availableSlots}
                    selectedSlot={state.selectedSlot}
                    isLoading={state.isLoading}
                    onSelectSlot={handleSlotSelect}
                  />
                ) : (
                  <div className="h-full min-h-[220px] flex items-center justify-center text-sm text-muted-foreground text-center">
                    Pick a date to see open slots.
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section
            id="game"
            ref={sectionRefs.game}
            icon={Gamepad2}
            title="Who's playing what?"
            done={gameDone}
            recap={gameDone ? `${state.partySize} × ${gameLabel}` : null}
            hint={attempted && !gameDone ? "Choose a game, or pick it at the arena" : null}
          >
            <GamePicker
              partySize={state.partySize}
              selectedGame={state.selectedGame}
              onPartySizeChange={(size) => dispatch({ type: "SET_PARTY_SIZE", size })}
              onGameChange={handleGameChange}
              isKiosk={isKiosk}
              advanceRequired={advanceRequired}
              preselectedGame={preselectedGame}
            />
          </Section>

          <Section
            id="details"
            ref={sectionRefs.details}
            icon={UserRound}
            title="Your details"
            done={detailsDone}
            recap={detailsDone ? details.name.trim() : null}
            hint={
              attempted && !detailsDone
                ? detailsValid && needsTurnstile && !turnstileToken
                  ? "Waiting for the quick security check below"
                  : "Fill in your name, phone and email"
                : null
            }
          >
            <PersonalDetailsForm
              values={details}
              onChange={setDetails}
              showAllErrors={attempted}
              isKiosk={isKiosk}
              onTurnstileToken={setTurnstileToken}
            />
          </Section>
        </div>

        <aside ref={panelRef} className="lg:sticky lg:top-24 scroll-mt-24">
          <BookingPanel
            date={state.selectedDate}
            slotDisplay={state.selectedSlotDisplay}
            partySize={state.partySize}
            gameLabel={gameLabel}
            isDecideAtVenue={isDecideAtVenue}
            baseTotal={baseTotal}
            amount={amount}
            discount={activeDiscount}
            coupon={coupon}
            checklist={{ when: whenDone, game: gameDone, details: detailsDone }}
            isKiosk={isKiosk}
            advanceRequired={advanceRequired}
            processing={processing}
            error={state.error}
            onPrimary={handlePrimary}
            onPayAtCounter={handlePayAtCenter}
          />
        </aside>
      </div>

      {/* Phone-only bottom bar: running total + one button that either
          jumps to what's missing or to the summary to pay. */}
      {showStickyBar && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-background/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 truncate">
              {ready ? "Ready to book" : `${[whenDone, gameDone, detailsDone].filter(Boolean).length}/3 ready`}
            </p>
            <p className="text-base font-semibold tabular-nums">
              {baseTotal > 0 ? (
                <>
                  ₹{dueNow.toLocaleString("en-IN")}
                  <span className="text-[11px] text-muted-foreground font-normal ml-1">
                    {isKiosk || !advanceRequired ? "total" : "due now"}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground font-normal">Pick a game for price</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (firstMissing) {
                scrollToEl(sectionRefs[firstMissing].current);
              } else {
                scrollToEl(panelRef.current);
              }
            }}
            className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground px-5 h-11 rounded-lg font-medium transition-colors glow-violet"
          >
            {firstMissing ? "Next →" : "Review & pay →"}
          </button>
        </div>
      )}
      {/* Room for the sticky bar so it never covers the last field. */}
      <div className="h-20 lg:hidden" aria-hidden />
    </div>
  );
}

// A booking section card: numbered by icon rather than step, with a tick
// and one-line recap once it's complete so the page reads as a checklist.
function Section({
  id,
  ref,
  icon: Icon,
  title,
  done,
  recap,
  hint,
  children,
}: {
  id: SectionId;
  ref: React.Ref<HTMLElement>;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  done: boolean;
  recap: string | null;
  hint: string | null;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`book-${id}`}
      ref={ref}
      aria-labelledby={`book-${id}-title`}
      className={`glass-card p-5 sm:p-6 scroll-mt-24 transition-colors ${
        hint ? "border-destructive/40" : done ? "border-primary/25" : ""
      }`}
    >
      <header className="flex items-center gap-3 mb-5">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            done ? "bg-primary text-primary-foreground" : "bg-primary/10 border border-primary/30 text-primary"
          }`}
        >
          {done ? <Check size={16} /> : <Icon size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={`book-${id}-title`} className="font-heading text-base sm:text-lg font-bold leading-tight">
            {title}
          </h2>
          {hint ? (
            <p className="text-xs text-destructive mt-0.5">{hint}</p>
          ) : recap ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{recap}</p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}
