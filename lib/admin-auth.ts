// Staff / owner PIN checks shared by every admin route. Fails closed: if
// ADMIN_PIN or OWNER_PIN isn't configured, that role can't log in (there
// is deliberately no "1234" fallback).
export type AdminRole = "owner" | "staff";

export function roleForPin(pin: unknown): AdminRole | null {
  if (typeof pin !== "string" || !pin) return null;
  if (process.env.OWNER_PIN && pin === process.env.OWNER_PIN) return "owner";
  if (process.env.ADMIN_PIN && pin === process.env.ADMIN_PIN) return "staff";
  return null;
}

