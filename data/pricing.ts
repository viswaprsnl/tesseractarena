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
      "30-minute VR session",
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
      "2-4 players",
      "30-minute VR session",
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
      "6+ players",
      "60-minute access (2 games)",
      "Choose from any game",
      "All equipment provided",
      "Private arena session",
      "Dedicated event host",
      "Group photo + video",
    ],
    cta: "Book Party",
  },
];
