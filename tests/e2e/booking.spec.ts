import { expect, test } from "@playwright/test";
import {
  AUTOTEST_HEADER,
  autotestEmail,
  autotestRequestInit,
  getAutotestToken,
  getRunId,
  istDateFromNow,
} from "./helpers/autotest-client";

// What this smoke test covers (Tier 2):
//   1. Home page renders — hard crash + bundler + hydration canary.
//   2. /book renders the wizard first step.
//   3. UI click-through: pick a date on the booking page, click a
//      time slot, confirm we advance to the Package step. Proves
//      the step-to-step UX actually works, not just that the first
//      screen mounts.
//   4. Booking API round-trip: POST creates a booking → GET reads
//      it back via /api/admin/bookings → every field we sent must
//      match what the sheet returned → cleanup wipes it → GET
//      confirms it's gone. This is the main "does the system
//      actually work" check.
//   5. Negative tests: a malformed booking payload returns 400,
//      an unauthenticated admin read returns 401. Proves auth and
//      validation still gate those endpoints.

test.describe("booking smoke", () => {
  test("home page renders", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await expect(page.getByRole("link", { name: /book now/i }).first()).toBeVisible();
    expect(errors, "page errored during initial render").toEqual([]);
  });

  test("booking page renders the wizard", async ({ page }) => {
    await page.goto("/book");
    await expect(page.getByText(/select a date/i)).toBeVisible();
  });

  test("booking wizard: date → slot advances to package step", async ({ page }) => {
    await page.goto("/book");
    await expect(page.getByText(/select a date/i)).toBeVisible();

    // Pick the first clickable date in the calendar. DatePicker uses
    // numeric button labels (1..31) with past/unavailable ones
    // disabled, so .filter({ hasText: /^\d+$/ }) + :not(:disabled)
    // gives us the next bookable day the wizard would offer a user.
    const dateButtons = page
      .locator('button:not([disabled])')
      .filter({ hasText: /^\d{1,2}$/ });
    await expect(dateButtons.first()).toBeVisible({ timeout: 10_000 });
    await dateButtons.first().click();

    // Slots load async after date click. Grab the Select-a-Time header
    // first (confirms the grid rendered) then the first enabled slot
    // button. "11:00 AM"-style text — accept 12-hour format.
    await expect(page.getByText(/select a time/i)).toBeVisible({ timeout: 15_000 });
    const slotButtons = page
      .locator('button:not([disabled])')
      .filter({ hasText: /\d{1,2}:\d{2}\s*(AM|PM)/i });
    await expect(slotButtons.first()).toBeVisible({ timeout: 10_000 });
    await slotButtons.first().click();

    // After picking a slot the wizard advances to Step 3 (Package).
    // Look for the Package heading or the "How many players?" copy.
    await expect(
      page.getByText(/package|how many players|party size/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("booking API: round-trip + cleanup self-check", async ({ request }) => {
    const date = istDateFromNow(3);
    const payload = {
      name: `AUTOTEST ${getRunId()}`,
      email: autotestEmail(),
      phone: "9000000001",
      date,
      timeSlot: "11:00",
      partySize: 1,
      package: "solo" as const,
      gamePreference: "decide-at-venue",
      paymentMethod: "razorpay" as const,
      specialRequests: `smoke run ${getRunId()}`,
    };
    const headers = autotestRequestInit("POST", payload).headers as Record<string, string>;

    // STEP 1 — create. 409 on slot conflict retries once at a different
    // time so a busy real-world day doesn't fail the suite.
    let createRes = await request.post("/api/bookings", { headers, data: payload });
    let createdPayload = payload;
    if (createRes.status() === 409) {
      createdPayload = { ...payload, timeSlot: "12:00" };
      createRes = await request.post("/api/bookings", { headers, data: createdPayload });
    }
    expect(createRes.status(), `body: ${await createRes.text()}`).toBe(200);
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    const bookingId = createBody.booking.bookingId;
    expect(bookingId, "bookingId format").toMatch(/^TA-/);
    expect(createBody.booking.paymentStatus, "autotest forces paid").toBe("paid");

    // STEP 2 — read back via admin API. The sheet row should match
    // every piece of the payload exactly. Any mismatch means a
    // column got misaligned, a serializer dropped a field, or the
    // sheet schema drifted — all are regressions worth paging on.
    const readRes = await request.get(
      `/api/admin/bookings?pin=noop&date=${createdPayload.date}`,
      { headers: { [AUTOTEST_HEADER]: getAutotestToken() } }
    );
    expect(readRes.status(), `read-back body: ${await readRes.text()}`).toBe(200);
    const readBody = await readRes.json();
    const row = readBody.bookings.find((b: { bookingId: string }) => b.bookingId === bookingId);
    expect(row, `booking ${bookingId} not found in admin read-back`).toBeDefined();
    expect(row.name, "name mismatch").toBe(createdPayload.name);
    expect(row.email, "email mismatch").toBe(createdPayload.email);
    expect(row.phone, "phone mismatch").toBe(createdPayload.phone);
    expect(row.date, "date mismatch").toBe(createdPayload.date);
    expect(row.timeSlot, "timeSlot mismatch").toBe(createdPayload.timeSlot);
    expect(row.partySize, "partySize mismatch").toBe(createdPayload.partySize);
    expect(row.package, "package mismatch").toBe(createdPayload.package);
    expect(row.paymentStatus, "sheet row paymentStatus mismatch").toBe("paid");
    expect(row.specialRequests, "AUTOTEST marker missing").toContain("[AUTOTEST]");
    expect(row.amount, "amount should be a positive integer").toBeGreaterThan(0);
    // GST is a fixed 18% of amount, rounded. Allow ±2 rupees for the
    // bookings endpoint's own rounding so this doesn't go red on a
    // boundary case.
    expect(Math.abs(row.gstAmount - Math.round(row.amount * 0.18))).toBeLessThanOrEqual(2);

    // STEP 3 — cleanup wipes this run's rows immediately. Confirms the
    // delete path still works end-to-end.
    const cleanupRes = await request.post(
      "/api/admin/autotest-cleanup?olderThanHours=0",
      { headers: { [AUTOTEST_HEADER]: getAutotestToken() } }
    );
    expect(cleanupRes.status(), `cleanup body: ${await cleanupRes.text()}`).toBe(200);
    const cleanupBody = await cleanupRes.json();
    expect(
      cleanupBody.sweptBookings,
      "cleanup didn't sweep the booking we just created"
    ).toContain(bookingId);

    // STEP 4 — read back AGAIN; the row must now be gone. Catches
    // the case where the delete returned 200 but silently didn't
    // actually blank the row.
    const postCleanupRes = await request.get(
      `/api/admin/bookings?pin=noop&date=${createdPayload.date}`,
      { headers: { [AUTOTEST_HEADER]: getAutotestToken() } }
    );
    const postCleanupBody = await postCleanupRes.json();
    const stillThere = postCleanupBody.bookings.find(
      (b: { bookingId: string }) => b.bookingId === bookingId
    );
    expect(stillThere, `booking ${bookingId} still visible after cleanup`).toBeUndefined();
  });

  test("negative: malformed booking payload returns 400", async ({ request }) => {
    // Partysize 99 blows past the max(8) check in the Zod schema, so
    // Zod rejects before any sheet work happens. If this starts
    // returning 200 — e.g. validation got removed in a refactor — we
    // want to know immediately.
    const bad = {
      name: `AUTOTEST ${getRunId()}`,
      email: autotestEmail(),
      phone: "9000000001",
      date: istDateFromNow(3),
      timeSlot: "11:00",
      partySize: 99,
      package: "solo" as const,
      gamePreference: "decide-at-venue",
      paymentMethod: "razorpay" as const,
    };
    const headers = autotestRequestInit("POST", bad).headers as Record<string, string>;
    const res = await request.post("/api/bookings", { headers, data: bad });
    expect(res.status(), `bad payload must 400, got body: ${await res.text()}`).toBe(400);
  });

  test("negative: unauthenticated admin read returns 401", async ({ request }) => {
    // No autotest token, no PIN. The admin bookings endpoint must
    // reject. If this ever flips to 200 we've accidentally shipped a
    // Sheet1 dump as a public endpoint — nightly ping would catch it.
    const res = await request.get(`/api/admin/bookings?pin=obviously-wrong`);
    expect(res.status(), "admin read without auth must 401").toBe(401);
  });
});
