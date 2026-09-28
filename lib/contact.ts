// Single source of truth for the arena's public contact channels. Any
// component that renders a WhatsApp / phone / email CTA should import from
// here so a change to the company number never leaves a stale copy behind.

export const WHATSAPP_NUMBER = "919908116444";
export const PHONE_DISPLAY = "+91 99081 16444";
export const CONTACT_EMAIL = "admin@tesseractarena.com";
export const INSTAGRAM_HANDLE = "@tesseractarena";
export const INSTAGRAM_URL = "https://instagram.com/tesseractarena";

// Everyone who should be notified when a new booking / callback / contact
// form comes in. Kept separate from CONTACT_EMAIL (which is
// customer-facing signage on the site) so we can add branch inboxes
// without changing what customers see. New arena inboxes go here.
export const NOTIFY_RECIPIENTS = [
  "admin@tesseractarena.com",
  "arena-hyd01@tesseractarena.com",
];

// Pre-filled WhatsApp link for corporate / large-group enquiries. Same
// wa.me pattern as the birthday CTA but with a corporate-flavored message
// so the incoming lead is already tagged.
export function whatsappCorporateLink(): string {
  const msg =
    "Hi! I'd like to enquire about a corporate / team booking at Tesseract Arena. Group size, preferred dates, and budget below.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}
