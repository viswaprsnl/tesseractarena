// Cloudflare Turnstile — server-side token verification.
//
// Flow:
//   1. Browser renders the Turnstile widget on the Details step
//      (PersonalDetailsForm) using NEXT_PUBLIC_TURNSTILE_SITEKEY.
//   2. Cloudflare issues a short-lived token to the browser (invisible
//      challenge for 99% of humans, a tap-to-confirm for anything
//      Cloudflare's heuristics find suspicious).
//   3. Client submits the token with the booking payload.
//   4. /api/bookings POSTs the token to Cloudflare's siteverify endpoint
//      using TURNSTILE_SECRET. On a bad verdict, the booking is
//      rejected with 403 before any sheet write happens.
//
// Fail-closed in production: a missing env var means a config error,
// NOT silent passthrough. Fail-open in local dev so I can test
// without configuring my own Cloudflare account.

const SITE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
  ok: boolean;
  // Cloudflare error codes if ok=false: see
  // https://developers.cloudflare.com/turnstile/get-started/server-side-validation/#error-codes
  errorCodes?: string[];
  // Hostname Cloudflare validated against (should match our site). If
  // this isn't our domain, the token was likely stolen from another
  // site using the same widget key — reject.
  hostname?: string;
  // Why the request wasn't challenged (if applicable) — useful for logs.
  action?: string;
}

export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET;
}

// Returns ok:true when the token is valid. In production, a missing
// secret returns ok:false so a misconfigured deploy can't silently
// bypass the challenge. In development, a missing secret returns ok:true
// so I can run the booking flow locally without my own Cloudflare keys.
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("TURNSTILE_SECRET missing in production — rejecting");
      return { ok: false, errorCodes: ["missing-input-secret"] };
    }
    // Dev convenience: no secret configured → skip the check so
    // localhost smoke tests work without a Cloudflare account.
    return { ok: true, action: "dev-skip" };
  }

  if (!token) {
    return { ok: false, errorCodes: ["missing-input-response"] };
  }

  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (remoteIp) form.set("remoteip", remoteIp);

    const res = await fetch(SITE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    if (!res.ok) {
      console.error("Turnstile siteverify HTTP", res.status);
      return { ok: false, errorCodes: ["siteverify-http-error"] };
    }

    const body = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
      hostname?: string;
      action?: string;
    };

    return {
      ok: body.success,
      errorCodes: body["error-codes"],
      hostname: body.hostname,
      action: body.action,
    };
  } catch (err) {
    console.error("Turnstile siteverify failed:", err);
    // Fail-CLOSED on network errors to Cloudflare. The alternative
    // (fail-open) would mean a Cloudflare outage lets bots through —
    // worse than a brief user-facing booking error.
    return { ok: false, errorCodes: ["siteverify-fetch-failed"] };
  }
}

// Pulls the client IP from Next.js's request headers. Not strictly
// required by siteverify, but Cloudflare uses it as an additional
// signal, and the error logs are more useful with it.
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || undefined;
}
