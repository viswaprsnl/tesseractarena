"use client";

import { motion } from "framer-motion";
import {
  Footprints,
  Unplug,
  Users,
  Headset,
  Library,
  DoorOpen,
} from "lucide-react";
import { scaleIn, staggerContainer, fadeInUp } from "@/lib/animations";

const features = [
  {
    icon: Footprints,
    title: "Free-Roam VR",
    description:
      "Walk, run, crouch, and dodge in a real physical arena. No teleporting — your body is the controller.",
  },
  {
    icon: Unplug,
    title: "No Wires, No PCs",
    description:
      "Standalone headsets mean total freedom. No cables tethering you down, no bulky backpacks.",
  },
  {
    icon: Users,
    title: "Group Experiences",
    description:
      "Play alongside friends in the same virtual world. See their avatars, talk in real time, survive together.",
  },
  {
    icon: Headset,
    title: "Premium Hardware",
    description:
      "Top-tier standalone VR headsets with crisp visuals, spatial audio, and precise tracking.",
  },
  {
    icon: Library,
    title: "20+ Game Titles",
    description:
      "From zombie shooters to fantasy adventures to escape rooms. Something for every player and every mood.",
  },
  {
    icon: DoorOpen,
    title: "Walk-In Friendly",
    description:
      "No VR experience needed. Our team handles everything — just show up and step in.",
  },
];

export function Features() {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{
          backgroundImage:
            "url(https://images.pexels.com/photos/7886602/pexels-photo-7886602.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)",
        }}
      />
      <div className="absolute inset-0 bg-background/90" />
      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Why <span className="gradient-text">Tesseract Arena</span>?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The premium VR experience you won&apos;t find anywhere else
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={scaleIn}
              className="glass-card p-8 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
