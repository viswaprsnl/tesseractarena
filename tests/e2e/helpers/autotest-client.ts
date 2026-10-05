// Shared helpers for the nightly smoke tests. Every test imports from
// here so there's exactly one place that knows the shape of the
// bypass contract, how to generate a run id, and how to build a
// request to the production API.

import { nanoid } from "nanoid";

export const AUTOTEST_HEADER = "x-autotest-token";

export function getAutotestToken(): string {
  const t = process.env.AUTOTEST_TOKEN;
  if (!t) {
    throw new Error(
      "AUTOTEST_TOKEN env var is not set — tests cannot bypass Razorpay/PIN. " +
        "Set it in the local .env for local runs, or GitHub secrets for CI."
    );
  }
  return t;
}

// Run id: one per `npx playwright test` invocation, used to tag every
// row the suite writes so you can find them in the sheet by eye.
// Captured at module load so parallel workers in the same run share
// it — Playwright spawns workers with fresh module scope so this is
// per-worker, which is close enough (the Discord report counts rows
// written, not uniqueness).
let _runId: string | null = null;
export function getRunId(): string {
  if (!_runId) _runId = nanoid(8).toLowerCase();
  return _runId;
}

// Builds the URL + headers for an API hop so individual specs don't
// repeat the token wiring.
export function autotestRequestInit(
  method: "GET" | "POST" | "PATCH" | "DELETE" = "POST",
  body?: unknown
): RequestInit {
  const headers: Record<string, string> = {
    [AUTOTEST_HEADER]: getAutotestToken(),
    "content-type": "application/json",
  };
  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  return init;
}

// Email used by booking tests. Starts with autotest+ so the server's
// isAutotestRow catches it even if the AUTOTEST marker in
// specialRequests ever gets stripped.
export function autotestEmail(): string {
  return `autotest+${getRunId()}@tesseractarena.com`;
}

// IST date `n` days from today, in YYYY-MM-DD form. Used to pick a
// bookable future date for the smoke-test session so slots are
// actually available (same-day slots may be gated by the late-booking
// window).
export function istDateFromNow(daysAhead: number): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCDate(ist.getUTCDate() + daysAhead);
  return ist.toISOString().slice(0, 10);
}
