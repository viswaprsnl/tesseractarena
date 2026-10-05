import { expect, test } from "@playwright/test";
import {
  AUTOTEST_HEADER,
  autotestRequestInit,
  getAutotestToken,
  getRunId,
  istDateFromNow,
} from "./helpers/autotest-client";

// What this smoke test covers (Tier 2):
//   1. /admin renders a PIN entry — hard crash + hydration canary.
//   2. Walk-in revenue API round-trip: POST creates a walk-in row →
//      GET through /api/admin/bookings (which includes walkins for
//      the given date) finds it → cleanup wipes it → GET confirms
//      it's gone.
//   3. Negative test: a /admin/revenue POST with no token and a wrong
//      PIN must 401. Catches the case where someone disables auth
//      and makes the finance sheet publicly writable.

test.describe("walk-in smoke", () => {
  test("admin page renders a PIN entry", async ({ page }) => {
    await page.goto("/admin");
    const pinInput = page
      .locator('input[type="password"], input[type="tel"]')
      .first();
    await expect(pinInput).toBeVisible({ timeout: 10_000 });
  });

  test("revenue API: round-trip + cleanup self-check", async ({ request }) => {
    const date = istDateFromNow(0); // today — walk-ins are counter sales
    const payload = {
      date,
      source: "walkin" as const,
      groupType: "squad" as const,
      players: 2,
      revenue: 1,
      paymentMethod: "cash" as const,
      notes: `smoke run ${getRunId()}`,
    };
    const headers = autotestRequestInit("POST", payload).headers as Record<string, string>;

    // STEP 1 — create.
    const createRes = await request.post(
      "/api/admin/revenue?pin=noop",
      { headers, data: payload }
    );
    expect(createRes.status(), `body: ${await createRes.text()}`).toBe(200);
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    const walkinId = createBody.entry.id;
    expect(walkinId, "walk-in id format").toMatch(/^walk-/);
    expect(createBody.entry.notes, "AUTOTEST marker in notes").toContain("[AUTOTEST]");

    // STEP 2 — read back via admin bookings endpoint. It merges Sheet1
    // bookings with Revenue walk-ins for the given date, so finding
    // our row proves the Revenue sheet read path still works AND
    // yields the same shape the admin UI depends on.
    const readRes = await request.get(
      `/api/admin/bookings?pin=noop&date=${date}`,
      { headers: { [AUTOTEST_HEADER]: getAutotestToken() } }
    );
    expect(readRes.status(), `read-back body: ${await readRes.text()}`).toBe(200);
    const readBody = await readRes.json();
    const row = (readBody.walkins || []).find(
      (w: { id: string }) => w.id === walkinId
    );
    expect(row, `walk-in ${walkinId} not found in admin read-back`).toBeDefined();
    expect(row.date, "date mismatch").toBe(date);
    expect(row.groupType, "groupType mismatch").toBe(payload.groupType);
    expect(row.players, "players mismatch").toBe(payload.players);
    expect(row.revenue, "revenue mismatch").toBe(payload.revenue);
    expect(row.paymentMethod, "paymentMethod mismatch").toBe(payload.paymentMethod);

    // STEP 3 — cleanup wipes immediately and confirms this id is in
    // the swept list.
    const cleanupRes = await request.post(
      "/api/admin/autotest-cleanup?olderThanHours=0",
      { headers: { [AUTOTEST_HEADER]: getAutotestToken() } }
    );
    expect(cleanupRes.status(), `cleanup body: ${await cleanupRes.text()}`).toBe(200);
    const cleanupBody = await cleanupRes.json();
    expect(
      cleanupBody.sweptWalkins,
      "cleanup didn't sweep the walk-in we just created"
    ).toContain(walkinId);

    // STEP 4 — read back again, must be gone.
    const postCleanupRes = await request.get(
      `/api/admin/bookings?pin=noop&date=${date}`,
      { headers: { [AUTOTEST_HEADER]: getAutotestToken() } }
    );
    const postCleanupBody = await postCleanupRes.json();
    const stillThere = (postCleanupBody.walkins || []).find(
      (w: { id: string }) => w.id === walkinId
    );
    expect(
      stillThere,
      `walk-in ${walkinId} still visible after cleanup`
    ).toBeUndefined();
  });

  test("negative: unauthenticated walk-in POST returns 401", async ({ request }) => {
    const payload = {
      date: istDateFromNow(0),
      source: "walkin",
      groupType: "squad",
      players: 2,
      revenue: 1,
      paymentMethod: "cash",
      notes: "should-not-land",
    };
    const res = await request.post(
      "/api/admin/revenue?pin=obviously-wrong",
      {
        headers: { "content-type": "application/json" },
        data: payload,
      }
    );
    expect(res.status(), "walk-in POST without auth must 401").toBe(401);
  });

  test("negative: autotest cleanup without token returns 401", async ({ request }) => {
    // Separate assertion for the cleanup endpoint — if its auth broke
    // an attacker could wipe real-looking rows that happen to match
    // the AUTOTEST filter. Belt-and-braces check on the one endpoint
    // whose failure mode is "data loss."
    const res = await request.post("/api/admin/autotest-cleanup");
    expect(res.status(), "cleanup without token must 401").toBe(401);
  });
});
