import { z } from "zod";

// Contact-details validation for /book. Lives apart from
// PersonalDetailsForm so the page can check completeness without
// eagerly loading the form (and its Turnstile widget).
export const detailsSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z
    .string()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Please enter a valid phone number"),
  specialRequests: z.string().optional(),
});

export type Details = z.infer<typeof detailsSchema>;
export type DetailsField = keyof Details;

export const EMPTY_DETAILS: Details = {
  name: "",
  email: "",
  phone: "+91 ",
  specialRequests: "",
};

// Field-level errors for the current values, keyed by field name.
export function detailsErrors(values: Details): Partial<Record<DetailsField, string>> {
  const result = detailsSchema.safeParse(values);
  if (result.success) return {};
  const out: Partial<Record<DetailsField, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as DetailsField;
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// Cloudflare Turnstile sitekey. When unset (local dev), the widget is
// skipped; the server still enforces the token if TURNSTILE_SECRET is set.
export const TURNSTILE_SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY;
