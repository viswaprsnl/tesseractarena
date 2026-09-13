"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Cake, Users, Clock, Check, MessageCircle, Sparkles, ChevronRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BIRTHDAY_PACKAGES,
  BIRTHDAY_ADDONS,
  BIRTHDAY_ADVANCE_PERCENT,
  birthdayAdvance,
  whatsappBirthdayLink,
  type BirthdayPackage,
} from "@/data/birthday";
import { fadeInUp, staggerContainer } from "@/lib/animations";

// Serialise the parent-picked add-on quantities into a URL param the
// birthday wizard understands. Empty selections drop out so a clean
// "no add-ons" click still gets a clean URL.
function encodeAddons(qty: Record<string, number>): string {
  return Object.entries(qty)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${id}:${n}`)
    .join(",");
}

// The birthday landing page has two co-existing CTAs on every package card:
// "Book online now" (fast lane for parents who know what they want) and
// "WhatsApp us" (fallback for anyone who wants to discuss dates or
// customizations before committing). We intentionally give WhatsApp equal
// visual weight — many Indian parents prefer chat over form flows.

export default function BirthdayPage() {
  // Add-on selections made on this page follow the parent into the wizard
  // via the ?addons= URL param on every "Book online now" link.
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  // Bump by +1 / -1. Reads the previous quantity inside the setter so rapid
  // clicks don't collapse into a single increment (the standard React
  // closure trap — using a target value from the render frame would).
  const bumpQty = (id: string, delta: number) =>
    setAddonQty((q) => ({
      ...q,
      [id]: Math.max(0, (q[id] ?? 0) + delta),
    }));
  const toggleFlat = (id: string) =>
    setAddonQty((q) => ({ ...q, [id]: (q[id] ?? 0) > 0 ? 0 : 1 }));

  const addonsSubtotal = BIRTHDAY_ADDONS.reduce((sum, a) => {
    const n = addonQty[a.id] ?? 0;
    if (n <= 0) return sum;
    return sum + (a.unit === "per-kid" ? a.price * n : a.price);
  }, 0);
  const addonsPickedCount = Object.values(addonQty).filter((n) => n > 0).length;
  const addonQuery = encodeAddons(addonQty);
  const bookHref = (packageId: string) =>
    addonQuery
      ? `/birthday/book?package=${packageId}&addons=${encodeURIComponent(addonQuery)}`
      : `/birthday/book?package=${packageId}`;

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="text-center mb-16"
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
            Free-roam VR, a dedicated host, decorations, and a private lounge —
            packaged so parents can book in under a minute. Pay 25% online to hold your
            slot; settle the rest at the arena on the day.
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-3">
            <a href="#packages">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Cake size={16} className="mr-2" />
                See packages
              </Button>
            </a>
            <a href={whatsappBirthdayLink()} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="border-green-500/40 text-green-400 hover:bg-green-500/10"
              >
                <MessageCircle size={16} className="mr-2" />
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
            { icon: Users, label: "Up to 16 kids", sub: "across staggered waves" },
            { icon: Clock, label: "90 min - 3 hr", sub: "multi-rotation packages" },
            { icon: Cake, label: "Cake + decor", sub: "themed to your kid" },
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

        {/* Packages */}
        <motion.section
          id="packages"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="mb-16"
        >
          <motion.div variants={fadeInUp} className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Pick a <span className="gradient-text">package</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Every package includes the arena, host, safety gear, and slot-hold —
              differences are in duration, group size, and extras.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {BIRTHDAY_PACKAGES.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} bookHref={bookHref(pkg.id)} addonsSubtotal={addonsSubtotal} />
            ))}
          </div>
        </motion.section>

        {/* Add-ons */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="mb-16"
        >
          <motion.div variants={fadeInUp} className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Optional <span className="gradient-text">add-ons</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Tap + to include with your booking. Your picks travel to the checkout
              automatically.
            </p>
          </motion.div>

          {addonsPickedCount > 0 && (
            <motion.div
              variants={fadeInUp}
              className="glass-card p-3 mb-4 text-xs flex items-center justify-between border border-primary/30"
            >
              <span className="text-muted-foreground">
                {addonsPickedCount} add-on{addonsPickedCount === 1 ? "" : "s"} selected
              </span>
              <span className="font-bold text-primary">
                + ₹{addonsSubtotal.toLocaleString("en-IN")}
              </span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BIRTHDAY_ADDONS.map((a) => {
              const qty = addonQty[a.id] ?? 0;
              const isPerKid = a.unit === "per-kid";
              return (
                <motion.div
                  key={a.id}
                  variants={fadeInUp}
                  className={`glass-card p-4 transition-colors ${
                    qty > 0 ? "border border-primary/40" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">
                        ₹{a.price.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {isPerKid ? "per kid" : "flat"}
                      </p>
                    </div>
                  </div>

                  {isPerKid ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {qty > 0
                          ? `${qty} kid${qty === 1 ? "" : "s"} · +₹${(a.price * qty).toLocaleString("en-IN")}`
                          : "Not added"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => bumpQty(a.id, -1)}
                          disabled={qty === 0}
                          className="w-7 h-7 rounded bg-secondary hover:bg-primary/20 disabled:opacity-30 flex items-center justify-center"
                          aria-label={`Remove one ${a.label}`}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{qty}</span>
                        <button
                          onClick={() => bumpQty(a.id, 1)}
                          className="w-7 h-7 rounded bg-primary hover:bg-primary/80 text-primary-foreground flex items-center justify-center"
                          aria-label={`Add one ${a.label}`}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => toggleFlat(a.id)}
                        variant={qty > 0 ? "default" : "outline"}
                        size="sm"
                        className={
                          qty > 0
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                            : "text-xs"
                        }
                      >
                        {qty > 0 ? (
                          <>
                            <Check size={12} className="mr-1" /> Added
                          </>
                        ) : (
                          <>
                            <Plus size={12} className="mr-1" /> Add
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
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
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <MessageCircle size={16} className="mr-2" />
              WhatsApp our party team
            </Button>
          </a>
        </motion.section>
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  bookHref,
  addonsSubtotal,
}: {
  pkg: BirthdayPackage;
  bookHref: string;
  addonsSubtotal: number;
}) {
  const total = pkg.price + addonsSubtotal;
  const advance = birthdayAdvance(total);
  return (
    <motion.div
      variants={fadeInUp}
      className={`glass-card p-6 relative flex flex-col ${
        pkg.popular ? "border-primary/40 glow-violet" : ""
      }`}
    >
      {pkg.popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] whitespace-nowrap">
          Most booked
        </Badge>
      )}

      <div className="text-center mb-5">
        <h3 className="font-heading text-xl font-bold mb-1">{pkg.name}</h3>
        <p className="text-[11px] text-muted-foreground italic">{pkg.tagline}</p>
      </div>

      <div className="text-center mb-5">
        <p className="text-4xl font-bold">
          ₹{total.toLocaleString("en-IN")}
          <span className="text-xs text-muted-foreground font-normal ml-1">
            {addonsSubtotal > 0 ? "with add-ons" : "flat"}
          </span>
        </p>
        {addonsSubtotal > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            ₹{pkg.price.toLocaleString("en-IN")} package + ₹
            {addonsSubtotal.toLocaleString("en-IN")} add-ons
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mt-1">
          Pay ₹{advance.toLocaleString("en-IN")} online ·
          ₹{(total - advance).toLocaleString("en-IN")} at the arena
        </p>
      </div>

      <div className="flex justify-center gap-3 text-[11px] text-muted-foreground mb-5">
        <span className="flex items-center gap-1">
          <Users size={11} className="text-primary" /> up to {pkg.maxKids}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={11} className="text-primary" /> {pkg.durationLabel}
        </span>
      </div>

      <ul className="space-y-2 text-xs mb-6 flex-1">
        {pkg.includes.map((line) => (
          <li key={line} className="flex items-start gap-2">
            <Check size={12} className="text-primary mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{line}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
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
          className="block"
        >
          <Button
            variant="outline"
            className="w-full border-green-500/40 text-green-400 hover:bg-green-500/10"
          >
            <MessageCircle size={14} className="mr-2" />
            WhatsApp about this package
          </Button>
        </a>
      </div>
    </motion.div>
  );
}

const FAQ: { q: string; a: string }[] = [
  {
    q: `What ages does the party work for?`,
    a: `Ages 8 and up. Kids between 8 and 14 need a waiver signed by a parent or guardian. We'll steer younger groups toward gentler titles like Monkey Madness; horror titles (City Z, Dead Ahead) are recommended 14+.`,
  },
  {
    q: `How does the ${BIRTHDAY_ADVANCE_PERCENT}% advance work?`,
    a: `You pay ${BIRTHDAY_ADVANCE_PERCENT}% online via Razorpay to hold your date and time slot. The remaining ${100 - BIRTHDAY_ADVANCE_PERCENT}% is settled in cash / UPI / card at the counter on the day of the party. Full refund if you cancel more than 48 hours before the party.`,
  },
  {
    q: `Can I bring my own cake?`,
    a: `Yes, absolutely — BYO cake is welcome on any package with no extra fee. If you'd rather we arrange one, add the "Branded custom cake" add-on for ₹1,999 and our bakery partner handles it.`,
  },
  {
    q: `What if we're a bigger group than the package caps?`,
    a: `Add the "Extra kid over cap" add-on at ₹1,299 per additional child (up to 4 extras — beyond that we need another wave). For groups larger than 24, WhatsApp us — we'll build a custom quote and probably need to combine sessions or block extra slots.`,
  },
  {
    q: `Can parents play too?`,
    a: `A couple of parents joining the VR is fine and included; just tell your host on arrival. If a whole cohort of adults wants to play, we'd suggest a Squad or Party booking on a separate slot right after your kids' party.`,
  },
  {
    q: `Do you handle food?`,
    a: `We don't have an in-house kitchen. Preston Prime Mall has plenty of options right outside our door — most parties either grab a bite before, order to the private lounge, or head out together after cake. We handle the arena; food's on you (or us to point you at the mall).`,
  },
];
