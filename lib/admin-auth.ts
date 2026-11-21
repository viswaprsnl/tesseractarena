// Staff / owner PIN checks shared by every admin route. Same env vars and
// defaults as before: ADMIN_PIN falls back to "1234"; without OWNER_PIN
// nobody gets the owner role.
export type AdminRole = "owner" | "staff";

export function roleForPin(pin: unknown): AdminRole | null {
  if (typeof pin !== "string" || !pin) return null;
  if (process.env.OWNER_PIN && pin === process.env.OWNER_PIN) return "owner";
  if (pin === (process.env.ADMIN_PIN || "1234")) return "staff";
  return null;
}

