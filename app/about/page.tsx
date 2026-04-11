"use client";

import { motion } from "framer-motion";
import { Target, Heart, Zap, Shield } from "lucide-react";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";

const values = [
  {
    icon: Target,
    title: "Premium Quality",
    description:
      "We invest in the best standalone VR hardware and partner with world-class game studios to deliver experiences you can't get at home.",
  },
  {
    icon: Heart,
    title: "Community First",
    description:
      "Tesseract Arena is a gathering place. We bring friends, families, and coworkers together through shared virtual adventures.",
  },
  {
    icon: Zap,
    title: "Always Evolving",
    description:
      "Our game library grows every month. We stay on the cutting edge of VR entertainment so you always have something new to try.",
  },
  {
    icon: Shield,
    title: "Safe & Inclusive",
    description:
      "Clean equipment, trained staff, and a welcoming atmosphere for all ages and experience levels.",
  },
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
          className="text-center mb-20"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl font-bold mb-6"
          >
            About <span className="gradient-text">Tesseract Arena</span>
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            We built Tesseract Arena because we believe virtual reality is the
            future of group entertainment — and everyone deserves access to
            premium VR experiences without buying expensive hardware.
          </motion.p>
        </motion.div>

        {/* Mission */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeInUp}
          className="glass-card p-10 sm:p-14 text-center mb-20 max-w-4xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            To make world-class VR entertainment accessible to everyone in the
            India. We partner with the best VR game studios on the planet and
            invest in premium standalone hardware so you can walk in, gear up,
            and step into another world — no experience or equipment needed.
          </p>
        </motion.div>

        {/* Values */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20"
        >
          {values.map((value) => (
            <motion.div
              key={value.title}
              variants={scaleIn}
              className="glass-card p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <value.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">{value.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {value.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Partners */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeInUp}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">
            Our <span className="gradient-text">Technology Partners</span>
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            We partner with industry leaders to bring you the best VR
            experiences available.
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            {["Anvio VR", "Synthesis VR"].map((partner) => (
              <div
                key={partner}
                className="glass-card px-10 py-6 flex items-center justify-center"
              >
                <span className="font-heading text-lg tracking-wider text-muted-foreground">
                  {partner}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
