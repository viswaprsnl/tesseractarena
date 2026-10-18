"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

// v2 "Why Tesseract Arena" — rebuilt from the icon-card grid into a
// photo mosaic using real session frames. Previously six icon cards
// told the story; those cards were accurate but easy to skim past
// because they looked like boilerplate SaaS pricing-page copy.
//
// The 2×2 mosaic (4 tiles on all breakpoints, 2 cols at sm+) uses
// stills from the lens-* clips so visitors see faces, floor markings,
// headsets, and the Tesseract neon sign while reading the pitch —
// "show, don't tell." Each tile pairs one short promise with one
// supporting detail so the layout stays scannable at a glance.
//
// Frames live in /public/images/why — extracted from the same lens
// clips the "Through the lens" strip uses, so there's no new source
// footage to maintain. Each file is 16-60 KB (static JPG) so this
// section adds no video decoders and ~150 KB total image weight.
const tiles = [
  {
    src: "/images/why/free-roam.jpg",
    eyebrow: "Free-roam",
    title: "Up to 8 players. One arena.",
    detail:
      "Walk, run, crouch, dodge. Your body is the controller — no teleports, no joysticks.",
  },
  {
    src: "/images/why/no-wires.jpg",
    eyebrow: "Zero PC",
    title: "No wires. No backpacks.",
    detail:
      "Standalone headsets with crisp visuals, spatial audio, and precise tracking.",
  },
  {
    src: "/images/why/multi-title.jpg",
    eyebrow: "First in India",
    title: "Anvio + HeroZone, one roof.",
    detail:
      "20+ titles — zombies, PvP, co-op, fantasy, escape rooms, kids-friendly adventures.",
  },
  {
    src: "/images/why/walk-in.jpg",
    eyebrow: "No experience needed",
    title: "Walk in. Step in.",
    detail:
      "Full orientation before every session. First-timers to VR veterans welcome.",
  },
];

export function Features() {
  return (
    <section className="relative py-12 sm:py-24 px-4 overflow-hidden">
      <div className="relative max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeInUp}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Why <span className="gradient-text">Tesseract Arena</span>?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            The premium VR experience you won&apos;t find anywhere else in Hyderabad
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          // 2×2 at sm+, single column on phone. Tiles are landscape
          // (16:9-ish) so the players in frame stay visible across
          // every width.
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5"
        >
          {tiles.map((tile) => (
            <motion.article
              key={tile.title}
              variants={fadeInUp}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card aspect-[16/10] sm:aspect-[16/11]"
            >
              {/* Backdrop image. object-position pushes the crop
                  down a hair (center 42%) because the lens frames
                  tend to have ceiling lights at the top; keeping
                  faces in the main crop frame matters more. */}
              <Image
                src={tile.src}
                alt={tile.title}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover object-[center_42%] transition-transform duration-700 group-hover:scale-105"
              />
              {/* Two-stop dark gradient: strong black at the bottom
                  for text, fading to transparent at the top so the
                  image reads cleanly in the upper portion. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent" />
              {/* Subtle brand-tint on hover — only matters on
                  mouse-capable viewports; mobile viewers see a static
                  tile which is fine. */}
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-500" />

              {/* Copy — anchored to the bottom-left so the images
                  can tell the top half of the story on their own. */}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <p className="text-[11px] sm:text-xs tracking-[0.22em] uppercase text-primary/80 font-semibold mb-2">
                  {tile.eyebrow}
                </p>
                <h3 className="font-heading text-lg sm:text-xl font-bold leading-tight mb-2 text-white">
                  {tile.title}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-sm">
                  {tile.detail}
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
