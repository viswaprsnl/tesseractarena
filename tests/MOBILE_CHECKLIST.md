# Mobile smoke checklist

Walk through this on a real device before any launch, after any
visible UI change, and once a week in rotation. The goal is to
catch friction a desktop test wouldn't: fat-finger misses, scroll
glitches, content hidden behind the fixed top chrome, autoplay
quirks on iOS.

## Devices to cover

Rotate these monthly — a volunteer in Hyderabad with any Android
model + one iPhone owner can usually cover the matrix in 30 min.

| Priority | Device class | Example |
|---|---|---|
| **Must** | Mid-range Android | Samsung A-series, Redmi Note, Realme |
| **Must** | Premium Android | Pixel, OnePlus, Samsung S-series |
| Should | Budget Android (slow CPU) | Redmi 10, Realme C-series |
| Should | iPhone (recent) | iPhone 13 / 14 / 15 |
| Nice | iPhone (older) | iPhone SE, iPhone 11 |
| Nice | iPad / Android tablet | — portrait and landscape |

Network: run at least one pass on **actual 4G** (not WiFi) to
catch slow-start video + font load issues.

## Scenario checklists

Each section is a sequence to walk through. Tap `[ ]` on paper or
duplicate this doc; mark anything that stutters, overlaps, or
feels wrong.

### A. Home — first impression

- [ ] Hero video autoplays within 2 seconds, muted
- [ ] Review marquee at hero bottom scrolls smoothly, no flicker
- [ ] Offer bar (top) scrolls text continuously, tap-anywhere goes to /book
- [ ] Nav menu opens, scrolls, and closes without jank
- [ ] "Why Tesseract Arena?" tiles each show a photo backdrop and readable copy
- [ ] "Through the lens" (Inside the arena) strip auto-scrolls, videos play
- [ ] Games library — scroll, tap a card, modal opens, "Book this game" works
- [ ] FAQ pills switch categories, accordion opens one question at a time
- [ ] Testimonials section scrolls without horizontal page overflow
- [ ] Location map loads and is pinchable
- [ ] Footer — WhatsApp / Instagram / YouTube / Facebook buttons all open the right destination

### B. Booking flow — the money path

Pick a weekday evening slot through 2+ players to exercise all branches.

- [ ] Open /book, today's date pre-selected
- [ ] Earliest-today slot pre-highlighted (if any available)
- [ ] Picking a different date re-fetches slots within ~1s
- [ ] Picking a slot auto-scrolls to the slot grid on mobile
- [ ] Package step shows selected date + time in the sidebar
- [ ] Game grid scrolls smoothly, tapping a game highlights it + updates pricing
- [ ] "Decide at venue" tile toggles the pricing hint correctly
- [ ] Players stepper +/- works; buttons disable at min/max
- [ ] Package switcher (Solo/Squad/Party) auto-locks when players crosses a tier
- [ ] Discount code field accepts, validates, applies
- [ ] "Continue" advances to Details; back button restores previous values
- [ ] Details form validates (bad email, missing name, short phone)
- [ ] Turnstile widget shows "Success!" within ~1 second
- [ ] "Continue to Payment" / "Continue to Review" button is correctly labeled
- [ ] Payment step shows the right amount including GST
- [ ] Razorpay checkout opens, test with Razorpay test card (if available)
- [ ] Pay-at-center alternative creates a booking without Razorpay
- [ ] Confirmation page renders with booking ID + session summary
- [ ] Confirmation email + WhatsApp arrive within 1 minute
- [ ] Cancel link in email works

### C. Deep-link booking — one game only

- [ ] From Games Library, tap "City Z" → modal → "Book this game"
- [ ] Lands on /book?game=city-z
- [ ] Package step shows ONLY City Z card (not full grid)
- [ ] Section heading reads "Your game" (not "Choose your game")
- [ ] "Change game — show all titles" link below the single card
- [ ] Tapping Change game reveals the full grid
- [ ] "Decide at venue" tile is hidden until the grid is expanded

### D. Corporate section — scan intent

