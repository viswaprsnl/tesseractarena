"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Building2, Phone, Zap, Clock } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  PHONE_DISPLAY,
  WHATSAPP_NUMBER,
  whatsappCorporateLink,
} from "@/lib/contact";

// Two-card pricing section — one per game library. Post-2026-11-05 we
// run flat per-head rates (Anvio ₹1,199 / HeroZone ₹899) with no
// Solo/Squad/Party tier discount. Price-pressure copy dropped because
// the tier UI was reading as "I need a big group to get a good rate"
// and killing step-3 conversion. One price, one less decision.
const TIERS = [
  {
    key: "anvio",
    name: "Anvio",
    tagline: "Full 30-min free-roam adventures",
    price: 1199,
    icon: Clock,
    popular: true,
    features: [
      "30-minute immersive sessions",
      "Flagship co-op and PvP titles — City Z, Station Zarya, Revolta",
      "1-6 players (up to 8 on Revolta)",
      "Private arena slot, all gear included",
    ],
    cta: "Book Anvio",
  },
  {
    key: "herozone",
    name: "HeroZone",
    tagline: "Short-format arcade rounds",
    price: 899,
    icon: Zap,
    popular: false,
    features: [
      "10-20 minute quick-fire titles",
      "20+ games — Arrowsong, Monkey Madness, Cops vs Robbers, Terminator",
      "Kids-friendly options for ages 8+",
      "Mix-and-match multiple titles in one session",
    ],
    cta: "Book HeroZone",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-12 sm:py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            One <span className="gradient-text">flat price per game</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            No group-size math, no tier discount hoops. Pick a game, see what it
            costs per head, book your slot.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-sm font-medium text-primary">
              Reserve with just ₹500/person (+ GST) — pay the rest at the center
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-2">
            All prices shown exclude GST. 18% GST added at checkout.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          {TIERS.map((tier) => (
            <motion.div
              key={tier.key}
              variants={fadeInUp}
              className={`glass-card p-8 flex flex-col relative ${
                tier.popular
                  ? "border-primary/40 glow-violet md:-translate-y-4"
                  : ""
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-4">
                  Most Played
                </Badge>
              )}

              <div className="mb-6 flex items-start gap-3">
                <span className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <tier.icon size={18} className="text-primary" />
                </span>
                <div>
                  <h3 className="font-heading text-xl font-bold mb-1">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{tier.tagline}</p>
                </div>
              </div>

              <div className="mb-8">
                <span className="text-5xl font-bold">
                  &#8377;{tier.price.toLocaleString("en-IN")}
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  per person
                </span>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  excl. GST · any group size, same rate
                </p>
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

        {/* Corporate banner — flat per-head bundle, 2 games (one Anvio +
            one HeroZone) per person. Separate pricing from the per-game
            section above because the bundle is meaningfully cheaper than
            booking both games separately (₹1,599 vs ₹2,098). */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="max-w-5xl mx-auto mt-10"
        >
          <div className="glass-card p-6 sm:p-8 border-primary/20 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-lg font-bold mb-1">
                Corporate &amp; Team Building — ₹1,599 per person
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                One Anvio title + one HeroZone title per person, dedicated event
                lead, staggered sessions for groups over 8, lounge between
                rotations. Minimum 4, max 32 per booking.
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-2">
                Groups over 32 can be split across a half-day or multi-day
                format — WhatsApp us for a tailored plan.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto">
              <Link
                href={whatsappCorporateLink()}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants(),
                  "justify-center bg-[#25D366] hover:bg-[#1EBE5A] text-white gap-2"
                )}
              >
                <WhatsAppIcon size={16} />
                WhatsApp us
              </Link>
              <Link
                href={`tel:+${WHATSAPP_NUMBER}`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "justify-center gap-2 border-primary/30"
                )}
              >
                <Phone size={14} />
                {PHONE_DISPLAY}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
