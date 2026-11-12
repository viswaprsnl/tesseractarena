"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Cake, Users, Clock, Check, Sparkles, ChevronRight, Minus, Plus, Pizza } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import {
  BIRTHDAY_PACKAGES,
  BIRTHDAY_ADDONS,
  BIRTHDAY_ADVANCE_PERCENT,
  birthdayAdvance,
  whatsappBirthdayLink,
  type BirthdayPackage,
} from "@/data/birthday";
import { withGST } from "@/lib/booking-config";
import { fadeInUp, staggerContainer } from "@/lib/animations";

// Birthday landing page — post-2026-11-05 Option B rewrite. One flat
// per-kid rate with two add-ons: a branded cake and a food combo. The page shows the base price up
// front and lets parents stack add-ons live so the total they see
// below is what they'll pay (ex-GST; the booking summary adds the
// 18% GST line). All picks carry into the wizard through the
// ?addons= URL param.

function encodeAddons(qty: Record<string, number>): string {
  return Object.entries(qty)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${id}:${n}`)
    .join(",");
}

export default function BirthdayPage() {
  const pkg = BIRTHDAY_PACKAGES[0];

  // Add-on selections. For flat add-ons we store 0 or 1; per-kid add-ons
  // are stored as the requested quantity but priced against the actual
  // guest count on the server (so parents can toggle them without
  // picking a number).
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [guestCount, setGuestCount] = useState(pkg.minKids);

  const toggleAddon = (id: string) =>
    setAddonQty((q) => ({ ...q, [id]: (q[id] ?? 0) > 0 ? 0 : 1 }));

  const bumpGuests = (delta: number) =>
    setGuestCount((n) => Math.max(pkg.minKids, Math.min(pkg.maxKids, n + delta)));

  // Live preview total — mirrors the /api/birthday math so parents see
  // the same number here and in the wizard.
  const addonsTotal = BIRTHDAY_ADDONS.reduce((sum, a) => {
    const picked = (addonQty[a.id] ?? 0) > 0;
    if (!picked) return sum;
    return sum + (a.unit === "per-kid" ? a.price * guestCount : a.price);
  }, 0);
  const packageTotal = pkg.pricePerKid * guestCount;
  const grandTotal = packageTotal + addonsTotal;
  const advance = birthdayAdvance(grandTotal);
  const perKidEffective = Math.round(grandTotal / guestCount);
  const addonsPickedCount = Object.values(addonQty).filter((n) => n > 0).length;

  const addonQuery = encodeAddons(addonQty);
  const bookHref = addonQuery
    ? `/birthday/book?addons=${encodeURIComponent(addonQuery)}&kids=${guestCount}`
    : `/birthday/book?kids=${guestCount}`;

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="text-center mb-14"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-primary" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              VR Birthday Parties
            </span>
          </motion.div>
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-6xl font-bold mb-4 leading-tight"
          >
            Make it the birthday{" "}
            <span className="gradient-text">nobody stops talking about.</span>
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8"
          >
            One flat per-kid rate, with a branded cake and a full food combo
            available as add-ons. Pay {BIRTHDAY_ADVANCE_PERCENT}% online to
            hold your slot; settle the rest at the arena.
          </motion.p>
          <motion.div variants={fadeInUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30">
              <Pizza size={14} className="text-amber-300" />
              <span className="text-xs sm:text-sm text-amber-100">
                Food available — pizza, burger, fries &amp; drink at ₹300/kid
              </span>
            </span>
          </motion.div>
          <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-3">
            <a href="#build">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Cake size={16} className="mr-2" />
                Build your party
              </Button>
            </a>
            <a href={whatsappBirthdayLink()} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-[#25D366] hover:bg-[#1EBE5A] text-white"
              >
                <WhatsAppIcon size={16} className="mr-2" />
                WhatsApp us instead
              </Button>
            </a>
          </motion.div>
        </motion.section>

        {/* Value strip */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16"
        >
          {[
            { icon: Users, label: `Up to ${pkg.maxKids} kids`, sub: "across staggered waves" },
            { icon: Clock, label: "2 hr arena block", sub: "1 Anvio + 1 HeroZone per kid" },
            { icon: Pizza, label: "Cake + food", sub: "branded cake & ₹300/kid combo" },
            { icon: Sparkles, label: "Zero PC/setup", sub: "standalone VR only" },
          ].map((v) => (
            <motion.div
              key={v.label}
              variants={fadeInUp}
              className="glass-card p-4 text-center"
            >
              <v.icon size={20} className="text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">{v.label}</p>
              <p className="text-[11px] text-muted-foreground">{v.sub}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* Build-your-party configurator */}
        <motion.section
          id="build"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="mb-16"
        >
          <motion.div variants={fadeInUp} className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Build your <span className="gradient-text">party</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Pick a group size, add the extras you want, see the total live.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: base package + guest stepper */}
            <motion.div variants={fadeInUp} className="lg:col-span-3 space-y-5">
              <div className="glass-card p-6">
                <h3 className="font-heading text-xl font-bold mb-1">{pkg.name}</h3>
                <p className="text-xs text-muted-foreground italic mb-4">{pkg.tagline}</p>

                <div className="flex items-baseline gap-2 mb-5">
                  <span className="text-4xl font-bold">
                    ₹{pkg.pricePerKid.toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm text-muted-foreground">/ kid · excl. GST</span>
                </div>

                {/* Guest stepper */}
                <div className="flex items-center justify-between gap-4 mb-5 pb-5 border-b border-white/10">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">How many kids?</p>
                    <p className="text-[11px] text-muted-foreground">
                      Min {pkg.minKids}, max {pkg.maxKids}.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => bumpGuests(-1)}
                      disabled={guestCount <= pkg.minKids}
                      className="w-9 h-9 rounded-lg bg-secondary hover:bg-primary/20 disabled:opacity-30 flex items-center justify-center"
                      aria-label="Remove one kid"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-2xl font-bold w-10 text-center tabular-nums">
                      {guestCount}
                    </span>
                    <button
                      onClick={() => bumpGuests(1)}
                      disabled={guestCount >= pkg.maxKids}
                      className="w-9 h-9 rounded-lg bg-primary hover:bg-primary/80 text-primary-foreground disabled:opacity-30 flex items-center justify-center"
                      aria-label="Add one kid"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <ul className="space-y-2 text-xs">
                  {pkg.includes.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check size={12} className="text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Add-ons */}
              <div>
                <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-3">
                  Add-ons
                </h3>
                <div className="space-y-2">
                  {BIRTHDAY_ADDONS.map((a) => {
                    const picked = (addonQty[a.id] ?? 0) > 0;
                    const lineCost =
                      a.unit === "per-kid" ? a.price * guestCount : a.price;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAddon(a.id)}
                        className={`w-full text-left glass-card p-4 transition-colors border ${
                          picked
                            ? "border-primary/40 glow-violet"
                            : "border-white/10 hover:border-white/25"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {a.label}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {a.description}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold">
                              ₹{lineCost.toLocaleString("en-IN")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {a.unit === "per-kid" ? `${guestCount} × ₹${a.price}` : "flat"}
                            </p>
                          </div>
                          <div
                            className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                              picked
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary/60 text-muted-foreground"
                            }`}
                            aria-hidden="true"
                          >
                            {picked ? <Check size={14} /> : <Plus size={14} />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Right: live total card (sticky on desktop) */}
            <motion.div variants={fadeInUp} className="lg:col-span-2">
              <div className="glass-card p-6 lg:sticky lg:top-24">
                <h3 className="font-heading text-xs tracking-wider uppercase text-muted-foreground mb-4">
                  Your party
                </h3>
                <div className="space-y-2 text-sm pb-4 border-b border-white/10">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {pkg.name} ({guestCount} × ₹{pkg.pricePerKid})
                    </span>
                    <span>₹{packageTotal.toLocaleString("en-IN")}</span>
                  </div>
                  {addonsPickedCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Add-ons ({addonsPickedCount})
                      </span>
                      <span>+ ₹{addonsTotal.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 pt-4 pb-4 border-b border-white/10">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">
                      Total (excl. GST)
                    </span>
                    <span className="text-2xl font-bold">
                      ₹{grandTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70">
                    ₹{withGST(grandTotal).toLocaleString("en-IN")} incl. 18% GST ·
                    ₹{perKidEffective.toLocaleString("en-IN")} per kid
                  </p>
                </div>
                <div className="pt-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    Pay{" "}
                    <strong className="text-primary">
                      ₹{withGST(advance).toLocaleString("en-IN")}
                    </strong>{" "}
                    online now ({BIRTHDAY_ADVANCE_PERCENT}%). Balance of{" "}
                    ₹{withGST(grandTotal - advance).toLocaleString("en-IN")} at
                    the arena.
                  </p>
                  <Link href={bookHref}>
                    <Button
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Cake size={16} className="mr-2" />
                      Book online now
                    </Button>
                  </Link>
                  <a
                    href={whatsappBirthdayLink(pkg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2"
                  >
                    <Button
                      variant="outline"
                      className="w-full border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
                    >
                      <WhatsAppIcon size={14} className="mr-2" />
                      WhatsApp about this party
                    </Button>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="mb-16 max-w-3xl mx-auto"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-2xl sm:text-3xl font-bold text-center mb-8"
          >
            Frequently <span className="gradient-text">asked</span>
          </motion.h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <motion.details
                key={f.q}
                variants={fadeInUp}
                className="glass-card p-4 group"
              >
                <summary className="cursor-pointer text-sm font-medium flex items-center justify-between">
                  <span>{f.q}</span>
                  <ChevronRight
                    size={14}
                    className="text-primary transition-transform group-open:rotate-90"
                  />
                </summary>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  {f.a}
                </p>
              </motion.details>
            ))}
          </div>
        </motion.section>

        {/* Bottom CTA */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="glass-card p-8 text-center max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-bold mb-3">Still deciding?</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
            Send us the date and group size — we&apos;ll come back in a couple of
            minutes with an exact quote and hold your slot for 30 minutes so you can
            confirm.
          </p>
          <a href={whatsappBirthdayLink()} target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              className="bg-[#25D366] hover:bg-[#1EBE5A] text-white"
            >
              <WhatsAppIcon size={16} className="mr-2" />
              WhatsApp our party team
            </Button>
          </a>
        </motion.section>
      </div>
    </div>
  );
}

const FAQ: { q: string; a: string }[] = [
  {
    q: `What ages does the party work for?`,
    a: `Ages 8 and up. Kids between 8 and 14 need a waiver signed by a parent or guardian. We'll steer younger groups toward gentler titles like Monkey Madness; horror titles (City Z, Dead Ahead) are recommended 14+.`,
  },
  {
    q: `How does the ${BIRTHDAY_ADVANCE_PERCENT}% advance work?`,
    a: `You pay ${BIRTHDAY_ADVANCE_PERCENT}% of the total online via Razorpay to hold your date and time slot. The remaining ${100 - BIRTHDAY_ADVANCE_PERCENT}% is settled in cash / UPI / card at the counter on the day of the party. Full refund if you cancel more than 48 hours before the party.`,
  },
  {
    q: `Can I bring my own cake?`,
    a: `Yes, absolutely — BYO cake is welcome with no extra fee. If you'd rather we arrange one, add the "Branded custom cake" add-on for ₹1,999 and our bakery partner handles it.`,
  },
  {
    q: `Why is there a minimum of 8 kids?`,
    a: `The party format needs enough kids to split into rotation waves (so one group plays while the other has cake or a snack break). Under 8 feels empty for a party and makes the per-kid math uneconomical. For smaller groups, just book a regular session from the home page — same games, no party extras.`,
  },
  {
    q: `Can parents play too?`,
    a: `A couple of parents joining the VR is fine and included; just tell your host on arrival. If a whole cohort of adults wants to play, we'd suggest booking a separate adult session on an adjacent slot.`,
  },
  {
    q: `Do you handle food?`,
    a: `Yes — add the Food combo for ₹300 per kid: pizza, burger, fries and a drink, served at the party bay. Special requests (veg / Jain, allergies, extra items) are accepted and charged accordingly; the team will confirm any extra cost with you before the party. You can also bring your own food if you prefer.`,
  },
];
