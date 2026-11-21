# Admin overhaul: spec by phase

Scope is the admin app (`/admin`) and its APIs only. **The public website does not change.**
The live site (tesseractarena.com) is the source of truth for prices and what's sold.
The clickable sample is the reference for layout:
https://claude.ai/artifact/B4DhUgu8KhiTwBeNRGq5MY

Each phase ships on its own and leaves the admin working.
Tick the boxes as items land. Open questions sit under the phase that needs them.

## Phase 0 · Done (branch `admin-ops-overhaul`)

- Single-page `/book`; pricing in one place (`lib/pricing.ts`, Setup → Pricing).
- Counter bookings for walk-in, phone and kiosk, plus a month calendar.
- Payments and Expenses sheets; Customers tab.
- `roleForPin` (OWNER_PIN / ADMIN_PIN, same defaults as before) and `POST /api/admin/auth`.

## Phase 1 · Layout and roles

Goal: fewer tabs, and the PIN decides what each person sees.

- [x] **Login and tabs:**
      - One PIN box. `/api/admin/auth` returns the role, and the UI shows tabs for that role only.
      - Remove the owner "unlock" gate (`OwnerGate`).
- [x] **Tabs** (sub-tabs in brackets):
      - Bookings [Calendar & day, Block slots]
      - Customers [All customers, Callbacks]
      - Setup [Games, Discounts, Settings, Pricing (owner)]
      - Owner (owner only) [Overview, Services]
      - The Expenses tab for staff comes in Phase 3. Until then, expenses stay in Owner → Overview.
- [x] **Staff can't see** the Owner tab, Pricing, or month money totals (revenue, profit, ₹ in calendar cells). The day's booked and collected totals stay visible for the cash count.
- [x] **Server:**
      - Every owner-only route answers 403 to a staff PIN: revenue, pricing writes, calendar money, services, expenses totals.
      - Audit each route under `app/api/admin`.
- [x] **Booking card:**
      - shows only the next step (Collect → Check in → Complete); No-show, Discount and Cancel go under **More**.
      - Auto-refresh the day list every 30 s.
- [x] **Payment lists:** every payment-method list has Razorpay and "Card (PoS machine)".
- [x] **Services:** moves under Owner unchanged (same cards and content).

Done when:
- a staff PIN can't reach owner data from the UI or by calling the API;
- the owner sees everything;
- `tsc`, `eslint` and the Playwright admin tests pass.

**Deploy note:** no new settings. The existing OWNER_PIN and ADMIN_PIN are reused; if they're the same value, everyone signs in as owner, as before.

## Phase 2 · Events: birthday and corporate

Goal: staff can book and edit parties and company events, including food, with the right GST.

- [x] **Event booking:** kind, contact, date/time, hours blocked (birthday default 2 h; corporate 2–3 h or the whole day).
      - Birthday: kids playing.
      - Corporate: players, company and GSTIN.
- [x] **Prices** (editable in Pricing, defaults from the live site):
      - birthday ₹1,499/kid (8–24 kids), advance 25%;
      - corporate ₹1,599/person for 2 games (4–32);
      - branded cake ₹1,999 flat, or bring your own (free); basic decor included.
- [x] **Food:**
      - People eating (one count for every item).
      - Toggles: Combo (pizza + fries + drink) ₹200/person; Pasta add-on ₹300/person.
      - Custom items: name, qty, unit price, and 5% or 18% GST.
      - Food can be edited during the party.
- [x] **Bill:** play at 18% GST, food and cake at 5%; shows total, received and balance.
- [x] **Razorpay payment link** for the advance or balance (Razorpay Payment Links API).
- [x] Birthday bookings from the website open in the same event screen.

Built with these assumptions (change if wrong):
- Pasta can be ordered without the combo (each item is its own yes/no).
- Cake is billed at 5%, like food.
- Website birthday bookings still bill food at 18%: the public flow is unchanged. Editing one in the admin re-prices it at 5%.

Open:
- The live site still says "₹300 combo with burger". Should the website text be corrected (a separate, public change)?

## Phase 3 · Daily ops: staff expenses and games played

- [x] **Expenses tab for staff**, with these categories:
      - food partner payment;
      - cleaning wages, helpers;
      - birthday supplies;
      - chair and table rental;
      - maintenance, other.

      An expense can link to a booking ID. Staff see only their own entries; the owner sees all.
