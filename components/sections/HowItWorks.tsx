"use client";

import Image from "next/image";
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
    image:
      "https://images.pexels.com/photos/7562377/pexels-photo-7562377.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
  },
  {
    step: 2,
    icon: Headset,
    title: "Gear Up",
    description:
      "Our team gets you fitted with cutting-edge standalone VR headsets. A quick 5-minute briefing and you're ready to go.",
    image:
      "https://images.pexels.com/photos/8728556/pexels-photo-8728556.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
  },
  {
    step: 3,
    icon: Users,
    title: "Play Together",
    description:
      "Step into the arena with up to 10 players. Walk freely, communicate with your team, and experience VR like never before.",
    image:
      "https://images.pexels.com/photos/7047331/pexels-photo-7047331.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
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
              className="glass-card overflow-hidden group hover:-translate-y-2 transition-transform duration-300"
            >
              {/* Step image */}
              <div className="relative aspect-[3/2] overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {item.step}
                </span>
              </div>

              <div className="p-6 text-center">
                <div className="inline-flex mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
