import { expect, test } from "@playwright/test";
import {
  autotestEmail,
  autotestRequestInit,
  getRunId,
  istDateFromNow,
} from "./helpers/autotest-client";

// What this smoke test covers:
//   1. The home page renders without a hard error (Hero section).
//   2. The /book page renders the booking wizard (first-step DOM).
//   3. The real booking API accepts a valid payload and returns a
//      bookingId. The payload goes through full server validation —
//      slot availability, game cap, discount lookup, Sheet1 write —
//      which is the plumbing most likely to break.
//
// The actual Razorpay UI isn't exercised; that integration is covered
// by the fact that the bypassed server path still touches
// paymentStatus and amountPaid in Sheet1, and by manual testing of
// the real Razorpay flow when any payment-related code lands.

test.describe("booking smoke", () => {
  test("home page renders", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    // Hero copy / Book Now CTA — if the page errored before React
    // mounted this won't exist.
    await expect(page.getByRole("link", { name: /book now/i }).first()).toBeVisible();
    expect(errors, "page errored during initial render").toEqual([]);
  });

  test("booking page renders the wizard", async ({ page }) => {
    await page.goto("/book");
    // Date picker heading + the Step 1 indicator both exist on the
    // first screen of the wizard. One of them is enough signal that
    // the wizard mounted; checking both would be redundant.
    await expect(page.getByText(/select a date/i)).toBeVisible();
  });

  test("booking API creates a confirmed test booking", async ({ request }) => {
    const date = istDateFromNow(3);
    const payload = {
      name: `AUTOTEST ${getRunId()}`,
      email: autotestEmail(),
      // Dummy +91 number that's clearly non-real. 10 digits so the
      // phone validator accepts it.
      phone: "9000000001",
      date,
      timeSlot: "11:00",
      partySize: 1,
      package: "solo" as const,
      gamePreference: "decide-at-venue",
      paymentMethod: "razorpay" as const,
      specialRequests: `smoke run ${getRunId()}`,
    };
    const init = autotestRequestInit("POST", payload);
    const res = await request.post("/api/bookings", {
      headers: init.headers as Record<string, string>,
      data: payload,
    });
    // If the slot's genuinely full the API returns 409 — bump to the
    // next slot and try one more time before failing. Keeps the suite
    // from going red on a busy real-world day.
    let body = await res.json();
    if (res.status() === 409) {
      const retryPayload = { ...payload, timeSlot: "12:00" };
      const retry = await request.post("/api/bookings", {
        headers: init.headers as Record<string, string>,
        data: retryPayload,
      });
      body = await retry.json();
      expect(retry.status(), `second attempt body: ${JSON.stringify(body)}`).toBe(200);
    } else {
      expect(res.status(), `body: ${JSON.stringify(body)}`).toBe(200);
    }
    expect(body.success).toBe(true);
    expect(body.booking.bookingId).toMatch(/^TA-/);
    // Autotest path forces paid regardless of paymentMethod.
    expect(body.booking.paymentStatus).toBe("paid");
  });
});
