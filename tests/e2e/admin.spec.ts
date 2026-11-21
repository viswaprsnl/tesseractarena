import { expect, test } from "@playwright/test";

// What this smoke test covers: the admin's access rules hold in
// production. Owner data (overview, expenses, prices) must never be
// readable without a PIN, a wrong PIN must not sign anyone in, and a
// bill link with a forged signature must not render. No PIN is needed:
// every check is a rejection.

test.describe("admin access smoke", () => {
  test("negative: wrong PIN is rejected at sign-in", async ({ request }) => {
    const res = await request.post("/api/admin/auth", { data: { pin: "obviously-wrong" } });
    expect(res.status(), "sign-in with a wrong PIN must 401").toBe(401);
  });

  for (const path of [
    "/api/admin/overview?month=2026-01&pin=obviously-wrong",
    "/api/admin/expenses?month=2026-01&pin=obviously-wrong",
    "/api/admin/calendar?month=2026-01&pin=obviously-wrong",
    "/api/admin/customers?pin=obviously-wrong",
  ]) {
    test(`negative: ${path.split("?")[0]} without a PIN returns 401`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `${path} must not be readable without a PIN`).toBe(401);
    });
  }

  test("negative: price changes need a PIN", async ({ request }) => {
    const res = await request.patch("/api/admin/settings?pin=obviously-wrong", {
      data: { pricing: { advancePerPerson: 1 } },
    });
    expect(res.status(), "settings PATCH without a PIN must 401").toBe(401);
  });

  test("negative: a bill link with a forged signature is not found", async ({ page }) => {
    const res = await page.goto("/bill/TA-NOPE00?t=000000000000000000000000");
    expect(res?.status(), "forged bill link must 404").toBe(404);
  });
});