- [x] **Food partner payments** count as expenses; food money collected is not revenue.
- [x] **Games played** are ticked at check-in and stored per booking (game × players).
- [x] **Complete step:**
      - new status `completed`;
      - confirm the games played;
      - collect any balance first.

## Phase 4 · Owner analytics

- [x] **Profit** = ticket revenue + (food collected − paid to food partner) − game fees − expenses.
- [x] **Game fees** (settings in Pricing):
      - Anvio: 10% of list price incl. GST; ₹1,199+ games are Anvio.
      - HeroZone: ₹110 per game per person; ₹899 games are HeroZone.
      - A separate birthday Anvio rate (still being agreed).
- [x] **Overview:**
      - KPI tiles with change vs last month, compared on the same dates.
      - Daily money in vs out chart with a per-day hover breakdown (In / Out / Net / GST).
        Monthly bills (rent, electricity) are kept off the daily bars.
      - GST collected card (18% play vs 5% food).
      - Profit waterfall.
      - Cost, payment-method and booking-type breakdowns.
      - Games played by platform with trends; fee table and expense list folded away.

Open:
- Monthly bills are currently rent, salaries, electricity & internet, and software. Change `MONTHLY_BILLS` in `lib/revenue-config.ts` if needed.
- The "Game royalties / credits" expense category would double-count with the auto-calculated fees. Stop logging it, or decide how to handle it.
- Owner → Revenue log keeps the old revenue screen, so nothing is lost.

## Phase 5 · Bill on Complete, sent by WhatsApp and email

- [x] **GST invoice:**
      - Numbered `TA-INV-0001`, sequential per financial year, stored on the booking.
      - Shows GSTIN, SAC codes, CGST/SGST split, line items and payments.
      - Corporate bills carry the company's GSTIN.
- [x] **Bill page** at `/bill/[id]?t=<signed token>`, rendered from booking data each time, so nothing is stored. Customers save it with "Save as PDF". It's a printable page, not a PDF attachment.
- [x] Booking card shows **Bill PDF** and **Resend** once completed.
- [x] **Message:** thank-you text + bill link + Google review link. The template and link are set in Settings (owner).
- [x] **Email** via Resend, when the booking has an email.
- [x] **WhatsApp (click-to-chat for now):** "Send on WhatsApp" opens the chat with the message and bill link filled in, and staff tap Send. The Cloud API can replace this later.
- [ ] **WhatsApp Cloud API** (automatic sending): choose whether to use it.
      - *Click-to-chat*: free, staff tap Send, sends a link only.
      - *WhatsApp Cloud API*: automatic, needs an approved template, charged per message. The number leaves the Business app.
- [ ] **Setting "Send automatically on Complete":** when off, staff choose each time.
- [ ] **Log** sent, failed and resent attempts on the booking.

Needs before go-live:
- Optional: `BUSINESS_GSTIN` to print the GSTIN on bills. Bill links are signed with the existing Razorpay secret (or `BILL_SECRET` if set).
- Optional: subscribe the Razorpay webhook to `payment_link.paid` so paid links update bookings automatically; otherwise staff mark them paid with Collect.
- SAC codes on the bill (not printed yet).

Open:
- Which WhatsApp option?
- GSTIN and SAC codes (check with the accountant).

## Phase 6 · Paytm card machine

- [ ] Get from Paytm, under "EDC billing integration":
      - merchant ID (MID), terminal ID (TID), API key;
      - sandbox access.
- [ ] **Send the amount:**
      - Choosing "Card (PoS machine)" sends the amount and booking ID to the machine via Paytm's POS Sale / Payment Request API.
      - Staff accept the pop-up on the machine.
- [ ] **Check the result:**
      - Poll the status API while "Waiting for card…" is open. Paytm documents no callback; ask them whether a webhook exists.
      - On `COMPLETED`, record a `card` payment with the Paytm transaction ID.
- [x] **Fallback:** choosing Card asks for the machine's approval code and stores it as the payment ref.
- [ ] Status checks must happen the same day: the machine keeps only that day's transactions.
- [ ] **Settings (owner):** machine status and TID.
- [ ] **Env:** `PAYTM_MID`, `PAYTM_TID`, `PAYTM_KEY`.

Docs:
- https://business.paytm.com/docs/api/pos-sale-api
- https://www.paytmpayments.com/docs/pos-connection-via-payment-request
