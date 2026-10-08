// Single source of truth for the arena's public contact channels. Any
// component that renders a WhatsApp / phone / email CTA should import from
// here so a change to the company number never leaves a stale copy behind.

export const WHATSAPP_NUMBER = "919908116444";
export const PHONE_DISPLAY = "+91 99081 16444";
export const CONTACT_EMAIL = "admin@tesseractarena.com";
export const INSTAGRAM_HANDLE = "@tesseractarena";
export const INSTAGRAM_URL = "https://instagram.com/tesseractarena";
export const YOUTUBE_HANDLE = "@TesseractVRGamingArena";
export const YOUTUBE_URL = "https://www.youtube.com/@TesseractVRGamingArena";
// Facebook page uses the numeric profile.php id (no vanity handle
// claimed yet). URL kept bare — no &sk=... admin-view params that
// Meta appends when the owner copies the URL from their own session.
export const FACEBOOK_HANDLE = "Tesseract Arena";
export const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61594595350233";

// Everyone who should be notified when a new booking / callback / contact
// form comes in. Kept separate from CONTACT_EMAIL (which is
// customer-facing signage on the site) so we can add branch inboxes
// without changing what customers see. New arena inboxes go here.
export const NOTIFY_RECIPIENTS = [
  "admin@tesseractarena.com",
  "arena-hyd01@tesseractarena.com",
];

// Pre-filled WhatsApp links by context. All open the same number but
// seed the customer's first message so the arena staff can see at a
// glance what kind of enquiry it is (general / corporate / pricing).
// Use the one that matches the surface — a "Chat on WhatsApp" button
// in the footer should NOT send a corporate-flavoured message. The
// birthday equivalent lives in data/birthday.ts next to the package
// data it needs.

function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Pre-filled WhatsApp messages. All kept short on purpose — Totem /
// Anvio and the industry use one-liners because the real greeting
// comes back from the arena's WhatsApp Business auto-reply (set up in
// the Business app, not here). A long pre-fill makes the lead feel
// like a form, and the staff reply has to repeat half of it anyway.

// Catch-all general enquiry — footer button has no pre-fill at all
// (just opens the chat), copy below is for the "Chat on WhatsApp"
// buttons that benefit from a sender-side intent tag.
export function whatsappGeneralLink(): string {
  return whatsappLink("Hi Tesseract Arena, I'd like to book a session.");
}

// Explicitly no pre-fill — same wa.me/<number> URL with nothing in
// the text parameter. Use this on floating / nav / icon-only
// buttons where "typing has already started" feels pushy.
export function whatsappEmptyLink(): string {
  return whatsappLink();
}

// Corporate / large-group enquiries. One short line — the staff
// follow-up asks for group size, date and session length.
export function whatsappCorporateLink(): string {
  return whatsappLink("Hi Tesseract Arena! I'd like to plan a team event.");
}

// Pre-booking question — "Ask on WhatsApp" style CTA.
export function whatsappQuestionLink(): string {
  return whatsappLink("Hi Tesseract Arena, I have a question before booking.");
}
