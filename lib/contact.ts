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

// Pre-filled WhatsApp links by context. All open the same number but
// seed the customer's first message so the arena staff can see at a
// glance what kind of enquiry it is (general / corporate / pricing).
// Use the one that matches the surface — a "Chat on WhatsApp" button
// in the footer should NOT send a corporate-flavoured message. The
// birthday equivalent lives in data/birthday.ts next to the package
// data it needs.

function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Catch-all general enquiry — footer, contact page, any "just reach
// out" surface. Deliberately open-ended so the customer can continue
// in their own words after it opens WhatsApp.
export function whatsappGeneralLink(): string {
  return whatsappLink(
    "Hi Tesseract Arena! I just checked out tesseractarena.com and wanted to know more. Can you help?"
  );
}

// Corporate / large-group enquiries. Pre-fills group + date so the
// staff reply can be specific from the first message.
export function whatsappCorporateLink(): string {
  return whatsappLink(
    "Hi Tesseract Arena! I'd like to enquire about a corporate / team booking.\n\nGroup size:\nPreferred date:\nSession length (2 or 3 hours):"
  );
}

// "What are your current rates?" — used from the booking flow or any
// pricing-adjacent CTA so staff can lead with slot availability + the
// right discount they can offer that day.
export function whatsappPricingLink(): string {
  return whatsappLink(
    "Hi Tesseract Arena! Can you share your current rates and any offers running right now?"
  );
}
