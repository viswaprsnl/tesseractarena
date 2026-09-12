// Pricing is now driven by the chosen game (see Game.pricePerPerson in
// data/games.ts). These tiers are the marketing-facing frame around it:
// what a customer gets at each group size, plus the tier multiplier
// (100/90/85) that determines how much cheaper each seat gets as the group
// grows. Actual rupee amounts on the /#pricing home section are computed
// live from the min/max game price so they stay in sync automatically.

export interface PricingTier {
  name: string;
  discountLabel: string;   // e.g. "no discount", "10% off/head", "15% off/head"
  multiplier: number;      // Solo 1.0, Squad 0.9, Party 0.85
  groupRange: string;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
}

export const pricingTiers: PricingTier[] = [
  {
    name: "Solo",
    discountLabel: "base rate",
    multiplier: 1.0,
    groupRange: "1 player",
    description: "Perfect for first-timers or solo adventurers joining a public session.",
    features: [
      "1 player",
      "45-minute session (30 min VR + 15 min setup & briefing)",
      "Choose any Available game",
      "All equipment provided",
      "Brief orientation included",
    ],
    cta: "Book Solo",
  },
  {
    name: "Squad",
    discountLabel: "10% off / head",
    multiplier: 0.9,
    groupRange: "2-5 players",
    description: "Grab your crew for the ultimate co-op VR experience.",
    features: [
      "2-5 players",
      "45-minute session (30 min VR + 15 min setup & briefing)",
      "Choose any Available game",
      "All equipment provided",
      "Private arena session",
      "10% off per head vs Solo",
      "Group photo included",
    ],
    popular: true,
    cta: "Book Squad",
  },
  {
    name: "Party",
    discountLabel: "15% off / head",
    multiplier: 0.85,
    groupRange: "6-8 players",
    description: "Birthdays, team builds, or just an epic night out. Minimum 6 players.",
    features: [
      "6-8 players",
      "90-minute experience — 2 × 45-min sessions (2 games, gear-up between)",
      "Choose any Available game",
      "All equipment provided",
      "Private arena session",
      "Dedicated event host",
      "15% off per head vs Solo — best value for full-venue bookings",
      "Group photo + video",
    ],
    cta: "Book Party",
  },
];
