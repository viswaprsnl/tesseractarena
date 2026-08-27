export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
}

// Populated with real customer reviews only. Add entries here as customers
// consent — the Testimonials section on the home page hides itself while
// this list is empty rather than showing fabricated quotes.
export const testimonials: Testimonial[] = [];
