import { expect, test } from "@playwright/test";
import {
  autotestRequestInit,
  getRunId,
  istDateFromNow,
} from "./helpers/autotest-client";

// What this smoke test covers:
//   1. /admin renders a login screen (sanity: the Next route still
//      compiles and the client-side admin bundle still hydrates).
//   2. The real walk-in revenue API accepts a valid payload under the
//      autotest bypass and writes a row to the Revenue sheet.

test.describe("walk-in smoke", () => {
  test("admin page renders a PIN entry", async ({ page }) => {
    await page.goto("/admin");
    // The admin shell shows a password-style PIN input on first load.
    // That single element proves the admin bundle hydrated — a
    // heading-only match would also be fine but Playwright strict
    // mode trips if we try an .or() over both because the real page
    // has both visible at once.
    const pinInput = page
      .locator('input[type="password"], input[type="tel"]')
      .first();
    await expect(pinInput).toBeVisible({ timeout: 10_000 });
  });

  test("revenue API records a walk-in via autotest bypass", async ({ request }) => {
    const payload = {
      date: istDateFromNow(0), // today, since walk-ins are counter sales
      source: "walkin" as const,
      groupType: "squad" as const,
      players: 2,
      revenue: 1,
      paymentMethod: "cash" as const,
      notes: `smoke run ${getRunId()}`,
    };
    const init = autotestRequestInit("POST", payload);
    const res = await request.post("/api/admin/revenue?pin=noop", {
      headers: init.headers as Record<string, string>,
      data: payload,
    });
    const body = await res.json();
    expect(res.status(), `body: ${JSON.stringify(body)}`).toBe(200);
    expect(body.success).toBe(true);
    expect(body.entry.id).toMatch(/^walk-/);
    expect(body.entry.notes).toContain("[AUTOTEST]");
  });
});
