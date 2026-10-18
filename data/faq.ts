export type FAQCategory = "experience" | "groups" | "booking";

export interface FAQCategoryMeta {
  id: FAQCategory;
  label: string;
}

// Order here is the display order of the pills row at the top of
// the FAQ section. "Experience" leads because it's the most common
// first-time visitor question type.
export const FAQ_CATEGORIES: FAQCategoryMeta[] = [
  { id: "experience", label: "Your experience" },
  { id: "groups", label: "Groups & arena" },
  { id: "booking", label: "Booking" },
];

export interface FAQItem {
  question: string;
  answer: string;
  category: FAQCategory;
}

export const faqItems: FAQItem[] = [
  {
    category: "groups",
    question: "What is Tesseract Arena?",
    answer:
      "Tesseract Arena is India's first multi-title free-roam VR arena, combining Anvio and HeroZone premium experiences under one roof at Preston Prime Mall, Gachibowli. Groups of up to 8 players walk in and step into immersive worlds together — no PCs, no wires, no limits.",
  },
  {
    category: "experience",
    question: "Do I need any VR experience to play?",
    answer:
      "Not at all! Our experiences are designed for everyone, from first-timers to VR veterans. Our staff provides a full orientation before every session, and our games range from casual family adventures to intense action experiences.",
  },
  {
    category: "experience",
    question: "What is the age requirement?",
    answer:
      "Our minimum age is 8. Family-friendly titles like Monkey Madness (marked \"Kids Friendly\" on the games page) suit younger players and beginners. Some horror-themed titles like City Z: Necropolis are recommended for ages 16+. Children under 13 must be accompanied by a participating adult.",
  },
  {
    category: "groups",
    question: "How many people can play at once?",
    answer:
      "Our standard sessions support up to 8 simultaneous players in the same virtual world. For corporate events and larger team bookings (up to 24 players), we run staggered 40-min sessions with a dedicated event lead — see the Corporate section on our pricing page for details.",
  },
  {
    category: "experience",
    question: "What should I wear?",
    answer:
      "Wear comfortable clothing and closed-toe shoes you can move freely in — think athletic wear. You'll be walking, crouching, and dodging in VR! Avoid loose jewelry, scarves, or anything that could interfere with the headset.",
  },
  {
    category: "experience",
    question: "How long is a session?",
    answer:
      "A standard Solo or Squad slot is 40 minutes: about 10 minutes for gear-up and safety briefing, followed by 30 minutes of active VR gameplay. Party packages (6-8 players) run across two back-to-back slots — about 80 minutes of arena time plus check-in and photos.",
  },
  {
    category: "booking",
    question: "Do I need to book in advance?",
    answer:
      "We strongly recommend booking online in advance to guarantee your preferred time slot and game. Walk-ins are welcome based on availability, but popular time slots (evenings and weekends) fill up fast.",
  },
  {
    category: "booking",
    question: "How does payment work?",
    answer:
      "To reserve your slot, you pay a flat advance of ₹500 per player at the time of booking. The remaining balance is paid at the center when you arrive. For example, a group of 4 pays ₹2,000 advance to confirm, with the rest settled on arrival.",
  },
  {
    category: "booking",
    question: "What is your cancellation policy?",
    answer:
      "You get a full refund if you cancel at least 6 hours before your session on weekdays (Mon-Fri), or at least 24 hours before on weekends (Sat-Sun). Late cancellations and no-shows are non-refundable. Just click the cancel link in your confirmation email to cancel.",
  },
  {
    category: "experience",
    question: "What if I feel motion sick?",
    answer:
      "Our standalone VR hardware and free-roam setup significantly reduce motion sickness compared to traditional VR. Because you physically walk and move, your brain's visual and physical senses stay in sync. If you do feel uncomfortable, our staff can adjust settings or suggest a different game.",
  },
];
