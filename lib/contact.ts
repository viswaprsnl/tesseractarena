// Single source of truth for the arena's public contact channels. Any
// component that renders a WhatsApp / phone / email CTA should import from
// here so a change to the company number never leaves a stale copy behind.

export const WHATSAPP_NUMBER = "919908116444";
export const PHONE_DISPLAY = "+91 99081 16444";
export const CONTACT_EMAIL = "admin@tesseractarena.com";

// Pre-filled WhatsApp link for corporate / large-group enquiries. Same
// wa.me pattern as the birthday CTA but with a corporate-flavored message
// so the incoming lead is already tagged.
export function whatsappCorporateLink(): string {
  const msg =
    "Hi! I'd like to enquire about a corporate / team booking at Tesseract Arena. Group size, preferred dates, and budget below.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}
