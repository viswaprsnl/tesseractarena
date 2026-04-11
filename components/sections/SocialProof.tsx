"use client";

import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";

const partners = [
  "Powered by Anvio VR",
  "Synthesis VR",
  "Premium Standalone Hardware",
];

export function SocialProof() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      variants={fadeInUp}
      className="py-6 border-y border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {partners.map((partner, i) => (
          <span
            key={partner}
            className="font-heading text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground"
          >
            {partner}
            {i < partners.length - 1 && (
              <span className="ml-8 text-primary/40 hidden sm:inline">&#9670;</span>
            )}
          </span>
        ))}
      </div>
    </motion.section>
  );
}
