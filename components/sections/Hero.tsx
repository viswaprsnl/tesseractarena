"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const ParticleField = dynamic(
  () => import("@/components/three/ParticleField"),
  { ssr: false }
);

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
      <ParticleField />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

      {/* Content */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto px-4 text-center"
      >
        <motion.div variants={fadeInUp}>
          <Badge
            variant="outline"
            className="mb-6 px-4 py-1.5 text-xs font-medium tracking-wider uppercase border-primary/30 text-primary bg-primary/5"
          >
            Now Open in Fremont, CA
          </Badge>
        </motion.div>

        <motion.h1
          variants={fadeInUp}
          className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6"
        >
          <span className="gradient-text">Step Into</span>
          <br />
          <span className="text-foreground">Another World</span>
        </motion.h1>

        <motion.p
          variants={fadeInUp}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Fremont&apos;s first multi-game standalone VR arena — up to 4 players,
          zero PC required. Premium free-roam experiences that put you inside the
          game.
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
