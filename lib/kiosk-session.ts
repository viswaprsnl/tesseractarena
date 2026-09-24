import { cookies } from "next/headers";
import crypto from "crypto";

// Kiosk session — the Samsung Tab at the counter enters the staff PIN
// once at the start of the shift and gets an HMAC-signed cookie back;
// every kiosk API and page then verifies the cookie without prompting.
// TTL is 24 hours so a session opened Friday morning naturally expires
// by Saturday morning and staff re-enters the PIN.
//
// Not touching ADMIN_PIN check logic elsewhere in the codebase — this
// is a wrapper that reads the PIN once via /api/kiosk/session, then
// treats the signed cookie as the credential from there on.

export const KIOSK_COOKIE_NAME = "kiosk_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Signing secret — prefer a dedicated KIOSK_SECRET, otherwise reuse
// CRON_SECRET (both are already high-entropy on the deployed env),
// otherwise fall back to a per-process random value so unsigned or
// forged cookies never validate on a stock config. NEVER fall back to
// a hard-coded string — that would let anyone forge sessions.
//
// The ephemeral secret is stashed on globalThis so different modules
// (API routes, server components, HMR reloads in dev) all see the
// SAME value. Without this, the login route would sign with one
// random secret and the check-in page would verify with a different
// one, silently rejecting valid sessions.
const KIOSK_SECRET_GLOBAL_KEY = "__tesseract_kiosk_secret" as const;
function getSecret(): string {
  const configured = process.env.KIOSK_SECRET || process.env.CRON_SECRET;
  if (configured) return configured;
  const g = globalThis as unknown as Record<string, string | undefined>;
  if (!g[KIOSK_SECRET_GLOBAL_KEY]) {
    g[KIOSK_SECRET_GLOBAL_KEY] = crypto.randomBytes(32).toString("hex");
    console.warn(
      "[kiosk] KIOSK_SECRET/CRON_SECRET not set — using ephemeral per-process secret; sessions expire on server restart"
    );
  }
  return g[KIOSK_SECRET_GLOBAL_KEY]!;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

// Called after a successful PIN verification. Sets the cookie on the
// response via next/headers cookies(). HttpOnly so page JS can't read
// it, sameSite=Lax so cross-site scanners can't ride the session.
export async function createKioskSession(): Promise<void> {
  const expiry = Date.now() + SESSION_TTL_MS;
  const value = String(expiry);
  const token = `${value}.${sign(value)}`;
  const jar = await cookies();
  jar.set(KIOSK_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

// True when the cookie is present, HMAC checks out, and the timestamp
// embedded in the value hasn't expired. Constant-time compare so a
// timing attack can't recover the secret one byte at a time.
export async function verifyKioskSession(): Promise<boolean> {
  const jar = await cookies();
  const cookie = jar.get(KIOSK_COOKIE_NAME);
  if (!cookie) return false;
  const dot = cookie.value.indexOf(".");
  if (dot < 1) return false;
  const value = cookie.value.slice(0, dot);
  const hash = cookie.value.slice(dot + 1);
  const expected = sign(value);
  if (
    expected.length !== hash.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))
  ) {
    return false;
  }
  const expiry = parseInt(value, 10);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export async function clearKioskSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(KIOSK_COOKIE_NAME);
}
