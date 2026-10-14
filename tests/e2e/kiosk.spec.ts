import { expect, test } from "@playwright/test";

// What this smoke test covers:
//   1. /kiosk renders — the server page + KioskShell client component
//      load without a hard error. Without a signed PIN cookie the
//      page shows the login form; with one it shows the roster.
//      Either state proves the route is up and the bundle isn't
//      broken.
//
// We don't exercise the real waiver flow via automation here: that
// path depends on scanning a real QR + a signed cookie session that's
// awkward to simulate. The booking smoke writes to Sheet1 which
// transitively validates the sheet schema the kiosk reads from, so
// the kiosk shell is the main surface left to check.
//
// Previous version asserted "at least one SVG on the page" assuming
// we'd see the walk-in QR, but the walk-in QR only renders AFTER
// auth. The login form has no SVGs, so that assertion failed on
// every CI run.

test.describe("kiosk smoke", () => {
  test("kiosk entry page renders", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/kiosk");

    // The smoke suite always hits an unauthenticated session (no PIN
    // cookie, no way to supply one from CI), so the page we see is
    // always the login screen. Assert the "Unlock kiosk" submit
    // button is visible — definitive proof the KioskShell client
    // component hydrated. Using getByRole with the exact name avoids
    // strict-mode ambiguity with the "unlock the check-in tab"
    // helper text that also contains the word "unlock".
    const unlockButton = page.getByRole("button", { name: /unlock kiosk/i });
    await expect(unlockButton).toBeVisible({ timeout: 15_000 });
    expect(errors, "kiosk page errored during initial render").toEqual([]);
  });
});
