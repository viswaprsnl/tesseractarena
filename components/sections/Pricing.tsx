"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { pricingTiers } from "@/data/pricing";
import { availableGames } from "@/data/games";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export function Pricing() {
  // Per-head rate for each tier is game.pricePerPerson × tier.multiplier.
  // We show the range across the Available library so parents / groups see
  // "from ₹X" and know exactly what drives the cheaper end.
  const gamePrices = availableGames.map((g) => g.pricePerPerson);
  const minGamePrice = Math.min(...gamePrices);
  const maxGamePrice = Math.max(...gamePrices);
  const tierRange = (multiplier: number) => ({
    min: Math.round(minGamePrice * multiplier),
    max: Math.round(maxGamePrice * multiplier),
  });

  return (
    <section id="pricing" className="py-12 sm:py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Choose Your <span className="gradient-text">Experience</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Per-head pricing depends on the game — ₹{minGamePrice} for short-format
            HeroZone titles, ₹{maxGamePrice} for full 30-min Anvio experiences.
            Bigger groups get better per-head rates automatically.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-sm font-medium text-primary">
              Reserve with just ₹500/person — pay the rest at the center
            </span>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {pricingTiers.map((tier) => (
            <motion.div
              key={tier.name}
              variants={fadeInUp}
              className={`glass-card p-8 flex flex-col relative ${
                tier.popular
                  ? "border-primary/40 glow-violet md:-translate-y-4"
                  : ""
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-4">
                  Most Popular
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="font-heading text-xl font-bold mb-2">
                  {tier.name}
                </h3>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <div className="mb-8">
                {(() => {
                  const { min, max } = tierRange(tier.multiplier);
                  return (
                    <>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                        Starting at
                      </p>
                      <span className="text-4xl font-bold">
                        &#8377;{min.toLocaleString("en-IN")}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        per person
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {tier.discountLabel} · up to ₹{max.toLocaleString("en-IN")} for full 30-min titles
                      </p>
                    </>
                  );
                })()}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm"
                  >
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-primary"
                    />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/book"
                className={cn(
                  buttonVariants(),
                  "w-full justify-center",
                  tier.popular
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                )}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
