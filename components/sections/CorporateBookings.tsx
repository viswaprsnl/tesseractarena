"use client";

import { motion } from "framer-motion";
import {
  Users,
  Clock,
  Trophy,
  Camera,
  Receipt,
  Coffee,
  Phone,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  PHONE_DISPLAY,
  WHATSAPP_NUMBER,
  whatsappCorporateLink,
} from "@/lib/contact";
import { fadeInUp, staggerContainer } from "@/lib/animations";

// What a corporate booking actually includes. Kept short on purpose —
// anything that varies by group (menu, add-ons, custom scoreboard, etc.)
// is covered by the WhatsApp conversation rather than listed here, so
// customers never catch us on a stale bullet point.
const INCLUDES = [
  {
    icon: Users,
    label: "Private arena, your team only",
    detail: "No walk-ins, no shared slots.",
  },
  {
    icon: Trophy,
    label: "Dedicated host + leaderboard",
    detail: "Briefing, rotations, team scores on the screen.",
  },
  {
    icon: Coffee,
    label: "Lounge between rotations",
    detail: "Seats, snacks, and a view of the live play.",
  },
  {
    icon: Camera,
    label: "Group photos & highlight clips",
    detail: "Dropped to you on Slack / WhatsApp after.",
  },
  {
    icon: Receipt,
    label: "GST invoice, company-ready",
    detail: "Billed to the company name, no hidden charges.",
  },
  {
    icon: Clock,
    label: "2 to 3 hours, your pick",
    detail: "Weekday or weekend, we work around your calendar.",
  },
];

export function CorporateBookings() {
  return (
    <section id="corporate" className="py-12 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-start"
        >
          {/* Left: pitch + CTAs. Takes 3 of 5 columns on desktop so the
              headline has room to breathe. */}
          <motion.div variants={fadeInUp} className="lg:col-span-3">
            <p className="text-xs sm:text-[13px] tracking-[0.18em] font-semibold text-primary/80 uppercase mb-4">
              Corporate &amp; Team Events
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-5">
              Team-building that your team{" "}
              <span className="gradient-text">talks about on Monday.</span>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-6 max-w-xl">
              Nobody remembers another dinner off-site. In a VR headset your
              team has to call each other out by name, cover each other&apos;s
              backs, and make calls in two seconds — the stuff off-sites
              promise and rarely deliver. New hires and VPs start on the same
              footing.
            </p>

            <ul className="flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/90 mb-8">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Groups of 4 to 32 players
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                2 to 3 hour sessions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Weekdays &amp; weekends
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={whatsappCorporateLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-[#25D366] hover:bg-[#1EBE5A] text-white text-sm font-medium transition-colors"
              >
                <WhatsAppIcon size={18} />
                WhatsApp us for a custom quote
              </a>
              <a
                href={`tel:+${WHATSAPP_NUMBER}`}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg border border-border hover:bg-secondary/50 text-sm font-medium transition-colors"
              >
                <Phone size={16} className="text-primary" />
                {PHONE_DISPLAY}
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-4">
              Reply usually within minutes during working hours. Fridays and
              weekends book up ahead — reach out early for the date you want.
            </p>
          </motion.div>

          {/* Right: What's included card. 2 of 5 cols on desktop; stacks
              on mobile. The icon grid gives the eye something to scan
              without the user reading every bullet. */}
          <motion.div variants={fadeInUp} className="lg:col-span-2">
            <div className="glass-card p-6 sm:p-7">
              <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-muted-foreground mb-5">
                What&apos;s included
              </h3>
              <ul className="space-y-4">
                {INCLUDES.map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon size={16} className="text-primary" />
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-snug">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
