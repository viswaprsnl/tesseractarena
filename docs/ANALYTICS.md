# Funnel analytics

Every event listed here fires to BOTH:
- Google Analytics 4 (via `window.gtag`, when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set)
- Vercel Analytics (via `@vercel/analytics` `track()`)

They are sent only on customer-facing routes — `/admin` and `/kiosk`
paths are excluded in `components/GoogleAnalytics.tsx`, so staff
clicks never pollute the funnel.

All events live in [`lib/analytics.ts`](../lib/analytics.ts) as a
typed string-literal union. Add a new event there first, then import
`trackEvent` where you need to fire it.

## Why these specific events

The point is to see **where visitors drop between landing on /book
and paying.** Each row below answers one specific question.

## The booking funnel

| Event | Fires when | Properties | Question it answers |
|---|---|---|---|
| `funnel_landed_book` | /book mounts | `is_kiosk` | How many visitors reach the booking page at all? (denominator) |
| `funnel_date_picked` | User clicks a date (not auto-select) | `is_kiosk` | How many bothered to pick a date? |
| `funnel_slot_picked` | User clicks a slot pill | `is_kiosk` | Did the available slots match what they wanted? |
| `funnel_game_picked` | User picks a game card | `game_id`, `decide_at_venue` | Which games draw clicks? Many `game_id: cleared` means indecision. |
| `funnel_package_confirmed` | Click "Continue" from step 3 | `party_size`, `package`, `decide_at_venue`, `has_discount`, `amount_bucket` | Did the final price shock them off? |
| `funnel_details_submitted` | Submit Details form (passes Turnstile + validation) | `is_kiosk`, `has_special_requests` | Big drop here = Turnstile/form friction |
| `funnel_pay_online_clicked` | Click Pay Online on step 5 | `is_kiosk` | Intent to pay now |
| `funnel_pay_at_center_clicked` | Click Pay at Counter on step 5 | `is_kiosk` | Payment-method preference (vs razorpay) |
| `funnel_booking_created` | Server returned booking row | `payment_method`, `is_kiosk` | Server accepted the booking |
| `funnel_payment_verified` | Razorpay verify succeeded | `is_kiosk`, `party_size` | TRUE online conversion |
| `funnel_payment_cancelled` | User closed the Razorpay sheet | — | Razorpay sheet is where we lose them |

## Marketing CTAs

| Event | Fires when | Properties |
|---|---|---|
| `cta_hero_book_now` | Hero "Book Your Session" clicked | — |
| `cta_book_this_game` | GamePreviewModal "Book This Game" clicked | `game_id` |
| `cta_callback_requested` | Call-me-back form submitted successfully | — |

Future events reserved in the type union (not yet wired):
`cta_whatsapp_clicked`, `cta_phone_clicked`, `cta_game_modal_opened`.

## Reading the funnel in GA4

In Google Analytics 4 → Reports → Engagement → Events, the counts
show one row per event. For a cleaner view:

1. Admin → Custom definitions → Create event scope dimensions for
   `game_id`, `payment_method`, `amount_bucket`, `party_size`.
2. Explore → Funnel exploration → add steps in this order:
   `funnel_landed_book` → `funnel_slot_picked` → `funnel_package_confirmed` →
   `funnel_details_submitted` → `funnel_payment_verified`.
3. GA4 shows per-step drop rate out of the box. The step with the
   biggest fall is where to focus the next UX change.

## Reading the funnel in Vercel

Vercel Analytics → Events shows raw counts per event name per day.
Vercel doesn't do multi-step funnel visualization yet; use GA4 for
that. Vercel's advantage is zero cookie-consent setup and real-time
numbers.

## What NOT to put in `props`

The helper in `lib/analytics.ts` has an explicit comment: do **NOT**
pass PII. Specifically — never add:

- `name`, `email`, `phone` (even hashed)
- `bookingId` (identifies a specific sheet row)
- any string the user typed into a free-form field
- IP, device ID, session ID

If you need user-level analysis later, pass a hashed `user_id` from
the server after login, not here.

## Local verification

GA4 events don't fire in dev unless `NEXT_PUBLIC_GA_MEASUREMENT_ID`
is set in `.env.local`. To test wiring without a real GA key, open
devtools and run:

```js
window.__captured = [];
window.gtag = (...args) => args[0] === 'event' && window.__captured.push(args);
// … walk the funnel …
console.table(window.__captured);
```

Vercel Analytics is harder to inspect locally — it's safe to assume
if the gtag shim catches the call, the Vercel SDK does too (they
share the `trackEvent` wrapper).
