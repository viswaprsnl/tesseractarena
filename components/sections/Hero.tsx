"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const ParticleField = dynamic(
  () => import("@/components/three/ParticleField"),
  { ssr: false }
);

export function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden pt-16 sm:pt-20">
      {/* Background video — real footage of players in the arena. Portrait
          9:16 source (WhatsApp phone capture, ~2.7MB, ~12s), so it fills
          naturally on mobile and crops to the centre strip on desktop
          where the on-screen action usually sits. Muted + inline autoplay
          is what mobile browsers require for a background loop. Users who
          set prefers-reduced-motion at the OS level get the static
          first-frame poster instead of the moving video. */}
      <div className="absolute inset-0 motion-safe:block motion-reduce:hidden">
        <video
          src="/videos/hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
      </div>
      {/* Fallback for reduced-motion users: a solid dark backdrop matching
          the video's tone so the tagline still reads well without any
          motion at all. */}
      <div className="absolute inset-0 motion-safe:hidden motion-reduce:block bg-gradient-to-b from-[#100a2e] via-[#0a0a0f] to-[#0a0a0f]" />
      {/* Dark overlay for readability — always dark regardless of theme */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Particle field on top */}
      <ParticleField />
      {/* Bottom gradient fade (theme-aware) */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      {/* Content */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto px-4 text-center [text-shadow:0_2px_20px_rgba(0,0,0,0.8)]"
      >
        <motion.h1
          variants={fadeInUp}
          className="text-3xl sm:text-5xl md:text-7xl font-bold leading-tight mb-4 sm:mb-6"
        >
          <span className="gradient-text">Step Into</span>
          <br />
          <span className="text-white">Another World</span>
        </motion.h1>

        <motion.p
          variants={fadeInUp}
          className="text-base sm:text-xl text-white/90 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2"
        >
          India&apos;s first multi-title free-roam VR arena — up to 8 players,
          zero PC required. Premium Anvio and HeroZone experiences that put you
          inside the game.
        </motion.p>

        <motion.div
          variants={fadeInUp}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/book"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 glow-violet"
            )}
          >
            Book Your Session
          </Link>
          <Link
            href="#games"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-white/20 text-foreground hover:bg-white/5 text-base px-8"
            )}
          >
            Explore Games
          </Link>
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
