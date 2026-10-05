import { defineConfig, devices } from "@playwright/test";

// Smoke-test harness for the booking site. These are nightly checks
// against PRODUCTION (not a local dev server) — the goal is to catch
// "the real app silently broke," not to replace per-change CI tests.
//
// Baseline URL comes from SMOKE_BASE_URL so a developer can run the
// suite locally against a dev server by setting it to
// http://localhost:3000 before `npx playwright test`.
//
// Expect:
//   - AUTOTEST_TOKEN   : server-side bypass token, read by every test
//                        via process.env and sent in the x-autotest-token
//                        header on API hops. MUST match the token the
//                        production server has configured.
//   - ADMIN_PIN        : the walk-in test uses this to log into /admin.
//                        Only used by the UI-driven admin flow — the API
//                        hops use the AUTOTEST_TOKEN header instead.

const baseURL = process.env.SMOKE_BASE_URL || "https://www.tesseractarena.com";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Smoke tests are single-shot; retrying hides flakes that we want to
  // see in the Discord ping. One retry on CI covers a cosmic-ray-level
  // network blip without masking real breakage.
  retries: process.env.CI ? 1 : 0,
  // Three tests, independent — run them in parallel to keep the whole
  // suite under a couple of minutes.
  workers: process.env.CI ? 3 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }], ["json", { outputFile: "playwright-report/results.json" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    // Treat untrusted certs as valid so a staging environment with a
    // self-signed cert doesn't block the suite.
    ignoreHTTPSErrors: true,
  },
  // Only desktop Chromium — this is a smoke suite, not a cross-browser
  // compatibility matrix. If we want mobile-specific coverage later we
  // can add a second project; for now the fastest-to-run config wins.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