- [ ] /#corporate anchor jump lands with "CORPORATE & TEAM EVENTS" eyebrow visible (not clipped by nav)
- [ ] Headline + paragraph readable without zoom
- [ ] Pricing callout ("Two games per person — the second one's on us.") shows ₹2,100 struck through and ₹1,599 highlighted
- [ ] WhatsApp CTA opens the right pre-filled message
- [ ] Phone CTA opens the dialer
- [ ] "What's included" card bullets read naturally

### E. Birthday — party flow

- [ ] /birthday loads within 3 seconds on 4G
- [ ] Hero copy readable, "Make it the birthday nobody stops talking about."
- [ ] Package cards show prices, slots, inclusions
- [ ] Booking wizard works end-to-end (same as home flow with birthday package pre-selected)
- [ ] Child-age input accepts correct ranges and rejects out-of-range (3, 25)

### F. Kiosk walk-in flow (counter)

Run this ON the counter tablet, not your personal phone.

- [ ] Tablet PINs into /kiosk with staff PIN
- [ ] "Walk in? Scan to book" QR scans with any phone camera
- [ ] On customer phone, lands on /book?kiosk=1
- [ ] Date = today, slot = earliest-available, step = Package (jumped past Date & Time)
- [ ] "Ask the staff to recommend" tile visible as the first game card (not "Decide at venue")
- [ ] Pick a game → party size → Continue
- [ ] Details form submits without a Turnstile widget (kiosk flow skips it)
- [ ] Payment step shows both "Pay Online" and "Pay at Counter"
- [ ] Pay at Counter completes without opening Razorpay
- [ ] Booking appears on the kiosk roster within 25 seconds
- [ ] Tapping the roster tile opens the waiver QR
- [ ] Each player's waiver signs on their phone, numbered circles turn green

### G. Second tablet — balance collection

- [ ] Tab 2 opens /kiosk/pay, lists outstanding balances
- [ ] Tap a booking → big QR page
- [ ] Customer scans → sees "Finish payment" + balance due
- [ ] Razorpay checkout opens, test payment completes
- [ ] Tab 2 flips to green "Payment received" within 5 seconds
- [ ] Admin bookings page reflects the amount collected

### H. Admin — staff tasks

- [ ] /admin PIN entry works
- [ ] Toolbar shows "Signed in as staff" + Logout
- [ ] Bookings tab lists today's rows; filter by date works
- [ ] Walk-in logger — pick group / players / amount / payment → submit
- [ ] Confirmation row appears instantly
- [ ] Discounts tab — add / edit / remove flow works
- [ ] Settings tab — toggle advance_required, flip back, no stale state
- [ ] Revenue tab (owner PIN) renders charts

### I. Chrome / fixed-element checks

- [ ] Scroll from top to bottom — no element covers readable content
- [ ] Section anchors (#games, #corporate, etc.) land with the headline visible
- [ ] "Call me back" FAB bottom-right doesn't overlap buttons
- [ ] Offer bar + navbar stay fixed, don't flicker during scroll
- [ ] Modal (any) traps focus and closes on tap-outside / X button
- [ ] Keyboard-open on form input doesn't hide the input itself

### J. Performance — eyes-on

- [ ] Scroll smoothly from top to bottom of home — no stutter
- [ ] Lens strip videos pause when scrolled off-screen (check with devtools if available)
- [ ] Switch tabs away for 30s, come back — autoplay videos resume cleanly
- [ ] Lock the phone, unlock — site resumes without errors
- [ ] Rotate from portrait → landscape → portrait — no layout break

## What to do when you find something

- **Visual overlap / clipping**: screenshot + which page + scroll position + device/OS/browser
- **Lag / stutter**: which page + which action + how long it lagged
- **Flow break**: step-by-step reproduction, error messages if any
- **Content issue**: screenshot + what should be there instead

Send all findings to the dev team (currently: text to viswa). Include device model + Android/iOS version at the top of the report.

## Known gaps (don't bother flagging these)

- Lens strip can take 1-2 seconds to start playing videos on 3G
- Razorpay test-mode credit cards may be blocked on live keys — use UPI for test runs
- Hero video is muted by browser policy; sound only plays after a tap on iOS Safari
