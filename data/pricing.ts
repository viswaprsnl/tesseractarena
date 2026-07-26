export interface PricingTier {
  name: string;
  price: number;
  unit: string;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
}

export const pricingTiers: PricingTier[] = [
  {
    name: "Solo",
    price: 1499,
    unit: "per person",
    description: "Perfect for first-timers or solo adventurers joining a public session.",
    features: [
      "1 player",
      "45-minute session (30 min VR + 15 min setup & briefing)",
      "Choose from any game",
      "All equipment provided",
      "Brief orientation included",
    ],
    cta: "Book Solo",
  },
  {
    name: "Squad",
    price: 1199,
    unit: "per person",
    description: "Grab your crew for the ultimate co-op VR experience.",
    features: [
      "2-5 players",
      "45-minute session (30 min VR + 15 min setup & briefing)",
      "Choose from any game",
      "All equipment provided",
      "Private arena session",
      "Group photo included",
    ],
    popular: true,
    cta: "Book Squad",
  },
  {
    name: "Party",
    price: 999,
    unit: "per person",
    description: "Birthdays, team builds, or just an epic night out. Minimum 6 players.",
    features: [
      "6-8 players",
      "90-minute experience — 2 × 45-min sessions (2 games, gear-up between)",
      "Choose from any game",
      "All equipment provided",
      "Private arena session",
      "Dedicated event host",
      "Group photo + video",
    ],
    cta: "Book Party",
  },
];
