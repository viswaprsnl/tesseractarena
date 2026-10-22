// Thin analytics wrapper. Fires the same event to both GA4 (gtag) and
// Vercel Analytics (track) so the funnel shows up in whichever
// dashboard we look at. Safe to call from client code — no-ops when
// neither sink is loaded (SSR, local dev without a GA key, blocked by
// an ad-blocker). Never throws, never awaits.
//
// Why a wrapper and not direct gtag calls scattered around:
//   - One place to add a new sink later (PostHog, Mixpanel) without
//     touching every call site.
//   - One place to strip PII before it leaves the browser — do NOT
//     add name/email/phone to any `props` object here. Pass hashed
//     or categorical values only (e.g. partySize bucket, has_discount
//     boolean, package type).
//   - Lets us keep event names consistent as string literals so a
//     typo doesn't silently split a funnel across two labels.

import { track as vercelTrack } from "@vercel/analytics";

// Canonical funnel event names. The order is roughly the booking
// journey — add new ones in flow order so dashboards stay readable.
export type FunnelEvent =
  // Page-level
  | "funnel_landed_book"
  // Step 1 — date + time
  | "funnel_date_picked"
  | "funnel_slot_picked"
  // Step 3 — package + game
  | "funnel_game_picked"
  | "funnel_package_confirmed"
  // Step 4 — details
  | "funnel_details_submitted"
  // Step 5 — payment
  | "funnel_pay_online_clicked"
  | "funnel_pay_at_center_clicked"
  | "funnel_booking_created"
  | "funnel_payment_verified"
  | "funnel_payment_cancelled"
  // High-level CTA clicks on marketing surfaces
  | "cta_hero_book_now"
  | "cta_whatsapp_clicked"
  | "cta_phone_clicked"
  | "cta_callback_requested"
  | "cta_book_this_game"
  | "cta_game_modal_opened";

// Event properties — keep these PII-free. Anything that identifies an
// individual (name, email, phone, device ID) does NOT belong here.
// Bucket free-form values before passing (e.g. party_size: 1-2 / 3-5 /
// 6-8 instead of the raw integer) if you worry about re-identification.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventProps = Record<string, string | number | boolean | undefined>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

export function trackEvent(name: FunnelEvent, props?: EventProps): void {
  if (typeof window === "undefined") return;

  // GA4 — gtag may not be loaded (ad-blocker, no measurement ID set,
  // or we're on an excluded path like /admin / /kiosk). The call is
  // guarded, not awaited.
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, props || {});
    }
  } catch {
    // Swallow — never let analytics break the booking flow.
  }

  // Vercel Analytics — the SDK handles its own loading state and
  // no-ops when the <Analytics /> component isn't mounted. Wrapping
  // in try/catch is defense-in-depth against future SDK changes.
  try {
    vercelTrack(name, props || {});
  } catch {
    // Same — analytics must never break booking.
  }
}

// Convenience bucketer for party size — collapses 1-8 to the three
// pricing tiers so dashboards don't fragment the funnel across 8
// cardinal values.
export function partySizeBucket(size: number): "solo" | "squad" | "party" {
  if (size <= 1) return "solo";
  if (size <= 5) return "squad";
  return "party";
}
