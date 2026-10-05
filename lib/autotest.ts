// Shared autotest bypass primitives.
//
// Nightly end-to-end smoke tests (see tests/e2e/) hit the real
// production API through this header: when it's present and matches
// AUTOTEST_TOKEN, the booking flow skips Razorpay entirely, the
// walk-in logger skips its PIN check, and rows get tagged with
// AUTOTEST_MARKER so the cleanup endpoint can find them later.
//
// None of this exists on the client. The token lives in a Vercel
// server-only env var (AUTOTEST_TOKEN) and in GitHub Actions as a
// secret of the same name — nothing in NEXT_PUBLIC_ reads it. If the
// env var is unset in a given environment, every call to
// isAutotestRequest() returns false, so test-mode cannot be enabled
// by accident on a preview deploy that hasn't been configured.

import type { NextRequest } from "next/server";

// Request header the automation sets. Lowercased because Next's
// request.headers.get is case-insensitive but it's clearest to pick
// one form and stick to it.
export const AUTOTEST_HEADER = "x-autotest-token";

// Human-visible marker written into specialRequests (Sheet1) and
// notes (Revenue) so a glance at the sheet makes the origin obvious
// AND the cleanup endpoint can find rows by substring match. Chosen
// over a dedicated column because the sheet schema is already wide
// and adding a column everywhere is riskier than one text tag.
export const AUTOTEST_MARKER = "[AUTOTEST]";

// Email prefix used for all test bookings. Lets the cleanup endpoint
// also catch rows whose specialRequests got stripped by a column-
// width guard elsewhere.
export const AUTOTEST_EMAIL_PREFIX = "autotest+";
export const AUTOTEST_EMAIL_DOMAIN = "@tesseractarena.com";

// Age at which a test row becomes eligible for automatic deletion.
// Short enough that the Revenue sheet never bloats; long enough that
// a failed run from last night is still debuggable this morning.
export const AUTOTEST_RETENTION_DAYS = 7;

// Constant-time string compare. Guards the token header from timing
// attacks even though the risk here is essentially nil — the sheet
// backend takes 500ms per write, dwarfing any string-compare timing
// signal. Belt-and-braces.
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Server-side check: true only when the request supplied a header
// matching AUTOTEST_TOKEN. The env var defaults to an empty string so
// an unconfigured deploy cannot be tricked by an attacker sending an
// empty header (empty !== empty case is caught by the length check +
// the explicit emptiness guard here).
export function isAutotestRequest(request: NextRequest): boolean {
  const expected = process.env.AUTOTEST_TOKEN;
  if (!expected || expected.length < 16) return false;
  const supplied = request.headers.get(AUTOTEST_HEADER);
  if (!supplied) return false;
  return constantTimeEquals(supplied, expected);
}

// Convenience: email address this run should use. Carries the run id
// through so one failed night's rows are easy to filter in the sheet.
export function autotestEmail(runId: string): string {
  // Replace any character the sheet or email validator might reject.
  const safe = runId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 20) || "run";
  return `${AUTOTEST_EMAIL_PREFIX}${safe}${AUTOTEST_EMAIL_DOMAIN}`;
}

// Check used by the cleanup endpoint. Looser than isAutotestRequest
// so we also sweep rows whose email prefix matches but whose marker
// got cropped.
export function isAutotestRow(
  email: string | undefined,
  notes: string | undefined
): boolean {
  if (email && email.startsWith(AUTOTEST_EMAIL_PREFIX)) return true;
  if (notes && notes.includes(AUTOTEST_MARKER)) return true;
  return false;
}
