"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Navigation, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const contactInfo = [
  {
    icon: MapPin,
    label: "Address",
    value: "123 Innovation Way, Fremont, CA 94538",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "(510) 555-0199",
  },
  {
    icon: Mail,
    label: "Email",
    value: "hello@tesseractarena.com",
  },
  {
    icon: Clock,
    label: "Hours",
    value: "Monday - Sunday: 10AM - 10PM",
  },
];

export function Location() {
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
            Find <span className="gradient-text">Us</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Located in the heart of Fremont — easy access from anywhere in the
            Bay Area
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Contact info */}
          <motion.div
            variants={fadeInUp}
            className="glass-card p-8 space-y-6"
          >
            <h3 className="font-heading text-xl font-bold mb-6">
              Visit Tesseract Arena
            </h3>

            <div className="space-y-5">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {item.label}
                    </p>
                    <p className="text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <a
                href="https://maps.google.com/?q=Fremont+CA"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants(),
                  "bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-2"
                )}
              >
                <Navigation size={16} />
                Get Directions
              </a>
              <Link
                href="/contact"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-white/20 hover:bg-white/5 inline-flex items-center gap-2"
                )}
              >
                <MessageCircle size={16} />
                Contact Us
              </Link>
            </div>
          </motion.div>

          {/* Map placeholder */}
          <motion.div
            variants={fadeInUp}
            className="glass-card overflow-hidden min-h-[400px] relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-card to-accent/5 flex items-center justify-center">
              <div className="text-center">
                <MapPin size={48} className="mx-auto mb-4 text-primary/40" />
                <p className="text-sm text-muted-foreground">
                  Interactive Map
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  123 Innovation Way, Fremont, CA
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
