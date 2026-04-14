"use client";

import { motion } from "framer-motion";
import {
  Target,
  Heart,
  Zap,
  Shield,
  Wifi,
  Headset,
  Monitor,
  Video,
  Users,
  Baby,
  Briefcase,
  Gamepad2,
  Trophy,
  MapPin,
  TrendingUp,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";

const stats = [
  { value: "50+", label: "Premium Games", icon: Gamepad2 },
  { value: "10", label: "Simultaneous Players", icon: Users },
  { value: "1st", label: "In India", icon: Trophy },
  { value: "4-50", label: "Age Range", icon: Baby },
];

const whyNow = [
  {
    icon: MapPin,
    title: "Zero Competition",
    description: "No standalone multi-game VR arena exists in India today. We define the category.",
  },
  {
    icon: Wifi,
    title: "WiFi 7 Unlocked",
    description: "India's commercial WiFi 7 license launched in June 2025 — we're among the earliest adopters in entertainment.",
  },
  {
    icon: Globe,
    title: "USA Standard, India Price",
    description: "Top VR arenas abroad charge $58-78 per person. We deliver equivalent quality at India-friendly pricing.",
  },
  {
    icon: TrendingUp,
    title: "Group Entertainment Boom",
    description: "Post-COVID, India's group experience market is surging — families and corporates want premium outings.",
  },
  {
    icon: Video,
    title: "Viral Content Factory",
    description: "Every visit generates shareable gameplay videos — free marketing at scale through social media.",
  },
  {
    icon: Users,
    title: "Ages 4 to 50",
    description: "Unlike adult-only gaming cafes, our family-safe content opens the widest possible audience in India.",
  },
];

const technology = [
  {
    icon: Headset,
    title: "Meta Quest 3 & Pico Enterprise",
    description: "Latest standalone headsets imported from USA — premium visuals, standalone compute, no PC tethering. Same hardware used at top VR venues globally.",
  },
  {
    icon: Wifi,
    title: "WiFi 7 — First VR Arena in India",
    description: "Commercial WiFi 7 delivers ultra-low latency wireless streaming. We're among the first entertainment venues in India using this technology.",
  },
  {
    icon: Monitor,
    title: "Powerful Compute Backend",
    description: "High-performance PC backend for PCVR titles — runs Synthesis VR's 350+ game catalog seamlessly alongside standalone experiences.",
  },
  {
    icon: Video,
    title: "Session Recording System",
    description: "Every session is recorded — players receive their own highlight video to share on social media. A shareable memory that drives word-of-mouth.",
  },
];

const audience = [
  {
    title: "Families & Kids (4-12)",
    items: ["Family weekend outings", "Birthday parties", "Kids' adventure games", "Safe & supervised sessions"],
  },
  {
    title: "Teens & Gamers (13-25)",
    items: ["Multiplayer squad play", "Competitive PvP titles", "After-school entertainment", "Social gaming hangouts"],
  },
  {
    title: "Adults & Couples (26-45)",
    items: ["Date night experiences", "Friend group outings", "Unique entertainment choice", "Premium night out"],
  },
  {
    title: "Corporates & Teams (18-50)",
    items: ["Team-building sessions", "Corporate offsites", "Group bookings", "Company events"],
  },
];

const experience = [
  { step: "01", title: "Book & Arrive", description: "Reserve online or walk in. Our staff helps you choose from 50+ games based on your group and mood." },
  { step: "02", title: "Gear Up", description: "Fitted with Quest 3 / Pico Enterprise headsets, trackers, and controllers in minutes. Safety briefing included." },
  { step: "03", title: "Step Into the Game", description: "Full free-roam in our arena — walk, run, dodge. Teammates visible in VR. Complete wireless freedom." },
  { step: "04", title: "Session Debrief", description: "Score screens, highlight replays, team photos. Competitive rankings encourage repeat visits." },
  { step: "05", title: "Take Your Video", description: "Receive a shareable gameplay highlight video — your adventure, recorded and delivered to your phone." },
];

const values = [
  { icon: Target, title: "Premium Quality", description: "USA-level VR equipment and world-class game studios — experiences you can't get at home." },
  { icon: Heart, title: "Community First", description: "A gathering place for friends, families, and coworkers through shared virtual adventures." },
  { icon: Zap, title: "Always Evolving", description: "Our game library grows every month. 50+ titles today, with new games added regularly." },
  { icon: Shield, title: "Safe & Inclusive", description: "Clean equipment, trained staff, and a welcoming atmosphere for ages 4 to 50." },
];

export default function AboutPage() {
  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="outline" className="mb-4 px-4 py-1.5 text-xs font-medium tracking-wider uppercase border-primary/30 text-primary bg-primary/5">
              India&apos;s First Multi-Game VR Arena
            </Badge>
          </motion.div>
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl font-bold mb-6"
          >
            About <span className="gradient-text">Tesseract Arena</span>
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          >
            Think Sandbox VR — but built for India, from day one. A premium location-based
            entertainment experience where groups of up to 10 players can walk in and play
            from a curated library of 50+ VR titles powered by Anvio VR and Synthesis VR.
          </motion.p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-20"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={scaleIn} className="glass-card p-6 text-center">
              <stat.icon size={24} className="mx-auto mb-3 text-primary" />
              <p className="text-3xl font-bold gradient-text">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Mission */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="glass-card p-8 sm:p-12 text-center mb-20 max-w-4xl mx-auto glow-violet"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            To bring USA-level VR entertainment to India. We partner with the best VR game
            studios on the planet and invest in premium standalone hardware imported from the
            USA — so every Indian can walk in, gear up, and step into another world.
            No experience or equipment needed.
          </p>
        </motion.div>

        {/* The Opportunity — Why Now */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="mb-20"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Why India. Why <span className="gradient-text">Now</span>.
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-10">
            The window to be first is open — but not forever.
          </p>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {whyNow.map((item) => (
              <motion.div key={item.title} variants={scaleIn} className="glass-card p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-bold mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Technology */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="mb-20"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Enterprise-Grade <span className="gradient-text">Technology</span>
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-10">
            The same hardware that powers top VR venues in the USA — imported for India
          </p>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {technology.map((item) => (
              <motion.div key={item.title} variants={scaleIn} className="glass-card p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-bold mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* The Experience */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="mb-20"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            The <span className="gradient-text">Experience</span>
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-10">
            A seamless, cinematic 60-minute journey from walk-in to walk-out
          </p>
          <div className="max-w-3xl mx-auto space-y-4">
            {experience.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-5 flex gap-5 items-start"
              >
                <span className="font-heading text-2xl font-bold text-primary/40 shrink-0">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-sm font-bold mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Target Audience */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="mb-20"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Built for <span className="gradient-text">Everyone</span>
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-10">
            Ages 4 to 50 — the widest VR audience in any Indian entertainment venue
          </p>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {audience.map((group) => (
              <motion.div key={group.title} variants={scaleIn} className="glass-card p-5">
                <h3 className="text-sm font-bold mb-3 text-primary">{group.title}</h3>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">&#9670;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Values */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20"
        >
          {values.map((value) => (
            <motion.div key={value.title} variants={scaleIn} className="glass-card p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <value.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">{value.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Partners */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="text-center mb-20"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">
            Powered by <span className="gradient-text">World-Class Partners</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {["Anvio VR", "Synthesis VR", "Meta Quest 3", "Pico Enterprise", "WiFi 7"].map((partner) => (
              <div key={partner} className="glass-card px-8 py-5 flex items-center justify-center">
                <span className="font-heading text-sm tracking-wider text-muted-foreground">{partner}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="glass-card p-8 sm:p-12 text-center glow-violet"
        >
          <Briefcase size={32} className="mx-auto mb-4 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold mb-3">
            Partner With Us
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-6">
            We are seeking strategic partnerships, venue space, and investor conversations.
            India&apos;s first — but not India&apos;s last. We plan to scale.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/contact" className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors">
              Contact Us
            </a>
            <a href="/book" className="px-6 py-2.5 rounded-lg border border-white/20 hover:bg-white/5 text-sm font-medium transition-colors">
              Book a Visit
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
