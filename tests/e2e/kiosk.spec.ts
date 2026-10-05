import { expect, test } from "@playwright/test";

// What this smoke test covers:
//   1. /kiosk renders — the server component that generates the walk-in
//      QR SVG at request time successfully hits QRCode.toString and the
//      KioskShell client component mounts. If either breaks (missing
//      SITE_URL env, qrcode package version mismatch, hydration error)
//      this test catches it.
//
// We don't exercise the real waiver flow via automation here: that
// path depends on scanning a real QR + a signed cookie session that's
// awkward to simulate. The booking smoke writes to Sheet1 which
// transitively validates the sheet schema the kiosk reads from, so
// the kiosk shell is the main surface left to check.

test.describe("kiosk smoke", () => {
  test("kiosk entry page renders", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/kiosk");
    // Expect an SVG QR somewhere on the page (the walk-in booking
    // code) plus either the PIN entry or the roster view, depending
    // on auth state. Match the SVG as the universal signal.
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 15_000 });
    expect(errors, "kiosk page errored during initial render").toEqual([]);
  });
});
