"use client";

import { motion } from "framer-motion";
import { Gamepad2, Headset, Users } from "lucide-react";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const steps = [
  {
    step: 1,
    icon: Gamepad2,
    title: "Choose Your Game",
    description:
      "Browse our library of 20+ premium VR experiences. From zombie survival to fantasy adventures — pick your next mission.",
  },
  {
    step: 2,
    icon: Headset,
    title: "Gear Up",
    description:
      "Our team gets you fitted with cutting-edge standalone VR headsets. A quick 5-minute briefing and you're ready to go.",
  },
  {
    step: 3,
    icon: Users,
    title: "Play Together",
    description:
      "Step into the arena with up to 4 players. Walk freely, communicate with your team, and experience VR like never before.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From booking to playing in three simple steps
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {steps.map((item) => (
            <motion.div
              key={item.step}
              variants={fadeInUp}
              className="glass-card p-8 text-center group hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="relative inline-flex mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {item.step}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
